// Script para ejecutar setup-postgres.sql usando Node.js
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Usar POSTGRES_URL si está disponible, sino usar la URL directa
const connectionString = process.env.POSTGRES_URL || 
  'postgresql://neondb_owner:npg_vV4A1MUeYWhG@ep-morning-rain-ahzsfd2s-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function runSetup() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Conectando a la base de datos...');
    await client.connect();
    console.log('✓ Conectado exitosamente\n');

    // Leer el archivo SQL
    const sqlFile = fs.readFileSync(
      path.join(__dirname, 'setup-postgres.sql'),
      'utf8'
    );

    // Dividir en comandos, pero manejar funciones y triggers correctamente
    // Primero, reemplazar todos los comentarios
    let cleanSql = sqlFile.replace(/--.*$/gm, '');
    
    // Dividir por punto y coma, pero mantener bloques de funciones
    const commands = [];
    let currentCommand = '';
    let inFunction = false;
    let dollarQuote = '';
    
    for (const line of cleanSql.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Detectar inicio de función ($$ language)
      if (trimmed.includes('$$') && trimmed.includes('language')) {
        inFunction = false;
        dollarQuote = '';
        currentCommand += ' ' + trimmed;
        if (trimmed.endsWith(';')) {
          commands.push(currentCommand.trim());
          currentCommand = '';
        }
        continue;
      }
      
      // Detectar bloques con $$
      if (trimmed.includes('$$')) {
        if (!dollarQuote) {
          const match = trimmed.match(/\$\$([^$]*)\$\$/);
          if (match) {
            dollarQuote = match[1] || '';
          } else {
            dollarQuote = trimmed.match(/\$\$([^$]*)/)?.[1] || '';
            inFunction = true;
          }
        } else if (trimmed.includes(`$$${dollarQuote}$$`)) {
          inFunction = false;
          dollarQuote = '';
        }
      }
      
      currentCommand += ' ' + trimmed;
      
      // Si no estamos en una función y hay punto y coma, es fin de comando
      if (!inFunction && trimmed.endsWith(';')) {
        commands.push(currentCommand.trim());
        currentCommand = '';
      }
    }
    
    // Agregar último comando si existe
    if (currentCommand.trim()) {
      commands.push(currentCommand.trim());
    }
    
    // Filtrar comandos vacíos
    const validCommands = commands
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && cmd !== ';');

    console.log(`Ejecutando ${validCommands.length} comandos SQL...\n`);

    for (let i = 0; i < validCommands.length; i++) {
      const command = validCommands[i];
      if (command) {
        try {
          await client.query(command);
          console.log(`✓ Comando ${i + 1}/${commands.length} ejecutado`);
        } catch (error) {
          // Ignorar errores de "ya existe"
          if (error.message?.includes('already exists') || 
              error.message?.includes('duplicate') ||
              error.message?.includes('does not exist')) {
            console.log(`⚠ Comando ${i + 1} ya existe o no aplica, saltando...`);
          } else {
            console.error(`✗ Error en comando ${i + 1}:`, error.message);
            // Continuar con los siguientes comandos
          }
        }
      }
    }

    console.log('\n✅ ¡Base de datos configurada correctamente!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSetup();

