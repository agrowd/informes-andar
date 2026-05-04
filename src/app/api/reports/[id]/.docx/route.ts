export { POST } from "../docx/route";

import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import { reportToDocxBuffer } from '@/lib/pdf/render';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  await connectToDB();
  const rep = await ReportModel.findById(params.id).lean();
  if (!rep) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const buf = await reportToDocxBuffer(rep.data);
  return new Response(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="informe-${params.id}.docx"` } });
}


