import OpenAI from 'openai';

export interface EvaluacionDimension {
  dimension: string;
  valoracion: '✔' | '➖' | '❌';
  comentario: string;
}

export interface FinalReportGeneratedStructure {
  parte1_informeFinal: {
    objetivoProceso: string;
    escuchaActiva: string;
    estadoEmocional: string;
    apoyosAjustes: string;
    evaluacionDimensiones: EvaluacionDimension[];
    logros: {
      practicas: string;
      emocionalesSociales: string;
      decisiones: string;
      nuevasExperiencias: string;
    };
    suenosMetas: string;
    circuloApoyo: string;
    proyecciones: string[];
  };
  parte2_planAbordaje: {
    anio: string;
    introduccion: string;
    objetivoGeneral: string;
    objetivosEspecificos: string[];
    lineasAccion: {
      autonomia: string[];
      regulacionEmocional: string[];
      habilidadesSociales: string[];
      inclusionComunitaria: string[];
      autodeterminacion: string[];
      acompanamientoFamiliar: string[];
    };
    suenosMetas: string[];
    indicadores: {
      bienestarFisico: string;
      bienestarEmocional: string;
      bienestarMaterial: string;
      desarrolloPersonal: string;
      relacionesInterpersonales: string;
      inclusionSocial: string;
      autodeterminacion: string;
      derechos: string;
    };
    lineamientosFacilitador: string[];
  };
  secciones: Record<string, string>;
}

export interface FinalReportGeneratorOptions {
  jovenNombre: string;
  jovenTaller?: string;
  pcp: any;
  facilitadorNombre?: string;
  trimestral1?: { id?: number; periodo: string; data: any; docxText?: string } | null;
  mensuales1?: any[];
  trimestral2?: { id?: number; periodo: string; data: any; docxText?: string } | null;
  mensuales2?: any[];
  circuloApoyoPersonas?: string;
  circuloApoyoParticipacion?: string;
  dni?: string;
  obraSocial?: string;
  isUnlockedException?: boolean;
  missingBlocksNotice?: string;
}

export async function generateFinalReportNarrative(options: FinalReportGeneratorOptions): Promise<FinalReportGeneratedStructure> {
  const allTallerNames: string[] = [];
  [...(options.mensuales1 || []), ...(options.mensuales2 || [])].forEach((f: any) => {
    (f.data?.talleres || []).forEach((t: any) => {
      const name = (t.nombre || '').trim();
      if (name && !allTallerNames.includes(name)) {
        allTallerNames.push(name);
      }
    });
  });
  const hasCatering = allTallerNames.some(t => /catering|pasteler|cocina|gastronom|rotiser/i.test(t));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OPENAI_API_KEY no configurado, utilizando fallback determinístico para informe final.');
    return cleanPositiveNarrative(generateDeterministicFinalFallback(options), options.jovenNombre, hasCatering);
  }

  try {
    const client = new OpenAI({ apiKey });
    const prompt = buildFinalReportPrompt(options);

    const cateringSystemDirective = !hasCatering
      ? `\n10) ¡PROHIBICIÓN TERMINANTE DE CATERING / PASTELERÍA / COCINA / GASTRONOMÍA!:
El concurrente NO asiste a talleres de catering ni pastelería ni cocina.
Sus áreas y talleres reales son: [${allTallerNames.length > 0 ? allTallerNames.join(', ') : (options.jovenTaller || 'Actividades de Centro de Día')}].
Queda TERMINANTEMENTE PROHIBIDO escribir las palabras "catering", "pastelería", "cocina", "gastronomía", "elaboración de alimentos", "recetas de pastelería" o "rotisería". Concéntrate exclusivamente en sus áreas reales y habilidades sociolaborales.`
      : '';

    const response = await client.chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-4o',
      temperature: Number(process.env.LLM_TEMPERATURE ?? 0.35),
      max_tokens: 8000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Eres la máxima autoridad técnica en la Asociación Civil Granja Andar, especializado en la elaboración de Informes Finales Anuales y Planes de Abordaje bajo el Modelo Social de la Discapacidad, Calidad de Vida (Schalock & Verdugo) y Planificación Centrada en la Persona (PCP).

Tu tarea es generar un documento anual completo, integrador y longitudinal dividido estrictamente en DOS PARTES:
PARTE 1: INFORME FINAL - ABORDAJE CENTRADO EN LA PERSONA (10 secciones oficiales, tabla de 8 dimensiones y logros categorizados en 4 áreas).
PARTE 2: PLAN DE ABORDAJE CENTRADO EN LA PERSONA (Objetivo general, objetivos específicos, 6 líneas de acción, sueños/metas, indicadores y lineamientos).

DIRECTIVAS CRÍTICAS DE ESTILO, PROFUNDIDAD NARRATIVA Y RIGOR INSTITUCIONAL:
1) EXPLAYAMIENTO EXTENSO Y PROFUNDO CON INFORMACIÓN REAL ("UTILIZA TODA LA INFORMACIÓN DISPONIBLE"):
   El usuario exige expresamente que el Informe Final sea AMPLIO, EXPLAYADO Y DETALLADO. No generes textos breves ni resúmenes de 1 o 2 oraciones.
   Debes integrar minuciosamente la totalidad de las 4 fuentes del año (Trimestral 1 de verano, Mensuales 1 con cuadrículas y observaciones, Trimestral 2 de invierno, y Mensuales 2 con cuadrículas, natación y observaciones).
2) FOCO REQUERIDO EN LA SECCIÓN 7 (LOGROS ALCANZADOS DURANTE EL CICLO ANUAL):
   En "logros" (las 4 áreas: "practicas", "emocionalesSociales", "decisiones", "nuevasExperiencias"), DEBES EXPLAYARTE AMPLIAMENTE.
   Cada una de las 4 áreas DEBE contar con una redacción rica, profunda y descriptiva de 2 a 3 párrafos completos (separados por doble salto de línea \n\n), articulando:
   - Los nombres de los talleres reales cursados y las destrezas específicas alcanzadas, explicando siempre su progreso de manera puramente cualitativa y funcional.
   - PROHIBICIÓN TERMINANTE DE CITAR "NIVELES" O RÚBRICAS NUMÉRICAS ("NIVEL 1", "NIVEL 2", "NIVEL 3", "NIVEL 4", "NIVELES"):
     Queda estrictamente prohibido escribir frases como "Nivel 1", "Nivel 2", "Nivel 3", "Nivel 4", "alcanzó el Nivel 3", "en nivel 2", o hablar de "niveles" en los párrafos narrativos.
     Los informes institucionales son leídos por familias, obras sociales y juntas evaluadoras; la rúbrica numérica es solo una referencia técnica interna.
     Debes traducir y explicar los logros cualitativamente en términos de funcionalidad, autonomía y apoyos:
     * Nivel 3 (Consolidado): describe que "ha consolidado con autonomía y regularidad", "demuestra un desempeño afianzado y autónomo", "logra una participación regular y solvente, requiriendo supervisión mínima o intermitente".
     * Nivel 4 (Independiente/Modelo): describe que se desempeña "de forma plenamente independiente, autónoma y ejemplar, sirviendo como referente positivo para sus compañeros".
     * Nivel 2 (En desarrollo): describe que se encuentra "en pleno proceso de desarrollo activo, respondiendo a recordatorios verbales y orientaciones paso a paso".
     * Nivel 1 (Inicial): describe que se encuentra "en etapa inicial de aprendizaje, participando con asistencia continua y modelado".
     ¡NUNCA escribas la palabra "Nivel" seguida de un número ni menciones escalas o rúbricas en el texto narrativo!
   - Las observaciones textuales del facilitador mes a mes (ej. Kermés, boliche CCP, natación/pileta, festejos de Malvinas/Tierra/Autismo, cruces seguros, salidas a shopping/polideportivo).
   - Las estrategias formativas, adecuaciones y apoyos personalizados implementados.
   - PROHIBICIÓN ESTRICTA DE ETIQUETAS: Queda terminantemente prohibido escribir "Párrafo 1:", "Párrafo 2:", "Parrafo 1:", "Párrafo:" o enumeraciones similares. Redacta párrafos narrativos fluidos y continuos sin etiquetas.
3) FIDELIDAD EMPÍRICA TOTAL - PROHIBIDO INVENTAR ("NO INVENTES NADA"):
   Explayarse significa profundizar y articular TODA la información real provista, NUNCA inventar talleres, tareas o vivencias que no figuren en los insumos. Si el concurrente no cursa catering, NO inventes catering. Refleja estrictamente sus talleres reales.
4) PROHIBICIÓN TERMINANTE DE TÉRMINOS PEDAGÓGICOS O CET:
   Granja Andar es un Centro de Día de formación ocupacional y social, NO una escuela ni un Centro Educativo Terapéutico (CET).
   PROHIBIDAS las palabras: "pedagogía", "pedagógico/a", "CET", "alumno/a", "estudiante", "docente", "profesor", "malla curricular", "contenidos curriculares", "psicopedagógico".
   Usa: "concurrente", "joven", "persona", "facilitador/a", "apoyos formativos/sociolaborales", "propuestas de taller", "Centro de Día".
