import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mammoth from 'mammoth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Normalizador de texto para comparaciones sin tildes ni mayúsculas
function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Función para parsear texto de Word extraído e intentar separar las 12 secciones oficiales
function parseDocxSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = text.split('\n').map(l => l.trim());

  const sectionMatchers = [
    { key: 'metaAlcanzada', patterns: [/meta.*alcanzada/i, /1\b.*meta/i, /meta.*anual/i] },
    { key: 'participacion', patterns: [/participaci/i, /2\b.*participaci/i, /asistencia.*talleres/i] },
    { key: 'integracionRelaciones', patterns: [/integraci.*relaci/i, /3\b.*integraci/i, /relaciones.*sociales/i, /vinculaci/i] },
    { key: 'actividadesRelacionadas', patterns: [/actividades.*relacionadas/i, /4\b.*actividad/i, /intereses.*preferencias/i] },
    { key: 'vidaIndependiente', patterns: [/vida.*independiente/i, /5\b.*vida/i, /habilidades.*cotidianas/i] },
    { key: 'habilidadesViajar', patterns: [/viajar/i, /6\b.*viajar/i, /traslados/i, /salidas.*recreativas/i] },
    { key: 'desarrolloPersonal', patterns: [/desarrollo.*personal/i, /7\b.*desarrollo/i, /concentraci/i, /motricidad/i] },
    { key: 'metasDeportivas', patterns: [/deport/i, /8\b.*deport/i, /actividades.*físicas/i, /movimiento/i] },
    { key: 'metasSociales', patterns: [/9\b.*sociales/i, /habilidades.*sociales/i, /dinámicas.*grupales/i] },
    { key: 'dimensionesCalidadVida', patterns: [/10\b.*calidad.*vida/i, /dimensiones.*calidad/i, /bienestar.*emocional/i] },
    { key: 'actividadesComplementarias', patterns: [/11\b.*complement/i, /actividades.*complementarias/i, /música.*arte/i] },
    { key: 'mejoraCalidadVida', patterns: [/12\b.*mejora/i, /mejora.*calidad/i, /conclusión.*integradora/i, /bienestar.*general/i] }
  ];

  let currentKey: string | null = null;
  let currentParagraphs: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    let matchedKey: string | null = null;
    if (line.length < 100) {
      for (const matcher of sectionMatchers) {
        for (const pattern of matcher.patterns) {
          if (pattern.test(line)) {
            const hasNumber = /^\s*(\d{1,2})[\.\s]/.test(line);
            const isWordHeader = line.toUpperCase() === line || hasNumber || line.includes(':') || line.length < 50;
            if (isWordHeader) {
              matchedKey = matcher.key;
              break;
            }
          }
        }
        if (matchedKey) break;
      }
    }

    if (matchedKey) {
      if (currentKey && currentParagraphs.length > 0) {
        sections[currentKey] = currentParagraphs.join('\n\n');
      }
      currentKey = matchedKey;
      currentParagraphs = [];
    } else {
      if (currentKey) {
        if (!/firma/i.test(line) && !/coordinaci/i.test(line) && !/facilitador/i.test(line)) {
          currentParagraphs.push(line);
        }
      }
    }
  }

  if (currentKey && currentParagraphs.length > 0) {
    sections[currentKey] = currentParagraphs.join('\n\n');
  }

  // Si no se detectaron secciones específicas, guardar el texto completo en resumen o desarrollo
  if (Object.keys(sections).length === 0 && text.trim().length > 0) {
    sections['desarrolloPersonal'] = text.trim();
  }

  return sections;
}

