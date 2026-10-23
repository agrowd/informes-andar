import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';

// Helper: Map period string (e.g., '2026-04', '2026-10', 'ABRIL') to Spanish Month Sheet Name
export function getMonthSheetName(periodo: string): string {
  if (!periodo) return 'MES';
  const p = periodo.trim().toUpperCase();
  const match = p.match(/(\d{4})-(\d{2})/);
  if (match) {
    const m = match[2];
    const monthNames: Record<string, string> = {
      '01': 'ENERO',
      '02': 'FEBRERO',
      '03': 'MARZO',
      '04': 'ABRIL',
      '05': 'MAYO',
      '06': 'JUNIO',
      '07': 'JULIO',
      '08': 'AGOSTO',
      '09': 'SEPTIEMBRE',
      '10': 'OCTUBRE',
      '11': 'NOVIEMBRE',
      '12': 'DICIEMBRE'
    };
    return monthNames[m] || p;
  }
  const clean = p.replace(/[^A-ZÁÉÍÓÚÑ]/g, '');
  if (clean) return clean;
  return p;
}

// Pastel colors for workshop headers matching Granja Andar conventions
export function getTallerColor(name: string): string {
  const n = (name || '').toUpperCase();
  if (n.includes('HUERTA') || n.includes('MANOS VERDES') || n.includes('SUMEMOS VERDE')) return 'FFFCE5CD';
  if (n.includes('YOGA') || n.includes('HATHA') || n.includes('BIENESTAR EMOCIONAL') || n.includes('EXPRESANDO')) return 'FFF9CB9C';
  if (n.includes('PINTURA') || n.includes('ARTE RECICLADO') || n.includes('ARTE PINTURA')) return 'FFD0E0E3';
  if (n.includes('MUSICAL') || n.includes('ARTE MUSICAL') || n.includes('PERCUSION') || n.includes('MUSICA')) return 'FFEAD1DC';
  if (n.includes('DEPORTE') || n.includes('ACTIVANDO') || n.includes('EDUCACION FISICA')) return 'FFFFF2CC';
  if (n.includes('VIDA INDEPENDIENTE') || n.includes('DESARROLLO PERSONAL')) return 'FFC9DAF8';
  if (n.includes('HABILIDADES SOCIALES') || n.includes('INTERACCION') || n.includes('COMUNICACION')) return 'FFD9D2E9';
  if (n.includes('ARQUERIA') || n.includes('BOCHAS') || n.includes('NATACION')) return 'FFB6D7A8';
  if (n.includes('COCINA') || n.includes('GASTRONOMIA') || n.includes('PASTELERIA') || n.includes('CATERING')) return 'FFFCE5CD';
  if (n.includes('DERECHOS') || n.includes('FOTOGRAFIA')) return 'FFD9EAD3';
  return 'FFEFEFEF';
}

// Cell fill color for 2x2 checkboxes based on group
export function getGridFillColor(grupo?: string): string {
  const g = (grupo || '').toUpperCase();
  if (g.includes('ARTESANOS')) return 'FFC27BA0';
  if (g.includes('BUENOS MOZOS')) return 'FF46BDC6';
  if (g.includes('EMPRENDEDORES')) return 'FF00FF00';
  return 'FFA4C2F4'; // Celeste institucional
}

