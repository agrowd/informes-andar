import OpenAI from 'openai';

interface QuarterlyGeneratorOptions {
  jovenNombre: string;
  jovenTaller?: string;
  pcp: any;
  forms: any[];
  facilitadorNombre?: string;
}

export async function generateQuarterlyReportNarrative(options: QuarterlyGeneratorOptions): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY no configurado en las variables de entorno');
  }

  const client = new OpenAI({ apiKey });
  const prompt = buildQuarterlyPrompt(options);

  try {
    const response = await client.chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-4o',
      temperature: Number(process.env.LLM_TEMPERATURE ?? 0.35),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Eres un profesional especializado en informes evolutivos de discapacidad bajo el modelo de Planificación Centrada en la Persona (PCP) y Calidad de Vida de la Asociación Civil Granja Andar. Generas narrativas sumamente fluidas, cálidas, detalladas, positivas y profesionales en español, sin listas y sin placeholders.

DIRECTIVAS ESTRICTAS DE ESTILO INSTITUCIONAL:
1) PROHIBICIÓN TERMINANTE DE TÉRMINOS PEDAGÓGICOS O EDUCATIVO-TERAPÉUTICOS:
   Granja Andar es un Centro de Día y espacio de formación sociolaboral y ocupacional, NO un Centro Educativo Terapéutico (CET) ni una escuela.
   QUEDA TERMINANTEMENTE PROHIBIDO usar palabras como: "pedagogía", "pedagógico", "pedagógica", "pedagógicos", "pedagógicas", "psicopedagógico", "educativo terapéutico", "CET", "malla curricular", "contenidos pedagógicos", "alumno", "alumna", "estudiante", "docente", "profesor", "maestro".
   Utiliza exclusivamente: "concurrente", "joven", "persona", "facilitador/a", "equipo facilitador", "apoyos formativos/sociolaborales", "propuestas ocupacionales", "talleres", "Centro de Día".
2) VARIABILIDAD AL REFERIRSE AL CONCURRENTE (PROHIBIDO REPETIR EL NOMBRE COMPLETO EN CADA PUNTO):
   No comiences cada sección repitiendo el nombre completo del joven. Alterna de manera fluida y elegante:
   - Sujeto tácito ("Asiste con constancia...", "Demuestra interés...", "Participa activamente...").
   - Primer nombre de pila únicamente de forma ocasional.
   - Sustantivos y pronombres respetuosos: "el concurrente", "la joven", "el joven", "él", "ella".
   - Inicios centrados en la propuesta o contexto: "En los talleres...", "Durante las actividades compartidas...", "En cuanto a sus rutinas...".
   El nombre completo solo debe figurar al inicio de la primera sección o en la carátula.
3) TIEMPO PRESENTE ESTRICTO:
   Toda tu redacción debe estar expresada estrictamente en tiempo PRESENTE (ej: "asiste", "participa", "colabora", "comparte").
4) TONO 100% POSITIVO:
   Queda TERMINANTEMENTE PROHIBIDO usar frases negativas o de falta de registro como "aunque no se registran datos", "no se registran salidas", "sin datos". En su lugar, SIEMPRE debes redactar en positivo indicando continuidad y avance activo.
