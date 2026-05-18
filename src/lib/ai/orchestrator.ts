import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import nunjucks from 'nunjucks';
import fs from 'node:fs';
import path from 'node:path';

import { generateReportJSON } from './providers/router';
import { getInstitutionalConfig } from '../docs/constants';
import { getEditable, getEditableMapByPrefix } from '@/lib/editable';
import { participacionCirculoOptions } from '@/lib/form/options';

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const reportSchema = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src/lib/schemas/report.schema.json'), 'utf8')
);
const formSchema = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src/lib/schemas/form.schema.json'), 'utf8')
);

const validateReport = ajv.compile(reportSchema);
const validateForm = ajv.compile(formSchema);

export interface OrchestratorOptions {
  iaEnabled: boolean;
  iaLocalOnly: boolean;
  provider: string;
  model: string;
  temperature: number;
}

export async function generateReport(formData: unknown, options: OrchestratorOptions) {
  if (!validateForm(formData)) {
    throw new Error('Formulario inválido: ' + ajv.errorsText(validateForm.errors));
  }

  const normalized = normalizeInput(formData as any, options);
  const originalForm = formData as any; // Guardar referencia al formulario original para acceso a datos específicos

  if (options.iaEnabled) {
    try {
      // Títulos/encabezados editables para prompts/plantillas (si existen)
      const tituloObjetivo = (await getEditable('sec.2.titulo')) || 'Objetivo del proceso';
      const tituloEscucha = (await getEditable('sec.3.titulo')) || 'Escucha activa y autodeterminación';
      const jsonStr = await generateReportJSON({ ...normalized, _editable: { tituloObjetivo, tituloEscucha } }, {
        provider: (options.provider || 'openai') as any,
        model: options.model,
        temperature: options.temperature ?? 0
      });
      let parsed = JSON.parse(jsonStr);
      parsed = restoreRealNameInText(parsed, originalForm?.datosGenerales?.nombreCompleto || '');
      mergeDatosGeneralesFromForm(parsed, originalForm);
      if (!validateReport(parsed)) {
        throw new Error('Salida IA inválida: ' + ajv.errorsText(validateReport.errors));
      }
      const html = await renderDeterministic(parsed);
      const markdown = await renderMarkdown(parsed, originalForm);
      return { report: parsed, html, markdown, used: 'ia' as const };
    } catch (err) {
      // Fallback determinístico
      let fallback = renderFromForm(normalized);
      fallback = restoreRealNameInText(fallback, originalForm?.datosGenerales?.nombreCompleto || '');
      mergeDatosGeneralesFromForm(fallback, originalForm);
      if (!validateReport(fallback)) {
        throw new Error('Fallback determinístico inválido: ' + ajv.errorsText(validateReport.errors));
      }
      const html = await renderDeterministic(fallback);
      const markdown = await renderMarkdown(fallback, originalForm);
      return { report: fallback, html, markdown, used: 'fallback' as const, error: String(err) };
    }
  }

  // IA deshabilitada → determinístico
  let fallback = renderFromForm(normalized);
  fallback = restoreRealNameInText(fallback, originalForm?.datosGenerales?.nombreCompleto || '');
  mergeDatosGeneralesFromForm(fallback, originalForm);
  if (!validateReport(fallback)) {
    throw new Error('Fallback determinístico inválido: ' + ajv.errorsText(validateReport.errors));
  }
  const html = await renderDeterministic(fallback);
  const markdown = await renderMarkdown(fallback, originalForm);
  return { report: fallback, html, markdown, used: 'fallback' as const };
}

function normalizeInput(form: any, options: OrchestratorOptions) {
  const clone = JSON.parse(JSON.stringify(form));
  if (!options.iaLocalOnly) {
    // Minimizar PII: opcionalmente pseudonimizar
    if (clone?.datosGenerales?.nombreCompleto) clone.datosGenerales.nombreCompleto = 'Persona';
    if (clone?.datosGenerales?.dni) clone.datosGenerales.dni = null;
  }
  return clone;
}

