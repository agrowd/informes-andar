-- Agregar campos legajo y obra_social a la tabla youngs
-- Ejecutar este script en Neon SQL Editor

ALTER TABLE youngs 
ADD COLUMN IF NOT EXISTS legajo VARCHAR(50),
ADD COLUMN IF NOT EXISTS obra_social VARCHAR(255);

-- Verificar que se agregaron correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'youngs' 
  AND column_name IN ('legajo', 'obra_social');