5) FORMATO JSON:
   Tu salida debe ser estrictamente un objeto JSON con las 12 claves oficiales.`
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('Respuesta vacía de OpenAI');

    const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return cleanPositiveNarrative(parsed, options.jovenNombre);
  } catch (error) {
    console.error('Error llamando a OpenAI para narrativa trimestral:', error);
    // Fallback determinístico
    return cleanPositiveNarrative(generateDeterministicFallback(options), options.jovenNombre);
  }
}

function cleanPositiveNarrative(obj: any, jovenNombre?: string): any {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = {};

  const nameTrimmed = (jovenNombre || '').trim();
  const nameParts = nameTrimmed.split(/\s+/).filter(Boolean);
  const firstName = nameParts.length > 0 ? nameParts[0] : '';
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
      cleaned = cleaned.replace(/no se registran? [^,.]+ durante el trimestre[,.]?/gi, 'se continúa trabajando y avanzando con el acompañamiento de los facilitadores.');
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
      result[k] = v;
    }
  }
  return result;
}

function buildQuarterlyPrompt(options: QuarterlyGeneratorOptions): string {
  const { jovenNombre, jovenTaller, pcp, forms, facilitadorNombre } = options;

  // Formatear PCP
  const pcpAnio = pcp?.anio || 'N/A';
  const pcpRutinaSemana = pcp?.rutinas?.semana || 'Sin registrar';
  const pcpRutinaFin = pcp?.rutinas?.finDeSemana || 'Sin registrar';

  // Contexto de los talleres del grupo institucional
  const grupoNombre = jovenTaller || forms[0]?.data?.datosGenerales?.taller || 'Centro de Día';
  let contextoGrupo = '';
  const grupoLower = grupoNombre.toLowerCase();

  if (grupoLower.includes('buenos mozos') || grupoLower.includes('mozos')) {
    contextoGrupo = `* ÁREA / GRUPO: **Buenos Mozos (Formación Sociolaboral y Gastronomía)**.
* ACTIVIDADES Y TALLERES INTERNOS: Taller de Expresión Emocional y Habilidades Sociales; Orientación laboral gastronómica y de servicios (rotisería, salón, comensales); Área deportiva y atlética (entrenamientos, juegos cooperativos y de equipo); Expresión artística (elaboración de banderas, bocetos, pintura, arte reciclado y fotografía para eventos y Juegos Bonaerenses); y Taller de Vida Independiente (orden, cuidado y mantenimiento de espacios comunes, preparación y servicio de la mesa).`;
  } else if (grupoLower.includes('atrapa') || grupoLower.includes('sueños')) {
    contextoGrupo = `* ÁREA / GRUPO: **Atrapasueños (Expresión Artística, Bienestar y Desarrollo Integral)**.
* ACTIVIDADES Y TALLERES INTERNOS: Taller de Motricidad Fina (coordinación óculo-manual, destreza y precisión); Taller Cognitivo (atención, memoria, concentración y razonamiento); Taller de Arte (dibujo, pintura en cuadros y producciones creativas); Taller de Relajación (estrategias de bienestar, calma y autorregulación emocional); Talleres Deportivos (caminatas, fútbol adaptado, bochas, equilibrio y movilidad); Taller de Armado de Actividades Lúdicas; y Talleres de Vida Independiente y Vida en el Hogar (organización de espacios, cuidado de pertenencias, preparación de la mesa, rutinas cotidianas y anticipación de viajes).`;
  } else if (grupoLower.includes('artesanos')) {
    contextoGrupo = `* ÁREA / GRUPO: **Artesanos (Producción Manual, Expresión y Convivencia)**.
* ACTIVIDADES Y TALLERES INTERNOS: Producción manual y centros de interés; Campamentos y recreación comunitaria; Habilidades de Vida Independiente y del hogar (tareas cotidianas, orden, barrido y colaboración); Habilidades para viajar y movilidad comunitaria; Gestión emocional, autorregulación y normas de convivencia grupal; Actividades deportivas adaptadas y circuitos motores; Área artística, show de talentos y canto; y actividades recreativas al aire libre.`;
  } else if (grupoLower.includes('clave de sol') || grupoLower.includes('musica')) {
    contextoGrupo = `* ÁREA / GRUPO: **Clave de Sol (Musicoterapia, Estímulo Sensorial y Desarrollo Funcional)**.
* ACTIVIDADES Y TALLERES INTERNOS: Taller de Musicoterapia (creatividad, conexión emocional y expresión sonora); Actividades de encastre y coordinación fina; Taller interno 'Manos Verdes' (contacto con la naturaleza, siembra, relleno de macetas y traslado de herramientas); Actividades físicas y circuitos motores (lanzamiento y traslado de pelotas, aros, caminatas de distancia); y Habilidades de Vida Independiente (traslado de elementos, control de luces y espacios comunes, autonomía en merienda y almuerzo).`;
  } else if (grupoLower.includes('emprendedores')) {
    contextoGrupo = `* ÁREA / GRUPO: **Emprendedores (Formación Laboral, Pastelería, Catering y Autonomía)**.
