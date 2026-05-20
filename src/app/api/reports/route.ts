import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

function mapReportRow(r: any) {
  return {
    id: String(r.id),
    periodo: r.periodo,
    version: r.version || 1,
    status: r.status,
    reportType: r.report_type || 'MENSUAL',
    sourceReportIds: r.source_report_ids || [],
    pdfUrl: r.pdf_url,
    createdAt: r.created_at,
    youngId: r.young_id ? String(r.young_id) : null,
    grupo: r.grupo || 'Sin grupo',
    jovenNombre: r.joven_nombre || 'Sin nombre',
    openComments: Array.isArray(r.comments) ? r.comments.filter((c: any) => c.status !== 'RESOLVED').length : 0
  };
}

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;
    const periodoFilter = url.searchParams.get('periodo');
    const youngIdFilter = url.searchParams.get('youngId');
    const reportTypeFilter = url.searchParams.get('reportType');
    
    // Si usa Postgres
    if (sql) {
      // Si es búsqueda específica (sin paginación), retornar directamente
      if (periodoFilter && youngIdFilter) {
        const specificResult = await sql`
          SELECT 
            r.id, r.periodo, r.status, r.pdf_url, r.created_at, r.comments,
            r.young_id, r.version, r.report_type, r.source_report_ids,
            y.taller as grupo, y.nombre_completo as joven_nombre
          FROM reports r
          LEFT JOIN youngs y ON r.young_id = y.id
          WHERE r.periodo = ${periodoFilter} AND r.young_id = ${parseInt(youngIdFilter)}
          ORDER BY r.created_at DESC
          LIMIT 1
        `;
        if (specificResult.rows.length > 0) {
          return NextResponse.json({
            items: [mapReportRow(specificResult.rows[0])],
            total: 1, page: 1, pageSize: 1, totalPages: 1
          });
        }
        return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 1, totalPages: 0 });
      }
      
      // Sin filtros dinámicos complejos - usar queries condicionales simples
      let countResult;
      let dataResult;
      
      if (reportTypeFilter && periodoFilter) {
        countResult = await sql`SELECT COUNT(*) as total FROM reports WHERE report_type = ${reportTypeFilter} AND periodo = ${periodoFilter}`;
        dataResult = await sql`
          SELECT r.id, r.periodo, r.status, r.pdf_url, r.created_at, r.comments,
                 r.young_id, r.version, r.report_type, r.source_report_ids,
                 y.taller as grupo, y.nombre_completo as joven_nombre
          FROM reports r LEFT JOIN youngs y ON r.young_id = y.id
          WHERE r.report_type = ${reportTypeFilter} AND r.periodo = ${periodoFilter}
          ORDER BY r.created_at DESC LIMIT ${pageSize} OFFSET ${offset}
        `;
      } else if (reportTypeFilter) {
        countResult = await sql`SELECT COUNT(*) as total FROM reports WHERE report_type = ${reportTypeFilter}`;
        dataResult = await sql`
          SELECT r.id, r.periodo, r.status, r.pdf_url, r.created_at, r.comments,
                 r.young_id, r.version, r.report_type, r.source_report_ids,
                 y.taller as grupo, y.nombre_completo as joven_nombre
          FROM reports r LEFT JOIN youngs y ON r.young_id = y.id
          WHERE r.report_type = ${reportTypeFilter}
          ORDER BY r.created_at DESC LIMIT ${pageSize} OFFSET ${offset}
        `;
      } else if (periodoFilter) {
        countResult = await sql`SELECT COUNT(*) as total FROM reports WHERE periodo = ${periodoFilter}`;
        dataResult = await sql`
          SELECT r.id, r.periodo, r.status, r.pdf_url, r.created_at, r.comments,
                 r.young_id, r.version, r.report_type, r.source_report_ids,
                 y.taller as grupo, y.nombre_completo as joven_nombre
          FROM reports r LEFT JOIN youngs y ON r.young_id = y.id
          WHERE r.periodo = ${periodoFilter}
          ORDER BY r.created_at DESC LIMIT ${pageSize} OFFSET ${offset}
        `;
      } else {
        countResult = await sql`SELECT COUNT(*) as total FROM reports`;
        dataResult = await sql`
          SELECT r.id, r.periodo, r.status, r.pdf_url, r.created_at, r.comments,
                 r.young_id, r.version, r.report_type, r.source_report_ids,
                 y.taller as grupo, y.nombre_completo as joven_nombre
          FROM reports r LEFT JOIN youngs y ON r.young_id = y.id
          ORDER BY r.created_at DESC LIMIT ${pageSize} OFFSET ${offset}
        `;
      }
      
      const total = parseInt(countResult.rows[0].total);
      const mapped = dataResult.rows.map(mapReportRow);
      return NextResponse.json({ items: mapped, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    }
    
    // Si usa MongoDB (backward compatibility)
    if (process.env.MONGODB_URI) {
      const { ReportModel } = await import('@/models/Report');
      const total = await ReportModel.countDocuments({});
      const items = await ReportModel.find({})
        .populate('youngId', 'nombreCompleto taller')
        .sort({ createdAt: -1 })
        .limit(pageSize)
        .skip(offset)
        .lean();
      
      const mapped = items.map((r: any) => {
        const young = r.youngId;
        let grupo = 'Sin grupo';
        let jovenNombre = 'Sin nombre';
        
        if (young) {
          grupo = (young as any).taller || 'Sin grupo';
          jovenNombre = (young as any).nombreCompleto || 'Sin nombre';
        }
        
        return {
          id: String(r._id),
          periodo: r.periodo,
          status: r.status,
          reportType: (r as any).reportType || 'MENSUAL',
          sourceReportIds: (r as any).sourceReportIds || [],
          pdfUrl: r.pdfUrl,
          createdAt: r.createdAt,
          youngId: r.youngId ? String(r.youngId) : null,
          grupo,
          jovenNombre,
          openComments: Array.isArray(r.comments) ? r.comments.filter((c: any) => c.status !== 'RESOLVED').length : 0
        };
      });
      return NextResponse.json({ items: mapped, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    }
    
    return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 20, error: error?.message || String(error) });
  }
}
