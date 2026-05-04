import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const reportId = params.id;

    // Obtener informe
    let report: any = null;
    
    if (sql) {
      // Postgres
      const result = await sql`
        SELECT * FROM reports WHERE id = ${parseInt(reportId)}
      `;
      if (result.rows.length > 0) {
        report = {
          id: result.rows[0].id,
          data: result.rows[0].data,
          periodo: result.rows[0].periodo,
          _id: String(result.rows[0].id)
        };
      }
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      report = await ReportModel.findById(reportId).lean();
    }

    if (!report) {
      return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 });
    }

    // Convertir datos del informe a formato de formulario
    const formData = report.data || report.data || {};

    return NextResponse.json({ 
      formData,
      reportId: report.id || String(report._id),
      periodo: report.periodo
    });
  } catch (error: any) {
    console.error('Error obteniendo datos del informe para formulario:', error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

