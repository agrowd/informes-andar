import { NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import { FormModel } from '@/models/Form';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role || 'FACILITADOR';

    if (sql) {
      // Postgres
      // Informes realizados
      const reportsQuery = role === 'FACILITADOR' 
        ? sql`SELECT * FROM reports WHERE generated_by = ${userId} ORDER BY created_at DESC`
        : sql`SELECT * FROM reports ORDER BY created_at DESC`;
      
      const reports = await reportsQuery;
      
      // Formularios pendientes (sin informe asociado)
      const formsQuery = role === 'FACILITADOR'
        ? sql`SELECT * FROM forms WHERE created_by = ${userId} ORDER BY created_at DESC`
        : sql`SELECT * FROM forms ORDER BY created_at DESC`;
      
      const forms = await formsQuery;
      
      // Informes faltantes: formularios sin informe asociado en el mismo período
      const missingReports: any[] = [];
      for (const form of forms.rows) {
        const hasReport = reports.rows.some((r: any) => 
          r.form_id === form.id || 
          (r.periodo === form.periodo && r.young_id === form.young_id)
        );
        if (!hasReport) {
          missingReports.push({
            formId: form.id,
            periodo: form.periodo,
            youngId: form.young_id,
            createdAt: form.created_at
          });
        }
      }

      return NextResponse.json({
        reportsTotal: reports.rows.length,
        reportsByStatus: {
          BORRADOR: reports.rows.filter((r: any) => r.status === 'BORRADOR').length,
          EN_REVISION: reports.rows.filter((r: any) => r.status === 'EN_REVISION').length,
          CAMBIOS_SOLICITADOS: reports.rows.filter((r: any) => r.status === 'CAMBIOS_SOLICITADOS').length,
          APROBADO: reports.rows.filter((r: any) => r.status === 'APROBADO').length,
        },
        formsTotal: forms.rows.length,
        formsPending: forms.rows.filter((f: any) => f.status === 'BORRADOR').length,
        missingReports: missingReports.length,
        missingReportsList: missingReports.slice(0, 10)
      });
    } else if (process.env.MONGODB_URI) {
      // MongoDB fallback
      const reportsFilter: any = {};
      const formsFilter: any = {};
      
      if (role === 'FACILITADOR') {
        reportsFilter.generatedBy = userId;
        formsFilter.createdBy = userId;
      }

      const reports = await ReportModel.find(reportsFilter).lean();
      const forms = await FormModel.find(formsFilter).lean();

      const missingReports: any[] = [];
      for (const form of forms) {
        const hasReport = reports.some((r: any) => 
          String(r.formId) === String(form._id) || 
          (r.periodo === form.periodo && String(r.youngId) === String(form.youngId))
        );
        if (!hasReport) {
          missingReports.push({
            formId: String(form._id),
            periodo: form.periodo,
            youngId: form.youngId,
            createdAt: (form as any).createdAt
          });
        }
      }

      return NextResponse.json({
        reportsTotal: reports.length,
        reportsByStatus: {
          BORRADOR: reports.filter((r: any) => r.status === 'BORRADOR').length,
          EN_REVISION: reports.filter((r: any) => r.status === 'EN_REVISION').length,
          CAMBIOS_SOLICITADOS: reports.filter((r: any) => r.status === 'CAMBIOS_SOLICITADOS').length,
          APROBADO: reports.filter((r: any) => r.status === 'APROBADO').length,
        },
        formsTotal: forms.length,
        formsPending: forms.filter((f: any) => f.status === 'BORRADOR').length,
        missingReports: missingReports.length,
        missingReportsList: missingReports.slice(0, 10)
      });
    }

    return NextResponse.json({
      reportsTotal: 0,
      reportsByStatus: { BORRADOR: 0, EN_REVISION: 0, CAMBIOS_SOLICITADOS: 0, APROBADO: 0 },
      formsTotal: 0,
      formsPending: 0,
      missingReports: 0,
      missingReportsList: []
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return NextResponse.json({
      reportsTotal: 0,
      reportsByStatus: { BORRADOR: 0, EN_REVISION: 0, CAMBIOS_SOLICITADOS: 0, APROBADO: 0 },
      formsTotal: 0,
      formsPending: 0,
      missingReports: 0,
      missingReportsList: []
    });
  }
}

