import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import { renderDeterministic } from '@/lib/ai/orchestrator';
import { htmlToPdfBuffer } from '@/lib/pdf/render';
import fs from 'node:fs';
import path from 'node:path';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  }
  await connectToDB();
  const rep = await ReportModel.findById(params.id);
  if (!rep) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (rep.status !== 'APROBADO') return NextResponse.json({ error: 'Solo informes aprobados' }, { status: 400 });
  const html = await renderDeterministic(rep.data);
  const pdfBuffer = await htmlToPdfBuffer(html);
  const reportsDir = path.join(process.cwd(), 'public', 'reports');
  await fs.promises.mkdir(reportsDir, { recursive: true });
  const filename = `informe-${params.id}.pdf`;
  const filePath = path.join(reportsDir, filename);
  await fs.promises.writeFile(filePath, pdfBuffer);
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:8000';
  const pdfUrl = `${baseUrl}/reports/${filename}`;
  rep.pdfUrl = pdfUrl; await rep.save();
  return NextResponse.json({ pdfUrl });
}


