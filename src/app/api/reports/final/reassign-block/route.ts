import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!sql) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const body = await req.json();
    const { reportId, formId, targetYoungId } = body;

    if (!targetYoungId || (!reportId && !formId)) {
      return NextResponse.json({ error: 'targetYoungId y (reportId o formId) son requeridos' }, { status: 400 });
    }

    // Verificar concurrente destino
    const targetYoungRes = await sql`
      SELECT id, nombre_completo, taller FROM youngs WHERE id = ${parseInt(targetYoungId)}
    `;
    if (targetYoungRes.rows.length === 0) {
      return NextResponse.json({ error: 'Concurrente destino no encontrado' }, { status: 404 });
    }
    const targetYoung = targetYoungRes.rows[0];

    // 1. Reasignar Informe Trimestral
    if (reportId) {
      const repRes = await sql`SELECT id, young_id, periodo, data FROM reports WHERE id = ${parseInt(reportId)}`;
      if (repRes.rows.length === 0) {
        return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 });
      }

      const rep = repRes.rows[0];
      const data = rep.data || {};
      if (data.datosGenerales) {
        data.datosGenerales.nombreCompleto = targetYoung.nombre_completo;
        data.datosGenerales.grupo = targetYoung.taller;
        data.datosGenerales.taller = targetYoung.taller;
      }

      await sql`
        UPDATE reports
        SET young_id = ${targetYoung.id},
            data = ${JSON.stringify(data)}::jsonb,
            updated_at = NOW()
        WHERE id = ${rep.id}
      `;

      return NextResponse.json({
        ok: true,
        message: `Informe #${rep.id} reasignado exitosamente a ${targetYoung.nombre_completo} (${targetYoung.taller}).`,
        targetYoung
      });
    }

    // 2. Reasignar Formulario Mensual
    if (formId) {
      const fRes = await sql`SELECT id, young_id, periodo FROM forms WHERE id = ${parseInt(formId)}`;
      if (fRes.rows.length === 0) {
        return NextResponse.json({ error: 'Formulario mensual no encontrado' }, { status: 404 });
      }

      await sql`
        UPDATE forms
        SET young_id = ${targetYoung.id},
            updated_at = NOW()
        WHERE id = ${parseInt(formId)}
      `;

      return NextResponse.json({
        ok: true,
        message: `Formulario mensual #${formId} reasignado exitosamente a ${targetYoung.nombre_completo}.`,
        targetYoung
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err: any) {
    console.error('Error reasignando bloque:', err);
    return NextResponse.json({ error: err?.message || 'Error en servidor' }, { status: 500 });
  }
}
