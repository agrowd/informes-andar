import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { YoungModel } from '@/models/Young';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const role = (session?.user as any)?.role || 'FACILITADOR';
    
    // Permitir editar a ADMIN, DIRECTOR y COORDINACION
    if (!['ADMIN', 'COORDINACION', 'DIRECTOR'].includes(role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    console.log(`[YOUNGS-API] Petición PUT para ID: ${params.id}`);
    console.log(`[YOUNGS-API] Datos recibidos:`, {
      nombre: body.nombreCompleto,
      dni: body.dni,
      taller: body.taller,
      hasFoto: !!body.foto,
      fotoLength: body.foto?.length || 0
    });

    const { nombreCompleto, dni, taller, assignedFacilitators, fechaNacimiento, circuloApoyo, foto, legajo, obraSocial } = body;

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
      await sql`
        UPDATE youngs 
        SET 
          nombre_completo = ${nombreCompleto},
          dni = ${dni || null},
          taller = ${taller || null},
          assigned_facilitators = ${arrayString}::int4[],
          fecha_nacimiento = ${fechaNacimiento || null},
          circulo_apoyo = ${JSON.stringify(circuloApoyo || [])}::jsonb,
          foto = ${foto || null},
          legajo = ${legajo || null},
          obra_social = ${obraSocial || null},
          updated_at = NOW()
        WHERE id = ${parseInt(params.id)}
      `;
      return NextResponse.json({ ok: true });
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      await YoungModel.updateOne(
        { _id: params.id },
        {
          $set: {
            nombreCompleto,
            dni: dni || undefined,
            taller: taller || undefined,
            assignedFacilitators: assignedFacilitators || [],
            fechaNacimiento: fechaNacimiento || undefined,
            circuloApoyo: circuloApoyo || [],
            foto: foto || undefined,
            legajo: legajo || undefined,
            obraSocial: obraSocial || undefined
          }
        }
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('Error editando joven:', error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const role = (session?.user as any)?.role || 'FACILITADOR';
    
    // Permitir eliminar solo a ADMIN y DIRECTOR
    if (!['ADMIN', 'DIRECTOR'].includes(role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Verificar que no tenga informes asociados (soft delete)
    if (sql) {
      const reportsCount = await sql`
        SELECT COUNT(*) as count FROM reports WHERE young_id = ${parseInt(params.id)}
      `;
      if (reportsCount.rows[0]?.count > 0) {
        return NextResponse.json({ error: 'No se puede eliminar: el joven tiene informes asociados' }, { status: 400 });
      }
      await sql`DELETE FROM youngs WHERE id = ${parseInt(params.id)}`;
    } else if (process.env.MONGODB_URI) {
      const reportsCount = await (await import('@/models/Report')).ReportModel.countDocuments({ youngId: params.id });
      if (reportsCount > 0) {
        return NextResponse.json({ error: 'No se puede eliminar: el joven tiene informes asociados' }, { status: 400 });
      }
      await YoungModel.deleteOne({ _id: params.id });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error eliminando joven:', error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

