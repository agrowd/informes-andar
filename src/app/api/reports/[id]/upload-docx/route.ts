import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mammoth from 'mammoth';

export const dynamic = 'force-dynamic';

const USE_POSTGRES = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);

// Función para parsear texto de Word extraído e intentar separar las 12 secciones oficiales
function parseDocxSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = text.split('\n').map(l => l.trim());
  
  // Expresiones regulares para mapear cada una de las 12 secciones
  const sectionMatchers = [
    { key: 'metaAlcanzada', patterns: [/meta.*alcanzada/i, /1\b.*meta/i, /meta.*anual/i] },
    { key: 'participacion', patterns: [/participaci/i, /2\b.*participaci/i, /asistencia.*talleres/i] },
    { key: 'integracionRelaciones', patterns: [/integraci.*relaci/i, /3\b.*integraci/i, /relaciones.*sociales/i, /vinculaci/i] },
    { key: 'actividadesRelacionadas', patterns: [/actividades.*relacionadas/i, /4\b.*actividad/i, /intereses.*preferencias/i] },
    { key: 'vidaIndependiente', patterns: [/vida.*independiente/i, /5\b.*vida/i, /habilidades.*cotidianas/i] },
    { key: 'habilidadesViajar', patterns: [/viajar/i, /6\b.*viajar/i, /traslados/i, /salidas.*recreativas/i] },
    { key: 'desarrolloPersonal', patterns: [/desarrollo.*personal/i, /7\b.*desarrollo/i, /concentraci/i, /motricidad/i] },
    { key: 'metasDeportivas', patterns: [/deport/i, /8\b.*deport/i, /actividades.*físicas/i, /movimiento/i] },
    { key: 'metasSociales', patterns: [/9\b.*sociales/i, /habilidades.*sociales/i, /dinámicas.*grupales/i] },
    { key: 'dimensionesCalidadVida', patterns: [/10\b.*calidad.*vida/i, /dimensiones.*calidad/i, /bienestar.*emocional/i] },
    { key: 'actividadesComplementarias', patterns: [/11\b.*complement/i, /actividades.*complementarias/i, /música.*arte/i] },
    { key: 'mejoraCalidadVida', patterns: [/12\b.*mejora/i, /mejora.*calidad/i, /conclusión.*integradora/i, /bienestar.*general/i] }
  ];

  let currentKey: string | null = null;
  let currentParagraphs: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Verificar si la línea coincide con algún encabezado de sección
    let matchedKey: string | null = null;
    
    // Solo consideramos encabezados si la línea es relativamente corta (ej. menos de 100 caracteres)
    if (line.length < 100) {
      for (const matcher of sectionMatchers) {
        for (const pattern of matcher.patterns) {
          if (pattern.test(line)) {
            // Verificar si es realmente un encabezado o contiene número de sección
            const hasNumber = /^\s*(\d{1,2})[\.\s]/.test(line);
            const isWordHeader = line.toUpperCase() === line || hasNumber || line.includes(':') || line.length < 50;
            if (isWordHeader) {
              matchedKey = matcher.key;
              break;
            }
          }
        }
        if (matchedKey) break;
      }
    }

    if (matchedKey) {
      // Guardar sección anterior
      if (currentKey && currentParagraphs.length > 0) {
        sections[currentKey] = currentParagraphs.join('\n\n');
      }
      currentKey = matchedKey;
      currentParagraphs = [];
    } else {
      if (currentKey) {
        // Evitar agregar líneas que parecen firmas, fechas u otros encabezados
        if (!/firma/i.test(line) && !/coordinaci/i.test(line) && !/facilitador/i.test(line)) {
          currentParagraphs.push(line);
        }
      }
    }
  }

  // Guardar la última sección
  if (currentKey && currentParagraphs.length > 0) {
    sections[currentKey] = currentParagraphs.join('\n\n');
  }

  return sections;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
    }

    // Validar tipo de archivo (debe ser .docx)
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream' // Algunas configuraciones de navegador envían octet-stream para archivos descargados
    ];
    
    const isDocx = file.name.endsWith('.docx');
    if (!allowedTypes.includes(file.type) && !isDocx) {
      return NextResponse.json({ error: 'Formato inválido. Debe subir un archivo .docx de Word.' }, { status: 400 });
    }

    // Convertir a ArrayBuffer y luego a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Extraer texto con Mammoth
    let extractedText = '';
    let parsedSections: Record<string, string> = {};
    try {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
      if (extractedText.trim()) {
        parsedSections = parseDocxSections(extractedText);
      }
    } catch (e: any) {
      console.error('Error al extraer texto con Mammoth (no crítico):', e);
    }

    // Obtener el informe actual
    let currentData: any = null;
    let originalData: any = null;
    let reportType = 'MENSUAL';
    let currentVersion = 1;

    if (USE_POSTGRES && sql) {
      const reportRes = await sql`
        SELECT data, original_data, report_type, version 
        FROM reports 
        WHERE id = ${parseInt(params.id)}
      `;
      if (reportRes.rows.length === 0) {
        return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 });
      }
      currentData = reportRes.rows[0].data || {};
      originalData = reportRes.rows[0].original_data || null;
      reportType = reportRes.rows[0].report_type || 'MENSUAL';
      currentVersion = reportRes.rows[0].version || 1;
    } else if (process.env.MONGODB_URI) {
      const rep = await ReportModel.findById(params.id).lean();
      if (!rep) {
        return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 });
      }
      currentData = rep.data || {};
      originalData = (rep as any).originalData || null;
      reportType = (rep as any).reportType || 'MENSUAL';
      currentVersion = rep.version || 1;
    }

    // Si original_data es nulo, inicializarlo con la versión actual (que era la original antes de esta subida)
    if (!originalData) {
      originalData = JSON.parse(JSON.stringify(currentData));
    }

    // Si se extrajeron secciones, actualizar el JSON del reporte
    const updatedData = { ...currentData };
    if (!updatedData.secciones) updatedData.secciones = {};

    const detectedKeys = Object.keys(parsedSections);
    if (detectedKeys.length > 0) {
      for (const [key, textVal] of Object.entries(parsedSections)) {
        if (!textVal.trim()) continue;

        if (reportType === 'MENSUAL') {
          // El informe mensual guarda un array de fragmentos
          const existingFrags = updatedData.secciones[key] || [];
          if (existingFrags.length > 0) {
            // Reemplazar el texto del primer fragmento y limpiar los demás
            updatedData.secciones[key] = [
              { ...existingFrags[0], texto: textVal.trim(), fuentes: ['Importación de Word'] }
            ];
          } else {
            updatedData.secciones[key] = [
              { id: '0', texto: textVal.trim(), fuentes: ['Importación de Word'] }
            ];
          }
        } else {
          // El informe trimestral/semestral/anual guarda strings planos
          updatedData.secciones[key] = textVal.trim();
        }
      }
    }

    const nextVersion = currentVersion + 1;

    // Guardar en la Base de Datos
    if (USE_POSTGRES && sql) {
      await sql`
        UPDATE reports
        SET data = ${JSON.stringify(updatedData)}::jsonb,
            original_data = ${JSON.stringify(originalData)}::jsonb,
            edited_docx_base64 = ${base64},
            edited_docx_filename = ${file.name},
            edited_at = NOW(),
            version = ${nextVersion},
            updated_at = NOW()
        WHERE id = ${parseInt(params.id)}
      `;

      // Registrar auditoría
      try {
        const userId = Number(session.user.id) || null;
        await sql`
          INSERT INTO audit_logs (entity_type, entity_id, action, user_id, meta, created_at)
          VALUES ('REPORT', ${parseInt(params.id)}, 'UPLOAD_DOCX', ${userId}, 
            ${JSON.stringify({ version: nextVersion, filename: file.name, detectedSections: detectedKeys })}::jsonb, NOW())
        `;
      } catch (auditErr) {
        console.error('Error al registrar auditoría (no crítico):', auditErr);
      }
    } else if (process.env.MONGODB_URI) {
      await ReportModel.updateOne(
        { _id: params.id },
        { 
          $set: { 
            data: updatedData,
            originalData: originalData,
            editedDocxBase64: base64,
            editedDocxFilename: file.name,
            editedAt: new Date(),
            version: nextVersion
          } 
        }
      );
    }

    return NextResponse.json({ 
      success: true, 
      version: nextVersion,
      detectedSections: detectedKeys,
      message: `Archivo Word importado exitosamente. Se actualizaron ${detectedKeys.length} secciones en la base de datos.`
    });

  } catch (error: any) {
    console.error('Error al importar archivo Word:', error);
    return NextResponse.json({ 
      error: `Error al procesar el archivo Word: ${error?.message || error}` 
    }, { status: 500 });
  }
}
