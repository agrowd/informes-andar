import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateQuarterlyReportNarrative } from '@/lib/ai/quarterlyGenerator';
import { htmlToPdfBuffer } from '@/lib/pdf/render';
import fs from 'node:fs';
import path from 'node:path';

const USE_POSTGRES = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { formIds } = body as { formIds: string[] };

    if (!formIds || !Array.isArray(formIds) || formIds.length !== 3) {
      return NextResponse.json({ error: 'Se requieren exactamente 3 IDs de formularios para fusionar' }, { status: 400 });
    }

    let forms: any[] = [];
    let youngId: string = '';
    let youngName: string = '';
    let youngPcp: any = null;
    let youngTaller: string = '';

    if (USE_POSTGRES && sql) {
      // 1. Obtener formularios de Postgres
      for (const id of formIds) {
        const result = await sql`
          SELECT id, young_id, periodo, data FROM forms WHERE id = ${parseInt(id)}
        `;
        if (result.rows.length > 0) {
          const row = result.rows[0];
          forms.push({
            id: String(row.id),
            youngId: String(row.young_id),
            periodo: row.periodo,
            data: row.data
          });
        }
      }

      if (forms.length !== 3) {
        return NextResponse.json({ error: 'No se encontraron todos los formularios seleccionados en Postgres' }, { status: 404 });
      }

      // Validar que sean del mismo joven
      const yIds = [...new Set(forms.map(f => f.youngId))];
      if (yIds.length > 1) {
        return NextResponse.json({ error: 'Todos los borradores seleccionados deben pertenecer al mismo joven' }, { status: 400 });
      }
      youngId = yIds[0];

      // Obtener datos del joven
      const youngRes = await sql`
        SELECT nombre_completo, pcp, taller FROM youngs WHERE id = ${parseInt(youngId)}
      `;
      if (youngRes.rows.length > 0) {
        const yRow = youngRes.rows[0];
        youngName = yRow.nombre_completo;
        youngPcp = yRow.pcp;
        youngTaller = yRow.taller || '';
      } else {
        return NextResponse.json({ error: 'Concurrente no encontrado en Postgres' }, { status: 404 });
      }
    } else if (process.env.MONGODB_URI) {
      // 2. Obtener formularios de MongoDB
      const { FormModel } = await import('@/models/Form');
      const found = await FormModel.find({ _id: { $in: formIds } }).lean();
      
      // Ordenar en la misma secuencia de formIds
      forms = formIds.map(id => {
        const f = found.find(item => item._id.toString() === id);
        return f ? {
          id: f._id.toString(),
          youngId: f.youngId?.toString() || '',
          periodo: f.periodo,
          data: f.data
        } : null;
      }).filter(Boolean);

      if (forms.length !== 3) {
        return NextResponse.json({ error: 'No se encontraron todos los formularios seleccionados en MongoDB' }, { status: 404 });
      }

      const yIds = [...new Set(forms.map(f => f.youngId))];
      if (yIds.length > 1) {
        return NextResponse.json({ error: 'Todos los borradores seleccionados deben pertenecer al mismo joven' }, { status: 400 });
      }
      youngId = yIds[0];

      // Obtener datos del joven
      const { YoungModel } = await import('@/models/Young');
      const youngItem = await YoungModel.findById(youngId).lean();
      if (youngItem) {
        youngName = youngItem.nombreCompleto;
        youngPcp = youngItem.pcp;
        youngTaller = youngItem.taller || '';
      } else {
        return NextResponse.json({ error: 'Concurrente no encontrado en MongoDB' }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
    }

    // 3. Generar la narrativa consolidada con IA
    const secciones = await generateQuarterlyReportNarrative({
      jovenNombre: youngName,
      pcp: youngPcp,
      forms
    });

    // 4. Armar el objeto de datos consolidado
    const periodos = forms.map(f => f.periodo).filter(Boolean);
    const mergedPeriodo = `${periodos[0]} – ${periodos[periodos.length - 1]}`;

    // Obtener facilitadores del período
    const facilitators = forms
      .map(f => f.data?.datosGenerales?.facilitadorNombre)
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(' - ');

    // Obtener sueños de la PCP
    const metaSueno = Array.isArray(youngPcp?.perfil?.suenos)
      ? youngPcp.perfil.suenos.filter(Boolean).join('; ')
      : (youngPcp?.metaSueño || 'Estar en la playa y disfrutar del viento en la cara...');

    const reportData = {
      datosGenerales: {
        nombreCompleto: youngName,
        periodo: mergedPeriodo,
        grupo: youngTaller || 'Clave de Sol',
        facilitadores: facilitators || session.user.name || 'Sin facilitador',
        metaSueno: metaSueno
      },
      secciones: secciones
    };

    // 5. Renderizar HTML
    const fechaActual = new Date();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fechaInforme = `${fechaActual.getDate()} de ${meses[fechaActual.getMonth()]} del ${fechaActual.getFullYear()}`;

    const html = buildQuarterlyHtml({
      fechaInforme,
      nombreCompleto: youngName,
      grupo: youngTaller || 'Clave de Sol',
      facilitadores: facilitators || session.user.name || 'Sin facilitador',
      metaSueno,
      secciones
    });

    // 6. Generar PDF
    const pdfBuffer = await htmlToPdfBuffer(html);
    const reportsDir = path.join(process.cwd(), 'public', 'pdf-reports');
    await fs.promises.mkdir(reportsDir, { recursive: true });
    const filename = `informe-trimestral-${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, filename);
    await fs.promises.writeFile(filePath, pdfBuffer);
    const pdfUrl = `/pdf-reports/${filename}`;

    // 7. Guardar en Base de Datos
    let reportId = '';
    const generatedBy = session.user.id;

    if (USE_POSTGRES && sql) {
      const generatedByNum = Number(generatedBy) || null;
      const insertResult = await sql`
        INSERT INTO reports (
          young_id, periodo, data, html, pdf_url, 
          report_type, status, version, generated_by,
          created_at, updated_at
        ) VALUES (
          ${parseInt(youngId)},
          ${mergedPeriodo},
          ${JSON.stringify(reportData)}::jsonb,
          ${html},
          ${pdfUrl},
          'TRIMESTRAL',
          'BORRADOR',
          1,
          ${generatedByNum},
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      reportId = String(insertResult.rows[0].id);

      // Auditoría
      try {
        await sql`
          INSERT INTO audit_logs (entity_type, entity_id, action, user_id, meta, created_at)
          VALUES ('REPORT', ${parseInt(reportId)}, 'MERGE_CHECKLIST', ${generatedByNum}, 
            ${JSON.stringify({ targetType: 'TRIMESTRAL', sourceFormIds: formIds })}::jsonb, NOW())
        `;
      } catch (aErr) {
        console.error('Error logueando auditoría (no crítico):', aErr);
      }
    } else if (process.env.MONGODB_URI) {
      const { ReportModel } = await import('@/models/Report');
      const created = await ReportModel.create({
        youngId,
        periodo: mergedPeriodo,
        data: reportData,
        html,
        pdfUrl,
        status: 'BORRADOR',
        version: 1,
        generatedBy
      });
      // Set report_type in MongoDB (saved as mixed/extra fields)
      await ReportModel.updateOne({ _id: created._id }, { $set: { reportType: 'TRIMESTRAL', sourceFormIds: formIds } });
      reportId = created._id.toString();
    }

    return NextResponse.json({
      success: true,
      reportId,
      periodo: mergedPeriodo,
      pdfUrl
    });

  } catch (error: any) {
    console.error('Error en generación trimestral:', error);
    return NextResponse.json({ error: error?.message || 'Error interno al generar el informe trimestral' }, { status: 500 });
  }
}

