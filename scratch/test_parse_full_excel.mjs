import ExcelJS from 'exceljs';
import fs from 'fs';

function isCellChecked(cell) {
  const fill = cell.fill;
  if (!fill || fill.type !== 'pattern') return false;
  const color = fill.fgColor?.argb || fill.fgColor?.theme;
  if (typeof color === 'string') {
    const hex = color.toUpperCase();
    return hex.endsWith('A4C2F4') || hex.endsWith('FF00FF');
  }
  return false;
}

function cleanText(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/\s+/g, ' ');
}

async function test() {
  try {
    const workbook = new ExcelJS.Workbook();
    const buf = fs.readFileSync('informes/Juan Pablo Herrera .xlsx');
    await workbook.xlsx.load(buf);

    console.log('Worksheet Names:', workbook.worksheets.map(w => w.name));

    // 1. PARSE PCP
    const pcpSheet = workbook.getWorksheet('PCP');
    const pcpData = {
      anio: '',
      rutinas: { semana: '', finDeSemana: '' },
      perfil: { suenos: [], capacidades: [], resultadosEscalas: { gencat: '', sis: '', inico: '', sanMartin: '' } },
      planFuturo: {}
    };

    if (pcpSheet) {
      // Anio
      const anioVal = pcpSheet.getCell('A2').value;
      if (anioVal) {
        const m = String(anioVal).match(/\d+/);
        if (m) pcpData.anio = m[0];
      }

      // Rutinas
      const routineCell = pcpSheet.getCell('A9').value;
      if (routineCell) {
        const text = String(routineCell).trim();
        // Simple heuristic to split week vs weekend
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

      // Capabilities (row 17 Col 5 onwards)
      const capVal = pcpSheet.getCell('E17').value;
      if (capVal) {
        // Split by multiple spaces or newlines
        const caps = String(capVal).split(/\s{2,}|\n/).map(c => c.trim()).filter(Boolean);
        pcpData.perfil.capacidades = caps;
      }

      // Plan de futuro (row 26 to 31)
      const dims = ['BF', 'DP', 'RI', 'IS', 'BE', 'AU', 'BM', 'DR'];
      for (let r = 26; r <= 35; r++) {
        const dimCodeRaw = pcpSheet.getCell(`A${r}`).value;
        if (!dimCodeRaw) continue;
        let dimCode = String(dimCodeRaw).trim().toUpperCase().replace(/\./g, '');
        if (dimCode === 'RI' || dimCode === 'R.I') dimCode = 'RI';
        if (dims.includes(dimCode)) {
          const obj = cleanText(pcpSheet.getCell(`B${r}`).value);
          const esp = cleanText(pcpSheet.getCell(`C${r}`).value);
          const apoy = cleanText(pcpSheet.getCell(`D${r}`).value || pcpSheet.getCell(`E${r}`).value);
          const resp = cleanText(pcpSheet.getCell(`F${r}`).value);
          pcpData.planFuturo[dimCode] = { objetivos: obj, espacios: esp, apoyos: apoy, responsables: resp };
        }
      }
    }

    console.log('Parsed PCP:', JSON.stringify(pcpData, null, 2));

    // 2. PARSE MONTHS
    const monthlyReports = [];
    for (const sheet of workbook.worksheets) {
      if (sheet.name === 'PCP' || sheet.name.startsWith('Sheet') || sheet.name === 'Template') continue;

      console.log(`Parsing month: ${sheet.name}`);
      const report = {
        periodo: sheet.name.trim(),
        facilitadorNombre: '',
        taller: '',
        talleres: [],
        observaciones: ''
      };

      // Facilitador (D4 or similar)
      const facCell = sheet.getCell('D4').value || sheet.getCell('C4').value;
      if (facCell) {
        report.facilitadorNombre = String(facCell).replace(/facilitador\/a:\s*/i, '').trim();
      }

      // Pre-scan for Taller
      const tallerCell = sheet.getCell('A5').value;
      if (tallerCell) {
        report.taller = String(tallerCell).replace(/taller:\s*/i, '').trim();
      }

      let currentTaller = null;
      let obsStartRow = 62;

      for (let r = 5; r <= 120; r++) {
        const cellA = sheet.getCell(r, 1);
        const valA = cellA.value;

        // Check if Taller header
        if (valA && String(valA).toUpperCase().includes('TALLER:')) {
          const tallerName = String(valA).replace(/TALLER:\s*/i, '').trim();
          currentTaller = { nombre: tallerName, items: [] };
          report.talleres.push(currentTaller);
          continue;
        }

        // Check if Observaciones header
        if (valA && String(valA).toLowerCase().includes('observaciones:')) {
          obsStartRow = r + 1;
          break;
        }

        // Parse items in this row (every 4 columns: A, E, I, M, Q, U, Y, AC...)
        for (let c = 1; c <= 32; c += 4) {
          const itemCell = sheet.getCell(r, c);
          const itemName = itemCell.value;
          if (itemName && typeof itemName === 'string' && itemName.trim().length > 2 && !itemName.toUpperCase().includes('REFERENCIAS') && !itemName.toUpperCase().includes('ENSEÑADO')) {
            // Found item name!
            // Checkboxes are in rows r+2 (E), r+3 (A), r+4 (S), in cols c+1 or c+2
            const cellE = sheet.getCell(r + 2, c + 1);
            const cellA_apoyo = sheet.getCell(r + 3, c + 1);
            const cellS = sheet.getCell(r + 4, c + 1);

            const item = {
              nombre: itemName.trim(),
              enseñado: isCellChecked(cellE) || isCellChecked(sheet.getCell(r + 2, c + 2)),
              apoyo: isCellChecked(cellA_apoyo) || isCellChecked(sheet.getCell(r + 3, c + 2)),
              sola: isCellChecked(cellS) || isCellChecked(sheet.getCell(r + 4, c + 2))
            };

            if (currentTaller) {
              currentTaller.items.push(item);
            }
          }
        }
      }

      // Read observations
      let obsText = '';
      for (let r = obsStartRow; r <= 150; r++) {
        const val = sheet.getCell(r, 1).value;
        if (val) obsText += String(val) + '\n';
      }
      report.observaciones = obsText.trim();

      monthlyReports.push(report);
    }

    console.log('Parsed Monthly Reports count:', monthlyReports.length);
    if (monthlyReports.length > 0) {
      console.log('Sample Month:', JSON.stringify(monthlyReports[0], null, 2));
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

test();
