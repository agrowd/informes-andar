export function capitalizeWord(w: string): string {
  if (!w) return '';
  if (w.includes('-')) {
    return w.split('-').map(capitalizeWord).join('-');
  }
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

export function capitalizeName(str: string): string {
  if (!str) return '';
  const words = str.split(' ');
  return words
    .map((w, index) => {
      if (!w) return '';
      const lower = w.toLowerCase();
      // Conectores en minúscula en posiciones intermedias
      if (index > 0 && ['de', 'del', 'la', 'las', 'los', 'y'].includes(lower)) {
        return lower;
      }
      return capitalizeWord(w);
    })
    .join(' ');
}

export function formatApellidoNombre(nameStr: string): string {
  if (!nameStr) return '';
  let str = nameStr.replace(/\.+$/, '').trim();

  let formatted = '';
  if (str.includes(',')) {
    const parts = str.split(',');
    formatted = `${parts[0].trim()}, ${parts.slice(1).join(',').trim()}`;
  } else {
    const knownFirstWordSurnames = [
      'garea', 'diaz', 'almiron', 'almirón', 'aguerre', 'aguirre', 'kubar', 
      'cannoni', 'gomez', 'gómez', 'legarreta', 'fabrizio', 'fernandez', 'fernández'
    ];

    const words = str.split(/\s+/).filter(Boolean);
    if (words.length <= 1) {
      formatted = str;
    } else {
      const firstWordLower = words[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      if (knownFirstWordSurnames.includes(firstWordLower)) {
        formatted = `${words[0]}, ${words.slice(1).join(' ')}`;
      } else if (str.toUpperCase().includes('FARDELLI CORROPOLESE')) {
        formatted = 'Fardelli Corropolese, Ramiro';
      } else {
        const lastName = words[words.length - 1];
        const firstNames = words.slice(0, words.length - 1).join(' ');
        formatted = `${lastName}, ${firstNames}`;
      }
    }
  }

  // Aplicar capitalización automática a ambas partes (Apellido y Nombres)
  if (formatted.includes(',')) {
    const [apellido, ...nombres] = formatted.split(',');
    return `${capitalizeName(apellido.trim())}, ${capitalizeName(nombres.join(',').trim())}`;
  }
  return capitalizeName(formatted);
}

/**
 * Formatea fecha y hora estrictamente en zona horaria de Argentina (America/Argentina/Buenos_Aires UTC-3)
 */
export function formatDateTime(dateStr?: string | Date | null): string {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Formatea fecha estrictamente en zona horaria de Argentina (America/Argentina/Buenos_Aires UTC-3)
 */
export function formatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return String(dateStr);
  }
}

export function sanitizeNarrativeLevels(text: string): string {
  if (typeof text !== 'string') return '';
  let s = text;

  // 1. Variantes con "Ha alcanzado / Ha logrado / Ha obtenido" (conservar la mayúscula o estructura verbal)
  s = s.replace(/\bHa\s+(?:alcanzado|logrado|obtenido)\s+(?:el|un)\s+Nivel\s*3\s+(?:en|para)\s+/g, 'Ha consolidado con autonomía y regularidad ');
  s = s.replace(/\bha\s+(?:alcanzado|logrado|obtenido)\s+(?:el|un)\s+Nivel\s*3\s+(?:en|para)\s+/g, 'ha consolidado con autonomía y regularidad ');

  s = s.replace(/\bHa\s+(?:alcanzado|logrado|obtenido)\s+(?:el|un)\s+Nivel\s*4\s+(?:en|para)\s+/g, 'Se ha desempeñado de forma plenamente independiente y autónoma en ');
  s = s.replace(/\bha\s+(?:alcanzado|logrado|obtenido)\s+(?:el|un)\s+Nivel\s*4\s+(?:en|para)\s+/g, 'se ha desempeñado de forma plenamente independiente y autónoma en ');

  s = s.replace(/\bHa\s+(?:alcanzado|logrado|obtenido)\s+(?:el|un)\s+Nivel\s*2\s+(?:en|para)\s+/g, 'Ha avanzado en su desarrollo con apoyos y orientación verbal en ');
  s = s.replace(/\bha\s+(?:alcanzado|logrado|obtenido)\s+(?:el|un)\s+Nivel\s*2\s+(?:en|para)\s+/g, 'ha avanzado en su desarrollo con apoyos y orientación verbal en ');

  s = s.replace(/\bHa\s+(?:alcanzado|logrado|obtenido)\s+(?:el|un)\s+Nivel\s*1\s+(?:en|para)\s+/g, 'Ha iniciado su acercamiento con apoyos continuos en ');
  s = s.replace(/\bha\s+(?:alcanzado|logrado|obtenido)\s+(?:el|un)\s+Nivel\s*1\s+(?:en|para)\s+/g, 'ha iniciado su acercamiento con apoyos continuos en ');

  // 2. Variantes en gerundio / pretérito: "alcanzando el Nivel 3 en..." / "alcanzó el Nivel 3 en..."
  s = s.replace(/\b(alcanzando|logrando|obteniendo)\s+(?:el|un)\s+Nivel\s*3\s+(?:en|para)\s+/gi, 'consolidando con autonomía y regularidad ');
  s = s.replace(/\b(alcanzando|logrando|obteniendo)\s+(?:el|un)\s+Nivel\s*4\s+(?:en|para)\s+/gi, 'desempeñándose de forma plenamente independiente y autónoma en ');
  s = s.replace(/\b(alcanzando|logrando|obteniendo)\s+(?:el|un)\s+Nivel\s*2\s+(?:en|para)\s+/gi, 'avanzando en su desarrollo con apoyos verbales en ');
  s = s.replace(/\b(alcanzando|logrando|obteniendo)\s+(?:el|un)\s+Nivel\s*1\s+(?:en|para)\s+/gi, 'iniciando su participación con apoyos continuos en ');

  s = s.replace(/\b(alcanz[oó]|logr[oó]|obtuvo)\s+(?:el|un)\s+Nivel\s*3\s+(?:en|para)\s+/gi, 'consolidó con autonomía y regularidad ');
  s = s.replace(/\b(alcanz[oó]|logr[oó]|obtuvo)\s+(?:el|un)\s+Nivel\s*4\s+(?:en|para)\s+/gi, 'se desempeñó de forma independiente en ');
  s = s.replace(/\b(alcanz[oó]|logr[oó]|obtuvo)\s+(?:el|un)\s+Nivel\s*2\s+(?:en|para)\s+/gi, 'avanzó con apoyos verbales en ');
  s = s.replace(/\b(alcanz[oó]|logr[oó]|obtuvo)\s+(?:el|un)\s+Nivel\s*1\s+(?:en|para)\s+/gi, 'inició con apoyos paso a paso su labor en ');

  // 3. Variantes con rangos o plurales: "alcanzando niveles 2 y 3 en...", "niveles de desempeño entre 2 y 3 en..."
  s = s.replace(/(?:alcanzando|logrando|mostrando)\s+niveles?\s+(?:de\s+desempe[ñn]o\s+)?(?:entre\s+)?[12]\s*y\s*[234]\s+(?:en|para)\s+/gi, 'afianzando progresivamente sus habilidades con creciente autonomía y apoyos en ');
  s = s.replace(/niveles?\s+(?:de\s+desempe[ñn]o\s+)?(?:entre\s+)?[12]\s*y\s*[234]/gi, 'un proceso de desarrollo favorable con apoyos');

  // 4. Evaluadas / evaluado en un Nivel X
  s = s.replace(/ha\s+sido\s+evaluad[oa]\s+en\s+(?:el|un)\s+Nivel\s*3/gi, 'se encuentra afianzada con adecuada autonomía');
  s = s.replace(/han\s+sido\s+evaluad[oa]s\s+en\s+(?:el|un)\s+Nivel\s*3/gi, 'se encuentran consolidadas con adecuada autonomía');
  s = s.replace(/ha\s+sido\s+evaluad[oa]\s+en\s+(?:el|un)\s+Nivel\s*4/gi, 'se encuentra consolidada de manera plenamente autónoma e independiente');
  s = s.replace(/han\s+sido\s+evaluad[oa]s\s+en\s+(?:el|un)\s+Nivel\s*4/gi, 'se encuentran afianzadas de manera independiente y destacada');
  s = s.replace(/ha\s+sido\s+evaluad[oa]\s+en\s+(?:el|un)\s+Nivel\s*2/gi, 'se encuentra en pleno proceso de desarrollo con apoyos y orientación verbal');
  s = s.replace(/han\s+sido\s+evaluad[oa]s\s+en\s+(?:el|un)\s+Nivel\s*2/gi, 'se encuentran en proceso de desarrollo activo con apoyos verbales');
  s = s.replace(/ha\s+sido\s+evaluad[oa]\s+en\s+(?:el|un)\s+Nivel\s*1/gi, 'se encuentra en etapa inicial de adquisición con apoyos guiados');
  s = s.replace(/han\s+sido\s+evaluad[oa]s\s+en\s+(?:el|un)\s+Nivel\s*1/gi, 'se encuentran en etapa inicial de aprendizaje con asistencia continua');

  // 5. "en el Nivel X" o "en un Nivel X"
  s = s.replace(/en\s+(?:el|un)\s+Nivel\s*4/gi, 'de manera plenamente autónoma e independiente');
  s = s.replace(/en\s+(?:el|un)\s+Nivel\s*3/gi, 'con desempeño consolidado y autónomo');
  s = s.replace(/en\s+(?:el|un)\s+Nivel\s*2/gi, 'en proceso de desarrollo con apoyos y orientación');
  s = s.replace(/en\s+(?:el|un)\s+Nivel\s*1/gi, 'en etapa inicial con apoyos paso a paso');

  // 6. "alcanzando niveles avanzados en"
  s = s.replace(/alcanzando\s+niveles\s+avanzados\s+en/gi, 'alcanzando una notable destreza y autonomía en');
  s = s.replace(/niveles\s+avanzados\s+en/gi, 'notable destreza y solvencia en');

  // 7. Frases con "nivel de autonomía" -> "autonomía"
  s = s.replace(/un\s+nivel\s+de\s+autonom[ií]a\s+significativo/gi, 'una autonomía significativa');
  s = s.replace(/su\s+nivel\s+de\s+autonom[ií]a/gi, 'su autonomía');
  s = s.replace(/adecuados\s+niveles\s+de\s+autonom[ií]a/gi, 'adecuada autonomía');

  // 8. Genéricos restantes de "Nivel [1-4]"
  s = s.replace(/\(?\bNivel\s*4\b\)?/gi, 'desempeño independiente');
  s = s.replace(/\(?\bNivel\s*3\b\)?/gi, 'desempeño consolidado y autónomo');
  s = s.replace(/\(?\bNivel\s*2\b\)?/gi, 'desarrollo con apoyos');
  s = s.replace(/\(?\bNivel\s*1\b\)?/gi, 'etapa inicial con apoyos');

  // 9. Limpiar espacios dobles generados
  s = s.replace(/[ \t]{2,}/g, ' ');

  return s;
}

/**
 * Identifica si un período corresponde al Trimestral 1 (Verano: Enero a Marzo)
 * Soporta cualquier ciclo lectivo (2026, 2027, etc.) y evita colisiones accidentales.
 */
export function isTrimestral1(periodo: string, targetYear?: string): boolean {
  if (!periodo) return false;
  const p = periodo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (targetYear) {
    const yearMatch = p.match(/\b(20\d{2})\b/);
    if (yearMatch && yearMatch[1] !== String(targetYear)) {
      return false;
    }
    if (p.includes(`${targetYear}-01`) || p.includes(`${targetYear}-02`) || p.includes(`${targetYear}-03`)) return true;
  }

  if (/\b20\d{2}-0[123]\b/.test(p)) return true;
  if (p.includes('-01') || p.includes('-02') || p.includes('-03')) return true;
  if (p.includes('01 – 03') || p.includes('01-03') || p.includes('01 a 03') || p.includes('01 al 03')) return true;
  if (p.includes('enero') || p.includes('febrero') || p.includes('marzo') || p.includes('verano') || p.includes('1er') || p.includes('primer')) return true;
  return false;
}

/**
 * Identifica si un período corresponde al Trimestral 2 (Primer Semestre: Abril a Junio)
 * Soporta cualquier ciclo lectivo (2026, 2027, etc.).
 */
export function isTrimestral2(periodo: string, targetYear?: string): boolean {
  if (!periodo) return false;
  const p = periodo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (targetYear) {
    const yearMatch = p.match(/\b(20\d{2})\b/);
    if (yearMatch && yearMatch[1] !== String(targetYear)) {
      return false;
    }
    if (p.includes(`${targetYear}-04`) || p.includes(`${targetYear}-05`) || p.includes(`${targetYear}-06`)) return true;
  }

  if (/\b20\d{2}-0[456]\b/.test(p)) return true;
  if (p.includes('-04') || p.includes('-05') || p.includes('-06')) return true;
  if (p.includes('04 – 06') || p.includes('04-06') || p.includes('06 – 04') || p.includes('04 a 06') || p.includes('04 al 06')) return true;
  if (p.includes('abril') || p.includes('mayo') || p.includes('junio') || p.includes('2do') || p.includes('segundo')) return true;
  return false;
}



