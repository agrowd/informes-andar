import { NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import { renderDeterministic } from '@/lib/ai/orchestrator';
import { htmlToPdfBuffer } from '@/lib/pdf/render';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    
    let repData: any = null;
    let repStatus: string = '';
    
    if (sql) {
      const result = await sql`
        SELECT data, status FROM reports WHERE id = ${parseInt(params.id)}
      `;
      if (result.rows.length > 0) {
        repData = result.rows[0].data;
        repStatus = result.rows[0].status;
      }
    } else if (process.env.MONGODB_URI) {
      const rep = await ReportModel.findById(params.id).lean();
      if (rep) {
        repData = rep.data;
        repStatus = rep.status;
      }
    }
    
    if (!repData) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (repStatus !== 'APROBADO') return NextResponse.json({ error: 'Solo informes aprobados' }, { status: 400 });
    
    // Inject the real persistent report ID
    repData.id = params.id;
    
    const html = await renderDeterministic(repData);
    const pdfBuffer = await htmlToPdfBuffer(html);
    const reportsDir = path.join(process.cwd(), 'public', 'pdf-reports');
    await fs.promises.mkdir(reportsDir, { recursive: true });
    
    const filename = `informe-${params.id}.pdf`;
    const filePath = path.join(reportsDir, filename);
    await fs.promises.writeFile(filePath, pdfBuffer);
    
    const pdfUrl = `/pdf-reports/${filename}`;
    
    if (sql) {
      await sql`
        UPDATE reports SET pdf_url = ${pdfUrl} WHERE id = ${parseInt(params.id)}
      `;
    } else if (process.env.MONGODB_URI) {
      const rep = await ReportModel.findById(params.id);
      if (rep) {
        rep.pdfUrl = pdfUrl;
        await rep.save();
      }
    }
    
    return NextResponse.json({ pdfUrl });
  } catch (err: any) {
    console.error('Error regenerando PDF:', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}


