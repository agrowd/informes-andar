import { NextRequest, NextResponse } from 'next/server';
import { connectToDB, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions as any) as any;
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!sql) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const youngId = parseInt(params.id);
    if (isNaN(youngId)) {
      return NextResponse.json({ error: 'ID de concurrente inválido' }, { status: 400 });
    }

    const body = await req.json();
    const unlocked = !!body.unlocked;
    const reason = body.reason || 'Concurrente no asistió en los meses o períodos faltantes por razones justificadas';

    await sql`
      UPDATE youngs
      SET exception_unlocked = ${unlocked},
          exception_reason = ${reason},
          updated_at = NOW()
      WHERE id = ${youngId}
    `;

    return NextResponse.json({
      success: true,
      youngId,
      exceptionUnlocked: unlocked,
      exceptionReason: reason,
      message: unlocked
        ? 'Excepción habilitada: Se ha desbloqueado individualmente la generación del Informe Final para este concurrente.'
        : 'Excepción deshabilitada: Se ha restaurado la regla de validación estricta de 4 insumos.'
    });
  } catch (err: any) {
    console.error('Error alternando excepción de concurrente:', err);
    return NextResponse.json({ error: err?.message || 'Error en servidor' }, { status: 500 });
  }
}
