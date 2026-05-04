import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const role = (session?.user as any)?.role || 'FACILITADOR';
    
    // Permitir editar a ADMIN, DIRECTOR y COORDINACION
    if (!['ADMIN', 'COORDINACION', 'DIRECTOR'].includes(role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const resolvedParams = await params;
    const body = await req.json();
    const { nombre, descripcion } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    }

    if (sql) {
      // Postgres
      await sql`
        UPDATE talleres 
        SET 
          nombre = ${nombre},
          descripcion = ${descripcion || null},
          updated_at = NOW()
        WHERE id = ${parseInt(resolvedParams.id)}
      `;
      return NextResponse.json({ ok: true });
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      const { clientPromise } = await import('@/lib/mongodb');
      const client = await clientPromise!;
      const db = client.db();
      const { ObjectId } = await import('mongodb');
      await db.collection('talleres').updateOne(
        { _id: new ObjectId(resolvedParams.id) },
        {
          $set: {
            nombre,
            descripcion: descripcion || undefined,
            updatedAt: new Date()
          }
        }
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('Error editando taller:', error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const role = (session?.user as any)?.role || 'FACILITADOR';
    
    // Permitir eliminar solo a ADMIN y DIRECTOR
    if (!['ADMIN', 'DIRECTOR'].includes(role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const resolvedParams = await params;

    // Verificar que no haya jóvenes asignados a este taller
    if (sql) {
      const youngsCount = await sql`
        SELECT COUNT(*) as count FROM youngs WHERE taller = (SELECT nombre FROM talleres WHERE id = ${parseInt(resolvedParams.id)})
      `;
      if (youngsCount.rows[0]?.count > 0) {
        return NextResponse.json({ error: 'No se puede eliminar: hay jóvenes asignados a este taller' }, { status: 400 });
      }
      await sql`DELETE FROM talleres WHERE id = ${parseInt(resolvedParams.id)}`;
    } else if (process.env.MONGODB_URI) {
      const { clientPromise } = await import('@/lib/mongodb');
      const client = await clientPromise!;
      const db = client.db();
      const { ObjectId } = await import('mongodb');
      const taller = await db.collection('talleres').findOne({ _id: new ObjectId(resolvedParams.id) });
      if (taller) {
        const youngsCount = await db.collection('youngs').countDocuments({ taller: taller.nombre });
        if (youngsCount > 0) {
          return NextResponse.json({ error: 'No se puede eliminar: hay jóvenes asignados a este taller' }, { status: 400 });
        }
      }
      await db.collection('talleres').deleteOne({ _id: new ObjectId(resolvedParams.id) });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error eliminando taller:', error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

