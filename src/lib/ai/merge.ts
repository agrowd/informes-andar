import OpenAI from 'openai';
import nunjucks from 'nunjucks';
import fs from 'node:fs';
import path from 'node:path';
import { renderDeterministic } from './orchestrator';
import { getInstitutionalConfig } from '../docs/constants';

interface MergeOptions {
  targetType: 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  jovenNombre: string;
  mergedPeriodo: string;
  iaEnabled: boolean;
  provider: 'openai' | 'gemini';
  model: string;
  temperature: number;
}

interface SourceReport {
  id: number;
  periodo: string;
  data: any;
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  'TRIMESTRAL': 'Informe Trimestral',
  'SEMESTRAL': 'Informe Semestral',
  'ANUAL': 'Informe Anual',
};

const SECTION_KEYS = [
  'objetivo', 'escucha', 'estadoEmocional', 'apoyosAjustes',
  'logros', 'suenosMetas', 'circuloApoyo', 'sugerencias'
];

/**
 * Fusiona múltiples informes en uno solo (trimestral, semestral o anual).
 * Si la IA está habilitada, utiliza OpenAI/Gemini para generar una narrativa
 * integradora. Si no, concatena de forma determinística.
 */
export async function mergeReports(sources: SourceReport[], options: MergeOptions) {
  const institutional = getInstitutionalConfig();

  // Usar el primer informe como base para datosGenerales y evaluacionDimensiones
  const baseReport = sources[0].data;

  if (options.iaEnabled) {
    try {
      const mergedReport = await mergeWithAI(sources, options, institutional);
      const html = await renderDeterministic(mergedReport);
      return { report: mergedReport, html, used: 'ia' as const };
    } catch (err) {
      console.error('Error en merge con IA, usando fallback determinístico:', err);
      const mergedReport = mergeDeterministic(sources, options, institutional);
      const html = await renderDeterministic(mergedReport);
      return { report: mergedReport, html, used: 'fallback' as const, error: String(err) };
    }
  }

  // IA deshabilitada → determinístico
  const mergedReport = mergeDeterministic(sources, options, institutional);
  const html = await renderDeterministic(mergedReport);
  return { report: mergedReport, html, used: 'fallback' as const };
}

/**
 * Fusión determinística: concatena los textos de cada sección con separadores temporales.
 */
function mergeDeterministic(sources: SourceReport[], options: MergeOptions, institutional: any) {
  const mergedSecciones: any = {};

  for (const key of SECTION_KEYS) {
    const fragments: any[] = [];
    for (const source of sources) {
      const sectionFrags = source.data?.secciones?.[key] || [];
      if (sectionFrags.length > 0) {
        // Agregar un encabezado temporal
        fragments.push({
          id: `merge-header-${source.id}`,
          texto: `--- ${source.periodo} ---`,
          fuentes: []
        });
        for (const frag of sectionFrags) {
          fragments.push({
            id: `merge-${source.id}-${frag.id || Math.random().toString(36).slice(2)}`,
            texto: frag.texto,
            fuentes: frag.fuentes || []
          });
        }
      }
    }
    mergedSecciones[key] = fragments.length > 0 ? fragments : [{ id: 'empty', texto: 'Sin información para este período.', fuentes: [] }];
  }

  // Fusionar evaluación de dimensiones: usar la última como referencia, con comparativa
  const lastSource = sources[sources.length - 1];
  const evaluacionDimensiones = lastSource.data?.evaluacionDimensiones || [];

  // Fusionar trazabilidad
  const mergedTrazabilidad: any = {};
  for (const source of sources) {
    const traz = source.data?.trazabilidad || {};
    for (const [k, v] of Object.entries(traz)) {
      if (!mergedTrazabilidad[k]) mergedTrazabilidad[k] = [];
      if (Array.isArray(v)) {
        mergedTrazabilidad[k].push(...(v as string[]));
      }
    }
  }

  return {
    datosGenerales: {
      ...sources[0].data?.datosGenerales,
      periodo: options.mergedPeriodo,
    },
    secciones: mergedSecciones,
    evaluacionDimensiones,
    trazabilidad: mergedTrazabilidad,
  };
}

/**
 * Fusión con IA: envía los textos de todos los informes fuente y pide
 * una narrativa integradora que sintetice la evolución temporal.
 */
