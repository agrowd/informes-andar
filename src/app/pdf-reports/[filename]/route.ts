import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;
    const filePath = path.join(process.cwd(), 'public', 'pdf-reports', filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`[PDF Dynamic Server] Archivo no encontrado en disco: ${filePath}`);
      return new NextResponse('Archivo no encontrado', { status: 404 });
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.md') {
      contentType = 'text/markdown; charset=utf-8';
    }
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('[PDF Dynamic Server] Error sirviendo archivo:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}
