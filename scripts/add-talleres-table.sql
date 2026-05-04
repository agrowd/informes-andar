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

