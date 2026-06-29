import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

// Cargar variables de entorno (intentar .env.local primero, luego .env)
const envLocal = resolve(process.cwd(), '.env.local');
const envFile = resolve(process.cwd(), '.env');
try {
  config({ path: envLocal });
} catch {
  config({ path: envFile });
}

async function createMartinRomero() {
  try {
    const email = 'martinromero';
    const password = 'admin123';
    const name = 'Martin Romero';
    const role = 'FACILITADOR';

    console.log(`Conectando a base de datos Postgres de Andar y comprobando usuario: ${email}...`);

    // Verificar si el usuario ya existe
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;

    if (existing.rows.length > 0) {
      console.log('El usuario Martin Romero ya existe. Actualizando contraseña y datos...');
      const hashedPassword = await bcrypt.hash(password, 10);
      await sql`
        UPDATE users
        SET password = ${hashedPassword}, role = ${role}, name = ${name}
        WHERE email = ${email}
      `;
      console.log('Usuario actualizado exitosamente.');
    } else {
      console.log('Creando usuario Martin Romero...');
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await sql`
        INSERT INTO users (email, name, role, password)
        VALUES (${email}, ${name}, ${role}, ${hashedPassword})
        RETURNING id, email, name, role
      `;
      console.log('Usuario Martin Romero creado:', result.rows[0]);
    }

    console.log('\n✅ Proceso completado exitosamente.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creando usuario:', error.message);
    process.exit(1);
  }
}

createMartinRomero();
