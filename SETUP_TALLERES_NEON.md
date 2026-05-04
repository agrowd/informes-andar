# Guía Paso a Paso: Crear Tabla de Talleres en Neon

## 📋 Resumen

Esta guía te ayudará a ejecutar el script SQL para crear la tabla de talleres en tu base de datos Neon conectada a Vercel.

---

## 🚀 Método 1: Desde Neon Console (Más Fácil)

### Paso 1: Acceder a Neon Console

1. Abre tu navegador y ve a: **https://console.neon.tech**
2. Inicia sesión con tu cuenta de Neon (o la cuenta que usaste para conectar Neon a Vercel)

### Paso 2: Seleccionar tu Proyecto

1. En el dashboard de Neon, verás una lista de tus proyectos
2. Haz clic en el proyecto que está conectado a tu aplicación de Vercel
   - Si no estás seguro, revisa el nombre del proyecto o la fecha de creación

### Paso 3: Abrir el SQL Editor

1. En el menú lateral izquierdo, busca y haz clic en **"SQL Editor"**
   - También puede aparecer como **"Query"** o **"SQL"** en la parte superior
2. Si no lo ves, busca un ícono de terminal o código SQL en el menú

### Paso 4: Ejecutar el Script

1. En el editor SQL que se abre, verás un área de texto grande
2. **Copia y pega** el siguiente script completo:

```sql
-- Agregar tabla de talleres
CREATE TABLE IF NOT EXISTS talleres (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL UNIQUE,
  descripcion TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_talleres_nombre ON talleres(nombre);

-- Trigger para updated_at
CREATE TRIGGER update_talleres_updated_at BEFORE UPDATE ON talleres
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

3. Haz clic en el botón **"Run"** o **"Execute"** (o presiona `Ctrl+Enter` en Windows/Linux o `Cmd+Enter` en Mac)
4. Deberías ver un mensaje de éxito como: `"Success"` o `"Query executed successfully"`

### Paso 5: Verificar

Ejecuta esta consulta para verificar que la tabla se creó:

```sql
SELECT * FROM talleres;
```

Deberías ver una tabla vacía (sin filas, solo los encabezados de columnas).

---

## 🔄 Método 2: Desde Vercel (Si está integrado)

### Paso 1: Acceder a Vercel

1. Ve a: **https://vercel.com/dashboard**
2. Inicia sesión y selecciona tu proyecto

### Paso 2: Abrir Storage

1. En el menú lateral izquierdo, busca **"Storage"**
2. Haz clic en **"Storage"**

### Paso 3: Encontrar Neon

1. En la lista de bases de datos, busca tu base de datos Neon
2. Haz clic en ella

### Paso 4: Abrir SQL Editor

1. Busca un botón o enlace que diga **"Open in Neon Console"** o **"SQL Editor"**
2. Si no aparece, usa el **Método 1** (ir directamente a Neon Console)
3. Sigue los pasos 3-5 del Método 1

---

## 🛠️ Método 3: Usando un Cliente SQL (Avanzado)

Si prefieres usar un cliente SQL como DBeaver, pgAdmin, o la línea de comandos:

### Paso 1: Obtener Connection String

1. Ve a Neon Console → Tu Proyecto → **Settings** → **Connection Details**
2. Copia el **Connection String** (el que dice "postgresql://...")

### Paso 2: Conectar

**Opción A: Línea de comandos (psql)**
```bash
psql "tu-connection-string-aqui"
```

**Opción B: Cliente gráfico**
- Abre tu cliente SQL favorito (DBeaver, pgAdmin, TablePlus, etc.)
- Conecta usando el connection string de Neon

### Paso 3: Ejecutar Script

1. Abre el archivo `scripts/add-talleres-table.sql` en tu editor
2. Copia todo el contenido
3. Ejecútalo en tu cliente SQL

---

## ✅ Verificación Final

Después de ejecutar el script, verifica que todo funcionó:

### Verificar la Estructura de la Tabla

```sql
-- Ver la estructura de la tabla (si estás en psql)
\d talleres

-- O en SQL estándar (funciona en Neon SQL Editor):
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'talleres'
ORDER BY ordinal_position;
```

Deberías ver las columnas: `id`, `nombre`, `descripcion`, `created_by`, `created_at`, `updated_at`

### Verificar que la Tabla Está Vacía (Esto es Normal)

```sql
-- Esto debería devolver 0 filas (tabla vacía)
SELECT * FROM talleres;
```

**⚠️ IMPORTANTE:** Si la consulta `SELECT * FROM talleres;` no devuelve nada, **¡ES CORRECTO!** Una tabla vacía no muestra filas, solo los encabezados de columnas (o nada si está completamente vacía).

### Crear un Taller de Prueba

Para verificar que todo funciona, crea un taller de prueba:

```sql
INSERT INTO talleres (nombre, descripcion)
VALUES ('Taller de Prueba', 'Este es un taller de prueba para verificar que la tabla funciona correctamente');
```

Luego verifica que se creó:

```sql
SELECT * FROM talleres;
```

Ahora deberías ver 1 fila con el taller de prueba.

### Verificar Todas las Tablas

Para ver todas las tablas en tu base de datos:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Deberías ver `talleres` en la lista junto con `users`, `youngs`, `forms`, `reports`, etc.

---

## 🐛 Solución de Problemas

### Error: "function update_updated_at_column() does not exist"

**Solución:** Primero necesitas crear la función. Ejecuta esto antes del script de talleres:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### Error: "relation 'users' does not exist"

**Solución:** Asegúrate de haber ejecutado primero el script `setup-postgres.sql` que crea todas las tablas base.

### No encuentro el SQL Editor en Neon

**Solución:**
- Asegúrate de estar en el proyecto correcto
- El SQL Editor puede estar en la parte superior como una pestaña
- Busca "SQL Editor", "Query", o un ícono de terminal/código
- Si usas Neon desde Vercel, puede que necesites ir directamente a console.neon.tech

### La tabla ya existe

**Solución:** El script usa `CREATE TABLE IF NOT EXISTS`, así que es seguro ejecutarlo varias veces. Si quieres recrearla:

```sql
DROP TABLE IF EXISTS talleres CASCADE;
-- Luego ejecuta el script de creación nuevamente
```

---

## 📝 Notas Importantes

- ✅ El script es **idempotente** (puedes ejecutarlo varias veces sin problemas)
- ✅ La tabla se crea con todas las restricciones necesarias
- ✅ El trigger se crea automáticamente para actualizar `updated_at`
- ⚠️ No elimines la tabla si ya tienes talleres creados
- ⚠️ El campo `nombre` debe ser único (no puedes tener dos talleres con el mismo nombre)

---

## 🎉 ¡Listo!

Una vez ejecutado el script, podrás:

- ✅ Acceder a `/talleres` en tu aplicación (solo ADMIN, DIRECTOR, COORDINACION)
- ✅ Crear nuevos talleres desde la interfaz
- ✅ Asignar talleres a jóvenes desde `/youngs`
- ✅ Editar y eliminar talleres (con las restricciones de permisos)

**¿Necesitas ayuda?** Revisa los logs de Vercel o los mensajes de error en Neon Console para más detalles.