5) TERMINOLOGÍA OBLIGATORIA: INCLUSIÓN (PROHIBIDO USAR INTEGRACIÓN):
   A requerimiento institucional estricto, el término rector es "INCLUSIÓN" ("Inclusión Social", "Inclusión comunitaria", "espacios inclusivos", "procesos de inclusión"). NO utilices "integración".
6) EL PROTAGONISTA ES EL JOVEN (CENTRICIDAD EN LA PERSONA):
   El sujeto de cada acción es el concurrente. Los facilitadores y la institución son APOYOS externos.
   Evita oraciones como "La facilitadora acompaña...". Redacta desde la persona: qué realiza, qué elige, cómo participa, qué estrategias y apoyos utiliza.
7) TIEMPO PRESENTE ESTRICTO Y TONO 100% POSITIVO:
   Toda la redacción debe estar en tiempo presente. Sin frases de carencia ("no se registraron", "falta de datos").
8) MODELO DE CALIDAD DE VIDA (SCHALOCK & VERDUGO) - DEFINICIÓN RIGUROSA DE LAS 8 DIMENSIONES:
   La evaluación de las 8 dimensiones de Calidad de Vida (tanto en la tabla de evaluación de Parte 1 como en los indicadores de Parte 2) debe basarse estrictamente en el marco conceptual de Robert Schalock y Miguel Ángel Verdugo adoptado por la psicología institucional de Granja Andar:
   1. Bienestar Físico (BF): Salud integral, nutrición, descanso, hábitos higiénicos, adherencia a controles médicos y tratamientos, movilidad física, deportes adaptados y natación.
   2. Bienestar Emocional (BE): Estado anímico habitual, tranquilidad, seguridad afectiva, autoconcepto positivo, autorregulación ante frustraciones o cambios de rutina, y ausencia de estrés severo.
   3. Bienestar Material (BM) - ¡ATENCIÓN CRÍTICA: NO CONFUNDIR CON ELEMENTOS DE COCINA O MATERIALES DE TALLER!:
      * DEFINICIÓN CONCEPTUAL: El Bienestar Material evalúa EXCLUSIVAMENTE la situación socioeconómica, condiciones habitacionales y de vivienda, cobertura de necesidades materiales básicas (alimentación digna, vestimenta adecuada al clima, calzado, pases de transporte, gestión de pensión por discapacidad / CUD, cobertura de obra social o apoyos socioeconómicos) y acceso a bienes o recursos materiales indispensables.
      * PROHIBICIÓN TERMINANTE: Queda TERMINANTEMENTE PROHIBIDO asociar "Bienestar Material" con el uso, cuidado, lavado, manipulación u orden de "elementos de cocina", "utensilios", "ollas", "materiales de taller", "lijas", "pinceles", "telas" o "herramientas". Confundir "material" con materiales de trabajo o elementos de cocina es un error conceptual inaceptable para la psicología institucional. Redacta siempre en función de la estabilidad económica familiar, cobertura de necesidades materiales básicas y recursos esenciales para su vida diaria.
   4. Desarrollo Personal (DP): Aprendizaje a lo largo de la vida, adquisición y afianzamiento de habilidades prácticas y funcionales, competencias operativas en los talleres del Centro de Día, curiosidad, resolución de situaciones cotidianas y superación personal.
   5. Relaciones Interpersonales (RI): Vínculos afectivos significativos con pares, facilitadores y círculo familiar; clima de compañerismo, interacción comunicativa respetuosa, empatía, reciprocidad y resolución pacífica de desacuerdos.
   6. Inclusión Social (IS): Participación activa en la vida comunitaria y ciudadana, concurrencia a espacios barriales, clubes, polideportivos, reservas naturales, salidas recreativas (Kermés, boliche CCP, paseos de compras), acceso a servicios públicos y pertenencia social valorada en igualdad de oportunidades.
   7. Autodeterminación (AD): Capacidad y oportunidad de elegir y tomar decisiones sobre la propia vida, manifestación de preferencias, gustos, opiniones y metas personales; protagonismo activo en su Planificación Centrada en la Persona (PCP).
   8. Derechos (DE): Dignidad humana, respeto pleno de su privacidad, confidencialidad, trato igualitario como sujeto de pleno derecho (Convención Internacional sobre los Derechos de las Personas con Discapacidad - CDPD) y acceso efectivo a apoyos y ajustes razonables.
