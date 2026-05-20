import { generateReport } from '../src/lib/ai/orchestrator';
import { generateReportJSON } from '../src/lib/ai/providers/router';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const testForm = {
  datosGenerales: {
    nombreCompleto: 'Federico Prueba',
    dni: '12345678',
    periodo: 'marzo',
    circuloApoyoParticipacion: 'Activa y constante',
    circuloApoyo: [{ nombre: 'Claudia', vinculo: 'Madre' }]
  },
  objetivo: {
    focos: ['Reconocimiento y ejercicio de derechos', 'Participación en espacios comunitarios'],
    estrategias: ['Acompañamiento en ámbito familiar'],
    focosComentario: 'debe fortalecer la capacidad de reflexion de sus derechos',
    estrategiasComentario: 'participacion activa ( torneo checar - aerobica y jb )'
  },
  escucha: {
    nivelAutonomia: 'Media',
    preferenciasComentario: 'Iniciativa en ideas o proyectos',
    areasInteresComentario: 'Preferencias sobre actividades'
  },
  estadoEmocional: {
    regulacion: ['Alegría / disfrute'],
    situacionesComentario: 'Mayormente alegre o satisfecho/a',
    estrategiasComentario: 'Se siente cómodo/a en espacios que frecuenta',
    autorregulacionComentario: 'Actitud positiva hacia sí mismo/a'
  },
  apoyosAjustes: {
    apoyos: ['Respiración/pausas/cuenta mental'],
    ajustes: ['Contención emocional grupal'],
    apoyosComentario: 'Maneja frustración o cambios',
    ajustesComentario: 'Problemas familiares'
  },
  evaluacion: {
    dimensiones: [
      { dimension: 'Bienestar Físico', evolucion: '✔', observacion: 'Excelente estado de salud' },
      { dimension: 'Bienestar Emocional', evolucion: '➖', observacion: 'Estable' }
    ]
  },
  logros: {
    items: ['Participación activa en taller'],
    comentario: 'Logró mejorar su comportamiento social y autonomía'
  },
  suenosMetas: {
    metas: ['Mayor independencia'],
    metasComentario: 'Quiere vivir solo en el futuro',
    recursosComentario: 'Requiere apoyos visuales'
  },
  circuloApoyo: {
    participacion: 'Alta',
    miembros: [{ nombre: 'Claudia', vinculo: 'Madre' }],
    respetoDecisiones: ['Sí, siempre'],
    gradoInvolucramiento: 'Muy alto',
    comentario: 'Muy buena relación'
  },
  sugerencias: {
    areasPrioritarias: ['Habilidades de vida diaria'],
    recomendaciones: ['Rutinas con apoyos visuales'],
    areasComentario: 'Trabajar aseo personal',
    recomendacionesComentario: 'Continuar con el termómetro emocional'
  }
};

async function test() {
  console.log("Iniciando prueba de generación con IA habilitada...");
  try {
    const jsonStr = await generateReportJSON(testForm, {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0
    });
    console.log("Respuesta JSON cruda de OpenAI:");
    console.log(jsonStr);
    
    let parsed = JSON.parse(jsonStr);
    console.log("Claves de secciones:", Object.keys(parsed.secciones || {}));
    
    const result = await generateReport(testForm, {
      iaEnabled: true,
      iaLocalOnly: false,
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0
    });
    console.log("Generación exitosa!");
    console.log("Used provider:", result.used);
    if (result.error) {
      console.error("Hubo un error recuperado:", result.error);
    }
  } catch (error) {
    console.error("Error en la ejecución:", error);
  }
}

test();
