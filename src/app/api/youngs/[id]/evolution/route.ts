import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const youngId = params.id;
  
  try {
    await connectToDB();
    
    if (sql) {
      // Obtener los últimos 2 formularios aprobados o en revisión para este joven
      const result = await sql`
        SELECT id, periodo, data, status, updated_at
        FROM forms
        WHERE young_id = ${parseInt(youngId)}
        ORDER BY updated_at DESC
        LIMIT 5
      `;
      
      const evolution = result.rows.map((row: any) => ({
        id: row.id,
        periodo: row.periodo,
        status: row.status,
        updatedAt: row.updated_at,
        dimensiones: row.data?.evaluacion?.dimensiones || []
      }));
      
      return NextResponse.json({ evolution });
    }
    
    // MongoDB
    if (process.env.MONGODB_URI) {
      const { FormModel } = await import('@/models/Form');
      const forms = await FormModel.find({ youngId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean();
        
      const evolution = forms.map((f: any) => ({
        id: String(f._id),
        periodo: f.periodo,
        status: f.status,
        updatedAt: f.updatedAt,
        dimensiones: f.data?.evaluacion?.dimensiones || []
      }));
      
      return NextResponse.json({ evolution });
    }
    
    return NextResponse.json({ evolution: [] });
  } catch (error: any) {
    console.error('Error fetching evolution:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