export async function renderDeterministic(report: any) {
  const env = nunjucks.configure(path.join(process.cwd(), 'src/lib/templates'), { autoescape: true });
  const institutional = getInstitutionalConfig();
  
  let headerLogoBase64 = '';
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'header-logo.jpg');
    if (fs.existsSync(logoPath)) {
      const buffer = fs.readFileSync(logoPath);
      headerLogoBase64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
    }
  } catch (e) {
    console.error('Error al leer el logo del membrete:', e);
  }

  // Mezclar títulos editables desde DB (si existen)
  try {
    const editable = await getEditableMapByPrefix('report.title.');
    const titles = { ...institutional.titles } as any;
    if (editable['report.title.main']) titles.mainTitle = editable['report.title.main'];
    if (editable['report.title.objetivo']) titles.objetivo = editable['report.title.objetivo'];
    if (editable['report.title.escucha']) titles.escucha = editable['report.title.escucha'];
    if (editable['report.title.estadoEmocional']) titles.estadoEmocional = editable['report.title.estadoEmocional'];
    if (editable['report.title.apoyosAjustes']) titles.apoyosAjustes = editable['report.title.apoyosAjustes'];
    if (editable['report.title.evaluacion']) titles.evaluacion = editable['report.title.evaluacion'];
    if (editable['report.title.logros']) titles.logros = editable['report.title.logros'];
    if (editable['report.title.suenosMetas']) titles.suenosMetas = editable['report.title.suenosMetas'];
    if (editable['report.title.circuloApoyo']) titles.circuloApoyo = editable['report.title.circuloApoyo'];
    if (editable['report.title.sugerencias']) titles.sugerencias = editable['report.title.sugerencias'];
    const institutionalOver = { ...institutional, titles };
    const html = env.render('report.njk', { report, institutional: institutionalOver, headerLogoBase64 });
    return html;
  } catch {
    const html = env.render('report.njk', { report, institutional, headerLogoBase64 });
    return html;
  }
}

export async function renderMarkdown(report: any, originalForm?: any) {
  const institutional = getInstitutionalConfig();
  // Mezclar títulos editables desde DB (si existen)
  try {
    const editable = await getEditableMapByPrefix('report.title.');
    const titles = { ...institutional.titles } as any;
    if (editable['report.title.main']) titles.mainTitle = editable['report.title.main'];
    if (editable['report.title.objetivo']) titles.objetivo = editable['report.title.objetivo'];
    if (editable['report.title.escucha']) titles.escucha = editable['report.title.escucha'];
    if (editable['report.title.estadoEmocional']) titles.estadoEmocional = editable['report.title.estadoEmocional'];
    if (editable['report.title.apoyosAjustes']) titles.apoyosAjustes = editable['report.title.apoyosAjustes'];
    if (editable['report.title.evaluacion']) titles.evaluacion = editable['report.title.evaluacion'];
    if (editable['report.title.logros']) titles.logros = editable['report.title.logros'];
    if (editable['report.title.suenosMetas']) titles.suenosMetas = editable['report.title.suenosMetas'];
    if (editable['report.title.circuloApoyo']) titles.circuloApoyo = editable['report.title.circuloApoyo'];
    if (editable['report.title.sugerencias']) titles.sugerencias = editable['report.title.sugerencias'];
    return renderMarkdownText(report, { ...institutional, titles }, originalForm);
  } catch {
    return renderMarkdownText(report, institutional, originalForm);
  }
}

