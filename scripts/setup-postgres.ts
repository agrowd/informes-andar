// Script para ejecutar el setup de Postgres
// IMPORTANTE: Este script debe ejecutarse desde el Dashboard de Vercel
// Ve a: Storage → Tu DB → Query/SQL Editor y pega el contenido de setup-postgres.sql

console.log(`
⚠️  Este script requiere ejecutarse directamente en Vercel Postgres.

Para crear las tablas:

OPCIÓN 1 (Recomendada): Desde Vercel Dashboard
1. Ve a: https://vercel.com/agrowds-projects/informes-andar/storage
2. Click en tu base de datos Postgres
3. Click en la pestaña "Query" o "SQL Editor"
4. Copia y pega el contenido de scripts/setup-postgres.sql
5. Ejecuta el script

OPCIÓN 2: Usando psql localmente
Si tienes psql instalado y las variables de entorno:
1. export POSTGRES_URL="tu_url_de_vercel"
2. psql $POSTGRES_URL -f scripts/setup-postgres.sql

El script setup-postgres.sql contiene todos los comandos SQL necesarios.
`);


