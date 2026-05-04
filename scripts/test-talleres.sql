-- Script de prueba para verificar que la tabla talleres funciona correctamente

-- 1. Verificar que la tabla existe y tiene la estructura correcta
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'talleres'
ORDER BY ordinal_position;

-- 2. Verificar que está vacía (esto es normal al principio)
SELECT COUNT(*) as total_talleres FROM talleres;

-- 3. Crear un taller de prueba
INSERT INTO talleres (nombre, descripcion)
VALUES ('Taller de Prueba', 'Este es un taller de prueba para verificar que la tabla funciona correctamente')
ON CONFLICT (nombre) DO NOTHING;

-- 4. Verificar que el taller se creó
SELECT * FROM talleres;

-- 5. Eliminar el taller de prueba (opcional)
-- DELETE FROM talleres WHERE nombre = 'Taller de Prueba';