9) PLAN DE ABORDAJE (PARTE 2):
   Proyecta el próximo ciclo anual de forma concreta y rigurosa, respetando sus metas y sueños, con 6 líneas de acción operativas y medibles.${cateringSystemDirective}`
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('Respuesta vacía de OpenAI para Informe Final');

    const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return cleanPositiveNarrative(parsed, options.jovenNombre, hasCatering);
  } catch (error) {
    console.error('Error llamando a OpenAI para narrativa de informe final:', error);
    return cleanPositiveNarrative(generateDeterministicFinalFallback(options), options.jovenNombre, hasCatering);
  }
}

export function describeNivelQualitative(nivel: number | string): string {
  const num = Number(nivel);
  if (num >= 4) return 'desempeño plenamente independiente / modelo';
  if (num === 3) return 'desempeño consolidado y autónomo';
  if (num === 2) return 'en proceso de desarrollo activo con apoyos verbales';
  return 'en etapa inicial con apoyos guiados paso a paso';
}

import { sanitizeNarrativeLevels } from '@/lib/formatters';
export { sanitizeNarrativeLevels };

export function sanitizeCateringIfAbsent(text: string, hasCatering: boolean = true): string {
  if (hasCatering || typeof text !== 'string') return text;
  let s = text;
  s = s.replace(/talleres?\s+de\s+(?:catering\s+y\s+pasteler[ií]a|pasteler[ií]a\s+y\s+catering)/gi, 'talleres de formación sociolaboral');
  s = s.replace(/actividades\s+de\s+(?:catering\s+y\s+pasteler[ií]a|pasteler[ií]a\s+y\s+catering)/gi, 'actividades prácticas del taller');
  s = s.replace(/taller\s+de\s+(?:catering|pasteler[ií]a|rotiser[ií]a|gastronom[ií]a|cocina(?:\s+industrial)?)/gi, 'taller formativo');
  s = s.replace(/talleres\s+de\s+(?:catering|pasteler[ií]a|rotiser[ií]a|gastronom[ií]a|cocina(?:\s+industrial)?)/gi, 'talleres formativos');
  s = s.replace(/catering\s+y\s+pasteler[ií]a/gi, 'actividades del taller');
  s = s.replace(/pasteler[ií]a\s+y\s+catering/gi, 'actividades del taller');
  s = s.replace(/\bcatering\b/gi, 'actividades del taller');
  s = s.replace(/\bpasteler[ií]a\b/gi, 'actividades del taller');
  s = s.replace(/\brotiser[ií]a\b/gi, 'espacio de taller');
  s = s.replace(/elaboraci[oó]n\s+(?:culinaria|gastron[oó]mica|de\s+recetas)/gi, 'realización de tareas prácticas');
  s = s.replace(/t[eé]cnicas\s+culinarias/gi, 'técnicas y habilidades prácticas');
  s = s.replace(/recetas?\s+de\s+pasteler[ií]a/gi, 'consignas de trabajo');
  s = s.replace(/[ \t]{2,}/g, ' ');
  return s;
}

function cleanString(str: string, jovenNombre?: string, hasCatering: boolean = true): string {
  if (typeof str !== 'string') return '';
  let cleaned = str;

  // 1. Frases negativas / falta de datos
  cleaned = cleaned.replace(/aunque no se registran? [^,.]+[,.]?/gi, '');
  cleaned = cleaned.replace(/a pesar de no contar con registros? [^,.]+[,.]?/gi, '');
  cleaned = cleaned.replace(/no se registran? datos específicos [^,.]+[,.]?/gi, 'se continúa trabajando activamente en esta área.');
  cleaned = cleaned.replace(/no se registran? salidas específicas[,.]?/gi, 'se continúa disfrutando de las actividades dentro del predio institucional,');
  cleaned = cleaned.replace(/no se registran? [^,.]+ durante el ciclo[,.]?/gi, 'se continúa trabajando y avanzando con apoyos orientados a su desarrollo.');
  cleaned = cleaned.replace(/sin novedades particulares registradas [^,.]+[,.]?/gi, 'con un proceso de desarrollo continuo.');

  // 2. Erradicación estricta de términos pedagógicos / CET
  cleaned = cleaned.replace(/apoyos? pedag[oó]gicos?/gi, 'apoyos formativos');
  cleaned = cleaned.replace(/orientaciones y apoyos pedag[oó]gicos?/gi, 'orientaciones y apoyos formativos');
  cleaned = cleaned.replace(/estrategias? pedag[oó]gicas?/gi, 'estrategias formativas');
  cleaned = cleaned.replace(/propuestas? pedag[oó]gicas?/gi, 'propuestas formativas');
  cleaned = cleaned.replace(/[aá]rea pedag[oó]gica/gi, 'área formativa');
  cleaned = cleaned.replace(/pedag[oó]gic[oa]s?/gi, 'formativo');
  cleaned = cleaned.replace(/pedagog[ií]a/gi, 'formación ocupacional');
  cleaned = cleaned.replace(/psicopedag[oó]gic[oa]s?/gi, 'formativo');
  cleaned = cleaned.replace(/psicopedagog[ií]a/gi, 'formación sociolaboral');
  cleaned = cleaned.replace(/centro educativo terap[eé]utico/gi, 'Centro de Día');
  cleaned = cleaned.replace(/educativo[as]? terap[eé]utico[as]?/gi, 'sociolaboral');
  cleaned = cleaned.replace(/contenidos curriculares/gi, 'propuestas de taller');
  cleaned = cleaned.replace(/malla curricular/gi, 'plan de talleres');
  cleaned = cleaned.replace(/\balumnos\b/gi, 'concurrentes');
  cleaned = cleaned.replace(/\balumno\b/gi, 'concurrente');
  cleaned = cleaned.replace(/\balumnas\b/gi, 'concurrentes');
  cleaned = cleaned.replace(/\balumna\b/gi, 'concurrente');
  cleaned = cleaned.replace(/\bdocentes\b/gi, 'facilitadores');
  cleaned = cleaned.replace(/\bdocente\b/gi, 'facilitador/a');

  // 3. Regla institucional: INCLUSIÓN (es inclusión, no integración, es al revés)
  cleaned = cleaned.replace(/integraci[oó]n social/gi, 'inclusión social');
  cleaned = cleaned.replace(/integraci[oó]n comunitaria/gi, 'inclusión comunitaria');
  cleaned = cleaned.replace(/procesos? de integraci[oó]n/gi, 'procesos de inclusión');
  cleaned = cleaned.replace(/espacios? integradores/gi, 'espacios inclusivos');
  cleaned = cleaned.replace(/propuestas? integradoras?/gi, 'propuestas inclusivas');
  cleaned = cleaned.replace(/\bintegraci[oó]n\b/gi, 'inclusión');
  cleaned = cleaned.replace(/\bintegradores\b/gi, 'inclusivos');
  cleaned = cleaned.replace(/\bintegradoras\b/gi, 'inclusivas');
  cleaned = cleaned.replace(/\bintegrador\b/gi, 'inclusivo');
  cleaned = cleaned.replace(/\bintegradora\b/gi, 'inclusiva');

  // 4. Centricidad en la persona: suavizar protagonismo excesivo del facilitador
  cleaned = cleaned.replace(/su relaci[oó]n con la facilitadora es de confianza, recurriendo a ella para orientaci[oó]n y apoyo\.?/gi, 'participa con seguridad y confianza, recurriendo a apoyos y orientaciones cuando lo requiere.');
  cleaned = cleaned.replace(/su relaci[oó]n con (el|la) facilitador(a)? [^.]*es de confianza[^.]*\.?/gi, 'participa con seguridad y confianza en las actividades compartidas.');
  cleaned = cleaned.replace(/el equipo facilitador brinda contenci[oó]n y orientaci[oó]n/gi, 'cuenta con apoyos y orientaciones adaptadas');
  cleaned = cleaned.replace(/bajo la gu[ií]a de la facilitadora/gi, 'con apoyos individualizados');
  cleaned = cleaned.replace(/bajo la gu[ií]a del facilitador/gi, 'con apoyos individualizados');
  cleaned = cleaned.replace(/la facilitadora acompaña y gu[ií]a/gi, 'cuenta con orientación individualizada');
  cleaned = cleaned.replace(/el facilitador acompaña y gu[ií]a/gi, 'cuenta con orientación individualizada');
  cleaned = cleaned.replace(/con el acompañamiento de los facilitadores/gi, 'con apoyos adaptados a sus requerimientos');
  cleaned = cleaned.replace(/con el acompañamiento de la facilitadora/gi, 'con apoyos personalizados');
  cleaned = cleaned.replace(/con el acompañamiento del facilitador/gi, 'con apoyos personalizados');
  cleaned = cleaned.replace(/con el apoyo de la facilitadora/gi, 'con apoyos específicos');
  cleaned = cleaned.replace(/con el apoyo del facilitador/gi, 'con apoyos específicos');

  // 5. Erradicación estricta de prefijos tipo "Párrafo 1:", "párrafo 2:", etc.
  cleaned = cleaned
    .replace(/^[ \t]*[\(\[]?[pP][aá]rrafo\s*\d*[\)\]]?[ \t]*[:.\-–—]?[ \t]*/gim, '')
    .replace(/\b[pP][aá]rrafo\s*\d+[ \t]*[:.\-–—][ \t]*/gi, '');

  // 6. Erradicación estricta de menciones numéricas de niveles / rúbricas
  cleaned = sanitizeNarrativeLevels(cleaned);

  // 7. Sanitización de catering si el concurrente no cursa catering
  if (!hasCatering) {
    cleaned = sanitizeCateringIfAbsent(cleaned, false);
  }

  cleaned = cleaned
    .split(/\r?\n/)
    .map(line => line.replace(/^[ \t]*[\(\[]?[pP][aá]rrafo\s*\d*[\)\]]?[ \t]*[:.\-–—]?[ \t]*/i, '').replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

export function stripParrafoPrefixes(text: string, hasCatering: boolean = true): string {
  if (typeof text !== 'string') return '';
  let sanitized = sanitizeNarrativeLevels(text);
  if (!hasCatering) {
    sanitized = sanitizeCateringIfAbsent(sanitized, false);
  }
  return sanitized
    .replace(/^[ \t]*[\(\[]?[pP][aá]rrafo\s*\d*[\)\]]?[ \t]*[:.\-–—]?[ \t]*/gim, '')
    .replace(/\b[pP][aá]rrafo\s*\d+[ \t]*[:.\-–—][ \t]*/gi, '')
    .split(/\r?\n/)
    .map(line => line.replace(/^[ \t]*[\(\[]?[pP][aá]rrafo\s*\d*[\)\]]?[ \t]*[:.\-–—]?[ \t]*/i, '').trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function cleanPositiveNarrative(obj: any, jovenNombre?: string, hasCatering: boolean = true): FinalReportGeneratedStructure {
  if (!obj || typeof obj !== 'object') {
    return generateDeterministicFinalFallback({ jovenNombre: jovenNombre || 'Concurrente', pcp: {} });
  }

  const p1 = obj.parte1_informeFinal || {};
  const p2 = obj.parte2_planAbordaje || {};

  // Clean parte 1
  const cleanedP1: any = {
    objetivoProceso: cleanString(p1.objetivoProceso, jovenNombre, hasCatering),
    escuchaActiva: cleanString(p1.escuchaActiva, jovenNombre, hasCatering),
    estadoEmocional: cleanString(p1.estadoEmocional, jovenNombre, hasCatering),
    apoyosAjustes: cleanString(p1.apoyosAjustes, jovenNombre, hasCatering),
    evaluacionDimensiones: Array.isArray(p1.evaluacionDimensiones)
      ? p1.evaluacionDimensiones.map((d: any) => ({
          dimension: cleanString(d.dimension || '', undefined, hasCatering),
          valoracion: ['✔', '➖', '❌'].includes(d.valoracion) ? d.valoracion : '✔',
          comentario: cleanString(d.comentario || '', undefined, hasCatering)
        }))
      : [],
    logros: {
      practicas: cleanString(p1.logros?.practicas, jovenNombre, hasCatering),
      emocionalesSociales: cleanString(p1.logros?.emocionalesSociales, jovenNombre, hasCatering),
      decisiones: cleanString(p1.logros?.decisiones, jovenNombre, hasCatering),
      nuevasExperiencias: cleanString(p1.logros?.nuevasExperiencias, jovenNombre, hasCatering)
    },
    suenosMetas: cleanString(p1.suenosMetas, jovenNombre, hasCatering),
    circuloApoyo: cleanString(p1.circuloApoyo, jovenNombre, hasCatering),
    proyecciones: Array.isArray(p1.proyecciones)
      ? p1.proyecciones.map((pr: any) => cleanString(String(pr || ''), undefined, hasCatering)).filter(Boolean)
      : []
  };

  // Clean parte 2
  const cleanedP2: any = {
    anio: p2.anio || '2026',
    introduccion: cleanString(p2.introduccion, jovenNombre, hasCatering),
    objetivoGeneral: cleanString(p2.objetivoGeneral, jovenNombre, hasCatering),
    objetivosEspecificos: Array.isArray(p2.objetivosEspecificos)
      ? p2.objetivosEspecificos.map((o: any) => cleanString(String(o || ''), undefined, hasCatering)).filter(Boolean)
      : [],
    lineasAccion: {
      autonomia: Array.isArray(p2.lineasAccion?.autonomia) ? p2.lineasAccion.autonomia.map((it: any) => cleanString(String(it || ''), undefined, hasCatering)).filter(Boolean) : [],
      regulacionEmocional: Array.isArray(p2.lineasAccion?.regulacionEmocional) ? p2.lineasAccion.regulacionEmocional.map((it: any) => cleanString(String(it || ''), undefined, hasCatering)).filter(Boolean) : [],
      habilidadesSociales: Array.isArray(p2.lineasAccion?.habilidadesSociales) ? p2.lineasAccion.habilidadesSociales.map((it: any) => cleanString(String(it || ''), undefined, hasCatering)).filter(Boolean) : [],
      inclusionComunitaria: Array.isArray(p2.lineasAccion?.inclusionComunitaria) ? p2.lineasAccion.inclusionComunitaria.map((it: any) => cleanString(String(it || ''), undefined, hasCatering)).filter(Boolean) : [],
      autodeterminacion: Array.isArray(p2.lineasAccion?.autodeterminacion) ? p2.lineasAccion.autodeterminacion.map((it: any) => cleanString(String(it || ''), undefined, hasCatering)).filter(Boolean) : [],
      acompanamientoFamiliar: Array.isArray(p2.lineasAccion?.acompanamientoFamiliar) ? p2.lineasAccion.acompanamientoFamiliar.map((it: any) => cleanString(String(it || ''), undefined, hasCatering)).filter(Boolean) : []
    },
    suenosMetas: Array.isArray(p2.suenosMetas)
      ? p2.suenosMetas.map((s: any) => cleanString(String(s || ''), undefined, hasCatering)).filter(Boolean)
      : [],
    indicadores: {
      bienestarFisico: cleanString(p2.indicadores?.bienestarFisico || '', undefined, hasCatering),
      bienestarEmocional: cleanString(p2.indicadores?.bienestarEmocional || '', undefined, hasCatering),
      bienestarMaterial: cleanString(p2.indicadores?.bienestarMaterial || '', undefined, hasCatering),
      desarrolloPersonal: cleanString(p2.indicadores?.desarrolloPersonal || '', undefined, hasCatering),
      relacionesInterpersonales: cleanString(p2.indicadores?.relacionesInterpersonales || '', undefined, hasCatering),
      inclusionSocial: cleanString(p2.indicadores?.inclusionSocial || '', undefined, hasCatering),
      autodeterminacion: cleanString(p2.indicadores?.autodeterminacion || '', undefined, hasCatering),
      derechos: cleanString(p2.indicadores?.derechos || '', undefined, hasCatering)
    },
    lineamientosFacilitador: Array.isArray(p2.lineamientosFacilitador)
      ? p2.lineamientosFacilitador.map((l: any) => cleanString(String(l || ''), undefined, hasCatering)).filter(Boolean)
      : []
  };

  // Secciones backward-compatibility map
  const secciones: Record<string, string> = {
    metaAlcanzada: cleanedP1.suenosMetas || 'Consolidación de metas personales.',
    participacion: cleanedP1.objetivoProceso || 'Participación activa y regular.',
    integracionRelaciones: cleanedP1.circuloApoyo || 'Vínculos sólidos con familiares y facilitadores.',
    actividadesRelacionadas: cleanedP1.logros.practicas || 'Desarrollo en los talleres de Centro de Día.',
    vidaIndependiente: cleanedP1.logros.practicas || 'Autonomía en tareas de la vida diaria.',
    habilidadesViajar: cleanedP1.escuchaActiva || 'Habilidades de movilidad y traslados seguros.',
    desarrolloPersonal: cleanedP1.logros.emocionalesSociales || 'Desarrollo personal y expresión asertiva.',
    metasDeportivas: cleanedP1.logros.nuevasExperiencias || 'Participación en deportes y natación.',
    metasSociales: cleanedP1.logros.decisiones || 'Participación en decisiones y celebraciones comunitarias.',
    dimensionesCalidadVida: cleanedP1.estadoEmocional || 'Bienestar subjetivo y autorregulación emocional.',
    actividadesComplementarias: cleanedP1.logros.nuevasExperiencias || 'Actividades culturales y recreativas.',
    mejoraCalidadVida: cleanedP1.proyecciones.join('. ') || 'Balance anual positivo y proyecciones favorables.'
  };

  return {
    parte1_informeFinal: cleanedP1,
    parte2_planAbordaje: cleanedP2,
    secciones
  };
}

/**
 * Extrae de forma inteligente el sueño/meta personal a partir de textos narrativos
 * de informes institucionales o encabezados explícitos.
 */
export function extractDreamFromText(text: string): string | null {
  if (!text || typeof text !== 'string') return null;

  // 1. Coincidencia de encabezado explícito: "Meta o Sueño para 2026: ...", "Sueño: ...", etc.
  const headerMatch = text.match(/(?:meta\s*o\s*sue[ñn]o(?:\s*para\s*\d{4})?|sue[ñn]o\s*para\s*\d{4}|sue[ñn]o\s*de\s*la\s*persona|sue[ñn]os?)\s*[:.\-–—]\s*([^\n\r]+)/i);
  if (headerMatch && headerMatch[1]) {
    const raw = headerMatch[1].trim();
    const cleaned = raw.replace(/(?:¿Ha alcanzado|Nombre del|Grupo|Facilitador|1\.|2\.).*$/i, '').trim();
    if (cleaned.length > 3 && !cleaned.toLowerCase().includes('no tiene') && !cleaned.toLowerCase().includes('no posee')) {
      return cleaned;
    }
  }

  // 2. Patrones narrativos en sección metaAlcanzada o texto general
  const patterns = [
    /(?:inter[eé]s en alcanzar su sue[ñn]o de|sue[ñn]o de|sue[ñn]o es|anhelo de|anhela|meta de)\s+([^.;\n]{5,140})/i,
    /(?:metas? personales?,?\s*(?:como|especialmente en)\s+)([^.;\n]{5,140})/i,
    /(?:entusiasmo por\s+)([^.;\n]{5,140})/i
  ];

  for (const pat of patterns) {
    const m = text.match(pat);
    if (m && m[1]) {
      const candidate = m[1].trim();
      if (candidate.length > 5 && !candidate.toLowerCase().startsWith('recibir') && !candidate.toLowerCase().startsWith('participar en los')) {
        return candidate;
      }
    }
  }

  return null;
}

/**
 * Inspecciona un informe trimestral (Bloque 3 o Bloque 1) en busca de su sueño registrado.
 */
export function extractDreamFromReport(rep: any): string | null {
  if (!rep) return null;
  // 1. Chequear datosGenerales
  const dg = rep.data?.datosGenerales || rep.datosGenerales;
  if (dg) {
    const dgDream = dg.metaSueno || dg.metaSueño;
    if (dgDream && typeof dgDream === 'string' && dgDream.trim().length > 3 && !dgDream.toLowerCase().includes('no informado')) {
      return dgDream.trim();
    }
  }
  // 2. Chequear docxText
  if (rep.docxText) {
    const d = extractDreamFromText(rep.docxText);
    if (d) return d;
  }
  // 3. Chequear textoBrutoOriginal
  const raw = rep.data?.textoBrutoOriginal || rep.textoBrutoOriginal;
  if (raw) {
    const d = extractDreamFromText(raw);
    if (d) return d;
  }
  // 4. Chequear secciones.metaAlcanzada
  const secciones = rep.data?.secciones || rep.secciones;
  if (secciones) {
    const metaSec = secciones.metaAlcanzada || secciones['1. ¿Ha alcanzado su meta o sueño 2026?'] || '';
    if (metaSec) {
      const d = extractDreamFromText(metaSec);
      if (d) return d;
    }
    for (const [k, v] of Object.entries(secciones)) {
      if (typeof v === 'string' && (k.toLowerCase().includes('meta') || k.toLowerCase().includes('sueno') || k.toLowerCase().includes('sueño'))) {
        const d = extractDreamFromText(v);
        if (d) return d;
      }
    }
  }
  return null;
}

export function buildFinalReportPrompt(options: FinalReportGeneratorOptions): string {
  const { jovenNombre, jovenTaller, pcp, facilitadorNombre, trimestral1, mensuales1 = [], trimestral2, mensuales2 = [], circuloApoyoPersonas, circuloApoyoParticipacion } = options;

  const grupoNombre = jovenTaller || 'Centro de Día';
  const pcpAnio = pcp?.anio || new Date().getFullYear().toString();
  const proximoAnio = String(Number(pcpAnio) + 1 || 2026);

  let pcpSuenos = '';
  if (Array.isArray(pcp?.perfil?.suenos) && pcp.perfil.suenos.filter(Boolean).length > 0) {
    pcpSuenos = pcp.perfil.suenos.filter(Boolean).join('; ');
  } else if (pcp?.metaSueño && pcp.metaSueño.trim()) {
    pcpSuenos = pcp.metaSueño.trim();
  } else if (pcp?.metaSueno && pcp.metaSueno.trim()) {
    pcpSuenos = pcp.metaSueno.trim();
  }

  // Si no está registrado en el perfil PCP, extraerlo y reconocerlo desde el Bloque 3 (o Bloque 1)
  if (!pcpSuenos || pcpSuenos.trim().length < 4 || pcpSuenos.toLowerCase().includes('no informado') || pcpSuenos.startsWith('Fortalecer su autonomía')) {
    const dreamFromBlock = extractDreamFromReport(trimestral2) || extractDreamFromReport(trimestral1);
    if (dreamFromBlock) {
      pcpSuenos = dreamFromBlock;
    } else {
      pcpSuenos = 'Fortalecer su autonomía, bienestar integral e inclusión social en los espacios grupales e institucionales';
    }
  }

  // 1. Insumo Trimestral 1 (Ene - Mar)
  let t1Text = '';
  if (trimestral1) {
    if (trimestral1.docxText && trimestral1.docxText.trim().length > 100) {
      t1Text = trimestral1.docxText.trim();
    } else if (trimestral1.data?.textoBrutoOriginal && trimestral1.data.textoBrutoOriginal.trim().length > 100) {
      t1Text = trimestral1.data.textoBrutoOriginal.trim();
    } else if (trimestral1.data?.secciones) {
      const partes: string[] = [];
      for (const [k, v] of Object.entries(trimestral1.data.secciones)) {
        if (v && typeof v === 'string' && v.trim()) {
          partes.push(`- ${k}: ${v.trim()}`);
        }
      }
      if (partes.length > 0) t1Text = partes.join('\n');
    }
  }
  if (!t1Text) t1Text = 'Línea de base formativa y actividades de verano del concurrente.';

  // 2. Insumo Mensuales 1 (Abr - Jun + Julio si existe)
  const hasJulio = mensuales1.some((f: any) => {
    const p = (f.data?.datosGenerales?.periodo || f.periodo || '').toLowerCase();
    return p.includes('07') || p.includes('julio');
  });
  let m1Text = `Cuadrículas y Observaciones de Abril, Mayo, Junio${hasJulio ? ' y Julio' : ''}:\n`;
  if (mensuales1.length > 0) {
    mensuales1.forEach((f: any, idx: number) => {
      const data = f.data || {};
      const per = data.datosGenerales?.periodo || f.periodo || `Mes ${idx + 1}`;
      const obs = data.observaciones || '';
      m1Text += `\n* Mes ${idx + 1} (${per}):\n`;
      if (obs) m1Text += `  Observaciones del facilitador: "${obs}"\n`;
      const talleres = data.talleres || [];
      talleres.forEach((t: any) => {
        const checked = (t.items || []).filter((it: any) => it.nivel && Number(it.nivel) >= 1);
        if (checked.length > 0) {
          m1Text += `  Taller ${t.nombre}: ${checked.map((it: any) => `${it.nombre} [Logro: ${describeNivelQualitative(it.nivel)}]`).join(', ')}\n`;
        }
      });
    });
  } else {
    m1Text += 'Proceso continuado en los talleres del Centro de Día.\n';
  }

  // 3. Insumo Trimestral 2 (Abr - Jun)
  let t2Text = '';
  if (trimestral2) {
    if (trimestral2.docxText && trimestral2.docxText.trim().length > 100) {
      t2Text = trimestral2.docxText.trim();
    } else if (trimestral2.data?.textoBrutoOriginal && trimestral2.data.textoBrutoOriginal.trim().length > 100) {
      t2Text = trimestral2.data.textoBrutoOriginal.trim();
    } else if (trimestral2.data?.secciones) {
      const partes: string[] = [];
      for (const [k, v] of Object.entries(trimestral2.data.secciones)) {
        if (v && typeof v === 'string' && v.trim()) {
          partes.push(`- ${k}: ${v.trim()}`);
        }
      }
      if (partes.length > 0) t2Text = partes.join('\n');
    }
  }
  if (!t2Text) t2Text = 'Consolidación del primer semestre en talleres institucionales.';

  // 4. Insumo Mensuales 2 (Ago - Sep)
  let m2Text = 'Cuadrículas y Observaciones de Agosto y Septiembre:\n';
  if (mensuales2.length > 0) {
    mensuales2.forEach((f: any, idx: number) => {
      const data = f.data || {};
      const per = data.datosGenerales?.periodo || f.periodo || `Mes ${idx + 1}`;
      const obs = data.observaciones || '';
      m2Text += `\n* Mes ${idx + 1} (${per}):\n`;
      if (obs) m2Text += `  Observaciones del facilitador: "${obs}"\n`;
      const talleres = data.talleres || [];
      talleres.forEach((t: any) => {
        const checked = (t.items || []).filter((it: any) => it.nivel && Number(it.nivel) >= 1);
        if (checked.length > 0) {
          m2Text += `  Taller ${t.nombre}: ${checked.map((it: any) => `${it.nombre} [Logro: ${describeNivelQualitative(it.nivel)}]`).join(', ')}\n`;
        }
      });
    });
  } else {
    m2Text += 'Avances en el segundo semestre del ciclo institucional.\n';
  }

  let exceptionPromptSection = '';
  if (options.isUnlockedException || options.missingBlocksNotice) {
    exceptionPromptSection = `\n\n⚠️ REGLA OBLIGATORIA DE EXCEPCIÓN INSTITUCIONAL / INSUMOS PARCIALES:
