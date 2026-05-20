import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function run() {
  try {
    const countQuery = await sql`SELECT COUNT(*) as total FROM reports`;
    console.log('COUNT QUERY ROWS:', countQuery.rows);
    console.log('COUNT QUERY KEYS:', Object.keys(countQuery.rows[0]));
    console.log('COUNT QUERY VALUES:', Object.values(countQuery.rows[0]));
    
    const reports = await sql`SELECT id, young_id, periodo FROM reports`;
    console.log('REPORTS LENGTH:', reports.rows.length);
  } catch (err) {
    console.error(err);
  }
}
run();
