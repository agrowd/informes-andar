import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const USE_POSTGRES = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);

export async function GET(
  _: NextRequest, 
  { params }: { params: Promise<{ key: string }> }
) {
  const startTime = Date.now();
  console.log('[API /editable-text/[key]] GET request iniciado');
  
  try {
    const resolvedParams = await params;
    const key = resolvedParams.key;
    console.log('[API /editable-text/[key]] Key:', key);
    
  await connectToDB();
    console.log('[API /editable-text/[key]] DB conectada');
    
    if (USE_POSTGRES && sql) {
      console.log('[API /editable-text/[key]] Usando Postgres...');
      const result = await sql`SELECT text, updated_at FROM editable_texts WHERE key = ${key} LIMIT 1`;
      const doc = result.rows[0];
      console.log('[API /editable-text/[key]] ✅ Éxito - Tiempo:', Date.now() - startTime, 'ms');
      return NextResponse.json({ text: doc?.text ?? null, updatedAt: doc?.updated_at ?? null });
    } else if (process.env.MONGODB_URI) {
      console.log('[API /editable-text/[key]] Usando MongoDB...');
      const { EditableTextModel } = await import('@/models/EditableText');
      const doc = await EditableTextModel.findOne({ key }).lean();
      console.log('[API /editable-text/[key]] ✅ Éxito - Tiempo:', Date.now() - startTime, 'ms');
  return NextResponse.json({ text: doc?.text ?? null, updatedAt: doc?.updatedAt ?? null });
}

    console.log('[API /editable-text/[key]] ⚠️ DB no configurada');
    return NextResponse.json({ text: null });
  } catch (error: any) {
    console.error('[API /editable-text/[key]] ❌ Error:', error?.message || error);
    console.error('[API /editable-text/[key]] Stack:', error?.stack);
    return NextResponse.json({ text: null, error: error?.message });
  }
}

export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ key: string }> }
) {
  const startTime = Date.now();
  console.log('[API /editable-text/[key]] PUT request iniciado');
  
  try {
    const resolvedParams = await params;
    const key = resolvedParams.key;
    console.log('[API /editable-text/[key]] Key:', key);
    
  await connectToDB();
  const session = await getServerSession(authOptions as any) as any;
  const role = (session?.user as any)?.role || 'FACILITADOR';
  const allowAny = process.env.EDITABLE_ALLOW_ANY === 'true' || process.env.NODE_ENV !== 'production';
    
    console.log('[API /editable-text/[key]] Sesión:', session ? { email: session.user?.email, role } : 'null');
    console.log('[API /editable-text/[key]] AllowAny:', allowAny);
    
  if (!allowAny && (!session || !['ADMIN', 'COORDINACION'].includes(role))) {
      console.log('[API /editable-text/[key]] ❌ No autorizado');
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
    
  const body = await req.json();
  const text = (body?.text ?? '').toString();
    if (text.length === 0) {
      console.log('[API /editable-text/[key]] ❌ Texto vacío');
      return NextResponse.json({ error: 'Texto vacío' }, { status: 400 });
    }

    if (USE_POSTGRES && sql) {
      console.log('[API /editable-text/[key]] Usando Postgres para actualizar...');
      const userId = session?.user ? Number((session.user as any).id) : null;
      const result = await sql`
        INSERT INTO editable_texts (key, text, updated_by, updated_at)
        VALUES (${key}, ${text}, ${userId}, NOW())
        ON CONFLICT (key) 
        DO UPDATE SET text = ${text}, updated_by = ${userId}, updated_at = NOW()
        RETURNING text, updated_at
      `;
      const updated = result.rows[0];
      console.log('[API /editable-text/[key]] ✅ Éxito - Tiempo:', Date.now() - startTime, 'ms');
      return NextResponse.json({ ok: true, text: updated.text, updatedAt: updated.updated_at });
    } else if (process.env.MONGODB_URI) {
      console.log('[API /editable-text/[key]] Usando MongoDB para actualizar...');
      const { EditableTextModel } = await import('@/models/EditableText');
  const updated = await EditableTextModel.findOneAndUpdate(
        { key },
    { $set: { text, updatedBy: (session?.user as any)?.id } },
    { new: true, upsert: true }
  ).lean();
      console.log('[API /editable-text/[key]] ✅ Éxito - Tiempo:', Date.now() - startTime, 'ms');
  return NextResponse.json({ ok: true, text: updated.text, updatedAt: updated.updatedAt });
}

    console.log('[API /editable-text/[key]] ❌ DB no configurada');
    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('[API /editable-text/[key]] ❌ Error:', error?.message || error);
    console.error('[API /editable-text/[key]] Stack:', error?.stack);
    return NextResponse.json({ error: error?.message || 'Error desconocido' }, { status: 500 });
  }
}
