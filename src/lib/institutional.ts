/**
 * Configuración y utilidades canónicas institucionales de Granja Andar.
 * Centraliza grupos oficiales, facilitadores titulares, ciclos lectivos y períodos
 * para garantizar consistencia universal y eliminar puntos de fallo o toques manuales.
 */

export const CANONICAL_GROUPS = [
  'Artesanos',
  'Atrapasueños',
  'Buenos Mozos',
  'Clave de Sol',
  'Empoderadas',
  'Emprendedores',
  'Promotores'
] as const;

export type CanonicalGroup = typeof CANONICAL_GROUPS[number];

export interface GroupFacilitatorInfo {
  id: number;
  name: string;
  email?: string;
}

export const GROUP_FACILITATORS: Record<CanonicalGroup, GroupFacilitatorInfo> = {
  'Artesanos': { id: 9, name: 'Leonardo Villamayor' },
  'Atrapasueños': { id: 12, name: 'Matias Maciel' },
  'Buenos Mozos': { id: 10, name: 'Marina Trejo' },
  'Clave de Sol': { id: 7, name: 'Juliana Arias' },
  'Empoderadas': { id: 8, name: 'Ana Reartes' },
  'Emprendedores': { id: 11, name: 'Analia Almada' },
  'Promotores': { id: 14, name: 'Lemuel Sola' }
};

export const AVAILABLE_YEARS = ['2026', '2027', '2028'] as const;
export const DEFAULT_CYCLE_YEAR = '2026';

/**
 * Normaliza cualquier variante de texto al Grupo Institucional Canónico oficial.
 */
export function normalizeGroupName(raw: string | null | undefined): CanonicalGroup | null {
  if (!raw) return null;
  const s = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  if (s.includes('artesan')) return 'Artesanos';
  if (s.includes('atrapa') || s.includes('suenos') || s.includes('comunicador')) return 'Atrapasueños';
  if (s.includes('buenos') || s.includes('mozo')) return 'Buenos Mozos';
  if (s.includes('clave') || s.includes('sol')) return 'Clave de Sol';
  if (s.includes('empoderad')) return 'Empoderadas';
  if (s.includes('emprended')) return 'Emprendedores';
  if (s.includes('promotor')) return 'Promotores';

  return null;
}

/**
 * Obtiene el facilitador oficial asignado a un grupo institucional.
 */
export function getOfficialFacilitator(groupName: string | null | undefined): GroupFacilitatorInfo | null {
  const canonical = normalizeGroupName(groupName);
  if (!canonical) return null;
  return GROUP_FACILITATORS[canonical] || null;
}

/**
 * Extrae el año de un string de período o retorna el año predeterminado.
 */
export function extractYearFromPeriod(periodo: string | null | undefined, fallbackYear = DEFAULT_CYCLE_YEAR): string {
  if (!periodo) return fallbackYear;
  const match = periodo.match(/\b(20\d{2})\b/);
  return match ? match[1] : fallbackYear;
}

/**
 * Genera las cadenas canónicas de períodos para un ciclo lectivo anual.
 */
export function getCyclePeriods(year: string = DEFAULT_CYCLE_YEAR) {
  const y = String(year).trim();
  return {
    year: y,
    trimestral1: `${y}-01 – ${y}-03`,
    trimestral2: `${y}-04 – ${y}-06`,
    finalReport: `${y} (Ciclo Anual Consolidado)`,
    mensuales1: [`${y}-04`, `${y}-05`, `${y}-06`],
    mensuales1Optional: `${y}-07`,
    mensuales2: [`${y}-08`, `${y}-09`, `${y}-10`],
    mesesNombres: {
      '01': `Enero ${y}`,
      '02': `Febrero ${y}`,
      '03': `Marzo ${y}`,
      '04': `Abril ${y}`,
      '05': `Mayo ${y}`,
      '06': `Junio ${y}`,
      '07': `Julio ${y}`,
      '08': `Agosto ${y}`,
      '09': `Septiembre ${y}`,
      '10': `Octubre ${y}`,
      '11': `Noviembre ${y}`,
      '12': `Diciembre ${y}`
    }
  };
}
