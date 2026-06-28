import { NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import fs from 'node:fs';
import path from 'node:path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { reportToDocxBuffer } from '@/lib/pdf/render';

export const dynamic = 'force-dynamic';

const USE_POSTGRES = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    
    const { searchParams } = new URL(req.url);
    const downloadOriginal = searchParams.get('original') === 'true';
    
    let repData: any = null;
    let isTrimestral = false;
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
        isTrimestral = result.rows[0].report_type === 'TRIMESTRAL';
        youngPcp = result.rows[0].pcp;
        editedDocxBase64 = result.rows[0].edited_docx_base64 || null;
        editedDocxFilename = result.rows[0].edited_docx_filename || null;
      }
    } else if (process.env.MONGODB_URI) {
      const rep = await ReportModel.findById(params.id).lean();
      if (rep) {
        repData = rep.data;
        isTrimestral = (rep as any).reportType === 'TRIMESTRAL';
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

    
    let templatePath = path.join(process.cwd(), 'templates', isTrimestral ? 'trimestral_template.docx' : 'report.docx');
    let buf: Buffer;
    
    try {
      if (fs.existsSync(templatePath)) {
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
        
        if (isTrimestral) {
          const fechaActual = new Date();
          const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          const fechaInforme = `${fechaActual.getDate()} de ${meses[fechaActual.getMonth()]} del ${fechaActual.getFullYear()}`;

          const mergedPeriodo = repData?.datosGenerales?.periodo || '';
          const yearMatch = mergedPeriodo.match(/\b(20\d{2})\b/);
          const periodoAnio = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
          const pcpAnio = youngPcp?.anio || new Date().getFullYear().toString();

          doc.setData({
            nombreCompleto: repData?.datosGenerales?.nombreCompleto || '',
            grupo: repData?.datosGenerales?.grupo || 'Clave de Sol',
            facilitadores: repData?.datosGenerales?.facilitadores || 'Sin facilitador',
            metaSueno: repData?.datosGenerales?.metaSueno || 'Estar en la playa...',
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
    
    const docName = isTrimestral ? `informe-trimestral-${params.id}.docx` : `informe-${params.id}.docx`;
    
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
