import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const role = (session?.user as any)?.role || 'FACILITADOR';
    
    if (!['ADMIN', 'DIRECTOR', 'COORDINACION'].includes(role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'csv';
    const entityType = url.searchParams.get('type') || 'reports'; // reports, forms, youngs

    if (format === 'csv') {
      let csv = '';
      
      if (entityType === 'reports') {
        if (sql) {
          const result = await sql`
            SELECT 
              r.id,
              r.periodo,
              r.status,
              r.created_at,
              y.nombre_completo as joven_nombre,
              y.taller as grupo
            FROM reports r
            LEFT JOIN youngs y ON r.young_id = y.id
            ORDER BY r.created_at DESC
          `;
          
          csv = 'ID,Período,Estado,Joven,Grupo,Fecha de creación\n';
          result.rows.forEach((r: any) => {
            csv += `${r.id},"${r.periodo}","${r.status}","${r.joven_nombre || 'Sin nombre'}","${r.grupo || 'Sin grupo'}","${new Date(r.created_at).toISOString()}"\n`;
          });
        } else if (process.env.MONGODB_URI) {
          const { ReportModel } = await import('@/models/Report');
          const { YoungModel } = await import('@/models/Young');
          const items = await ReportModel.find({})
            .populate('youngId', 'nombreCompleto taller')
            .sort({ createdAt: -1 })
            .lean();
          
          csv = 'ID,Período,Estado,Joven,Grupo,Fecha de creación\n';
          items.forEach((r: any) => {
            const young = r.youngId as any;
            csv += `${r._id},"${r.periodo}","${r.status}","${young?.nombreCompleto || 'Sin nombre'}","${young?.taller || 'Sin grupo'}","${new Date(r.createdAt).toISOString()}"\n`;
          });
        }
      } else if (entityType === 'forms') {
        if (sql) {
          const result = await sql`
            SELECT id, periodo, created_at, updated_at
            FROM forms
            ORDER BY updated_at DESC
          `;
          
          csv = 'ID,Período,Fecha de creación,Última actualización\n';
          result.rows.forEach((r: any) => {
            csv += `${r.id},"${r.periodo}","${new Date(r.created_at).toISOString()}","${new Date(r.updated_at).toISOString()}"\n`;
          });
        } else if (process.env.MONGODB_URI) {
          const { FormModel } = await import('@/models/Form');
          const items = await FormModel.find({}).sort({ updatedAt: -1 }).lean();
          
          csv = 'ID,Período,Fecha de creación,Última actualización\n';
          items.forEach((r: any) => {
            csv += `${r._id},"${r.periodo}","${new Date(r.createdAt).toISOString()}","${new Date(r.updatedAt).toISOString()}"\n`;
          });
        }
      } else if (entityType === 'youngs') {
        if (sql) {
          const result = await sql`
            SELECT id, nombre_completo, dni, taller, created_at
            FROM youngs
            ORDER BY nombre_completo ASC
          `;
          
          csv = 'ID,Nombre completo,DNI,Taller,Fecha de creación\n';
          result.rows.forEach((r: any) => {
            csv += `${r.id},"${r.nombre_completo}","${r.dni || ''}","${r.taller || ''}","${new Date(r.created_at).toISOString()}"\n`;
          });
        } else if (process.env.MONGODB_URI) {
          const { YoungModel } = await import('@/models/Young');
          const items = await YoungModel.find({}).sort({ nombreCompleto: 1 }).lean();
          
          csv = 'ID,Nombre completo,DNI,Taller,Fecha de creación\n';
          items.forEach((r: any) => {
            csv += `${r._id},"${r.nombreCompleto}","${r.dni || ''}","${r.taller || ''}","${new Date(r.createdAt).toISOString()}"\n`;
          });
        }
      }

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${entityType}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({ error: 'Formato no soportado' }, { status: 400 });
  } catch (error: any) {
    console.error('Error exportando datos:', error);
    return NextResponse.json({ error: error?.message || 'Error exportando' }, { status: 500 });
  }
}