function buildQuarterlyHtml(params: {
  fechaInforme: string;
  nombreCompleto: string;
  grupo: string;
  facilitadores: string;
  metaSueno: string;
  secciones: any;
}): string {
  const { fechaInforme, nombreCompleto, grupo, facilitadores, metaSueno, secciones } = params;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {
      size: A4;
      margin: 25.4mm;
    }
    body {
      font-family: 'Georgia', serif;
      font-size: 11.5pt;
      line-height: 1.6;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .date-container {
      text-align: right;
      margin-bottom: 30px;
      font-size: 11pt;
    }
    .title-container {
      text-align: center;
      font-weight: bold;
      font-size: 14pt;
      margin-bottom: 30px;
    }
    .meta-container {
      margin-bottom: 30px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 15px;
    }
    .meta-line {
      margin-bottom: 6px;
    }
    .section-title {
      font-weight: bold;
      margin-top: 24px;
      margin-bottom: 8px;
      font-size: 12pt;
    }
    .section-text {
      text-align: justify;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="date-container">
    La Reja, ${fechaInforme}
  </div>
  <div class="title-container">
    INFORME TRIMESTRAL<br>Asociación Civil Andar
  </div>
  <div class="meta-container">
    <div class="meta-line"><strong>Nombre del Concurrente:</strong> ${nombreCompleto}</div>
    <div class="meta-line"><strong>Grupo:</strong> ${grupo}</div>
    <div class="meta-line"><strong>Facilitadoras:</strong> ${facilitadores}</div>
    <div class="meta-line"><strong>Meta o Sueño para 2024:</strong> ${metaSueno}</div>
  </div>
  
  <div class="section-title">¿Ha alcanzado su meta o sueño 2024?</div>
  <div class="section-text">${secciones.metaAlcanzada || 'Sin registrar.'}</div>

  <div class="section-title">Participación durante este periodo de 2025</div>
  <div class="section-text">${secciones.participacion || 'Sin registrar.'}</div>

  <div class="section-title">Nivel de integración y relaciones interpersonales</div>
  <div class="section-text">${secciones.integracionRelaciones || 'Sin registrar.'}</div>

  <div class="section-title">Actividades/Talleres realizados durante este periodo, relacionados con su meta</div>
  <div class="section-text">${secciones.actividadesRelacionadas || 'Sin registrar.'}</div>

  <div class="section-title">Habilidades trabajadas para fortalecer las metas orientadas a la vida independiente</div>
  <div class="section-text">${secciones.vidaIndependiente || 'Sin registrar.'}</div>

  <div class="section-title">Habilidades desarrolladas para alcanzar la meta de viajar</div>
  <div class="section-text">${secciones.habilidadesViajar || 'Sin registrar.'}</div>

  <div class="section-title">Habilidades desarrolladas en el ámbito de metas orientadas al desarrollo personal</div>
  <div class="section-text">${secciones.desarrolloPersonal || 'Sin registrar.'}</div>

  <div class="section-title">Habilidades fomentadas para conseguir las metas deportivas</div>
  <div class="section-text">${secciones.metasDeportivas || 'Sin registrar.'}</div>

  <div class="section-title">Habilidades trabajadas para conquistar las metas sociales</div>
  <div class="section-text">${secciones.metasSociales || 'Sin registrar.'}</div>

  <div class="section-title">Dimensiones de Calidad de Vida trabajadas durante la experiencia</div>
  <div class="section-text">${secciones.dimensionesCalidadVida || 'Sin registrar.'}</div>

  <div class="section-title">Otras actividades complementarias realizadas durante este periodo</div>
  <div class="section-text">${secciones.actividadesComplementarias || 'Sin registrar.'}</div>

  <div class="section-title">¿Cómo mejoró su calidad de vida en las dimensiones antes mencionadas?</div>
  <div class="section-text">${secciones.mejoraCalidadVida || 'Sin registrar.'}</div>
</body>
</html>`;
}
