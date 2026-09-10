import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateFinalReportNarrative } from '@/lib/ai/finalReportGenerator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/reports/final?youngId=XX
 * Consulta la disponibilidad de los 4 insumos requeridos para el Informe Final del joven:
 * 1) Trimestral 1 (Ene-Mar)
 * 2) Mensuales 1 (Abr-Jun)
 * 3) Trimestral 2 (Abr-Jun)
 * 4) Mensuales 2 (Ago-Sep)
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const youngIdStr = searchParams.get('youngId');
    if (!youngIdStr) {
      return NextResponse.json({ error: 'youngId es requerido' }, { status: 400 });
    }

    const youngId = parseInt(youngIdStr);
    if (!sql) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    // 1. Obtener joven
    const youngRes = await sql`SELECT id, nombre_completo, taller, pcp, assigned_facilitators FROM youngs WHERE id = ${youngId}`;
    if (youngRes.rows.length === 0) {
      return NextResponse.json({ error: 'Concurrente no encontrado' }, { status: 404 });
    }
    const young = youngRes.rows[0];

    // 2. Obtener informes trimestrales del joven
    const reportsRes = await sql`
      SELECT id, periodo, report_type, status, created_at, data
      FROM reports 
      WHERE young_id = ${youngId} AND report_type = 'TRIMESTRAL'
      ORDER BY id ASC
    `;

    // 3. Obtener cuadrículas mensuales del joven
    const formsRes = await sql`
      SELECT id, periodo, status, created_at, data
      FROM forms
      WHERE young_id = ${youngId}
      ORDER BY periodo ASC
    `;

    // Identificar Trimestral 1 (Ene - Mar)
    const t1 = reportsRes.rows.find(r => 
      r.periodo?.includes('01') || 
      r.periodo?.toLowerCase().includes('enero') || 
      r.periodo?.toLowerCase().includes('1er')
    ) || (reportsRes.rows.length > 0 ? reportsRes.rows[0] : null);

    // Identificar Trimestral 2 (Abr - Jun)
    const t2Candidates = reportsRes.rows.filter(r => (!t1 || r.id !== t1.id));
    const t2 = t2Candidates.find(r => 
      r.periodo?.includes('04') || 
      r.periodo?.toLowerCase().includes('abril') || 
      r.periodo?.toLowerCase().includes('2do')
    ) || (t2Candidates.length > 0 ? t2Candidates[0] : null);

    // Identificar Mensuales 1 (Abr - Jun: 04, 05, 06)
    const m1 = formsRes.rows.filter(f => 
      f.periodo?.includes('04') || 
      f.periodo?.includes('05') || 
      f.periodo?.includes('06') || 
      f.periodo?.toLowerCase().includes('abril') || 
      f.periodo?.toLowerCase().includes('mayo') || 
      f.periodo?.toLowerCase().includes('junio')
    );

    // Identificar Mensuales 2 (Ago - Sep: 08, 09)
    const m2 = formsRes.rows.filter(f => 
      f.periodo?.includes('08') || 
      f.periodo?.includes('09') || 
      f.periodo?.toLowerCase().includes('agosto') || 
      f.periodo?.toLowerCase().includes('septiembre') || 
      f.periodo?.toLowerCase().includes('setiembre')
    );

    // Verificar si ya tiene un Informe Final generado
    const existingFinalRes = await sql`
      SELECT id, periodo, status, created_at 
      FROM reports 
      WHERE young_id = ${youngId} AND report_type = 'FINAL'
      ORDER BY id DESC LIMIT 1
    `;

    return NextResponse.json({
      young: {
        id: young.id,
        nombre: young.nombre_completo,
        grupo: young.taller
      },
      blocks: {
        trimestral1: {
          available: !!t1,
          id: t1?.id || null,
          periodo: t1?.periodo || 'Enero - Febrero - Marzo'
        },
        mensuales1: {
          available: m1.length > 0,
          count: m1.length,
          periods: m1.map(f => f.periodo)
        },
        trimestral2: {
          available: !!t2,
          id: t2?.id || null,
          periodo: t2?.periodo || 'Abril - Mayo - Junio'
        },
        mensuales2: {
          available: m2.length > 0,
          count: m2.length,
          periods: m2.map(f => f.periodo)
        }
      },
      existingFinal: existingFinalRes.rows.length > 0 ? existingFinalRes.rows[0] : null
    });
  } catch (err: any) {
    console.error('Error diagnosticando insumos de informe final:', err);
    return NextResponse.json({ error: err?.message || 'Error en servidor' }, { status: 500 });
  }
}

