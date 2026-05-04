import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { FormModel } from '@/models/Form';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const USE_POSTGRES = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const resolvedParams = await params;
    const formId = resolvedParams.id;
    const session = await getServerSession(authOptions as any);
    const role = (session?.user as any)?.role || 'FACILITADOR';
    
    if (USE_POSTGRES && sql) {
      // Postgres
      const userId = session?.user ? Number((session.user as any).id) : null;
      let query;
      
      if (role === 'FACILITADOR' && userId) {
        query = sql`SELECT * FROM forms WHERE id = ${parseInt(formId)} AND created_by = ${userId}`;
      } else {
        query = sql`SELECT * FROM forms WHERE id = ${parseInt(formId)}`;
      }
      
      const result = await query;
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'not found' }, { status: 404 });
      }
      
      const form = result.rows[0];
      return NextResponse.json({ 
        data: form.data, 
        periodo: form.periodo, 
        status: form.status || 'BORRADOR', 
        youngId: form.young_id 
      });
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      const filter: any = { _id: formId };
      if (role === 'FACILITADOR') filter.createdBy = (session?.user as any)?.id;
      const form = await FormModel.findOne(filter).lean();
      if (!form) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json({ data: form.data, periodo: form.periodo, status: form.status, youngId: form.youngId });
    }
    
    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('Error obteniendo formulario:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido' }, { status: 500 });
  }
}


