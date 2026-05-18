import { chromium } from 'playwright';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const buffer = await page.pdf({ format: 'A4', printBackground: true });
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

