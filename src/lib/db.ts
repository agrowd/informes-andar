// Sistema de base de datos: soporta MongoDB y Postgres
// Usa Postgres si POSTGRES_URL está configurada, sino usa MongoDB

import mongoose from 'mongoose';
import { connectToDB as connectPostgres, sql as postgresSql } from './db-postgres';

const USE_POSTGRES = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);

// MongoDB setup (backward compatibility)
const MONGODB_URI = process.env.MONGODB_URI || '';
let cached = (global as any)._mongoose as { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

if (!cached) {
  cached = (global as any)._mongoose = { conn: null, promise: null };
}

async function connectMongoDB() {
  if (cached.conn) return cached.conn;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI no configurada. Si quieres usar Postgres, configura POSTGRES_URL en Vercel.');
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Exportar según la configuración
export async function connectToDB() {
  // No intentar conectar durante el build
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }
  
  if (USE_POSTGRES) {
    return connectPostgres();
  } else {
    return connectMongoDB();
  }
}

export const sql = USE_POSTGRES ? postgresSql : undefined;

