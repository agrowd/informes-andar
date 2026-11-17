import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateFinalReportNarrative, extractDreamFromReport } from '@/lib/ai/finalReportGenerator';
import { isTrimestral1, isTrimestral2 } from '@/lib/formatters';
import mammoth from 'mammoth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const USE_POSTGRES = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);

/**
 * Helper para extraer el texto íntegro del Word generado o cargado
 * Prioriza el archivo Word binario (.docx) si existe, evitando pérdidas de información por truncamiento.
 */
async function extractFullDocxText(repRow: any): Promise<string> {
  if (!repRow) return '';
  // 1. Si tiene archivo Word físico guardado en base64, extraer texto real completo con Mammoth
  if (repRow.edited_docx_base64) {
    try {
      const buf = Buffer.from(repRow.edited_docx_base64, 'base64');
      const res = await mammoth.extractRawText({ buffer: buf });
      if (res?.value && res.value.trim().length > 100) {
        return res.value.trim();
      }
    } catch (mErr) {
      console.error('Error extrayendo texto de Word en informe final:', mErr);
    }
  }
  // 2. Si tiene textoBrutoOriginal guardado en data
  if (repRow.data?.textoBrutoOriginal && repRow.data.textoBrutoOriginal.trim().length > 100) {
    return repRow.data.textoBrutoOriginal.trim();
  }
  // 3. Reconstruir a partir de secciones y metadatos
  const partes: string[] = [];
  if (repRow.data?.datosGenerales) {
    const dg = repRow.data.datosGenerales;
    if (dg.periodo) partes.push(`Período: ${dg.periodo}`);
    if (dg.facilitadores || dg.facilitadorNombre) partes.push(`Facilitador/a: ${dg.facilitadores || dg.facilitadorNombre}`);
    if (dg.metaSueno) partes.push(`Meta/Sueño: ${dg.metaSueno}`);
  }
  const sec = repRow.data?.secciones || {};
  for (const [k, v] of Object.entries(sec)) {
    if (typeof v === 'string' && v.trim()) {
      partes.push(`- ${k}: ${v.trim()}`);
    } else if (Array.isArray(v)) {
      const txt = (v as any[]).map(f => f.texto).filter(Boolean).join('\n');
      if (txt) partes.push(`- ${k}: ${txt}`);
    }
  }
  return partes.join('\n\n');
}

function deduplicateFormsByMonth(rows: any[]): any[] {
  function getMonthKey(p: string): string {
    if (!p) return '';
    const norm = p.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (norm.includes('04') || norm.includes('abril')) return '04';
    if (norm.includes('05') || norm.includes('mayo')) return '05';
    if (norm.includes('06') || norm.includes('junio')) return '06';
    if (norm.includes('07') || norm.includes('julio')) return '07';
    if (norm.includes('08') || norm.includes('agosto')) return '08';
    if (norm.includes('09') || norm.includes('septiembre') || norm.includes('setiembre')) return '09';
    if (norm.includes('10') || norm.includes('octubre')) return '10';
    if (norm.includes('11') || norm.includes('noviembre')) return '11';
    if (norm.includes('12') || norm.includes('diciembre')) return '12';
    return norm;
  }

  const byMonth = new Map<string, any>();
  for (const row of rows) {
    const key = getMonthKey(row.periodo);
    if (!key) continue;
    if (!byMonth.has(key)) {
      byMonth.set(key, row);
    } else {
      const existing = byMonth.get(key);
      const existingObsLen = (existing.data?.observaciones || '').trim().length;
      const currentObsLen = (row.data?.observaciones || '').trim().length;
      if (currentObsLen > existingObsLen || (currentObsLen === existingObsLen && row.id > existing.id)) {
        byMonth.set(key, row);
      }
    }
  }

  return Array.from(byMonth.entries())
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([, row]) => row);
}

/**
 * Helper para verificar los 4 bloques institucionales de un joven en un ciclo lectivo
 */
