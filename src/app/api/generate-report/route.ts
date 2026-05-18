import { NextRequest, NextResponse } from 'next/server';
import { generateReport } from '@/lib/ai/orchestrator';
import { GenerateReportRequest } from '@/types';
import { htmlToPdfBuffer } from '@/lib/pdf/render';
import { connectToDB, sql } from '@/lib/db';
import { ReportModel } from '@/models/Report';
import { AuditLogModel } from '@/models/AuditLog';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'node:fs';
import path from 'node:path';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateReportRequest & { 
      previewOnly?: boolean;
      updateExisting?: boolean;
      existingReportId?: string;
    };
    const provider = process.env.LLM_PROVIDER || 'gemini';
    const usedEnv = {
      iaEnabled: String(process.env.IA_ENABLED ?? 'false') === 'true',
      iaLocalOnly: String(process.env.IA_LOCAL_ONLY ?? 'false') === 'true',
      provider,
      model: process.env.LLM_MODEL || (provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'),
      temperature: Number(process.env.LLM_TEMPERATURE ?? 0)
    };

    const result = await generateReport(body.form, usedEnv);

    // Si es solo vista previa, retornar HTML sin generar PDF
    if (body.previewOnly) {
      return NextResponse.json({ 
        html: result.html,
        report: result.report,
        used: result.used
      });
    }

    // Generar PDF y exponer URL pública
    const pdfBuffer = await htmlToPdfBuffer(result.html);
    const reportsDir = path.join(process.cwd(), 'public', 'pdf-reports');
    await fs.promises.mkdir(reportsDir, { recursive: true });
    const timestamp = Date.now();
    const filename = `informe-${timestamp}.pdf`;
    const filePath = path.join(reportsDir, filename);
    await fs.promises.writeFile(filePath, pdfBuffer);
    const pdfUrl = `/pdf-reports/${filename}`;

    // Guardar también el Markdown
    const markdownFilename = `informe-${timestamp}.md`;
    const markdownFilePath = path.join(reportsDir, markdownFilename);
    if (result.markdown) {
      await fs.promises.writeFile(markdownFilePath, result.markdown, 'utf8');
    }
    const markdownUrl = result.markdown ? `/pdf-reports/${markdownFilename}` : null;

    // Persistir en DB si está configurada (MongoDB o Postgres)
    let finalVersion = 1;
    let finalUpdated = false;
    
    try {
      if (process.env.MONGODB_URI || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL) {
        await connectToDB();
        const session = await getServerSession(authOptions as any) as any;
        const form = body?.form as any;
        const report = result.report as any;
        const youngId = form?.datosGenerales?.youngId || null;
        const periodo = form?.datosGenerales?.periodo || 'No informado';
        const generatedBy = session?.user ? (sql ? Number((session.user as any).id) : (session.user as any).id) : null;

        // Buscar formulario guardado para obtener formId
        let formId: string | null = null;
        if (sql && session?.user) {
          const userId = Number((session.user as any).id);
          const formResult = await sql`
            SELECT id FROM forms 
            WHERE created_by = ${userId} 
              AND periodo = ${periodo}
              AND data->'datosGenerales'->>'nombreCompleto' = ${form?.datosGenerales?.nombreCompleto || ''}
            ORDER BY updated_at DESC
            LIMIT 1
          `;
          if (formResult.rows.length > 0) {
            formId = String(formResult.rows[0].id);
          }
        } else if (process.env.MONGODB_URI && session?.user) {
          const { FormModel } = await import('@/models/Form');
          const existingForm = await FormModel.findOne({
            createdBy: (session.user as any).id,
            periodo,
            'data.datosGenerales.nombreCompleto': form?.datosGenerales?.nombreCompleto
          }).sort({ updatedAt: -1 });
          if (existingForm) {
            formId = String(existingForm._id);
          }
        }

        // Verificar si ya existe informe para este período y joven
        let existingReport: any = null;
        if (sql && youngId && periodo) {
          const existingResult = await sql`
            SELECT id, version FROM reports 
            WHERE young_id = ${parseInt(String(youngId))} AND periodo = ${periodo}
            ORDER BY created_at DESC
            LIMIT 1
          `;
          if (existingResult.rows.length > 0) {
            existingReport = existingResult.rows[0];
          }
        } else if (process.env.MONGODB_URI && youngId && periodo) {
          existingReport = await ReportModel.findOne({ 
            youngId, 
            periodo 
          }).sort({ createdAt: -1 }).lean();
        }

        let reportId: string;
        let version = 1;
        let wasUpdated = false;

        if (existingReport && body?.updateExisting) {
          // Actualizar informe existente (regenerar)
          wasUpdated = true;
          version = (existingReport.version || 1) + 1;
          
          if (sql) {
            await sql`
              UPDATE reports 
              SET 
                data = ${JSON.stringify(report)}::jsonb,
                html = ${result.html},
                pdf_url = ${pdfUrl},
                trazabilidad = ${JSON.stringify(report?.trazabilidad || {})}::jsonb,
                status = 'BORRADOR',
                version = ${version},
                form_id = ${formId ? parseInt(formId) : null},
                updated_at = NOW()
              WHERE id = ${parseInt(String(existingReport.id || existingReport._id))}
            `;
            reportId = String(existingReport.id);
          } else if (process.env.MONGODB_URI) {
            await ReportModel.updateOne(
              { _id: existingReport._id },
              {
                $set: {
                  data: report,
                  html: result.html,
                  pdfUrl,
                  trazabilidad: report?.trazabilidad || {},
                  status: 'BORRADOR',
                  version,
                  formId: formId || undefined
                }
              }
            );
            reportId = String(existingReport._id);
          } else {
            reportId = String(existingReport.id || existingReport._id);
          }
        } else {
          // Crear nuevo informe
          if (sql) {
            const insertResult = await sql`
              INSERT INTO reports (
                young_id, form_id, periodo, data, html, pdf_url, trazabilidad, status, version, generated_by, created_at, updated_at
              ) VALUES (
                ${youngId ? parseInt(String(youngId)) : null},
                ${formId ? parseInt(formId) : null},
                ${periodo},
                ${JSON.stringify(report)}::jsonb,
                ${result.html},
                ${pdfUrl},
                ${JSON.stringify(report?.trazabilidad || {})}::jsonb,
                'BORRADOR',
                1,
                ${generatedBy},
                NOW(),
                NOW()
              )
              RETURNING id
            `;
            reportId = String(insertResult.rows[0].id);
          } else if (process.env.MONGODB_URI) {
            const created = await ReportModel.create({
              youngId: youngId || undefined,
              formId: formId || undefined,
              periodo,
              data: report,
              html: result.html,
              pdfUrl,
              trazabilidad: report?.trazabilidad || {},
              status: 'BORRADOR',
              version: 1,
              generatedBy: generatedBy || undefined
            });
            reportId = String(created._id);
          } else {
            reportId = 'unknown';
          }
        }

        // Auditoría
        try {
          const userId = session?.user ? (sql ? Number((session.user as any).id) : (session.user as any).id) : null;
          
          if (sql) {
            await sql`
              INSERT INTO audit_logs (entity_type, entity_id, action, user_id, meta, created_at)
              VALUES ('REPORT', ${parseInt(reportId)}, 'GENERATE_PDF', ${userId}, ${JSON.stringify({ used: result.used, version })}::jsonb, NOW())
            `;
          } else if (process.env.MONGODB_URI) {
            await AuditLogModel.create({ 
              entityType: 'REPORT', 
              entityId: reportId as any, 
              action: existingReport ? 'REGENERATE_PDF' : 'GENERATE_PDF', 
              meta: { used: result.used, version } 
            });
          }
        } catch (err) {
          console.error('Error guardando auditoría (no crítico):', err);
        }
        
        // Guardar valores finales
        finalVersion = version;
        finalUpdated = wasUpdated;
      }
    } catch (err) {
      // Log error pero no fallar la generación del informe
      console.error('Error guardando informe en DB (no crítico):', err);
    }

    return NextResponse.json({ 
      ...result, 
      pdfUrl, 
      markdownUrl,
      version: finalVersion,
      updated: finalUpdated
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 400 });
  }
}

