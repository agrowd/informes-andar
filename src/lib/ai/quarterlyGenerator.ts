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
          content: 'Eres un profesional especializado en informes evolutivos de discapacidad bajo el modelo de Planificación Centrada en la Persona (PCP) y Calidad de Vida de la Asociación Civil Granja Andar. Generas narrativas sumamente fluidas, cálidas, detalladas, positivas y profesionales en español, sin listas y sin placeholders. OBLIGATORIO: 1) Toda tu redacción debe estar expresada estrictamente en tiempo PRESENTE (ej: "asiste", "participa", "colabora", "comparte"). 2) Queda TERMINANTEMENTE PROHIBIDO usar frases negativas o de falta de registro como "aunque no se registran datos", "no se registran salidas", "sin datos". En su lugar, SIEMPRE debes redactar en positivo indicando que "se continúa avanzando en...", "se continúa trabajando activamente en...". Tu salida debe ser estrictamente un objeto JSON.'
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
    return cleanPositiveNarrative(parsed);
  } catch (error) {
    console.error('Error llamando a OpenAI para narrativa trimestral:', error);
    // Fallback determinístico
    return cleanPositiveNarrative(generateDeterministicFallback(options));
  }
}

function cleanPositiveNarrative(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      let cleaned = v;
      cleaned = cleaned.replace(/aunque no se registran? [^,.]+[,.]?/gi, '');
      cleaned = cleaned.replace(/a pesar de no contar con registros? [^,.]+[,.]?/gi, '');
      cleaned = cleaned.replace(/no se registran? datos específicos [^,.]+[,.]?/gi, 'se continúa trabajando activamente en esta área.');
      cleaned = cleaned.replace(/no se registran? salidas específicas[,.]?/gi, 'se continúa disfrutando de las actividades al aire libre dentro del predio institucional,');
      cleaned = cleaned.replace(/no se registran? [^,.]+ durante el trimestre[,.]?/gi, 'se continúa trabajando y avanzando con el acompañamiento de los facilitadores.');
      cleaned = cleaned.replace(/sin novedades particulares registradas [^,.]+[,.]?/gi, 'con un proceso de desarrollo continuo.');
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

  if (grupoLower.includes('buenos mozos') || grupoLower.includes('mozos') || grupoLower.includes('catering')) {
    contextoGrupo = `* ÁREA / IDENTIDAD: **Formación Laboral en Gastronomía, Catering y Salón (Buenos Mozos)**.
* EJES CENTRALES: Taller de Catering (atención cordial a comensales, servicio de infusiones y bebidas, bandejeo, fajinado, logística de carga y descarga de camioneta), Taller de Cocina y Pastelería (elaboración dulce y salada, técnicas de corte, recetas, uso supervisado de utensilios y maquinarias), Buenas Prácticas de Manufactura - BPM (uso riguroso de cofia, cabello recogido, lavado frecuente y desinfección de manos, higiene alimentaria) y Habilidades Sociolaborales (trabajo en equipo, aceptación de sugerencias y regulación emocional en el servicio).`;
  } else if (grupoLower.includes('atrapa') || grupoLower.includes('sueños') || grupoLower.includes('relajaci')) {
    contextoGrupo = `* ÁREA / IDENTIDAD: **Atrapa Sueños / Relajación y Calma**.
* EJES CENTRALES: Producción textil y manualidades, tejido, motricidad fina, construcción lúdica con elementos reciclados, técnicas de relajación guiada, respiración, autorregulación y bienestar emocional.`;
  } else if (grupoLower.includes('manos verdes') || grupoLower.includes('huerta') || grupoLower.includes('vivero')) {
    contextoGrupo = `* ÁREA / IDENTIDAD: **Manos Verdes / Huerta y Vivero**.
* EJES CENTRALES: Huerta agroecológica, vivero, contacto directo con la tierra y plantas aromáticas, siembra, riego, compostaje, actividades de relajación/yoga al aire libre y cuidado ambiental.`;
  } else if (grupoLower.includes('artesanos')) {
    contextoGrupo = `* ÁREA / IDENTIDAD: **Artesanos**.
* EJES CENTRALES: Trabajos manuales, técnicas de confección, reciclado, arte, pintura, expresión creativa y habilidades sociolaborales.`;
  } else if (grupoLower.includes('empoderadas')) {
    contextoGrupo = `* ÁREA / IDENTIDAD: **Empoderadas**.
* EJES CENTRALES: Autodeterminación, perspectiva de género, habilidades de vida cotidiana, hábitos de autonomía femenina, espacios de diálogo, deportes adaptados y expresión artística.`;
  } else if (grupoLower.includes('clave de sol') || grupoLower.includes('musica')) {
    contextoGrupo = `* ÁREA / IDENTIDAD: **Clave de Sol**.
* EJES CENTRALES: Musicoterapia, expresión sonora y rítmica, deportes adaptados, traslados comunitarios y habilidades sociales.`;
  } else if (grupoLower.includes('deporte') || grupoLower.includes('vida independiente')) {
    contextoGrupo = `* ÁREA / IDENTIDAD: **Deporte y Vida Independiente**.
* EJES CENTRALES: Circuitos motores, dinámicas de precisión y puntería, elongación y salud corporal, autonomía en la vida diaria (habitación, ropa, pertenencias, espacios compartidos) y regulación emocional ante desafíos de juego.`;
  } else if (grupoLower.includes('emprendedores')) {
    contextoGrupo = `* ÁREA / IDENTIDAD: **Emprendedores**.
* EJES CENTRALES: Formación laboral, fraccionado, rotulado, gestión de stock, comercialización, manejo de dinero y billeteras virtuales, atención al cliente.`;
  } else if (grupoLower.includes('promotores')) {
    contextoGrupo = `* ÁREA / IDENTIDAD: **Promotores**.
* EJES CENTRALES: Promoción y defensa de derechos de personas con discapacidad, comunicación comunitaria, oratoria y liderazgo social.`;
  } else {
    contextoGrupo = `* ÁREA / IDENTIDAD: **Centro de Día**.
* EJES CENTRALES: Desarrollo integral, habilidades de autonomía personal, socialización, actividad física adaptada, expresión artística y vinculación comunitaria.`;
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
   - Si el joven pertenece a **Buenos Mozos**: Toda la narrativa de talleres debe enfocarse en Catering, Servicio de Salón, Cocina, Pastelería y Buenas Prácticas de Manufactura (BPM).
   - Si el joven pertenece a **Atrapa Sueños**: Enfócate en producción textil, manualidades, relajación y calma, motricidad fina y construcción lúdica.
   - Si pertenece a **Manos Verdes / Huerta**: Enfócate en la huerta, vivero, aromáticas, plantas, yoga y aire libre.
   - Si pertenece a **Deporte y Vida Independiente**: Enfócate en circuitos motores, precisión, orden de habitación, ropa y autonomía en el hogar.
   - **NUNCA le atribuyas talleres ajenos a su grupo o que no figuren en sus datos**.
3. **RESPETO POR LA CONDICIÓN MOTRIZ Y REQUERIMIENTOS DE APOYO**:
   - Si el joven asiste en silla de ruedas o tiene apoyo físico total, jamás hables de caminatas a pie o desplazamientos autónomos. Describe paseos asistidos, control postural y traslados con apoyo.
4. **ENFOQUE POSITIVO Y EN TIEMPO PRESENTE**:
   - Todo debe estar redactado en tiempo **PRESENTE** (ej: "asiste", "participa", "elabora", "atiende", "se desenvuelve").
   - **PROHIBIDAS FRASES NEGATIVAS O DE FALTA DE DATOS**: Jamás escribas "no se registran datos", "aunque no hay registros", "sin novedades". Siempre formula en positivo ("se continúa trabajando activamente en...", "avanza de manera progresiva con el acompañamiento de facilitadores...").
5. **ESTILO NARRATIVO**:
   - Redacta párrafos integrados de 4 a 6 líneas cada uno, fluidos, cálidos y con rigor técnico. Cero listas o viñetas.

## FORMATO DE SALIDA (JSON ESTRICTO)
Responde con un objeto JSON con las siguientes 12 claves:

{
  "metaAlcanzada": "Cómo ${jovenNombre} avanza activamente hacia sus metas y sueños (${pcpSuenos}), relacionándolos de manera concreta y personalizada con las responsabilidades y aprendizajes que desempeña en ${grupoNombre}.",
  "participacion": "Narrativa sobre su asistencia, constancia y nivel de implicación en las propuestas de ${grupoNombre}. Detalla de manera fiel los apoyos pedagógicos o emocionales que le brindan los facilitadores en su rutina cotidiana.",
  "integracionRelaciones": "Sus vínculos afectivos y sociales con pares y facilitadores. Describe cómo se comunica, su trato con compañeros y con su referente, y su participación en las dinámicas grupales del taller.",
  "actividadesRelacionadas": "Detalle técnico, rico y específico de las tareas que ${jovenNombre} efectivamente realiza en sus talleres este trimestre (recetas específicas, técnicas, herramientas, productos o habilidades que constan en sus registros).",
  "vidaIndependiente": "Autonomía funcional adaptada a su grupo: si es Buenos Mozos, detalla el cumplimiento de BPM (uso de cofia, delantal, sanitización) y orden en la cocina/salón; si es Centro de Día o vida en el hogar, describe hábitos de higiene, orden de habitación, pertenencias y colaboración cotidiana.",
  "habilidadesViajar": "Desplazamientos y actividades en espacios exteriores adaptadas a su realidad: logística y traslado en camioneta para servicios (en catering), caminatas, circuitos o recorridos asistidos en el predio.",
  "desarrolloPersonal": "Capacidad de aprendizaje, concentración, motricidad fina/gruesa, iniciativa y forma en que asimila las indicaciones y sugerencias de las facilitadoras para perfeccionar su quehacer.",
  "metasDeportivas": "Participación en actividad física adaptada: rutinas de movimiento, elongación, hora saludable o juegos deportivos, destacando el disfrute y la autorregulación durante el juego.",
  "metasSociales": "Participación en eventos compartidos, festejos temáticos de cumpleaños, dinámicas colectivas o celebraciones institucionales mencionadas en el trimestre, promoviendo el compañerismo y la convivencia.",
  "dimensionesCalidadVida": "Fortalecimiento de dimensiones de calidad de vida: bienestar emocional (espacios de contención, diálogo, tolerancia ante correcciones), autodeterminación (elección de gustos, roles asumidos) e inclusión social.",
  "actividadesComplementarias": "Participación en actividades recreativas, expresivas, artísticas, culturales o de estímulo creativo compartidas con el grupo.",
  "mejoraCalidadVida": "Conclusión integradora sobre la evolución favorable de ${jovenNombre} a lo largo del trimestre, reflejando su bienestar anímico, salud física preventiva y el valor del acompañamiento institucional."
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

  // 1. Metas alcanzadas
  const metaAlcanzada = `${jovenNombre} continúa avanzando con constancia hacia su meta personal de: "${pcpSuenos}". Durante este trimestre, su participación activa en ${grupoNombre} le permite consolidar habilidades prácticas y de convivencia que fortalecen su autonomía y su proyecto de vida.`;

  // 2. Participación
  let participacion = `${jovenNombre} mantiene una asistencia regular y una actitud predispuesta en las actividades institucionales de ${grupoNombre}. `;
  if (obsLower.includes('consignas') || obsLower.includes('acompañamiento')) {
    participacion += `Escucha atentamente las orientaciones de las facilitadoras y participa con genuino interés en cada dinámica propuesta.`;
  } else {
    participacion += `Recibe orientación y apoyo por parte de los facilitadores, mostrando compromiso y disfrute en el desarrollo de las tareas cotidianas.`;
  }

  // 3. Integración y relaciones
  let integracionRelaciones = `${jovenNombre} sostiene un vínculo respetuoso, afectuoso y cordial tanto con sus compañeros como con sus facilitadores. `;
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
    actividadesRelacionadas = `${jovenNombre} participa activamente en sus talleres asignados: ${descripcionesTalleres}. Evidencia dedicación e interés en cada propuesta, afianzando sus competencias prácticas con el acompañamiento del equipo.`;
  } else if (isCatering) {
    actividadesRelacionadas = `En el área gastronómica y de catering participa activamente en la elaboración de productos, preparación de mesas, atención a comensales y tareas de cocina, afianzando destrezas prácticas y de manipulación higiénica de alimentos.`;
  } else {
    actividadesRelacionadas = `En sus talleres cotidianos realiza actividades formativas y recreativas orientadas a afianzar destrezas funcionales y de motricidad, mostrando predisposición y compromiso ante cada consigna.`;
  }

  // 5. Vida independiente
  let vidaIndependiente = '';
  if (isCatering) {
    vidaIndependiente = `${jovenNombre} incorpora de manera sostenida las Buenas Prácticas de Manufactura (BPM), cumpliendo con el uso de cofia, delantal y sanitización constante de manos. Desarrolla autonomía en el cuidado y orden de los elementos de trabajo en la cocina y salón.`;
  } else if (isWheelchairUser) {
    vidaIndependiente = `En el ámbito de la autonomía y rutinas de cuidado personal, se trabaja con apoyos adaptados en momentos de alimentación, descanso y orden de pertenencias, promoviendo su participación activa y manifestación de preferencias.`;
  } else {
    vidaIndependiente = `En el área de vida independiente, ${jovenNombre} fortalece hábitos de autonomía cotidiana, colaborando en el cuidado y orden de sus pertenencias personales y en el mantenimiento de los espacios comunes de la institución.`;
  }

  // 6. Habilidades para viajar / espacios exteriores
  let habilidadesViajar = '';
  if (isWheelchairUser) {
    habilidadesViajar = `Participa de paseos asistidos y actividades en espacios exteriores dentro del predio institucional con traslados adaptados en su silla de ruedas, disfrutando del contacto con el entorno natural.`;
  } else if (isCatering) {
    habilidadesViajar = `Colabora activamente en la logística y traslado de insumos para servicios de catering, participando en la carga y descarga ordenada de materiales y vajilla en la camioneta institucional.`;
  } else {
    habilidadesViajar = `Se desenvuelve con seguridad en desplazamientos dentro de la institución y en actividades al aire libre, respetando pautas de organización, hidratación y cuidado del entorno.`;
  }

  // 7. Desarrollo personal
  const desarrolloPersonal = `${jovenNombre} demuestra buena concentración, iniciativa y destreza en la realización de tareas prácticas. Asimila favorablemente las sugerencias de las facilitadoras, buscando superarse y resolver situaciones con creciente autonomía.`;

  // 8. Metas deportivas
  let metasDeportivas = '';
  if (isWheelchairUser) {
    metasDeportivas = `En la dimensión física participa de rutinas de movilidad articular adaptada, elongación y dinámicas de movimiento asistido, favoreciendo su control postural y bienestar corporal.`;
  } else {
    metasDeportivas = `Participa con entusiasmo en propuestas de actividad física, elongación y hora saludable, disfrutando del movimiento y afianzando la autorregulación y el compañerismo durante dinámicas lúdicas.`;
  }

  // 9. Metas sociales
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


