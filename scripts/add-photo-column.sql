-- Script para agregar columna de foto a la tabla de jóvenes

-- Agregar columna foto si no existe
ALTER TABLE youngs ADD COLUMN IF NOT EXISTS foto TEXT;

-- Crear índice para búsquedas si es necesario
-- CREATE INDEX IF NOT EXISTS idx_youngs_foto ON youngs(foto) WHERE foto IS NOT NULL;

