import { NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { ReportModel } from '@/models/Report';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    
    let rep: any = null;
    
    if (sql) {
      // Postgres
      const result = await sql`
        SELECT id, data, trazabilidad, periodo, status, version, 
               edited_docx_filename, edited_at, 
               (edited_docx_base64 IS NOT NULL AND edited_docx_base64 != '') as has_edited_docx
        FROM reports 
        WHERE id = ${parseInt(params.id)}
      `;
      if (result.rows.length > 0) {
        rep = {
          data: result.rows[0].data,
          trazabilidad: result.rows[0].trazabilidad || {},
          periodo: result.rows[0].periodo,
          status: result.rows[0].status,
          version: result.rows[0].version || 1,
          editedDocxFilename: result.rows[0].edited_docx_filename,
          editedAt: result.rows[0].edited_at,
          hasEditedDocx: result.rows[0].has_edited_docx
        };
      }
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      const doc = await ReportModel.findById(params.id).lean();
      if (doc) {
        rep = {
          data: doc.data,
          trazabilidad: doc.trazabilidad || {},
          periodo: doc.periodo,
          status: doc.status,
          version: doc.version || 1,
          editedDocxFilename: (doc as any).editedDocxFilename || null,
          editedAt: (doc as any).editedAt || null,
          hasEditedDocx: !!(doc as any).editedDocxBase64
        };
      }
    }
    
    if (!rep) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(rep);
  } catch (error: any) {
    console.error('Error obteniendo informe JSON:', error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}


