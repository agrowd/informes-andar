import ExcelJS from 'exceljs';
import fs from 'fs';

async function test() {
  try {
    const workbook = new ExcelJS.Workbook();
    const buf = fs.readFileSync('informes/Juan Pablo Herrera .xlsx');
    await workbook.xlsx.load(buf);
    
    const sheet = workbook.getWorksheet('JULIO');
    console.log('Sheet name:', sheet.name);
    
    // Check cell A6
    const cell_A6 = sheet.getCell('A6');
    console.log('A6 value:', cell_A6.value);
    
    // Check cell B8 (should have blue color)
    const cell_B8 = sheet.getCell('B8');
    console.log('B8 fill:', JSON.stringify(cell_B8.fill));
    console.log('B8 value:', cell_B8.value);
    
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
