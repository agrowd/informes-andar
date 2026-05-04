# Guía: Migrar a Vercel Postgres (Base de Datos Gratuita)

## 🎯 Pasos para Configurar Vercel Postgres

### 1. Crear Base de Datos en Vercel

**Opción A: Desde el Dashboard (Recomendado)**
1. Ve a tu proyecto: https://vercel.com/agrowds-projects/informes-andar
2. Click en la pestaña **"Storage"**
3. Click en **"Create Database"**
4. Selecciona **"Postgres"**
5. Selecciona el plan **"Hobby"** (gratis)
6. Elige una región cercana (ej: `Washington, D.C.`)
7. Click en **"Create"**

Vercel creará automáticamente las variables de entorno:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

**Opción B: Desde la Terminal**
```bash
vercel storage create postgres --name informes-andar-db
```

### 2. Ejecutar el Script de Setup

Una vez creada la base de datos, ejecuta el script para crear las tablas:

**Opción A: Desde Vercel Dashboard (Más fácil)**
1. Ve a: https://vercel.com/agrowds-projects/informes-andar/storage
2. Click en tu base de datos
3. Click en la pestaña **"Query"** o **"SQL Editor"**
4. Copia y pega el contenido de `scripts/setup-postgres.sql`
5. Ejecuta el script

**Opción B: Desde tu máquina local**
```bash
# Configura las variables de entorno temporalmente
export POSTGRES_URL="tu_postgres_url_de_vercel"

# Ejecuta el script
pnpm tsx scripts/setup-postgres.ts
```

**Opción C: Desde Vercel CLI**
```bash
# Conecta a la base de datos
vercel env pull .env.local

# Ejecuta el script
pnpm tsx scripts/setup-postgres.ts
```

### 3. Actualizar Variables de Entorno en Vercel

Las variables de Postgres se agregan automáticamente cuando creas la base de datos. Verifica que estén presentes:

```bash
vercel env ls
```

Deberías ver:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

### 4. Actualizar el Código (Ya hecho ✅)

Los archivos ya están preparados:
- ✅ `src/lib/db-postgres.ts` - Conexión a Postgres
- ✅ `scripts/setup-postgres.sql` - Esquema de la base de datos
- ✅ Modelos adaptados para Postgres

### 5. Cambiar db.ts para usar Postgres

Necesitas actualizar `src/lib/db.ts` para usar Postgres en lugar de MongoDB:

```typescript
// Cambiar de:
import mongoose from 'mongoose';
// A:
export { connectToDB, sql } from './db-postgres';
```

### 6. Actualizar Modelos

Los modelos necesitan ser actualizados para usar SQL en lugar de Mongoose. Ya hay ejemplos en `src/models/User.postgres.ts`.

### 7. Hacer Deploy

```bash
vercel deploy --prod
```

## 📊 Límites del Plan Gratuito de Vercel Postgres

- **Storage**: 256 MB
- **Bandwidth**: Ilimitado
- **Conexiones**: Hasta 60 conexiones simultáneas
- **Backups**: Automáticos (7 días de retención)

## 🔄 Migración de Datos (Si tienes datos en MongoDB)

Si ya tienes datos en MongoDB que quieres migrar:

1. Exporta los datos de MongoDB a JSON
2. Crea un script de migración que lea el JSON y lo inserte en Postgres
3. Ejecuta el script

¿Necesitas ayuda con la migración de datos?

## ✅ Verificar que Funciona

Después del deploy, verifica:
1. La aplicación carga correctamente
2. Puedes crear usuarios/formularios
3. Los datos se guardan en Postgres

Para ver los datos en Vercel:
1. Ve a Storage → Tu base de datos
2. Click en "Data" o "Table Editor"
3. Verás todas las tablas y datos

## 🆘 Troubleshooting

**Error: "POSTGRES_URL no está configurada"**
- Verifica que creaste la base de datos en Vercel
- Las variables se agregan automáticamente, pero puedes verificar con `vercel env ls`

**Error: "relation does not exist"**
- Ejecuta el script `setup-postgres.sql` para crear las tablas

**Error de conexión**
- Verifica que las variables de entorno estén en Production, Preview y Development
- En Vercel: Settings → Environment Variables → asegúrate de seleccionar todos los ambientes