export function writePcpSheet(pcpSheet: ExcelJS.Worksheet, young: any, fechaCreacionStr?: string) {
  if (!pcpSheet) return;

  const pcp = young.pcp || {};
  const nombreCompleto = young.nombre_completo || young.nombreCompleto || '';
  const taller = young.taller || young.grupo || 'Clave de Sol';
  const anio = pcp.anio || new Date().getFullYear();

  pcpSheet.getCell('A2').value = `PCP ${anio} - GRUPO: ${taller}`;
  pcpSheet.getCell('A3').value = `NOMBRE Y APELLIDO: ${nombreCompleto}`;
  if (fechaCreacionStr) {
    pcpSheet.getCell('E3').value = `FECHA DE CREACIÓN: ${fechaCreacionStr}`;
  }

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

  // Scan rows 1 to 20 for metadata labels
  for (let r = 1; r <= 20; r++) {
    for (let c = 1; c <= 8; c++) {
      const cell = pcpSheet.getCell(r, c);
      const val = cell.value;
      if (val && typeof val === 'string') {
        const low = val.trim().toLowerCase();
        if (low.startsWith('legajo:')) {
          cell.value = `Legajo: ${legajo}`;
        } else if (low === 'legajo') {
          pcpSheet.getCell(r, c + 1).value = legajo;
        } else if (low.startsWith('obra social:')) {
          cell.value = `Obra Social: ${obraSocial}`;
        } else if (low.includes('obra social') && !low.includes(':')) {
          pcpSheet.getCell(r, c + 1).value = obraSocial;
        } else if (low.startsWith('dni:')) {
          cell.value = `DNI: ${dni}`;
        } else if (low === 'dni') {
          pcpSheet.getCell(r, c + 1).value = dni;
        } else if (low.includes('fecha de nacimiento') || low.includes('nacimiento')) {
          if (low.includes(':')) {
            cell.value = `Fecha de Nacimiento: ${fechaNacimientoStr}`;
          } else {
            pcpSheet.getCell(r, c + 1).value = fechaNacimientoStr;
          }
        } else if (low.startsWith('taller:')) {
          cell.value = `Taller: ${taller}`;
        } else if (low === 'taller') {
          pcpSheet.getCell(r, c + 1).value = taller;
        }
      }
    }
  }

  // Rutinas
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

  // Sueños
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

  // Capacidades
  if (pcp.perfil?.capacidades && Array.isArray(pcp.perfil.capacidades)) {
    pcpSheet.getCell('E17').value = pcp.perfil.capacidades.join('\n');
  }

  // Escalas
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

  // Plan de Futuro
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

  // Limpiar filas vacías residuales más allá de la fila 36 para evitar 998 filas fantasma
  for (let r = pcpSheet.rowCount; r >= 37; r--) {
    pcpSheet.spliceRows(r, 1);
  }
}

