import { NextResponse } from 'next/server';
import { buildFormHints } from '@/lib/docs/constants';

export async function GET() {
  const hints = buildFormHints();
  return NextResponse.json(hints);
}


