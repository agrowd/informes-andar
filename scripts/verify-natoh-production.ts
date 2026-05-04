import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

// Cargar variables de entorno de producción
const envLocal = resolve(process.cwd(), '.env.local');
try {
  config({ path: envLocal });
} catch {
  console.log('No se encontró .env.local');
}

async function verifyNatoh() {
  try {
    console.log('🔍 Verificando usuario natoh en producción...');
    console.log('📍 POSTGRES_URL:', process.env.POSTGRES_URL ? 'Configurada' : 'NO configurada');
    
    const email = 'natoh';
    const password = 'Federyco88!';
    
    // Verificar si existe
    const existing = await sql`SELECT id, email, role, password IS NOT NULL as has_password FROM users WHERE email = ${email}`;
    
    if (existing.rows.length === 0) {
      console.log('❌ Usuario natoh NO existe en producción');
      console.log('➕ Creando usuario natoh...');
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await sql`
        INSERT INTO users (email, name, role, password)
        VALUES (${email}, 'Natoh', 'ADMIN', ${hashedPassword})
        RETURNING id, email, name, role
      `;
      console.log('✅ Usuario natoh creado:', result.rows[0]);
    } else {
      const user = existing.rows[0];
      console.log('✅ Usuario natoh existe:', {
        id: user.id,
        email: user.email,
        role: user.role,
        hasPassword: user.has_password
      });
      
      if (!user.has_password) {
        console.log('⚠️  Usuario sin contraseña. Actualizando...');
        const hashedPassword = await bcrypt.hash(password, 10);
        await sql`
          UPDATE users 
          SET password = ${hashedPassword}, role = 'ADMIN'
          WHERE email = ${email}
        `;
        console.log('✅ Contraseña actualizada');
      } else {
        // Verificar que la contraseña funcione
        const userWithPassword = await sql`SELECT password FROM users WHERE email = ${email}`;
        const isValid = await bcrypt.compare(password, userWithPassword.rows[0].password);
        if (isValid) {
          console.log('✅ Contraseña verificada correctamente');
        } else {
          console.log('⚠️  Contraseña no coincide. Actualizando...');
          const hashedPassword = await bcrypt.hash(password, 10);
          await sql`
            UPDATE users 
            SET password = ${hashedPassword}
            WHERE email = ${email}
          `;
          console.log('✅ Contraseña actualizada');
        }
      }
    }
    
    console.log('\n📋 Credenciales:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    natoh');
    console.log('🔑 Password: Federyco88!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

verifyNatoh();

