import { NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import fs from 'node:fs';
import path from 'node:path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { reportToDocxBuffer } from '@/lib/pdf/render';
import { formatApellidoNombre } from '@/lib/formatters';
import { stripParrafoPrefixes } from '@/lib/ai/finalReportGenerator';

export const dynamic = 'force-dynamic';

const USE_POSTGRES = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    
    const { searchParams } = new URL(req.url);
    const downloadOriginal = searchParams.get('original') === 'true';
    
    let repData: any = null;
    let isTrimestral = false;
    let isFinal = false;
    let reportType = 'MENSUAL';
    let youngPcp: any = null;
    let editedDocxBase64: string | null = null;
    let editedDocxFilename: string | null = null;
    
    if (USE_POSTGRES && sql) {
      const result = await sql`
        SELECT r.data, r.report_type, r.edited_docx_base64, r.edited_docx_filename, y.pcp
        FROM reports r
        LEFT JOIN youngs y ON r.young_id = y.id
        WHERE r.id = ${parseInt(params.id)}
      `;
      if (result.rows.length > 0) {
        repData = result.rows[0].data;
        reportType = result.rows[0].report_type || 'MENSUAL';
        isTrimestral = reportType === 'TRIMESTRAL';
        isFinal = reportType === 'FINAL' || reportType === 'INFORME_FINAL';
        youngPcp = result.rows[0].pcp;
        editedDocxBase64 = result.rows[0].edited_docx_base64 || null;
        editedDocxFilename = result.rows[0].edited_docx_filename || null;
      }
    } else if (process.env.MONGODB_URI) {
      const rep = await ReportModel.findById(params.id).lean();
      if (rep) {
        repData = rep.data;
        reportType = (rep as any).reportType || 'MENSUAL';
        isTrimestral = reportType === 'TRIMESTRAL';
        isFinal = reportType === 'FINAL' || reportType === 'INFORME_FINAL';
        editedDocxBase64 = (rep as any).editedDocxBase64 || null;
        editedDocxFilename = (rep as any).editedDocxFilename || null;
        
        try {
          const { YoungModel } = await import('@/models/Young');
          const youngItem = await YoungModel.findById((rep as any).youngId).lean();
          youngPcp = (youngItem as any)?.pcp;
        } catch (e) {
          console.error('Error fetching young from MongoDB:', e);
        }
      }
    }
    
    if (!repData) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // Si existe una versión editada del Word y NO se solicita explícitamente el original,
    // devolver directamente el archivo subido convertido a buffer.
    if (!downloadOriginal && editedDocxBase64) {
      const docBuffer = Buffer.from(editedDocxBase64, 'base64');
      const filename = editedDocxFilename || (isTrimestral ? `informe-trimestral-${params.id}.docx` : `informe-${params.id}.docx`);
      return new Response(docBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    
    let templatePath: string;
    if (isFinal) {
      templatePath = path.join(process.cwd(), 'templates', 'final_template.docx');
    } else if (isTrimestral) {
      templatePath = path.join(process.cwd(), 'templates', 'trimestral_template.docx');
    } else {
      templatePath = path.join(process.cwd(), 'templates', 'report.docx');
    }
    let buf: Buffer;
    
    try {
      if (fs.existsSync(templatePath)) {
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
        
        if (isFinal) {
          const p1 = repData?.parte1_informeFinal || {};
          const p2 = repData?.parte2_planAbordaje || {};
          const dims = Array.isArray(p1.evaluacionDimensiones) ? p1.evaluacionDimensiones : [];

          const getDim = (name: string) => {
            const d = dims.find((x: any) => x.dimension?.toLowerCase().includes(name.toLowerCase()));
            return {
              val: d?.valoracion || '✔',
              com: d?.comentario || 'Avances continuos en esta dimensión.'
            };
          };

          const bf = getDim('físico');
          const be = getDim('emocional');
          const bm = getDim('material');
          const dp = getDim('personal');
          const ri = getDim('interpersonales');
          const isDim = getDim('inclusión') || getDim('integración');
          const ad = getDim('autodeterminación');
          const de = getDim('derechos');

          const rawName = repData?.datosGenerales?.nombreCompleto || '';
          const formattedName = formatApellidoNombre(rawName);

          const p2Lineas = p2.lineasAccion || {};
          const p2Indicadores = p2.indicadores || {};

          doc.setData({
            nombreCompleto: formattedName,
            dni: repData?.datosGenerales?.dni || '',
            obraSocial: repData?.datosGenerales?.obraSocial || '',
            circuloParticipacion: repData?.datosGenerales?.circuloApoyoParticipacion || 'Sí',
            circuloIntegrantes: repData?.datosGenerales?.circuloApoyoPersonas || 'Familiares, facilitadores y compañeras de taller.',
            objetivoProceso: stripParrafoPrefixes(p1.objetivoProceso || repData?.secciones?.participacion || ''),
            escuchaActiva: stripParrafoPrefixes(p1.escuchaActiva || repData?.secciones?.habilidadesViajar || ''),
            estadoEmocional: stripParrafoPrefixes(p1.estadoEmocional || repData?.secciones?.dimensionesCalidadVida || ''),
            apoyosAjustes: stripParrafoPrefixes(p1.apoyosAjustes || 'Se incorporaron apoyos visuales y herramientas organizativas para afianzar su autonomía.'),
            dim_bf_val: bf.val, dim_bf_com: stripParrafoPrefixes(bf.com),
            dim_be_val: be.val, dim_be_com: stripParrafoPrefixes(be.com),
            dim_bm_val: bm.val, dim_bm_com: stripParrafoPrefixes(bm.com),
            dim_dp_val: dp.val, dim_dp_com: stripParrafoPrefixes(dp.com),
            dim_ri_val: ri.val, dim_ri_com: stripParrafoPrefixes(ri.com),
            dim_is_val: isDim.val, dim_is_com: stripParrafoPrefixes(isDim.com),
            dim_ad_val: ad.val, dim_ad_com: stripParrafoPrefixes(ad.com),
            dim_de_val: de.val, dim_de_com: stripParrafoPrefixes(de.com),
            logros_practicas: stripParrafoPrefixes(p1.logros?.practicas || repData?.secciones?.vidaIndependiente || ''),
            logros_emocionalesSociales: stripParrafoPrefixes(p1.logros?.emocionalesSociales || repData?.secciones?.desarrolloPersonal || ''),
            logros_decisiones: stripParrafoPrefixes(p1.logros?.decisiones || repData?.secciones?.metasSociales || ''),
            logros_nuevasExperiencias: stripParrafoPrefixes(p1.logros?.nuevasExperiencias || repData?.secciones?.metasDeportivas || ''),
            suenosMetas: stripParrafoPrefixes(p1.suenosMetas || repData?.secciones?.metaAlcanzada || ''),
            circuloApoyo: stripParrafoPrefixes(p1.circuloApoyo || repData?.secciones?.integracionRelaciones || ''),
            proyeccionesTexto: Array.isArray(p1.proyecciones) ? p1.proyecciones.join('\n') : (p1.proyecciones || ''),
            planAnio: p2.anio || '2026',
            planIntroduccion: p2.introduccion || 'Este plan se ha elaborado con el objetivo de mejorar el acceso del concurrente a los apoyos y servicios necesarios para incrementar su calidad de vida.',
            planObjetivoGeneral: p2.objetivoGeneral || '',
            planObjetivosEspecificos: Array.isArray(p2.objetivosEspecificos) ? p2.objetivosEspecificos.join('\n') : '',
            planLineas_autonomia: Array.isArray(p2Lineas.autonomia) ? p2Lineas.autonomia.join('\n') : '',
            planLineas_regulacionEmocional: Array.isArray(p2Lineas.regulacionEmocional) ? p2Lineas.regulacionEmocional.join('\n') : '',
            planLineas_habilidadesSociales: Array.isArray(p2Lineas.habilidadesSociales) ? p2Lineas.habilidadesSociales.join('\n') : '',
            planLineas_inclusionComunitaria: Array.isArray(p2Lineas.inclusionComunitaria) ? p2Lineas.inclusionComunitaria.join('\n') : (Array.isArray(p2Lineas.integracionComunitaria) ? p2Lineas.integracionComunitaria.join('\n') : ''),
            planLineas_autodeterminacion: Array.isArray(p2Lineas.autodeterminacion) ? p2Lineas.autodeterminacion.join('\n') : '',
            planLineas_acompanamientoFamiliar: Array.isArray(p2Lineas.acompanamientoFamiliar) ? p2Lineas.acompanamientoFamiliar.join('\n') : '',
            planSuenosMetas: Array.isArray(p2.suenosMetas) ? p2.suenosMetas.join('\n') : (p2.suenosMetas || ''),
            planIndicadores: [
              `Bienestar Físico: ${p2Indicadores.bienestarFisico || 'Continuidad en actividades físicas y saludables.'}`,
              `Bienestar Emocional: ${p2Indicadores.bienestarEmocional || 'Regulación de emociones con apoyos.'}`,
              `Bienestar Material: ${p2Indicadores.bienestarMaterial || 'Cobertura adecuada de necesidades materiales básicas, transporte y recursos indispensables.'}`,
              `Desarrollo Personal: ${p2Indicadores.desarrolloPersonal || 'Progresos en habilidades prácticas y vida diaria.'}`,
              `Relaciones Interpersonales: ${p2Indicadores.relacionesInterpersonales || 'Fortalecimiento de lazos de compañerismo.'}`,
              `Inclusión Social: ${p2Indicadores.inclusionSocial || p2Indicadores.integracionSocial || 'Participación en eventos comunitarios y deportivos.'}`,
              `Autodeterminación: ${p2Indicadores.autodeterminacion || 'Elecciones autónomas en actividades cotidianas.'}`,
              `Derechos: ${p2Indicadores.derechos || 'Respeto a decisiones y acceso a apoyos.'}`
            ].join('\n'),
            planLineamientosFacilitador: Array.isArray(p2.lineamientosFacilitador) ? p2.lineamientosFacilitador.join('\n') : (p2.lineamientosFacilitador || '')
          });
        } else if (isTrimestral) {
          const fechaActual = new Date();
          const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          const fechaInforme = `${fechaActual.getDate()} de ${meses[fechaActual.getMonth()]} del ${fechaActual.getFullYear()}`;

          const mergedPeriodo = repData?.datosGenerales?.periodo || '';
          const yearMatch = mergedPeriodo.match(/\b(20\d{2})\b/);
          const periodoAnio = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
          const pcpAnio = youngPcp?.anio || new Date().getFullYear().toString();

          const rawName = repData?.datosGenerales?.nombreCompleto || '';
          const formattedName = formatApellidoNombre(rawName);

          doc.setData({
            nombreCompleto: formattedName,
            apellidoNombre: formattedName,
            grupo: repData?.datosGenerales?.grupo || 'Clave de Sol',
            facilitadores: repData?.datosGenerales?.facilitadores || repData?.datosGenerales?.facilitadorNombre || 'Sin facilitador',
            metaSueno: repData?.datosGenerales?.metaSueno || 'Desarrollar su proyecto de vida...',
            fechaInforme,
            pcpAnio,
            periodoAnio,
            dni: repData?.datosGenerales?.dni || '',
            legajo: repData?.datosGenerales?.legajo || '',
            numeroLegajo: repData?.datosGenerales?.legajo || '',
            legajoNumero: repData?.datosGenerales?.legajo || '',
            obraSocial: repData?.datosGenerales?.obraSocial || '',
            obra_social: repData?.datosGenerales?.obraSocial || '',
            fechaNacimiento: repData?.datosGenerales?.fechaNacimiento 
              ? (isNaN(new Date(repData.datosGenerales.fechaNacimiento).getTime()) 
                ? repData.datosGenerales.fechaNacimiento 
                : new Date(repData.datosGenerales.fechaNacimiento).toLocaleDateString('es-AR'))
              : '',
            fecha_nacimiento: repData?.datosGenerales?.fechaNacimiento 
              ? (isNaN(new Date(repData.datosGenerales.fechaNacimiento).getTime()) 
                ? repData.datosGenerales.fechaNacimiento 
                : new Date(repData.datosGenerales.fechaNacimiento).toLocaleDateString('es-AR'))
              : '',
            metaAlcanzada: repData?.secciones?.metaAlcanzada || 'Sin registrar.',
            participacion: repData?.secciones?.participacion || 'Sin registrar.',
            integracionRelaciones: repData?.secciones?.integracionRelaciones || 'Sin registrar.',
            actividadesRelacionadas: repData?.secciones?.actividadesRelacionadas || 'Sin registrar.',
            vidaIndependiente: repData?.secciones?.vidaIndependiente || 'Sin registrar.',
            habilidadesViajar: repData?.secciones?.habilidadesViajar || 'Sin registrar.',
            desarrolloPersonal: repData?.secciones?.desarrolloPersonal || 'Sin registrar.',
            metasDeportivas: repData?.secciones?.metasDeportivas || 'Sin registrar.',
            metasSociales: repData?.secciones?.metasSociales || 'Sin registrar.',
            dimensionesCalidadVida: repData?.secciones?.dimensionesCalidadVida || 'Sin registrar.',
            actividadesComplementarias: repData?.secciones?.actividadesComplementarias || 'Sin registrar.',
            mejoraCalidadVida: repData?.secciones?.mejoraCalidadVida || 'Sin registrar.'
          });
        } else {
          doc.setData({
            datos: repData?.datosGenerales || {},
            secciones: repData?.secciones || {},
            evaluacionDimensiones: repData?.evaluacionDimensiones || [],
            titulo: 'Informe Evolutivo – Abordaje Centrado en la Persona'
          });
        }
        
        doc.render();
        buf = doc.getZip().generate({ type: 'nodebuffer' }) as Buffer;
      } else {
        buf = await reportToDocxBuffer(repData);
      }
    } catch (e) {
      console.error('Error con plantilla docx, usando fallback:', e);
      buf = await reportToDocxBuffer(repData);
    }
    
    const safeName = (repData?.datosGenerales?.nombreCompleto || 'concurrente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').trim();
    const safeGroup = (repData?.datosGenerales?.grupo || repData?.datosGenerales?.taller || 'grupo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').trim();
    const d = repData?.datosGenerales?.fechaCreacion ? new Date(repData.datosGenerales.fechaCreacion) : new Date();
    const safeDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    const docName = isFinal
      ? `informe-final-${safeName}-${safeGroup}-${safeDate}.docx`
      : isTrimestral 
        ? `informe-trimestral-${safeName}-${safeGroup}-${safeDate}.docx` 
        : `informe-mensual-${safeName}-${safeGroup}-${safeDate}.docx`;
    
    return new Response(buf, { 
      headers: { 
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'Content-Disposition': `attachment; filename="${docName}"` 
      } 
    });
  } catch (err: any) {
    console.error('Error generando DOCX:', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
