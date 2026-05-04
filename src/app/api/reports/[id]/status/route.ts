import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AuditLogModel } from '@/models/AuditLog';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const role = (session?.user as any)?.role || 'FACILITADOR';
    const body = await req.json();
    const status = body?.status;
    
    if (!['BORRADOR', 'EN_REVISION', 'CAMBIOS_SOLICITADOS', 'APROBADO'].includes(status)) {
      return NextResponse.json({ error: 'status inválido' }, { status: 400 });
    }
    
    // Validar permisos
    if (status === 'APROBADO' && !['ADMIN', 'COORDINACION'].includes(role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    if (status === 'CAMBIOS_SOLICITADOS' && !['ADMIN', 'COORDINACION'].includes(role)) {
      return NextResponse.json({ error: 'Solo ADMIN y COORDINACION pueden solicitar cambios' }, { status: 403 });
    }

    // Obtener informe para validaciones
    let rep: any = null;
    
    if (sql) {
      // Postgres
      const result = await sql`SELECT * FROM reports WHERE id = ${parseInt(params.id)}`;
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'not found' }, { status: 404 });
      }
      rep = result.rows[0];
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      rep = await ReportModel.findById(params.id).lean();
      if (!rep) return NextResponse.json({ error: 'not found' }, { status: 404 });
    } else {
      return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
    }

    // Validaciones para aprobación
    if (status === 'APROBADO') {
      const reportData = rep.data || (rep as any).data;
      const secciones = reportData?.secciones || {};
      const missing: string[] = [];
      Object.entries(secciones).forEach(([clave, frags]: any) => {
        (frags as any[]).forEach((f: any, i: number) => {
          if (!Array.isArray(f.fuentes) || f.fuentes.length === 0) missing.push(`${clave}[${i}]`);
        });
      });
      
      const comments = rep.comments || [];
      const hasOpen = Array.isArray(comments) && comments.some((c: any) => c.status !== 'RESOLVED');
      
      if (missing.length > 0) {
        return NextResponse.json({ error: 'Faltan fuentes (trazabilidad) en fragmentos', missing }, { status: 400 });
      }
      if (hasOpen) {
        return NextResponse.json({ error: 'Hay comentarios abiertos; no se puede aprobar' }, { status: 400 });
      }
    }

    // Actualizar estado
    if (sql) {
      await sql`UPDATE reports SET status = ${status}, updated_at = NOW() WHERE id = ${parseInt(params.id)}`;
    } else if (process.env.MONGODB_URI) {
      await ReportModel.updateOne({ _id: params.id }, { $set: { status } });
    }

    // Auditoría
    try {
      const userId = session?.user ? (sql ? Number((session.user as any).id) : (session.user as any).id) : null;
      
      if (sql) {
        await sql`
          INSERT INTO audit_logs (entity_type, entity_id, action, user_id, meta, created_at)
          VALUES ('REPORT', ${parseInt(params.id)}, 'STATUS_CHANGE', ${userId}, ${JSON.stringify({ status })}::jsonb, NOW())
        `;
      } else if (process.env.MONGODB_URI) {
        await AuditLogModel.create({ 
          entityType: 'REPORT', 
          entityId: params.id as any, 
          action: 'STATUS_CHANGE', 
          meta: { status }, 
          userId: (session?.user as any)?.id 
        });
      }
    } catch (err) {
      console.error('Error guardando auditoría (no crítico):', err);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error cambiando estado:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido' }, { status: 500 });
  }
}


