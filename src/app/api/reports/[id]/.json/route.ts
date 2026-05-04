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
        SELECT * FROM reports WHERE id = ${parseInt(params.id)}
      `;
      if (result.rows.length > 0) {
        rep = {
          data: result.rows[0].data,
          trazabilidad: result.rows[0].trazabilidad || {},
          periodo: result.rows[0].periodo,
          status: result.rows[0].status,
          version: result.rows[0].version || 1
        };
      }
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      rep = await ReportModel.findById(params.id).lean();
      if (rep) {
        rep = {
          data: rep.data,
          trazabilidad: rep.trazabilidad || {},
          periodo: rep.periodo,
          status: rep.status,
          version: rep.version || 1
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


