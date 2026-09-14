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
5) EL PROTAGONISTA ES EL JOVEN (CENTRICIDAD EN LA PERSONA):
   El joven/concurrente es el protagonista absoluto y el centro de todo el informe.
   La institución y el facilitador son APOYOS externos, NUNCA el centro ni el sujeto grammatical principal de los párrafos.
   - EVITA centrar las oraciones en el facilitador (PROHIBIDO abusar de: "La facilitadora acompaña...", "El equipo facilitador brinda...", "Bajo la guía del facilitador...", "Su relación con la facilitadora es de confianza...").
   - En su lugar, redacta SIEMPRE desde la persona: qué hace, qué elige, cómo participa, qué estrategias despliega y qué apoyos utiliza (ej: "Participa activamente...", "Pone en práctica estrategias de...", "Recurre a apoyos visuales o recordatorios verbales cuando lo requiere...", "Consolida sus tareas cotidianas contando con la orientación del entorno institucional...").
6) TERMINOLOGÍA INSTITUCIONAL OBLIGATORIA - "INCLUSIÓN" (NO INTEGRACIÓN):
   El paradigma institucional mandatorio es INCLUSIÓN ("inclusión social", "inclusión comunitaria", "espacios inclusivos", "procesos de inclusión").
   Queda terminantemente prohibido forzar "integración" en reemplazo de "inclusión".
7) PROHIBICIÓN DE REDACCIÓN REITERATIVA / "ESTILO CHATGPT" (FOCO EN HABILIDADES, ESTRATEGIAS Y APOYOS):
   Evita que el texto suene a plantilla genérica de inteligencia artificial con párrafos idénticos o muletillas repetitivas.
   Haz hincapié sustancial en toda la información disponible en las planillas y observaciones:
   - **Habilidades**: Nombra las destrezas prácticas, motrices, sociales y ocupacionales reales evaluadas en sus talleres.
   - **Estrategias**: Menciona las técnicas concretas que funcionan con la persona (anticipación, apoyos visuales, secuencias por pasos, modelado entre pares, pausas activas, autoregulación).
   - **Apoyos**: Detalla el grado y tipo de apoyo que requiere o utiliza (supervisión general, apoyos verbales, apoyos gestuales o soporte físico puntual).
