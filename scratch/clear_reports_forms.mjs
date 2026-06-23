import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';

// Cargar variables de entorno locales
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const connectionString = process.env.POSTGRES_URL || 
  'postgresql://neondb_owner:npg_vV4A1MUeYWhG@ep-morning-rain-ahzsfd2s-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Conectando a la base de datos PostgreSQL...');
    await client.connect();
    console.log('✓ Conectado exitosamente.');

    // Deshabilitar triggers temporalmente o usar DELETE común
    console.log('Borrando todos los registros de reports...');
    await client.query('DELETE FROM reports;');
    console.log('✓ Tabla reports vaciada.');

    console.log('Borrando todos los registros de forms...');
    await client.query('DELETE FROM forms;');
    console.log('✓ Tabla forms vaciada.');

    console.log('Reiniciando secuencias ID...');
    await client.query('ALTER SEQUENCE reports_id_seq RESTART WITH 1;');
    await client.query('ALTER SEQUENCE forms_id_seq RESTART WITH 1;');
    console.log('✓ Secuencias ID reiniciadas a 1.');

    console.log('Limpiando logs de auditoría asociados a FORM y REPORT...');
    const auditQuery = "DELETE FROM audit_logs WHERE entity_type IN ('FORM', 'REPORT');";
    await client.query(auditQuery);
    console.log('✓ Logs de auditoría limpiados.');

    console.log('✓ PROCESO DE LIMPIEZA COMPLETADO EXITOSAMENTE.');

  } catch (error) {
    console.error('❌ Error ejecutando la limpieza:', error);
  } finally {
    try {
      await client.end();
    } catch (e) {}
    console.log('Conexión cerrada.');
  }
}

run();