export function renderMonthlyWorksheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  formData: any,
  young: any,
  facilitadorNombre: string,
  fechaStr: string
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }]
  });

  // 1. Column widths: cols 1 to 32
  for (let c = 1; c <= 32; c++) {
    sheet.getColumn(c).width = (c % 4 === 0) ? 3.5 : 2.6;
  }

  const borderThinBlack: ExcelJS.Border = { style: 'thin', color: { argb: 'FF000000' } };

  // 2. Header
  // Row 1: INFORME MENSUAL
  sheet.mergeCells(1, 1, 1, 32);
  const r1 = sheet.getCell(1, 1);
  r1.value = 'INFORME MENSUAL';
  r1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 20;

  // Row 2: NOMBRE: ...
  const nombreCompleto = young?.nombre_completo || young?.nombreCompleto || formData.datosGenerales?.nombreCompleto || '';
  sheet.mergeCells(2, 1, 2, 32);
  const r2 = sheet.getCell(2, 1);
  r2.value = `NOMBRE: ${nombreCompleto}`;
  r2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
  r2.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(2).height = 20;

  // Row 3: FECHA: ...
  sheet.mergeCells(3, 1, 3, 32);
  const r3 = sheet.getCell(3, 1);
  r3.value = `FECHA: ${fechaStr}`;
  r3.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
  r3.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(3).height = 20;

  // Row 4: FACILITADOR/A: ...
  sheet.mergeCells(4, 1, 4, 32);
  const r4 = sheet.getCell(4, 1);
  r4.value = `FACILITADOR/A: ${facilitadorNombre}`;
  r4.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
  r4.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(4).height = 20;

  let currentRow = 5;
  const talleres = formData?.talleres || [];
  const fillColor = getGridFillColor(young?.taller || formData?.datosGenerales?.grupo);

  for (const taller of talleres) {
    const tallerName = (taller.nombre || '').trim();
    const tallerColor = getTallerColor(tallerName);

    // Workshop header row
    sheet.mergeCells(currentRow, 1, currentRow, 32);
    const tCell = sheet.getCell(currentRow, 1);
    tCell.value = `TALLER: ${tallerName.toUpperCase()}`;
    tCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
    tCell.alignment = { horizontal: 'center', vertical: 'middle' };
    tCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: tallerColor }
    };
    sheet.getRow(currentRow).height = 24;
    currentRow++;

    // Items (skills) in groups of 8 per row block
    const items = taller.items || taller.habilidades || [];
    for (let itemIdx = 0; itemIdx < items.length; itemIdx += 8) {
      const slice = items.slice(itemIdx, itemIdx + 8);
      const titleRow = currentRow;
      const topSpacerRow = currentRow + 1;
      const gridRow1 = currentRow + 2;
      const gridRow2 = currentRow + 3;
      const bottomSpacerRow = currentRow + 4;

      sheet.getRow(titleRow).height = 55;
      sheet.getRow(topSpacerRow).height = 6;
      sheet.getRow(gridRow1).height = 15;
      sheet.getRow(gridRow2).height = 15;
      sheet.getRow(bottomSpacerRow).height = 6;

      for (let i = 0; i < slice.length; i++) {
        const item = slice[i];
        const colStart = 1 + i * 4;

        // Title cell
        sheet.mergeCells(titleRow, colStart, titleRow, colStart + 3);
        const titleCell = sheet.getCell(titleRow, colStart);
        titleCell.value = item.nombre;
        titleCell.font = { name: 'Arial', size: 10, color: { argb: 'FF000000' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        titleCell.border = {
          bottom: borderThinBlack,
          left: borderThinBlack,
          right: borderThinBlack
        };

        // Outer borders for the 4x4 container
        for (let r = topSpacerRow; r <= bottomSpacerRow; r++) {
          sheet.getCell(r, colStart).border = {
            ...sheet.getCell(r, colStart).border,
            left: borderThinBlack
          };
          sheet.getCell(r, colStart + 3).border = {
            ...sheet.getCell(r, colStart + 3).border,
            right: borderThinBlack
          };
        }
        for (let c = colStart; c <= colStart + 3; c++) {
          sheet.getCell(bottomSpacerRow, c).border = {
            ...sheet.getCell(bottomSpacerRow, c).border,
            bottom: borderThinBlack
          };
        }

        // The 2x2 grid
        const cellTL = sheet.getCell(gridRow1, colStart + 1);
        const cellTR = sheet.getCell(gridRow1, colStart + 2);
        const cellBL = sheet.getCell(gridRow2, colStart + 1);
        const cellBR = sheet.getCell(gridRow2, colStart + 2);

        const allBorders = {
          top: borderThinBlack,
          bottom: borderThinBlack,
          left: borderThinBlack,
          right: borderThinBlack
        };

        cellTL.border = allBorders;
        cellTR.border = allBorders;
        cellBL.border = allBorders;
        cellBR.border = allBorders;

        const solidFill: ExcelJS.Fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        };

        const nivel = Number(item.nivel || 0);
        if (nivel >= 1) cellTL.fill = solidFill;
        if (nivel >= 2) cellTR.fill = solidFill;
        if (nivel >= 3) cellBL.fill = solidFill;
        if (nivel >= 4) cellBR.fill = solidFill;
      }

      currentRow += 5;
    }
  }

  // Observaciones header
  sheet.mergeCells(currentRow, 1, currentRow, 32);
  const obsHeader = sheet.getCell(currentRow, 1);
  obsHeader.value = 'Observaciones:';
  obsHeader.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
  obsHeader.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(currentRow).height = 24;
  currentRow++;

  // Observaciones text
  const obsText = (formData?.observaciones || '').trim();
  if (obsText) {
    const paragraphs = obsText.split(/\n\s*\n/).filter((p: string) => p.trim());
    if (paragraphs.length === 0) paragraphs.push(obsText);

    for (const p of paragraphs) {
      sheet.mergeCells(currentRow, 1, currentRow, 32);
      const pCell = sheet.getCell(currentRow, 1);
      pCell.value = p.trim();
      pCell.font = { name: 'Arial', size: 10, color: { argb: 'FF000000' } };
      pCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      const lines = Math.ceil(p.trim().length / 90);
      sheet.getRow(currentRow).height = Math.max(30, lines * 16);
      currentRow++;
    }
  }

  return sheet;
}

