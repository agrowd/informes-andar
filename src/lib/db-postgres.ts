// @ts-ignore
import pg from 'pg';

const { Pool } = pg;

// Reutilizar el pool en entornos Next.js / serverless
declare global {
  var _postgres_pool: any;
}

function getPool(): any {
  if (global._postgres_pool) {
    return global._postgres_pool;
  }

  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (!connectionString) {
    throw new Error('POSTGRES_URL o DATABASE_URL no está configurada');
  }

  const isLocal =
    connectionString.includes('localhost') ||
    connectionString.includes('127.0.0.1');

  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err: any) => {
    console.error('[Postgres Pool Error]:', err.message);
  });

  global._postgres_pool = pool;
  return pool;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
  fields: any[];
}

export type SqlFunction = {
  <T = any>(strings: TemplateStringsArray | string, ...values: any[]): Promise<QueryResult<T>>;
  query: <T = any>(text: string, params?: any[]) => Promise<QueryResult<T>>;
};

export const sql: SqlFunction = (async <T = any>(
  strings: TemplateStringsArray | string,
  ...values: any[]
): Promise<QueryResult<T>> => {
  const p = getPool();

  if (Array.isArray(strings) && 'raw' in strings) {
    let queryText = '';
    const queryValues: any[] = [];
    for (let i = 0; i < strings.length; i++) {
      queryText += strings[i];
      if (i < values.length) {
        const val = values[i];
        queryValues.push(val === undefined ? null : val);
        queryText += `$${queryValues.length}`;
      }
    }
    return p.query(queryText, queryValues);
  }

  if (typeof strings === 'string') {
    return p.query(strings, values[0] || []);
  }

  throw new Error('Invocación inválida de sql');
}) as SqlFunction;

sql.query = <T = any>(text: string, params?: any[]): Promise<QueryResult<T>> => {
  return getPool().query(text, params);
};

export async function connectToDB() {
  getPool();
  return sql;
}

export default sql;