// Extrae el período de un texto (ej: 2026-04 – 2026-06, Abril a Junio 2026, etc.)
function detectPeriod(text: string, filename: string): string {
  const combined = `${filename} ${text.substring(0, 2000)}`;

  // Formato YYYY-MM – YYYY-MM
  const matchIsoRange = combined.match(/\b(202\d-[0-1]\d)\s*[-–—]\s*(202\d-[0-1]\d)\b/);
  if (matchIsoRange) {
    return `${matchIsoRange[1]} – ${matchIsoRange[2]}`;
  }

  // Formato meses en español (Abril - Junio 2026)
  const monthsMap: Record<string, string> = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
    'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
    'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
  };

  const norm = normalize(combined);
  const yearMatch = norm.match(/\b(202[4-9])\b/);
  const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();

  const foundMonths: string[] = [];
  for (const [mName, mNum] of Object.entries(monthsMap)) {
    if (norm.includes(mName)) {
      foundMonths.push(mNum);
    }
  }

  if (foundMonths.length >= 2) {
    const minM = foundMonths[0];
    const maxM = foundMonths[foundMonths.length - 1];
    return `${year}-${minM} – ${year}-${maxM}`;
  }

  return `${year}-04 – ${year}-06`; // Default institucional estándar
}

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const sessionUserId = session.user ? Number((session.user as any).id) : null;
    const sessionUserRole = (session.user as any)?.role || 'FACILITADOR';

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const manualYoungId = formData.get('youngId') ? Number(formData.get('youngId')) : null;
    const manualPeriodo = formData.get('periodo') as string | null;
    const manualFacilitador = formData.get('facilitadorNombre') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo .docx' }, { status: 400 });
    }

    if (!file.name.endsWith('.docx')) {
      return NextResponse.json({ error: 'El archivo debe tener extensión .docx' }, { status: 400 });
    }

    // Convertir archivo a buffer y base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Extraer texto plano con Mammoth
    let extractedText = '';
    try {
      const mammothResult = await mammoth.extractRawText({ buffer });
      extractedText = mammothResult.value || '';
    } catch (mErr: any) {
      console.error('Error al extraer texto de DOCX:', mErr);
      return NextResponse.json({ error: 'No se pudo leer el archivo Word: ' + mErr.message }, { status: 400 });
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'El archivo Word no contiene texto legible' }, { status: 400 });
    }

    const headerText = extractedText.substring(0, 3000);
    const normHeaderText = normalize(headerText);

    // 1. Identificar o confirmar concurrente en PostgreSQL
    let matchedYoung: any = null;
    if (manualYoungId && sql) {
      const yRes = await sql`SELECT id, nombre_completo, taller, assigned_facilitators, pcp FROM youngs WHERE id = ${manualYoungId}`;
      if (yRes.rows.length > 0) matchedYoung = yRes.rows[0];
    }

    if (!matchedYoung && sql) {
      const allYoungs = await sql`SELECT id, nombre_completo, taller, assigned_facilitators, pcp FROM youngs ORDER BY id ASC`;
      
      // Buscar coincidencia exacta o por palabras del nombre
      let bestScore = 0;
      let candidate: any = null;

      for (const y of allYoungs.rows) {
        const yNorm = normalize(y.nombre_completo);
        const tokens = yNorm.split(/\s+/).filter(t => t.length > 2);
        
        if (normHeaderText.includes(yNorm)) {
          candidate = y;
          bestScore = 100;
          break;
        }

        // Conteo de tokens coincidentes (ej: "Juan", "Carlos", "Suarez")
        const matchingTokens = tokens.filter(tok => normHeaderText.includes(tok));
        if (tokens.length > 0 && matchingTokens.length === tokens.length) {
          candidate = y;
          bestScore = 90;
          break;
        } else if (matchingTokens.length >= 2 && matchingTokens.length > bestScore) {
          bestScore = matchingTokens.length;
          candidate = y;
        }
      }

      if (candidate) {
        matchedYoung = candidate;
      }
    }

    if (!matchedYoung) {
      return NextResponse.json({
        error: 'No se pudo identificar al concurrente automáticamente en el documento Word. Por favor seleccione el joven manualmente.',
        extractedPreview: extractedText.substring(0, 400)
      }, { status: 422 });
    }

    // 2. Identificar Facilitador
    let facilitadorNombre = manualFacilitador || '';
    let facilitatorUserId: number | null = null;

    if (!facilitadorNombre && sql) {
      const usersRes = await sql`SELECT id, name FROM users WHERE role = 'FACILITADOR'`;
      for (const u of usersRes.rows) {
        if (u.name && normHeaderText.includes(normalize(u.name))) {
          facilitadorNombre = u.name;
          facilitatorUserId = u.id;
          break;
        }
      }

      // Si no se encontró por nombre en el texto, buscar el facilitador asignado al joven
      if (!facilitadorNombre && matchedYoung.assigned_facilitators && matchedYoung.assigned_facilitators.length > 0) {
        const facId = matchedYoung.assigned_facilitators[0];
        const assignedFac = usersRes.rows.find((u: any) => u.id === facId);
        if (assignedFac) {
          facilitadorNombre = assignedFac.name;
          facilitatorUserId = assignedFac.id;
        }
      }
    }

    if (!facilitadorNombre) {
      facilitadorNombre = session.user?.name || 'Facilitador no especificado';
    }

    if (!facilitatorUserId) {
      facilitatorUserId = sessionUserId;
    }

    // 3. Identificar Período
    const periodo = manualPeriodo || detectPeriod(extractedText, file.name);

    // 4. Parsear Secciones
    const secciones = parseDocxSections(extractedText);

    // 5. Construir objeto de datos del informe
    const datosGenerales = {
      nombreCompleto: matchedYoung.nombre_completo,
      grupo: matchedYoung.taller || 'Sin grupo',
      taller: matchedYoung.taller || 'Sin taller',
      facilitador: facilitadorNombre,
      facilitadora: facilitadorNombre,
      facilitadorNombre: facilitadorNombre,
      periodo: periodo,
      origen: 'DOCX_MANUAL',
      archivoOriginal: file.name,
      fechaSubida: new Date().toISOString()
    };

    const reportData = {
      datosGenerales,
      secciones,
      textoBrutoOriginal: extractedText,
      origenDocx: true,
      reportType: 'TRIMESTRAL'
    };

    // 6. Guardar en Postgres
    if (sql) {
      const insertResult = await sql`
        INSERT INTO reports (
          young_id,
          periodo,
          report_type,
          status,
          version,
          data,
          original_data,
          edited_docx_base64,
          edited_docx_filename,
          generated_by,
          created_at,
          updated_at
        ) VALUES (
          ${matchedYoung.id},
          ${periodo},
          'TRIMESTRAL',
          'BORRADOR',
          1,
          ${JSON.stringify(reportData)}::jsonb,
          ${JSON.stringify(reportData)}::jsonb,
          ${base64},
          ${file.name},
          ${facilitatorUserId},
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
            'IMPORT_MANUAL_DOCX',
            ${sessionUserId},
            ${JSON.stringify({ filename: file.name, youngId: matchedYoung.id, periodo, facilitadorNombre })}::jsonb,
            NOW()
          )
        `;
      } catch (auditErr) {
        console.error('Error guardando auditoría de importación Word:', auditErr);
      }

      return NextResponse.json({
        ok: true,
        reportId: newReport.id,
        message: 'Informe trimestral cargado e interpretado exitosamente desde Word (.docx)',
        report: {
          id: String(newReport.id),
          youngId: String(matchedYoung.id),
          jovenNombre: matchedYoung.nombre_completo,
          grupo: matchedYoung.taller,
          facilitadorNombre,
          periodo,
          reportType: 'TRIMESTRAL',
          seccionesCount: Object.keys(secciones).length,
          filename: file.name
        }
      }, { status: 201 });
    }

    return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
  } catch (error: any) {
    console.error('Error al procesar subida manual de Word:', error);
    return NextResponse.json({ error: error?.message || 'Error al procesar archivo Word' }, { status: 500 });
  }
}
