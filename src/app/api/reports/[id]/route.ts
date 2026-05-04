import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AuditLogModel } from '@/models/AuditLog';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const role = (session?.user as any)?.role || 'FACILITADOR';
    
    // Solo ADMIN puede eliminar informes
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo ADMIN puede eliminar informes' }, { status: 403 });
    }

    // Verificar que el informe existe
    let exists = false;
    
    if (sql) {
      const checkResult = await sql`SELECT id FROM reports WHERE id = ${parseInt(params.id)}`;
      exists = checkResult.rows.length > 0;
    } else if (process.env.MONGODB_URI) {
      const report = await ReportModel.findById(params.id);
      exists = !!report;
    }

    if (!exists) {
      return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 });
    }

    // Eliminar informe
    if (sql) {
      await sql`DELETE FROM reports WHERE id = ${parseInt(params.id)}`;
    } else if (process.env.MONGODB_URI) {
      await ReportModel.deleteOne({ _id: params.id });
    }

    // Auditoría
    try {
      const userId = session?.user ? (sql ? Number((session.user as any).id) : (session.user as any).id) : null;
      
      if (sql) {
        await sql`
          INSERT INTO audit_logs (entity_type, entity_id, action, user_id, meta, created_at)
          VALUES ('REPORT', ${parseInt(params.id)}, 'DELETE', ${userId}, ${JSON.stringify({ reportId: params.id })}::jsonb, NOW())
        `;
      } else if (process.env.MONGODB_URI) {
        await AuditLogModel.create({
          entityType: 'REPORT',
          entityId: params.id as any,
          action: 'DELETE',
          meta: { reportId: params.id },
          userId: (session?.user as any)?.id
        });
      }
    } catch (err) {
      console.error('Error guardando auditoría (no crítico):', err);
    }

    return NextResponse.json({ ok: true, message: 'Informe eliminado correctamente' });
  } catch (error: any) {
    console.error('Error eliminando informe:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido' }, { status: 500 });
  }
}

