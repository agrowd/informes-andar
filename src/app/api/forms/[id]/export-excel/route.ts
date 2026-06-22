import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';

const USE_POSTGRES = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const formId = params.id;
    let formData: any = null;

    if (USE_POSTGRES && sql) {
      const result = await sql`
        SELECT data, periodo FROM forms WHERE id = ${parseInt(formId)}
      `;
      if (result.rows.length > 0) {
        formData = result.rows[0].data;
      }
    } else if (process.env.MONGODB_URI) {
      const { FormModel } = await import('@/models/Form');
      const item = await FormModel.findById(formId).lean();
      if (item) {
        formData = item.data;
      }
    }

    if (!formData) {
      return NextResponse.json({ error: 'Borrador no encontrado' }, { status: 404 });
    }

    const templatePath = path.join(process.cwd(), 'templates', 'monthly_template.xlsx');
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Plantilla de Excel no encontrada en el servidor' }, { status: 500 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const targetPeriod = (formData.datosGenerales?.periodo || 'JULIO').trim().toUpperCase();

    // 1. Encontrar o crear la solapa correspondiente
    let sheet = workbook.getWorksheet(targetPeriod);
    if (!sheet) {
      // Si no existe, tomar la primera solapa que no sea 'PCP' como base y renombrarla
      const baseSheet = workbook.worksheets.find(w => w.name !== 'PCP');
      if (baseSheet) {
        baseSheet.name = targetPeriod;
        sheet = baseSheet;
      } else {
        return NextResponse.json({ error: 'No se encontró una solapa base en la plantilla' }, { status: 500 });
      }
    }

    // Dejar solo la solapa actual y borrar el resto (opcionalmente dejar PCP)
    for (const w of [...workbook.worksheets]) {
      if (w.name !== targetPeriod && w.name !== 'PCP') {
        workbook.removeWorksheet(w.id);
      }
    }

    // 2. Escribir Datos Generales
    const nombreCompleto = formData.datosGenerales?.nombreCompleto || '';
    const facilitadorNombre = formData.datosGenerales?.facilitadorNombre || '';
    
    sheet.getCell('A3').value = `Nombre y Apellido: ${nombreCompleto}`;
    
    const facCell = sheet.getCell('D4');
    if (facCell.value && String(facCell.value).toLowerCase().includes('facilitador/a:')) {
      facCell.value = `Facilitador/a: ${facilitadorNombre}`;
    } else {
      sheet.getCell('C4').value = `Facilitador/a: ${facilitadorNombre}`;
    }

    // 3. Limpiar checkboxes existentes en la planilla plantilla
    // Escaneamos las columnas A, E, I, M, Q, U, Y, AC (c = 1, 5, 9, 13, 17, 21, 25, 29)
    const cols = [1, 5, 9, 13, 17, 21, 25, 29];
    for (let r = 5; r <= 120; r++) {
      for (const c of cols) {
        const itemCell = sheet.getCell(r, c);
        const val = itemCell.value;
        if (val && typeof val === 'string' && val.trim().length > 2 && !val.toUpperCase().includes('REFERENCIAS') && !val.toUpperCase().includes('ENSEÑADO')) {
          // Limpiar celdas de checklist
          for (let rowOffset = 2; rowOffset <= 4; rowOffset++) {
            for (let colOffset = 1; colOffset <= 2; colOffset++) {
              const cell = sheet.getCell(r + rowOffset, c + colOffset);
              cell.fill = {
                type: 'pattern',
                pattern: 'none'
              };
            }
          }
        }
      }
    }

    // Helper para pintar la celda
    const paintCell = (r: number, c: number) => {
      const fillStyle: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFA4C2F4' } // Color celeste de la grilla
      };
      sheet.getCell(r, c).fill = fillStyle;
      sheet.getCell(r, c + 1).fill = fillStyle;
    };

    // 4. Mapear y colorear los checklists guardados
    const talleres = formData.talleres || [];
    let obsRowStart = 62;

    for (const taller of talleres) {
      const tallerName = String(taller.nombre).trim().toUpperCase();
      
      // Buscar la fila de inicio del taller en la columna A
      let tallerRow = -1;
      for (let r = 5; r <= 120; r++) {
        const val = sheet.getCell(r, 1).value;
        if (val && String(val).toUpperCase().includes('TALLER:') && String(val).toUpperCase().includes(tallerName)) {
          tallerRow = r;
          break;
        }
      }

      // Si no se encuentra exactamente, buscar por coincidencia parcial o ignorar para posicionar
      if (tallerRow === -1) continue;

      // Buscar ítems dentro del taller
      for (const item of taller.items) {
        const itemNameNormalized = String(item.nombre).trim().toLowerCase();
        let itemFound = false;

        // Escanear el bloque del taller (desde tallerRow hasta el siguiente "TALLER:" o "Observaciones:")
        for (let r = tallerRow + 1; r <= tallerRow + 30 && r <= 120; r++) {
          const valA = sheet.getCell(r, 1).value;
          if (valA && String(valA).toUpperCase().includes('TALLER:')) break;
          if (valA && String(valA).toLowerCase().includes('observaciones:')) {
            obsRowStart = r + 1;
            break;
          }

          for (const c of cols) {
            const cell = sheet.getCell(r, c);
            const val = cell.value;
            if (val && typeof val === 'string' && val.trim().toLowerCase() === itemNameNormalized) {
              // Pintar según estados
              if (item.enseñado) paintCell(r + 2, c + 1);
              if (item.apoyo) paintCell(r + 3, c + 1);
              if (item.sola) paintCell(r + 4, c + 1);
              itemFound = true;
              break;
            }
          }
          if (itemFound) break;
        }
      }
    }

    // 5. Escribir Observaciones
    // Encontrar la celda de Observaciones:
    let obsRow = -1;
    for (let r = 30; r <= 130; r++) {
      const val = sheet.getCell(r, 1).value;
      if (val && String(val).toLowerCase().includes('observaciones:')) {
        obsRow = r;
        break;
      }
    }

    if (obsRow !== -1) {
      // Limpiar celdas de observaciones abajo de la cabecera
      for (let r = obsRow + 1; r <= obsRow + 25; r++) {
        sheet.getCell(r, 1).value = null;
      }
      // Escribir las observaciones
      const obsText = formData.observaciones || '';
      const lines = obsText.split('\n');
      lines.forEach((line: string, idx: number) => {
        sheet.getCell(obsRow + 1 + idx, 1).value = line;
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="checklist-${nombreCompleto.replace(/\s+/g, '_')}-${targetPeriod}.xlsx"`
      }
    });

  } catch (error: any) {
    console.error('Error al exportar Excel:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido al exportar planilla' }, { status: 500 });
  }
}
