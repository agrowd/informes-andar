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

