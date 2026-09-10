import OpenAI from 'openai';

interface FinalReportGeneratorOptions {
  jovenNombre: string;
  jovenTaller?: string;
  pcp: any;
  facilitadorNombre?: string;
  trimestral1?: { id?: number; periodo: string; data: any } | null;
  mensuales1?: any[];
  trimestral2?: { id?: number; periodo: string; data: any } | null;
  mensuales2?: any[];
}

export async function generateFinalReportNarrative(options: FinalReportGeneratorOptions): Promise<Record<string, string>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OPENAI_API_KEY no configurado, utilizando fallback determinístico para informe final.');
    return cleanPositiveNarrative(generateDeterministicFinalFallback(options));
  }

  try {
    const client = new OpenAI({ apiKey });
    const prompt = buildFinalReportPrompt(options);

    const response = await client.chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-4o',
      temperature: Number(process.env.LLM_TEMPERATURE ?? 0.35),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Eres un profesional de máxima jerarquía técnica en la Asociación Civil Granja Andar, especializado en la elaboración de Informes Evolutivos Finales Anuales bajo el modelo de Planificación Centrada en la Persona (PCP) y Calidad de Vida. Tu objetivo es redactar un documento anual integrador y longitudinal que resuma la evolución integral del concurrente a lo largo de todo el ciclo institucional (integrando el 1er Trimestre Ene-Mar, Cuadrículas Abr-Jun, 2do Trimestre Abr-Jun y Cuadrículas Ago-Sep).

DIRECTIVAS ESTRICTAS DE ESTILO INSTITUCIONAL:
1) PROHIBICIÓN TERMINANTE DE TÉRMINOS PEDAGÓGICOS O EDUCATIVO-TERAPÉUTICOS:
   Granja Andar es un Centro de Día y espacio de formación sociolaboral y ocupacional, NO un Centro Educativo Terapéutico (CET) ni una escuela.
   QUEDA TERMINANTEMENTE PROHIBIDO usar palabras como: "pedagogía", "pedagógico", "pedagógica", "pedagógicos", "pedagógicas", "psicopedagógico", "educativo terapéutico", "CET", "malla curricular", "contenidos pedagógicos", "alumno", "alumna", "estudiante", "docente", "profesor", "maestro".
   Utiliza exclusivamente: "concurrente", "joven", "persona", "facilitador/a", "equipo facilitador", "apoyos formativos/sociolaborales", "propuestas ocupacionales", "talleres", "Centro de Día".
2) VARIABILIDAD AL REFERIRSE AL CONCURRENTE (PROHIBIDO REPETIR EL NOMBRE COMPLETO EN CADA PUNTO):
   No comiences cada una de las 12 secciones repitiendo el nombre completo del joven. Alterna de manera fluida y humana:
   - Sujeto tácito ("Sostiene...", "Demuestra...", "Participa...", "Afianza...").
   - Primer nombre de pila únicamente de forma esporádica.
   - Términos como "el concurrente", "la joven", "el joven", "él", "ella".
   - Inicios contextuales centrados en el área o dinámica ("En el espacio formativo...", "En cuanto a sus rutinas...", "Durante los talleres...").
   El nombre completo solo debe figurar al inicio de la primera sección o en la conclusión general.
3) TIEMPO PRESENTE ESTRICTO:
   Toda tu redacción debe estar expresada estrictamente en tiempo PRESENTE (ej: "asiste", "participa", "colabora", "consolida").
4) TONO 100% POSITIVO:
   Queda TERMINANTEMENTE PROHIBIDO usar frases de carencia o falta de datos ("no se registraron", "sin datos"). Siempre redactar en positivo indicando continuidad y avance activo.
