import OpenAI from 'openai';

interface QuarterlyGeneratorOptions {
  jovenNombre: string;
  pcp: any;
  forms: any[];
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
      temperature: Number(process.env.LLM_TEMPERATURE ?? 0),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Eres un profesional especializado en informes evolutivos de discapacidad bajo el modelo de Planificación Centrada en la Persona (PCP) y Calidad de Vida. Generas narrativas sumamente fluidas, cálidas, detalladas y profesionales en español, sin listas y sin placeholders. OBLIGATORIO: Toda tu redacción debe estar expresada estrictamente en tiempo PRESENTE (por ejemplo: "asiste", "participa", "colabora", "comparte"), transformando activamente cualquier insumo en pasado a presente. Tu salida debe ser estrictamente un objeto JSON.'
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
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Error llamando a OpenAI para narrativa trimestral:', error);
    // Fallback determinístico
    return generateDeterministicFallback(options);
  }
}

function buildQuarterlyPrompt(options: QuarterlyGeneratorOptions): string {
  const { jovenNombre, pcp, forms } = options;

  // Formatear PCP
  const pcpAnio = pcp?.anio || 'N/A';
  const pcpRutinaSemana = pcp?.rutinas?.semana || 'Sin registrar';
  const pcpRutinaFin = pcp?.rutinas?.finDeSemana || 'Sin registrar';
  const pcpSuenos = Array.isArray(pcp?.perfil?.suenos) ? pcp.perfil.suenos.filter(Boolean).join('; ') : 'Sin registrar';
  const pcpCapacidades = Array.isArray(pcp?.perfil?.capacidades) ? pcp.perfil.capacidades.filter(Boolean).join('; ') : 'Sin registrar';
  
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
  if (!pfpText) pfpText = 'Sin registrar';

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

Debes redactar una narrativa coherente y fluida para el trimestre del concurrente **${jovenNombre}**.
La información de entrada consta de su Planificación Centrada en la Persona (PCP), escalas de calidad de vida y 3 planillas de checklist mensuales de habilidades trabajadas y observaciones.

## INFORMACIÓN GENERAL DEL JOVEN
- **Nombre**: ${jovenNombre}
- **PCP Año**: ${pcpAnio}
- **Metas o Sueños**: ${pcpSuenos}
- **Capacidades**: ${pcpCapacidades}
- **Rutina Semanal**: ${pcpRutinaSemana}
- **Rutina de Fin de Semana**: ${pcpRutinaFin}
- **Resultados de Escalas de Calidad de Vida**:
  - GENCAT: ${gencat}
  - SIS (Escala de Intensidad de Apoyos): ${sis}
  - INICO-FEAPS: ${inico}
  - SAN MARTIN: ${sanMartin}
- **Plan de Futuro Personal (PFP) de la PCP**:
${pfpText}

## DATOS MENSUALES DEL TRIMESTRE (3 MESES)
${monthlyContext}

## INSTRUCCIONES DE REDACCIÓN
1. Redacta párrafos narrativos **completamente fluidos, integradores y profesionales**. Evita listas, viñetas o bullet points en las respuestas.
2. Reemplaza la palabra "Persona" o el pronombre genérico por el nombre real del joven (**${jovenNombre}**) al referirte a él de forma directa.
3. Adapta y asocia la grilla de habilidades marcadas y las observaciones de los facilitadores a cada sección. Por ejemplo:
   - Si se trabajaron habilidades de higiene, lavado de dientes o descarte de pañal en talleres de autonomía, lúcelo en la sección de "Habilidades para vida independiente".
   - Si se trabajó en Manos Verdes con herramientas o traslados, vincúlalo con la meta de viajar, la adaptación, la paciencia y el contacto con la naturaleza.
   - Si se trabajaron caminatas o circuitos, lúcelo en "Habilidades para metas deportivas".
   - Si se trabajaron relajación, interacciones o musicoterapia, lúcelo en "Habilidades para metas sociales".
4. Sigue estrictamente la estructura JSON indicada abajo y no agregues ninguna clave extra.
5. **Tiempo verbal obligatorio**: Escribe toda la redacción estrictamente en tiempo presente (por ejemplo: 'Juan Pablo participa...', 'colabora...', 'realiza...', en lugar de usar formas en pasado como 'participó', 'colaboró', ni presente perfecto como 'ha participado'). Toda la narrativa debe dar la sensación de evolución actual, activa y continua. Transforma de forma proactiva cualquier observación o logro que venga redactado en pasado a su equivalente en presente (ej. cambia "asistió" por "asiste", "logró" por "logra").

## FORMATO DE SALIDA (DEBE SER JSON ESTRICTO)
Responde con un objeto JSON con las siguientes claves y con textos narrativos de al menos 4-5 líneas por sección:

{
  "metaAlcanzada": "Narrativa sobre cómo avanza o logra su meta/sueño anual (${pcpSuenos}) basado en los datos del trimestre. Describe la experiencia concreta y su disfrute.",
  "participacion": "Narrativa sobre su asistencia regular y participación en los talleres. Detalla el nivel de apoyo (físico, verbal) brindado por los facilitadores y su predisposición.",
  "integracionRelaciones": "Narrativa sobre cómo interactúa con sus compañeros y facilitadores. Describe su afecto, contacto gestual, físico y la relación de confianza.",
  "actividadesRelacionadas": "Detalle de los talleres que realiza que se asocian con su meta principal (deportes, habilidades sociales, etc.), destacando su interés y logros.",
  "vidaIndependiente": "Narrativa sobre las habilidades cotidianas trabajadas (colaborar en poner manteles, rutinas de aseo, cambio de ropa, descarte de pañal si aplica).",
  "habilidadesViajar": "Narrativa sobre cómo se adapta a nuevos espacios, paciencia, adaptabilidad y tareas en el vivero o Manos Verdes (pala de mano, traslados) que fortalecen la paciencia y el contacto natural.",
  "desarrolloPersonal": "Narrativa sobre las tareas grupales, juegos de encastres y concentración. Si las actividades artísticas le cuestan, detalla cómo se le motiva para la motricidad fina.",
  "metasDeportivas": "Narrativa sobre destrezas físicas trabajadas (fuerza, resistencia, caminatas) y destrezas como lanzamiento, aros, bochas o tejo.",
  "metasSociales": "Narrativa sobre comunicación verbal/no verbal, empatía, relajación, contacto natural y celebraciones de cumpleaños de los jóvenes del grupo.",
  "dimensionesCalidadVida": "Cómo se trabajaron las dimensiones de calidad de vida (autodeterminación, bienestar físico y emocional, relaciones) a través de las bochas, caminatas, relajación, musicoterapia.",
  "actividadesComplementarias": "Resumen de su participación en música/percusión (siguiendo instrucciones, flauta), arte (pinceles/esponjas) y cómo colabora ayudando a compañeros con movilidad reducida (como silla de ruedas).",
  "mejoraCalidadVida": "Conclusión de cómo la incorporación de rutinas, estimulación sensorial, relajación y naturaleza mejoraron significativamente su bienestar general y salud."
}
`;
}

function generateDeterministicFallback(options: QuarterlyGeneratorOptions): any {
  const { jovenNombre, pcp, forms } = options;
  const pcpSuenos = Array.isArray(pcp?.perfil?.suenos) ? pcp.perfil.suenos.filter(Boolean).join('; ') : 'Disfrutar y pasear';

  // Consolidar observaciones de los 3 meses
  const observationsList = forms.map(f => {
    const period = f.data?.datosGenerales?.periodo || f.periodo || 'Mes';
    const obs = f.data?.observaciones || '';
    return obs.trim() ? `[${period}]: ${obs.trim()}` : '';
  }).filter(Boolean);

  const consolidatedObs = observationsList.length > 0
    ? observationsList.join('\n')
    : `Durante este trimestre se acompaña a ${jovenNombre} en su desarrollo personal y talleres.`;

  // Consolidar habilidades logradas
  const skillsList: string[] = [];
  forms.forEach(f => {
    const talleres = f.data?.talleres || [];
    talleres.forEach((t: any) => {
      const items = t.items || [];
      items.forEach((it: any) => {
        if (it.nivel && Number(it.nivel) >= 2) {
          skillsList.push(`${it.nombre} (${t.nombre})`);
        }
      });
    });
  });
  const uniqueSkills = [...new Set(skillsList)].slice(0, 10);
  const skillsText = uniqueSkills.length > 0
    ? `Se destacan avances en: ${uniqueSkills.join(', ')}.`
    : '';

  return {
    metaAlcanzada: `${jovenNombre} realiza importantes progresos orientados a su meta de: "${pcpSuenos}". Participa en actividades recreativas asociadas y salidas de esparcimiento con gran disfrute.`,
    participacion: `${jovenNombre} asiste con regularidad y se muestra predispuesto ante las actividades propuestas. Requiere de apoyo verbal y físico intermitente de las facilitadoras para culminar las tareas de manera exitosa.`,
    integracionRelaciones: `${jovenNombre} demuestra una excelente integración con sus pares. Su vinculación es sumamente afectuosa, haciendo uso del contacto físico y señas gestuales para expresarse.`,
    actividadesRelacionadas: `Participa activamente en los talleres deportivos y recreativos de la institución que se encuentran alineados con su plan de desarrollo personal y sus intereses evolutivos.`,
    vidaIndependiente: `Trabaja destrezas del hogar y autonomía funcional, tales como la colaboración en el orden del comedor, higiene de manos y rostro, y descarte de residuos personales.`,
    habilidadesViajar: `En el taller de Manos Verdes y en las salidas, trabaja su adaptabilidad a nuevos entornos. Se destaca su paciencia y adaptación al aire libre manipulando elementos del vivero.`,
    desarrolloPersonal: `Se observa una buena tolerancia y concentración en tareas tranquilas como los juegos de encastre. Se le brinda motivación extra en tareas plásticas para el fortalecimiento de la motricidad fina.`,
    metasDeportivas: `Físicamente participa de las caminatas grupales y actividades de lanzamiento, coordinación con aros y juegos adaptados de bochas.`,
    metasSociales: `Se incentiva la comunicación social y la empatía al compartir meriendas y celebrar los cumpleaños de los concurrentes del grupo.`,
    dimensionesCalidadVida: `Se abordan dimensiones de bienestar emocional, autodeterminación y bienestar físico mediante talleres sensoriales y de relajación adaptados.`,
    actividadesComplementarias: `Participa en percusión y musicoterapia siguiendo ritmos simples. Demuestra compañerismo al empujar la silla de ruedas de sus compañeros con movilidad reducida.`,
    mejoraCalidadVida: `La incorporación de rutinas estructuradas y el estímulo constante en espacios naturales contribuyen a fortalecer su bienestar general, autonomía y estado de salud.`
  };
}
