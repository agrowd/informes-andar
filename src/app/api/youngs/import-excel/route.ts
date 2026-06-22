import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ExcelJS from 'exceljs';

const USE_POSTGRES = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);

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
    const pcpSheet = workbook.getWorksheet('PCP');
    const pcpData: any = {
      anio: '',
      rutinas: { semana: '', finDeSemana: '' },
      perfil: { suenos: [], capacidades: [], resultadosEscalas: { gencat: '', sis: '', inico: '', sanMartin: '' } },
      planFuturo: {}
    };

    let nombreCompleto = '';
    let anioPcp = '';

    if (pcpSheet) {
      // Nombre y Apellido
      const nameVal = pcpSheet.getCell('A3').value;
      if (nameVal) {
        nombreCompleto = String(nameVal).replace(/nombre y apellido:\s*/i, '').trim();
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

      // Dreams (row 18 to 20)
      for (let r = 18; r <= 20; r++) {
        const val = pcpSheet.getCell(`A${r}`).value;
        if (val) pcpData.perfil.suenos.push(cleanText(val));
      }

      // Capabilities (row 17 Col 5)
      const capVal = pcpSheet.getCell('E17').value;
      if (capVal) {
        const caps = String(capVal).split(/\s{2,}|\n/).map(c => c.trim()).filter(Boolean);
        pcpData.perfil.capacidades = caps;
      }

      // Plan de futuro (row 26 to 31)
      const dims = ['BF', 'DP', 'RI', 'IS', 'BE', 'AU', 'BM', 'DR'];
      for (let r = 26; r <= 35; r++) {
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

    if (!nombreCompleto) {
      return NextResponse.json({ error: 'No se pudo extraer el nombre del joven de la solapa PCP (Celda A3)' }, { status: 400 });
    }

    // 2. PARSEAR PLANILLAS MENSUALES
    const monthlyReports: any[] = [];
    let mainTaller = '';

    for (const sheet of workbook.worksheets) {
      if (sheet.name === 'PCP' || sheet.name.startsWith('Sheet') || sheet.name === 'Template') continue;

      const report: any = {
        periodo: sheet.name.trim().toUpperCase(),
        facilitadorNombre: '',
        taller: '',
        talleres: [],
        observaciones: ''
      };

      // Facilitador (D4 o C4)
      const facCell = sheet.getCell('D4').value || sheet.getCell('C4').value;
      if (facCell) {
        report.facilitadorNombre = String(facCell).replace(/facilitador\/a:\s*/i, '').trim();
      }

      // Taller (A5 o similar)
      const tallerCell = sheet.getCell('A5').value;
      if (tallerCell) {
        report.taller = String(tallerCell).replace(/taller:\s*/i, '').trim();
        if (!mainTaller) mainTaller = report.taller;
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
    
    if (USE_POSTGRES && sql) {
      // Buscar si el joven existe
      const existing = await sql`
        SELECT id, pcp FROM youngs WHERE nombre_completo ILIKE ${nombreCompleto} LIMIT 1
      `;
      
      if (existing.rows.length > 0) {
        youngIdStr = String(existing.rows[0].id);
        // Mezclar PCP existente con el nuevo
        const mergedPcp = { ...(existing.rows[0].pcp || {}), ...pcpData };
        await sql`
          UPDATE youngs 
          SET pcp = ${JSON.stringify(mergedPcp)}::jsonb, taller = ${mainTaller || null}, updated_at = NOW()
          WHERE id = ${parseInt(youngIdStr)}
        `;
      } else {
        // Crear nuevo
        const result = await sql`
          INSERT INTO youngs (nombre_completo, taller, pcp, created_at, updated_at)
          VALUES (${nombreCompleto}, ${mainTaller || null}, ${JSON.stringify(pcpData)}::jsonb, NOW(), NOW())
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
        await existing.save();
      } else {
        const created = await YoungModel.create({
          nombreCompleto,
          taller: mainTaller || undefined,
          pcp: pcpData
        });
        youngIdStr = created._id.toString();
      }
    }

    // 4. REGISTRAR O ACTUALIZAR PLANILLAS MENSUALES (FORMS)
    const createdFormIds: string[] = [];
    const userId = session?.user?.id ? (USE_POSTGRES ? Number(session.user.id) : session.user.id) : null;

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

    return NextResponse.json({
      success: true,
      youngId: youngIdStr,
      formIds: createdFormIds,
      message: `Joven "${nombreCompleto}" procesado con éxito. Se importó su PCP y ${monthlyReports.length} planillas mensuales (${monthlyReports.map(r => r.periodo).join(', ')}).`
    });

  } catch (error: any) {
    console.error('Error importando Excel:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido al importar el archivo Excel' }, { status: 500 });
  }
}
