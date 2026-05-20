import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que el borrador existe
    let exists = false;
    if (sql) {
      const checkResult = await sql`SELECT id FROM forms WHERE id = ${parseInt(params.id)}`;
      exists = checkResult.rows.length > 0;
    } else if (process.env.MONGODB_URI) {
      const { FormModel } = await import('@/models/Form');
      const form = await FormModel.findById(params.id);
      exists = !!form;
    }

    if (!exists) {
      return NextResponse.json({ error: 'Borrador no encontrado' }, { status: 404 });
    }

    // Eliminar borrador
    if (sql) {
      await sql`DELETE FROM forms WHERE id = ${parseInt(params.id)}`;
    } else if (process.env.MONGODB_URI) {
      const { FormModel } = await import('@/models/Form');
      await FormModel.deleteOne({ _id: params.id });
    }

    // Auditoría (Opcional)
    try {
      const userId = session?.user ? (sql ? Number((session.user as any).id) : (session.user as any).id) : null;
      if (sql) {
        await sql`
          INSERT INTO audit_logs (entity_type, entity_id, action, user_id, meta, created_at)
          VALUES ('FORM', ${parseInt(params.id)}, 'DELETE', ${userId}, ${JSON.stringify({ formId: params.id })}::jsonb, NOW())
        `;
      } else if (process.env.MONGODB_URI) {
        const { AuditLogModel } = await import('@/models/AuditLog');
        await AuditLogModel.create({
          entityType: 'FORM',
          entityId: params.id as any,
          action: 'DELETE',
          meta: { formId: params.id },
          userId: (session?.user as any)?.id
        });
      }
    } catch (err) {
      console.error('Error guardando auditoría (no crítico):', err);
    }

    return NextResponse.json({ ok: true, message: 'Borrador eliminado correctamente' });
  } catch (error: any) {
    console.error('Error eliminando borrador:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido' }, { status: 500 });
  }
}
