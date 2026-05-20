import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { NextRequest } from 'next/server';
import { GET } from './src/app/api/reports/route.ts';

async function run() {
  const req = new NextRequest('http://localhost:3000/api/reports?page=1&pageSize=20');
  const res = await GET(req);
  const json = await res.json();
  console.log('JSON:', json);
}
run();
