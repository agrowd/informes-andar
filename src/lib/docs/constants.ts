import fs from 'node:fs';
import path from 'node:path';

export interface ParsedSection { heading: string; level: number; content: string[] }

export function loadParsed(name: 'preguntas' | 'informe'): ParsedSection[] {
  const root = process.cwd();
  const file = name === 'preguntas'
    ? path.join(root, 'docs/parsed/preguntas_para_el_informe_evolutivo.json')
    : path.join(root, 'docs/parsed/Celis_Analia_Informe_evolutivo.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8')) as ParsedSection[];
}

export function extractHeadings(sections: ParsedSection[]): string[] {
  return sections.filter(s => s.level <= 3).map(s => s.heading);
}

function normalize(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function getInstitutionalConfig() {
  const defaults = {
    mainTitle: 'Informe Evolutivo – Abordaje Centrado en la Persona',
    objetivo: 'Objetivo del Proceso',
    escucha: 'Escucha Activa y Autodeterminación',
    estadoEmocional: 'Estado Emocional y Bienestar Subjetivo',
    apoyosAjustes: 'Apoyos y Ajustes Brindados',
    evaluacion: 'Evaluación de las Dimensiones de Calidad de Vida',
    logros: 'Logros Destacados y Habilidades Adquiridas',
    suenosMetas: 'Sueños y Metas a Futuro',
    circuloApoyo: 'Valoración del Círculo de Apoyo',
    sugerencias: 'Sugerencias o Recomendaciones'
  } as const;

  const informe = loadParsed('informe');
  const headings = extractHeadings(informe);
  const byNorm = new Map(headings.map(h => [normalize(h), h]));

  function pick(candidates: string[], fallback: string) {
    for (const c of candidates) {
      const n = normalize(c);
      for (const [k, v] of byNorm.entries()) {
        if (k.includes(n)) return v;
      }
    }
    return fallback;
  }

  const titles = {
    mainTitle: pick(['informe evolutivo', 'abordaje centrado en la persona'], defaults.mainTitle),
    objetivo: pick(['objetivo del proceso'], defaults.objetivo),
    escucha: pick(['escucha activa', 'autodeterminacion'], defaults.escucha),
    estadoEmocional: pick(['estado emocional', 'bienestar'], defaults.estadoEmocional),
    apoyosAjustes: pick(['apoyos', 'ajustes'], defaults.apoyosAjustes),
    evaluacion: pick(['evaluacion', 'dimensiones', 'calidad de vida'], defaults.evaluacion),
    logros: pick(['logros', 'habilidades'], defaults.logros),
    suenosMetas: pick(['suenos', 'metas'], defaults.suenosMetas),
    circuloApoyo: pick(['circulo de apoyo', 'valoracion'], defaults.circuloApoyo),
    sugerencias: pick(['sugerencias', 'recomendaciones'], defaults.sugerencias)
  } as const;

  // Openers: primera línea de contenido de cada sección si existe
  const openers: Record<string, string> = {};
  for (const sec of informe) {
    const h = sec.heading || '';
    const n = normalize(h);
    const first = (sec.content && sec.content[0]) ? sec.content[0].trim() : '';
    if (!first) continue;
    if (n.includes(normalize(titles.objetivo))) openers.objetivo = first;
    else if (n.includes(normalize(titles.escucha))) openers.escucha = first;
    else if (n.includes(normalize(titles.estadoEmocional))) openers.estadoEmocional = first;
    else if (n.includes(normalize(titles.apoyosAjustes))) openers.apoyosAjustes = first;
    else if (n.includes(normalize(titles.evaluacion))) openers.evaluacion = first;
    else if (n.includes(normalize(titles.logros))) openers.logros = first;
    else if (n.includes(normalize(titles.suenosMetas))) openers.suenosMetas = first;
    else if (n.includes(normalize(titles.circuloApoyo))) openers.circuloApoyo = first;
    else if (n.includes(normalize(titles.sugerencias))) openers.sugerencias = first;
  }

  return { titles, openers };
}

export function buildFormHints() {
  const preguntas = loadParsed('preguntas');
  const byNorm = new Map(preguntas.map(s => [normalize(s.heading || ''), s]));
  function pickText(keys: string[]) {
    for (const k of keys) {
      const hit = byNorm.get(normalize(k));
      if (hit && hit.content && hit.content.length > 0) return hit.content[0];
    }
    return '';
  }
  return {
    objetivo: pickText(['🎯 2. OBJETIVO DEL PROCESO', 'OBJETIVO DEL PROCESO']),
    escucha: pickText(['🗣 3. ESCUCHA ACTIVA Y AUTODETERMINACIÓN', 'ESCUCHA ACTIVA']),
    estadoEmocional: pickText(['💬 4. ESTADO EMOCIONAL Y BIENESTAR SUBJETIVO', 'ESTADO EMOCIONAL']),
    apoyosAjustes: pickText(['🔧 5. APOYOS Y AJUSTES BRINDADOS', 'APOYOS Y AJUSTES']),
    evaluacion: pickText(['🔎 6.Evaluación comparativa de dimensiones de Calidad de Vida', 'Evaluación comparativa']),
    logros: pickText(['🌟 7. LOGROS DESTACADOS Y HABILIDADES ADQUIRIDAS', 'LOGROS']),
    suenosMetas: pickText(['💭 8. SUEÑOS Y METAS A FUTURO', 'SUEÑOS Y METAS']),
    circuloApoyo: pickText(['👥 9. VALORACIÓN DEL CÍRCULO DE APOYO', 'CÍRCULO DE APOYO']),
    sugerencias: pickText(['✅ 10. SUGERENCIAS Y RECOMENDACIONES', 'SUGERENCIAS'])
  };
}


