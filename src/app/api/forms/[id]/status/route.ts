import { NextRequest, NextResponse } from 'next/server';
import { connectToDB } from '@/lib/db';
import { FormModel } from '@/models/Form';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AuditLogModel } from '@/models/AuditLog';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  }
  await connectToDB();
  const session = await getServerSession(authOptions as any) as any;
  const body = await req.json();
  const status = body?.status;
  if (!['BORRADOR', 'EN_REVISION', 'APROBADO'].includes(status)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 });
  }
  const role = (session?.user as any)?.role || 'FACILITADOR';
  if (status === 'APROBADO' && !['ADMIN', 'COORDINACION'].includes(role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const filter: any = { _id: params.id };
  if (role === 'FACILITADOR') filter.createdBy = (session?.user as any)?.id;
  await FormModel.updateOne(filter, { $set: { status } });
  try { 
    await AuditLogModel.create({ entityType: 'FORM', entityId: params.id as any, action: 'STATUS_CHANGE', meta: { status }, userId: (session?.user as any)?.id }); 
  } catch (err) {
    // Log error pero no fallar el cambio de estado
    console.error('Error guardando auditoría (no crítico):', err);
  }
  return NextResponse.json({ ok: true });
}