5) FORMATO JSON:
   Responde estrictamente con un JSON con las 12 secciones institucionales oficiales.`
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
    return cleanPositiveNarrative(parsed, options.jovenNombre);
  } catch (error) {
    console.error('Error llamando a OpenAI para narrativa de informe final:', error);
    return cleanPositiveNarrative(generateDeterministicFinalFallback(options), options.jovenNombre);
  }
}

function cleanPositiveNarrative(obj: any, jovenNombre?: string): Record<string, string> {
  if (!obj || typeof obj !== 'object') return {};
  const result: Record<string, string> = {};

  const nameTrimmed = (jovenNombre || '').trim();
  const fullNamePattern = nameTrimmed.length > 2
    ? new RegExp(`^\\s*${nameTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[,\\s]+`, 'i')
    : null;

  let sectionIndex = 0;
  for (const [k, v] of Object.entries(obj)) {
    sectionIndex++;
    if (typeof v === 'string') {
      let cleaned = v;
      // 1. Frases negativas / falta de datos
      cleaned = cleaned.replace(/aunque no se registran? [^,.]+[,.]?/gi, '');
      cleaned = cleaned.replace(/a pesar de no contar con registros? [^,.]+[,.]?/gi, '');
      cleaned = cleaned.replace(/no se registran? datos específicos [^,.]+[,.]?/gi, 'se continúa trabajando activamente en esta área.');
      cleaned = cleaned.replace(/no se registran? salidas específicas[,.]?/gi, 'se continúa disfrutando de las actividades al aire libre dentro del predio institucional,');
      cleaned = cleaned.replace(/no se registran? [^,.]+ durante el ciclo[,.]?/gi, 'se continúa trabajando y avanzando con el acompañamiento de los facilitadores.');
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

      // 3. Variación de sujeto: evitar que cada punto comience repitiendo el nombre completo
      if (fullNamePattern && sectionIndex > 1 && fullNamePattern.test(cleaned)) {
        cleaned = cleaned.replace(fullNamePattern, '');
        cleaned = cleaned.trim();
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }

      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      result[k] = cleaned;
    } else {
      result[k] = String(v || '');
    }
  }
  return result;
}

function buildFinalReportPrompt(options: FinalReportGeneratorOptions): string {
  const { jovenNombre, jovenTaller, pcp, facilitadorNombre, trimestral1, mensuales1 = [], trimestral2, mensuales2 = [] } = options;

  const grupoNombre = jovenTaller || 'Centro de Día';
  const pcpAnio = pcp?.anio || new Date().getFullYear().toString();

  // Sueños y capacidades
  let pcpSuenos = '';
  if (Array.isArray(pcp?.perfil?.suenos) && pcp.perfil.suenos.filter(Boolean).length > 0) {
    pcpSuenos = pcp.perfil.suenos.filter(Boolean).join('; ');
  } else if (pcp?.metaSueño && pcp.metaSueño.trim()) {
    pcpSuenos = pcp.metaSueño.trim();
  } else {
    pcpSuenos = 'Fortalecer su autonomía, bienestar integral y participación activa en los espacios grupales e institucionales';
  }

  // 1. Insumo Trimestral 1 (Ene - Mar)
  let t1Text = 'No provisto en este momento (se continúa la línea base formativa del concurrente).';
  if (trimestral1 && trimestral1.data) {
    const d = trimestral1.data;
    const sec = d.secciones || {};
    const partes: string[] = [];
    for (const [k, v] of Object.entries(sec)) {
      if (v && typeof v === 'string' && v.trim()) {
        partes.push(`- ${k}: ${v.trim()}`);
      }
    }
    if (partes.length > 0) {
      t1Text = partes.join('\n');
    } else if (d.textoBrutoOriginal) {
      t1Text = d.textoBrutoOriginal.substring(0, 3000);
    }
  }

  // 2. Insumo Mensuales 1 (Abr - Jun)
  let m1Text = 'Cuadrículas de Abril, Mayo y Junio:\n';
  if (mensuales1.length > 0) {
    mensuales1.forEach((f: any, idx: number) => {
      const data = f.data || {};
      const per = data.datosGenerales?.periodo || f.periodo || `Mes ${idx + 1}`;
      const obs = data.observaciones || '';
      m1Text += `* Período ${per}: Observaciones: "${obs}"\n`;
      const talleres = data.talleres || [];
      talleres.forEach((t: any) => {
        const checked = (t.items || []).filter((it: any) => it.nivel && Number(it.nivel) >= 2);
        if (checked.length > 0) {
          m1Text += `  Taller ${t.nombre}: ${checked.map((it: any) => it.nombre).join(', ')}\n`;
        }
      });
    });
  } else {
    m1Text += 'Proceso continuado en los talleres formativos del grupo.\n';
  }

  // 3. Insumo Trimestral 2 (Abr - Jun)
  let t2Text = 'No provisto en este momento (se consolida a partir de las observaciones mensuales).';
  if (trimestral2 && trimestral2.data) {
    const d = trimestral2.data;
    const sec = d.secciones || {};
    const partes: string[] = [];
    for (const [k, v] of Object.entries(sec)) {
      if (v && typeof v === 'string' && v.trim()) {
        partes.push(`- ${k}: ${v.trim()}`);
      }
    }
    if (partes.length > 0) {
      t2Text = partes.join('\n');
    } else if (d.textoBrutoOriginal) {
      t2Text = d.textoBrutoOriginal.substring(0, 3000);
    }
  }

  // 4. Insumo Mensuales 2 (Ago - Sep)
  let m2Text = 'Cuadrículas de Agosto y Septiembre:\n';
  if (mensuales2.length > 0) {
    mensuales2.forEach((f: any, idx: number) => {
      const data = f.data || {};
      const per = data.datosGenerales?.periodo || f.periodo || `Mes ${idx + 1}`;
      const obs = data.observaciones || '';
      m2Text += `* Período ${per}: Observaciones: "${obs}"\n`;
      const talleres = data.talleres || [];
      talleres.forEach((t: any) => {
        const checked = (t.items || []).filter((it: any) => it.nivel && Number(it.nivel) >= 2);
        if (checked.length > 0) {
          m2Text += `  Taller ${t.nombre}: ${checked.map((it: any) => it.nombre).join(', ')}\n`;
        }
      });
    });
  } else {
    m2Text += 'Avances continuos en el segundo semestre del ciclo institucional.\n';
  }

  return `
# TAREA: Generar el INFORME FINAL ANUAL Consolidado

Debes redactar una narrativa integradora de balance anual para el concurrente **${jovenNombre}**, perteneciente al grupo **${grupoNombre}**.
Facilitador/a responsable: **${facilitadorNombre || 'Equipo Técnico Institucional'}**.
Meta y Proyecto de Vida (PCP ${pcpAnio}): "${pcpSuenos}".

## FUENTES DEL CICLO ANUAL
El informe final es la sumatoria e integración longitudinal de los 4 momentos del año:

### 1. TRIMESTRAL 1 (Enero, Febrero, Marzo) - Informe de Apertura:
${t1Text}

### 2. MENSUALES 1 (Abril, Mayo, Junio) - Evaluaciones y Cuadrículas:
${m1Text}

### 3. TRIMESTRAL 2 (Abril, Mayo, Junio) - Consolidación del Primer Semestre:
${t2Text}

### 4. MENSUALES 2 (Agosto, Septiembre) - Continuidad y Cierre del Ciclo:
${m2Text}

## DIRECTIVAS PARA LA SÍNTESIS ANUAL
1. **VISIÓN LONGITUDINAL INTEGRAL**: Cada sección debe reflejar la evolución sostenida a lo largo del año: cómo inició el joven sus propuestas en los primeros meses, cómo afianzó sus habilidades y relaciones durante el segundo trimestre y de qué forma consolida sus aprendizajes e independencia en la etapa de cierre.
2. **FIDELIDAD ABSOLUTA**: Utiliza las situaciones, anécdotas, recetas, productos y observaciones registradas en los 4 insumos.
3. **TIEMPO PRESENTE Y TONO POSITIVO**: Toda la redacción debe estar en tiempo presente, transmitiendo calidez, respeto y dignidad en el marco de la Planificación Centrada en la Persona.
4. **ESTILO NARRATIVO**: Redacta párrafos estructurados de 4 a 6 líneas por sección, sin viñetas.
5. **VARIABILIDAD AL NOMBRAR A LA PERSONA (PROHIBIDO REPETIR EL NOMBRE COMPLETO EN CADA PUNTO)**: No comiences cada sección con el nombre completo de ${jovenNombre}. Alterna de forma natural: sujeto tácito ("Sostiene...", "Participa...", "Demuestra..."), primer nombre de pila de forma ocasional, o términos como "el concurrente", "la joven", "el joven".
6. **PROHIBIDO USAR TÉRMINOS PEDAGÓGICOS O EDUCATIVO-TERAPÉUTICOS**: Granja Andar es un Centro de Día y espacio de inclusión sociolaboral/ocupacional. PROHIBIDO usar "pedagogía", "pedagógico/a", "CET", "alumno/a", "docente", "profesor". Usa "apoyos formativos/sociolaborales", "talleres", "concurrente", "facilitador/a".

## FORMATO DE SALIDA (JSON ESTRICTO)
Responde con un objeto JSON con las siguientes 12 claves oficiales:
{
  "metaAlcanzada": "Síntesis anual de cómo la persona ha alcanzado y consolidado sus metas y sueños (${pcpSuenos}), vinculándolas con sus roles y aprendizajes en ${grupoNombre}.",
  "participacion": "Balance de su asistencia, compromiso, regularidad y adaptación a lo largo de todo el ciclo en ${grupoNombre}, reconociendo los apoyos formativos brindados por el equipo facilitador.",
  "integracionRelaciones": "Evolución de sus vínculos afectivos, comunicación y convivencia con pares y facilitadores a lo largo de las distintas etapas del año.",
  "actividadesRelacionadas": "Consolidación de las destrezas, técnicas, recetas o proyectos específicos desarrollados en los talleres formativos institucionales.",
  "vidaIndependiente": "Avances acumulados en autonomía funcional, rutinas de cuidado e higiene personal, orden, cuidado de espacios y aplicación de Buenas Prácticas.",
  "habilidadesViajar": "Desplazamientos, salidas comunitarias, logística, paseos o actividades exteriores realizadas a lo largo del año según su nivel de autonomía.",
  "desarrolloPersonal": "Crecimiento personal, capacidad de concentración, motricidad, resolución de desafíos y receptividad ante sugerencias para superarse.",
  "metasDeportivas": "Participación en actividades físicas, deportes adaptados y hábitos saludables sostenidos durante los períodos.",
  "metasSociales": "Participación en celebraciones, cumpleaños, eventos comunitarios y jornadas colectivas compartidas en la institución.",
  "dimensionesCalidadVida": "Fortalecimiento del bienestar emocional, autodeterminación, escucha activa y contención afectiva durante el ciclo.",
  "actividadesComplementarias": "Participación y disfrute en talleres expresivos, artísticos, recreativos, de huerta o música.",
  "mejoraCalidadVida": "Conclusión integradora anual que refleja el impacto positivo del acompañamiento institucional, su salud integral y las proyecciones para el próximo período."
}
`;
}

function generateDeterministicFinalFallback(options: FinalReportGeneratorOptions): Record<string, string> {
  const { jovenNombre, jovenTaller, pcp, trimestral1, trimestral2, mensuales1 = [], mensuales2 = [] } = options;
  const grupoNombre = jovenTaller || 'Centro de Día';
  const pcpSuenos = Array.isArray(pcp?.perfil?.suenos) ? pcp.perfil.suenos.filter(Boolean).join('; ') : 'Avanzar en su proyecto de vida y autonomía personal';

  // Extraer textos de trimestrales si existen
  const t1Sec = trimestral1?.data?.secciones || {};
  const t2Sec = trimestral2?.data?.secciones || {};

  const combineSection = (key: string, defaultText: string) => {
    const p1 = t1Sec[key] || '';
    const p2 = t2Sec[key] || '';
    if (p1 && p2 && p1 !== p2) {
      return `${p1} A lo largo del ciclo, ${p2.toLowerCase()}`;
    }
    return p2 || p1 || defaultText;
  };

  return {
    metaAlcanzada: combineSection('metaAlcanzada', `A lo largo de todo el ciclo anual, ${jovenNombre} demuestra una evolución constante hacia sus metas y sueños personales: "${pcpSuenos}". Su participación en ${grupoNombre} consolida habilidades prácticas y de convivencia que fortalecen su proyecto de vida.`),
    participacion: combineSection('participacion', `Sostiene una asistencia regular y una actitud comprometida en las actividades de ${grupoNombre}, respondiendo con entusiasmo a las orientaciones y apoyos formativos brindados por el equipo institucional.`),
    integracionRelaciones: combineSection('integracionRelaciones', `Durante todo el período, afianza lazos de compañerismo, respeto y afecto mutuo tanto con sus pares como con los facilitadores, integrándose armoniosamente en las dinámicas de convivencia grupal.`),
    actividadesRelacionadas: combineSection('actividadesRelacionadas', `En sus talleres formativos consolida técnicas, destrezas prácticas y competencias sociolaborales, mostrando constancia y dedicación en cada propuesta desarrollada en la institución.`),
    vidaIndependiente: combineSection('vidaIndependiente', `En el ámbito de la autonomía y vida independiente, consolida hábitos de orden de pertenencias y cuidado de los espacios comunes, asumiendo responsabilidades con madurez.`),
    habilidadesViajar: combineSection('habilidadesViajar', `Se desenvuelve con seguridad y confianza en desplazamientos dentro de la institución y en actividades al aire libre, respetando normas de convivencia y disfrutando del entorno comunitario.`),
    desarrolloPersonal: combineSection('desarrolloPersonal', `Evidencia una notable capacidad de aprendizaje, concentración y superación ante nuevos desafíos, incorporando favorablemente las sugerencias del equipo técnico.`),
    metasDeportivas: combineSection('metasDeportivas', `Participa con agrado en propuestas de actividad física adaptada, elongación y rutinas saludables, favoreciendo su bienestar corporal y el compañerismo lúdico.`),
    metasSociales: combineSection('metasSociales', `Forma parte activa de celebraciones institucionales, cumpleaños temáticos y eventos compartidos, expresando alegría y sentido de pertenencia en su grupo.`),
    dimensionesCalidadVida: combineSection('dimensionesCalidadVida', `Se fortalecen integralmente las dimensiones de bienestar emocional, autodeterminación e inclusión social mediante espacios de escucha, diálogo y contención afectiva.`),
    actividadesComplementarias: combineSection('actividadesComplementarias', `Disfruta de propuestas artísticas, recreativas y de estímulo creativo compartidas con el grupo, que enriquecen su jornada cotidiana.`),
    mejoraCalidadVida: combineSection('mejoraCalidadVida', `El balance anual refleja una evolución sumamente favorable en el bienestar anímico, la autonomía y la calidad de vida, consolidando las bases para continuar avanzando en el próximo período con el acompañamiento de Granja Andar.`)
  };
}
