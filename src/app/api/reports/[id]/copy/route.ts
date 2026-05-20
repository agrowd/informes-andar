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
    let originalFormData: any = null;
    
    if (sql) {
      // Postgres: obtener el informe y su formulario asociado
      const result = await sql`
        SELECT r.*, f.data as form_data, f.id as form_id
        FROM reports r
        LEFT JOIN forms f ON r.form_id = f.id
        WHERE r.id = ${parseInt(reportId)}
      `;
      originalReport = result.rows[0];
      if (originalReport) {
        originalFormData = originalReport.form_data;
      }
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      originalReport = await ReportModel.findById(reportId).lean();
    }

    if (!originalReport) {
      return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 });
    }

    // Si hay formulario asociado, duplicar el formulario
    // Si no, usar los datos del report.data para reconstruir uno
    const sourceFormData = originalFormData || originalReport.data || {};
    
    // Limpiar período para que se complete de nuevo, pero mantener todos los datos del joven
    const newFormData = JSON.parse(JSON.stringify(sourceFormData));
    if (newFormData.datosGenerales) {
      newFormData.datosGenerales.periodo = ''; // Limpiar para que elija el nuevo período
    }

    // Crear nuevo formulario (borrador) con los datos copiados
    const createdBy = Number((session.user as any).id);

    if (sql) {
      const newForm = await sql`
        INSERT INTO forms (young_id, periodo, data, created_by, status, created_at, updated_at)
        VALUES (
          ${originalReport.young_id},
          ${'BORRADOR (copia)'},
          ${JSON.stringify(newFormData)}::jsonb,
          ${createdBy},
          'BORRADOR',
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      const formId = String(newForm.rows[0].id);

      return NextResponse.json({ 
        id: formId,
        type: 'form',
        message: 'Formulario duplicado correctamente. Redirigí al formulario para cambiar el período y los datos del nuevo mes.'
      });
    } else if (process.env.MONGODB_URI) {
      const { FormModel } = await import('@/models/Form');
      const newForm = await FormModel.create({
        youngId: originalReport.youngId,
        periodo: 'BORRADOR (copia)',
        data: newFormData,
        createdBy: (session.user as any)?.id,
        status: 'BORRADOR'
      });
      return NextResponse.json({ 
        id: String(newForm._id),
        type: 'form',
        message: 'Formulario duplicado correctamente.'
      });
    }

    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('Error copiando informe:', error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
