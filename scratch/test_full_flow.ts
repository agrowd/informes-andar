import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { Client } from 'pg';
import ExcelJS from 'exceljs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { generateQuarterlyReportNarrative } from '../src/lib/ai/quarterlyGenerator.js';

// Cargar variables de entorno
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('ERROR: POSTGRES_URL no está configurada en las variables de entorno.');
  process.exit(1);
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
  return String(val).trim().replace(/\s+/g, ' ');
}

async function runTest() {
  console.log('--- INICIANDO TEST DE FLUJO COMPLETO ---');
  
  // 1. Conectar a Postgres
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('✓ Conectado a PostgreSQL');

  try {
    // 2. Leer archivo Juan Pablo Herrera .xlsx
    const xlsxPath = path.join(process.cwd(), 'informes', 'Juan Pablo Herrera .xlsx');
    console.log(`Leyendo archivo de entrada: ${xlsxPath}`);
    if (!fs.existsSync(xlsxPath)) {
      throw new Error(`No se encuentra el archivo excel en la ruta: ${xlsxPath}`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(xlsxPath);
    console.log('✓ Archivo Excel cargado correctamente');

    // 3. Parsear PCP
    const pcpSheet = workbook.getWorksheet('PCP');
    if (!pcpSheet) throw new Error('No se encontró la solapa PCP');

    const pcpData: any = {
      anio: '',
      rutinas: { semana: '', finDeSemana: '' },
      perfil: { suenos: [], capacidades: [], resultadosEscalas: { gencat: '', sis: '', inico: '', sanMartin: '' } },
      planFuturo: {}
    };

    let nombreCompleto = '';
    const nameVal = pcpSheet.getCell('A3').value;
    if (nameVal) {
      nombreCompleto = String(nameVal).replace(/nombre y apellido:\s*/i, '').trim();
    }
    console.log(`Nombre extraído del Concurrente: ${nombreCompleto}`);

    const anioVal = pcpSheet.getCell('A2').value;
    if (anioVal) {
      const m = String(anioVal).match(/\d+/);
      if (m) pcpData.anio = m[0];
    }

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

    // Sueños (A18 a A20)
    for (let r = 18; r <= 20; r++) {
      const val = pcpSheet.getCell(`A${r}`).value;
      if (val) pcpData.perfil.suenos.push(cleanText(val));
    }

    // Capacidades (E17)
    const capVal = pcpSheet.getCell('E17').value;
    if (capVal) {
      const caps = String(capVal).split(/\s{2,}|\n/).map(c => c.trim()).filter(Boolean);
      pcpData.perfil.capacidades = caps;
    }

    // Plan futuro
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
    console.log('✓ PCP parseada con éxito:', JSON.stringify(pcpData.perfil.suenos));

    // 4. Parsear solapas mensuales
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

      const facCell = sheet.getCell('D4').value || sheet.getCell('C4').value;
      if (facCell) {
        report.facilitadorNombre = String(facCell).replace(/facilitador\/a:\s*/i, '').trim();
      }

      const tallerCell = sheet.getCell('A5').value;
      if (tallerCell) {
        report.taller = String(tallerCell).replace(/taller:\s*/i, '').trim();
        if (!mainTaller) mainTaller = report.taller;
      }

      let currentTaller: any = null;
      let obsStartRow = 62;
      const cols = [1, 5, 9, 13, 17, 21, 25, 29];

      for (let r = 5; r <= 120; r++) {
        const valA = sheet.getCell(r, 1).value;

        if (valA && String(valA).toUpperCase().includes('TALLER:')) {
          const tallerName = String(valA).replace(/TALLER:\s*/i, '').trim();
          currentTaller = { nombre: tallerName, items: [] };
          report.talleres.push(currentTaller);
          continue;
        }

        if (valA && String(valA).toLowerCase().includes('observaciones:')) {
          obsStartRow = r + 1;
          break;
        }

        for (const c of cols) {
          const itemCell = sheet.getCell(r, c);
          const itemName = itemCell.value;
          if (itemName && typeof itemName === 'string' && itemName.trim().length > 2 && !itemName.toUpperCase().includes('REFERENCIAS') && !itemName.toUpperCase().includes('ENSEÑADO')) {
            const item = {
              nombre: itemName.trim(),
              enseñado: isCellChecked(sheet.getCell(r + 2, c + 1)) || isCellChecked(sheet.getCell(r + 2, c + 2)),
              apoyo: isCellChecked(sheet.getCell(r + 3, c + 1)) || isCellChecked(sheet.getCell(r + 3, c + 2)),
              sola: isCellChecked(sheet.getCell(r + 4, c + 1)) || isCellChecked(sheet.getCell(r + 4, c + 2))
            };
            if (currentTaller) {
              currentTaller.items.push(item);
            }
          }
        }
      }

      let obsText = '';
      for (let r = obsStartRow; r <= 150; r++) {
        const val = sheet.getCell(r, 1).value;
        if (val) obsText += String(val) + '\n';
      }
      report.observaciones = obsText.trim();
      monthlyReports.push(report);
    }
    console.log(`✓ Encontradas ${monthlyReports.length} planillas mensuales:`, monthlyReports.map(r => r.periodo));

    // 5. Guardar Joven en DB
    let youngIdStr = '';
    const existing = await client.query(
      'SELECT id, pcp FROM youngs WHERE nombre_completo ILIKE $1 LIMIT 1',
      [nombreCompleto]
    );

    if (existing.rows.length > 0) {
      youngIdStr = String(existing.rows[0].id);
      const mergedPcp = { ...(existing.rows[0].pcp || {}), ...pcpData };
      await client.query(
        'UPDATE youngs SET pcp = $1, taller = $2, updated_at = NOW() WHERE id = $3',
        [JSON.stringify(mergedPcp), mainTaller || null, parseInt(youngIdStr)]
      );
      console.log(`✓ Joven existente actualizado con ID: ${youngIdStr}`);
    } else {
      const result = await client.query(
        'INSERT INTO youngs (nombre_completo, taller, pcp, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
        [nombreCompleto, mainTaller || null, JSON.stringify(pcpData)]
      );
      youngIdStr = String(result.rows[0].id);
      console.log(`✓ Concurrente nuevo insertado con ID: ${youngIdStr}`);
    }

    // 6. Guardar Formularios Mensuales (Forms) en DB
    const formIds: string[] = [];
    for (const report of monthlyReports) {
      const formData = {
        datosGenerales: {
          nombreCompleto,
          periodo: report.periodo,
          taller: report.taller,
          youngId: youngIdStr,
          facilitadorNombre: report.facilitadorNombre || 'Test Facilitador'
        },
        talleres: report.talleres,
        observaciones: report.observaciones
      };

      const existingForm = await client.query(
        'SELECT id FROM forms WHERE young_id = $1 AND periodo = $2 LIMIT 1',
        [parseInt(youngIdStr), report.periodo]
      );

      if (existingForm.rows.length > 0) {
        const formId = String(existingForm.rows[0].id);
        await client.query(
          'UPDATE forms SET data = $1, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(formData), parseInt(formId)]
        );
        formIds.push(formId);
        console.log(`✓ Formulario mensual actualizado: ${report.periodo} (ID: ${formId})`);
      } else {
        const result = await client.query(
          'INSERT INTO forms (young_id, periodo, data, created_by, status, created_at, updated_at) VALUES ($1, $2, $3, NULL, $4, NOW(), NOW()) RETURNING id',
          [parseInt(youngIdStr), report.periodo, JSON.stringify(formData), 'BORRADOR']
        );
        const formId = String(result.rows[0].id);
        formIds.push(formId);
        console.log(`✓ Formulario mensual insertado: ${report.periodo} (ID: ${formId})`);
      }
    }

    // 7. Simular Exportación a Excel Mensual de un Borrador
    console.log('--- Probando Exportación de Excel Mensual ---');
    const firstFormId = formIds[0];
    const formRes = await client.query('SELECT data FROM forms WHERE id = $1', [parseInt(firstFormId)]);
    const testFormData = formRes.rows[0].data;

    const exportTemplatePath = path.join(process.cwd(), 'templates', 'monthly_template.xlsx');
    if (!fs.existsSync(exportTemplatePath)) {
      throw new Error(`No se encuentra la plantilla Excel en: ${exportTemplatePath}`);
    }

    const exportWorkbook = new ExcelJS.Workbook();
    await exportWorkbook.xlsx.readFile(exportTemplatePath);
    
    const targetPeriod = (testFormData.datosGenerales?.periodo || 'JULIO').trim().toUpperCase();
    let exportSheet = exportWorkbook.getWorksheet(targetPeriod);
    if (!exportSheet) {
      const baseSheet = exportWorkbook.worksheets.find(w => w.name !== 'PCP');
      if (baseSheet) {
        baseSheet.name = targetPeriod;
        exportSheet = baseSheet;
      }
    }

    if (exportSheet) {
      exportSheet.getCell('A3').value = `Nombre y Apellido: ${nombreCompleto}`;
      exportSheet.getCell('C4').value = `Facilitador/a: ${testFormData.datosGenerales?.facilitadorNombre || ''}`;

      // Pintar checkboxes (sola/enseñado/apoyo)
      const paintCell = (r: number, c: number) => {
        const fillStyle: ExcelJS.Fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFA4C2F4' }
        };
        exportSheet.getCell(r, c).fill = fillStyle;
        exportSheet.getCell(r, c + 1).fill = fillStyle;
      };

      const testTalleres = testFormData.talleres || [];
      const cols = [1, 5, 9, 13, 17, 21, 25, 29];
      for (const taller of testTalleres) {
        const tallerName = String(taller.nombre).trim().toUpperCase();
        let tallerRow = -1;
        for (let r = 5; r <= 120; r++) {
          const val = exportSheet.getCell(r, 1).value;
          if (val && String(val).toUpperCase().includes('TALLER:') && String(val).toUpperCase().includes(tallerName)) {
            tallerRow = r;
            break;
          }
        }
        if (tallerRow === -1) continue;

        for (const item of taller.items) {
          const itemNameNormalized = String(item.nombre).trim().toLowerCase();
          let itemFound = false;

          for (let r = tallerRow + 1; r <= tallerRow + 30 && r <= 120; r++) {
            const valA = exportSheet.getCell(r, 1).value;
            if (valA && String(valA).toUpperCase().includes('TALLER:')) break;
            if (valA && String(valA).toLowerCase().includes('observaciones:')) break;

            for (const c of cols) {
              const cell = exportSheet.getCell(r, c);
              const val = cell.value;
              if (val && typeof val === 'string' && val.trim().toLowerCase() === itemNameNormalized) {
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

      // Observaciones
      let obsRow = -1;
      for (let r = 30; r <= 130; r++) {
        const val = exportSheet.getCell(r, 1).value;
        if (val && String(val).toLowerCase().includes('observaciones:')) {
          obsRow = r;
          break;
        }
      }
      if (obsRow !== -1) {
        const obsText = testFormData.observaciones || '';
        const lines = obsText.split('\n');
        lines.forEach((line: string, idx: number) => {
          exportSheet.getCell(obsRow + 1 + idx, 1).value = line;
        });
      }
      
      const scratchDir = path.join(process.cwd(), 'scratch');
      if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir);
      const testExportPath = path.join(scratchDir, 'test_export.xlsx');
      await exportWorkbook.xlsx.writeFile(testExportPath);
      console.log(`✓ Excel mensual exportado con éxito a: ${testExportPath}`);
    }

    // 8. Fusión Trimestral con IA
    console.log('--- Probando Fusión Trimestral con IA (OpenAI) ---');
    if (formIds.length < 3) {
      throw new Error(`Se requieren al menos 3 formularios mensuales para fusionar, se tienen ${formIds.length}`);
    }

    const mergeFormIds = formIds.slice(0, 3);
    const formsToMerge: any[] = [];
    for (const fId of mergeFormIds) {
      const res = await client.query('SELECT data, periodo FROM forms WHERE id = $1', [parseInt(fId)]);
      formsToMerge.push({
        id: fId,
        periodo: res.rows[0].periodo,
        data: res.rows[0].data
      });
    }

    console.log('Llamando a la generación de narrativa trimestral...');
    const secciones = await generateQuarterlyReportNarrative({
      jovenNombre: nombreCompleto,
      pcp: pcpData,
      forms: formsToMerge
    });
    console.log('✓ Narrativa generada con éxito por la IA');
    console.log('Campos generados:', Object.keys(secciones));

    // 9. Generar DOCX Trimestral usando la plantilla
    console.log('--- Probando Generación de DOCX Trimestral ---');
    const trimestralTemplatePath = path.join(process.cwd(), 'templates', 'trimestral_template.docx');
    if (!fs.existsSync(trimestralTemplatePath)) {
      throw new Error(`No se encuentra la plantilla trimestral en: ${trimestralTemplatePath}`);
    }

    const wordContent = fs.readFileSync(trimestralTemplatePath, 'binary');
    const zip = new PizZip(wordContent);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    const fechaActual = new Date();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fechaInforme = `${fechaActual.getDate()} de ${meses[fechaActual.getMonth()]} del ${fechaActual.getFullYear()}`;

    const reportData = {
      nombreCompleto,
      grupo: mainTaller || 'Clave de Sol',
      facilitadores: formsToMerge.map(f => f.data?.datosGenerales?.facilitadorNombre).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' - ') || 'Test Facilitador',
      metaSueno: Array.isArray(pcpData?.perfil?.suenos) ? pcpData.perfil.suenos.filter(Boolean).join('; ') : 'Disfrutar y pasear',
      fechaInforme,
      
      // 12 secciones narrativas
      metaAlcanzada: secciones.metaAlcanzada || 'Sin registrar.',
      participacion: secciones.participacion || 'Sin registrar.',
      integracionRelaciones: secciones.integracionRelaciones || 'Sin registrar.',
      actividadesRelacionadas: secciones.actividadesRelacionadas || 'Sin registrar.',
      vidaIndependiente: secciones.vidaIndependiente || 'Sin registrar.',
      habilidadesViajar: secciones.habilidadesViajar || 'Sin registrar.',
      desarrolloPersonal: secciones.desarrolloPersonal || 'Sin registrar.',
      metasDeportivas: secciones.metasDeportivas || 'Sin registrar.',
      metasSociales: secciones.metasSociales || 'Sin registrar.',
      dimensionesCalidadVida: secciones.dimensionesCalidadVida || 'Sin registrar.',
      actividadesComplementarias: secciones.actividadesComplementarias || 'Sin registrar.',
      mejoraCalidadVida: secciones.mejoraCalidadVida || 'Sin registrar.'
    };

    doc.setData(reportData);
    doc.render();
    
    const wordBuf = doc.getZip().generate({ type: 'nodebuffer' }) as Buffer;
    const testDocxPath = path.join(process.cwd(), 'scratch', 'test_trimestral.docx');
    fs.writeFileSync(testDocxPath, wordBuf);
    console.log(`✓ Reporte trimestral DOCX guardado con éxito a: ${testDocxPath}`);
    
    console.log('--- TEST COMPLETADO EXITOSAMENTE ---');

  } catch (error: any) {
    console.error('❌ ERROR EN EL TEST DE FLUJO COMPLETO:', error);
  } finally {
    await client.end();
    console.log('Conexión a PostgreSQL cerrada.');
  }
}

runTest();
