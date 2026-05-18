import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;
    const periodoFilter = url.searchParams.get('periodo');
    const youngIdFilter = url.searchParams.get('youngId');
    
    // Si usa Postgres
    if (sql) {
      // Si es búsqueda específica (sin paginación), retornar directamente
      if (periodoFilter && youngIdFilter) {
        const specificResult = await sql`
          SELECT 
            r.id, 
            r.periodo, 
            r.status, 
            r.pdf_url, 
            r.created_at, 
            r.comments,
            r.young_id,
            r.version,
            y.taller as grupo,
            y.nombre_completo as joven_nombre
          FROM reports r
          LEFT JOIN youngs y ON r.young_id = y.id
          WHERE r.periodo = ${periodoFilter} AND r.young_id = ${parseInt(youngIdFilter)}
          ORDER BY r.created_at DESC
          LIMIT 1
        `;
        if (specificResult.rows.length > 0) {
          const r = specificResult.rows[0];
          return NextResponse.json({
            items: [{
              id: String(r.id),
              periodo: r.periodo,
              status: r.status,
              pdfUrl: r.pdf_url,
              createdAt: r.created_at,
              comments: r.comments,
              youngId: r.young_id,
              version: r.version || 1,
              grupo: r.grupo,
              joven_nombre: r.joven_nombre
            }],
            total: 1,
            page: 1,
            pageSize: 1,
            totalPages: 1
          });
        }
        return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 1, totalPages: 0 });
      }
      
      // Búsqueda general (paginada)
      let countQuery: any;
      let dataQuery: any;
      
      if (periodoFilter && youngIdFilter) {
        // Ya manejado arriba, no debería llegar aquí
        countQuery = await sql`SELECT COUNT(*) as total FROM reports WHERE periodo = ${periodoFilter} AND young_id = ${parseInt(youngIdFilter)}`;
        dataQuery = await sql`
          SELECT 
            r.id, 
            r.periodo, 
            r.status, 
            r.pdf_url, 
            r.created_at, 
            r.comments,
            r.young_id,
            r.version,
            y.taller as grupo,
            y.nombre_completo as joven_nombre
          FROM reports r
          LEFT JOIN youngs y ON r.young_id = y.id
          WHERE r.periodo = ${periodoFilter} AND r.young_id = ${parseInt(youngIdFilter)}
          ORDER BY r.created_at DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `;
      } else if (periodoFilter) {
        countQuery = await sql`SELECT COUNT(*) as total FROM reports WHERE periodo = ${periodoFilter}`;
        dataQuery = await sql`
          SELECT 
            r.id, 
            r.periodo, 
            r.status, 
            r.pdf_url, 
            r.created_at, 
            r.comments,
            r.young_id,
            r.version,
            y.taller as grupo,
            y.nombre_completo as joven_nombre
          FROM reports r
          LEFT JOIN youngs y ON r.young_id = y.id
          WHERE r.periodo = ${periodoFilter}
          ORDER BY r.created_at DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `;
      } else if (youngIdFilter) {
        countQuery = await sql`SELECT COUNT(*) as total FROM reports WHERE young_id = ${parseInt(youngIdFilter)}`;
        dataQuery = await sql`
          SELECT 
            r.id, 
            r.periodo, 
            r.status, 
            r.pdf_url, 
            r.created_at, 
            r.comments,
            r.young_id,
            r.version,
            y.taller as grupo,
            y.nombre_completo as joven_nombre
          FROM reports r
          LEFT JOIN youngs y ON r.young_id = y.id
          WHERE r.young_id = ${parseInt(youngIdFilter)}
          ORDER BY r.created_at DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `;
      } else {
        // Sin filtros
        countQuery = await sql`SELECT COUNT(*) as total FROM reports`;
        dataQuery = await sql`
          SELECT 
            r.id, 
            r.periodo, 
            r.status, 
            r.pdf_url, 
            r.created_at, 
            r.comments,
            r.young_id,
            r.version,
            y.taller as grupo,
            y.nombre_completo as joven_nombre
          FROM reports r
          LEFT JOIN youngs y ON r.young_id = y.id
          ORDER BY r.created_at DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `;
      }
      
      const total = parseInt(countQuery.rows[0].total);
      const result = dataQuery;
      const mapped = result.rows.map((r: any) => ({
        id: String(r.id),
        periodo: r.periodo,
        version: r.version || 1,
        status: r.status,
        pdfUrl: r.pdf_url,
        createdAt: r.created_at,
        youngId: r.young_id ? String(r.young_id) : null,
        grupo: r.grupo || 'Sin grupo',
        jovenNombre: r.joven_nombre || 'Sin nombre',
        openComments: Array.isArray(r.comments) ? r.comments.filter((c: any) => c.status !== 'RESOLVED').length : 0
      }));
      return NextResponse.json({ items: mapped, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    }
    
    // Si usa MongoDB (backward compatibility) - solo importar cuando sea necesario
    if (process.env.MONGODB_URI) {
      const { ReportModel } = await import('@/models/Report');
      const { YoungModel } = await import('@/models/Young');
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