El presente informe se genera bajo una EXCEPCIÓN INDIVIDUAL DE DESBLOQUEO DE INSUMOS PARCIALES.
Motivo/Circunstancia: ${options.missingBlocksNotice || 'El/la concurrente no asistió o no contó con evaluaciones durante determinados meses del ciclo por razones justificadas o de salud.'}

INSTRUCCIÓN IMPERATIVA:
En el primer párrafo del apartado "objetivoProceso" (Parte 1) y en la "introduccion" (Parte 2), DEBES incluir una aclaración respetuosa, positiva e institucional informando que el presente Informe Final consolida el ciclo anual a partir de la información disponible y los períodos en los que el/la concurrente asistió y participó activamente en Andar.
`;
  }

  const allTallerNames: string[] = [];
  [...mensuales1, ...mensuales2].forEach((f: any) => {
    (f.data?.talleres || []).forEach((t: any) => {
      const name = (t.nombre || '').trim();
      if (name && !allTallerNames.includes(name)) {
        allTallerNames.push(name);
      }
    });
  });
  const hasCatering = allTallerNames.some(t => /catering|pasteler|cocina|gastronom|rotiser/i.test(t));

  let cateringProhibitionPrompt = '';
  if (!hasCatering) {
    cateringProhibitionPrompt = `\n\n⚠️ ¡PROHIBICIÓN TERMINANTE DE CATERING / PASTELERÍA / COCINA / GASTRONOMÍA!:
