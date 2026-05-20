-- ============================================================
-- Migración: Soporte para tipos de informe jerárquicos
-- Ejecutar en producción: psql $DATABASE_URL < migrate-report-types.sql
-- ============================================================

-- 1. Agregar columna report_type (MENSUAL por defecto para todos los existentes)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_type VARCHAR(20) DEFAULT 'MENSUAL'
  CHECK (report_type IN ('MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'));

-- 2. Agregar columna source_report_ids (IDs de informes fuente para fusiones)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_report_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- 3. Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_young_type_periodo ON reports(young_id, report_type, periodo);

-- 4. Marcar todos los informes existentes como MENSUAL (por seguridad)
UPDATE reports SET report_type = 'MENSUAL' WHERE report_type IS NULL;
