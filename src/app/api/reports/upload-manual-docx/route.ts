import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mammoth from 'mammoth';
import OpenAI from 'openai';

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

const SECTION_KEYS = [
  'metaAlcanzada',
  'participacion',
  'integracionRelaciones',
  'actividadesRelacionadas',
  'vidaIndependiente',
  'habilidadesViajar',
  'desarrolloPersonal',
  'metasDeportivas',
  'metasSociales',
  'dimensionesCalidadVida',
  'actividadesComplementarias',
  'mejoraCalidadVida'
];

/**
 * Parser con IA (OpenAI gpt-4o-mini con modo JSON)
 * Lee el texto completo extraído del Word, cruza contra el catálogo oficial de concurrentes
 * y facilitadores de Granja Andar, e interpreta las 12 secciones institucionales sin errores.
 */
async function parseDocxWithAI(
  extractedText: string,
  filename: string,
  youngsList: { id: number; nombre_completo: string; taller: string }[],
  facilitatorsList: { id: number; name: string }[]
): Promise<{
  matchedYoungId: number | null;
  youngNombre: string;
  facilitadorNombre: string;
  periodo: string;
  secciones: Record<string, string>;
} | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new OpenAI({ apiKey });

    // Catálogo condensado de concurrentes para análisis
    const youngsCatalog = youngsList
      .map(y => `[ID ${y.id}] ${y.nombre_completo} (Grupo: ${y.taller || 'Sin taller'})`)
      .join('\n');

    const facilitatorsCatalog = facilitatorsList
      .map(f => `[ID ${f.id}] ${f.name}`)
      .join(', ');

    const systemPrompt = `Eres un auditor técnico y analista institucional de la Asociación Civil Granja Andar.
Tu tarea es interpretar con 100% de precisión y rigor el texto extraído de un archivo Word (.docx) redactado manualmente por un facilitador o profesional, estructurando la información en un objeto JSON.

LISTADO OFICIAL DE CONCURRENTES ACTIVOS (75):
${youngsCatalog}

LISTADO DE FACILITADORES INSTITUCIONALES:
${facilitatorsCatalog}

LAS 12 SECCIONES INSTITUCIONALES OFICIALES:
1. metaAlcanzada: Avance hacia metas personales, sueños o proyecto de vida del concurrente.
2. participacion: Asistencia, constancia, motivación y apoyos brindados en las actividades del taller.
3. integracionRelaciones: Relaciones sociales, vínculos con pares y facilitadores, convivencia y comunicación.
4. actividadesRelacionadas: Actividades específicas, talleres, recetas, productos o técnicas trabajadas.
5. vidaIndependiente: Autonomía funcional, rutinas de cuidado e higiene personal, BPM, orden de pertenencias y espacios.
6. habilidadesViajar: Desplazamientos, movilidad en comunidad, actividades al aire libre, salidas o viajes.
7. desarrolloPersonal: Concentración, destrezas cognitivas y motrices, aprendizaje y tolerancia a la corrección.
8. metasDeportivas: Actividad física adaptada, ejercicios de movimiento, elongación y deportes.
9. metasSociales: Festejos de cumpleaños, celebraciones y eventos compartidos en grupo.
10. dimensionesCalidadVida: Bienestar emocional, autodeterminación, escucha activa y contención afectiva.
11. actividadesComplementarias: Propuestas recreativas, artísticas, huerta, música u otras complementarias.
12. mejoraCalidadVida: Conclusión integradora sobre la evolución favorable, bienestar anímico y metas hacia el futuro.

REGLAS CRÍTICAS:
- Identifica el 'youngId' numérico exacto del concurrente al que pertenece el informe a partir del nombre en el documento.
- Identifica el nombre del 'facilitadorNombre'.
- Identifica el 'periodo' temporal (ej: "2026-01 – 2026-03" para 1er Trimestre, o "2026-04 – 2026-06").
- Clasifica TODO el texto narrativo en las 12 secciones institucionales sin resumir ni omitir frases del facilitador.
- Si una sección no tiene contenido en el documento, coloca una cadena vacía "".
- Responde estrictamente con un JSON válido.`;

    const userPrompt = `Nombre del archivo: ${filename}
TEXTO EXTRAÍDO DEL DOCUMENTO:
"""
${extractedText.substring(0, 30000)}
"""

Estructura de respuesta requerida:
{
  "youngId": number | null,
  "youngNombre": string,
  "facilitadorNombre": string,
  "periodo": string,
  "secciones": {
    "metaAlcanzada": string,
    "participacion": string,
    "integracionRelaciones": string,
    "actividadesRelacionadas": string,
    "vidaIndependiente": string,
    "habilidadesViajar": string,
    "desarrolloPersonal": string,
    "metasDeportivas": string,
    "metasSociales": string,
    "dimensionesCalidadVida": string,
    "actividadesComplementarias": string,
    "mejoraCalidadVida": string
  }
}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const cleanSecciones: Record<string, string> = {};
    const srcSecciones = parsed.secciones || parsed;

    for (const key of SECTION_KEYS) {
      const val = srcSecciones[key];
      cleanSecciones[key] = typeof val === 'string' ? val.trim() : '';
    }

    return {
      matchedYoungId: typeof parsed.youngId === 'number' ? parsed.youngId : (Number(parsed.youngId) || null),
      youngNombre: parsed.youngNombre || '',
      facilitadorNombre: parsed.facilitadorNombre || '',
      periodo: parsed.periodo || '',
      secciones: cleanSecciones
    };
  } catch (err) {
    console.error('Error en parseDocxWithAI, recurriendo a fallback:', err);
    return null;
  }
}

// Función fallback determinística para separar secciones por regex
function parseDocxSectionsDeterministic(text: string): Record<string, string> {
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

  if (Object.keys(sections).length === 0 && text.trim().length > 0) {
    sections['desarrolloPersonal'] = text.trim();
  }

  return sections;
}

// Extrae el período de un texto de manera determinística (ej: 2026-01 – 2026-03, Enero a Marzo 2026, etc.)
function detectPeriodDeterministic(text: string, filename: string): string {
  const combined = `${filename} ${text.substring(0, 2000)}`;

  const matchIsoRange = combined.match(/\b(202\d-[0-1]\d)\s*[-–—]\s*(202\d-[0-1]\d)\b/);
  if (matchIsoRange) {
    return `${matchIsoRange[1]} – ${matchIsoRange[2]}`;
  }

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

  return `${year}-01 – ${year}-03`;
}

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const sessionUserId = session.user ? Number((session.user as any).id) : null;

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

    // Obtener catálogo de concurrentes y facilitadores desde Postgres
    let allYoungs: any[] = [];
    let allFacilitators: any[] = [];
    if (sql) {
      const yRes = await sql`SELECT id, nombre_completo, taller, assigned_facilitators, pcp FROM youngs ORDER BY id ASC`;
      allYoungs = yRes.rows;
      const uRes = await sql`SELECT id, name, email FROM users WHERE role = 'FACILITADOR' OR role = 'COORDINACION'`;
      allFacilitators = uRes.rows;
    }

    // 1. Ejecutar análisis con IA (OpenAI gpt-4o-mini)
    let aiResult: any = null;
    try {
      aiResult = await parseDocxWithAI(extractedText, file.name, allYoungs, allFacilitators);
    } catch (aiErr) {
      console.error('Fallo en parseDocxWithAI:', aiErr);
    }

    // 2. Resolver Concurrente
    let matchedYoung: any = null;
    if (manualYoungId) {
      matchedYoung = allYoungs.find(y => y.id === manualYoungId) || null;
    } else if (aiResult && aiResult.matchedYoungId) {
      matchedYoung = allYoungs.find(y => y.id === aiResult.matchedYoungId) || null;
    }

    // Fallback de coincidencia de concurrente si la IA no dio match
    if (!matchedYoung) {
      const normHeaderText = normalize(extractedText.substring(0, 3000));
      let bestScore = 0;
      let candidate: any = null;

      for (const y of allYoungs) {
        const yNorm = normalize(y.nombre_completo);
        const tokens = yNorm.split(/\s+/).filter(t => t.length > 2);

        if (normHeaderText.includes(yNorm)) {
          candidate = y;
          bestScore = 100;
          break;
        }

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

      if (candidate) matchedYoung = candidate;
    }

    if (!matchedYoung) {
      return NextResponse.json({
        error: 'No se pudo identificar al concurrente automáticamente en el documento Word. Por favor seleccione el joven manualmente.',
        extractedPreview: extractedText.substring(0, 400)
      }, { status: 422 });
    }

    // 3. Resolver Facilitador
    let facilitadorNombre = manualFacilitador || aiResult?.facilitadorNombre || '';
    let facilitatorUserId: number | null = null;

    if (facilitadorNombre) {
      const matchedUser = allFacilitators.find(u => u.name && normalize(u.name).includes(normalize(facilitadorNombre)));
      if (matchedUser) {
        facilitatorUserId = matchedUser.id;
        facilitadorNombre = matchedUser.name;
      }
    }

    if (!facilitadorNombre && matchedYoung.assigned_facilitators && matchedYoung.assigned_facilitators.length > 0) {
      const facId = matchedYoung.assigned_facilitators[0];
      const assignedFac = allFacilitators.find(u => u.id === facId);
      if (assignedFac) {
        facilitadorNombre = assignedFac.name;
        facilitatorUserId = assignedFac.id;
      }
    }

    if (!facilitadorNombre) {
      facilitadorNombre = session.user?.name || 'Facilitador no especificado';
    }

    if (!facilitatorUserId) {
      facilitatorUserId = sessionUserId;
    }

    // 4. Resolver Período
    const periodo = manualPeriodo || aiResult?.periodo || detectPeriodDeterministic(extractedText, file.name);

    // 5. Resolver Secciones (IA o fallback determinístico)
    let secciones = aiResult?.secciones || {};
    const filledSectionsCount = Object.values(secciones).filter(v => typeof v === 'string' && v.trim().length > 0).length;

    if (filledSectionsCount === 0) {
      secciones = parseDocxSectionsDeterministic(extractedText);
    }

    // 6. Construir objeto de datos del informe
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
      fechaSubida: new Date().toISOString(),
      metodoInterpretacion: filledSectionsCount > 0 ? 'IA_GPT4O_MINI' : 'DETERMINISTICO'
    };

    const reportData = {
      datosGenerales,
      secciones,
      textoBrutoOriginal: extractedText,
      origenDocx: true,
      reportType: 'TRIMESTRAL'
    };

    // 7. Guardar en Postgres
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
            ${JSON.stringify({ 
              filename: file.name, 
              youngId: matchedYoung.id, 
              periodo, 
              facilitadorNombre,
              metodo: datosGenerales.metodoInterpretacion 
            })}::jsonb,
            NOW()
          )
        `;
      } catch (auditErr) {
        console.error('Error guardando auditoría de importación Word:', auditErr);
      }

      return NextResponse.json({
        ok: true,
        reportId: newReport.id,
        message: 'Informe trimestral interpretado con IA y cargado exitosamente desde Word (.docx)',
        report: {
          id: String(newReport.id),
          youngId: String(matchedYoung.id),
          jovenNombre: matchedYoung.nombre_completo,
          grupo: matchedYoung.taller,
          facilitadorNombre,
          periodo,
          reportType: 'TRIMESTRAL',
          seccionesCount: Object.values(secciones).filter((v: any) => typeof v === 'string' && v.trim().length > 0).length,
          filename: file.name,
          interpretacion: datosGenerales.metodoInterpretacion
        }
      }, { status: 201 });
    }

    return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
  } catch (error: any) {
    console.error('Error al procesar subida manual de Word:', error);
    return NextResponse.json({ error: error?.message || 'Error al procesar archivo Word' }, { status: 500 });
  }
}
