import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const USE_POSTGRES = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('[API /forms] POST request iniciado');
  
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const body = await req.json();
    const { data, saveAsDraft } = body || {};
    const formData = data || body?.data;
    
    if (!formData) {
      return NextResponse.json({ error: 'data requerido' }, { status: 400 });
    }
    
    console.log('[API /forms] Sesión:', session ? { email: session.user?.email } : 'null');
    console.log('[API /forms] Body recibido, saveAsDraft:', saveAsDraft);
    
    const periodo = formData?.datosGenerales?.periodo || 'No informado';
    const youngId = formData?.datosGenerales?.youngId || null;
    const createdBy = session?.user ? Number((session.user as any).id) : null;
    
    if (USE_POSTGRES && sql) {
      // Si es guardado automático, intentar actualizar borrador existente primero
      if (saveAsDraft && createdBy && periodo && formData?.datosGenerales?.nombreCompleto) {
        try {
          const existing = await sql`
            SELECT id FROM forms 
            WHERE created_by = ${createdBy} 
              AND periodo = ${periodo}
              AND data->'datosGenerales'->>'nombreCompleto' = ${formData?.datosGenerales?.nombreCompleto}
            ORDER BY updated_at DESC
            LIMIT 1
          `;
          
          if (existing.rows.length > 0) {
            // Actualizar borrador existente
            await sql`
              UPDATE forms 
              SET data = ${JSON.stringify(formData)}::jsonb, updated_at = NOW()
              WHERE id = ${existing.rows[0].id}
            `;
            return NextResponse.json({ id: String(existing.rows[0].id), updated: true });
          }
        } catch (err) {
          console.log('[API /forms] No se pudo buscar borrador existente, creando nuevo:', err);
        }
      }
      
      // Crear nuevo formulario
      console.log('[API /forms] Usando Postgres para crear formulario...');
      const result = await sql`
        INSERT INTO forms (periodo, young_id, data, created_by, created_at, updated_at)
        VALUES (${periodo}, ${youngId}, ${JSON.stringify(formData)}::jsonb, ${createdBy}, NOW(), NOW())
        RETURNING id
      `;
      const id = String(result.rows[0].id);
      console.log('[API /forms] ✅ Formulario creado:', id);
      return NextResponse.json({ id }, { status: 201 });
    } else if (process.env.MONGODB_URI) {
      // Si es guardado automático, intentar actualizar borrador existente primero
      if (saveAsDraft && createdBy && periodo && formData?.datosGenerales?.nombreCompleto) {
        try {
          const { FormModel } = await import('@/models/Form');
          const existing = await FormModel.findOne({
            createdBy,
            periodo,
            'data.datosGenerales.nombreCompleto': formData?.datosGenerales?.nombreCompleto
          }).sort({ updatedAt: -1 });
          
          if (existing) {
            // Actualizar borrador existente
            existing.data = formData;
            existing.updatedAt = new Date();
            await existing.save();
            return NextResponse.json({ id: existing._id.toString(), updated: true });
          }
        } catch (err) {
          console.log('[API /forms] No se pudo buscar borrador existente, creando nuevo:', err);
        }
      }
      
      // Crear nuevo formulario
      console.log('[API /forms] Usando MongoDB para crear formulario...');
      const { FormModel } = await import('@/models/Form');
      const created = await FormModel.create({
        periodo,
        youngId: youngId || undefined,
        data: formData,
        createdBy: session?.user ? (session.user as any).id : undefined
      });
      console.log('[API /forms] ✅ Formulario creado');
      return NextResponse.json({ id: created._id.toString() }, { status: 201 });
    }

    console.log('[API /forms] ❌ DB no configurada');
    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('[API /forms] ❌ Error:', error?.message || error);
    console.error('[API /forms] Stack:', error?.stack);
    return NextResponse.json({ error: error?.message || 'Error desconocido' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const body = await req.json();
    const { id, data } = body || {};
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    
    // FACILITADOR solo puede actualizar lo suyo
    const role = (session?.user as any)?.role || 'FACILITADOR';
    
    if (USE_POSTGRES && sql) {
      // Postgres
      const userId = session?.user ? Number((session.user as any).id) : null;
      let query;
      if (role === 'FACILITADOR') {
        query = sql`UPDATE forms SET data = ${JSON.stringify(data)}::jsonb, periodo = ${data?.datosGenerales?.periodo || 'No informado'}, updated_at = NOW() WHERE id = ${Number(id)} AND created_by = ${userId} RETURNING id`;
      } else {
        query = sql`UPDATE forms SET data = ${JSON.stringify(data)}::jsonb, periodo = ${data?.datosGenerales?.periodo || 'No informado'}, updated_at = NOW() WHERE id = ${Number(id)} RETURNING id`;
      }
      const result = await query;
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'No encontrado o sin permisos' }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      const { FormModel } = await import('@/models/Form');
      const filter: any = { _id: id };
      if (role === 'FACILITADOR') filter.createdBy = (session?.user as any)?.id;
      await FormModel.updateOne(filter, { $set: { data, periodo: data?.datosGenerales?.periodo || 'No informado' } });
      return NextResponse.json({ ok: true });
    }
    
    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('[API /forms] ❌ Error en PUT:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Error desconocido' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  console.log('[API /forms] GET request iniciado');
  
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const role = (session?.user as any)?.role || 'FACILITADOR';
    
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;
    
    const youngIdParam = url.searchParams.get('youngId');
    
    console.log('[API /forms] Sesión:', session ? { email: session.user?.email, role } : 'null', 'Filter youngId:', youngIdParam);
    
    if (USE_POSTGRES && sql) {
      console.log('[API /forms] Usando Postgres...');
      let countQuery;
      let dataQuery;
      const youngIdFilter = youngIdParam ? Number(youngIdParam) : null;
      
      if (role === 'FACILITADOR' && session?.user) {
        const userId = Number((session.user as any).id);
        if (youngIdFilter) {
          countQuery = sql`SELECT COUNT(*) as total FROM forms WHERE created_by = ${userId} AND young_id = ${youngIdFilter}`;
          dataQuery = sql`
            SELECT 
              f.*,
              u.name as facilitador_nombre,
              u.email as facilitador_email,
              y.nombre_completo as joven_nombre
            FROM forms f
            LEFT JOIN users u ON f.created_by = u.id
            LEFT JOIN youngs y ON f.young_id = y.id
            WHERE f.created_by = ${userId} AND f.young_id = ${youngIdFilter}
            ORDER BY f.updated_at DESC
            LIMIT ${pageSize} OFFSET ${offset}
          `;
        } else {
          countQuery = sql`SELECT COUNT(*) as total FROM forms WHERE created_by = ${userId}`;
          dataQuery = sql`
            SELECT 
              f.*,
              u.name as facilitador_nombre,
              u.email as facilitador_email,
              y.nombre_completo as joven_nombre
            FROM forms f
            LEFT JOIN users u ON f.created_by = u.id
            LEFT JOIN youngs y ON f.young_id = y.id
            WHERE f.created_by = ${userId}
            ORDER BY f.updated_at DESC
            LIMIT ${pageSize} OFFSET ${offset}
          `;
        }
      } else {
        if (youngIdFilter) {
          countQuery = sql`SELECT COUNT(*) as total FROM forms WHERE young_id = ${youngIdFilter}`;
          dataQuery = sql`
            SELECT 
              f.*,
              u.name as facilitador_nombre,
              u.email as facilitador_email,
              y.nombre_completo as joven_nombre
            FROM forms f
            LEFT JOIN users u ON f.created_by = u.id
            LEFT JOIN youngs y ON f.young_id = y.id
            WHERE f.young_id = ${youngIdFilter}
            ORDER BY f.updated_at DESC
            LIMIT ${pageSize} OFFSET ${offset}
          `;
        } else {
          countQuery = sql`SELECT COUNT(*) as total FROM forms`;
          dataQuery = sql`
            SELECT 
              f.*,
              u.name as facilitador_nombre,
              u.email as facilitador_email,
              y.nombre_completo as joven_nombre
            FROM forms f
            LEFT JOIN users u ON f.created_by = u.id
            LEFT JOIN youngs y ON f.young_id = y.id
            ORDER BY f.updated_at DESC
            LIMIT ${pageSize} OFFSET ${offset}
          `;
        }
      }
      
      const countResult = await countQuery;
      const total = parseInt(countResult.rows[0].total);
      const result = await dataQuery;
      
      const items = result.rows.map((row: any) => ({
        _id: String(row.id),
        periodo: row.periodo,
        youngId: row.young_id,
        data: row.data,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        status: row.status || 'BORRADOR',
        facilitadorNombre: row.facilitador_nombre || row.facilitador_email || 'Sin facilitador',
        jovenNombre: row.joven_nombre || row.data?.datosGenerales?.nombreCompleto || 'Sin joven asignado'
      }));
      console.log('[API /forms] ✅ Formularios encontrados:', items.length);
      return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    } else if (process.env.MONGODB_URI) {
      console.log('[API /forms] Usando MongoDB...');
      const { FormModel } = await import('@/models/Form');
      const { UserModel } = await import('@/models/User');
      const { YoungModel } = await import('@/models/Young');
      const findFilter: any = {};
      if (role === 'FACILITADOR') findFilter.createdBy = (session?.user as any)?.id;
      if (youngIdParam) findFilter.youngId = youngIdParam;
      const total = await FormModel.countDocuments(findFilter);
      const items = await FormModel.find(findFilter).sort({ updatedAt: -1 }).limit(pageSize).skip(offset).lean();
      
      // Populate facilitador y joven
      const itemsWithNames = await Promise.all(items.map(async (item: any) => {
        let facilitadorNombre = 'Sin facilitador';
        let jovenNombre = item.data?.datosGenerales?.nombreCompleto || 'Sin joven asignado';
        
        if (item.createdBy) {
          try {
            const user = await UserModel.findById(item.createdBy).lean();
            if (user) {
              facilitadorNombre = user.name || user.email || 'Sin facilitador';
            }
          } catch (err) {
            console.error('Error obteniendo facilitador:', err);
          }
        }
        
        if (item.youngId) {
          try {
            const young = await YoungModel.findById(item.youngId).lean();
            if (young) {
              jovenNombre = young.nombreCompleto || jovenNombre;
            }
          } catch (err) {
            console.error('Error obteniendo joven:', err);
          }
        }
        
        return {
          ...item,
          facilitadorNombre,
          jovenNombre
        };
      }));
      
      console.log('[API /forms] ✅ Formularios encontrados:', itemsWithNames.length);
      return NextResponse.json({ items: itemsWithNames, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    }

    console.log('[API /forms] ⚠️ DB no configurada');
    return NextResponse.json({ items: [] });
  } catch (error: any) {
    console.error('[API /forms] ❌ Error:', error?.message || error);
    console.error('[API /forms] Stack:', error?.stack);
    return NextResponse.json({ items: [], error: error?.message });
  }
}