function evaluateBlocks(
  reports: any[],
  forms: any[],
  exceptionUnlocked?: boolean,
  exceptionReason?: string,
  targetYear: string = '2026'
): {
  trimestral1: { ok: boolean; id: number | null; periodo: string | null };
  mensuales1: { ok: boolean; has04: boolean; has05: boolean; has06: boolean; has07: boolean; count: number; missing: string[] };
  trimestral2: { ok: boolean; id: number | null; periodo: string | null };
  mensuales2: { ok: boolean; has08: boolean; has09: boolean; has10: boolean; count: number; missing: string[] };
  cierreAnual?: {
    has10: boolean;
    has11: boolean;
    has12: boolean;
    form10Id: number | null;
    form11Id: number | null;
    form12Id: number | null;
    count: number;
    missing: string[];
    trimestralCierre: { id: number; periodo: string; status: string; createdAt: string } | null;
    canGenerate: boolean;
  };
  finalReport: { id: number; periodo: string; status: string; createdAt: string } | null;
  canGenerate: boolean;
  strictCanGenerate: boolean;
  isExceptionUnlocked: boolean;
  exceptionReason: string | null;
  missingItems: string[];
} {
  const yStr = String(targetYear).trim();

  // Filtrar reports y forms por el año del ciclo lectivo activo
  const yearReports = reports.filter(r => {
    const p = r.periodo || '';
    const m = p.match(/\b(20\d{2})\b/);
    return m ? m[1] === yStr : p.includes(yStr);
  });

  const yearForms = forms.filter(f => {
    const p = f.periodo || '';
    const m = p.match(/\b(20\d{2})\b/);
    return m ? m[1] === yStr : p.includes(yStr);
  });

  // 1. Informe Final Anual existente para este año específico
  const finalReportRaw = yearReports.filter(r => r.report_type === 'FINAL').sort((a, b) => (b.id || 0) - (a.id || 0))[0] || null;
  const finalReport = finalReportRaw ? {
    id: finalReportRaw.id,
    periodo: finalReportRaw.periodo,
    status: finalReportRaw.status,
    createdAt: finalReportRaw.created_at
  } : null;

  // 2. Trimestral 1: Ene - Mar (el más reciente del ciclo)
  const t1Candidates = yearReports.filter(r => r.report_type === 'TRIMESTRAL' && isTrimestral1(r.periodo, yStr)).sort((a, b) => (b.id || 0) - (a.id || 0));
  const t1 = t1Candidates[0] || null;

  // 3. Trimestral 2: Abr - Jun (distinto de Trimestral 1, el más reciente del ciclo)
  const t2Candidates = yearReports.filter(r => r.report_type === 'TRIMESTRAL' && (!t1 || r.id !== t1.id)).sort((a, b) => (b.id || 0) - (a.id || 0));
  const t2 = t2Candidates.find(r => isTrimestral2(r.periodo, yStr)) || (t2Candidates.length > 0 ? t2Candidates[0] : null);

  // 4. Mensuales 1: Abril (04), Mayo (05), Junio (06) -> Los 3 son obligatorios; Julio (07) es opcional (se suma si existe)
  const has04 = yearForms.some(f => f.periodo?.includes('04') || f.periodo?.toLowerCase().includes('abril'));
  const has05 = yearForms.some(f => f.periodo?.includes('05') || f.periodo?.toLowerCase().includes('mayo'));
  const has06 = yearForms.some(f => f.periodo?.includes('06') || f.periodo?.toLowerCase().includes('junio'));
  const has07 = yearForms.some(f => f.periodo?.includes('07') || f.periodo?.toLowerCase().includes('julio'));
  const m1Missing: string[] = [];
  if (!has04) m1Missing.push('Abril');
  if (!has05) m1Missing.push('Mayo');
  if (!has06) m1Missing.push('Junio');
  const m1Ok = m1Missing.length === 0;

  // 5. Mensuales 2: Agosto (08), Septiembre (09) -> Los 2 son obligatorios; Octubre (10) se incluye si está presente
  const has08 = yearForms.some(f => f.periodo?.includes('08') || f.periodo?.toLowerCase().includes('agosto'));
  const has09 = yearForms.some(f => f.periodo?.includes('09') || f.periodo?.toLowerCase().includes('septiembre') || f.periodo?.toLowerCase().includes('setiembre'));
  const has10 = yearForms.some(f => f.periodo?.includes('10') || f.periodo?.toLowerCase().includes('octubre'));
  const m2Missing: string[] = [];
  if (!has08) m2Missing.push('Agosto');
  if (!has09) m2Missing.push('Septiembre');
  const m2Ok = m2Missing.length === 0;

  const t1Ok = !!t1;
  const t2Ok = !!t2;
  const strictCanGenerate = t1Ok && m1Ok && t2Ok && m2Ok;
  const isExceptionUnlocked = !!exceptionUnlocked;
  const canGenerate = strictCanGenerate || isExceptionUnlocked;

  const missingItems: string[] = [];
  if (!t1Ok) missingItems.push(`Bloque 1: Trimestral 1 (${yStr} Ene - Mar)`);
  if (!m1Ok) missingItems.push(`Bloque 2: Mensuales 1 (${yStr} Faltan: ${m1Missing.join(', ')})`);
  if (!t2Ok) missingItems.push(`Bloque 3: Trimestral 2 (${yStr} Abr - Jun)`);
  if (!m2Ok) missingItems.push(`Bloque 4: Mensuales 2 (${yStr} Faltan: ${m2Missing.join(', ')})`);

  // 6. Cierre de Año (Trimestral 4: Octubre, Noviembre, Diciembre)
  const form10 = yearForms.find(f => f.periodo?.includes('10') || f.periodo?.toLowerCase().includes('octubre')) || null;
  const form11 = yearForms.find(f => f.periodo?.includes('11') || f.periodo?.toLowerCase().includes('noviembre')) || null;
  const form12 = yearForms.find(f => f.periodo?.includes('12') || f.periodo?.toLowerCase().includes('diciembre')) || null;
  const has11 = !!form11;
  const has12 = !!form12;

  // Trimestral de cierre (Q4: Oct-Dic)
  const tCierre = yearReports.find(r => r.report_type === 'TRIMESTRAL' && (
    (r.periodo?.includes('10') && r.periodo?.includes('12')) ||
    (r.periodo?.toLowerCase().includes('octubre') && r.periodo?.toLowerCase().includes('diciembre')) ||
    (r.periodo?.includes(`${yStr}-10`) && r.periodo?.includes(`${yStr}-12`)) ||
    (r.periodo?.includes(`${yStr}-10 – ${yStr}-12`)) ||
    (r.periodo?.includes(`${yStr}-12 – ${yStr}-10`))
  )) || null;

  const cierreMissing: string[] = [];
  if (!form10) cierreMissing.push('Octubre');
  if (!form11) cierreMissing.push('Noviembre');
  if (!form12) cierreMissing.push('Diciembre');

  const cierreAnual = {
    has10: !!form10,
    has11: !!form11,
    has12: !!form12,
    form10Id: form10?.id || null,
    form11Id: form11?.id || null,
    form12Id: form12?.id || null,
    count: (form10?1:0) + (form11?1:0) + (form12?1:0),
    missing: cierreMissing,
    trimestralCierre: tCierre ? {
      id: tCierre.id,
      periodo: tCierre.periodo,
      status: tCierre.status,
      createdAt: tCierre.created_at
    } : null,
    canGenerate: !!(form10 || form11 || form12)
  };

  return {
    trimestral1: { ok: t1Ok, id: t1 ? t1.id : null, periodo: t1 ? t1.periodo : null },
    mensuales1: { ok: m1Ok, has04, has05, has06, has07, count: (has04?1:0)+(has05?1:0)+(has06?1:0)+(has07?1:0), missing: m1Missing },
    trimestral2: { ok: t2Ok, id: t2 ? t2.id : null, periodo: t2 ? t2.periodo : null },
    mensuales2: { ok: m2Ok, has08, has09, has10, count: (has08?1:0)+(has09?1:0)+(has10?1:0), missing: m2Missing },
    cierreAnual,
    finalReport,
    canGenerate,
    strictCanGenerate,
    isExceptionUnlocked,
    exceptionReason: exceptionReason || null,
    missingItems
  };
}

