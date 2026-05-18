import { NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import { reportToDocxBuffer } from '@/lib/pdf/render';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    
    let repData: any = null;
    
    if (sql) {
      const result = await sql`
        SELECT data FROM reports WHERE id = ${parseInt(params.id)}
      `;
      if (result.rows.length > 0) {
        repData = result.rows[0].data;
      }
    } else if (process.env.MONGODB_URI) {
      const rep = await ReportModel.findById(params.id).lean();
      if (rep) {
        repData = rep.data;
      }
    }
    
    if (!repData) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const buf = await reportToDocxBuffer(repData);
    return new Response(buf, { 
      headers: { 
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'Content-Disposition': `attachment; filename="informe-${params.id}.docx"` 
      } 
    });
  } catch (err: any) {
    console.error('Error generando DOCX:', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}


