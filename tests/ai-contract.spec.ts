import { describe, it, expect } from 'vitest';
import { generateReport } from '../src/lib/ai/orchestrator';

const minimalForm = {
  datosGenerales: {
    nombreCompleto: 'Persona de Prueba',
    periodo: 'Enero–Junio 2025',
    circuloApoyo: [{ nombre: 'Familiar A', vinculo: 'Madre' }]
  },
  objetivo: { focos: ['Comunicación'], estrategias: ['Apoyo visual'], focosComentario: 'Comentario objetivo focos', estrategiasComentario: 'Comentario estrategias' },
  escucha: { nivelAutonomia: 'Media', preferenciasComentario: 'Comentario preferencias', areasInteresComentario: 'Comentario areas interes' },
  estadoEmocional: { regulacion: ['Maneja adecuadamente situaciones de frustración o cambios'], situacionesComentario: 'Comentario situaciones', estrategiasComentario: 'Comentario estrategias emocionales', autorregulacionComentario: 'Comentario autorregulacion' },
  apoyosAjustes: { apoyos: ['Tutoría'], ajustes: ['Adaptación de materiales'], apoyosComentario: 'Comentario apoyos', ajustesComentario: 'Comentario ajustes' },
  evaluacion: { dimensiones: [{ dimension: 'Autonomía', evolucion: '✔', observacion: 'Avances sostenidos' }] },
  logros: { items: ['Participación activa en taller'], comentario: 'Comentario logros' },
  suenosMetas: { metas: ['Mayor independencia'], metasComentario: 'Comentario metas', recursosComentario: 'Comentario recursos' },
  circuloApoyo: { participacion: 'Alta', miembros: [{ nombre: 'Familiar A', vinculo: 'Madre' }], respetoDecisiones: ['Sí, siempre'], gradoInvolucramiento: 'Muy alto', comentario: 'Comentario circulo de apoyo' },
  sugerencias: { areasPrioritarias: ['Habilidades de vida diaria'], recomendaciones: ['Rutinas con apoyos visuales'], areasComentario: 'Comentario areas', recomendacionesComentario: 'Comentario recomendaciones' }
};

describe('Contrato de salida IA/fallback', () => {
  it('genera un informe válido contra report.schema.json (vía fallback determinístico)', async () => {
    const result = await generateReport(minimalForm, {
      iaEnabled: false, // forzar fallback determinístico
      iaLocalOnly: true,
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0
    });

    expect(result.report).toBeTruthy();
    const report = result.report as any;
    expect(report.datosGenerales).toBeTruthy();
    expect(Array.isArray(report.evaluacionDimensiones)).toBe(true);
    expect(typeof result.html).toBe('string');
  });
});


