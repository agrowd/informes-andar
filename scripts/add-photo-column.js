import { Client } from 'pg';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addPhotoColumn() {
  // Usar POSTGRES_URL si está disponible, sino usar la URL directa (como en run-setup-postgres.js)
  const connectionString = process.env.POSTGRES_URL || 
    'postgresql://neondb_owner:npg_vV4A1MUeYWhG@ep-morning-rain-ahzsfd2s-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

  if (!connectionString) {
    console.error('Error: No se pudo obtener la cadena de conexión.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('Conectando a la base de datos...');
    await client.connect();
    console.log('✓ Conectado exitosamente');

    const sqlFile = fs.readFileSync(
      path.join(__dirname, 'add-photo-column.sql'),
      'utf8'
    );

    // Ejecutar el comando SQL
    await client.query(sqlFile);
    console.log('✅ Columna foto agregada correctamente a la tabla youngs');

  } catch (error) {
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('⚠ La columna foto ya existe');
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

addPhotoColumn();

