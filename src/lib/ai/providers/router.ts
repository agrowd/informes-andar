import { generateWithOpenAI } from './openai';
import { generateWithGemini } from './gemini';

export type Provider = 'openai' | 'gemini' | 'azure' | 'anthropic' | 'openrouter' | 'ollama' | 'local';

export interface AIParams {
  provider: Provider;
  model: string;
  temperature: number;
  maxTokens?: number;
}

export async function generateReportJSON(input: unknown, params: AIParams): Promise<string> {
  switch (params.provider) {
    case 'openai':
      return generateWithOpenAI(input, params);
    case 'gemini':
      return generateWithGemini(input, params);
    default:
      throw new Error(`Proveedor no soportado: ${params.provider}`);
  }
}