8) FORMATO JSON:
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
  
  // Lista de posibles referencias al nombre (completo, compuestos, nombres de pila individuales)
  const nameVariations: string[] = [];
  if (nameTrimmed.length > 2) nameVariations.push(nameTrimmed);
  if (nameParts.length > 1) {
    nameVariations.push(nameParts.slice(0, 2).join(' '));
    if (nameParts.length > 2) {
      nameVariations.push(nameParts.slice(1).join(' '));
    }
  }
  for (const part of nameParts) {
    if (part.length > 2) nameVariations.push(part);
  }
  nameVariations.sort((a, b) => b.length - a.length);

  const escapedVariations = nameVariations.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

  // Patrón para capturar oraciones que inician con el nombre o con fórmulas como "A lo largo del trimestre, Inés..."
  const openerPattern = escapedVariations.length > 0
    ? new RegExp(`^\\s*(?:(?:A lo largo del (?:trimestre|período|ciclo)|Durante el (?:trimestre|período|ciclo)|En el transcurso del (?:trimestre|ciclo)|En este sentido|Asimismo|En cuanto a)[,\\s]+)?(?:${escapedVariations})[,:\\s]+`, 'i')
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
      cleaned = cleaned.replace(/no se registran? [^,.]+ durante el trimestre[,.]?/gi, 'se continúa trabajando y avanzando con apoyos orientados a su desarrollo.');
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
      cleaned = cleaned.replace(/\bdocentes\b/gi, 'facilitadores');
      cleaned = cleaned.replace(/\bdocente\b/gi, 'facilitador/a');

      // 3. Paradigma institucional mandatorio: "inclusión" en lugar de "integración"
      cleaned = cleaned.replace(/integraci[oó]n social/gi, 'inclusión social');
      cleaned = cleaned.replace(/integraci[oó]n comunitaria/gi, 'inclusión comunitaria');
      cleaned = cleaned.replace(/procesos? de integraci[oó]n/gi, 'procesos de inclusión');
      cleaned = cleaned.replace(/espacios? integradores?/gi, 'espacios inclusivos');
      cleaned = cleaned.replace(/propuestas? integradoras?/gi, 'propuestas inclusivas');
      cleaned = cleaned.replace(/integrador[oa]s?/gi, 'inclusivo/a');

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

      // 5. Variación de sujeto: evitar que cada punto comience repitiendo el nombre o fórmulas cliché
      if (openerPattern && sectionIndex > 1 && openerPattern.test(cleaned)) {
        cleaned = cleaned.replace(openerPattern, '');
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
    contextoGrupo = `* ÁREA / GRUPO: **Buenos Mozos (Desarrollo Personal, Inclusión Social y Vida Independiente)**.
* ACTIVIDADES Y TALLERES INTERNOS: Arte Reciclado y Fotografía (expresión plástica, pintura, confección de banderas, exploración de texturas); Desarrollo Personal y Vida Independiente (hábitos de higiene, cuidado del espacio, orden de pertenencias y autonomía cotidiana); Huerta 'Sumemos Verde' (plantación, esquejes, sustratos y cuidado de especies); Derechos a ser Protagonistas (conocimiento de derechos, convención sobre discapacidad y participación en debates grupales); Habilidades Sociales e Interacción (diálogo, empatía, escucha activa, saludos y convivencia grupal); Bienestar Emocional 'Expresando' (reconocimiento de emociones, reflexión y diálogo); y Deporte 'Activando' (actividad física, circuitos motores, destrezas saludables y juegos en equipo).
* REGLA ESTRICTA DE GRUPO: Buenos Mozos NO tiene talleres de gastronomía, cocina, rotisería ni catering. QUEDA TERMINANTEMENTE PROHIBIDO inventar o atribuirle talleres de gastronomía o cocina.`;
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
* ACTIVIDADES Y TALLERES INTERNOS: Promoción y difusión de los derechos de personas con discapacidad; Comunicación comunitaria, oratoria y liderazgo; Participación en foros, eventos institucionales y redes comunitarias; y Habilidades sociolaborales orientadas a la integración activa.`;
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
   - Si el joven pertenece a **Buenos Mozos**: Toda la narrativa de talleres debe enfocarse en Desarrollo personal y vida independiente, arte reciclado y fotografía, huerta 'Sumemos Verde', derechos a ser protagonistas, habilidades sociales e interacción, bienestar emocional 'Expresando' y deporte 'Activando'. **NUNCA atribuyas a Buenos Mozos talleres de gastronomía, cocina, rotisería ni catering.** Aunque los sueños del concurrente incluyan cocinar o preparar alimentos en su vida personal o familiar (ej. 'cocinar ravioles solo'), aclara que es una aspiración de su vida cotidiana y del hogar que se apoya transversalmente desde la autonomía, y NUNCA afirmes que asiste a un taller de gastronomía en Buenos Mozos.
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
5. **EL PROTAGONISTA ES LA PERSONA (CENTRICIDAD ABSOLUTA EN EL JOVEN)**:
   - El joven es el centro de gravedad del texto. La institución y el equipo facilitador actúan como apoyos y andamiajes, NUNCA como protagonistas de la acción.
   - EVITA centrar párrafos en el facilitador (PROHIBIDO oraciones como: "El facilitador guía con dedicación...", "La relación con la facilitadora es de confianza...", "El equipo brinda contención...").
   - Escribe SIEMPRE desde la vivencia, acción y autodeterminación de la persona: qué habilidades pone en práctica, qué estrategias despliega para organizarse y resolver, y qué tipo de apoyos requiere o aprovecha (ej: "Pone en práctica...", "Se desenvuelve con apoyos verbales mínimos...", "Aplica estrategias de anticipación para...").
6. **TERMINOLOGÍA OBLIGATORIA: INCLUSIÓN EN VEZ DE INTEGRACIÓN**:
   - El paradigma institucional de Granja Andar es estrictamente la **INCLUSIÓN**. Usa SIEMPRE "inclusión", "inclusión social", "inclusión comunitaria" y "espacios inclusivos". Queda terminantemente prohibido forzar "integración" en reemplazo de "inclusión".
7. **PROHIBIDO ESTILO REITERATIVO / "CHATGPT" (HABILIDADES, ESTRATEGIAS Y APOYOS)**:
   - Evita estructuras robóticas o repetitivas que comiencen siempre igual.
   - Aterriza obligatoriamente la redacción en:
     * **Habilidades**: Nombra las destrezas específicas logradas en las planillas (ej. modelado, reciclado, jardinería, relajación, desplazamientos, interacción grupal, autonomía en almuerzo).
     * **Estrategias**: Menciona las técnicas prácticas empleadas (anticipación verbal, secuencias visuales, modelado entre pares, pausas de regulación).
     * **Apoyos**: Describe el nivel de apoyo (supervisión a distancia, apoyos verbales, gestuales o físicos específicos).
8. **VARIEDAD AL NOMBRAR Y SIN TÉRMINOS PEDAGÓGICOS**:
   - PROHIBIDO repetir el nombre completo de ${jovenNombre} al inicio de cada sección. Alterna sujeto tácito, primer nombre de pila ocasional, o "el joven", "la concurrente".
   - PROHIBIDO términos escolares/CET ("pedagogía", "pedagógico", "malla curricular", "alumno", "docente"). Usa "apoyos formativos/sociolaborales", "talleres", "facilitador/a".

## FORMATO DE SALIDA (JSON ESTRICTO)
Responde con un objeto JSON con las siguientes 12 claves:

{
  "metaAlcanzada": "Cómo la persona avanza activamente en sus metas y sueños (${pcpSuenos}), poniendo en juego habilidades prácticas y estrategias personales en ${grupoNombre}. IMPORTANTE: Si la meta personal refiere a cocinar en casa o recetas del hogar, vincúlala a su autonomía personal cotidiana, NUNCA inventes que asiste a un taller de gastronomía o cocina institucional.",
  "participacion": "Asistencia, constancia e implicación del joven en las propuestas de ${grupoNombre}. Destaca sus habilidades de participación, sus estrategias para sostener la jornada y los apoyos brindados por el equipo.",
  "integracionRelaciones": "Vínculos de compañerismo, convivencia e inclusión social con pares. Cómo se comunica, comparte espacios y resuelve situaciones cotidianas.",
  "actividadesRelacionadas": "Detalle riguroso y empírico de las habilidades prácticas y técnicas desarrolladas en los talleres reales evaluados en sus planillas (herramientas, materiales, tareas y producciones reales registradas).",
  "vidaIndependiente": "Autonomía funcional en la vida diaria: hábitos de higiene, orden de sus pertenencias, autocuidado y estrategias de desenvolvimiento cotidiano con sus requerimientos de apoyo.",
  "habilidadesViajar": "Movilidad comunitaria y desplazamientos: reconocimiento de semáforos, sendas peatonales, uso de transporte público o circuitos motores y paseos adaptados dentro del predio.",
  "desarrolloPersonal": "Capacidad de aprendizaje, concentración, iniciativa y autoregulación del concurrente, destacando las estrategias que favorecen su crecimiento personal.",
  "metasDeportivas": "Participación activa en actividades corporales, natación, movilidad adaptada o juegos saludables, destacando sus logros motrices y bienestar físico.",
  "metasSociales": "Participación protagónica en celebraciones colectivas, festejos y eventos compartidos con pares, fortaleciendo sus redes de inclusión comunitaria.",
  "dimensionesCalidadVida": "Fortalecimiento de la autodeterminación, bienestar emocional y toma de decisiones sobre sus propios intereses, contando con un entorno de apoyo respetuoso.",
  "actividadesComplementarias": "Participación y disfrute en propuestas creativas, artísticas, culturales o de huerta según las dinámicas de su grupo.",
  "mejoraCalidadVida": "Conclusión integradora centrada en la persona, sus avances en autonomía y bienestar subjetivo, y la continuidad de sus apoyos institucionales hacia el futuro."
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
  const isBuenosMozos = grupoLower.includes('buenos mozos') || grupoLower.includes('mozos');
  const isCatering = !isBuenosMozos && (grupoLower.includes('emprendedores') || grupoLower.includes('catering') || obsLower.includes('catering'));
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
  } else if (isBuenosMozos) {
    actividadesRelacionadas = `En sus talleres asignados participa activamente en el fortalecimiento de habilidades de vida independiente, arte reciclado, huerta institucional 'Sumemos Verde', derechos y bienestar emocional, afianzando sus competencias prácticas con el acompañamiento del equipo.`;
  } else if (isCatering) {
    actividadesRelacionadas = `En el área gastronómica y de catering participa activamente en la elaboración de productos, preparación de mesas, atención a comensales y tareas de cocina, afianzando destrezas prácticas y de manipulación higiénica de alimentos.`;
  } else {
    actividadesRelacionadas = `En sus talleres cotidianos realiza actividades formativas y recreativas orientadas a afianzar destrezas funcionales y de motricidad, mostrando predisposición y compromiso ante cada consigna.`;
  }

  // 5. Vida independiente (variación de sujeto)
  let vidaIndependiente = '';
  if (isCatering) {
    vidaIndependiente = `Incorpora de manera sostenida las Buenas Prácticas de Manufactura (BPM), cumpliendo con el uso de cofia, delantal y sanitización constante de manos. Desarrolla autonomía en el cuidado y orden de los elementos de trabajo en la cocina y salón.`;
  } else if (isBuenosMozos) {
    vidaIndependiente = `En el área de vida independiente, fortalece hábitos de autonomía cotidiana, organizando sus pertenencias, cuidando la higiene personal y de los espacios compartidos, y consolidando rutinas funcionales en el día a día.`;
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


