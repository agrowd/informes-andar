export interface FormSummaryInfo {
  talleresCount: number;
  talleresNombres: string[];
  totalSkillsCount: number;
  skillsCount: number;
  hasHabilidades: boolean;
  hasObservaciones: boolean;
  observacionesLength: number;
  observacionesPreview: string;
  observacionesFull: string;
}

export function extractFormSummary(data: any): FormSummaryInfo {
  const talleres = Array.isArray(data?.talleres) ? data.talleres : [];
  let totalSkills = 0;
  let skillsEvaluated = 0;
  const talleresNombres: string[] = [];

  talleres.forEach((t: any) => {
    if (t?.nombre) {
      const name = String(t.nombre).trim();
      if (!talleresNombres.includes(name)) talleresNombres.push(name);
    }
    const items = Array.isArray(t?.items) ? t.items : [];
    items.forEach((it: any) => {
      totalSkills++;
      if (it?.nivel !== undefined && it?.nivel !== null && it?.nivel !== '' && Number(it.nivel) > 0) {
        skillsEvaluated++;
      }
    });
  });

  const rawObs = data?.observaciones;
  const obsFull = typeof rawObs === 'string' ? rawObs.trim() : '';
  const hasObservaciones = obsFull.length > 0;

  return {
    talleresCount: talleres.length,
    talleresNombres,
    totalSkillsCount: totalSkills,
    skillsCount: skillsEvaluated,
    hasHabilidades: skillsEvaluated > 0,
    hasObservaciones,
    observacionesLength: obsFull.length,
    observacionesPreview: obsFull.length > 120 ? obsFull.slice(0, 120) + '...' : obsFull,
    observacionesFull: obsFull
  };
}

export function getFormSummary(it: any): FormSummaryInfo {
  if (!it) {
    return {
      talleresCount: 0,
      talleresNombres: [],
      totalSkillsCount: 0,
      skillsCount: 0,
      hasHabilidades: false,
      hasObservaciones: false,
      observacionesLength: 0,
      observacionesPreview: '',
      observacionesFull: ''
    };
  }

  // Si tiene el objeto data completo, calcular directamente para máxima fidelidad
  if (it.data) {
    return extractFormSummary(it.data);
  }

  // Fallback si viene aplanado desde API
  const rawObs = it.observaciones ?? '';
  const obsFull = typeof rawObs === 'string' ? rawObs.trim() : '';
  const hasObs = it.hasObservaciones !== undefined ? !!it.hasObservaciones : obsFull.length > 0;
  const obsLen = it.observacionesLength !== undefined ? Number(it.observacionesLength) : obsFull.length;
  const obsPrev = it.observacionesPreview || (obsFull.length > 120 ? obsFull.slice(0, 120) + '...' : obsFull);

  return {
    talleresCount: it.talleresCount !== undefined ? Number(it.talleresCount) : (it.talleresNombres?.length || 0),
    talleresNombres: Array.isArray(it.talleresNombres) ? it.talleresNombres : [],
    totalSkillsCount: it.totalSkillsCount !== undefined ? Number(it.totalSkillsCount) : (it.skillsCount || 0),
    skillsCount: it.skillsCount !== undefined ? Number(it.skillsCount) : 0,
    hasHabilidades: it.hasHabilidades !== undefined ? !!it.hasHabilidades : (Number(it.skillsCount) > 0),
    hasObservaciones: hasObs,
    observacionesLength: obsLen,
    observacionesPreview: obsPrev,
    observacionesFull: obsFull
  };
}
