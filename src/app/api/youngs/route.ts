import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    await connectToDB();

    // MIGRACIÓN RÁPIDA: Ampliar columna foto a TEXT para soportar Base64
    if (sql) {
      try {
        await sql`ALTER TABLE youngs ALTER COLUMN foto TYPE TEXT`;
      } catch (e) {
        // Ya es TEXT o la tabla aún no existe
      }
    }
    const session = await getServerSession(authOptions as any) as any;
    const role = (session?.user as any)?.role || 'FACILITADOR';
    const userId = (session?.user as any)?.id;

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    if (sql) {
      // Postgres
      let countQuery;
      let dataQuery;
      
      if (role === 'FACILITADOR') {
        // Solo jóvenes asignados al facilitador
        countQuery = sql`SELECT COUNT(*) as total FROM youngs WHERE ${userId} = ANY(assigned_facilitators)`;
        dataQuery = sql`
          SELECT * FROM youngs 
          WHERE ${userId} = ANY(assigned_facilitators)
          ORDER BY nombre_completo ASC
          LIMIT ${pageSize} OFFSET ${offset}
        `;
      } else {
        // ADMIN, DIRECTOR, COORDINACION ven todos
        countQuery = sql`SELECT COUNT(*) as total FROM youngs`;
        dataQuery = sql`
          SELECT * FROM youngs 
          ORDER BY nombre_completo ASC
          LIMIT ${pageSize} OFFSET ${offset}
        `;
      }
      
      const countResult = await countQuery;
      const total = parseInt(countResult.rows[0].total);
      const result = await dataQuery;
      
      const mapped = result.rows.map((y: any) => ({
        id: y.id,
        _id: String(y.id), // Compatibilidad
        nombreCompleto: y.nombre_completo,
        dni: y.dni,
        taller: y.taller,
        circuloApoyo: y.circulo_apoyo,
        assignedFacilitators: y.assigned_facilitators || [],
        fechaNacimiento: y.fecha_nacimiento,
        foto: y.foto,
        legajo: y.legajo,
        obraSocial: y.obra_social,
        pcp: y.pcp || {}
      }));
      return NextResponse.json({ items: mapped, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      const { YoungModel } = await import('@/models/Young');
      const filter: any = {};
      if (role === 'FACILITADOR') filter.assignedFacilitators = { $in: [userId] };
      const total = await YoungModel.countDocuments(filter);
      const items = await YoungModel.find(filter).sort({ nombreCompleto: 1 }).limit(pageSize).skip(offset).lean();
      return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    }

    return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
  } catch (error) {
    console.error('Error obteniendo jóvenes:', error);
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
    const { nombreCompleto, dni, taller, assignedFacilitators, fechaNacimiento, circuloApoyo, foto, legajo, obraSocial, pcp } = body;

    if (!nombreCompleto) {
      return NextResponse.json({ error: 'Nombre completo requerido' }, { status: 400 });
    }

    if (sql) {
      // Postgres - convertir assignedFacilitators a array de enteros
      const facilitatorIds = (assignedFacilitators || []).map((id: any) => parseInt(String(id))).filter((id: number) => !isNaN(id));
      
      // Construir el array como string en formato PostgreSQL {1,2,3}
      const arrayString = facilitatorIds.length > 0 
        ? `{${facilitatorIds.join(',')}}`
        : '{}';
      
      // Usar template literal directamente con el array como string literal
      // El formato {1,2,3} es válido en PostgreSQL y los IDs están validados como números
      const result = await sql`
        INSERT INTO youngs (nombre_completo, dni, taller, assigned_facilitators, fecha_nacimiento, circulo_apoyo, foto, legajo, obra_social, pcp)
        VALUES (
          ${nombreCompleto},
          ${dni || null},
          ${taller || null},
          ${arrayString}::int4[],
          ${fechaNacimiento || null},
          ${JSON.stringify(circuloApoyo || [])}::jsonb,
          ${foto || null},
          ${legajo || null},
          ${obraSocial || null},
          ${JSON.stringify(pcp || {})}::jsonb
        )
        RETURNING id
      `;
      return NextResponse.json({ id: String(result.rows[0].id) }, { status: 201 });
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      const { YoungModel } = await import('@/models/Young');
      const created = await YoungModel.create({
        nombreCompleto,
        dni: dni || undefined,
        taller: taller || undefined,
        assignedFacilitators: assignedFacilitators || [],
        fechaNacimiento: fechaNacimiento || undefined,
        circuloApoyo: circuloApoyo || [],
        foto: foto || undefined,
        legajo: legajo || undefined,
        obraSocial: obraSocial || undefined,
        pcp: pcp || {}
      });
      return NextResponse.json({ id: created._id.toString() }, { status: 201 });
    }

    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('Error creando joven:', error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}