function renderMarkdownText(report: any, institutional: any, originalForm?: any) {
  const lines: string[] = [];
  
  const titleWithNumber = (title: string, num: string) => {
    if (/^\d+\./.test(title)) return title;
    return `${num} ${title}`;
  };
  
  // Título principal
  lines.push(`**${institutional.titles.mainTitle}**`);
  lines.push('');
  lines.push('(Modelo Social de la Discapacidad – Calidad de Vida – Planificación Centrada en la Persona)');
  lines.push('');
  
  // 1. DATOS GENERALES
  lines.push('**1. DATOS GENERALES**');
  lines.push('');
  lines.push(`Nombre completo: ${report.datosGenerales.nombreCompleto}`);
  lines.push('');
  if (report.datosGenerales.dni) {
    lines.push(`DNI: ${report.datosGenerales.dni}`);
    lines.push('');
  }
  lines.push(`Período evaluado: ${report.datosGenerales.periodo}`);
  lines.push('');
  
  // Participación del círculo de apoyo - usar datos del formulario original si está disponible
  let participacionCirculo: string | null = null;
  let miembrosCirculo: string[] = [];
  
  if (originalForm?.circuloApoyo) {
    participacionCirculo = originalForm.circuloApoyo.participacion;
    if (originalForm.circuloApoyo.miembros && Array.isArray(originalForm.circuloApoyo.miembros)) {
      miembrosCirculo = originalForm.circuloApoyo.miembros
        .filter((m: any) => m?.nombre && m?.vinculo)
        .map((m: any) => `${m.nombre} (${m.vinculo})`);
    }
  } else {
    // Fallback: intentar extraer del reporte procesado
    const participacionText = report.secciones.circuloApoyo?.find((f: any) => 
      f.texto && (f.texto.toLowerCase().includes('sí') || f.texto.toLowerCase().includes('si') || 
      f.texto.toLowerCase().includes('participación'))
    );
    if (participacionText) {
      participacionCirculo = participacionText.texto.includes('Sí') || participacionText.texto.includes('Si') ? 'Sí' : null;
    }
    miembrosCirculo = report.datosGenerales.circuloApoyo || [];
  }
  
  const tieneParticipacion = participacionCirculo && 
    (participacionCirculo.toLowerCase().includes('sí') || 
     participacionCirculo.toLowerCase().includes('si') ||
     (participacionCirculo !== participacionCirculoOptions[3] && // "Inexistente"
      participacionCirculo !== participacionCirculoOptions[4])); // "No se convocó adecuadamente"
  
  lines.push(`Participación del círculo de apoyo (Sí/No): ${tieneParticipacion ? 'Si' : 'No'}`);
  lines.push('');
  if (miembrosCirculo.length > 0) {
    lines.push(`Personas que lo integran: ${miembrosCirculo.join(', ')}`);
    lines.push('');
  }
  
  // 2. OBJETIVO DEL PROCESO
  lines.push(`**${titleWithNumber(institutional.titles.objetivo, '2.').toUpperCase()}**`);
  lines.push('');
  if (report.secciones.objetivo && report.secciones.objetivo.length > 0) {
    const text = report.secciones.objetivo
      .map((frag: any) => frag.texto)
      .filter((t: string) => t && t !== 'No informado')
      .join(' ');
    lines.push(text || 'No informado');
  } else {
    lines.push('No informado');
  }
  lines.push('');
  
  // 3. ESCUCHA ACTIVA Y AUTODETERMINACIÓN
  lines.push(`**${titleWithNumber(institutional.titles.escucha, '3.').toUpperCase()}**`);
  lines.push('');
  if (report.secciones.escucha && report.secciones.escucha.length > 0) {
    const text = report.secciones.escucha
      .map((frag: any) => frag.texto)
      .filter((t: string) => t && t !== 'No informado')
      .join(' ');
    lines.push(text || 'No informado');
  } else {
    lines.push('No informado');
  }
  lines.push('');
  
  // 4. ESTADO EMOCIONAL Y BIENESTAR SUBJETIVO
  lines.push(`**${titleWithNumber(institutional.titles.estadoEmocional, '4.').toUpperCase()}**`);
  lines.push('');
  if (report.secciones.estadoEmocional && report.secciones.estadoEmocional.length > 0) {
    const text = report.secciones.estadoEmocional
      .map((frag: any) => frag.texto)
      .filter((t: string) => t && t !== 'No informado')
      .join(' ');
    lines.push(text || 'No informado');
  } else {
    lines.push('No informado');
  }
  lines.push('');
  
  // 5. APOYOS Y AJUSTES BRINDADOS
  lines.push(`**${titleWithNumber(institutional.titles.apoyosAjustes, '5.').toUpperCase()}**`);
  lines.push('');
  if (report.secciones.apoyosAjustes && report.secciones.apoyosAjustes.length > 0) {
    const text = report.secciones.apoyosAjustes
      .map((frag: any) => frag.texto)
      .filter((t: string) => t && t !== 'No informado')
      .join(' ');
    lines.push(text || 'No informado');
  } else {
    lines.push('No informado');
  }
  lines.push('');
  
  // 6. EVALUACIÓN DE LAS DIMENSIONES DE CALIDAD DE VIDA
  lines.push(`**${titleWithNumber(institutional.titles.evaluacion, '6.').toUpperCase()}**`);
  lines.push('');
  lines.push('Usar escala: ✔ Mejoró / ➖ Mantuvo / ❌ Dificultad');
  lines.push('');
  lines.push('|Dimensión|Valoración|Comentario breve|');
  lines.push('| - | - | - |');
  if (report.evaluacionDimensiones && report.evaluacionDimensiones.length > 0) {
    report.evaluacionDimensiones.forEach((dim: any) => {
      const evolucion = dim.evolucion || '⏳';
      const comentario = dim.comentario || '';
      lines.push(`|${dim.dimension}|${evolucion} |${comentario}|`);
    });
  }
  lines.push('');
  
  // 7. LOGROS DESTACADOS Y HABILIDADES ADQUIRIDAS
  lines.push(`**${titleWithNumber(institutional.titles.logros, '7.').toUpperCase()}**`);
  lines.push('');
  
  // Organizar logros en subcategorías (basado en el contenido)
  const logrosTextos = (report.secciones.logros || []).map((f: any) => f.texto).filter((t: string) => t && t !== 'No informado');
  
  // Intentar categorizar los logros por palabras clave
  const habilidadesPracticas: string[] = [];
  const habilidadesEmocionales: string[] = [];
  const participacionDecisiones: string[] = [];
  const nuevasExperiencias: string[] = [];
  
  logrosTextos.forEach((texto: string) => {
    const lower = texto.toLowerCase();
    if (lower.includes('autónom') || lower.includes('manipular') || lower.includes('sujetar') || 
        lower.includes('hidratar') || lower.includes('independencia') || lower.includes('cuchara') || lower.includes('vaso') ||
        lower.includes('funcional') || lower.includes('práctica')) {
      habilidadesPracticas.push(texto);
    } else if (lower.includes('emocional') || lower.includes('tolerancia') || lower.includes('regulación') ||
               lower.includes('social') || lower.includes('vínculo') || lower.includes('relación') || lower.includes('convivencia')) {
      habilidadesEmocionales.push(texto);
    } else if (lower.includes('preferencia') || lower.includes('elección') || lower.includes('decisión') ||
               lower.includes('manifestar') || lower.includes('expresar')) {
      participacionDecisiones.push(texto);
    } else if (lower.includes('salida') || lower.includes('evento') || lower.includes('experiencia') ||
               lower.includes('participó') || lower.includes('disfrute') || lower.includes('boliche') ||
               lower.includes('taller') || lower.includes('actividad')) {
      nuevasExperiencias.push(texto);
    } else {
      habilidadesPracticas.push(texto);
    }
  });

  if (habilidadesPracticas.length > 0) {
    lines.push('Habilidades prácticas o funcionales');
    lines.push('');
    lines.push(habilidadesPracticas.join(' '));
    lines.push('');
  }

  if (habilidadesEmocionales.length > 0) {
    lines.push('Habilidades emocionales y sociales');
    lines.push('');
    lines.push(habilidadesEmocionales.join(' '));
    lines.push('');
  }

  if (participacionDecisiones.length > 0) {
    lines.push('Participación en decisiones');
    lines.push('');
    lines.push(participacionDecisiones.join(' '));
    lines.push('');
  }

  if (nuevasExperiencias.length > 0) {
    lines.push('Nuevas experiencias u oportunidades aprovechadas');
    lines.push('');
    lines.push(nuevasExperiencias.join(' '));
    lines.push('');
  }
  
  if (logrosTextos.length === 0) {
    lines.push('No informado');
    lines.push('');
  }
  
  // 8. SUEÑOS Y METAS A FUTURO
  lines.push(`**${titleWithNumber(institutional.titles.suenosMetas, '8.').toUpperCase()}**`);
  lines.push('');
  if (report.secciones.suenosMetas && report.secciones.suenosMetas.length > 0) {
    const text = report.secciones.suenosMetas
      .map((frag: any) => frag.texto)
      .filter((t: string) => t && t !== 'No informado')
      .join(' ');
    lines.push(text || 'No informado');
  } else {
    lines.push('No informado');
  }
  lines.push('');
  
  // 9. VALORACIÓN DEL CÍRCULO DE APOYO
  lines.push(`**${titleWithNumber(institutional.titles.circuloApoyo, '9.').toUpperCase()}**`);
  lines.push('');
  if (report.secciones.circuloApoyo && report.secciones.circuloApoyo.length > 0) {
    const text = report.secciones.circuloApoyo
      .map((frag: any) => frag.texto)
      .filter((t: string) => t && t !== 'No informado' && !t.toLowerCase().includes('no se convocó'))
      .join(' ');
    lines.push(text || 'No informado');
  } else {
    lines.push('No informado');
  }
  lines.push('');
  
  // 10. SUGERENCIAS O RECOMENDACIONES
  lines.push(`**${titleWithNumber(institutional.titles.sugerencias, '10.').toUpperCase()}**.`);
  lines.push('');
  if (report.secciones.sugerencias && report.secciones.sugerencias.length > 0) {
    report.secciones.sugerencias.forEach((frag: any) => {
      if (frag.texto && frag.texto !== 'No informado') {
        lines.push(frag.texto);
        lines.push('');
      }
    });
  } else {
    lines.push('No informado');
    lines.push('');
  }
  
  return lines.join('\n');
}

