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

    const reportId = params.id;
    let reportData: any = null;
    let reportType = 'MENSUAL';
    let sourceFormIds: any[] = [];
    let youngId: string = '';
    let young: any = null;

    // 1. Obtener datos del reporte
    if (USE_POSTGRES && sql) {
      const result = await sql`
        SELECT r.data, r.report_type, r.source_report_ids, r.young_id, y.nombre_completo, y.dni, y.taller, y.fecha_nacimiento, y.legajo, y.obra_social, y.pcp
        FROM reports r
        LEFT JOIN youngs y ON r.young_id = y.id
        WHERE r.id = ${parseInt(reportId)}
      `;
      if (result.rows.length > 0) {
        const row = result.rows[0];
        reportData = row.data;
        reportType = row.report_type || 'MENSUAL';
        sourceFormIds = row.source_report_ids || [];
        youngId = String(row.young_id);
        young = {
          nombre_completo: row.nombre_completo,
          dni: row.dni,
          taller: row.taller,
          fecha_nacimiento: row.fecha_nacimiento,
          legajo: row.legajo,
          obra_social: row.obra_social,
          pcp: row.pcp
        };
      }
    } else if (process.env.MONGODB_URI) {
      const { ReportModel } = await import('@/models/Report');
      const rep = await ReportModel.findById(reportId).lean();
      if (rep) {
        reportData = rep.data;
        reportType = (rep as any).reportType || 'MENSUAL';
        sourceFormIds = (rep as any).sourceFormIds || (rep as any).sourceReportIds || [];
        youngId = rep.youngId?.toString() || '';

        try {
          const { YoungModel } = await import('@/models/Young');
          const youngItem = await YoungModel.findById(youngId).lean();
          if (youngItem) {
            young = {
              nombre_completo: (youngItem as any).nombreCompleto || (youngItem as any).nombre_completo,
              dni: (youngItem as any).dni,
              taller: (youngItem as any).taller,
              fecha_nacimiento: (youngItem as any).fechaNacimiento || (youngItem as any).fecha_nacimiento,
              legajo: (youngItem as any).legajo,
              obra_social: (youngItem as any).obraSocial || (youngItem as any).obra_social,
              pcp: (youngItem as any).pcp
            };
          }
        } catch (e) {
          console.error('Error fetching young in Mongo reports export-excel:', e);
        }
      }
    }

    if (!reportData) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
    }

    // 2. Obtener los formularios origen para consolidar los datos de habilidades
    let forms: any[] = [];
    if (sourceFormIds.length > 0) {
      if (USE_POSTGRES && sql) {
        const ids = sourceFormIds.map(id => parseInt(id));
        const arrayString = `{${ids.join(',')}}`;
        const result = await sql`
          SELECT data, periodo FROM forms WHERE id = ANY(${arrayString}::int4[])
        `;
        forms = result.rows.map(r => r.data);
      } else if (process.env.MONGODB_URI) {
        const { FormModel } = await import('@/models/Form');
        const found = await FormModel.find({ _id: { $in: sourceFormIds } }).lean();
        forms = found.map(f => f.data);
      }
    } else {
      // Fallback: si es de tipo MENSUAL y no tiene sourceFormIds, buscar el formulario original
      if (reportType === 'MENSUAL' && reportData.id) {
        if (USE_POSTGRES && sql) {
          const result = await sql`
            SELECT data FROM forms WHERE id = ${parseInt(reportData.id)}
          `;
          if (result.rows.length > 0) forms = [result.rows[0].data];
        } else if (process.env.MONGODB_URI) {
          const { FormModel } = await import('@/models/Form');
          const found = await FormModel.findById(reportData.id).lean();
          if (found) forms = [found.data];
        }
      }
    }

    // 3. Cargar la plantilla de Excel
    const templatePath = path.join(process.cwd(), 'templates', 'monthly_template.xlsx');
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Plantilla de Excel no encontrada en el servidor' }, { status: 500 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    // Período
    const targetPeriod = (reportData.datosGenerales?.periodo || 'TRIMESTRE').trim().toUpperCase();

    // Encontrar o crear la solapa correspondiente
    let sheet = workbook.getWorksheet(targetPeriod);
    if (!sheet) {
      const baseSheet = workbook.worksheets.find(w => w.name !== 'PCP');
      if (baseSheet) {
        baseSheet.name = targetPeriod;
        sheet = baseSheet;
      } else {
        return NextResponse.json({ error: 'No se encontró una solapa base en la plantilla' }, { status: 500 });
      }
    }

    // Eliminar las demás solapas excepto PCP
    for (const w of [...workbook.worksheets]) {
      if (w.name !== targetPeriod && w.name !== 'PCP') {
        workbook.removeWorksheet(w.id);
      }
    }

    // Rellenar solapa PCP
    const pcpSheet = workbook.getWorksheet('PCP');
    if (pcpSheet && young) {
      writePcpSheet(pcpSheet, young);
    }

    // 4. Escribir Datos Generales en la cabecera del período mensual/trimestral
    const nombreCompleto = young?.nombre_completo || reportData.datosGenerales?.nombreCompleto || '';
    const facilitadorNombre = reportData.datosGenerales?.facilitadores || reportData.datosGenerales?.facilitadorNombre || '';
    
    sheet.getCell('A3').value = `Nombre y Apellido: ${nombreCompleto}`;
    
    const facCell = sheet.getCell('D4');
    if (facCell.value && String(facCell.value).toLowerCase().includes('facilitador/a:')) {
      facCell.value = `Facilitador/a: ${facilitadorNombre}`;
    } else {
      sheet.getCell('C4').value = `Facilitador/a: ${facilitadorNombre}`;
    }

    // 5. Limpiar checkboxes de la plantilla
    const cols = [1, 5, 9, 13, 17, 21, 25, 29];
    for (let r = 5; r <= 120; r++) {
      for (const c of cols) {
        const itemCell = sheet.getCell(r, c);
        const val = itemCell.value;
        if (val && typeof val === 'string' && val.trim().length > 2 && !val.toUpperCase().includes('REFERENCIAS') && !val.toUpperCase().includes('ENSEÑADO')) {
          for (let rowOffset = 2; rowOffset <= 3; rowOffset++) {
            for (let colOffset = 1; colOffset <= 4; colOffset++) {
              const cell = sheet.getCell(r + rowOffset, c + colOffset);
              cell.fill = { type: 'pattern', pattern: 'none' };
            }
          }
        }
      }
    }

    // Helpers de coloreado
    const paintLeftCell = (row: number, col: number) => {
      const fillStyle: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFA4C2F4' }
      };
      sheet.getCell(row, col).fill = fillStyle;
      sheet.getCell(row, col + 1).fill = fillStyle;
    };

    const paintRightCell = (row: number, col: number) => {
      const fillStyle: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFA4C2F4' }
      };
      sheet.getCell(row, col + 2).fill = fillStyle;
      sheet.getCell(row, col + 3).fill = fillStyle;
    };

    // 6. Consolidar habilidades: sumar (tomar máximo) de las planillas mensuales
    // Agrupamos por taller y nombre de habilidad.
    const consolidatedSkills: Record<string, Record<string, number>> = {};
    const consolidatedObservations: string[] = [];

    forms.forEach((formDataItem) => {
      const period = formDataItem.datosGenerales?.periodo || '';
      const obs = formDataItem.observaciones || '';
      if (obs.trim()) {
        consolidatedObservations.push(`[${period}]: ${obs.trim()}`);
      }

      const talleres = formDataItem.talleres || [];
      talleres.forEach((taller: any) => {
        const tName = String(taller.nombre).trim().toUpperCase();
        if (!consolidatedSkills[tName]) consolidatedSkills[tName] = {};

        const items = taller.items || [];
        items.forEach((item: any) => {
          const iName = String(item.nombre).trim().toLowerCase();
          const nivel = Number(item.nivel || 0);

          if (!consolidatedSkills[tName][iName]) {
            consolidatedSkills[tName][iName] = nivel;
          } else {
            consolidatedSkills[tName][iName] = Math.max(consolidatedSkills[tName][iName], nivel);
          }
        });
      });
    });

    // 7. Colorear las habilidades consolidadas en el Excel
    for (const [tallerName, itemsMap] of Object.entries(consolidatedSkills)) {
      // Buscar la fila de inicio del taller
      let tallerRow = -1;
      for (let r = 5; r <= 120; r++) {
        const val = sheet.getCell(r, 1).value;
        if (val && String(val).toUpperCase().includes('TALLER:') && String(val).toUpperCase().includes(tallerName)) {
          tallerRow = r;
          break;
        }
      }

      if (tallerRow === -1) continue;

      // Escanear el bloque de habilidades de ese taller
      for (let r = tallerRow + 1; r <= tallerRow + 30 && r <= 120; r++) {
        const valA = sheet.getCell(r, 1).value;
        if (valA && String(valA).toUpperCase().includes('TALLER:')) break;
        if (valA && String(valA).toLowerCase().includes('observaciones:')) break;

        for (const c of cols) {
          const cell = sheet.getCell(r, c);
          const val = cell.value;
          if (val && typeof val === 'string') {
            const iNameNormalized = val.trim().toLowerCase();
            const nivel = itemsMap[iNameNormalized] || 0;

            if (nivel >= 1) paintLeftCell(r + 2, c + 1);
            if (nivel >= 2) paintLeftCell(r + 3, c + 1);
            if (nivel >= 3) paintRightCell(r + 2, c + 1);
            if (nivel >= 4) paintRightCell(r + 3, c + 1);
          }
        }
      }
    }

    // 8. Escribir Observaciones
    let obsRow = -1;
    for (let r = 30; r <= 130; r++) {
      const val = sheet.getCell(r, 1).value;
      if (val && String(val).toLowerCase().includes('observaciones:')) {
        obsRow = r;
        break;
      }
    }

    if (obsRow !== -1) {
      for (let r = obsRow + 1; r <= obsRow + 25; r++) {
        sheet.getCell(r, 1).value = null;
      }
      
      const obsText = consolidatedObservations.length > 0 
        ? consolidatedObservations.join('\n\n') 
        : (reportData.secciones?.mejoraCalidadVida || '');
        
      const lines = obsText.split('\n');
      lines.forEach((line: string, idx: number) => {
        sheet.getCell(obsRow + 1 + idx, 1).value = line;
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="informe-${reportType.toLowerCase()}-${nombreCompleto.replace(/\s+/g, '_')}-${targetPeriod}.xlsx"`
      }
    });

  } catch (error: any) {
    console.error('Error al exportar reporte a Excel:', error);
    return NextResponse.json({ error: error?.message || 'Error interno al exportar a Excel' }, { status: 500 });
  }
}

function writePcpSheet(pcpSheet: ExcelJS.Worksheet, young: any) {
  if (!pcpSheet) return;

  const pcp = young.pcp || {};
  
  // 1. Nombre y Año
  const nombreCompleto = young.nombre_completo || young.nombreCompleto || '';
  pcpSheet.getCell('A3').value = `Nombre y Apellido: ${nombreCompleto}`;
  
  const anio = pcp.anio || new Date().getFullYear();
  pcpSheet.getCell('A2').value = `PCP ${anio}`;

  // 2. Metadatos (DNI, Legajo, Obra Social, Fecha de Nacimiento, Taller)
  const legajo = young.legajo || '';
  const obraSocial = young.obra_social || young.obraSocial || '';
  const dni = young.dni || '';
  let fechaNacimientoStr = '';
  if (young.fecha_nacimiento || young.fechaNacimiento) {
    const d = new Date(young.fecha_nacimiento || young.fechaNacimiento);
    if (!isNaN(d.getTime())) {
      fechaNacimientoStr = d.toLocaleDateString('es-AR');
    }
  }
  const taller = young.taller || '';

  // Escanear filas 1 a 20 para escribir al lado de los labels
  for (let r = 1; r <= 20; r++) {
    for (let c = 1; c <= 8; c++) {
      const cell = pcpSheet.getCell(r, c);
      const val = cell.value;
      if (val && typeof val === 'string') {
        const txt = val.trim();
        const low = txt.toLowerCase();
        
        if (low.startsWith('legajo:')) {
          cell.value = `Legajo: ${legajo}`;
        } else if (low === 'legajo') {
          pcpSheet.getCell(r, c + 1).value = legajo;
        }
        
        else if (low.startsWith('obra social:')) {
          cell.value = `Obra Social: ${obraSocial}`;
        } else if (low.includes('obra social') && !low.includes(':')) {
          pcpSheet.getCell(r, c + 1).value = obraSocial;
        }
        
        else if (low.startsWith('dni:')) {
          cell.value = `DNI: ${dni}`;
        } else if (low === 'dni') {
          pcpSheet.getCell(r, c + 1).value = dni;
        }
        
        else if (low.includes('fecha de nacimiento') || low.includes('nacimiento')) {
          if (low.includes(':')) {
            cell.value = `Fecha de Nacimiento: ${fechaNacimientoStr}`;
          } else {
            pcpSheet.getCell(r, c + 1).value = fechaNacimientoStr;
          }
        }
        
        else if (low.startsWith('taller:')) {
          cell.value = `Taller: ${taller}`;
        } else if (low === 'taller') {
          pcpSheet.getCell(r, c + 1).value = taller;
        }
      }
    }
  }

  // 3. Rutinas
  if (pcp.rutinas) {
    const sem = pcp.rutinas.semana || '';
    const fin = pcp.rutinas.finDeSemana || '';
    let rutinaCompleta = '';
    if (sem) rutinaCompleta += `${sem}\n`;
    if (fin) rutinaCompleta += `Los fines de semana ${fin}`;
    if (rutinaCompleta) {
      pcpSheet.getCell('A9').value = rutinaCompleta.trim();
    }
  }

  // 4. Sueños
  let dreamRow = -1;
  for (let r = 10; r <= 20; r++) {
    const val = pcpSheet.getCell(r, 1).value;
    if (val && String(val).toUpperCase().includes('SUEÑO')) {
      dreamRow = r;
      break;
    }
  }
  if (dreamRow !== -1 && pcp.perfil?.suenos && Array.isArray(pcp.perfil.suenos)) {
    for (let r = dreamRow + 1; r < 21; r++) {
      pcpSheet.getCell(r, 1).value = '';
    }
    pcp.perfil.suenos.forEach((s: string, idx: number) => {
      if (dreamRow + 1 + idx < 21) {
        pcpSheet.getCell(dreamRow + 1 + idx, 1).value = s;
      }
    });
  }

  // 5. Capacidades
  if (pcp.perfil?.capacidades && Array.isArray(pcp.perfil.capacidades)) {
    pcpSheet.getCell('E17').value = pcp.perfil.capacidades.join('\n');
  }

  // 6. Escalas
  const sisVal = pcp.perfil?.resultadosEscalas?.sis || '';
  const gencatVal = pcp.perfil?.resultadosEscalas?.gencat || '';
  const inicoVal = pcp.perfil?.resultadosEscalas?.inico || '';
  const sanMartinVal = pcp.perfil?.resultadosEscalas?.sanMartin || '';

  for (let r = 15; r <= 25; r++) {
    for (let c = 1; c <= 8; c++) {
      const val = pcpSheet.getCell(r, c).value;
      if (val && typeof val === 'string') {
        const txt = val.trim().toLowerCase();
        if (txt === 'sis') {
          pcpSheet.getCell(r + 1, c).value = sisVal;
        } else if (txt.startsWith('gencat') || txt.includes('inico')) {
          let scoreText = '';
          if (gencatVal) scoreText += `GENCAT: ${gencatVal}\n`;
          if (inicoVal) scoreText += `INICO: ${inicoVal}\n`;
          if (sanMartinVal) scoreText += `SAN MARTIN: ${sanMartinVal}\n`;
          pcpSheet.getCell(r + 1, c).value = scoreText.trim();
        }
      }
    }
  }

  // 7. Plan de Futuro
  if (pcp.planFuturo && typeof pcp.planFuturo === 'object') {
    for (let r = 24; r <= 35; r++) {
      const dimCodeRaw = pcpSheet.getCell(`A${r}`).value;
      if (!dimCodeRaw) continue;
      const dimCode = String(dimCodeRaw).trim().toUpperCase().replace(/\./g, '').trim();
      const plan = pcp.planFuturo[dimCode];
      if (plan) {
        pcpSheet.getCell(r, 2).value = plan.objetivos || '';
        pcpSheet.getCell(r, 4).value = plan.apoyos || '';
      }
    }
  }
}