* ACTIVIDADES Y TALLERES INTERNOS: Talleres de Pastelería y Cocina (elaboración de recetas, técnicas culinarias, seguridad e higiene alimentaria); Buenas Prácticas de Manufactura (BPM); Experiencias de servicio de catering en empresas e instituciones (entrenamiento funcional laboral, bandejeo, responsabilidad y trabajo en equipo); Expresión artística y fotografía ocupacional (presentación en Juegos Bonaerenses); Entrenamientos de atletismo (lanzamiento de sóftbol, carrera, caminatas saludables); Habilidades de Vida Independiente y autocuidado; y Desarrollo de autonomía para la realización de viajes y salidas comunitarias.`;
  } else if (grupoLower.includes('empoderadas')) {
    contextoGrupo = `* ÁREA / GRUPO: **Empoderadas (Autodeterminación, Género y Desarrollo Personal)**.
* ACTIVIDADES Y TALLERES INTERNOS: Espacios de escucha activa, diálogo y regulación emocional; Autodeterminación y perspectiva de género; Habilidades de vida cotidiana y autonomía femenina; Deportes adaptados y movimiento saludable; Expresión artística y creativa; y participación en eventos comunitarios.`;
  } else if (grupoLower.includes('promotores')) {
    contextoGrupo = `* ÁREA / GRUPO: **Promotores (Derechos, Comunicación y Participación Ciudadana)**.
* ACTIVIDADES Y TALLERES INTERNOS: Promoción y difusión de los derechos de personas con discapacidad; Comunicación comunitaria, oratoria y liderazgo; Participación en foros, eventos institucionales y redes comunitarias; y Habilidades sociolaborales orientadas a la inclusión activa.`;
  } else {
    contextoGrupo = `* ÁREA / GRUPO: **Centro de Día**.
