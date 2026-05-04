import { sql } from '@vercel/postgres';

let cached: { conn: typeof sql | null } = (global as any)._postgres || { conn: null };

if (!cached) {
  cached = (global as any)._postgres = { conn: null };
}

export async function connectToDB() {
  if (cached.conn) return cached.conn;
  
  // Verificar que las variables de entorno estén configuradas
  if (!process.env.POSTGRES_URL && !process.env.POSTGRES_PRISMA_URL) {
    throw new Error('POSTGRES_URL o POSTGRES_PRISMA_URL no está configurada');
  }
  
  cached.conn = sql;
  return cached.conn;
}

export { sql };

