import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildCompleteWorkbook } from '@/lib/excelExport';

const USE_POSTGRES = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const reportId = parseInt(params.id);
    let reportData: any = null;
    let youngId: number | null = null;
    let young: any = null;
    let forms: any[] = [];
    let reportCreatedAt: any = null;

    if (USE_POSTGRES && sql) {
      const result = await sql`
        SELECT r.id, r.data, r.report_type, r.young_id, r.created_at,
               y.id as y_id, y.nombre_completo, y.dni, y.taller, y.fecha_nacimiento, y.legajo, y.obra_social, y.pcp
        FROM reports r
        LEFT JOIN youngs y ON r.young_id = y.id
        WHERE r.id = ${reportId}
      `;
      if (result.rows.length > 0) {
        const row = result.rows[0];
        reportData = row.data;
        reportCreatedAt = row.created_at;
        youngId = row.young_id;
        young = {
          id: row.y_id || row.young_id,
          nombre_completo: row.nombre_completo,
          dni: row.dni,
          taller: row.taller,
          fecha_nacimiento: row.fecha_nacimiento,
          legajo: row.legajo,
          obra_social: row.obra_social,
          pcp: row.pcp
        };

        if (youngId) {
          const allFormsRes = await sql`
            SELECT id, periodo, data, created_at
            FROM forms
            WHERE young_id = ${youngId}
            ORDER BY periodo ASC, id ASC
          `;
          forms = allFormsRes.rows;
        }
      }
    } else if (process.env.MONGODB_URI) {
      const { ReportModel } = await import('@/models/Report');
      const rep = await ReportModel.findById(params.id).lean();
      if (rep) {
        reportData = rep.data;
        reportCreatedAt = (rep as any).createdAt;
        const yId = (rep as any).youngId?.toString();
        try {
          const { YoungModel } = await import('@/models/Young');
          const youngItem = await YoungModel.findById(yId).lean();
          if (youngItem) {
            young = {
              id: (youngItem as any)._id?.toString(),
              nombre_completo: (youngItem as any).nombreCompleto || (youngItem as any).nombre_completo,
              dni: (youngItem as any).dni,
              taller: (youngItem as any).taller,
              fecha_nacimiento: (youngItem as any).fechaNacimiento || (youngItem as any).fecha_nacimiento,
              legajo: (youngItem as any).legajo,
              obra_social: (youngItem as any).obraSocial || (youngItem as any).obra_social,
              pcp: (youngItem as any).pcp
            };
          }
          const { FormModel } = await import('@/models/Form');
          const allItems = await FormModel.find({ youngId: yId }).lean();
          forms = allItems.map((it: any) => ({
            id: it._id?.toString(),
            periodo: it.data?.datosGenerales?.periodo,
            data: it.data,
            created_at: it.createdAt
          }));
        } catch (e) {
          console.error('Error fetching young in Mongo reports export-excel:', e);
        }
      }
    }

    if (!reportData) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
    }

    const workbook = await buildCompleteWorkbook(young, forms, undefined, {
      includePcp: false
    });
    const buffer = await workbook.xlsx.writeBuffer();

    const nombreCompleto = young?.nombre_completo || reportData.datosGenerales?.nombreCompleto || 'Concurrente';
    const grupoNombre = young?.taller || reportData.datosGenerales?.grupo || 'Grupo';
    const rawFecha = reportCreatedAt || reportData.datosGenerales?.fechaCreacion || new Date();
    const dCreacion = new Date(rawFecha);
    const fechaCreacionStr = !isNaN(dCreacion.getTime())
      ? `${String(dCreacion.getDate()).padStart(2, '0')}-${String(dCreacion.getMonth() + 1).padStart(2, '0')}-${dCreacion.getFullYear()}`
      : new Date().toLocaleDateString('es-AR').replace(/\//g, '-');

    const safeNombre = nombreCompleto.replace(/\s+/g, '_');
    const safeGrupo = grupoNombre.replace(/\s+/g, '_');

    return new Response(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="cuadricula-${safeNombre}-${safeGrupo}-${fechaCreacionStr}.xlsx"`
      }
    });

  } catch (error: any) {
    console.error('Error al exportar Excel de reporte:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido al exportar reporte' }, { status: 500 });
  }
}