function mergeDatosGeneralesFromForm(report: any, originalForm?: any) {
  if (!originalForm) return;
  report.datosGenerales = report.datosGenerales || {};
  const target = report.datosGenerales;
  const formDG = originalForm?.datosGenerales || {};
  const formCirculo = originalForm?.circuloApoyo || {};
  
  // Siempre restaurar/sobrescribir los datos reales del joven desde el formulario original
  if (formDG.nombreCompleto) target.nombreCompleto = formDG.nombreCompleto;
  if (formDG.dni !== undefined) target.dni = formDG.dni;
  if (formDG.periodo) target.periodo = formDG.periodo;
  
  if (formDG.numeroLegajo) target.numeroLegajo = formDG.numeroLegajo;
  if (formDG.facilitadorNombre) target.facilitadorNombre = formDG.facilitadorNombre;
  if (formDG.obraSocial) target.obraSocial = formDG.obraSocial;
  if (formDG.fotoJoven) target.fotoJoven = formDG.fotoJoven;
  const miembros = Array.isArray(formCirculo?.miembros) ? formCirculo.miembros : [];
  if (!target.circuloApoyo || target.circuloApoyo.length === 0) {
    target.circuloApoyo = miembros.map((m: any) => m?.nombre || 'No informado');
  }
  target.circuloApoyoDetalle = miembros
    .filter((m: any) => m?.nombre || m?.vinculo)
    .map((m: any) => ({
      nombre: m?.nombre || 'No informado',
      vinculo: m?.vinculo || 'No informado'
    }));
  target.circuloApoyoParticipacion = formCirculo?.participacion || target.circuloApoyoParticipacion || null;
  target.circuloApoyoInvolucramiento = formCirculo?.gradoInvolucramiento || target.circuloApoyoInvolucramiento || null;
  const valoracion = formCirculo?.valoracion || {};
  target.circuloApoyoValoracion = {
    ...(target.circuloApoyoValoracion || {}),
    ...(valoracion?.grupal ? { grupal: valoracion.grupal } : {}),
    ...(valoracion?.individual ? { individual: valoracion.individual } : {})
  };
}


