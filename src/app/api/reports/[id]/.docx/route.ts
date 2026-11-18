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

          const DIM_DEFAULT_COMMENTS: Record<string, string> = {
            físico: 'Participa activamente en actividades físicas adaptadas, caminatas saludables y controles médicos periódicos.',
            emocional: 'Demuestra bienestar subjetivo y autorregulación emocional positiva en las actividades compartidas.',
            material: 'Cuenta con adecuada cobertura integral de sus necesidades materiales básicas, vivienda digna y entorno contenedor.',
            personal: 'Adquiere y consolida destrezas prácticas y competencias funcionales en los talleres formativos.',
            interpersonales: 'Afianza lazos sólidos de compañerismo, respeto y empatía con sus pares y facilitadores.',
            inclusión: 'Participa con entusiasmo en salidas comunitarias, eventos recreativos y festejos institucionales.',
            integración: 'Participa con entusiasmo en salidas comunitarias, eventos recreativos y festejos institucionales.',
            autodeterminación: 'Ejerce su autodeterminación eligiendo actividades y manifestando sus preferencias personales.',
            derechos: 'Se garantiza el respeto pleno a su dignidad, privacidad, tiempos personales y acceso a apoyos necesarios.'
          };

          const getDim = (name: string) => {
            const d = dims.find((x: any) => x.dimension?.toLowerCase().includes(name.toLowerCase()));
            const fallbackCom = DIM_DEFAULT_COMMENTS[name.toLowerCase()] || 'Evolución positiva y sostenida con apoyos institucionales.';
            const rawCom = (d?.comentario || '').trim();
            const isDummy = !rawCom || rawCom.toLowerCase().includes('avances continuos') || rawCom.length < 15;
            return {
              val: d?.valoracion || '✔',
              com: isDummy ? fallbackCom : rawCom
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

          const formatBullets = (arr: any) => {
            if (!arr) return '';
            const list = Array.isArray(arr) ? arr : (typeof arr === 'string' ? arr.split(/\r?\n/) : [arr]);
            return list
              .map(x => String(x || '').trim())
              .filter(Boolean)
              .map(x => (x.startsWith('•') || x.startsWith('-') || x.startsWith('*')) ? x : `• ${x}`)
              .join('\n');
          };

          const rawName = repData?.datosGenerales?.nombreCompleto || '';
          const formattedName = formatApellidoNombre(rawName);

          const displayDni = repData?.datosGenerales?.dni?.trim() || youngPcp?.dni || 'S/D (En legajo institucional)';
          const displayObraSocial = repData?.datosGenerales?.obraSocial?.trim() || youngPcp?.obraSocial || 'S/D (En legajo institucional)';

          const p2Lineas = p2.lineasAccion || {};
          const p2Indicadores = p2.indicadores || {};

          // Helper para evitar títulos dummy heredados de repData.secciones
          const resolveNarrative = (val1: string, val2: string, fallback: string) => {
            const v1 = stripParrafoPrefixes(val1 || '').trim();
            if (v1.length > 60) return v1;
            const v2 = stripParrafoPrefixes(val2 || '').trim();
            if (v2.length > 60) return v2;
            return v1 || v2 || fallback;
          };

          const defaultProyecciones = [
            'Fortalecer la comunicación y articulación con el círculo familiar',
            'Promover la autonomía en actividades de la vida diaria y el entorno comunitario',
            'Potenciar estrategias de autorregulación y bienestar emocional en espacios grupales',
            'Fomentar la participación activa en propuestas comunitarias e inclusivas',
            'Desarrollar habilidades sociales y resolución cooperativa de tareas en talleres',
            'Estimular la toma de decisiones y la autodeterminación en espacios cotidianos',
            'Acompañar sus sueños y metas individuales como eje central de su proyecto de vida'
          ];
          const rawProy = Array.isArray(p1.proyecciones) && p1.proyecciones.length > 0 ? p1.proyecciones : defaultProyecciones;

          doc.setData({
            nombreCompleto: formattedName,
            dni: displayDni,
            obraSocial: displayObraSocial,
            circuloParticipacion: repData?.datosGenerales?.circuloApoyoParticipacion || 'Sí',
            circuloIntegrantes: repData?.datosGenerales?.circuloApoyoPersonas || 'Familiares, facilitadores y compañeras de taller.',
            objetivoProceso: resolveNarrative(p1.objetivoProceso, repData?.secciones?.participacion, 'A lo largo del ciclo institucional se promueve el desarrollo integral y la autonomía funcional.'),
            escuchaActiva: resolveNarrative(p1.escuchaActiva, repData?.secciones?.habilidadesViajar, 'Sostiene y manifiesta con claridad sus elecciones personales, intereses y metas cotidianas.'),
            estadoEmocional: resolveNarrative(p1.estadoEmocional, repData?.secciones?.dimensionesCalidadVida, 'Manifiesta un bienestar subjetivo positivo, participando con entusiasmo en las dinámicas compartidas.'),
            apoyosAjustes: resolveNarrative(p1.apoyosAjustes, '', 'Se incorporaron apoyos visuales, cronogramas y herramientas organizativas para afianzar su autonomía.'),
            dim_bf_val: bf.val, dim_bf_com: stripParrafoPrefixes(bf.com),
            dim_be_val: be.val, dim_be_com: stripParrafoPrefixes(be.com),
            dim_bm_val: bm.val, dim_bm_com: stripParrafoPrefixes(bm.com),
            dim_dp_val: dp.val, dim_dp_com: stripParrafoPrefixes(dp.com),
            dim_ri_val: ri.val, dim_ri_com: stripParrafoPrefixes(ri.com),
            dim_is_val: isDim.val, dim_is_com: stripParrafoPrefixes(isDim.com),
            dim_ad_val: ad.val, dim_ad_com: stripParrafoPrefixes(ad.com),
            dim_de_val: de.val, dim_de_com: stripParrafoPrefixes(de.com),
            logros_practicas: resolveNarrative(p1.logros?.practicas, repData?.secciones?.vidaIndependiente, 'Se involucra activamente en tareas funcionales y hábitos de vida independiente.'),
            logros_emocionalesSociales: resolveNarrative(p1.logros?.emocionalesSociales, repData?.secciones?.desarrolloPersonal, 'Expresa con asertividad sus estados de ánimo, fortaleciendo el compañerismo.'),
            logros_decisiones: resolveNarrative(p1.logros?.decisiones, repData?.secciones?.metasSociales, 'Participa activamente en la toma de decisiones cotidianas sobre sus actividades.'),
            logros_nuevasExperiencias: resolveNarrative(p1.logros?.nuevasExperiencias, repData?.secciones?.metasDeportivas, 'Forma parte con agrado de festejos institucionales y salidas comunitarias.'),
            suenosMetas: resolveNarrative(p1.suenosMetas, repData?.secciones?.metaAlcanzada, 'Avanza con determinación hacia sus metas y proyectos de vida con apoyos institucionales.'),
            circuloApoyo: resolveNarrative(p1.circuloApoyo, repData?.secciones?.integracionRelaciones, 'La articulación entre el equipo institucional y el círculo familiar se mantiene constante y colaborativa.'),
            proyeccionesTexto: formatBullets(rawProy),
            planAnio: p2.anio || '2027',
            planIntroduccion: p2.introduccion || 'Este plan se ha elaborado con el objetivo de mejorar el acceso del concurrente a los apoyos y servicios necesarios para incrementar su calidad de vida.',
            planObjetivoGeneral: p2.objetivoGeneral || '',
            planObjetivosEspecificos: formatBullets(p2.objetivosEspecificos),
            planLineas_autonomia: formatBullets(p2Lineas.autonomia),
            planLineas_regulacionEmocional: formatBullets(p2Lineas.regulacionEmocional),
            planLineas_habilidadesSociales: formatBullets(p2Lineas.habilidadesSociales),
            planLineas_inclusionComunitaria: formatBullets(p2Lineas.inclusionComunitaria || p2Lineas.integracionComunitaria),
            planLineas_autodeterminacion: formatBullets(p2Lineas.autodeterminacion),
            planLineas_acompanamientoFamiliar: formatBullets(p2Lineas.acompanamientoFamiliar),
            planSuenosMetas: formatBullets(p2.suenosMetas),
            planIndicadores: [
              `• Bienestar Físico: ${p2Indicadores.bienestarFisico || 'Continuidad y disfrute en la participación en actividades físicas adaptadas, natación y rutinas saludables.'}`,
              `• Bienestar Emocional: ${p2Indicadores.bienestarEmocional || 'Identificación y regulación de emociones con apoyos adaptados.'}`,
              `• Bienestar Material: ${p2Indicadores.bienestarMaterial || 'Cobertura integral de necesidades materiales básicas, estabilidad habitacional, traslados y recursos indispensables para su vida diaria.'}`,
              `• Desarrollo Personal: ${p2Indicadores.desarrolloPersonal || 'Progresos en habilidades prácticas, resolución de tareas cotidianas y autogestión.'}`,
              `• Relaciones Interpersonales: ${p2Indicadores.relacionesInterpersonales || 'Fortalecimiento de lazos de compañerismo, respeto y empatía con pares y facilitadores.'}`,
              `• Inclusión Social: ${p2Indicadores.inclusionSocial || p2Indicadores.integracionSocial || 'Participación activa en salidas, eventos culturales, deportivos y comunitarios.'}`,
              `• Autodeterminación: ${p2Indicadores.autodeterminacion || 'Iniciativa y frecuencia en la toma de decisiones sobre sus actividades y tiempos.'}`,
              `• Derechos: ${p2Indicadores.derechos || 'Respeto pleno de sus elecciones, tiempos personales y acceso a apoyos y ajustes razonables.'}`
            ].join('\n'),
            planLineamientosFacilitador: formatBullets(p2.lineamientosFacilitador)
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

          const displayDniTrim = repData?.datosGenerales?.dni?.trim() || youngPcp?.dni || 'S/D (En legajo institucional)';
          const displayLegajo = repData?.datosGenerales?.legajo?.trim() || youngPcp?.legajo || 'S/D';

          doc.setData({
            nombreCompleto: formattedName,
            apellidoNombre: formattedName,
            grupo: repData?.datosGenerales?.grupo || 'Clave de Sol',
            facilitadores: repData?.datosGenerales?.facilitadores || repData?.datosGenerales?.facilitadorNombre || 'Sin facilitador',
            metaSueno: repData?.datosGenerales?.metaSueno || 'Desarrollar su proyecto de vida...',
            fechaInforme,
            pcpAnio,
            periodoAnio,
            dni: displayDniTrim,
            legajo: displayLegajo,
            numeroLegajo: displayLegajo,
            legajoNumero: displayLegajo,
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
