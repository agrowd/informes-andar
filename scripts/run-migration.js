import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.POSTGRES_URL || 
  'postgresql://neondb_owner:npg_vV4A1MUeYWhG@ep-morning-rain-ahzsfd2s-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Conectando a la base de datos para la migración...');
    await client.connect();
    console.log('✓ Conectado exitosamente');

    const sqlFile = fs.readFileSync(
      path.join(__dirname, 'add-pcp-column.sql'),
      'utf8'
    );

    console.log('Ejecutando SQL de migración:');
    console.log(sqlFile);

    await client.query(sqlFile);
    console.log('✓ Migración completada exitosamente.');
  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
