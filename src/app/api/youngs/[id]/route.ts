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
    
    // Permitir editar a ADMIN, DIRECTOR, COORDINACION y FACILITADOR
    if (!['ADMIN', 'COORDINACION', 'DIRECTOR', 'FACILITADOR'].includes(role)) {
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
          pcp = ${JSON.stringify(pcp || {})}::jsonb,
          updated_at = NOW()
        WHERE id = ${parseInt(params.id)}
      `;

      // Sincronizar taller, grupo y nombre en las planillas forms asociadas
      try {
        await sql`
          UPDATE forms
          SET data = jsonb_set(
            jsonb_set(
              jsonb_set(COALESCE(data, '{}'::jsonb), '{datosGenerales,taller}', to_jsonb(${taller || ''}::text)),
              '{datosGenerales,grupo}', to_jsonb(${taller || ''}::text)
            ),
            '{datosGenerales,nombreCompleto}', to_jsonb(${nombreCompleto}::text)
          ),
          updated_at = NOW()
          WHERE young_id = ${parseInt(params.id)}
        `;

        // Si se asignó al menos un facilitador, sincronizar ownership y nombre en forms y reports
        if (facilitatorIds.length > 0) {
          const facId = facilitatorIds[0];
          const facUserRes = await sql`SELECT id, name FROM users WHERE id = ${facId}`;
          const facName = facUserRes.rows[0]?.name || '';

          await sql`
            UPDATE forms
            SET 
              created_by = ${facId},
              data = jsonb_set(
                jsonb_set(COALESCE(data, '{}'::jsonb), '{datosGenerales,facilitador}', to_jsonb(${facName}::text)),
                '{datosGenerales,facilitadorNombre}', to_jsonb(${facName}::text)
              ),
              updated_at = NOW()
            WHERE young_id = ${parseInt(params.id)}
          `;

          await sql`
            UPDATE reports
            SET generated_by = ${facId}, updated_at = NOW()
            WHERE young_id = ${parseInt(params.id)}
          `;
        }
      } catch (syncErr) {
        console.error('[PUT /api/youngs/[id]] Error sincronizando forms/reports:', syncErr);
      }

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
            obraSocial: obraSocial || undefined,
            pcp: pcp || {}
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
    
    // Permitir eliminar a ADMIN, DIRECTOR y COORDINACION
    if (!['ADMIN', 'DIRECTOR', 'COORDINACION'].includes(role)) {
      return NextResponse.json({ error: 'No autorizado para eliminar concurrentes' }, { status: 403 });
    }

    const youngIdInt = parseInt(params.id);

    if (sql) {
      // 1. Borrar comentarios y auditorías asociadas a los informes del joven
      const repRows = await sql`SELECT id FROM reports WHERE young_id = ${youngIdInt}`;
      const repIds = repRows.rows.map(r => r.id);
      if (repIds.length > 0) {
        const repIdsArrayStr = `{${repIds.join(',')}}`;
        await sql`DELETE FROM report_comments WHERE report_id = ANY(${repIdsArrayStr}::int4[])`.catch(() => {});
        await sql`DELETE FROM audit_logs WHERE entity_type = 'REPORT' AND entity_id = ANY(${repIdsArrayStr}::int4[])`.catch(() => {});
      }

      // 2. Borrar informes y formularios (borradores) del joven
      await sql`DELETE FROM reports WHERE young_id = ${youngIdInt}`;
      await sql`DELETE FROM forms WHERE young_id = ${youngIdInt}`;
      
      // 3. Borrar el registro del joven
      const deleteResult = await sql`DELETE FROM youngs WHERE id = ${youngIdInt} RETURNING id`;
      if (deleteResult.rows.length === 0) {
        return NextResponse.json({ error: 'Concurrente no encontrado' }, { status: 404 });
      }
    } else if (process.env.MONGODB_URI) {
      const { ReportModel } = await import('@/models/Report');
      const { FormModel } = await import('@/models/Form');
      await ReportModel.deleteMany({ youngId: params.id });
      await FormModel.deleteMany({ youngId: params.id });
      await YoungModel.deleteOne({ _id: params.id });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error eliminando joven:', error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

