# 🚀 Cómo Usar Vercel Postgres (Base de Datos Gratuita)

## Paso 1: Crear la Base de Datos en Vercel

### Desde el Dashboard (Más Fácil):

1. **Ve a tu proyecto en Vercel:**
   - https://vercel.com/agrowds-projects/informes-andar

2. **Click en la pestaña "Storage"** (en el menú lateral)

3. **Click en "Create Database"**

4. **Selecciona "Postgres"**

5. **Elige el plan "Hobby"** (es GRATIS):
   - 256 MB de almacenamiento
   - Conexiones ilimitadas
   - Perfecto para empezar

6. **Elige una región** (ej: `Washington, D.C.` o la más cercana a ti)

7. **Click en "Create"**

✅ **¡Listo!** Vercel creará automáticamente estas variables de entorno:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL` 
- `POSTGRES_URL_NON_POOLING`

## Paso 2: Crear las Tablas en la Base de Datos

### Opción A: Desde el Dashboard de Vercel (Recomendado)

1. **Ve a Storage → Tu base de datos → Pestaña "Query" o "SQL Editor"**

2. **Abre el archivo `scripts/setup-postgres.sql`** en tu editor

3. **Copia TODO el contenido** del archivo SQL

4. **Pégalo en el editor SQL de Vercel**

5. **Click en "Run" o "Execute"**

✅ Las tablas se crearán automáticamente

### Opción B: Desde la Terminal (Si prefieres)

```bash
# 1. Descarga las variables de entorno
vercel env pull .env.local

# 2. Ejecuta el script de setup
pnpm setup:postgres
```

## Paso 3: Verificar que Funcionó

1. **En Vercel Dashboard → Storage → Tu base de datos → "Data"**
2. Deberías ver estas tablas:
   - `users`
   - `youngs`
   - `forms`
   - `reports`
   - `audit_logs`
   - `editable_texts`

## Paso 4: Actualizar el Código para Usar Postgres

El código ya está preparado. Solo necesitas:

1. **Cambiar `src/lib/db.ts`** para usar Postgres en lugar de MongoDB:

```typescript
// Reemplaza el contenido con:
export { connectToDB, sql } from './db-postgres';
```

2. **Actualizar los modelos** para usar las versiones Postgres (ya hay ejemplos)

3. **Hacer deploy:**
```bash
vercel deploy --prod
```

## ✅ Ventajas de Vercel Postgres

- ✅ **Gratis** hasta 256 MB
- ✅ **Automático** - se crea junto con tu proyecto
- ✅ **Backups automáticos** (7 días)
- ✅ **Sin configuración adicional** - las variables se agregan solas
- ✅ **Integrado** con el dashboard de Vercel

## 🔍 Ver tus Datos

En cualquier momento puedes ver tus datos:
- **Vercel Dashboard → Storage → Tu DB → Data**
- Ahí verás todas las tablas y puedes editar/ver datos directamente

## 📝 Variables de Entorno que se Crean Automáticamente

Cuando creas la base de datos, Vercel agrega estas variables:
- `POSTGRES_URL` - URL principal de conexión
- `POSTGRES_PRISMA_URL` - URL para Prisma (si lo usas)
- `POSTGRES_URL_NON_POOLING` - URL sin pooling

**No necesitas hacer nada**, ya están configuradas automáticamente.

## 🆘 Problemas Comunes

**"POSTGRES_URL no está configurada"**
- Verifica que creaste la base de datos en Vercel Storage
- Las variables se agregan automáticamente al crear la DB

**"relation does not exist"**
- Ejecuta el script `setup-postgres.sql` para crear las tablas

**¿Necesitas más espacio?**
- El plan Hobby es gratis hasta 256 MB
- Si necesitas más, puedes hacer upgrade al plan Pro ($20/mes)

## 🎉 ¡Listo!

Una vez completados estos pasos, tu aplicación usará Vercel Postgres en lugar de MongoDB, completamente gratis y sin configuración adicional.