function renderFromForm(form: any) {
  // Construcción 100% extractiva a la estructura de salida
  const miembrosCirculo = Array.isArray(form?.circuloApoyo?.miembros) ? form.circuloApoyo.miembros : [];
  const datosGenerales = {
    nombreCompleto: form?.datosGenerales?.nombreCompleto || 'No informado',
    dni: form?.datosGenerales?.dni || null,
    periodo: form?.datosGenerales?.periodo || 'No informado',
    metaSueño: form?.datosGenerales?.metaSueño || null,
    numeroLegajo: form?.datosGenerales?.numeroLegajo || null,
    facilitadorNombre: form?.datosGenerales?.facilitadorNombre || null,
    obraSocial: form?.datosGenerales?.obraSocial || null,
    fotoJoven: form?.datosGenerales?.fotoJoven || null,
    circuloApoyo: miembrosCirculo.map((m: any) => m?.nombre || 'No informado'),
    circuloApoyoDetalle: miembrosCirculo
      .filter((m: any) => m?.nombre || m?.vinculo)
      .map((m: any) => ({ nombre: m?.nombre || 'No informado', vinculo: m?.vinculo || 'No informado' })),
    circuloApoyoParticipacion: form?.circuloApoyo?.participacion || null,
    circuloApoyoInvolucramiento: form?.circuloApoyo?.gradoInvolucramiento || null,
    circuloApoyoValoracion: {
      grupal: form?.circuloApoyo?.valoracion?.grupal || null,
      individual: form?.circuloApoyo?.valoracion?.individual || null
    }
  };

  const secciones: any = {
    datosGenerales: [],
    objetivo: [
      ...toFragments(
        [
          // El texto marco debe aparecer siempre. Si no está, usar el texto institucional por defecto
          form?.objetivo?.textoMarco || 'Se acompaña al joven en la construcción y logro de sus metas personales, considerando las dimensiones de su calidad de vida y brindando los apoyos necesarios para el desarrollo de habilidades como la toma de decisiones, la planificación, la autorregulación emocional y la participación activa. Este proceso se realiza de manera progresiva, respetando sus tiempos, promoviendo su autonomía y fortaleciendo su protagonismo en la toma de decisiones sobre su vida.',
          ...(form?.objetivo?.focos || []),
          ...(form?.objetivo?.estrategias || [])
        ],
        ['objetivo.textoMarco', 'objetivo.focos[]', 'objetivo.estrategias[]'],
        { ...(form?.objetivo?.focosNotas || {}), ...(form?.objetivo?.estrategiasNotas || {}) }
      )
    ],
    abordaje: toFragments(
      [
        ...((form?.abordaje?.enfoque || []).map((x: string) => `Abordaje centrado en: ${x}`)),
        form?.abordaje?.descripcion || ''
      ],
      ['abordaje.enfoque[]', 'abordaje.descripcion']
    ),
    escucha: [
      ...toFragments(
        [
          ...(form?.escucha?.preferencias || []),
          ...(form?.escucha?.areasInteres || []),
          form?.escucha?.nivelAutonomia || 'No informado'
        ],
        ['escucha.preferencias[]', 'escucha.areasInteres[]', 'escucha.nivelAutonomia'],
        { ...(form?.escucha?.preferenciasNotas || {}), ...(form?.escucha?.areasInteresNotas || {}) }
      )
    ],
    estadoEmocional: [
      ...toFragments(
        [
          ...(form?.estadoEmocional?.prevalencias || []),
          ...(form?.estadoEmocional?.expresionGeneral || []),
          ...(form?.estadoEmocional?.vinculoEntorno || []),
          ...(form?.estadoEmocional?.bienestarSubjetivo || []),
          ...(form?.estadoEmocional?.regulacion || []),
          ...(form?.estadoEmocional?.situacionesInfluyen || []),
          ...(form?.estadoEmocional?.estrategias || []),
          ...(form?.estadoEmocional?.tecnicasAutorregulacion || [])
        ],
        [
          'estadoEmocional.prevalencias[]',
          'estadoEmocional.expresionGeneral[]',
          'estadoEmocional.vinculoEntorno[]',
          'estadoEmocional.bienestarSubjetivo[]',
          'estadoEmocional.regulacion[]',
          'estadoEmocional.situacionesInfluyen[]',
          'estadoEmocional.estrategias[]',
          'estadoEmocional.tecnicasAutorregulacion[]'
        ],
        {
          ...(form?.estadoEmocional?.prevalenciasNotas || {}),
          ...(form?.estadoEmocional?.expresionGeneralNotas || {}),
          ...(form?.estadoEmocional?.vinculoEntornoNotas || {}),
          ...(form?.estadoEmocional?.bienestarSubjetivoNotas || {}),
          ...(form?.estadoEmocional?.regulacionNotas || {}),
          ...(form?.estadoEmocional?.situacionesInfluyenNotas || {}),
          ...(form?.estadoEmocional?.estrategiasNotas || {}),
          ...(form?.estadoEmocional?.tecnicasAutorregulacionNotas || {})
        }
      )
    ],
    apoyosAjustes: [
      ...toFragments(
        [
          ...(form?.apoyosAjustes?.apoyos || []),
          ...(form?.apoyosAjustes?.ajustes || []),
          ...(form?.apoyosAjustes?.contextos || [])
        ],
        ['apoyosAjustes.apoyos[]', 'apoyosAjustes.ajustes[]', 'apoyosAjustes.contextos[]'],
        {
          ...(form?.apoyosAjustes?.apoyosNotas || {}),
          ...(form?.apoyosAjustes?.ajustesNotas || {}),
          ...(form?.apoyosAjustes?.contextosNotas || {})
        }
      )
    ],
    logros: [
      ...toFragments(
        [
          ...(form?.logros?.items || []),
          // Integrar experiencias significativas (7.2) como parte de logros del período
          ...(form?.experiencias?.tiposVividas || []),
          ...(form?.experiencias?.tipoApoyo || []),
          ...(form?.experiencias?.motivosNoParticipa || []),
          form?.experiencias?.detalle || ''
        ],
        ['logros[]', 'experiencias.tiposVividas[]', 'experiencias.tipoApoyo[]', 'experiencias.motivosNoParticipa[]', 'experiencias.detalle'],
        {
          ...(form?.logrosNotas || {}),
          ...(form?.experiencias?.tiposVividasNotas || {}),
          ...(form?.experiencias?.tipoApoyoNotas || {}),
          ...(form?.experiencias?.motivosNoParticipaNotas || {})
        }
      )
    ],
    suenosMetas: [
      ...toFragments(
        [
          ...(form?.suenosMetas?.metas || []),
          ...(form?.suenosMetas?.recursosNecesarios || [])
        ],
        ['suenosMetas.metas[]', 'suenosMetas.recursosNecesarios[]'],
        {
          ...(form?.suenosMetas?.metasNotas || {}),
          ...(form?.suenosMetas?.recursosNecesariosNotas || {})
        }
      )
    ],
    circuloApoyo: toFragments(
      [
        // Filtrar "No se convocó adecuadamente" - es solo para reflexión interna, no aparece en informe
        ...(form?.circuloApoyo?.participacion && form.circuloApoyo.participacion !== participacionCirculoOptions[4] ? [form.circuloApoyo.participacion] : []),
        ...(form?.circuloApoyo?.acompanaronMayorCompromiso || []),
        ...(form?.circuloApoyo?.respetoDecisiones || []),
        form?.circuloApoyo?.gradoInvolucramiento || 'No informado',
        form?.circuloApoyo?.valoracion?.grupal ? `Participación grupal: ${form?.circuloApoyo?.valoracion?.grupal}` : '',
        form?.circuloApoyo?.valoracion?.individual ? `Participación individual: ${form?.circuloApoyo?.valoracion?.individual}` : '',
        ...((form?.circuloApoyo?.miembros || []).map((m: any) => `${m?.nombre || 'No informado'} (${m?.vinculo || 'No informado'})`))
      ],
      ['circuloApoyo.participacion', 'circuloApoyo.acompanaronMayorCompromiso[]', 'circuloApoyo.respetoDecisiones[]', 'circuloApoyo.gradoInvolucramiento', 'circuloApoyo.valoracion.grupal', 'circuloApoyo.valoracion.individual', 'circuloApoyo.miembros[]']
    ),
    sugerencias: [
      ...toFragments(
        [
          ...((form?.sugerencias?.areasPrioritarias || [])),
          ...((form?.sugerencias?.recomendaciones || []))
        ],
        ['sugerencias.areasPrioritarias[]', 'sugerencias.recomendaciones[]'],
        {
          ...(form?.sugerencias?.areasPrioritariasNotas || {}),
          ...(form?.sugerencias?.recomendacionesNotas || {})
        }
      )
    ]
  };

  const evaluacionDimensiones = (form?.evaluacion?.dimensiones || []).map((d: any) => ({
    dimension: d?.dimension || 'No informado',
    evolucion: d?.evolucion || '⏳',
    comentario: d?.observacion || null
  }));

  const trazabilidad: Record<string, string[]> = {};
  // Simple mapeo: para cada fragmento, conservar key sugerida
  Object.entries(secciones).forEach(([clave, lista]: any) => {
    (lista as any[]).forEach((frag, idx) => {
      const key = `${clave}[${idx}]`;
      if (!trazabilidad[key]) trazabilidad[key] = [];
      if (frag.fuentes && frag.fuentes.length > 0) {
        trazabilidad[key].push(...frag.fuentes);
      }
    });
  });

  return {
    datosGenerales,
    secciones,
    evaluacionDimensiones,
    trazabilidad
  };
}

