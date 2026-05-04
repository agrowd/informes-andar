import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'node:fs';
import path from 'node:path';

import type { AIParams } from './router';
import { getInstitutionalConfig } from '../../docs/constants';

export async function generateWithGemini(input: unknown, params: AIParams): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no está configurada');
  }

  const systemPrompt = fs.readFileSync(path.join(process.cwd(), 'src/lib/prompts/system_prompt.md'), 'utf8');
  const sectionPrompt = fs.readFileSync(path.join(process.cwd(), 'src/lib/prompts/section_prompt.md'), 'utf8');
  const institutional = getInstitutionalConfig();

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: params.model || 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: params.temperature ?? 0,
      responseMimeType: 'application/json',
    }
  });

  // El prompt del usuario con los datos
  const userPrompt = JSON.stringify({ input, sectionPrompt, titles: institutional.titles });

  const result = await model.generateContent(userPrompt);
  const response = await result.response;
  const content = response.text();
  
  if (!content) throw new Error('Respuesta vacía del proveedor Gemini');
  
  // Gemini puede devolver JSON con markdown code blocks, limpiar si es necesario
  let jsonContent = content.trim();
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }
  
  return jsonContent;
}

