import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CAN_MANAGE_USERS } from '@/types';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    const role = (session?.user as any)?.role || 'FACILITADOR';
    
    if (!CAN_MANAGE_USERS.includes(role as any)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const resolvedParams = await params;
    const body = await req.json();
    const { password } = body;

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    const userId = parseInt(resolvedParams.id) || resolvedParams.id;
    const hashedPassword = await bcrypt.hash(password, 10);

    if (sql) {
      await sql`
        UPDATE users 
        SET password = ${hashedPassword}, updated_at = NOW()
        WHERE id = ${Number(userId)}
      `;
    } else if (process.env.MONGODB_URI) {
      const { UserModel } = await import('@/models/User');
      await UserModel.updateOne(
        { _id: userId },
        { $set: { password: hashedPassword } }
      );
    } else {
      return NextResponse.json({ error: 'DB no configurada' }, { status: 503 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error estableciendo contraseña:', error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

