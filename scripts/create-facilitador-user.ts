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

async function createFacilitadorUser() {
  try {
    const email = 'facilitador@andar.com';
    const password = 'Facilitador123!';
    const name = 'Facilitador Test';
    const role = 'FACILITADOR';

    // Verificar si el usuario ya existe
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;

    if (existing.rows.length > 0) {
      console.log('Usuario facilitador ya existe. Actualizando...');
      const hashedPassword = await bcrypt.hash(password, 10);
      await sql`
        UPDATE users
        SET password = ${hashedPassword}, role = ${role}, name = ${name}
        WHERE email = ${email}
      `;
      console.log('Usuario facilitador actualizado');
    } else {
      console.log('Creando usuario facilitador...');
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await sql`
        INSERT INTO users (email, name, role, password)
        VALUES (${email}, ${name}, ${role}, ${hashedPassword})
        RETURNING id, email, name, role
      `;
      console.log('Usuario facilitador creado:', result.rows[0]);
    }

    console.log('\n✅ Usuario facilitador configurado correctamente');
    console.log('\n📋 Credenciales:');
    console.log('Email:', email);
    console.log('Contraseña:', password);
    console.log('Rol:', role);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creando usuario facilitador:', error.message);
    if (error.message?.includes('column "password" does not exist')) {
      console.error('\n⚠️  Primero ejecuta el script SQL para agregar la columna password:');
      console.error('   scripts/add-password-column.sql');
    }
    process.exit(1);
  }
}

createFacilitadorUser();

