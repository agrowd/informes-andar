import OpenAI from 'openai';
import fs from 'node:fs';
import path from 'node:path';

import type { AIParams } from './router';
import { getInstitutionalConfig } from '../../docs/constants';

export async function generateWithOpenAI(input: unknown, params: AIParams): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = fs.readFileSync(path.join(process.cwd(), 'src/lib/prompts/system_prompt.md'), 'utf8');
  const sectionPrompt = fs.readFileSync(path.join(process.cwd(), 'src/lib/prompts/section_prompt.md'), 'utf8');

  const institutional = getInstitutionalConfig();
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: JSON.stringify({ input, sectionPrompt, titles: institutional.titles }) }
  ];

  const response = await client.chat.completions.create({
    model: params.model,
    temperature: params.temperature ?? 0,
    response_format: { type: 'json_object' },
    messages
  } as any);

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error('Respuesta vacía del proveedor');
  return content;
}

