import fs from 'node:fs';
import PizZip from 'pizzip';

try {
  const content = fs.readFileSync('informes/2 Juan Pablo Herrera informes trimestral.docx', 'binary');
  const zip = new PizZip(content);
  const docXmlText = zip.file('word/document.xml').asText();
  fs.writeFileSync('scratch/document.xml.txt', docXmlText, 'utf8');
  console.log('XML extracted successfully. Size:', docXmlText.length);
} catch (err) {
  console.error('Error:', err);
}
