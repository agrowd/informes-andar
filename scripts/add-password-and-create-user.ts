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

async function setupPasswordAndCreateUser() {
  try {
    console.log('🔧 Agregando columna password a la tabla users...');
    
    // Agregar columna password si no existe
    try {
      await sql`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
      `;
      console.log('✅ Columna password agregada correctamente');
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('ℹ️  La columna password ya existe');
      } else {
        throw error;
      }
    }

    // Crear índice si no existe
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `;
      console.log('✅ Índice creado correctamente');
    } catch (error: any) {
      console.log('ℹ️  Índice ya existe o error menor:', error.message);
    }

    console.log('\n👤 Creando/actualizando usuario natoh...');
    const email = 'natoh';
    const password = 'Federyco88!';
    
    // Verificar si el usuario ya existe
    const existing = await sql`SELECT id, email, role FROM users WHERE email = ${email}`;
    
    if (existing.rows.length > 0) {
      console.log('📝 Usuario natoh ya existe. Actualizando contraseña y rol...');
      const hashedPassword = await bcrypt.hash(password, 10);
      await sql`
        UPDATE users 
        SET password = ${hashedPassword}, role = 'ADMIN'
        WHERE email = ${email}
      `;
      console.log('✅ Usuario natoh actualizado correctamente');
    } else {
      console.log('➕ Creando nuevo usuario natoh...');
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await sql`
        INSERT INTO users (email, name, role, password)
        VALUES (${email}, 'Natoh', 'ADMIN', ${hashedPassword})
        RETURNING id, email, name, role
      `;
      console.log('✅ Usuario natoh creado:', result.rows[0]);
    }
    
    console.log('\n📋 Credenciales de acceso:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    natoh');
    console.log('🔑 Password: Federyco88!');
    console.log('👑 Rol:      ADMIN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nDetalles:', error);
    process.exit(1);
  }
}

setupPasswordAndCreateUser();

