import { Client } from 'ssh2';
import fs from 'node:fs';
import path from 'node:path';

const conn = new Client();

const FILES_TO_DEPLOY = [
  'package.json',
  'tsconfig.json',
  'src/app/api/reports/[id]/.docx/route.ts',
  'src/app/api/forms/[id]/copy/route.ts',
  'src/app/api/youngs/[id]/route.ts',
  'src/app/api/youngs/route.ts',
  'src/app/api/youngs/generate-pcp/route.ts',
  'src/app/_components/ExcelImportWizardModal.tsx',
  'src/app/form/page.tsx',
  'src/app/forms/page.tsx',
  'src/app/youngs/page.tsx',
  'src/models/Young.ts',
  'scripts/add-pcp-column.sql',
  'scripts/generate_trimestral_template.mjs',
  'scripts/run-migration.js',
  'src/app/api/forms/[id]/export-excel/route.ts',
  'src/app/api/reports/trimestral/route.ts',
  'src/app/api/youngs/import-excel/route.ts',
  'src/lib/ai/quarterlyGenerator.ts',
  'src/lib/form/defaultChecklists.ts',
  'templates/monthly_template.xlsx',
  'templates/trimestral_template.docx'
];

const REMOTE_BASE_DIR = '/srv/informes-andar';

conn.on('ready', () => {
  console.log('✅ Conectado por SSH al VPS. Iniciando SFTP...');
  
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('❌ Error al iniciar SFTP:', err);
      conn.end();
      return;
    }

    let completed = 0;

    async function deployNext() {
      if (completed === FILES_TO_DEPLOY.length) {
        console.log('✓ Todos los archivos se han subido con éxito por SFTP.');
        runPostDeployCommands();
        return;
      }

      const fileRelPath = FILES_TO_DEPLOY[completed];
      const localPath = path.join(process.cwd(), fileRelPath);
      const remotePath = path.posix.join(REMOTE_BASE_DIR, fileRelPath.replace(/\\/g, '/'));

      console.log(`Subiendo [${completed + 1}/${FILES_TO_DEPLOY.length}]: ${fileRelPath} -> ${remotePath}`);

      // Asegurar que el directorio remoto existe
      const remoteDir = path.posix.dirname(remotePath);
      
      // Creamos recursivamente el directorio en el VPS
      ensureRemoteDir(sftp, remoteDir, () => {
        sftp.fastPut(localPath, remotePath, (putErr) => {
          if (putErr) {
            console.error(`❌ Error al subir ${fileRelPath}:`, putErr);
            conn.end();
            return;
          }
          completed++;
          deployNext();
        });
      });
    }

    deployNext();
  });
});

function ensureRemoteDir(sftp, dir, callback) {
  const parts = dir.split('/').filter(Boolean);
  let current = '';
  
  if (dir.startsWith('/')) {
    current = '/';
  }

  function createNextPart(index) {
    if (index === parts.length) {
      callback();
      return;
    }

    current = path.posix.join(current, parts[index]);
    
    sftp.mkdir(current, (err) => {
      // Ignorar error si el directorio ya existe
      createNextPart(index + 1);
    });
  }

  createNextPart(0);
}

function runPostDeployCommands() {
  console.log('Ejecutando comandos post-despliegue en el VPS (migración, build y PM2 restart)...');
  
  const commands = [
    `cd ${REMOTE_BASE_DIR}`,
    'node scripts/run-migration.js',
    'npm install --legacy-peer-deps',
    'npm run build',
    'pm2 restart ecosystem.config.cjs',
    'pm2 list'
  ].join(' && ');

  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error('❌ Error al ejecutar comandos post-deploy:', err);
      conn.end();
      return;
    }

    stream.on('close', (code, signal) => {
      console.log(`\n✓ Servidor reiniciado con código de salida: ${code}`);
      conn.end();
    });

    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    });

    stream.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}

conn.on('error', (err) => {
  console.error('❌ Error de conexión SSH:', err);
});

conn.connect({
  host: '149.50.128.73',
  port: 5782,
  username: 'root',
  password: 'FedeServer.8888',
  readyTimeout: 15000
});
