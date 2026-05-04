# Configuración de Talleres

## Crear la tabla de talleres en PostgreSQL (Neon)

Para habilitar la funcionalidad de gestión de talleres, necesitas ejecutar el siguiente script SQL en tu base de datos Neon.

### Pasos para Neon:

**Opción 1: Desde el Dashboard de Neon (Recomendado)**

1. Ve a [Neon Console](https://console.neon.tech) e inicia sesión
2. Selecciona tu proyecto (el que está conectado a Vercel)
3. En el menú lateral izquierdo, haz clic en **"SQL Editor"** o **"Query"**
4. Si no ves el SQL Editor, busca la pestaña **"SQL Editor"** en la parte superior
5. En el editor SQL, copia y pega el siguiente script:

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

6. Ejecuta el script haciendo clic en **"Run"** o **"Execute"** (o presiona `Ctrl+Enter` / `Cmd+Enter`)

**Opción 2: Desde Vercel (si está integrado)**

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Abre la sección **"Storage"** en el menú lateral
3. Si tienes Neon conectado, deberías ver tu base de datos Neon listada
4. Haz clic en tu base de datos Neon
5. Busca la opción **"Open in Neon Console"** o **"SQL Editor"**
6. Si no aparece, usa la Opción 1 (ir directamente a Neon Console)

**Opción 3: Usando psql o cliente SQL**

Si prefieres usar un cliente SQL local:

1. Obtén tu connection string desde Neon Console → Settings → Connection Details
2. Conecta usando psql o tu cliente SQL favorito:
   ```bash
   psql "tu-connection-string-de-neon"
   ```
3. Ejecuta el script SQL directamente

### Verificación

Después de ejecutar el script, puedes verificar que la tabla se creó correctamente ejecutando en el SQL Editor de Neon:

```sql
SELECT * FROM talleres;
```

Deberías ver una tabla vacía (o con talleres si ya los has creado).

También puedes verificar las tablas existentes con:

```sql
\dt
```

O listar todas las tablas:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Solución de problemas

**Si no encuentras el SQL Editor en Neon:**
- Asegúrate de estar en el proyecto correcto
- El SQL Editor puede estar en la parte superior como una pestaña
- Busca "SQL Editor" o "Query" en el menú lateral izquierdo

**Si el script falla:**
- Verifica que la función `update_updated_at_column()` ya existe (se crea en el script inicial de setup-postgres.sql)
- Si no existe, primero ejecuta la creación de la función desde `scripts/setup-postgres.sql`

### Uso

Una vez creada la tabla, podrás:

- Acceder a la página `/talleres` (solo ADMIN, DIRECTOR, COORDINACION)
- Crear nuevos talleres
- Editar talleres existentes
- Eliminar talleres (solo ADMIN, DIRECTOR) - siempre que no haya jóvenes asignados
- Asignar talleres a jóvenes desde la página `/youngs`

### Notas

- El campo `nombre` debe ser único
- No se puede eliminar un taller si hay jóvenes asignados a él
- Los talleres se muestran automáticamente en el selector de la página de jóvenes

