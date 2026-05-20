import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { mergeReports } from '@/lib/ai/merge';
import { htmlToPdfBuffer } from '@/lib/pdf/render';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const VALID_MERGE_RULES: Record<string, { sourceType: string; requiredCount: number }> = {
  'TRIMESTRAL': { sourceType: 'MENSUAL', requiredCount: 3 },
  'SEMESTRAL': { sourceType: 'TRIMESTRAL', requiredCount: 2 },
  'ANUAL': { sourceType: 'SEMESTRAL', requiredCount: 2 },
};

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { sourceReportIds, targetType } = body as {
      sourceReportIds: number[];
      targetType: 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
    };

    // Validar parámetros
    if (!sourceReportIds || !Array.isArray(sourceReportIds) || sourceReportIds.length === 0) {
      return NextResponse.json({ error: 'sourceReportIds es requerido y debe ser un array' }, { status: 400 });
    }
    if (!targetType || !VALID_MERGE_RULES[targetType]) {
      return NextResponse.json({ error: `targetType inválido. Debe ser: ${Object.keys(VALID_MERGE_RULES).join(', ')}` }, { status: 400 });
    }

    const rule = VALID_MERGE_RULES[targetType];

    if (sourceReportIds.length !== rule.requiredCount) {
      return NextResponse.json({
        error: `Para un informe ${targetType} se necesitan exactamente ${rule.requiredCount} informes de tipo ${rule.sourceType}. Se recibieron ${sourceReportIds.length}.`
      }, { status: 400 });
    }

    if (!sql) {
      return NextResponse.json({ error: 'Solo soportado con Postgres' }, { status: 503 });
    }

    // Obtener los informes fuente - buscar cada uno individualmente (Vercel Postgres no soporta arrays nativos)
    const sourceReportResults: any[] = [];
    for (const srcId of sourceReportIds) {
      const result = await sql`
        SELECT id, data, periodo, young_id, report_type, status
        FROM reports WHERE id = ${Number(srcId)}
      `;
      if (result.rows.length > 0) sourceReportResults.push(result.rows[0]);
    }
    // Ordenar por created_at (ya que buscamos individualmente)
    const sourceRows = sourceReportResults;

    if (sourceRows.length !== rule.requiredCount) {
      return NextResponse.json({
        error: `No se encontraron todos los informes fuente. Se esperaban ${rule.requiredCount}, se encontraron ${sourceRows.length}.`
      }, { status: 404 });
    }

    // Validar que todos son del tipo correcto
    const invalidTypes = sourceRows.filter((r: any) => (r.report_type || 'MENSUAL') !== rule.sourceType);
    if (invalidTypes.length > 0) {
      return NextResponse.json({
        error: `Todos los informes fuente deben ser de tipo ${rule.sourceType}. Los informes ${invalidTypes.map((r: any) => `#${r.id} (${r.report_type || 'MENSUAL'})`).join(', ')} no lo son.`
      }, { status: 400 });
    }

    // Validar que todos pertenecen al mismo joven
    const youngIds = [...new Set(sourceRows.map((r: any) => r.young_id))];
    if (youngIds.length > 1) {
      return NextResponse.json({
        error: 'Todos los informes fuente deben pertenecer al mismo joven.'
      }, { status: 400 });
    }

    const youngId = youngIds[0];

    // Obtener datos del joven para el merge
    let jovenNombre = 'Sin nombre';
    if (youngId) {
      const youngResult = await sql`SELECT nombre_completo FROM youngs WHERE id = ${youngId}`;
      if (youngResult.rows.length > 0) {
        jovenNombre = youngResult.rows[0].nombre_completo;
      }
    }

    // Calcular período del informe fusionado
    const periodos = sourceRows.map((r: any) => r.periodo);
    const mergedPeriodo = `${periodos[0]} – ${periodos[periodos.length - 1]}`;

    // Preparar datos para la fusión con IA
    const sourceData = sourceRows.map((r: any) => ({
      id: r.id,
      periodo: r.periodo,
      data: r.data
    }));

    // Generar el informe fusionado con IA
    const provider = process.env.LLM_PROVIDER || 'gemini';
    const iaEnabled = String(process.env.IA_ENABLED ?? 'false') === 'true';

    const mergeResult = await mergeReports(sourceData, {
      targetType,
      jovenNombre,
      mergedPeriodo,
      iaEnabled,
      provider: provider as any,
      model: process.env.LLM_MODEL || (provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'),
      temperature: Number(process.env.LLM_TEMPERATURE ?? 0)
    });

    // Generar PDF
    const pdfBuffer = await htmlToPdfBuffer(mergeResult.html);
    const reportsDir = path.join(process.cwd(), 'public', 'pdf-reports');
    await fs.promises.mkdir(reportsDir, { recursive: true });
    const filename = `informe-${targetType.toLowerCase()}-${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, filename);
    await fs.promises.writeFile(filePath, pdfBuffer);
    const pdfUrl = `/pdf-reports/${filename}`;

    // Guardar en la DB
    const generatedBy = Number((session.user as any).id);
    // Guardar en la DB con source_report_ids como JSON string (se convierte en el SQL)
    const sourceIdsArrayStr = `{${sourceReportIds.join(',')}}`;  // Postgres array literal
    const insertResult = await sql`
      INSERT INTO reports (
        young_id, periodo, data, html, pdf_url, 
        report_type, source_report_ids, status, version, generated_by,
        created_at, updated_at
      ) VALUES (
        ${youngId},
        ${mergedPeriodo},
        ${JSON.stringify(mergeResult.report)}::jsonb,
        ${mergeResult.html},
        ${pdfUrl},
        ${targetType},
        ${sourceIdsArrayStr}::INTEGER[],
        'BORRADOR',
        1,
        ${generatedBy},
        NOW(),
        NOW()
      )
      RETURNING id
    `;
    const reportId = String(insertResult.rows[0].id);

    // Auditoría
    try {
      await sql`
        INSERT INTO audit_logs (entity_type, entity_id, action, user_id, meta, created_at)
        VALUES ('REPORT', ${parseInt(reportId)}, 'MERGE', ${generatedBy}, 
          ${JSON.stringify({ targetType, sourceReportIds, used: mergeResult.used })}::jsonb, NOW())
      `;
    } catch (auditErr) {
      console.error('Error auditoría merge (no crítico):', auditErr);
    }

    return NextResponse.json({
      ok: true,
      reportId,
      periodo: mergedPeriodo,
      reportType: targetType,
      pdfUrl,
      used: mergeResult.used
    });
  } catch (error: any) {
    console.error('Error fusionando informes:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido' }, { status: 500 });
  }
}
