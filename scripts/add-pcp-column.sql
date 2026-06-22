-- ============================================================
-- Migración: Agregar columna pcp (Planificación Centrada en la Persona)
-- ============================================================

ALTER TABLE youngs ADD COLUMN IF NOT EXISTS pcp JSONB DEFAULT '{}'::jsonb;
