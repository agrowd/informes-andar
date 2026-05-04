# Agregar campos Legajo y Obra Social a la tabla `youngs`

Este script agrega los campos `legajo` y `obra_social` a la tabla de jóvenes en la base de datos.

## Instrucciones para Neon (Vercel)

1. **Accede al Neon Console:**
   - Ve a [console.neon.tech](https://console.neon.tech)
   - Inicia sesión con tu cuenta

2. **Selecciona tu proyecto:**
   - En el dashboard, selecciona el proyecto correspondiente a `informes-andar`

3. **Abre el SQL Editor:**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - O haz clic en el botón **"New query"** si ya estás en el SQL Editor

4. **Copia y pega el siguiente script:**

```sql
-- Agregar campos legajo y obra_social a la tabla youngs
ALTER TABLE youngs 
ADD COLUMN IF NOT EXISTS legajo VARCHAR(50),
ADD COLUMN IF NOT EXISTS obra_social VARCHAR(255);
```

5. **Ejecuta el script:**
   - Haz clic en el botón **"Run"** (o presiona `Ctrl+Enter` / `Cmd+Enter`)
   - Deberías ver un mensaje de éxito: `Success. No rows returned`

6. **Verifica que se agregaron correctamente:**

Ejecuta esta consulta para verificar:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'youngs' 
  AND column_name IN ('legajo', 'obra_social');
```

Deberías ver dos filas:
- `legajo` | `character varying` | `YES`
- `obra_social` | `character varying` | `YES`

## Notas

- Los campos son opcionales (pueden ser `NULL`)
- El campo `legajo` tiene un máximo de 50 caracteres
- El campo `obra_social` tiene un máximo de 255 caracteres
- Si los campos ya existen, el script no fallará gracias a `IF NOT EXISTS`

## Prueba de inserción

Después de ejecutar el script, puedes probar insertando un registro de prueba:

```sql
-- Actualizar un joven existente con legajo y obra social (reemplaza el ID)
UPDATE youngs 
SET legajo = '12345', obra_social = 'OSDE'
WHERE id = 1;

-- Verificar que se guardó correctamente
SELECT id, nombre_completo, legajo, obra_social 
FROM youngs 
WHERE id = 1;
```