El/la concurrente NO asiste a talleres de catering, pastelería ni cocina industrial.
Sus talleres y áreas de desempeño reales evaluadas son exclusivamente: [${allTallerNames.length > 0 ? allTallerNames.join(', ') : grupoNombre}].
Queda TERMINANTEMENTE PROHIBIDO escribir las palabras "catering", "pastelería", "cocina", "gastronomía", "elaboración de alimentos", "recetas de pastelería" o "rotisería" en cualquier sección. Si algún informe anterior o borrador citó catering o pastelería por error, IGNÓRALO COMPLETAMENTE y céntrate en sus talleres reales y en la autonomía sociolaboral.\n`;
  }

  return `
# TAREA: GENERAR EL INFORME FINAL ANUAL Y PLAN DE ABORDAJE ${proximoAnio}
Concurrente: **${jovenNombre}**
Grupo/Taller: **${grupoNombre}**
Facilitador/a de referencia: **${facilitadorNombre || 'Equipo Técnico Institucional'}**
Proyecto de vida y metas (PCP): "${pcpSuenos}"
Círculo de apoyo: Participación ${circuloApoyoParticipacion || 'Sí'} - Integrantes: ${circuloApoyoPersonas || 'Familiares y facilitadores'}
${exceptionPromptSection}${cateringProhibitionPrompt}
## FUENTES DEL CICLO ANUAL (LOS 4 MOMENTOS)
### 1. TRIMESTRAL 1 (Enero, Febrero, Marzo) - Informe de Apertura / Verano:
${t1Text}

### 2. MENSUALES 1 (Abril, Mayo, Junio${hasJulio ? ' y Julio' : ''}) - Cuadrículas y Observaciones:
${m1Text}

### 3. TRIMESTRAL 2 (Abril, Mayo, Junio) - Consolidación del Primer Semestre:
${t2Text}

### 4. MENSUALES 2 (Agosto, Septiembre) - Continuidad, Natación, Talleres y Cierre:
${m2Text}

## INSTRUCCIONES ESPECÍFICAS DE GENERACIÓN Y EXPLAYAMIENTO:
1. **FIDELIDAD ESTRICTA A LA REALIDAD DEL JOVEN ("NO INVENTES NADA - USA TODA LA INFORMACIÓN DISPONIBLE")**:
   - Integra exhaustivamente los 4 momentos del año tal como ocurrieron, articulando toda la información empírica.
   - Si están presentes las evaluaciones del mes de Julio, articula sus observaciones (asistencia, autorregulación, talleres de invierno, expresión emocional o vínculos) dentro de la trayectoria del concurrente como puente hacia el segundo semestre.
   - Nombra las actividades y vivencias reales: talleres institucionales cursados, roles funcionales (como tareas auxiliares, de limpieza o asistencia), natación/pileta adaptada, festejos y efemérides (Primavera, Malvinas, Tierra, Autismo), cruces seguros y semáforos, salidas comunitarias, Kermés institucional, boliche CCP, eventos recreativos, uso de transporte urbano (colectivos, trenes), herramientas de orientación (GPS) y gestión de dinero (billeteras virtuales).
   - Si no hay registro de catering o cocina industrial, NO menciones catering ni pastelería. Céntrate estrictamente en sus talleres reales y autonomía sociolaboral.
