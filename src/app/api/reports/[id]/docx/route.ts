import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import fs from 'node:fs';
import path from 'node:path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { reportToDocxBuffer } from '@/lib/pdf/render';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  }
  await connectToDB();
  const rep = await ReportModel.findById(params.id).lean();
  if (!rep) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (rep.status !== 'APROBADO') return NextResponse.json({ error: 'Solo informes aprobados' }, { status: 400 });

  const reportsDir = path.join(process.cwd(), 'public', 'reports');
  await fs.promises.mkdir(reportsDir, { recursive: true });
  const filename = `informe-${params.id}.docx`;
  const filePath = path.join(reportsDir, filename);

  const templatePath = path.join(process.cwd(), 'templates', 'report.docx');
  let buffer: Buffer | null = null;
  try {
    if (fs.existsSync(templatePath)) {
      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      const data = rep.data as any;
      doc.setData({
        datos: data?.datosGenerales || {},
        secciones: data?.secciones || {},
        evaluacionDimensiones: data?.evaluacionDimensiones || [],
        titulo: 'Informe Evolutivo – Abordaje Centrado en la Persona'
      });
      doc.render();
      buffer = doc.getZip().generate({ type: 'nodebuffer' }) as Buffer;
    } else {
      // Fallback programático sin plantilla
      buffer = await reportToDocxBuffer(rep.data);
    }
  } catch (e) {
    // Fallback si la plantilla falla
    buffer = await reportToDocxBuffer(rep.data);
  }

  await fs.promises.writeFile(filePath, buffer as Buffer);
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:8000';
  const docxUrl = `${baseUrl}/reports/${filename}`;
  // No persistimos docxUrl en el modelo (campo no definido). Solo devolvemos la URL.
  return NextResponse.json({ docxUrl });
}


