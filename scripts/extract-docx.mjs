import fs from 'node:fs';
import path from 'node:path';
import mammoth from 'mammoth';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outDir = path.join(docsDir, 'parsed');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function extract(file) {
  const full = path.join(docsDir, file);
  const { value: md } = await mammoth.convertToMarkdown({ path: full });
  const lines = md.split(/\r?\n/);
  const sections = [];
  let current = null;
  for (const line of lines) {
    const h = line.match(/^(#+)\s+(.*)$/);
    if (h) {
      if (current) sections.push(current);
      current = { heading: h[2].trim(), level: h[1].length, content: [] };
    } else {
      if (!current) {
        current = { heading: 'PRÓLOGO', level: 1, content: [] };
      }
      if (line.trim() !== '') current.content.push(line);
    }
  }
  if (current) sections.push(current);

  return { markdown: md, sections };
}

async function main() {
  await ensureDir(outDir);
  const files = [
    'preguntas_para_el_informe_evolutivo.docx',
    'Celis_Analia_Informe_evolutivo.docx'
  ];
  for (const f of files) {
    const res = await extract(f);
    const base = path.basename(f, path.extname(f));
    await fs.promises.writeFile(path.join(outDir, base + '.md'), res.markdown, 'utf8');
    await fs.promises.writeFile(path.join(outDir, base + '.json'), JSON.stringify(res.sections, null, 2), 'utf8');
    console.log('Escrito:', base);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


