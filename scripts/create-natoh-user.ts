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

async function createNatohUser() {
  try {
    const email = 'natoh';
    const password = 'Federyco88!';
    
    // Verificar si el usuario ya existe
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    
    if (existing.rows.length > 0) {
      console.log('Usuario natoh ya existe. Actualizando contraseña...');
      const hashedPassword = await bcrypt.hash(password, 10);
      await sql`
        UPDATE users 
        SET password = ${hashedPassword}, role = 'ADMIN'
        WHERE email = ${email}
      `;
      console.log('✅ Contraseña actualizada para usuario natoh');
    } else {
      console.log('Creando usuario natoh...');
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await sql`
        INSERT INTO users (email, name, role, password)
        VALUES (${email}, 'Natoh', 'ADMIN', ${hashedPassword})
        RETURNING id, email, name, role
      `;
      console.log('✅ Usuario natoh creado:', result.rows[0]);
    }
    
    console.log('\n📋 Credenciales:');
    console.log('Email: natoh');
    console.log('Contraseña: Federyco88!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creando usuario natoh:', error.message);
    if (error.message?.includes('column "password" does not exist')) {
      console.error('\n⚠️  Primero ejecuta el script SQL para agregar la columna password:');
      console.error('   scripts/add-password-column.sql');
    }
    process.exit(1);
  }
}

createNatohUser();