* ACTIVIDADES Y TALLERES INTERNOS: Desarrollo integral, habilidades de autonomía personal, socialización, actividad física adaptada, expresión artística y vinculación comunitaria.`;
  }

  // Extraer metas y sueños con respaldo positivo institucional si no vino explicitado
  let pcpSuenos = '';
  if (Array.isArray(pcp?.perfil?.suenos) && pcp.perfil.suenos.filter(Boolean).length > 0) {
    pcpSuenos = pcp.perfil.suenos.filter(Boolean).join('; ');
  } else if (pcp?.metaSueño && pcp.metaSueño.trim()) {
    pcpSuenos = pcp.metaSueño.trim();
  } else if (Array.isArray(pcp?.suenos) && pcp.suenos.filter(Boolean).length > 0) {
    pcpSuenos = pcp.suenos.filter(Boolean).join('; ');
  } else {
    // Buscar si hay objetivos en planFuturo
    const objetivosPfp: string[] = [];
    if (pcp?.planFuturo && typeof pcp.planFuturo === 'object') {
      for (const val of Object.values(pcp.planFuturo)) {
        if ((val as any)?.objetivos && (val as any).objetivos.trim()) {
          objetivosPfp.push((val as any).objetivos.trim());
        }
      }
    }
    if (objetivosPfp.length > 0) {
      pcpSuenos = objetivosPfp.slice(0, 2).join('; ');
    } else {
      pcpSuenos = 'Fortalecer su autonomía, bienestar integral y participación activa en los espacios grupales e institucionales';
    }
  }

  const pcpCapacidades = Array.isArray(pcp?.perfil?.capacidades) && pcp.perfil.capacidades.filter(Boolean).length > 0 
    ? pcp.perfil.capacidades.filter(Boolean).join('; ') 
    : 'Participación en actividades grupales y talleres de la institución';
  
  const gencat = pcp?.perfil?.resultadosEscalas?.gencat || 'Sin evaluar';
  const sis = pcp?.perfil?.resultadosEscalas?.sis || 'Sin evaluar';
  const inico = pcp?.perfil?.resultadosEscalas?.inico || 'Sin evaluar';
  const sanMartin = pcp?.perfil?.resultadosEscalas?.sanMartin || 'Sin evaluar';

  // Formatear planes de futuro
  let pfpText = '';
  if (pcp?.planFuturo && typeof pcp.planFuturo === 'object') {
    for (const [dim, value] of Object.entries(pcp.planFuturo)) {
      const v = value as any;
      if (v?.objetivos || v?.apoyos) {
        pfpText += `- Dimensión ${dim}: Objetivos: "${v.objetivos || 'N/A'}", Apoyos: "${v.apoyos || 'N/A'}"\n`;
      }
    }
  }
  if (!pfpText) pfpText = 'Se continúa trabajando en los objetivos del Plan de Futuro Personal adaptados a sus requerimientos de apoyo.';

  // Formatear checklists mensuales
  let monthlyContext = '';
  forms.forEach((form, idx) => {
    const data = form.data || {};
    const periodo = data.datosGenerales?.periodo || form.periodo || `Mes ${idx + 1}`;
    const observaciones = data.observaciones || 'Sin observaciones adicionales';
    
    monthlyContext += `### MES ${idx + 1}: ${periodo}\n`;
    monthlyContext += `Observaciones del facilitador: "${observaciones}"\n`;
    monthlyContext += `Habilidades trabajadas por taller:\n`;
    
    const talleres = data.talleres || [];
    talleres.forEach((taller: any) => {
      monthlyContext += `- Taller: ${taller.nombre}\n`;
      const checkedItems = (taller.items || []).filter((it: any) => it.nivel && it.nivel > 0);
      if (checkedItems.length === 0) {
        monthlyContext += `  No se marcaron habilidades específicas.\n`;
      } else {
        checkedItems.forEach((it: any) => {
          const nivel = Number(it.nivel || 0);
          let stateText = 'Enseñado';
          if (nivel === 2) stateText = 'Con Apoyo';
          if (nivel === 3) stateText = 'Sola (de forma independiente)';
          if (nivel === 4) stateText = 'Puede Enseñar (habilidad consolidada / puede guiar a otros)';
          monthlyContext += `  * Habilidad: "${it.nombre}" [Nivel: ${stateText}]\n`;
        });
      }
    });
    monthlyContext += `\n`;
  });

  return `
# TAREA: Generar un Informe Evolutivo Trimestral Narrativo Integrado

Debes redactar una narrativa profesional, viva, singular y fluida para el trimestre del concurrente **${jovenNombre}**.
La información de entrada consta de su Planificación Centrada en la Persona (PCP), escalas de calidad de vida y las planillas mensuales de checklist y observaciones de facilitadores.

## INFORMACIÓN GENERAL DEL JOVEN
- **Nombre**: ${jovenNombre}
- **Grupo / Taller Principal**: ${grupoNombre}
- **Facilitador/a de Referencia**: ${facilitadorNombre || forms[0]?.data?.datosGenerales?.facilitadorNombre || 'Equipo Técnico Institucional'}
- **PCP Año**: ${pcpAnio}
- **Metas o Sueños Personales**: ${pcpSuenos}
- **Capacidades**: ${pcpCapacidades}
- **Rutina Semanal**: ${pcpRutinaSemana}
- **Rutina de Fin de Semana**: ${pcpRutinaFin}
- **Resultados de Escalas**: GENCAT: ${gencat} | SIS: ${sis} | INICO: ${inico} | SAN MARTIN: ${sanMartin}
- **Plan de Futuro Personal (PFP)**:
${pfpText}

## IDENTIDAD DEL GRUPO INSTITUCIONAL
${contextoGrupo}

## REGISTROS MENSUALES DEL TRIMESTRE (OBSERVACIONES Y HABILIDADES)
${monthlyContext}

## DIRECTIVAS CRÍTICAS DE FIDELIDAD, DIFERENCIACIÓN Y NO-REPETICIÓN (ESTRICTAS)
1. **PROHIBIDO GENERAR INFORMES PLANTILLA O TEXTOS IDÉNTICOS ENTRE JÓVENES**:
   - Cada concurrente tiene una historia y un proceso único. Si el texto suena genérico o podría aplicarse a cualquier otra persona cambiando solo el nombre, EL INFORME ESTARÁ MAL.
   - **MOTOR PRINCIPAL = LAS OBSERVACIONES DEL FACILITADOR**: Debes extraer, interpretar y plasmar las situaciones, recetas, productos, anécdotas, emociones (ej. tolerancia a la corrección, momentos de llanto o alegría, diálogo con facilitadoras), compañeros y festejos que efectivamente figuran en las observaciones de **${jovenNombre}**.
2. **ADAPTACIÓN RIGUROSA AL GRUPO REAL DEL CONCURRENTE**:
   - Si el joven pertenece a **Buenos Mozos**: Toda la narrativa de talleres debe enfocarse en Formación sociolaboral, rotisería/salón, expresión emocional, deportes y vida independiente.
   - Si el joven pertenece a **Atrapasueños**: Enfócate en motricidad fina, estimulación cognitiva, arte (pintura), relajación y autorregulación, deportes adaptados (bochas), vida independiente y vida en el hogar.
   - Si pertenece a **Artesanos**: Enfócate en producción manual, centros de interés, campamentos, convivencia grupal, show de talentos y vida cotidiana.
   - Si pertenece a **Clave de Sol**: Enfócate en musicoterapia, estímulo sensorial, encastre, taller de huerta 'Manos Verdes' interno, circuitos motores y desplazamientos.
   - Si pertenece a **Emprendedores**: Enfócate en pastelería, catering en empresas, BPM, fotografía cultural, entrenamientos de atletismo para Bonaerenses y vida independiente.
   - Si pertenece a **Empoderadas**: Enfócate en autodeterminación, perspectiva de género, hábitos de autonomía femenina, diálogo y expresión artística.
   - Si pertenece a **Promotores**: Enfócate en promoción comunitaria, defensa de derechos, oratoria y liderazgo social.
   - **NUNCA le atribuyas talleres ajenos a su grupo o que no figuren en sus datos**.
3. **RESPETO POR LA CONDICIÓN MOTRIZ Y REQUERIMIENTOS DE APOYO**:
   - Si el joven asiste en silla de ruedas o tiene apoyo físico total, jamás hables de caminatas a pie o desplazamientos autónomos. Describe paseos asistidos, control postural y traslados con apoyo.
4. **ENFOQUE POSITIVO Y EN TIEMPO PRESENTE**:
   - Todo debe estar redactado en tiempo **PRESENTE** (ej: "asiste", "participa", "elabora", "atiende", "se desenvuelve").
   - **PROHIBIDAS FRASES NEGATIVAS O DE FALTA DE DATOS**: Jamás escribas "no se registran datos", "aunque no hay registros", "sin novedades". Siempre formula en positivo ("se continúa trabajando activamente en...", "avanza de manera progresiva con el acompañamiento de facilitadores...").
5. **ESTILO NARRATIVO Y VARIEDAD DE REFERENCIA**:
   - Redacta párrafos integrados de 4 a 6 líneas cada uno, fluidos, cálidos y con rigor técnico. Cero listas o viñetas.
   - **VARIABILIDAD AL NOMBRAR A LA PERSONA (PROHIBIDO REPETIR EL NOMBRE COMPLETO EN CADA PUNTO)**: No comiences cada sección con el nombre completo de ${jovenNombre}. Alterna con sujeto tácito ("Asiste...", "Participa...", "Demuestra..."), primer nombre de pila ocasional, o términos como "el concurrente", "la joven", "el joven".
   - **PROHIBIDO USAR TÉRMINOS PEDAGÓGICOS O EDUCATIVO-TERAPÉUTICOS**: Granja Andar es un Centro de Día y espacio de inclusión sociolaboral/ocupacional. PROHIBIDO usar "pedagogía", "pedagógico/a", "CET", "alumno/a", "docente", "profesor". Usa "apoyos formativos/sociolaborales", "talleres", "concurrente", "facilitador/a".

## FORMATO DE SALIDA (JSON ESTRICTO)
Responde con un objeto JSON con las siguientes 12 claves:

{
  "metaAlcanzada": "Evolución activa y concreta hacia las metas y sueños del concurrente (${pcpSuenos}), vinculándolos con las tareas formativas y responsabilidades que asume en ${grupoNombre}.",
  "participacion": "Asistencia, constancia e implicación en las propuestas de ${grupoNombre}. Detalla con fidelidad los apoyos formativos, emocionales y prácticos brindados por los facilitadores. (PROHIBIDO usar el término pedagógico).",
  "integracionRelaciones": "Vínculos afectivos, comunicación y convivencia con pares y facilitadores. Su trato con compañeros y referentes, y su participación en las dinámicas de taller.",
  "actividadesRelacionadas": "Detalle técnico, rico y específico de las tareas formativas y ocupacionales desarrolladas en el trimestre (recetas, técnicas, herramientas o productos que constan en sus registros).",
  "vidaIndependiente": "Autonomía funcional adaptada a su grupo: cumplimiento de BPM (higiene, cofia, delantal) si es gastronomía/catering; o hábitos de cuidado personal, orden de pertenencias y espacios cotidianos si es Centro de Día.",
  "habilidadesViajar": "Desplazamientos y actividades en espacios exteriores según sus posibilidades: traslados para servicios, caminatas, circuitos motores o recorridos asistidos en el predio.",
  "desarrolloPersonal": "Capacidad de aprendizaje, concentración, motricidad, iniciativa y respuesta constructiva ante las orientaciones del equipo facilitador.",
  "metasDeportivas": "Participación en actividad física adaptada, movilidad, elongación o juegos saludables, destacando el bienestar y la autorregulación.",
  "metasSociales": "Participación en celebraciones colectivas, festejos temáticos de cumpleaños y jornadas institucionales compartidas con pares.",
  "dimensionesCalidadVida": "Fortalecimiento del bienestar emocional, autodeterminación, escucha activa y contención afectiva.",
  "actividadesComplementarias": "Participación en dinámicas recreativas, artísticas, culturales, de huerta o música según los talleres del grupo.",
  "mejoraCalidadVida": "Conclusión integradora sobre la evolución favorable a lo largo del trimestre, su bienestar anímico y el acompañamiento del equipo de Granja Andar."
}
`;
}