2. **SECCIÓN 7: LOGROS DESTACADOS DEL CICLO ANUAL (EXPLAYAMIENTO EXTENSO, PROFUNDO Y CUALITATIVO)**:
   - Explayate ampliamente en cada una de las 4 áreas de logros ("practicas", "emocionalesSociales", "decisiones", "nuevasExperiencias").
   - Cada área DEBE contener 3 párrafos descriptivos y completos (separados por \\n\\n), articulando:
     * "practicas": Habilidades funcionales, rol en el taller y predio (tareas de mantenimiento, limpieza, acondicionamiento de espacios, asistencia a compañeros o materiales), manejo de pertenencias, AVD, autonomía en talleres reales (detallar talleres y destrezas explicando cualitativamente el grado de consolidación y autonomía, SIN escribir jamás "Nivel 1", "Nivel 2", "Nivel 3", "Nivel 4" ni hablar de "niveles"), movilidad urbana independiente, uso de celular responsable y tecnología (GPS, billeteras virtuales).
     * "emocionalesSociales": Expresión verbal y gestual, clima afectivo con pares, empatía y contención hacia otros concurrentes, autorregulación emocional ante desafíos o situaciones de estrés, lazos de confianza y respeto mutuo con facilitadores y equipo interdisciplinario.
     * "decisiones": Protagonismo y autodeterminación, elecciones cotidianas de talleres y tareas, acondicionamiento de espacios, preparación de colaciones o materiales, iniciativa propia en salidas y expresión libre de sus metas y deseos personales.
     * "nuevasExperiencias": Participación en salidas comunitarias, festejos institucionales (Kermés, Primavera), boliche CCP, actividades deportivas y caminatas saludables, evoluciones en pileta/natación (flotación, confianza acuática y desplazamientos adaptados) y representación grupal.
3. **NARRATIVA AMPLIA, PROFUNDA Y COMPLETA EN TODAS LAS SECCIONES DE LA PARTE 1 (CERO TEXTOS CORTOS)**:
   - "objetivoProceso": 2 párrafos completos y profundos (250-350 palabras en total) que articulen la trayectoria anual integral, su rol y aporte al grupo, la evolución de su autonomía y la alineación con su proyecto de vida (PCP).
   - "escuchaActiva": 2 párrafos descriptivos y detallados (200-300 palabras en total) sobre la expresión de sus elecciones, preferencias de talleres y actividades, autonomía funcional en la gestión de su rutina diaria y pertenencias, y su comunicación asertiva.
   - "estadoEmocional": 2 párrafos descriptivos y minuciosos (200-300 palabras en total) sobre la evolución de su bienestar anímico, expresión de emociones, estrategias de autorregulación ante imprevistos, relaciones de afecto y compañerismo con pares y facilitadores, y momentos de entusiasmo en propuestas compartidas.
   - "apoyosAjustes": 2 párrafos exhaustivos (200-300 palabras en total) detallando todos los apoyos y ajustes implementados: apoyos organizativos (rutinas visuales, cronogramas), apoyos verbales (anticipación, modelado entre pares), apoyos específicos interdisciplinarios (nutrición, controles de salud, tratamientos) y adecuaciones en actividades deportivas y salidas.
   - "suenosMetas": 2 párrafos extensos y motivadores articulando sus metas y sueños personales del PCP con las habilidades prácticas, organizativas y de autonomía desarrolladas en el Centro de Día, proyectando su continuidad.
   - "circuloApoyo": 2 párrafos completos valorando la articulación entre el equipo interdisciplinario de Andar, la familia (rutinas y hábitos en el hogar) y las redes comunitarias de soporte.
   - "proyecciones": 8 a 10 líneas de acción descriptivas, ricas y operativas para el próximo ciclo (cada ítem debe ser una directiva completa y detallada de 1-2 oraciones explicativas, no solo un título corto).
4. **ESCALA DE CALIDAD DE VIDA (8 DIMENSIONES DE SCHALOCK & VERDUGO)**:
   En "evaluacionDimensiones", incluye exactamente las 8 dimensiones con valoración ("✔" o "➖" o "❌") y un comentario sustancioso y descriptivo de 2 a 3 oraciones completas fundamentado en hechos reales del ciclo anual (nada de frases telegráficas de 1 oración):
   1. Bienestar Físico: Salud general, controles médicos periódicos, adherencia nutricional, hábitos higiénicos, deporte, caminatas y natación adaptada.
   2. Bienestar Emocional: Estado anímico habitual, tranquilidad, expresión adecuada de emociones, seguridad afectiva y estrategias de autorregulación.
   3. Bienestar Material (SITUACIÓN SOCIOECONÓMICA Y COBERTURA DE NECESIDADES BÁSICAS):
      ¡ATENCIÓN ESTRICTA!: Se refiere EXCLUSIVAMENTE a estabilidad habitacional y familiar, situación socioeconómica, cobertura de alimentación adecuada, vestimenta acorde, transporte/pases, pensión, CUD y cobertura médica/social.
      PROHIBICIÓN TERMINANTE de hablar de elementos de cocina, utensilios, herramientas o materiales de taller.
   4. Desarrollo Personal: Aprendizaje continuado en talleres, destrezas funcionales, competencias operativas y autogestión en la vida diaria.
   5. Relaciones Interpersonales: Lazos de compañerismo, interacción comunicativa respetuosa, empatía, reciprocidad, contención mutua y convivencia con pares y facilitadores.
   6. Inclusión Social: Participación activa en la comunidad (Kermés, boliche CCP, polideportivo, salidas comunitarias, paseos y festejos compartidos).
   7. Autodeterminación: Elección libre, toma de decisiones cotidianas sobre sus actividades y tiempos, manifestación de preferencias y metas de su PCP.
   8. Derechos: Dignidad, privacidad, trato igualitario como sujeto de pleno derecho y acceso efectivo a apoyos y ajustes razonables.
5. **PLAN DE ABORDAJE ${proximoAnio} (PARTE 2 - PERSONALIZADO, OPERATIVO Y DETALLADO)**:
   - "introduccion": Párrafo institucional metodológico adaptado a ${jovenNombre} (120-180 palabras).
   - "objetivoGeneral": Objetivo anual integrador, robusto y motivador para el ciclo ${proximoAnio}.
   - "objetivosEspecificos": 7 a 8 objetivos específicos personalizados, operativos y medibles (no genéricos), adaptados a las metas reales de la persona (ej. movilidad urbana autónoma, consolidación de tareas auxiliares/laborales, autocuidado nutricional, autodeterminación en la comunidad).
   - "lineasAccion": 6 áreas (autonomia, regulacionEmocional, habilidadesSociales, inclusionComunitaria, autodeterminacion, acompanamientoFamiliar) con 3 a 4 acciones concretas, detalladas y personalizadas en cada una (cada acción formulada con una oración completa y descriptiva).
   - "suenosMetas": 4 a 5 metas proyectadas concretas y medibles alineadas estrictamente a "${pcpSuenos}".
   - "indicadores": 8 indicadores observables basados en las 8 dimensiones de Schalock & Verdugo (bienestarFisico, bienestarEmocional, bienestarMaterial, desarrolloPersonal, relacionesInterpersonales, inclusionSocial, autodeterminacion, derechos).
   - "lineamientosFacilitador": 5 a 6 directivas de intervención concretas y prácticas para el facilitador de grupo y el equipo técnico.

