import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { randomUUID } from 'crypto';

const USE_POSTGRES = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`[L-01] GET comments for report: ${params.id}`);
    await connectToDB();
    
    if (USE_POSTGRES && sql) {
      const reportId = parseInt(params.id);
      if (isNaN(reportId)) return NextResponse.json({ items: [], error: 'ID inválido' }, { status: 400 });

      const result = await sql`SELECT comments FROM reports WHERE id = ${reportId}`;
      if (result.rows.length === 0) return NextResponse.json({ items: [] });
      return NextResponse.json({ items: result.rows[0].comments || [] });
    } else if (process.env.MONGODB_URI) {
      const rep = await ReportModel.findById(params.id).select('comments').lean();
      if (!rep) return NextResponse.json({ items: [] });
      return NextResponse.json({ items: (rep as any).comments || [] });
    }
    return NextResponse.json({ items: [] });
  } catch (error: any) {
    console.error('[L-02] Error en GET comments:', error);
    return NextResponse.json({ items: [], error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const userId = session?.user?.id;
    const role = session?.user?.role || 'FACILITADOR';
    
    console.log(`[L-03] POST comment for report: ${params.id} by user: ${userId}`);

    if (!['ADMIN', 'COORDINACION'].includes(role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    const body = await req.json();
    const { sectionKey, fragmentId, text } = body || {};
    if (!sectionKey || !fragmentId || !text) {
      return NextResponse.json({ error: 'Datos faltantes' }, { status: 400 });
    }

    const commentId = randomUUID();
    const newComment = { 
      _id: commentId,
      sectionKey, 
      fragmentId, 
      text, 
      userId,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };

    if (USE_POSTGRES && sql) {
      const reportId = parseInt(params.id);
      if (isNaN(reportId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

      await sql`
        UPDATE reports 
        SET 
          comments = COALESCE(comments, '[]'::jsonb) || ${JSON.stringify(newComment)}::jsonb,
          status = 'CAMBIOS_SOLICITADOS',
          updated_at = NOW()
        WHERE id = ${reportId}
      `;
      return NextResponse.json({ ok: true, comment: newComment });
    } else if (process.env.MONGODB_URI) {
      const update = { 
        $push: { comments: newComment },
        $set: { status: 'CAMBIOS_SOLICITADOS' }
      } as any;
      await ReportModel.updateOne({ _id: params.id }, update);
      return NextResponse.json({ ok: true, comment: newComment });
    }

    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('[L-04] Error en POST comments:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const role = session?.user?.role || 'FACILITADOR';
    
    console.log(`[L-05] PUT comment status for report: ${params.id}`);

    if (!['ADMIN', 'COORDINACION'].includes(role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    const body = await req.json();
    const { commentId, status } = body || {};
    if (!commentId || !['OPEN', 'RESOLVED'].includes(status)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    if (USE_POSTGRES && sql) {
      const reportId = parseInt(params.id);
      if (isNaN(reportId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

      await sql`
        UPDATE reports
        SET comments = (
          SELECT COALESCE(jsonb_agg(
            CASE
              WHEN elem->>'_id' = ${commentId} THEN elem || jsonb_build_object('status', ${status})
              ELSE elem
            END
          ), '[]'::jsonb)
          FROM jsonb_array_elements(COALESCE(comments, '[]'::jsonb)) AS elem
        )
        WHERE id = ${reportId}
      `;
      return NextResponse.json({ ok: true });
    } else if (process.env.MONGODB_URI) {
      await ReportModel.updateOne(
        { _id: params.id, 'comments._id': commentId }, 
        { $set: { 'comments.$.status': status } }
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('Error en PUT comments:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido' }, { status: 500 });
  }
}
