import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { UserModel } from '@/models/User';
import { UserModel as UserModelPostgres } from '@/models/User.postgres';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CAN_MANAGE_USERS } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const role = (session?.user as any)?.role || 'FACILITADOR';
    
    // Solo ADMIN y COORDINACION pueden ver facilitadores para asignación
    if (!['ADMIN', 'COORDINACION', 'DIRECTOR'].includes(role)) {
      return NextResponse.json({ items: [] });
    }

    if (sql) {
      // Postgres - devolver solo facilitadores para asignación
      const result = await sql`SELECT id, name, email FROM users WHERE role = 'FACILITADOR'`;
      return NextResponse.json({ items: result.rows.map((u: any) => ({ id: String(u.id), name: u.name || u.email })) });
    } else if (process.env.MONGODB_URI) {
      // MongoDB
      const users = await UserModel.find({ role: 'FACILITADOR' }).select('_id name email').lean();
      return NextResponse.json({ items: users.map((u: any) => ({ id: String(u._id), name: u.name || u.email })) });
    }

    return NextResponse.json({ items: [] });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return NextResponse.json({ items: [] });
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('[API /users] POST request iniciado');
  
  try {
    console.log('[API /users] Conectando a DB...');
    await connectToDB();
    console.log('[API /users] DB conectada');
    
    console.log('[API /users] Obteniendo sesión...');
    const session = await getServerSession(authOptions as any) as any;
    console.log('[API /users] Sesión:', session ? { email: session.user?.email, role: (session.user as any)?.role } : 'null');
    
    const role = (session?.user as any)?.role || 'FACILITADOR';
    console.log('[API /users] Rol del usuario:', role);
    
    if (!CAN_MANAGE_USERS.includes(role as any)) {
      console.log('[API /users] ❌ No autorizado - Rol:', role);
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.log('[API /users] Parseando body...');
    const body = await req.json();
    console.log('[API /users] Body recibido:', { email: body.email, name: body.name, role: body.role, hasPassword: !!body.password });
    const { email, name, role: userRole, password } = body;

    if (!email) {
      console.log('[API /users] ❌ Email requerido');
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    // Hashear contraseña si se proporciona
    let hashedPassword: string | null = null;
    if (password && password.length >= 8) {
      const bcrypt = await import('bcryptjs');
      hashedPassword = await bcrypt.default.hash(password, 10);
    }

    if (sql) {
      console.log('[API /users] Usando Postgres para crear usuario...');
      if (hashedPassword) {
        const result = await sql`
          INSERT INTO users (email, name, role, password)
          VALUES (${email}, ${name || null}, ${userRole || 'FACILITADOR'}, ${hashedPassword})
          RETURNING id, email, name, role
        `;
        const newUser = result.rows[0];
        console.log('[API /users] ✅ Usuario creado con contraseña:', { id: newUser.id, email: newUser.email });
        console.log('[API /users] ✅ Éxito - Tiempo:', Date.now() - startTime, 'ms');
        return NextResponse.json({ ok: true, user: newUser }, { status: 201 });
      } else {
        const newUser = await UserModelPostgres.create({
          email,
          name: name || null,
          role: userRole || 'FACILITADOR'
        });
        console.log('[API /users] ✅ Usuario creado:', { id: newUser.id, email: newUser.email });
        console.log('[API /users] ✅ Éxito - Tiempo:', Date.now() - startTime, 'ms');
        return NextResponse.json({ ok: true, user: newUser }, { status: 201 });
      }
    } else if (process.env.MONGODB_URI) {
      console.log('[API /users] Usando MongoDB para crear usuario...');
      const newUser = await UserModel.create({
        email,
        name: name || undefined,
        role: userRole || 'FACILITADOR',
        password: hashedPassword || undefined
      });
      console.log('[API /users] ✅ Usuario creado:', { id: (newUser as any)._id, email: newUser.email });
      console.log('[API /users] ✅ Éxito - Tiempo:', Date.now() - startTime, 'ms');
      return NextResponse.json({ ok: true, user: newUser }, { status: 201 });
    }

    console.log('[API /users] ❌ DB no configurada');
    return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
  } catch (error: any) {
    console.error('[API /users] ❌ Error creando usuario:', error?.message || error);
    console.error('[API /users] Stack:', error?.stack);
    console.error('[API /users] Error completo:', JSON.stringify(error, null, 2));
    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
    }
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}


