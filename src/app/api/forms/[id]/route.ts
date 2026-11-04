import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const formId = parseInt(params.id);
    if (isNaN(formId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    if (sql) {
      const res = await sql`
        SELECT f.*, 
               y.nombre_completo as joven_nombre,
               y.taller as grupo_institucional,
               COALESCE(NULLIF(f.data->'datosGenerales'->>'facilitadorNombre', ''), NULLIF(f.data->'datosGenerales'->>'facilitador', ''), u.name, 'Sin facilitador') as facilitador_nombre,
               COALESCE(f.data->'datosGenerales'->>'uploadedBy', f.data->'datosGenerales'->>'cargadoPor') as uploaded_by
        FROM forms f
        LEFT JOIN youngs y ON f.young_id = y.id
        LEFT JOIN users u ON f.created_by = u.id
        WHERE f.id = ${formId}
      `;

      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 });
      }

      const row = res.rows[0];
      return NextResponse.json({
        id: row.id,
        periodo: row.periodo,
        status: row.status || 'BORRADOR',
        youngId: row.young_id,
        jovenNombre: row.joven_nombre || 'Sin nombre',
        grupo: row.grupo_institucional || row.data?.datosGenerales?.grupo || row.data?.datosGenerales?.taller || 'Sin grupo',
        facilitadorNombre: row.facilitador_nombre,
        uploadedBy: row.uploaded_by || null,
        data: row.data,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    } else if (process.env.MONGODB_URI) {
      const { FormModel } = await import('@/models/Form');
      const form = await FormModel.findById(params.id).populate('youngId', 'nombreCompleto taller').lean();
      if (!form) return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 });
      const young: any = form.youngId;
      return NextResponse.json({
        id: String(form._id),
        periodo: form.periodo,
        status: form.status,
        youngId: young?._id ? String(young._id) : null,
        jovenNombre: young?.nombreCompleto || 'Sin nombre',
        grupo: young?.taller || 'Sin grupo',
        facilitadorNombre: (form as any).data?.datosGenerales?.facilitadorNombre || 'Sin facilitador',
        uploadedBy: (form as any).data?.datosGenerales?.uploadedBy || null,
        data: form.data,
        createdAt: (form as any).createdAt,
        updatedAt: (form as any).updatedAt
      });
    }

    return NextResponse.json({ error: 'DB no disponible' }, { status: 503 });
  } catch (error: any) {
    console.error('Error obteniendo detalle de formulario:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido' }, { status: 500 });
  }
}

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
