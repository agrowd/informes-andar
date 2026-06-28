-- Migración: Soporte para versiones editadas de Word (.docx) y original_data
-- Ejecutar en Postgres

ALTER TABLE reports ADD COLUMN IF NOT EXISTS original_data JSONB;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS edited_docx_base64 TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS edited_docx_filename VARCHAR(255);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;

-- Inicializar original_data con data actual para informes existentes
UPDATE reports SET original_data = data WHERE original_data IS NULL;
