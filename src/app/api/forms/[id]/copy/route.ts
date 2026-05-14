import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { FormModel } from '@/models/Form';
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

    const formId = params.id;

    // Obtener formulario original
    let originalForm: any = null;
    
    if (sql) {
      // Postgres
      const result = await sql`
        SELECT * FROM forms WHERE id = ${parseInt(formId)}
      `;
      originalForm = result.rows[0];
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      originalForm = await FormModel.findById(formId).lean();
    }

    if (!originalForm) {
      return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 });
    }

    // Crear copia del formulario
    const newData = {
      ...originalForm.data,
      datosGenerales: {
        ...(originalForm.data?.datosGenerales || {}),
        periodo: (originalForm.data?.datosGenerales?.periodo || '') + ' (COPIA)',
      }
    };

    const newPeriodo = newData.datosGenerales.periodo || 'BORRADOR_COPIA';

    if (sql) {
      const newForm = await sql`
        INSERT INTO forms (young_id, periodo, data, created_by, status, version)
        VALUES (
          ${originalForm.young_id},
          ${newPeriodo},
          ${JSON.stringify(newData)}::jsonb,
          ${(session.user as any)?.id || null},
          'BORRADOR',
          1
        )
        RETURNING id, periodo, status, created_at
      `;
      return NextResponse.json({ 
        id: String(newForm.rows[0].id),
        periodo: newForm.rows[0].periodo,
        status: newForm.rows[0].status,
        message: 'Formulario duplicado correctamente'
      });
    } else if (process.env.MONGODB_URI) {
      const newForm = await FormModel.create({
        youngId: originalForm.youngId,
        periodo: newPeriodo,
        data: newData,
        createdBy: (session.user as any)?.id,
        status: 'BORRADOR',
        version: 1
      });
      return NextResponse.json({ 
        id: String(newForm._id),
        periodo: newForm.periodo,
        status: newForm.status,
        message: 'Formulario duplicado correctamente'
      });
    }

    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('Error duplicando formulario:', error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