export interface ExportWorkbookOptions {
  includePcp?: boolean;
  singleMonthOnly?: boolean;
}

export async function buildCompleteWorkbook(
  young: any,
  forms: any[],
  targetFormData?: any,
  options: ExportWorkbookOptions = {}
): Promise<ExcelJS.Workbook> {
  const templatePath = path.join(process.cwd(), 'templates', 'monthly_template.xlsx');
  const workbook = new ExcelJS.Workbook();

  if (fs.existsSync(templatePath)) {
    await workbook.xlsx.readFile(templatePath);
  }

  // 1. Process PCP sheet only if explicitly requested (default is FALSE: NO PCP)
  const includePcp = options.includePcp === true;
  let pcpSheet = workbook.getWorksheet('PCP');
  if (includePcp && pcpSheet && young) {
    writePcpSheet(pcpSheet, young, new Date().toLocaleDateString('es-AR'));
  }

  // 2. Remove template sheets (remove PCP unless includePcp is explicitly true)
  for (const s of [...workbook.worksheets]) {
    if (!includePcp || s.name !== 'PCP') {
      workbook.removeWorksheet(s.id);
    }
  }

  // 3. Collect and deduplicate forms by month
  const formsByMonth = new Map<string, any>();
  for (const f of forms) {
    const monthName = getMonthSheetName(f.periodo);
    // Prefer higher id or more complete data
    if (!formsByMonth.has(monthName) || (formsByMonth.get(monthName).id < f.id)) {
      formsByMonth.set(monthName, f);
    }
  }

  // If targetFormData is provided and has periodo, ensure it takes precedence
  if (targetFormData?.datosGenerales?.periodo) {
    const targetMonthName = getMonthSheetName(targetFormData.datosGenerales.periodo);
    formsByMonth.set(targetMonthName, {
      periodo: targetFormData.datosGenerales.periodo,
      data: targetFormData,
      created_at: new Date()
    });
  }

  // 4. Chronological order
  const monthOrder = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];

  const sortedMonthNames = Array.from(formsByMonth.keys()).sort((a, b) => {
    const idxA = monthOrder.indexOf(a);
    const idxB = monthOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    return a.localeCompare(b);
  });

  const targetMonthName = targetFormData?.datosGenerales?.periodo
    ? getMonthSheetName(targetFormData.datosGenerales.periodo)
    : (sortedMonthNames[sortedMonthNames.length - 1] || 'OCTUBRE');

  // Filter if singleMonthOnly is requested
  const monthsToRender = options.singleMonthOnly
    ? [targetMonthName]
    : sortedMonthNames;

  // 5. Render each month
  for (const mName of monthsToRender) {
    const f = formsByMonth.get(mName) || {
      periodo: mName,
      data: targetFormData,
      created_at: new Date()
    };
    const dCreacion = new Date(f.created_at || f.data?.datosGenerales?.fechaCreacion || new Date());
    const fStr = !isNaN(dCreacion.getTime())
      ? `${String(dCreacion.getDate()).padStart(2, '0')}/${String(dCreacion.getMonth() + 1).padStart(2, '0')}/${dCreacion.getFullYear()}`
      : new Date().toLocaleDateString('es-AR');

    const facName = f.data?.datosGenerales?.facilitadorNombre ||
      f.data?.datosGenerales?.facilitadores ||
      young?.facilitador ||
      'Leonardo Villamayor';

    const sheet = renderMonthlyWorksheet(workbook, mName, f.data, young, facName, fStr);

    // Set tab selection: activate the target month
    if (mName === targetMonthName) {
      sheet.views = [
        {
          state: 'normal',
          activeCell: 'A1',
          showGridLines: true,
          showRowColHeaders: true,
          zoomScale: 100,
          zoomScaleNormal: 100
        }
      ];
    }
  }

  // Set workbook active tab
  const activeIdx = monthsToRender.indexOf(targetMonthName);
  workbook.views = [
    {
      x: 0,
      y: 0,
      width: 10000,
      height: 20000,
      firstSheet: 0,
      activeTab: activeIdx >= 0 ? activeIdx : 0,
      visibility: 'visible'
    }
  ];

  return workbook;
}
