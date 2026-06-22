import mammoth from 'mammoth';
import fs from 'node:fs';

const docxPath = "C:\\Users\\Try Hard\\Desktop\\Nexte\\informes-andar\\informes\\2 Juan Pablo Herrera informes trimestral.docx";

mammoth.extractRawText({ path: docxPath })
  .then((result) => {
    console.log("=== DOCX TEXT CONTENT ===");
    console.log(result.value);
    console.log("=== WARNINGS ===");
    console.log(result.messages);
  })
  .catch((err) => {
    console.error("Error reading docx:", err);
  });
