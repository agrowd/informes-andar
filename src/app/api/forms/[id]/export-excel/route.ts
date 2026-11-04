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

    const formId = parseInt(params.id);
    let formData: any = null;
    let young: any = null;
    let forms: any[] = [];
    let formCreatedAt: any = null;

    if (USE_POSTGRES && sql) {
      const result = await sql`
        SELECT f.id, f.data, f.periodo, f.young_id, f.created_at,
               y.id as y_id, y.nombre_completo, y.dni, y.taller, y.fecha_nacimiento, y.legajo, y.obra_social, y.pcp
        FROM forms f
        LEFT JOIN youngs y ON f.young_id = y.id
        WHERE f.id = ${formId}
      `;
      if (result.rows.length > 0) {
        const row = result.rows[0];
        formData = row.data;
        formCreatedAt = row.created_at;
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

        if (young.id) {
          const allFormsRes = await sql`
            SELECT id, periodo, data, created_at
            FROM forms
            WHERE young_id = ${young.id}
            ORDER BY periodo ASC, id ASC
          `;
          forms = allFormsRes.rows;
        } else {
          forms = [{ id: row.id, periodo: row.periodo, data: row.data, created_at: row.created_at }];
        }
      }
    } else if (process.env.MONGODB_URI) {
      const { FormModel } = await import('@/models/Form');
      const item = await FormModel.findById(params.id).lean();
      if (item) {
        formData = item.data;
        formCreatedAt = (item as any).createdAt;
        try {
          const { YoungModel } = await import('@/models/Young');
          const youngItem = await YoungModel.findById(item.youngId).lean();
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
          const allItems = await FormModel.find({ youngId: item.youngId }).lean();
          forms = allItems.map((it: any) => ({
            id: it._id?.toString(),
            periodo: it.data?.datosGenerales?.periodo,
            data: it.data,
            created_at: it.createdAt
          }));
        } catch (e) {
          console.error('Error fetching young in Mongo export-excel:', e);
        }
      }
    }

    if (!formData) {
      return NextResponse.json({ error: 'Borrador no encontrado' }, { status: 404 });
    }

    const single = req.nextUrl.searchParams.get('single') === '1' || req.nextUrl.searchParams.get('single') === 'true';
    const workbook = await buildCompleteWorkbook(young, forms, formData, {
      includePcp: false,
      singleMonthOnly: single
    });
    const buffer = await workbook.xlsx.writeBuffer();

    const nombreCompleto = young?.nombre_completo || formData.datosGenerales?.nombreCompleto || 'Concurrente';
    const grupoNombre = young?.taller || formData.datosGenerales?.grupo || 'Grupo';
    const rawFecha = formCreatedAt || formData.datosGenerales?.fechaCreacion || new Date();
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
    console.error('Error al exportar Excel:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido al exportar planilla' }, { status: 500 });
  }
}
