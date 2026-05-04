-- Agregar columna password a la tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Crear índice para búsquedas por email (ya existe unique, pero por si acaso)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

