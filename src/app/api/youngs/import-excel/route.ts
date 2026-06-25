import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ExcelJS from 'exceljs';
import OpenAI from 'openai';

const USE_POSTGRES = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);

async function parseGencatChartWithVision(base64Image: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OpenAI API Key not configured. Skipping GENCAT vision parsing.");
    return '';
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Eres un analista de datos experto en escalas de calidad de vida. Tu tarea es extraer la información cuantitativa de un gráfico de la escala GENCAT / INICO FEAPS.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiza la imagen del gráfico de la escala GENCAT de Calidad de Vida e identifica las puntuaciones estándar asignadas a cada una de las siguientes 8 dimensiones. 
              El gráfico muestra valores del 0 al 20 en el eje vertical (Y) y los nombres de las dimensiones en el eje horizontal (X).
              
              El orden típico de las dimensiones de izquierda a derecha en el gráfico es:
              1. Bienestar Emocional (BE)
              2. Relaciones Interpersonales (RI)
              3. Bienestar Material (BM)
              4. Desarrollo Personal (DP)
              5. Bienestar Físico (BF)
              6. Autodeterminación (AU)
              7. Inclusión Social (IS)
              8. Derechos (DR)
              
              Lee con mucha precisión los números que figuran sobre el gráfico (puntos o etiquetas del gráfico) y devuelve un objeto JSON con las claves exactas de las dimensiones y sus puntuaciones como números. Por ejemplo:
              {
                "BE": 7,
                "RI": 8,
                "BM": 6,
                "DP": 9,
                "BF": 6,
                "AU": 9,
                "IS": 5,
                "DR": 7
              }
              
              Si la imagen no es un gráfico de la escala GENCAT o no se pueden leer los valores, devuelve un objeto vacío.`
            },
            {
              type: 'image_url',
              image_url: {
                url: base64Image
              }
            }
          ]
        }
      ]
    } as any);

    const content = response.choices?.[0]?.message?.content;
    if (!content) return '';

    const parsed = JSON.parse(content);
    const dims = ['BE', 'RI', 'BM', 'DP', 'BF', 'AU', 'IS', 'DR'];
    const parts: string[] = [];
    for (const d of dims) {
      if (typeof parsed[d] !== 'undefined' && parsed[d] !== null) {
        parts.push(`${d}: ${parsed[d]}`);
      }
    }
    return parts.join(' | ');
  } catch (error) {
    console.error("Error in parseGencatChartWithVision:", error);
    return '';
  }
}


function isCellChecked(cell: ExcelJS.Cell) {
  const fill = cell.fill;
  if (!fill || fill.type !== 'pattern') return false;
  const color = fill.fgColor?.argb || fill.fgColor?.theme;
  if (typeof color === 'string') {
    const hex = color.toUpperCase();
    return hex.endsWith('A4C2F4') || hex.endsWith('FF00FF');
  }
  return false;
}

function cleanText(val: any): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    const day = val.getDate();
    const month = val.getMonth() + 1;
    const year = val.getFullYear();
    const hours = val.getHours();
    const mins = val.getMinutes();
    if (hours === 0 && mins === 0) {
      if (year === 2022 || year === new Date().getFullYear()) {
        // En Excel, fracciones como "4/3" se auto-convierten a fechas.
        // Reconstruimos la fracción como "mes/día" (o "día/mes" según corresponda).
        // Por ejemplo, "April 3rd" -> Month 4, Day 3 -> "4/3"
        return `${month}/${day}`;
      }
      return `${day}/${month}/${year}`;
    }
    return val.toLocaleDateString('es-AR');
  }
  return String(val).trim().replace(/\s+/g, ' ');
}

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as Blob;
    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    // 1. PARSEAR PCP
    // Buscar la solapa de PCP de forma flexible y caso-insensible
    const pcpSheet = workbook.worksheets.find(s => {
      const name = s.name.trim().toUpperCase();
      return (
        name === 'PCP' || 
        name === 'P.C.P' || 
        name === 'P.C.P.' || 
        name.includes('PLANIFICACION') || 
        name.includes('PLANIFICACIÓN') ||
        name.startsWith('PCP') ||
        name.startsWith('P.C.P') ||
        name.endsWith('PCP') ||
        name.endsWith('P.C.P')
      );
    });

    const pcpData: any = {
      anio: '',
      rutinas: { semana: '', finDeSemana: '' },
      perfil: { suenos: [], capacidades: [], resultadosEscalas: { gencat: '', sis: '', inico: '', sanMartin: '' } },
      planFuturo: {}
    };

    let nombreCompleto = '';
    let anioPcp = '';
    let mainTaller = '';
    let fotoBase64: string | null = null;
    let pcpLegajo = '';
    let pcpObraSocial = '';
    let pcpDni = '';
    let pcpFechaNacimiento: Date | null = null;

    if (pcpSheet) {
      // Extract profile photo and GENCAT chart by row coordinates
      const images = pcpSheet.getImages();
      let gencatBase64: string | null = null;

      if (images && images.length > 0) {
        let largestMediaFallback: any = null;
        let largestSizeFallback = 0;

        for (const img of images) {
          const range = img.range;
          if (!range || !range.tl) continue;
          
          const media = workbook.model.media && (workbook.model.media as any)[img.imageId];
          if (media && media.buffer) {
            const row = range.tl.row;
            const mimeType = media.extension === 'png' ? 'image/png' : 'image/jpeg';
            const size = media.buffer.length;

            if (row >= 2 && row <= 7) {
              // Profile picture range
              fotoBase64 = `data:${mimeType};base64,${media.buffer.toString('base64')}`;
            } else if (row >= 18 && row <= 23) {
              // GENCAT chart range
              gencatBase64 = `data:${mimeType};base64,${media.buffer.toString('base64')}`;
            } else if (row > 7 && size > largestSizeFallback) {
              // General fallback for profile photo
              largestSizeFallback = size;
              largestMediaFallback = media;
            }
          }
        }

        if (!fotoBase64 && largestMediaFallback) {
          const mimeType = largestMediaFallback.extension === 'png' ? 'image/png' : 'image/jpeg';
          fotoBase64 = `data:${mimeType};base64,${largestMediaFallback.buffer.toString('base64')}`;
        }
      }

      // Escalas (SIS, GENCAT, INICO, SAN MARTIN)
      // Las celdas de escalas suelen estar mergeadas (ej: A21-C21 = "SIS", D21-F21 = "GENCAT").
      // Solo procesamos la primera aparición de cada label y validamos que el valor siguiente no sea otro label.
      const scaleLabels = new Set(['sis', 'gencat', 'inico', 'san martin', 'san martín']);
      const foundScales = new Set<string>();
      for (let r = 1; r <= 40; r++) {
        for (let c = 1; c <= 10; c++) {
          const val = pcpSheet.getCell(r, c).value;
          if (val && typeof val === 'string') {
            const txt = val.trim().toLowerCase();
            // Verificar si esta celda es un label de escala que aún no procesamos
            let matchedScale = '';
            if (txt === 'sis') matchedScale = 'sis';
            else if (txt.trim().toLowerCase().startsWith('gencat')) matchedScale = 'gencat';
            else if (txt.includes('inico')) matchedScale = 'inico';
            else if (txt.includes('san martin') || txt.includes('san martín')) matchedScale = 'sanmartin';

            if (matchedScale && !foundScales.has(matchedScale)) {
              foundScales.add(matchedScale);
              // Buscar el valor de la escala debajo (r+1, c) - prioridad sobre la celda a la derecha
              const belowVal = pcpSheet.getCell(r + 1, c).value;
              const rightVal = pcpSheet.getCell(r, c + 1).value;
              // Elegir el valor que no sea null ni otro label de escala
              const isScaleLabel = (v: any) => {
                if (!v || typeof v !== 'string') return false;
                const vl = String(v).trim().toLowerCase();
                return scaleLabels.has(vl) || vl === txt;
              };
              const scoreVal = (belowVal && !isScaleLabel(belowVal)) ? belowVal 
                             : (rightVal && !isScaleLabel(rightVal)) ? rightVal 
                             : null;
              if (scoreVal) {
                const cleaned = cleanText(scoreVal);
                if (matchedScale === 'sis') pcpData.perfil.resultadosEscalas.sis = cleaned;
                else if (matchedScale === 'gencat') pcpData.perfil.resultadosEscalas.gencat = cleaned;
                else if (matchedScale === 'inico') pcpData.perfil.resultadosEscalas.inico = cleaned;
                else if (matchedScale === 'sanmartin') pcpData.perfil.resultadosEscalas.sanMartin = cleaned;
              }
            }
          }
        }
      }

      // Si se extrajo la imagen del gráfico GENCAT y no se detectó texto en las celdas, usar OpenAI Vision
      if (gencatBase64 && (!pcpData.perfil.resultadosEscalas.gencat || pcpData.perfil.resultadosEscalas.gencat.trim().length === 0)) {
        console.log("Analyzing GENCAT chart with OpenAI Vision...");
        const parsedGencat = await parseGencatChartWithVision(gencatBase64);
        if (parsedGencat) {
          pcpData.perfil.resultadosEscalas.gencat = parsedGencat;
          console.log("Successfully parsed GENCAT scores using Vision:", parsedGencat);
        }
      }


      // Scan PCP sheet dynamically for legajo, obraSocial, dni, fechaNacimiento, taller
      for (let r = 1; r <= 20; r++) {
        for (let c = 1; c <= 8; c++) {
          const val = pcpSheet.getCell(r, c).value;
          if (val) {
            const txt = String(val).trim();
            const low = txt.toLowerCase();
            if (/legajo/i.test(low)) {
              const matched = txt.replace(/legajo:\s*/i, '').trim();
              if (matched) pcpLegajo = matched;
              else {
                const nextVal = pcpSheet.getCell(r, c + 1).value || pcpSheet.getCell(r + 1, c).value;
                if (nextVal) pcpLegajo = cleanText(nextVal);
              }
            } else if (/obra\s*social/i.test(low)) {
              const matched = txt.replace(/obra\s*social:\s*/i, '').trim();
              if (matched) pcpObraSocial = matched;
              else {
                const nextVal = pcpSheet.getCell(r, c + 1).value || pcpSheet.getCell(r + 1, c).value;
                if (nextVal) pcpObraSocial = cleanText(nextVal);
              }
            } else if (/dni/i.test(low) && !low.includes('dimensi')) {
              const matched = txt.replace(/dni:\s*/i, '').trim();
              if (matched) pcpDni = matched;
              else {
                const nextVal = pcpSheet.getCell(r, c + 1).value || pcpSheet.getCell(r + 1, c).value;
                if (nextVal) pcpDni = cleanText(nextVal);
              }
            } else if (/fecha\s*de\s*nacimiento/i.test(low) || /nacimiento/i.test(low)) {
              const nextVal = pcpSheet.getCell(r, c + 1).value || pcpSheet.getCell(r + 1, c).value;
              if (nextVal instanceof Date) {
                pcpFechaNacimiento = nextVal;
              } else if (nextVal) {
                const parsedDate = new Date(String(nextVal).trim());
                if (!isNaN(parsedDate.getTime())) pcpFechaNacimiento = parsedDate;
              }
            } else if (/taller/i.test(low)) {
              const parsedTaller = txt
                .replace(/taller:\s*/i, '')
                .replace(/taller de\s*/i, '')
                .trim();
              if (parsedTaller) {
                mainTaller = parsedTaller;
              } else {
                const nextVal = pcpSheet.getCell(r, c + 1).value || pcpSheet.getCell(r + 1, c).value;
                if (nextVal) {
                  mainTaller = String(nextVal)
                    .replace(/taller de\s*/i, '')
                    .replace(/taller:\s*/i, '')
                    .trim();
                }
              }
            }
          }
        }
      }

      // Buscar nombre de manera flexible en el PCP (filas 1 a 6, columnas 1 a 4)
      for (let r = 1; r <= 6; r++) {
        for (let c = 1; c <= 4; c++) {
          const val = pcpSheet.getCell(r, c).value;
          if (val && typeof val === 'string') {
            const cleanVal = val.trim();
            if (/nombre/i.test(cleanVal)) {
              nombreCompleto = cleanVal
                .replace(/nombre y apellido:\s*/i, '')
                .replace(/nombre:\s*/i, '')
                .trim();
              break;
            }
          }
        }
        if (nombreCompleto) break;
      }
      // Fallback a celda A3 si no se encontró por escaneo
      if (!nombreCompleto) {
        const nameVal = pcpSheet.getCell('A3').value;
        if (nameVal) {
          nombreCompleto = String(nameVal).replace(/nombre y apellido:\s*/i, '').trim();
        }
      }

      // Año
      const anioVal = pcpSheet.getCell('A2').value;
      if (anioVal) {
        const m = String(anioVal).match(/\d+/);
        if (m) anioPcp = m[0];
      }
      pcpData.anio = anioPcp;

      // Rutinas
      const routineCell = pcpSheet.getCell('A9').value;
      if (routineCell) {
        const text = String(routineCell).trim();
        const splitIdx = text.toLowerCase().indexOf('los fines de semana');
        if (splitIdx !== -1) {
          pcpData.rutinas.semana = text.substring(0, splitIdx).trim();
          pcpData.rutinas.finDeSemana = text.substring(splitIdx).trim();
        } else {
          pcpData.rutinas.semana = text;
        }
      }

      // Dreams (dinámico)
      let scanDreams = false;
      const ignoreDreamsLabels = ['SUEÑO', 'SUEÑOS', 'DCV', 'AREA DE APOYO', 'SEGUIMIENTO'];
      for (let r = 12; r <= 25; r++) {
        const val = pcpSheet.getCell(r, 1).value;
        if (val) {
          const txt = String(val).trim().toUpperCase();
          if (txt.includes('SUEÑO') || txt.includes('SUEÑOS')) {
            scanDreams = true;
            continue;
          }
          if (txt === 'SIS' || txt.includes('PLAN DE FUTURO') || txt.includes('DIMENSI') || txt.includes('GENCAT')) {
            scanDreams = false;
            break;
          }
          if (scanDreams) {
            const cleanVal = cleanText(val);
            if (cleanVal && !ignoreDreamsLabels.includes(cleanVal.toUpperCase()) && !pcpData.perfil.suenos.includes(cleanVal)) {
              pcpData.perfil.suenos.push(cleanVal);
            }
          }
        }
      }

      // Capabilities (row 17 Col 5)
      const capVal = pcpSheet.getCell('E17').value;
      if (capVal) {
        const caps = String(capVal).split(/\s{2,}|\n/).map(c => c.trim()).filter(Boolean);
        pcpData.perfil.capacidades = caps;
      }

      // Plan de futuro (row 24 to 35)
      const dims = ['BF', 'DP', 'RI', 'IS', 'BE', 'AU', 'BM', 'DR'];
      for (let r = 24; r <= 35; r++) {
        const dimCodeRaw = pcpSheet.getCell(`A${r}`).value;
        if (!dimCodeRaw) continue;
        let dimCode = String(dimCodeRaw).trim().toUpperCase().replace(/\./g, '');
        if (dimCode === 'R.I' || dimCode === 'RI') dimCode = 'RI';
        if (dims.includes(dimCode)) {
          const obj = cleanText(pcpSheet.getCell(`B${r}`).value);
          const esp = cleanText(pcpSheet.getCell(`C${r}`).value);
          const apoy = cleanText(pcpSheet.getCell(`D${r}`).value || pcpSheet.getCell(`E${r}`).value);
          const resp = cleanText(pcpSheet.getCell(`F${r}`).value);
          pcpData.planFuturo[dimCode] = { objetivos: obj, espacios: esp, apoyos: apoy, responsables: resp };
        }
      }
    }

    // Si aún no se encontró el nombre en el PCP, buscar en las solapas mensuales
    if (!nombreCompleto) {
      for (const sheet of workbook.worksheets) {
        if (pcpSheet && sheet.id === pcpSheet.id) continue;
        const sheetNameUpper = sheet.name.trim().toUpperCase();
        if (
          sheetNameUpper.includes('PLANIFICACION') ||
          sheetNameUpper.includes('PLANIFICACIÓN') ||
          sheetNameUpper.startsWith('SHEET') || 
          sheetNameUpper === 'TEMPLATE' ||
          sheetNameUpper === 'PLANTILLA' ||
          sheetNameUpper.startsWith('HOJA')
        ) continue;

        for (let r = 1; r <= 6; r++) {
          for (let c = 1; c <= 4; c++) {
            const val = sheet.getCell(r, c).value;
            if (val && typeof val === 'string') {
              const cleanVal = val.trim();
              if (/nombre/i.test(cleanVal)) {
                nombreCompleto = cleanVal
                  .replace(/nombre:\s*/i, '')
                  .replace(/nombre y apellido:\s*/i, '')
                  .trim();
                break;
              }
            }
          }
          if (nombreCompleto) break;
        }
        if (nombreCompleto) break;
      }
    }

    if (!nombreCompleto) {
      return NextResponse.json({ error: 'No se pudo extraer el nombre del joven de la solapa PCP ni de las solapas mensuales (ej: Celda A3 o A2)' }, { status: 400 });
    }

    // Helper para traducir nombres de meses a números
    const getMonthNumber = (name: string): string => {
      const months: Record<string, string> = {
        'ENERO': '01', 'ENE': '01',
        'FEBRERO': '02', 'FEB': '02',
        'MARZO': '03', 'MAR': '03',
        'ABRIL': '04', 'ABR': '04',
        'MAYO': '05', 'MAY': '05',
        'JUNIO': '06', 'JUN': '06',
        'JULIO': '07', 'JUL': '07',
        'AGOSTO': '08', 'AGO': '08',
        'SEPTIEMBRE': '09', 'SEP': '09', 'SETIEMBRE': '09', 'SET': '09',
        'OCTUBRE': '10', 'OCT': '10',
        'NOVIEMBRE': '11', 'NOV': '11',
        'DICIEMBRE': '12', 'DIC': '12'
      };
      const n = name.trim().toUpperCase();
      for (const [key, val] of Object.entries(months)) {
        if (n.startsWith(key) || n.includes(key)) return val;
      }
      return '';
    };

    // 2. PARSEAR PLANILLAS MENSUALES
    const monthlyReports: any[] = [];

    for (const sheet of workbook.worksheets) {
      if (pcpSheet && sheet.id === pcpSheet.id) continue;
      const sheetNameUpper = sheet.name.trim().toUpperCase();
      if (
        sheetNameUpper.includes('PLANIFICACION') ||
        sheetNameUpper.includes('PLANIFICACIÓN') ||
        sheetNameUpper.startsWith('SHEET') || 
        sheetNameUpper === 'TEMPLATE' ||
        sheetNameUpper === 'PLANTILLA' ||
        sheetNameUpper.startsWith('HOJA')
      ) continue;

      const monthNum = getMonthNumber(sheet.name);
      const parsedPeriod = monthNum ? `${anioPcp || new Date().getFullYear()}-${monthNum}` : sheet.name.trim().toUpperCase();

      const report: any = {
        periodo: parsedPeriod,
        facilitadorNombre: '',
        taller: '',
        talleres: [],
        observaciones: ''
      };

      // Buscar facilitador/a y taller de forma dinámica en las primeras filas para mayor compatibilidad
      let facilitadorNombre = '';
      let taller = '';
      for (let r = 1; r <= 6; r++) {
        for (let c = 1; c <= 8; c++) {
          const val = sheet.getCell(r, c).value;
          if (val && typeof val === 'string') {
            const cleanVal = val.trim();
            if (/facilitador/i.test(cleanVal)) {
              facilitadorNombre = cleanVal
                .replace(/facilitador\/a:\s*/i, '')
                .replace(/facilitador:\s*/i, '')
                .replace(/facilitadora:\s*/i, '')
                .trim();
            } else if (/taller:/i.test(cleanVal)) {
              taller = cleanVal.replace(/taller:\s*/i, '').trim();
            }
          }
        }
      }
      report.facilitadorNombre = facilitadorNombre || '';
      report.taller = taller || '';
      if (report.taller && !mainTaller) {
        mainTaller = report.taller;
      }

      let currentTaller: any = null;
      let obsStartRow = 62;

      for (let r = 5; r <= 120; r++) {
        const cellA = sheet.getCell(r, 1);
        const valA = cellA.value;

        // Taller Heading
        if (valA && String(valA).toUpperCase().includes('TALLER:')) {
          const tallerName = String(valA).replace(/TALLER:\s*/i, '').trim();
          currentTaller = { nombre: tallerName, items: [] };
          report.talleres.push(currentTaller);
          continue;
        }

        // Observaciones Heading
        if (valA && String(valA).toLowerCase().includes('observaciones:')) {
          obsStartRow = r + 1;
          break;
        }

        // Parse items in this row (A, E, I, M, Q, U, Y, AC...)
        for (let c = 1; c <= 32; c += 4) {
          const itemCell = sheet.getCell(r, c);
          const itemName = itemCell.value;
          if (itemName && typeof itemName === 'string' && itemName.trim().length > 2 && !itemName.toUpperCase().includes('REFERENCIAS') && !itemName.toUpperCase().includes('ENSEÑADO')) {
            let nivel = 0;
            if (isCellChecked(sheet.getCell(r + 2, c + 1))) nivel++;
            if (isCellChecked(sheet.getCell(r + 3, c + 1))) nivel++;
            if (isCellChecked(sheet.getCell(r + 2, c + 3))) nivel++;
            if (isCellChecked(sheet.getCell(r + 3, c + 3))) nivel++;

            const item = {
              nombre: itemName.trim(),
              nivel: nivel
            };

            if (currentTaller) {
              currentTaller.items.push(item);
            }
          }
        }
      }

      // Observaciones
      let obsText = '';
      for (let r = obsStartRow; r <= 150; r++) {
        const val = sheet.getCell(r, 1).value;
        if (val) obsText += String(val) + '\n';
      }
      report.observaciones = obsText.trim();

      monthlyReports.push(report);
    }

    // 3. GUARDAR JOVEN EN LA BASE DE DATOS
    let youngIdStr = '';
    const userId = session?.user?.id ? (USE_POSTGRES ? Number(session.user.id) : session.user.id) : null;
    
    if (USE_POSTGRES && sql) {
      // Buscar si el joven existe
      const existing = await sql`
        SELECT id, pcp, foto, legajo, obra_social, dni, fecha_nacimiento, assigned_facilitators, taller 
        FROM youngs WHERE nombre_completo ILIKE ${nombreCompleto} LIMIT 1
      `;
      
      if (existing.rows.length > 0) {
        const youngRow = existing.rows[0];
        youngIdStr = String(youngRow.id);
        
        // Mezclar PCP existente con el nuevo
        const mergedPcp = { ...(youngRow.pcp || {}), ...pcpData };
        
        // Mezclar facilitadores asignados
        let facilitators = youngRow.assigned_facilitators || [];
        if (userId && !facilitators.includes(userId)) {
          facilitators = [...facilitators, userId];
        }
        const arrayString = facilitators.length > 0 ? `{${facilitators.join(',')}}` : '{}';

        // Mantener datos existentes si el Excel no los proveyó
        const finalPhoto = fotoBase64 || youngRow.foto || null;
        const finalLegajo = pcpLegajo || youngRow.legajo || null;
        const finalObraSocial = pcpObraSocial || youngRow.obra_social || null;
        const finalDni = pcpDni || youngRow.dni || null;
        const finalBirth = pcpFechaNacimiento ? pcpFechaNacimiento.toISOString() : (youngRow.fecha_nacimiento || null);
        const finalTaller = mainTaller || youngRow.taller || null;

        await sql`
          UPDATE youngs 
          SET 
            pcp = ${JSON.stringify(mergedPcp)}::jsonb, 
            taller = ${finalTaller}, 
            foto = ${finalPhoto},
            legajo = ${finalLegajo},
            obra_social = ${finalObraSocial},
            dni = ${finalDni},
            fecha_nacimiento = ${finalBirth},
            assigned_facilitators = ${arrayString}::int4[],
            updated_at = NOW()
          WHERE id = ${parseInt(youngIdStr)}
        `;
      } else {
        // Crear nuevo
        const facilitators = userId ? [userId] : [];
        const arrayString = facilitators.length > 0 ? `{${facilitators.join(',')}}` : '{}';

        const result = await sql`
          INSERT INTO youngs (nombre_completo, taller, pcp, foto, legajo, obra_social, dni, fecha_nacimiento, assigned_facilitators, created_at, updated_at)
          VALUES (
            ${nombreCompleto}, 
            ${mainTaller || null}, 
            ${JSON.stringify(pcpData)}::jsonb, 
            ${fotoBase64 || null},
            ${pcpLegajo || null},
            ${pcpObraSocial || null},
            ${pcpDni || null},
            ${pcpFechaNacimiento ? pcpFechaNacimiento.toISOString() : null},
            ${arrayString}::int4[], 
            NOW(), 
            NOW()
          )
          RETURNING id
        `;
        youngIdStr = String(result.rows[0].id);
      }
    } else if (process.env.MONGODB_URI) {
      const { YoungModel } = await import('@/models/Young');
      const existing = await YoungModel.findOne({ nombreCompleto: { $regex: new RegExp('^' + nombreCompleto + '$', 'i') } });
      
      if (existing) {
        youngIdStr = existing._id.toString();
        existing.pcp = { ...(existing.pcp || {}), ...pcpData };
        if (mainTaller) existing.taller = mainTaller;
        if (fotoBase64) existing.foto = fotoBase64;
        if (pcpLegajo) existing.legajo = pcpLegajo;
        if (pcpObraSocial) existing.obraSocial = pcpObraSocial;
        if (pcpDni) existing.dni = pcpDni;
        if (pcpFechaNacimiento) existing.fechaNacimiento = pcpFechaNacimiento;
        
        if (userId) {
          const facilitators = existing.assignedFacilitators || [];
          if (!facilitators.map(f => f.toString()).includes(userId.toString())) {
            existing.assignedFacilitators.push(userId);
          }
        }
        await existing.save();
      } else {
        const facilitators = userId ? [userId] : [];
        const created = await YoungModel.create({
          nombreCompleto,
          taller: mainTaller || undefined,
          pcp: pcpData,
          foto: fotoBase64 || undefined,
          legajo: pcpLegajo || undefined,
          obraSocial: pcpObraSocial || undefined,
          dni: pcpDni || undefined,
          fechaNacimiento: pcpFechaNacimiento || undefined,
          assignedFacilitators: facilitators
        });
        youngIdStr = created._id.toString();
      }
    }

    // 4. REGISTRAR O ACTUALIZAR PLANILLAS MENSUALES (FORMS)
    const createdFormIds: string[] = [];

    for (const report of monthlyReports) {
      const formData = {
        datosGenerales: {
          nombreCompleto,
          periodo: report.periodo,
          taller: report.taller,
          youngId: youngIdStr,
          facilitadorNombre: report.facilitadorNombre || session.user.name || session.user.email
        },
        talleres: report.talleres,
        observaciones: report.observaciones
      };

      if (USE_POSTGRES && sql) {
        // Buscar borrador mensual existente
        const existing = await sql`
          SELECT id FROM forms 
          WHERE young_id = ${parseInt(youngIdStr)} AND periodo = ${report.periodo} 
          LIMIT 1
        `;

        if (existing.rows.length > 0) {
          const formId = String(existing.rows[0].id);
          await sql`
            UPDATE forms 
            SET data = ${JSON.stringify(formData)}::jsonb, updated_at = NOW()
            WHERE id = ${parseInt(formId)}
          `;
          createdFormIds.push(formId);
        } else {
          const result = await sql`
            INSERT INTO forms (young_id, periodo, data, created_by, status, created_at, updated_at)
            VALUES (${parseInt(youngIdStr)}, ${report.periodo}, ${JSON.stringify(formData)}::jsonb, ${userId}, 'BORRADOR', NOW(), NOW())
            RETURNING id
          `;
          createdFormIds.push(String(result.rows[0].id));
        }
      } else if (process.env.MONGODB_URI) {
        const { FormModel } = await import('@/models/Form');
        const existing = await FormModel.findOne({ youngId: youngIdStr, periodo: report.periodo });
        if (existing) {
          existing.data = formData;
          existing.updatedAt = new Date();
          await existing.save();
          createdFormIds.push(existing._id.toString());
        } else {
          const created = await FormModel.create({
            youngId: youngIdStr,
            periodo: report.periodo,
            data: formData,
            createdBy: userId,
            status: 'BORRADOR'
          });
          createdFormIds.push(created._id.toString());
        }
      }
    }

    const importedMonths = monthlyReports.map((report, idx) => ({
      formId: createdFormIds[idx],
      periodo: report.periodo
    }));

    return NextResponse.json({
      success: true,
      youngId: youngIdStr,
      formIds: createdFormIds,
      importedMonths,
      message: `Joven "${nombreCompleto}" procesado con éxito. Se importó su PCP y ${monthlyReports.length} planillas mensuales (${monthlyReports.map(r => r.periodo).join(', ')}).`
    });

  } catch (error: any) {
    console.error('Error importando Excel:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido al importar el archivo Excel' }, { status: 500 });
  }
}