/**
 * GET /api/reports/final
 * Modos:
 * 1) ?overview=true: Devuelve el diagnóstico institucional de los 75 concurrentes
 * 2) ?youngId=XX: Devuelve el diagnóstico granular para un concurrente
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!sql) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const isOverview = searchParams.get('overview') === 'true';
    const youngIdStr = searchParams.get('youngId');
    const targetYear = searchParams.get('year') || searchParams.get('cycle') || '2026';

    // ==========================================
    // MODO 1: RESUMEN INSTITUCIONAL COMPLETO
    // ==========================================
    if (isOverview) {
      const [youngsRes, reportsRes, formsRes] = await Promise.all([
        sql`
          SELECT y.id, y.nombre_completo, y.taller, y.dni, y.legajo, y.exception_unlocked, y.exception_reason,
                 COALESCE(u.name, 'Sin facilitador') as facilitador_nombre
          FROM youngs y
          LEFT JOIN users u ON (y.assigned_facilitators IS NOT NULL AND array_length(y.assigned_facilitators, 1) > 0 AND u.id = y.assigned_facilitators[1])
          ORDER BY y.taller ASC, y.nombre_completo ASC
        `,
        sql`
          SELECT id, young_id, periodo, report_type, status, created_at, edited_docx_filename
          FROM reports
          ORDER BY id DESC
        `,
        sql`
          SELECT id, young_id, periodo, status
          FROM forms
          ORDER BY id ASC
        `
      ]);

      const reportsByYoung = new Map<number, any[]>();
      for (const r of reportsRes.rows) {
        if (!reportsByYoung.has(r.young_id)) reportsByYoung.set(r.young_id, []);
        reportsByYoung.get(r.young_id)!.push(r);
      }

      const formsByYoung = new Map<number, any[]>();
      for (const f of formsRes.rows) {
        if (!formsByYoung.has(f.young_id)) formsByYoung.set(f.young_id, []);
        formsByYoung.get(f.young_id)!.push(f);
      }

      const list = youngsRes.rows.map(y => {
        const yReports = reportsByYoung.get(y.id) || [];
        const yForms = formsByYoung.get(y.id) || [];
        const evalRes = evaluateBlocks(yReports, yForms, y.exception_unlocked, y.exception_reason, targetYear);

        return {
          id: y.id,
          nombre: y.nombre_completo,
          taller: y.taller || 'Sin taller',
          facilitador: y.facilitador_nombre,
          dni: y.dni,
          legajo: y.legajo,
          ...evalRes
        };
      });

      const totalYoungs = list.length;
      const finalGeneratedCount = list.filter(item => !!item.finalReport).length;
      const readyCount = list.filter(item => item.canGenerate && !item.finalReport).length;
      const incompleteCount = list.filter(item => !item.canGenerate && !item.finalReport).length;

      return NextResponse.json({
        success: true,
        stats: {
          totalYoungs,
          finalGeneratedCount,
          readyCount,
          incompleteCount
        },
        youngs: list
      });
    }

    // ==========================================
    // MODO 2: DIAGNÓSTICO DE UN CONCURRENTE ESPECÍFICO
    // ==========================================
    if (!youngIdStr) {
      return NextResponse.json({ error: 'youngId o overview=true es requerido' }, { status: 400 });
    }

    const youngId = parseInt(youngIdStr);
    const youngRes = await sql`
      SELECT y.*, COALESCE(u.name, 'Facilitador no asignado') as facilitador_nombre
      FROM youngs y
      LEFT JOIN users u ON (y.assigned_facilitators IS NOT NULL AND array_length(y.assigned_facilitators, 1) > 0 AND u.id = y.assigned_facilitators[1])
      WHERE y.id = ${youngId}
    `;

    if (youngRes.rows.length === 0) {
      return NextResponse.json({ error: 'Concurrente no encontrado' }, { status: 404 });
    }
    const young = youngRes.rows[0];

    const [reportsRes, formsRes] = await Promise.all([
      sql`
        SELECT id, young_id, periodo, report_type, status, created_at, data, edited_docx_filename
        FROM reports 
        WHERE young_id = ${youngId}
        ORDER BY id DESC
      `,
      sql`
        SELECT id, young_id, periodo, status, created_at, data
        FROM forms
        WHERE young_id = ${youngId}
        ORDER BY periodo ASC
      `
    ]);

    const evalRes = evaluateBlocks(reportsRes.rows, formsRes.rows, young.exception_unlocked, young.exception_reason, targetYear);

    return NextResponse.json({
      young: {
        id: young.id,
        nombre: young.nombre_completo,
        grupo: young.taller,
        taller: young.taller,
        facilitador: young.facilitador_nombre
      },
      blocks: {
        trimestral1: { available: evalRes.trimestral1.ok, id: evalRes.trimestral1.id },
        mensuales1: { available: evalRes.mensuales1.ok, count: evalRes.mensuales1.count, has07: evalRes.mensuales1.has07 },
        trimestral2: { available: evalRes.trimestral2.ok, id: evalRes.trimestral2.id },
        mensuales2: { available: evalRes.mensuales2.ok, count: evalRes.mensuales2.count }
      },
      ...evalRes
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
    const targetYear = String(body.year || body.cycle || '2026').trim();
    const consolidatedPeriod = `${targetYear} (Ciclo Anual Consolidado)`;

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

    // 2. Obtener informes trimestrales del concurrente ordenados por id DESC
    const allTrimestralesRes = await sql`
      SELECT id, periodo, report_type, data, edited_docx_base64, edited_docx_filename 
      FROM reports 
      WHERE young_id = ${young.id} AND report_type = 'TRIMESTRAL'
      ORDER BY id DESC
    `;
    const allTrimestrales = allTrimestralesRes.rows;

    // Obtener Trimestral 1 (Verano: Ene - Mar)
    let trimestral1: any = null;
    if (trimestral1Id) {
      trimestral1 = allTrimestrales.find(r => r.id === parseInt(trimestral1Id)) || null;
      if (!trimestral1) {
        const t1Res = await sql`SELECT id, periodo, data, edited_docx_base64, edited_docx_filename FROM reports WHERE id = ${parseInt(trimestral1Id)}`;
        if (t1Res.rows.length > 0) trimestral1 = t1Res.rows[0];
      }
    } else {
      const t1Candidates = allTrimestrales.filter(r => isTrimestral1(r.periodo, targetYear));
      trimestral1 = t1Candidates[0] || null;
    }

    // 3. Obtener Mensuales 1 (Abril, Mayo, Junio)
    let mensuales1: any[] = [];
    if (mensuales1Ids && Array.isArray(mensuales1Ids) && mensuales1Ids.length > 0) {
      for (const mId of mensuales1Ids) {
        const fRes = await sql`SELECT id, periodo, data FROM forms WHERE id = ${parseInt(mId)}`;
        if (fRes.rows.length > 0) mensuales1.push(fRes.rows[0]);
      }
      mensuales1 = deduplicateFormsByMonth(mensuales1);
    } else {
      const m1Auto = await sql`
        SELECT id, periodo, data FROM forms
        WHERE young_id = ${young.id}
        AND periodo ILIKE ${'%' + targetYear + '%'}
        AND (
          periodo ILIKE '%04%' OR periodo ILIKE '%05%' OR periodo ILIKE '%06%' OR periodo ILIKE '%07%'
          OR periodo ILIKE '%abril%' OR periodo ILIKE '%mayo%' OR periodo ILIKE '%junio%' OR periodo ILIKE '%julio%'
        )
        ORDER BY periodo ASC
      `;
      mensuales1 = deduplicateFormsByMonth(m1Auto.rows);
    }

    // 4. Obtener Trimestral 2 (Primer Semestre: Abr - Jun)
    let trimestral2: any = null;
    if (trimestral2Id) {
      trimestral2 = allTrimestrales.find(r => r.id === parseInt(trimestral2Id)) || null;
      if (!trimestral2) {
        const t2Res = await sql`SELECT id, periodo, data, edited_docx_base64, edited_docx_filename FROM reports WHERE id = ${parseInt(trimestral2Id)}`;
        if (t2Res.rows.length > 0) trimestral2 = t2Res.rows[0];
      }
    } else {
      const excludeT1Id = trimestral1?.id ? trimestral1.id : 0;
      const t2Candidates = allTrimestrales.filter(r => r.id !== excludeT1Id && isTrimestral2(r.periodo, targetYear));
      trimestral2 = t2Candidates[0] || null;
    }

    // 5. Obtener Mensuales 2 (Agosto, Septiembre)
    let mensuales2: any[] = [];
    if (mensuales2Ids && Array.isArray(mensuales2Ids) && mensuales2Ids.length > 0) {
      for (const mId of mensuales2Ids) {
        const fRes = await sql`SELECT id, periodo, data FROM forms WHERE id = ${parseInt(mId)}`;
        if (fRes.rows.length > 0) mensuales2.push(fRes.rows[0]);
      }
      mensuales2 = deduplicateFormsByMonth(mensuales2);
    } else {
      const m2Auto = await sql`
        SELECT id, periodo, data FROM forms
        WHERE young_id = ${young.id}
        AND periodo ILIKE ${'%' + targetYear + '%'}
        AND (
          periodo ILIKE '%08%' OR periodo ILIKE '%09%' OR periodo ILIKE '%10%' OR periodo ILIKE '%11%' OR periodo ILIKE '%12%'
          OR periodo ILIKE '%agosto%' OR periodo ILIKE '%septiembre%' OR periodo ILIKE '%setiembre%'
          OR periodo ILIKE '%octubre%' OR periodo ILIKE '%noviembre%' OR periodo ILIKE '%diciembre%'
        )
        ORDER BY periodo ASC
      `;
      mensuales2 = deduplicateFormsByMonth(m2Auto.rows);
    }

    // =========================================================================
    // VALIDACIÓN ESTRICTA: SI FALTA CUALQUIER INSUMO OBLIGATORIO, NO SE HACE (salvo excepción desbloqueada)
    // =========================================================================
    const missingErrors: string[] = [];

    // Bloque 1: Trimestral 1 (Ene-Mar)
    if (!trimestral1) {
      missingErrors.push('Bloque 1: Falta el Informe Trimestral 1 (Enero, Febrero, Marzo)');
    }

    // Bloque 2: Mensuales 1 (Abril, Mayo y Junio obligatorios)
    const has04 = mensuales1.some(f => f.periodo?.includes('04') || f.periodo?.toLowerCase().includes('abril'));
    const has05 = mensuales1.some(f => f.periodo?.includes('05') || f.periodo?.toLowerCase().includes('mayo'));
    const has06 = mensuales1.some(f => f.periodo?.includes('06') || f.periodo?.toLowerCase().includes('junio'));
    const m1Missing: string[] = [];
    if (!has04) m1Missing.push('Abril');
    if (!has05) m1Missing.push('Mayo');
    if (!has06) m1Missing.push('Junio');
    if (m1Missing.length > 0) {
      missingErrors.push(`Bloque 2: Faltan cuadrículas mensuales de ${m1Missing.join(', ')}`);
    }

    // Bloque 3: Trimestral 2 (Abr-Jun)
    if (!trimestral2) {
      missingErrors.push('Bloque 3: Falta el Informe Trimestral 2 (Abril, Mayo, Junio)');
    }

    // Bloque 4: Mensuales 2 (Agosto y Septiembre obligatorios)
    const has08 = mensuales2.some(f => f.periodo?.includes('08') || f.periodo?.toLowerCase().includes('agosto'));
    const has09 = mensuales2.some(f => f.periodo?.includes('09') || f.periodo?.toLowerCase().includes('septiembre') || f.periodo?.toLowerCase().includes('setiembre'));
    const m2Missing: string[] = [];
    if (!has08) m2Missing.push('Agosto');
    if (!has09) m2Missing.push('Septiembre');
    if (m2Missing.length > 0) {
      missingErrors.push(`Bloque 4: Faltan cuadrículas mensuales de ${m2Missing.join(', ')}`);
    }

    const isUnlockedException = !!(young.exception_unlocked || body.allowPartial || body.ignoreMissing);
    const missingBlocksNotice = missingErrors.length > 0 ? missingErrors.join('; ') : undefined;

    if (missingErrors.length > 0 && !isUnlockedException) {
      return NextResponse.json({
        error: 'No se puede generar el Informe Final Anual: Se requiere el 100% de los 4 insumos obligatorios completos (o activar la Excepción de Insumos).',
        canGenerate: false,
        missingErrors,
        details: {
          bloque1Trimestral1: { ok: !!trimestral1, id: trimestral1?.id || null },
          bloque2Mensuales1: { ok: m1Missing.length === 0, missing: m1Missing },
          bloque3Trimestral2: { ok: !!trimestral2, id: trimestral2?.id || null },
          bloque4Mensuales2: { ok: m2Missing.length === 0, missing: m2Missing }
        }
      }, { status: 400 });
    }

    // 6. Extraer textos íntegros del Word para evitar pérdida de información
    if (trimestral1) {
      trimestral1.docxText = await extractFullDocxText(trimestral1);
    }
    if (trimestral2) {
      trimestral2.docxText = await extractFullDocxText(trimestral2);
    }

    // 7. Extraer círculo de apoyo e información institucional
    let circuloApoyoParticipacion = 'Sí';
    let circuloApoyoPersonas = '';
    const circuloArray = Array.isArray(young.circulo_apoyo) && young.circulo_apoyo.length > 0
      ? young.circulo_apoyo
      : (Array.isArray(young.pcp?.circuloApoyo) ? young.pcp.circuloApoyo : []);

    if (circuloArray.length > 0) {
      circuloApoyoPersonas = circuloArray.map((m: any) => {
        if (typeof m === 'string') return m;
        return m.nombre + (m.vinculo ? ` (${m.vinculo})` : '');
      }).join(', ');
    } else {
      circuloApoyoPersonas = `${young.facilitador_nombre || 'Facilitador/a de referencia'}, equipo institucional y compañeras de taller.`;
    }

    // 8. Generar narrativa anual con IA (Estructura en dos partes: Informe Final + Plan de Abordaje)
    const pcp = young.pcp || {};
    let currentSuenos = Array.isArray(pcp?.perfil?.suenos) ? pcp.perfil.suenos.filter(Boolean) : [];
    let currentMeta = pcp?.metaSueño || pcp?.metaSueno || '';
    const hasValidPcpDream = (currentSuenos.length > 0 && currentSuenos[0].trim().length > 3 && !currentSuenos[0].toLowerCase().includes('no informado')) || 
                             (typeof currentMeta === 'string' && currentMeta.trim().length > 3 && !currentMeta.toLowerCase().includes('no informado'));

    if (!hasValidPcpDream) {
      const detectedDream = extractDreamFromReport(trimestral2) || extractDreamFromReport(trimestral1);
      if (detectedDream) {
        console.log(`[REPORTE FINAL] Reconocido sueño faltante desde Bloque 3 para ${young.nombre_completo}: "${detectedDream}"`);
        if (!pcp.perfil) pcp.perfil = {};
        pcp.perfil.suenos = [detectedDream];
        pcp.metaSueño = detectedDream;
        pcp.metaSueno = detectedDream;

        // Persistir en PostgreSQL en youngs.pcp para que quede guardado permanentemente
        if (USE_POSTGRES && sql && young.id) {
          try {
            const updatedPcp = { ...(young.pcp || {}), ...pcp };
            await sql`
              UPDATE youngs 
              SET pcp = ${JSON.stringify(updatedPcp)}::jsonb, updated_at = NOW() 
              WHERE id = ${young.id}
            `;
          } catch (updateErr) {
            console.error('Error persistiendo sueño detectado en youngs.pcp:', updateErr);
          }
        }
      }
    }

    const finalReportNarrative = await generateFinalReportNarrative({
      jovenNombre: young.nombre_completo,
      jovenTaller: young.taller,
      pcp,
      facilitadorNombre: young.facilitador_nombre,
      trimestral1,
      mensuales1,
      trimestral2,
      mensuales2,
      circuloApoyoParticipacion,
      circuloApoyoPersonas,
      dni: young.dni || '',
      obraSocial: young.obra_social || '',
      isUnlockedException,
      missingBlocksNotice
    });

    // 9. Estructurar datos institucionales del informe
    const fechaActual = new Date();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fechaInforme = `${fechaActual.getDate()} de ${meses[fechaActual.getMonth()]} del ${fechaActual.getFullYear()}`;
    const pcpAnio = pcp?.anio || fechaActual.getFullYear().toString();
    const metaSueno = Array.isArray(pcp?.perfil?.suenos) && pcp.perfil.suenos.filter(Boolean).length > 0 
      ? pcp.perfil.suenos.filter(Boolean).join('; ') 
      : (pcp?.metaSueño || pcp?.metaSueno || '');

    const sourceReportIds: number[] = [];
    if (trimestral1?.id) sourceReportIds.push(trimestral1.id);
    if (trimestral2?.id) sourceReportIds.push(trimestral2.id);

    const GROUP_FACILITATORS: Record<string, { id: number; name: string }> = {
      'Artesanos': { id: 9, name: 'Leonardo Villamayor' },
      'Atrapasueños': { id: 12, name: 'Matias Maciel' },
      'Buenos Mozos': { id: 10, name: 'Marina Trejo' },
      'Clave de Sol': { id: 7, name: 'Juliana Arias' },
      'Empoderadas': { id: 8, name: 'Ana Reartes' },
      'Emprendedores': { id: 11, name: 'Analia Almada' },
      'Promotores': { id: 14, name: 'Lemuel Sola' }
    };

    const sessionRole = (session?.user as any)?.role || 'FACILITADOR';
    const isUploaderAdmin = sessionRole === 'ADMIN' || sessionRole === 'COORDINACION' || sessionUserId === 1;
    const groupFacil = young.taller ? GROUP_FACILITATORS[young.taller] : null;
    const effectiveGeneratedBy = isUploaderAdmin && groupFacil ? groupFacil.id : (sessionUserId || groupFacil?.id || 1);
    const facilitadorReal = groupFacil?.name || young.facilitador_nombre || session.user?.name || 'Sin facilitador';
    const uploadedBy = isUploaderAdmin ? (session.user?.name || 'Natoh') : null;

    const datosGenerales = {
      nombreCompleto: young.nombre_completo,
      grupo: young.taller || 'Sin grupo',
      taller: young.taller || 'Sin taller',
      facilitador: facilitadorReal,
      facilitadora: facilitadorReal,
      facilitadorNombre: facilitadorReal,
      facilitadores: facilitadorReal,
      uploadedBy,
      periodo: consolidatedPeriod,
      fechaInforme,
      pcpAnio: pcpAnio || targetYear,
      metaSueno,
      dni: young.dni || '',
      legajo: young.legajo || '',
      obraSocial: young.obra_social || '',
      fechaNacimiento: young.fecha_nacimiento || '',
      circuloApoyoParticipacion,
      circuloApoyoPersonas,
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
      parte1_informeFinal: finalReportNarrative.parte1_informeFinal,
      parte2_planAbordaje: finalReportNarrative.parte2_planAbordaje,
      secciones: finalReportNarrative.secciones,
      reportType: 'FINAL',
      esInformeFinal: true
    };

    const sourceIdsArrayStr = sourceReportIds.length > 0 ? `{${sourceReportIds.join(',')}}` : '{}';

    // 8. Guardar o Actualizar en Postgres (UPSERT para evitar duplicados y actualizar en el mismo registro)
    const existingFinal = await sql`
      SELECT id FROM reports 
      WHERE young_id = ${young.id} AND report_type = 'FINAL' 
        AND (periodo = ${consolidatedPeriod} OR periodo ILIKE ${'%' + targetYear + '%'})
      ORDER BY id DESC LIMIT 1
    `;

    let targetReportId: number;
    if (existingFinal.rows.length > 0) {
      targetReportId = existingFinal.rows[0].id;
      await sql`
        UPDATE reports SET
          periodo = ${consolidatedPeriod},
          status = 'BORRADOR',
          version = COALESCE(version, 1) + 1,
          data = ${JSON.stringify(reportData)}::jsonb,
          original_data = ${JSON.stringify(reportData)}::jsonb,
          source_report_ids = ${sourceIdsArrayStr}::int4[],
          edited_docx_base64 = NULL,
          edited_docx_filename = NULL,
          generated_by = ${effectiveGeneratedBy},
          updated_at = NOW()
        WHERE id = ${targetReportId}
      `;
      // Limpiar duplicados obsoletos si existieran para este ciclo
      await sql`
        DELETE FROM reports WHERE young_id = ${young.id} AND report_type = 'FINAL' AND (periodo = ${consolidatedPeriod} OR periodo ILIKE ${'%' + targetYear + '%'}) AND id != ${targetReportId}
      `;
    } else {
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
          ${consolidatedPeriod},
          'FINAL',
          'BORRADOR',
          1,
          ${JSON.stringify(reportData)}::jsonb,
          ${JSON.stringify(reportData)}::jsonb,
          ${sourceIdsArrayStr}::int4[],
          ${effectiveGeneratedBy},
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      targetReportId = insertResult.rows[0].id;
    }

    // Auditoría
    try {
      await sql`
        INSERT INTO audit_logs (entity_type, entity_id, action, user_id, meta, created_at)
        VALUES (
          'REPORT',
          ${targetReportId},
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
      reportId: targetReportId,
      message: `Informe Final Anual de ${young.nombre_completo} generado exitosamente con IA`,
      report: {
        id: String(targetReportId),
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
