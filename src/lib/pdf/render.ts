import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    
    // Leer el membrete para la cabecera nativa de Playwright
    let headerLogoBase64 = '';
    try {
      const logoPath = path.join(process.cwd(), 'public', 'images', 'header-logo.jpg');
      if (fs.existsSync(logoPath)) {
        const buffer = fs.readFileSync(logoPath);
        headerLogoBase64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      }
    } catch (e) {
      console.error('Error al leer el logo del membrete para Playwright:', e);
    }

    const buffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; margin: 0; padding: 0 25.4mm 0 25.4mm; -webkit-print-color-adjust: exact; box-sizing: border-box;">
          ${headerLogoBase64 ? `<img src="${headerLogoBase64}" style="width: 100%; height: auto; display: block; margin: 0;" />` : ''}
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; text-align: right; font-family: 'Georgia', 'Times New Roman', serif; font-size: 8.5pt; color: #555; padding-right: 25.4mm; margin-bottom: 10px; -webkit-print-color-adjust: exact;">
          Pág. <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
      `,
      margin: {
        top: '52mm',
        right: '25.4mm',
        bottom: '25.4mm',
        left: '25.4mm'
      }
    });
    return buffer as Buffer;
  } finally {
    await browser.close();
  }
}

export async function reportToDocxBuffer(report: any): Promise<Buffer> {
  // Fallback programático (cuando no usemos plantilla)
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: 'Informe Evolutivo – Abordaje Centrado en la Persona', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: `Nombre: ${report?.datosGenerales?.nombreCompleto || ''}` }),
          new Paragraph({ text: `Período: ${report?.datosGenerales?.periodo || ''}` }),
          ...Object.entries(report?.secciones || {}).flatMap(([key, frags]: any) => [
            new Paragraph({ text: String(key), heading: HeadingLevel.HEADING_2 }),
            ...(frags as any[]).map((f: any) => new Paragraph({ children: [new TextRun(f.texto || '')] }))
          ]),
        ]
      }
    ]
  });
  const buffer = await Packer.toBuffer(doc);
  return buffer as Buffer;
}