/**
 * POST /api/reports/final
 * Genera el Informe Final Anual consolidado con IA a partir de los 4 insumos institucionales.
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const sessionUserId = session.user ? Number((session.user as any).id) : null;
    const body = await req.json();
    const { youngId, trimestral1Id, trimestral2Id, mensuales1Ids, mensuales2Ids } = body;

    if (!youngId) {
      return NextResponse.json({ error: 'youngId es requerido' }, { status: 400 });
    }

    if (!sql) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    // 1. Obtener concurrente con su PCP y facilitador
    const youngRes = await sql`
      SELECT y.*, COALESCE(u.name, 'Facilitador no asignado') as facilitador_nombre
      FROM youngs y
      LEFT JOIN users u ON (y.assigned_facilitators IS NOT NULL AND array_length(y.assigned_facilitators, 1) > 0 AND u.id = y.assigned_facilitators[1])
      WHERE y.id = ${parseInt(youngId)}
    `;

    if (youngRes.rows.length === 0) {
      return NextResponse.json({ error: 'Concurrente no encontrado' }, { status: 404 });
    }
    const young = youngRes.rows[0];

    // 2. Obtener Trimestral 1
    let trimestral1: any = null;
    if (trimestral1Id) {
      const t1Res = await sql`SELECT id, periodo, data FROM reports WHERE id = ${parseInt(trimestral1Id)}`;
      if (t1Res.rows.length > 0) trimestral1 = t1Res.rows[0];
    } else {
      const t1Auto = await sql`
        SELECT id, periodo, data FROM reports 
        WHERE young_id = ${young.id} AND report_type = 'TRIMESTRAL'
        AND (periodo ILIKE '%01%' OR periodo ILIKE '%02%' OR periodo ILIKE '%03%' OR periodo ILIKE '%enero%' OR periodo ILIKE '%1%trimestre%')
        ORDER BY id ASC LIMIT 1
      `;
      if (t1Auto.rows.length > 0) trimestral1 = t1Auto.rows[0];
      else {
        // Tomar el más antiguo si no tiene filtro específico
        const t1Fallback = await sql`
          SELECT id, periodo, data FROM reports 
          WHERE young_id = ${young.id} AND report_type = 'TRIMESTRAL'
          ORDER BY id ASC LIMIT 1
        `;
        if (t1Fallback.rows.length > 0) trimestral1 = t1Fallback.rows[0];
      }
    }

    // 3. Obtener Mensuales 1 (Abril, Mayo, Junio)
    let mensuales1: any[] = [];
    if (mensuales1Ids && Array.isArray(mensuales1Ids) && mensuales1Ids.length > 0) {
      for (const mId of mensuales1Ids) {
        const fRes = await sql`SELECT id, periodo, data FROM forms WHERE id = ${parseInt(mId)}`;
        if (fRes.rows.length > 0) mensuales1.push(fRes.rows[0]);
      }
    } else {
      const m1Auto = await sql`
        SELECT id, periodo, data FROM forms
        WHERE young_id = ${young.id}
        AND (periodo ILIKE '%04%' OR periodo ILIKE '%05%' OR periodo ILIKE '%06%' OR periodo ILIKE '%abril%' OR periodo ILIKE '%mayo%' OR periodo ILIKE '%junio%')
        ORDER BY periodo ASC
      `;
      mensuales1 = m1Auto.rows;
    }

    // 4. Obtener Trimestral 2 (Abril, Mayo, Junio)
    let trimestral2: any = null;
    if (trimestral2Id) {
      const t2Res = await sql`SELECT id, periodo, data FROM reports WHERE id = ${parseInt(trimestral2Id)}`;
      if (t2Res.rows.length > 0) trimestral2 = t2Res.rows[0];
    } else {
      const excludeT1Id = trimestral1?.id ? trimestral1.id : 0;
      const t2Auto = await sql`
        SELECT id, periodo, data FROM reports 
        WHERE young_id = ${young.id} AND report_type = 'TRIMESTRAL' AND id != ${excludeT1Id}
        AND (periodo ILIKE '%04%' OR periodo ILIKE '%05%' OR periodo ILIKE '%06%' OR periodo ILIKE '%abril%' OR periodo ILIKE '%2%trimestre%')
        ORDER BY id DESC LIMIT 1
      `;
      if (t2Auto.rows.length > 0) trimestral2 = t2Auto.rows[0];
      else if (excludeT1Id > 0) {
        const t2Fallback = await sql`
          SELECT id, periodo, data FROM reports 
          WHERE young_id = ${young.id} AND report_type = 'TRIMESTRAL' AND id != ${excludeT1Id}
          ORDER BY id DESC LIMIT 1
        `;
        if (t2Fallback.rows.length > 0) trimestral2 = t2Fallback.rows[0];
      }
    }

    // 5. Obtener Mensuales 2 (Agosto, Septiembre)
    let mensuales2: any[] = [];
    if (mensuales2Ids && Array.isArray(mensuales2Ids) && mensuales2Ids.length > 0) {
      for (const mId of mensuales2Ids) {
        const fRes = await sql`SELECT id, periodo, data FROM forms WHERE id = ${parseInt(mId)}`;
        if (fRes.rows.length > 0) mensuales2.push(fRes.rows[0]);
      }
    } else {
      const m2Auto = await sql`
        SELECT id, periodo, data FROM forms
        WHERE young_id = ${young.id}
        AND (periodo ILIKE '%08%' OR periodo ILIKE '%09%' OR periodo ILIKE '%agosto%' OR periodo ILIKE '%septiembre%' OR periodo ILIKE '%setiembre%')
        ORDER BY periodo ASC
      `;
      mensuales2 = m2Auto.rows;
    }

    // 6. Generar narrativa anual con IA
    const pcp = young.pcp || {};
    const secciones = await generateFinalReportNarrative({
      jovenNombre: young.nombre_completo,
      jovenTaller: young.taller,
      pcp,
      facilitadorNombre: young.facilitador_nombre,
      trimestral1,
      mensuales1,
      trimestral2,
      mensuales2
    });

    // 7. Estructurar datos institucionales del informe
    const fechaActual = new Date();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fechaInforme = `${fechaActual.getDate()} de ${meses[fechaActual.getMonth()]} del ${fechaActual.getFullYear()}`;
    const pcpAnio = pcp?.anio || fechaActual.getFullYear().toString();
    const metaSueno = Array.isArray(pcp?.perfil?.suenos) ? pcp.perfil.suenos.filter(Boolean).join('; ') : (pcp?.metaSueño || '');

    const sourceReportIds: number[] = [];
    if (trimestral1?.id) sourceReportIds.push(trimestral1.id);
    if (trimestral2?.id) sourceReportIds.push(trimestral2.id);

    const datosGenerales = {
      nombreCompleto: young.nombre_completo,
      grupo: young.taller || 'Sin grupo',
      taller: young.taller || 'Sin taller',
      facilitador: young.facilitador_nombre || session.user?.name,
      facilitadora: young.facilitador_nombre || session.user?.name,
      facilitadorNombre: young.facilitador_nombre || session.user?.name,
      facilitadores: young.facilitador_nombre || session.user?.name,
      periodo: '2026 (Ciclo Anual Consolidado)',
      fechaInforme,
      pcpAnio,
      metaSueno,
      dni: young.dni || '',
      legajo: young.legajo || '',
      obraSocial: young.obra_social || '',
      fechaNacimiento: young.fecha_nacimiento || '',
      origen: 'FUSION_INFORME_FINAL',
      insumos: {
        trimestral1Id: trimestral1?.id || null,
        trimestral2Id: trimestral2?.id || null,
        mensuales1Count: mensuales1.length,
        mensuales2Count: mensuales2.length
      },
      fechaCreacion: fechaActual.toISOString()
    };

    const reportData = {
      datosGenerales,
      secciones,
      reportType: 'FINAL',
      esInformeFinal: true
    };

    const sourceIdsArrayStr = sourceReportIds.length > 0 ? `{${sourceReportIds.join(',')}}` : '{}';

    // 8. Guardar en Postgres
    const insertResult = await sql`
      INSERT INTO reports (
        young_id,
        periodo,
        report_type,
        status,
        version,
        data,
        original_data,
        source_report_ids,
        generated_by,
        created_at,
        updated_at
      ) VALUES (
        ${young.id},
        '2026 (Ciclo Anual Consolidado)',
        'FINAL',
        'BORRADOR',
        1,
        ${JSON.stringify(reportData)}::jsonb,
        ${JSON.stringify(reportData)}::jsonb,
        ${sourceIdsArrayStr}::int4[],
        ${sessionUserId},
        NOW(),
        NOW()
      )
      RETURNING id, periodo, report_type, status, created_at
    `;

    const newReport = insertResult.rows[0];

    // Auditoría
    try {
      await sql`
        INSERT INTO audit_logs (entity_type, entity_id, action, user_id, meta, created_at)
        VALUES (
          'REPORT',
          ${newReport.id},
          'GENERATE_FINAL_REPORT',
          ${sessionUserId},
          ${JSON.stringify({
            youngId: young.id,
            jovenNombre: young.nombre_completo,
            sourceReportIds,
            mensuales1Count: mensuales1.length,
            mensuales2Count: mensuales2.length
          })}::jsonb,
          NOW()
        )
      `;
    } catch (auditErr) {
      console.error('Error guardando auditoría de informe final:', auditErr);
    }

    return NextResponse.json({
      ok: true,
      reportId: newReport.id,
      message: `Informe Final Anual de ${young.nombre_completo} generado exitosamente con IA`,
      report: {
        id: String(newReport.id),
        youngId: String(young.id),
        jovenNombre: young.nombre_completo,
        grupo: young.taller,
        periodo: '2026 (Ciclo Anual Consolidado)',
        reportType: 'FINAL'
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error generando Informe Final Anual:', error);
    return NextResponse.json({ error: error?.message || 'Error generando informe final' }, { status: 500 });
  }
}