## FORMATO DE SALIDA (JSON ESTRICTO):
Responde ÚNICAMENTE con un JSON válido con la siguiente estructura:
{
  "parte1_informeFinal": {
    "objetivoProceso": "Dos párrafos amplios y profundos (250-350 palabras, separados por \\n\\n) que sintetizan la trayectoria anual, metas del PCP, rol en el grupo y habilidades abordadas a lo largo del año.",
    "escuchaActiva": "Dos párrafos exhaustivos (200-300 palabras, separados por \\n\\n) sobre sus preferencias expresadas, escucha activa, autonomía funcional, movilidad y elecciones en salidas compartidas.",
    "estadoEmocional": "Dos párrafos detallados (200-300 palabras, separados por \\n\\n) sobre la evolución anímica, bienestar emocional, manejo de situaciones de malestar, autorregulación y momentos de entusiasmo.",
    "apoyosAjustes": "Dos párrafos minuciosos (200-300 palabras, separados por \\n\\n) detallando apoyos visuales, cronogramas, rutinas, acompañamientos verbales, apoyos nutricionales/médicos y adecuaciones físicas o comunicacionales implementadas.",
    "evaluacionDimensiones": [
      { "dimension": "Bienestar Físico", "valoracion": "✔", "comentario": "Comentario sustancial de 2-3 oraciones descriptivas sobre controles de salud, hábitos higiénicos, caminatas y natación adaptada." },
      { "dimension": "Bienestar Emocional", "valoracion": "✔", "comentario": "Comentario sustancial de 2-3 oraciones descriptivas sobre tranquilidad, autorregulación, bienestar anímico y expresión asertiva." },
      { "dimension": "Bienestar Material", "valoracion": "✔", "comentario": "Cuenta con adecuada cobertura integral de sus necesidades materiales básicas (alimentación, indumentaria, transporte regular y cobertura social), estabilidad habitacional y un entorno familiar contenedor que respalda su proyecto de vida." },
      { "dimension": "Desarrollo Personal", "valoracion": "✔", "comentario": "Comentario sustancial de 2-3 oraciones descriptivas sobre aprendizaje en talleres, competencias prácticas y resolución de tareas." },
      { "dimension": "Relaciones Interpersonales", "valoracion": "✔", "comentario": "Comentario sustancial de 2-3 oraciones descriptivas sobre compañerismo, empatía, apoyo mutuo y relación con facilitadores." },
      { "dimension": "Inclusión Social", "valoracion": "✔", "comentario": "Comentario sustancial de 2-3 oraciones descriptivas sobre salidas comunitarias, Kermés, boliche CCP y participación social." },
      { "dimension": "Autodeterminación", "valoracion": "✔", "comentario": "Comentario sustancial de 2-3 oraciones descriptivas sobre toma de decisiones cotidianas, manifestación de gustos y protagonismo en su PCP." },
      { "dimension": "Derechos", "valoracion": "✔", "comentario": "Comentario sustancial de 2-3 oraciones descriptivas sobre respeto pleno a su dignidad, privacidad, tiempos personales y acceso a apoyos." }
    ],
    "logros": {
      "practicas": "3 párrafos descriptivos y continuos (separados por \\n\\n) detallando el desempeño en talleres reales cursados, rol en el predio/taller, tareas de mantenimiento/limpieza o auxilio, manejo de pertenencias, orientación urbana, uso de GPS y billeteras virtuales, explicando cualitativamente el grado de afianzamiento y autonomía (PROHIBICIÓN ESTRICTA: jamás escribir 'Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4' ni hablar de 'niveles'). NO incluir etiquetas como 'Párrafo 1:'.",
      "emocionalesSociales": "3 párrafos descriptivos y continuos (separados por \\n\\n) sobre la evolución anímica, expresión verbal y gestual, asertividad, vínculos afectivos con pares, clima de compañerismo, contención a otros y autorregulación emocional. NO incluir etiquetas como 'Párrafo 1:'.",
      "decisiones": "3 párrafos descriptivos y continuos (separados por \\n\\n) sobre el ejercicio de la autodeterminación, protagonismo en actividades, elecciones cotidianas en talleres, preparación de espacios o colaciones, e iniciativa propia. NO incluir etiquetas como 'Párrafo 1:'.",
      "nuevasExperiencias": "3 párrafos descriptivos y continuos (separados por \\n\\n) sobre la participación en vivencias comunitarias (Kermés, boliche CCP, festejos institucionales), desempeño en natación/pileta adaptada, caminatas saludables, salidas recreativas y representación en la comunidad. NO incluir etiquetas como 'Párrafo 1:'."
    },
    "suenosMetas": "Dos párrafos extensos (separados por \\n\\n) sobre la proyección de sus metas personales y sueños del PCP, herramientas afianzadas y horizonte de desarrollo independiente.",
    "circuloApoyo": "Dos párrafos detallados (separados por \\n\\n) valorando la articulación interdisciplinaria entre el Centro de Día, la familia (rutinas y cuidados en el hogar) y las redes afectivas de soporte.",
    "proyecciones": [
      "8 a 10 líneas de acción descriptivas y operativas, cada una con una formulación completa y explicativa de 1 a 2 oraciones."
    ]
  },
  "parte2_planAbordaje": {
    "anio": "${proximoAnio}",
    "introduccion": "Párrafo metodológico institucional adaptado a ${jovenNombre} (120-180 palabras).",
    "objetivoGeneral": "Objetivo anual integrador, robusto y motivador para ${proximoAnio}.",
    "objetivosEspecificos": [
      "7 a 8 objetivos específicos personalizados, operativos y medibles para el próximo ciclo."
    ],
    "lineasAccion": {
      "autonomia": [
        "3 a 4 acciones concretas y descriptivas de autonomía en la vida diaria."
      ],
      "regulacionEmocional": [
        "3 a 4 acciones concretas y descriptivas de regulación emocional y bienestar subjetivo."
      ],
      "habilidadesSociales": [
        "3 a 4 acciones concretas y descriptivas de habilidades sociales y relaciones interpersonales."
      ],
      "inclusionComunitaria": [
        "3 a 4 acciones concretas y descriptivas de inclusión comunitaria y participación social."
      ],
      "autodeterminacion": [
        "3 a 4 acciones concretas y descriptivas de autodeterminación y toma de decisiones."
      ],
      "acompanamientoFamiliar": [
        "3 a 4 acciones concretas y descriptivas de acompañamiento familiar y trabajo conjunto."
      ]
    },
    "suenosMetas": [
      "4 a 5 metas proyectadas concretas alineadas a sus sueños del PCP."
    ],
    "indicadores": {
      "bienestarFisico": "Indicador observable y medible de bienestar físico.",
      "bienestarEmocional": "Indicador observable y medible de bienestar emocional.",
      "bienestarMaterial": "Indicador observable y medible de bienestar material (necesidades básicas, transporte, recursos indispensables).",
      "desarrolloPersonal": "Indicador observable y medible de desarrollo personal y habilidades prácticas.",
      "relacionesInterpersonales": "Indicador observable y medible de relaciones interpersonales y compañerismo.",
      "inclusionSocial": "Indicador observable y medible de inclusión social y comunitaria.",
      "autodeterminacion": "Indicador observable y medible de autodeterminación e iniciativa.",
      "derechos": "Indicador observable y medible de derechos y accesibilidad a apoyos."
    },
    "lineamientosFacilitador": [
      "5 a 6 directivas de intervención claras, prácticas y metodológicas para el equipo de facilitadores."
    ]
  }
}
`;
}

function generateDeterministicFinalFallback(options: FinalReportGeneratorOptions): FinalReportGeneratedStructure {
  const { jovenNombre, jovenTaller, pcp } = options;
  const grupoNombre = jovenTaller || 'Centro de Día';
  const pcpAnio = pcp?.anio || new Date().getFullYear().toString();
  const proximoAnio = String(Number(pcpAnio) + 1 || 2026);
  const detectedDreamFallback = extractDreamFromReport(options.trimestral2) || extractDreamFromReport(options.trimestral1);
  const pcpSuenos = Array.isArray(pcp?.perfil?.suenos) && pcp.perfil.suenos.filter(Boolean).length > 0
    ? pcp.perfil.suenos.filter(Boolean).join('; ')
    : (pcp?.metaSueño || pcp?.metaSueno || detectedDreamFallback || 'Desarrollar su autonomía personal, bienestar integral e inclusión social');

  return {
    parte1_informeFinal: {
      objetivoProceso: `A lo largo del ciclo institucional, con ${jovenNombre} se trabaja de manera continua en el desarrollo de habilidades vinculadas al aprendizaje a lo largo de la vida, la comunicación funcional y la participación activa en propuestas de ${grupoNombre}. Se enfatiza en fortalecer habilidades sociales, la convivencia grupal y la resolución de actividades cotidianas, orientadas a promover su autonomía y desarrollo personal.`,
      escuchaActiva: `Sostiene y manifiesta con claridad sus intereses personales y metas para su vida cotidiana ("${pcpSuenos}"). Pone en práctica habilidades vinculadas a la planificación, la seguridad en los desplazamientos y la elección de actividades que disfruta compartir, demostrando iniciativa y consolidando su capacidad de autodeterminación.`,
      estadoEmocional: `Mantiene una actitud alegre y predispuesta en los espacios compartidos, participando activamente en las dinámicas colectivas. Reconoce y expresa sus emociones en un entorno de confianza, recibiendo apoyos oportunos y contención cuando lo requiere, lo que favorece su bienestar anímico y su seguridad personal.`,
      apoyosAjustes: `Cuenta con apoyos visuales, cronogramas y herramientas organizativas que facilitan la anticipación y la estructuración de su jornada. En el plano comunicacional, se emplean pautas claras y un acompañamiento cercano y respetuoso que estimula su protagonismo y autorregulación.`,
      evaluacionDimensiones: [
        { dimension: 'Bienestar Físico', valoracion: '✔', comentario: 'Participa con regularidad en propuestas de actividad física y rutinas saludables.' },
        { dimension: 'Bienestar Emocional', valoracion: '✔', comentario: 'Reconoce y manifiesta sus emociones en un marco de confianza.' },
        { dimension: 'Bienestar Material', valoracion: '✔', comentario: 'Cuenta con adecuada cobertura de necesidades materiales básicas, acceso regular a traslados y estabilidad en su entorno familiar.' },
        { dimension: 'Desarrollo Personal', valoracion: '✔', comentario: 'Adquiere destrezas prácticas y funcionales que enriquecen su autonomía.' },
        { dimension: 'Relaciones Interpersonales', valoracion: '✔', comentario: 'Afianza lazos de compañerismo y comunicación positiva con sus pares.' },
        { dimension: 'Inclusión Social', valoracion: '✔', comentario: 'Forma parte de eventos institucionales, festejos y salidas comunitarias.' },
        { dimension: 'Autodeterminación', valoracion: '✔', comentario: 'Expresa sus preferencias y toma decisiones en actividades cotidianas.' },
        { dimension: 'Derechos', valoracion: '➖', comentario: 'Se respeta su espacio personal, elecciones y acceso a apoyos necesarios.' }
      ],
      logros: {
        practicas: `Se involucra activamente en tareas funcionales, el cuidado y organización de los materiales de taller, y la adquisición de hábitos de vida independiente dentro de la institución y en su entorno cotidiano.`,
        emocionalesSociales: `Expresa con solvencia sus estados de ánimo, fortaleciendo el círculo de confianza con sus pares y facilitadores, logrando una comunicación asertiva y una convivencia armoniosa.`,
        decisiones: `Participa con criterio en la selección de alternativas, manifestando qué actividades desea realizar y colaborando activamente en la preparación y acondicionamiento de espacios colectivos.`,
        nuevasExperiencias: `Forma parte con agrado de festejos institucionales, jornadas recreativas y actividades al aire libre, aprovechando con entusiasmo las oportunidades de participación comunitaria y deportiva.`
      },
      suenosMetas: `Continúa avanzando con entusiasmo hacia sus sueños personales ("${pcpSuenos}"), fortaleciendo las herramientas prácticas y sociales necesarias para su concreción con el respaldo de Granja Andar.`,
      circuloApoyo: `La articulación entre el equipo institucional y su círculo familiar se mantiene cercana y colaborativa, brindando un marco de contención, seguimiento y motivación constante para favorecer su autonomía.`,
      proyecciones: [
        'Fortalecer la comunicación y articulación con el círculo familiar',
        'Promover la autonomía en actividades de la vida diaria',
        'Potenciar estrategias de autorregulación y bienestar emocional',
        'Fomentar la participación en propuestas comunitarias e inclusivas',
        'Desarrollar habilidades sociales y resolución cooperativa de tareas',
        'Estimular la toma de decisiones y la autodeterminación en espacios cotidianos'
      ]
    },
    parte2_planAbordaje: {
      anio: proximoAnio,
      introduccion: `Este plan se ha elaborado con el objetivo de mejorar el acceso de ${jovenNombre} a los apoyos y servicios necesarios para incrementar su calidad de vida. Se integran las fortalezas, rutinas, redes de apoyo, sueños y metas consolidados durante el ciclo institucional para orientar las acciones del próximo período.`,
      objetivoGeneral: `Fortalecer la autonomía, autodeterminación e inclusión social de ${jovenNombre}, consolidando los aprendizajes adquiridos y ampliando sus oportunidades de participación comunitaria, recreativa y cultural, con el acompañamiento del equipo interdisciplinario.`,
      objetivosEspecificos: [
        'Potenciar habilidades de la vida diaria, afianzando rutinas de organización personal.',
        'Promover la autorregulación emocional y la comunicación de sentimientos.',
        'Favorecer el desarrollo de habilidades sociales y la convivencia respetuosa con pares.',
        'Sostener el protagonismo en la toma de decisiones cotidianas.',
        'Ampliar la participación en actividades recreativas, culturales y deportivas comunitarias.',
        'Acompañar sus sueños y metas como eje central de su proyecto de vida.'
      ],
      lineasAccion: {
        autonomia: [
          'Planificación visual de responsabilidades y actividades del taller.',
          'Cuidado ordenado de pertenencias y colaboración en espacios comunes.',
          'Prácticas de desplazamiento seguro e independencia cotidiana.'
        ],
        regulacionEmocional: [
          'Uso de recursos gráficos para identificar emociones.',
          'Espacios semanales de escucha y diálogo grupal.',
          'Estrategias de autocuidado y pausas de relajación.'
        ],
        habilidadesSociales: [
          'Instancias de interacción lúdica y almuerzos compartidos con compañeras.',
          'Afianzamiento de turnos de palabra y expresión asertiva.',
          'Fortalecimiento de la empatía y la colaboración en tareas colectivas.'
        ],
        inclusionComunitaria: [
          'Salidas culturales, deportivas y visitas a espacios comunitarios.',
          'Prácticas de seguridad vial y movilidad.',
          'Participación protagónica en festejos y eventos de Granja Andar.'
        ],
        autodeterminacion: [
          'Elección directa de actividades de ocio y formación de su interés.',
          'Iniciativa en la resolución de tareas sin dependencia de indicaciones.',
          'Planificación personal de pequeñas metas semanales.'
        ],
        acompanamientoFamiliar: [
          'Encuentros periódicos de articulación familia-equipo.',
          'Coherencia en las pautas de autonomía en el hogar y en la institución.',
          'Acompañamiento respetuoso de sus tiempos y proyectos.'
        ]
      },
      suenosMetas: [
        'Avanzar en pasos concretos hacia sus metas personales y proyecto de vida.',
        'Disfrutar de nuevas experiencias recreativas y comunitarias.',
        'Afianzar destrezas personales que refuercen su confianza y bienestar.'
      ],
      indicadores: {
        bienestarFisico: 'Participación regular en actividades motrices y deportivas.',
        bienestarEmocional: 'Expresión y autorregulación de emociones con apoyos adaptados.',
        bienestarMaterial: 'Cobertura adecuada de necesidades materiales básicas, estabilidad habitacional y recursos indispensables para su vida diaria.',
        desarrolloPersonal: 'Consolidación de destrezas prácticas y autonomía cotidiana.',
        relacionesInterpersonales: 'Vínculos de respeto, compañerismo y escucha mutua.',
        inclusionSocial: 'Presencia activa en eventos y salidas comunitarias.',
        autodeterminacion: 'Frecuencia de elecciones autónomas en sus rutinas.',
        derechos: 'Reconocimiento y ejercicio pleno de sus decisiones y derechos.'
      },
      lineamientosFacilitador: [
        'Brindar apoyos visuales y comunicacionales claros que fomenten la autonomía.',
        'Respetar los tiempos del joven, transmitiendo seguridad y confianza.',
        'Habilitar opciones de elección para potenciar su autodeterminación.',
        'Mantener una articulación constante y positiva con la familia.',
        'Ofrecer contención empática y validar sus emociones en todo momento.'
      ]
    },
    secciones: {
      metaAlcanzada: `A lo largo del ciclo anual, ${jovenNombre} consolida avances significativos hacia sus metas personales: "${pcpSuenos}". En ${grupoNombre} pone en práctica habilidades funcionales y de convivencia que fortalecen su proyecto de vida y autonomía.`,
      participacion: `Sostiene una asistencia regular y una participación activa en las propuestas de ${grupoNombre}, respondiendo positivamente a las orientaciones y apoyos formativos requeridos en cada actividad.`,
      integracionRelaciones: `Afianza lazos de compañerismo, respeto y empatía con sus pares y el equipo facilitador, integrándose armoniosamente en las dinámicas grupales y espacios compartidos.`,
      actividadesRelacionadas: `En sus talleres formativos consolida destrezas prácticas, técnicas operativas y competencias sociolaborales, aplicando estrategias de trabajo y hábitos de cuidado con progresiva solvencia.`,
      vidaIndependiente: `En el ámbito de la autonomía y vida independiente, consolida hábitos de orden de pertenencias y cuidado de los espacios comunes, asumiendo responsabilidades con madurez y apoyos puntuales.`,
      habilidadesViajar: `Se desenvuelve con seguridad y confianza en desplazamientos dentro de la institución y en actividades al aire libre, respetando normas de convivencia y disfrutando del entorno comunitario.`,
      desarrolloPersonal: `Evidencia una notable capacidad de aprendizaje, concentración y superación ante desafíos, incorporando favorablemente sugerencias y estrategias de autorregulación.`,
      metasDeportivas: `Participa con agrado en propuestas de actividad física adaptada, elongación y rutinas saludables, favoreciendo su bienestar corporal y el compañerismo lúdico.`,
      metasSociales: `Forma parte activa de celebraciones institucionales, cumpleaños temáticos y eventos compartidos, expresando entusiasmo y sentido de pertenencia en espacios de inclusión comunitaria.`,
      dimensionesCalidadVida: `Se fortalecen integralmente las dimensiones de bienestar emocional, autodeterminación e inclusión social mediante espacios de escucha, diálogo y contención afectiva.`,
      actividadesComplementarias: `Disfruta de propuestas artísticas, recreativas y de estímulo creativo compartidas con el grupo, que enriquecen su jornada cotidiana.`,
      mejoraCalidadVida: `El balance anual refleja una evolución sumamente favorable en el bienestar anímico, la autonomía y la calidad de vida, consolidando estrategias y apoyos para continuar avanzando en el próximo período con el respaldo de Granja Andar.`
    }
  };
}
