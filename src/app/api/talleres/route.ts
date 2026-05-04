import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    
    if (sql) {
      // Postgres
      const result = await sql`SELECT * FROM talleres ORDER BY nombre ASC`;
      return NextResponse.json({ items: result.rows });
    } else if (process.env.MONGODB_URI) {
      // MongoDB - usar colección simple
      const { clientPromise } = await import('@/lib/mongodb');
      const client = await clientPromise!;
      const db = client.db();
      const talleres = await db.collection('talleres').find({}).sort({ nombre: 1 }).toArray();
      return NextResponse.json({ items: talleres });
    }

    return NextResponse.json({ items: [] });
  } catch (error) {
    console.error('Error obteniendo talleres:', error);
    return NextResponse.json({ items: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const role = (session?.user as any)?.role || 'FACILITADOR';
    
    // Permitir crear a ADMIN, DIRECTOR y COORDINACION
    if (!['ADMIN', 'COORDINACION', 'DIRECTOR'].includes(role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { nombre, descripcion } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    }

    if (sql) {
      // Postgres
      const userId = session?.user ? Number((session.user as any).id) : null;
      const result = await sql`
        INSERT INTO talleres (nombre, descripcion, created_by)
        VALUES (${nombre}, ${descripcion || null}, ${userId})
        RETURNING id
      `;
      return NextResponse.json({ id: String(result.rows[0].id) }, { status: 201 });
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      const { clientPromise } = await import('@/lib/mongodb');
      const client = await clientPromise!;
      const db = client.db();
      const result = await db.collection('talleres').insertOne({
        nombre,
        descripcion: descripcion || undefined,
        createdBy: session?.user ? (session.user as any).id : undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return NextResponse.json({ id: result.insertedId.toString() }, { status: 201 });
    }

    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('Error creando taller:', error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