async function mergeWithAI(sources: SourceReport[], options: MergeOptions, institutional: any) {
  const targetLabel = TARGET_TYPE_LABELS[options.targetType] || options.targetType;

  // Construir el contexto de las secciones de cada informe fuente
  const sectionsSummary: Record<string, string[]> = {};
  for (const key of SECTION_KEYS) {
    sectionsSummary[key] = [];
    for (const source of sources) {
      const frags = source.data?.secciones?.[key] || [];
      const text = frags.map((f: any) => f.texto).join(' ');
      if (text.trim()) {
        sectionsSummary[key].push(`[${source.periodo}]: ${text}`);
      }
    }
  }

  const mergePrompt = buildMergePrompt(options, sectionsSummary, targetLabel, institutional);

  // Llamar a la IA
  let responseContent: string;

  if (options.provider === 'openai') {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: options.model,
      temperature: options.temperature ?? 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Eres un profesional especializado en informes evolutivos de discapacidad bajo el modelo de Planificación Centrada en la Persona. Respondes SIEMPRE en formato JSON válido.' },
        { role: 'user', content: mergePrompt }
      ]
    } as any);
    responseContent = response.choices?.[0]?.message?.content || '';
  } else {
    // Gemini
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '');
    const model = genAI.getGenerativeModel({ model: options.model });
    const result = await model.generateContent(mergePrompt);
    responseContent = result.response?.text() || '';
  }

  if (!responseContent) {
    throw new Error('Respuesta vacía del proveedor de IA para merge');
  }

  // Parsear JSON de la respuesta
  const cleanJson = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleanJson);

  // Construir el reporte final
  const mergedSecciones: any = {};
  for (const key of SECTION_KEYS) {
    const aiText = parsed.secciones?.[key] || parsed[key] || '';
    mergedSecciones[key] = [{
      id: `merge-ai-${key}`,
      texto: typeof aiText === 'string' ? aiText : (Array.isArray(aiText) ? aiText.map((f: any) => typeof f === 'string' ? f : f.texto).join(' ') : String(aiText)),
      fuentes: sources.map(s => `Informe ${s.periodo}`)
    }];
  }

  // Fusionar evaluación de dimensiones: usar la última como referencia
  const lastSource = sources[sources.length - 1];
  const evaluacionDimensiones = lastSource.data?.evaluacionDimensiones || [];

  // Fusionar trazabilidad
  const mergedTrazabilidad: any = {};
  for (const source of sources) {
    const traz = source.data?.trazabilidad || {};
    for (const [k, v] of Object.entries(traz)) {
      if (!mergedTrazabilidad[k]) mergedTrazabilidad[k] = [];
      if (Array.isArray(v)) {
        mergedTrazabilidad[k].push(...(v as string[]));
      }
    }
  }

  return {
    datosGenerales: {
      ...sources[0].data?.datosGenerales,
      periodo: options.mergedPeriodo,
    },
    secciones: mergedSecciones,
    evaluacionDimensiones,
    trazabilidad: mergedTrazabilidad,
  };
}

function buildMergePrompt(
  options: MergeOptions,
  sectionsSummary: Record<string, string[]>,
  targetLabel: string,
  institutional: any
): string {
  const sectionTitles: Record<string, string> = {
    objetivo: institutional.titles?.objetivo || 'Objetivo del proceso de acompañamiento',
    escucha: institutional.titles?.escucha || 'Escucha activa y autodeterminación',
    estadoEmocional: institutional.titles?.estadoEmocional || 'Estado emocional y bienestar',
    apoyosAjustes: institutional.titles?.apoyosAjustes || 'Apoyos y ajustes razonables',
    logros: institutional.titles?.logros || 'Logros y avances significativos',
    suenosMetas: institutional.titles?.suenosMetas || 'Sueños y metas personales',
    circuloApoyo: institutional.titles?.circuloApoyo || 'Participación del círculo de apoyo',
    sugerencias: institutional.titles?.sugerencias || 'Sugerencias y recomendaciones',
  };

  let prompt = `# TAREA: Generar un ${targetLabel}

Fusiona los siguientes informes evolutivos individuales de **${options.jovenNombre}** en un único **${targetLabel}** que cubra el período **${options.mergedPeriodo}**.

## INSTRUCCIONES
1. Para CADA sección, redacta un texto narrativo fluido que INTEGRE la evolución observada a lo largo de los períodos.
2. NO copies textualmente los informes individuales. SINTETIZA mostrando progresión temporal: "Al inicio del período...", "A medida que avanzaban los meses...", "Hacia el final del período...".
3. Destaca los AVANCES más significativos y las ÁREAS que requieren continuidad de apoyo.
4. Mantén un tono profesional, institucional y cálido, propio de la Planificación Centrada en la Persona.
5. Si alguna sección no tiene datos, escribe "No se registraron observaciones específicas para este período."

## DATOS DE ENTRADA (por sección y período)

`;

  for (const key of SECTION_KEYS) {
    const title = sectionTitles[key] || key;
    prompt += `### ${title}\n`;
    const entries = sectionsSummary[key] || [];
    if (entries.length > 0) {
      for (const entry of entries) {
        prompt += `${entry}\n\n`;
      }
    } else {
      prompt += `Sin datos para esta sección.\n\n`;
    }
  }

  prompt += `## FORMATO DE RESPUESTA (JSON)
Responde EXCLUSIVAMENTE con un objeto JSON con la siguiente estructura:
\`\`\`json
{
  "secciones": {
    "objetivo": "Texto narrativo integrador...",
    "escucha": "Texto narrativo integrador...",
    "estadoEmocional": "Texto narrativo integrador...",
    "apoyosAjustes": "Texto narrativo integrador...",
    "logros": "Texto narrativo integrador...",
    "suenosMetas": "Texto narrativo integrador...",
    "circuloApoyo": "Texto narrativo integrador...",
    "sugerencias": "Texto narrativo integrador..."
  }
}
\`\`\`
`;

  return prompt;
}
