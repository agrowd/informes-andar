import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { UserModel } from '@/models/User';
import { UserModel as UserModelPostgres } from '@/models/User.postgres';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CAN_MANAGE_USERS } from '@/types';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  console.log('[API /users/[id]] PUT request iniciado');
  
  try {
    console.log('[API /users/[id]] Conectando a DB...');
    await connectToDB();
    console.log('[API /users/[id]] DB conectada');
    
    console.log('[API /users/[id]] Obteniendo sesión...');
    const session = await getServerSession(authOptions as any) as any;
    console.log('[API /users/[id]] Sesión:', session ? { email: session.user?.email, role: (session.user as any)?.role } : 'null');
    
    const role = (session?.user as any)?.role || 'FACILITADOR';
    console.log('[API /users/[id]] Rol del usuario:', role);
    
    if (!CAN_MANAGE_USERS.includes(role as any)) {
      console.log('[API /users/[id]] ❌ No autorizado - Rol:', role);
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.log('[API /users/[id]] Resolviendo params...');
    const resolvedParams = await params;
    console.log('[API /users/[id]] Params:', resolvedParams);
    
    console.log('[API /users/[id]] Parseando body...');
    const body = await req.json();
    console.log('[API /users/[id]] Body recibido:', body);
    
    const userId = parseInt(resolvedParams.id) || resolvedParams.id;
    console.log('[API /users/[id]] UserId:', userId, 'Tipo:', typeof userId);

    if (sql) {
      console.log('[API /users/[id]] Usando Postgres para actualizar usuario...');
      const updated = await UserModelPostgres.update(Number(userId), { role: body.role });
      console.log('[API /users/[id]] ✅ Usuario actualizado:', { id: updated.id, email: updated.email, role: updated.role });
      console.log('[API /users/[id]] ✅ Éxito - Tiempo:', Date.now() - startTime, 'ms');
      return NextResponse.json({ ok: true, user: updated });
    } else if (process.env.MONGODB_URI) {
      console.log('[API /users/[id]] Usando MongoDB para actualizar usuario...');
      await UserModel.updateOne({ _id: userId }, { $set: { role: body.role } });
      const updated = await UserModel.findById(userId).lean();
      console.log('[API /users/[id]] ✅ Usuario actualizado');
      console.log('[API /users/[id]] ✅ Éxito - Tiempo:', Date.now() - startTime, 'ms');
      return NextResponse.json({ ok: true, user: updated });
    }

    console.log('[API /users/[id]] ❌ DB no configurada');
    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('[API /users/[id]] ❌ Error actualizando usuario:', error?.message || error);
    console.error('[API /users/[id]] Stack:', error?.stack);
    console.error('[API /users/[id]] Error completo:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

