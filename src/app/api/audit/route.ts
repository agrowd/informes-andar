import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { AuditLogModel } from '@/models/AuditLog';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    const entityId = url.searchParams.get('entityId');
    const entityType = url.searchParams.get('entityType');
    
    if (sql) {
      // Postgres
      let query;
      if (entityId && entityType) {
        query = sql`
          SELECT 
            id,
            entity_type,
            entity_id,
            action,
            user_id,
            meta,
            created_at
          FROM audit_logs
          WHERE entity_id = ${entityId} AND entity_type = ${entityType}
          ORDER BY created_at DESC
          LIMIT 50
        `;
      } else if (entityType) {
        query = sql`
          SELECT 
            id,
            entity_type,
            entity_id,
            action,
            user_id,
            meta,
            created_at
          FROM audit_logs
          WHERE entity_type = ${entityType}
          ORDER BY created_at DESC
          LIMIT 50
        `;
      } else {
        query = sql`
          SELECT 
            id,
            entity_type,
            entity_id,
            action,
            user_id,
            meta,
            created_at
          FROM audit_logs
          ORDER BY created_at DESC
          LIMIT 50
        `;
      }
      
      const result = await query;
      const items = result.rows.map((row: any) => ({
        id: String(row.id),
        _id: String(row.id),
        entityType: row.entity_type,
        entityId: String(row.entity_id),
        action: row.action,
        userId: row.user_id ? String(row.user_id) : null,
        meta: row.meta || {},
        createdAt: row.created_at
      }));
      
      return NextResponse.json({ items });
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      const filter: any = {};
      if (entityId) filter.entityId = entityId;
      if (entityType) filter.entityType = entityType;
      const items = await AuditLogModel.find(filter).sort({ createdAt: -1 }).limit(50).lean();
      return NextResponse.json({ items });
    }
    
    return NextResponse.json({ items: [] });
  } catch (error: any) {
    console.error('Error obteniendo auditoría:', error);
    return NextResponse.json({ items: [], error: error?.message }, { status: 500 });
  }
}


