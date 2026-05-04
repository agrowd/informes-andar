import { NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { UserModel } from '@/models/User';
import { UserModel as UserModelPostgres } from '@/models/User.postgres';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CAN_MANAGE_USERS } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  console.log('[API /users/all] GET request iniciado');
  
  try {
    console.log('[API /users/all] Conectando a DB...');
    await connectToDB();
    console.log('[API /users/all] DB conectada');
    
    console.log('[API /users/all] Obteniendo sesión...');
    const session = await getServerSession(authOptions as any) as any;
    console.log('[API /users/all] Sesión:', session ? { email: session.user?.email, role: (session.user as any)?.role } : 'null');
    
    const role = (session?.user as any)?.role || 'FACILITADOR';
    console.log('[API /users/all] Rol del usuario:', role);
    
    if (!CAN_MANAGE_USERS.includes(role as any)) {
      console.log('[API /users/all] ❌ No autorizado - Rol:', role);
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (sql) {
      console.log('[API /users/all] Usando Postgres...');
      const result = await sql`SELECT * FROM users ORDER BY created_at DESC`;
      console.log('[API /users/all] Usuarios encontrados:', result.rows.length);
      const mapped = result.rows.map((u: any) => ({
        id: String(u.id),
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.created_at
      }));
      console.log('[API /users/all] ✅ Éxito - Tiempo:', Date.now() - startTime, 'ms');
      return NextResponse.json({ items: mapped });
    } else if (process.env.MONGODB_URI) {
      console.log('[API /users/all] Usando MongoDB...');
      const users = await UserModel.find({}).sort({ createdAt: -1 }).lean();
      console.log('[API /users/all] Usuarios encontrados:', users.length);
      const mapped = users.map((u: any) => ({
        id: String(u._id),
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: (u as any).createdAt
      }));
      console.log('[API /users/all] ✅ Éxito - Tiempo:', Date.now() - startTime, 'ms');
      return NextResponse.json({ items: mapped });
    }

    console.log('[API /users/all] ⚠️ DB no configurada');
    return NextResponse.json({ items: [] });
  } catch (error: any) {
    console.error('[API /users/all] ❌ Error:', error?.message || error);
    console.error('[API /users/all] Stack:', error?.stack);
    return NextResponse.json({ error: error?.message || 'Error desconocido', items: [] }, { status: 500 });
  }
}

