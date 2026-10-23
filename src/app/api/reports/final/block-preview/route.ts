import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isTrimestral1, isTrimestral2 } from '@/lib/formatters';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
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
      // Priorizar el que tenga observaciones más completas o el ID más reciente
      if (currentObsLen > existingObsLen || (currentObsLen === existingObsLen && row.id > existing.id)) {
        byMonth.set(key, row);
      }
    }
  }

  return Array.from(byMonth.entries())
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([, row]) => row);
}

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
    const youngIdStr = searchParams.get('youngId');
    const blockStr = searchParams.get('block');

    if (!youngIdStr || !blockStr) {
      return NextResponse.json({ error: 'youngId y block (1, 2, 3 o 4) son requeridos' }, { status: 400 });
    }

    const youngId = parseInt(youngIdStr);
    const block = parseInt(blockStr);

    // Obtener concurrente actual
    const youngRes = await sql`
      SELECT y.id, y.nombre_completo, y.taller, y.dni, y.legajo
      FROM youngs y
      WHERE y.id = ${youngId}
    `;

    if (youngRes.rows.length === 0) {
      return NextResponse.json({ error: 'Concurrente no encontrado' }, { status: 404 });
    }
    const currentYoung = youngRes.rows[0];

    // Catálogo de todos los concurrentes para chequeo de discrepancia de nombre
    const allYoungsRes = await sql`SELECT id, nombre_completo, taller FROM youngs ORDER BY id ASC`;
    const allYoungs = allYoungsRes.rows;

    function detectNameMismatch(rawText: string, currentYoungName: string) {
      if (!rawText || rawText.trim().length < 5) return null;
      const normText = normalize(rawText);
      const currentNorm = normalize(currentYoungName);

      // Si el texto contiene el nombre actual, no hay mismatch
      const currentParts = currentNorm.split(/\s+/).filter(p => p.length > 2);
      const currentLastName = currentParts[currentParts.length - 1];
      const currentFirstName = currentParts[0];

      const matchesCurrent = normText.includes(currentNorm) || 
        (currentLastName && currentFirstName && normText.includes(currentLastName) && normText.includes(currentFirstName));

      if (matchesCurrent) return null;

      // Buscar si menciona a otro concurrente
      for (const other of allYoungs) {
        if (other.id === currentYoung.id) continue;
        const oNorm = normalize(other.nombre_completo);
        const oParts = oNorm.split(/\s+/).filter(p => p.length > 2);
        const oLast = oParts[oParts.length - 1];
        const oFirst = oParts[0];

        if (normText.includes(oNorm) || (oLast && oFirst && normText.includes(oLast) && normText.includes(oFirst))) {
          return {
            detectedYoungId: other.id,
            detectedYoungName: other.nombre_completo,
            detectedYoungTaller: other.taller
          };
        }
      }
      return null;
    }

    function calculateBlockProgression(forms: any[]) {
      const periods: string[] = forms.map(f => f.periodo);

      function normSkill(s: string): string {
        return (s || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      const talleresMap = new Map<string, Map<string, { originalName: string; evals: Record<string, number> }>>();

      for (const f of forms) {
        const p = f.periodo;
        const talleres = Array.isArray(f.data?.talleres) ? f.data.talleres : [];
        for (const t of talleres) {
          const tName = (t.nombre || 'GENERAL').trim().toUpperCase();
          if (!talleresMap.has(tName)) {
            talleresMap.set(tName, new Map());
          }
          const sMap = talleresMap.get(tName)!;
          for (const it of (t.items || [])) {
            const normKey = normSkill(it.nombre);
            if (!normKey) continue;
            if (!sMap.has(normKey)) {
              sMap.set(normKey, {
                originalName: (it.nombre || '').trim(),
                evals: {}
              });
            }
            const rec = sMap.get(normKey)!;
            const levelNum = typeof it.nivel === 'number' ? it.nivel : (parseInt(it.nivel) || 0);
            rec.evals[p] = levelNum;
          }
        }
      }

      let totalSkills = 0;
      let advancedCount = 0;
      let maintainedCount = 0;
      let regressedCount = 0;
      let highAutonomyCount = 0;
      let supportNeededCount = 0;

      const talleresList: any[] = [];

      for (const [tallerNombre, sMap] of talleresMap.entries()) {
        const skillsList: any[] = [];

        for (const [, rec] of sMap.entries()) {
          totalSkills++;
          const allLevels = periods.map(p => rec.evals[p] ?? 0);
          const validLevels = allLevels.filter(v => v > 0);
          const firstLevel = validLevels.length > 0 ? validLevels[0] : 0;
          const lastLevel = validLevels.length > 0 ? validLevels[validLevels.length - 1] : 0;
          const delta = validLevels.length >= 2 ? (lastLevel - firstLevel) : 0;

          let status: 'avanzó' | 'estable' | 'retroceso' | 'sin_evaluar';
          if (delta > 0) {
            status = 'avanzó';
            advancedCount++;
          } else if (delta < 0) {
            status = 'retroceso';
            regressedCount++;
          } else if (lastLevel > 0) {
            status = 'estable';
            maintainedCount++;
          } else {
            status = 'sin_evaluar';
          }

          if (lastLevel >= 3) {
            highAutonomyCount++;
          } else if (lastLevel > 0) {
            supportNeededCount++;
          }

          skillsList.push({
            nombre: rec.originalName,
            nivelesPorPeriodo: rec.evals,
            primerNivel: firstLevel,
            ultimoNivel: lastLevel,
            delta,
            status,
            autonomo: lastLevel >= 3
          });
        }

        // Ordenar habilidades: primero las que avanzaron, luego alfabéticamente
        skillsList.sort((a, b) => {
          if (b.delta !== a.delta) return b.delta - a.delta;
          return a.nombre.localeCompare(b.nombre);
        });

        talleresList.push({
          nombre: tallerNombre,
          skillsCount: skillsList.length,
          advancedCount: skillsList.filter(s => s.status === 'avanzó').length,
          skills: skillsList
        });
      }

      // Ordenar talleres: primero los que tienen avances
      talleresList.sort((a, b) => {
        if (b.advancedCount !== a.advancedCount) return b.advancedCount - a.advancedCount;
        return a.nombre.localeCompare(b.nombre);
      });

      return {
        periods,
        totalSkills,
        advancedCount,
        maintainedCount,
        regressedCount,
        highAutonomyCount,
        supportNeededCount,
        talleres: talleresList
      };
    }

    // ==========================================
    // BLOQUE 1: Trimestral 1 (Verano Ene - Mar)
    // ==========================================
    if (block === 1) {
      const repRes = await sql`
        SELECT id, periodo, report_type, status, created_at, edited_docx_filename, data
        FROM reports
        WHERE young_id = ${youngId} AND report_type = 'TRIMESTRAL'
        ORDER BY id DESC
      `;

      const rep = repRes.rows.find(r => isTrimestral1(r.periodo)) || null;

      if (!rep) {
        return NextResponse.json({
          hasData: false,
          block: 1,
          blockTitle: '1. Trimestral 1 (Ene - Mar - Verano)',
          young: currentYoung,
          message: 'No hay informe trimestral cargado para el Bloque 1.'
        });
      }

      const dg = rep.data?.datosGenerales || {};
      const sec = rep.data?.secciones || {};
      const rawText = (rep.data?.textoBrutoOriginal || '') + ' ' + (rep.edited_docx_filename || '') + ' ' + (dg.nombreCompleto || '');
      const mismatch = detectNameMismatch(rawText, currentYoung.nombre_completo);

      return NextResponse.json({
        hasData: true,
        block: 1,
        blockTitle: '1. Trimestral 1 (Ene - Mar - Verano)',
        young: currentYoung,
        reportId: rep.id,
        periodo: rep.periodo,
        filename: rep.edited_docx_filename,
        createdAt: rep.created_at,
        facilitador: dg.facilitador || dg.facilitadorNombre || 'No especificado',
        grupo: dg.grupo || currentYoung.taller,
        mismatch: mismatch ? {
          isMismatch: true,
          detectedYoungId: mismatch.detectedYoungId,
          detectedYoungName: mismatch.detectedYoungName,
          detectedYoungTaller: mismatch.detectedYoungTaller,
          warning: `¡Atención! Este documento menciona a "${mismatch.detectedYoungName}". Parece pertenecer a otro concurrente.`
        } : null,
        secciones: sec,
        rawPreview: rep.data?.textoBrutoOriginal ? rep.data.textoBrutoOriginal.substring(0, 1200) : null
      });
    }

    // ==========================================
    // BLOQUE 2: Mensuales 1 (Abril, Mayo, Junio, Julio)
    // ==========================================
    if (block === 2) {
      const formsRes = await sql`
        SELECT id, periodo, status, created_at, data
        FROM forms
        WHERE young_id = ${youngId}
        AND (
          periodo ILIKE '%04%' OR periodo ILIKE '%05%' OR periodo ILIKE '%06%' OR periodo ILIKE '%07%'
          OR periodo ILIKE '%abril%' OR periodo ILIKE '%mayo%' OR periodo ILIKE '%junio%' OR periodo ILIKE '%julio%'
        )
        ORDER BY periodo ASC, id ASC
      `;

      const dedupedRows = deduplicateFormsByMonth(formsRes.rows);

      if (dedupedRows.length === 0) {
        return NextResponse.json({
          hasData: false,
          block: 2,
          blockTitle: '2. Evaluaciones Mensuales 1 (Abr - Jun)',
          young: currentYoung,
          message: 'No hay evaluaciones mensuales registradas para el Bloque 2.'
        });
      }

      const months = dedupedRows.map(f => {
        const d = f.data || {};
        const talleres = Array.isArray(d.talleres) ? d.talleres.map((t: any) => {
          const rawItems = Array.isArray(t.items) ? t.items : (Array.isArray(t.habilidades) ? t.habilidades : []);
          return {
            nombre: (t.nombre || 'GENERAL').trim(),
            itemsCount: rawItems.length,
            itemsEvaluadosCount: rawItems.filter((it: any) => (it.nivel || 0) > 0).length,
            items: rawItems.map((it: any) => ({
              nombre: (it.nombre || '').trim(),
              nivel: typeof it.nivel === 'number' ? it.nivel : (parseInt(it.nivel) || 0)
            }))
          };
        }) : [];

        return {
          id: f.id,
          periodo: f.periodo,
          status: f.status,
          taller: d.taller || currentYoung.taller,
          facilitador: d.facilitadorNombre || 'No especificado',
          observaciones: d.observaciones || '',
          talleres
        };
      });

      const progression = calculateBlockProgression(dedupedRows);

      // Mismatch check across all observations/data
      const combinedText = dedupedRows.map(f => JSON.stringify(f.data)).join(' ');
      const mismatch = detectNameMismatch(combinedText, currentYoung.nombre_completo);

      return NextResponse.json({
        hasData: true,
        block: 2,
        blockTitle: '2. Evaluaciones Mensuales 1 (Abr - Jun)',
        young: currentYoung,
        count: dedupedRows.length,
        months,
        progression,
        mismatch: mismatch ? {
          isMismatch: true,
          detectedYoungId: mismatch.detectedYoungId,
          detectedYoungName: mismatch.detectedYoungName,
          detectedYoungTaller: mismatch.detectedYoungTaller,
          warning: `¡Atención! Las planillas mensuales contienen observaciones sobre "${mismatch.detectedYoungName}".`
        } : null
      });
    }

    // ==========================================
    // BLOQUE 3: Trimestral 2 (Abril - Junio)
    // ==========================================
    if (block === 3) {
      // Buscar trimestral 2 (que no sea el de verano, el más reciente)
      const repRes = await sql`
        SELECT id, periodo, report_type, status, created_at, edited_docx_filename, data
        FROM reports
        WHERE young_id = ${youngId} AND report_type = 'TRIMESTRAL'
        ORDER BY id DESC
      `;

      const rep = repRes.rows.find(r => isTrimestral2(r.periodo) && !isTrimestral1(r.periodo)) || repRes.rows.find(r => isTrimestral2(r.periodo)) || null;

      if (!rep) {
        return NextResponse.json({
          hasData: false,
          block: 3,
          blockTitle: '3. Trimestral 2 (Abril - Junio)',
          young: currentYoung,
          message: 'No hay informe trimestral cargado para el Bloque 3.'
        });
      }

      const dg = rep.data?.datosGenerales || {};
      const sec = rep.data?.secciones || {};
      const rawText = (rep.data?.textoBrutoOriginal || '') + ' ' + (rep.edited_docx_filename || '') + ' ' + (dg.nombreCompleto || '');
      const mismatch = detectNameMismatch(rawText, currentYoung.nombre_completo);

      return NextResponse.json({
        hasData: true,
        block: 3,
        blockTitle: '3. Trimestral 2 (Abril - Junio)',
        young: currentYoung,
        reportId: rep.id,
        periodo: rep.periodo,
        filename: rep.edited_docx_filename,
        createdAt: rep.created_at,
        facilitador: dg.facilitador || dg.facilitadorNombre || 'No especificado',
        grupo: dg.grupo || currentYoung.taller,
        mismatch: mismatch ? {
          isMismatch: true,
          detectedYoungId: mismatch.detectedYoungId,
          detectedYoungName: mismatch.detectedYoungName,
          detectedYoungTaller: mismatch.detectedYoungTaller,
          warning: `¡Atención! Este documento menciona a "${mismatch.detectedYoungName}". Parece pertenecer a otro concurrente.`
        } : null,
        secciones: sec,
        rawPreview: rep.data?.textoBrutoOriginal ? rep.data.textoBrutoOriginal.substring(0, 1200) : null
      });
    }

    // ==========================================
    // BLOQUE 4: Mensuales 2 (Agosto - Diciembre)
    // ==========================================
    if (block === 4) {
      const formsRes = await sql`
        SELECT id, periodo, status, created_at, data
        FROM forms
        WHERE young_id = ${youngId}
        AND (
          periodo ILIKE '%08%' OR periodo ILIKE '%09%' OR periodo ILIKE '%10%' OR periodo ILIKE '%11%' OR periodo ILIKE '%12%'
          OR periodo ILIKE '%agosto%' OR periodo ILIKE '%septiembre%' OR periodo ILIKE '%setiembre%'
          OR periodo ILIKE '%octubre%' OR periodo ILIKE '%noviembre%' OR periodo ILIKE '%diciembre%'
        )
        ORDER BY periodo ASC, id ASC
      `;

      const dedupedRows = deduplicateFormsByMonth(formsRes.rows);

      if (dedupedRows.length === 0) {
        return NextResponse.json({
          hasData: false,
          block: 4,
          blockTitle: '4. Evaluaciones Mensuales 2 (Ago - Dic)',
          young: currentYoung,
          message: 'No hay evaluaciones mensuales registradas para el Bloque 4.'
        });
      }

      const months = dedupedRows.map(f => {
        const d = f.data || {};
        const talleres = Array.isArray(d.talleres) ? d.talleres.map((t: any) => {
          const rawItems = Array.isArray(t.items) ? t.items : (Array.isArray(t.habilidades) ? t.habilidades : []);
          return {
            nombre: (t.nombre || 'GENERAL').trim(),
            itemsCount: rawItems.length,
            itemsEvaluadosCount: rawItems.filter((it: any) => (it.nivel || 0) > 0).length,
            items: rawItems.map((it: any) => ({
              nombre: (it.nombre || '').trim(),
              nivel: typeof it.nivel === 'number' ? it.nivel : (parseInt(it.nivel) || 0)
            }))
          };
        }) : [];

        return {
          id: f.id,
          periodo: f.periodo,
          status: f.status,
          taller: d.taller || currentYoung.taller,
          facilitador: d.facilitadorNombre || 'No especificado',
          observaciones: d.observaciones || '',
          talleres
        };
      });

      const progression = calculateBlockProgression(dedupedRows);

      const combinedText = dedupedRows.map(f => JSON.stringify(f.data)).join(' ');
      const mismatch = detectNameMismatch(combinedText, currentYoung.nombre_completo);

      return NextResponse.json({
        hasData: true,
        block: 4,
        blockTitle: '4. Evaluaciones Mensuales 2 (Ago - Dic)',
        young: currentYoung,
        count: dedupedRows.length,
        months,
        progression,
        mismatch: mismatch ? {
          isMismatch: true,
          detectedYoungId: mismatch.detectedYoungId,
          detectedYoungName: mismatch.detectedYoungName,
          detectedYoungTaller: mismatch.detectedYoungTaller,
          warning: `¡Atención! Las planillas mensuales de este bloque mencionan a "${mismatch.detectedYoungName}".`
        } : null
      });
    }

    return NextResponse.json({ error: 'Número de bloque inválido (debe ser 1, 2, 3 o 4)' }, { status: 400 });
  } catch (err: any) {
    console.error('Error en block-preview:', err);
    return NextResponse.json({ error: err?.message || 'Error en servidor' }, { status: 500 });
  }
}
