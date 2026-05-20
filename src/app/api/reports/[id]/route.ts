import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AuditLogModel } from '@/models/AuditLog';
import { htmlToPdfBuffer } from '@/lib/pdf/render';
import { renderDeterministic } from '@/lib/ai/orchestrator';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

// GET: Obtener informe completo con report_type
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();

    if (sql) {
      const result = await sql`
        SELECT r.*, y.nombre_completo as joven_nombre, y.taller as grupo
        FROM reports r
        LEFT JOIN youngs y ON r.young_id = y.id
        WHERE r.id = ${parseInt(params.id)}
      `;
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 });
      }
      const r = result.rows[0];
      return NextResponse.json({
        id: String(r.id),
        periodo: r.periodo,
        status: r.status,
        version: r.version || 1,
        reportType: r.report_type || 'MENSUAL',
        sourceReportIds: r.source_report_ids || [],
        pdfUrl: r.pdf_url,
        data: r.data,
        trazabilidad: r.trazabilidad,
        youngId: r.young_id,
        jovenNombre: r.joven_nombre,
        grupo: r.grupo,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      });
    } else if (process.env.MONGODB_URI) {
      const rep = await ReportModel.findById(params.id).lean();
      if (!rep) return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 });
      return NextResponse.json({
        id: String(rep._id),
        periodo: rep.periodo,
        status: rep.status,
        version: rep.version || 1,
        reportType: (rep as any).reportType || 'MENSUAL',
        sourceReportIds: (rep as any).sourceReportIds || [],
        pdfUrl: rep.pdfUrl,
        data: rep.data,
        trazabilidad: rep.trazabilidad,
        createdAt: rep.createdAt,
        updatedAt: rep.updatedAt
      });
    }

    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('Error obteniendo informe:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido' }, { status: 500 });
  }
}

// PUT: Editar secciones narrativas del informe inline y regenerar PDF
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { secciones } = body;

    if (!secciones || typeof secciones !== 'object') {
      return NextResponse.json({ error: 'Se requiere el campo secciones' }, { status: 400 });
    }

    if (sql) {
      // Obtener informe actual
      const current = await sql`SELECT id, data, version FROM reports WHERE id = ${parseInt(params.id)}`;
      if (current.rows.length === 0) {
        return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 });
      }

      const currentData = current.rows[0].data || {};
      const newVersion = (current.rows[0].version || 1) + 1;

      // Mezclar las secciones editadas con los datos existentes
      const updatedData = {
        ...currentData,
        secciones: secciones
      };

      // Inject the real persistent report ID
      updatedData.id = params.id;

      // Re-renderizar HTML con los datos actualizados
      let newHtml = '';
      let newPdfUrl = current.rows[0].pdf_url || null;
      try {
        const renderResult = renderDeterministic(updatedData);
        newHtml = await renderResult;

        // Regenerar PDF
        const pdfBuffer = await htmlToPdfBuffer(newHtml);
        const reportsDir = path.join(process.cwd(), 'public', 'pdf-reports');
        await fs.promises.mkdir(reportsDir, { recursive: true });
        const filename = `informe-${Date.now()}.pdf`;
        const filePath = path.join(reportsDir, filename);
        await fs.promises.writeFile(filePath, pdfBuffer);
        newPdfUrl = `/pdf-reports/${filename}`;
      } catch (renderErr) {
        console.error('Error re-renderizando (no crítico, se guarda sin nuevo PDF):', renderErr);
      }

      await sql`
        UPDATE reports
        SET data = ${JSON.stringify(updatedData)}::jsonb,
            html = ${newHtml || null},
            pdf_url = ${newPdfUrl},
            version = ${newVersion},
            updated_at = NOW()
        WHERE id = ${parseInt(params.id)}
      `;

      // Auditoría
      try {
        const userId = Number((session.user as any).id);
        await sql`
          INSERT INTO audit_logs (entity_type, entity_id, action, user_id, meta, created_at)
          VALUES ('REPORT', ${parseInt(params.id)}, 'EDIT_INLINE', ${userId}, ${JSON.stringify({ version: newVersion })}::jsonb, NOW())
        `;
      } catch (auditErr) {
        console.error('Error auditoría (no crítico):', auditErr);
      }

      return NextResponse.json({ ok: true, version: newVersion, pdfUrl: newPdfUrl });
    } else if (process.env.MONGODB_URI) {
      const rep = await ReportModel.findById(params.id);
      if (!rep) return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 });

      const currentData = rep.data || {};
      const newVersion = (rep.version || 1) + 1;
      const updatedData = { ...currentData, secciones };

      // Inject the real persistent report ID
      updatedData.id = params.id;

      await ReportModel.updateOne(
        { _id: params.id },
        { $set: { data: updatedData, version: newVersion } }
      );

      return NextResponse.json({ ok: true, version: newVersion });
    }

    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('Error editando informe:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido' }, { status: 500 });
  }
}

// DELETE: Eliminar informe (solo ADMIN)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const role = (session?.user as any)?.role || 'FACILITADOR';
    
    // Solo ADMIN puede eliminar informes
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo ADMIN puede eliminar informes' }, { status: 403 });
    }

    // Verificar que el informe existe
    let exists = false;
    
    if (sql) {
      const checkResult = await sql`SELECT id FROM reports WHERE id = ${parseInt(params.id)}`;
      exists = checkResult.rows.length > 0;
    } else if (process.env.MONGODB_URI) {
      const report = await ReportModel.findById(params.id);
      exists = !!report;
    }

    if (!exists) {
      return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 });
    }

    // Eliminar informe
    if (sql) {
      await sql`DELETE FROM reports WHERE id = ${parseInt(params.id)}`;
    } else if (process.env.MONGODB_URI) {
      await ReportModel.deleteOne({ _id: params.id });
    }

    // Auditoría
    try {
      const userId = session?.user ? (sql ? Number((session.user as any).id) : (session.user as any).id) : null;
      
      if (sql) {
        await sql`
          INSERT INTO audit_logs (entity_type, entity_id, action, user_id, meta, created_at)
          VALUES ('REPORT', ${parseInt(params.id)}, 'DELETE', ${userId}, ${JSON.stringify({ reportId: params.id })}::jsonb, NOW())
        `;
      } else if (process.env.MONGODB_URI) {
        await AuditLogModel.create({
          entityType: 'REPORT',
          entityId: params.id as any,
          action: 'DELETE',
          meta: { reportId: params.id },
          userId: (session?.user as any)?.id
        });
      }
    } catch (err) {
      console.error('Error guardando auditoría (no crítico):', err);
    }

    return NextResponse.json({ ok: true, message: 'Informe eliminado correctamente' });
  } catch (error: any) {
    console.error('Error eliminando informe:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido' }, { status: 500 });
  }
}



