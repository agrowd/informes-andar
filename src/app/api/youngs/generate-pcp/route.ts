import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY no configurado en el servidor' }, { status: 500 });
    }

    const body = await req.json();
    const { prompt } = body as { prompt: string };

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return NextResponse.json({ error: 'Se requiere un prompt descriptivo válido de al menos 5 caracteres' }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });
    
    const systemPrompt = `Eres un psicopedagogo especializado en Planificación Centrada en la Persona (PCP) para personas con discapacidad. 
Analiza la descripción provista por el usuario y genera un objeto estructurado de PCP en formato JSON.
Debes rellenar de forma coherente y profesional todos los campos del JSON basándote en la información dada, infiriendo o completando de forma realista si algún detalle falta (especialmente en la tabla de plan futuro).

La salida debe ser estrictamente un objeto JSON con la siguiente estructura:
{
  "anio": "año de la PCP actual, por ejemplo '2026' (intenta inferir del texto o usa el actual)",
  "rutinas": {
    "semana": "Texto narrativo corto resumiendo qué hace durante la semana de lunes a viernes en Granja Andar y su hogar.",
    "finDeSemana": "Texto narrativo corto resumiendo qué hace el fin de semana o en su tiempo libre."
  },
  "perfil": {
    "suenos": [
      "sueño o meta principal 1 (ej: Poder viajar solo en colectivo)",
      "sueño o meta principal 2"
    ],
    "capacidades": [
      "capacidad o fortaleza 1 (ej: Muy buena comunicación verbal y empatía)",
      "capacidad o fortaleza 2"
    ],
    "resultadosEscalas": {
      "gencat": "Resultado o estado de la escala Gencat si se menciona, si no 'Sin evaluar'",
      "sis": "Resultado de la escala SIS (Intensidad de Apoyos) si se menciona, si no 'Sin evaluar'",
      "inico": "Resultado de escala INICO-FEAPS si se menciona, si no 'Sin evaluar'",
      "sanMartin": "Resultado de escala San Martín si se menciona, si no 'Sin evaluar'"
    }
  },
  "planFuturo": {
    "BF": { "objetivos": "...", "espacios": "...", "apoyos": "...", "responsables": "..." },
    "DP": { "objetivos": "...", "espacios": "...", "apoyos": "...", "responsables": "..." },
    "RI": { "objetivos": "...", "espacios": "...", "apoyos": "...", "responsables": "..." },
    "IS": { "objetivos": "...", "espacios": "...", "apoyos": "...", "responsables": "..." },
    "BE": { "objetivos": "...", "espacios": "...", "apoyos": "...", "responsables": "..." },
    "AU": { "objetivos": "...", "espacios": "...", "apoyos": "...", "responsables": "..." },
    "BM": { "objetivos": "...", "espacios": "...", "apoyos": "...", "responsables": "..." },
    "DR": { "objetivos": "...", "espacios": "...", "apoyos": "...", "responsables": "..." }
  }
}

Las claves del plan de futuro corresponden a las dimensiones de Calidad de Vida:
- BF: Bienestar Físico
- DP: Desarrollo Personal
- RI: Relaciones Interpersonales
- IS: Inclusión Social
- BE: Bienestar Emocional
- AU: Autodeterminación
- BM: Bienestar Material
- DR: Derechos

Asegúrate de responder únicamente con el objeto JSON puro sin bloques de código ni texto adicional.`;

    const response = await client.chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Respuesta vacía del modelo de IA');
    }

    const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const pcpData = JSON.parse(cleanJson);

    return NextResponse.json({ success: true, pcp: pcpData });

  } catch (error: any) {
    console.error('Error generando PCP con IA:', error);
    return NextResponse.json({ error: error?.message || 'Error interno del servidor al generar PCP' }, { status: 500 });
  }
}