function toFragments(values: any[], fuentesKeys: string[], notes?: Record<string, string>) {
  const fragments: { id: string; texto: string; fuentes: string[] }[] = [];
  values.forEach((val, i) => {
    let texto = (val === undefined || val === null || val === '') ? 'No informado' : String(val);
    const fuenteKey = fuentesKeys[Math.min(i, fuentesKeys.length - 1)];
    // Si hay una nota para este valor, agregarla
    if (notes && typeof val === 'string' && notes[val]) {
      texto = `${texto}: ${notes[val]}`;
    }
    const id = `${fuenteKey.replace(/[^a-zA-Z0-9_.\-]/g, '-')}-${i}`;
    fragments.push({ id, texto, fuentes: [fuenteKey] });
  });
  return fragments;
}

function restoreRealNameInText(obj: any, realName: string) {
  if (!realName || realName === 'Persona') return obj;
  
  const firstName = realName.split(' ')[0];
  
  const replaceName = (text: string): string => {
    if (!text) return text;
    
    // Reemplazar la palabra "Persona" cuando es nombre propio (sin preceder de "la", "una", "cada", etc.)
    return text.replace(/\bPersona\b/g, (match, offset, fullText) => {
      const before = fullText.slice(Math.max(0, offset - 15), offset).toLowerCase();
      if (
        before.endsWith('la ') || 
        before.endsWith('una ') || 
        before.endsWith('cada ') ||
        before.endsWith('otra ') ||
        before.endsWith('esta ') ||
        before.endsWith('aquella ')
      ) {
        return match;
      }
      return firstName;
    });
  };

  const traverse = (current: any): any => {
    if (typeof current === 'string') {
      return replaceName(current);
    }
    if (Array.isArray(current)) {
      return current.map(item => traverse(item));
    }
    if (current !== null && typeof current === 'object') {
      const copy: any = {};
      for (const key of Object.keys(current)) {
        copy[key] = traverse(current[key]);
      }
      return copy;
    }
    return current;
  };

  return traverse(obj);
}