function generateDeterministicFallback(options: QuarterlyGeneratorOptions): any {
  const { jovenNombre, jovenTaller, pcp, forms } = options;
  const pcpSuenos = Array.isArray(pcp?.perfil?.suenos) ? pcp.perfil.suenos.filter(Boolean).join('; ') : 'Desarrollar habilidades formativas y sociales';

  const grupoNombre = jovenTaller || forms[0]?.data?.datosGenerales?.taller || 'Centro de Día';
  const grupoLower = grupoNombre.toLowerCase();

  const pcpStr = JSON.stringify(pcp || {}).toLowerCase();
  const isWheelchairUser = pcpStr.includes('silla de ruedas') || pcpStr.includes('apoyo fisico total') || pcpStr.includes('apoyo físico total') || pcpStr.includes('movilidad reducida');

  // Consolidar observaciones de los meses
  const allObsText = forms.map(f => {
    const obs = f.data?.observaciones || '';
    return typeof obs === 'string' ? obs.trim() : '';
  }).filter(Boolean).join('\n');

  const obsLower = allObsText.toLowerCase();

  // Consolidar habilidades logradas (Nivel >= 2) por taller real
  const skillsByTaller: { [key: string]: string[] } = {};
  forms.forEach(f => {
    const talleres = f.data?.talleres || [];
    talleres.forEach((t: any) => {
      const items = t.items || [];
      items.forEach((it: any) => {
        if (it.nivel && Number(it.nivel) >= 2) {
          const tName = t.nombre || 'Taller';
          if (!skillsByTaller[tName]) skillsByTaller[tName] = [];
          if (!skillsByTaller[tName].includes(it.nombre)) {
            skillsByTaller[tName].push(it.nombre);
          }
        }
      });
    });
  });

  const tallerNames = Object.keys(skillsByTaller);
  const isCatering = grupoLower.includes('buenos mozos') || grupoLower.includes('mozos') || grupoLower.includes('catering') || obsLower.includes('catering');
  const isTextil = grupoLower.includes('atrapa') || grupoLower.includes('sueños') || grupoLower.includes('relajaci');
  const isHuerta = grupoLower.includes('manos verdes') || grupoLower.includes('huerta') || grupoLower.includes('vivero');

  // 1. Metas alcanzadas (primer punto menciona al concurrente)
  const metaAlcanzada = `${jovenNombre} continúa avanzando con constancia hacia su meta personal de: "${pcpSuenos}". Durante este trimestre, su participación activa en ${grupoNombre} le permite consolidar habilidades prácticas y de convivencia que fortalecen su autonomía y su proyecto de vida.`;

  // 2. Participación (sujeto tácito)
  let participacion = `Mantiene una asistencia regular y una actitud predispuesta en las actividades institucionales de ${grupoNombre}. `;
  if (obsLower.includes('consignas') || obsLower.includes('acompañamiento')) {
    participacion += `Escucha atentamente las orientaciones de las facilitadoras y participa con genuino interés en cada dinámica propuesta.`;
  } else {
    participacion += `Recibe orientación y apoyo por parte de los facilitadores, mostrando compromiso y disfrute en el desarrollo de las tareas cotidianas.`;
  }

  // 3. Integración y relaciones (sujeto tácito)
  let integracionRelaciones = `Sostiene un vínculo respetuoso, afectuoso y cordial tanto con sus compañeros como con sus facilitadores. `;
  if (obsLower.includes('amistad') || obsLower.includes('compañerismo') || obsLower.includes('cordial')) {
    integracionRelaciones += `Mantiene un trato afectuoso y solidario con sus pares, colaborando en la convivencia cotidiana y afianzando lazos de confianza con su referente.`;
  } else {
    integracionRelaciones += `Comparte momentos de trabajo y esparcimiento en un clima de camaradería y confianza, sintiéndose parte activa de su grupo.`;
  }

  // 4. Actividades relacionadas (Dinámicas y fidedignas según los talleres reales de este joven)
  let actividadesRelacionadas = '';
  if (tallerNames.length > 0) {
    const descripcionesTalleres = tallerNames.slice(0, 3).map(tName => {
      const skills = (skillsByTaller[tName] || []).slice(0, 3).join(', ');
      return `En ${tName}, trabaja en ${skills}`;
    }).join('. ');
    actividadesRelacionadas = `En sus talleres asignados participa activamente: ${descripcionesTalleres}. Evidencia dedicación e interés en cada propuesta, afianzando sus competencias prácticas con el acompañamiento del equipo.`;
  } else if (isCatering) {
    actividadesRelacionadas = `En el área gastronómica y de catering participa activamente en la elaboración de productos, preparación de mesas, atención a comensales y tareas de cocina, afianzando destrezas prácticas y de manipulación higiénica de alimentos.`;
  } else {
    actividadesRelacionadas = `En sus talleres cotidianos realiza actividades formativas y recreativas orientadas a afianzar destrezas funcionales y de motricidad, mostrando predisposición y compromiso ante cada consigna.`;
  }

  // 5. Vida independiente (variación de sujeto)
  let vidaIndependiente = '';
  if (isCatering) {
    vidaIndependiente = `Incorpora de manera sostenida las Buenas Prácticas de Manufactura (BPM), cumpliendo con el uso de cofia, delantal y sanitización constante de manos. Desarrolla autonomía en el cuidado y orden de los elementos de trabajo en la cocina y salón.`;
  } else if (isWheelchairUser) {
    vidaIndependiente = `En el ámbito de la autonomía y rutinas de cuidado personal, se trabaja con apoyos adaptados en momentos de alimentación, descanso y orden de pertenencias, promoviendo su participación activa y manifestación de preferencias.`;
  } else {
    vidaIndependiente = `En el área de vida independiente, fortalece hábitos de autonomía cotidiana, colaborando en el cuidado y orden de sus pertenencias personales y en el mantenimiento de los espacios comunes de la institución.`;
  }

  // 6. Habilidades para viajar / espacios exteriores (sujeto tácito)
  let habilidadesViajar = '';
  if (isWheelchairUser) {
    habilidadesViajar = `Participa de paseos asistidos y actividades en espacios exteriores dentro del predio institucional con traslados adaptados en su silla de ruedas, disfrutando del contacto con el entorno natural.`;
  } else if (isCatering) {
    habilidadesViajar = `Colabora activamente en la logística y traslado de insumos para servicios de catering, participando en la carga y descarga ordenada de materiales y vajilla en la camioneta institucional.`;
  } else {
    habilidadesViajar = `Se desenvuelve con seguridad en desplazamientos dentro de la institución y en actividades al aire libre, respetando pautas de organización, hidratación y cuidado del entorno.`;
  }

  // 7. Desarrollo personal (sujeto tácito)
  const desarrolloPersonal = `Demuestra buena concentración, iniciativa y destreza en la realización de tareas prácticas. Asimila favorablemente las sugerencias de las facilitadoras, buscando superarse y resolver situaciones con creciente autonomía.`;

  // 8. Metas deportivas (sujeto tácito)
  let metasDeportivas = '';
  if (isWheelchairUser) {
    metasDeportivas = `En la dimensión física participa de rutinas de movilidad articular adaptada, elongación y dinámicas de movimiento asistido, favoreciendo su control postural y bienestar corporal.`;
  } else {
    metasDeportivas = `Participa con entusiasmo en propuestas de actividad física, elongación y hora saludable, disfrutando del movimiento y afianzando la autorregulación y el compañerismo durante dinámicas lúdicas.`;
  }

  // 9. Metas sociales (sujeto tácito)
  const metasSociales = `Comparte activamente momentos colectivos, celebraciones de cumpleaños temáticos y jornadas institucionales, expresando alegría y fortaleciendo lazos de amistad y empatía con sus pares.`;

  // 10. Dimensiones de calidad de vida
  const dimensionesCalidadVida = `Se fortalecen integralmente las dimensiones de bienestar emocional, autodeterminación e inclusión social, brindando espacios de escucha, diálogo y contención afectiva que favorecen su seguridad personal.`;

  // 11. Actividades complementarias
  let actividadesComplementarias = '';
  if (isTextil) {
    actividadesComplementarias = `Disfruta de propuestas de relajación guiada, música suave y técnicas artesanales que favorecen la expresión personal y el bienestar anímico.`;
  } else if (isHuerta) {
    actividadesComplementarias = `Participa en actividades de contacto con la naturaleza, siembra y plantas aromáticas, encontrando espacios de calma y disfrute al aire libre.`;
  } else {
    actividadesComplementarias = `Participa con entusiasmo en dinámicas recreativas, artísticas y musicales que enriquecen su jornada y estimulan su creatividad.`;
  }

  // 12. Conclusión y mejora de calidad de vida
  const mejoraCalidadVida = `La continuidad en las propuestas de ${grupoNombre}, el acompañamiento del equipo y el trabajo coordinado con su entorno familiar consolidan una evolución favorable en su bienestar anímico, salud y calidad de vida.`;

  return {
    metaAlcanzada,
    participacion,
    integracionRelaciones,
    actividadesRelacionadas,
    vidaIndependiente,
    habilidadesViajar,
    desarrolloPersonal,
    metasDeportivas,
    metasSociales,
    dimensionesCalidadVida,
    actividadesComplementarias,
    mejoraCalidadVida
  };
}


