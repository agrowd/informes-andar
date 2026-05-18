import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbUrl = process.env.POSTGRES_URL ? process.env.POSTGRES_URL.split('@')[1] : 'NOT DEFINED';
    
    if (!sql) {
      return NextResponse.json({ error: 'SQL IS NOT DEFINED', dbUrl });
    }
    
    const countQuery = await sql`SELECT COUNT(*) as total FROM reports`;
    const reports = await sql`SELECT id, young_id, periodo FROM reports`;
    const youngs = await sql`SELECT id, nombre_completo FROM youngs`;
    
    return NextResponse.json({
      dbUrl,
      total: countQuery.rows[0].total,
      reportsCount: reports.rows.length,
      reports: reports.rows,
      youngsCount: youngs.rows.length,
      youngs: youngs.rows
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack });
  }
}
