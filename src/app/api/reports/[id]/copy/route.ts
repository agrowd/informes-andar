import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const reportId = params.id;

    // Obtener informe original
    let originalReport: any = null;
    
    if (sql) {
      // Postgres
      const result = await sql`
        SELECT * FROM reports WHERE id = ${parseInt(reportId)}
      `;
      originalReport = result.rows[0];
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      originalReport = await ReportModel.findById(reportId).lean();
    }

    if (!originalReport) {
      return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 });
    }

    // Crear copia del informe
    const newReportData = {
      ...originalReport.data,
      datosGenerales: {
        ...originalReport.data?.datosGenerales,
        periodo: '', // Limpiar período para que se complete de nuevo
      }
    };

    if (sql) {
      const newReport = await sql`
        INSERT INTO reports (young_id, periodo, data, status, generated_by)
        VALUES (
          ${originalReport.young_id},
          ${newReportData.datosGenerales?.periodo || 'BORRADOR'},
          ${JSON.stringify(newReportData)}::jsonb,
          'BORRADOR',
          ${(session.user as any)?.id || null}
        )
        RETURNING id, periodo, status, created_at
      `;
      return NextResponse.json({ 
        id: String(newReport.rows[0].id),
        periodo: newReport.rows[0].periodo,
        status: newReport.rows[0].status,
        message: 'Informe copiado correctamente'
      });
    } else if (process.env.MONGODB_URI) {
      const newReport = await ReportModel.create({
        youngId: originalReport.youngId,
        periodo: newReportData.datosGenerales?.periodo || 'BORRADOR',
        data: newReportData,
        status: 'BORRADOR',
        generatedBy: (session.user as any)?.id
      });
      return NextResponse.json({ 
        id: String(newReport._id),
        periodo: newReport.periodo,
        status: newReport.status,
        message: 'Informe copiado correctamente'
      });
    }

    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('Error copiando informe:', error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

