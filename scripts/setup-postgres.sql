-- Script de creación de tablas para Vercel Postgres
-- Ejecutar este script una vez después de crear la base de datos en Vercel

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'FACILITADOR' CHECK (role IN ('ADMIN', 'COORDINACION', 'FACILITADOR')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de jóvenes
CREATE TABLE IF NOT EXISTS youngs (
  id SERIAL PRIMARY KEY,
  nombre_completo VARCHAR(255) NOT NULL,
  dni VARCHAR(50),
  taller VARCHAR(255),
  fecha_nacimiento DATE,
  circulo_apoyo JSONB DEFAULT '[]'::jsonb,
  assigned_facilitators INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de formularios
CREATE TABLE IF NOT EXISTS forms (
  id SERIAL PRIMARY KEY,
  young_id INTEGER REFERENCES youngs(id) ON DELETE SET NULL,
  periodo VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR', 'EN_REVISION', 'APROBADO')),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de informes
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  young_id INTEGER REFERENCES youngs(id) ON DELETE CASCADE,
  form_id INTEGER REFERENCES forms(id) ON DELETE SET NULL,
  periodo VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  html TEXT,
  pdf_url VARCHAR(500),
  trazabilidad JSONB,
  status VARCHAR(50) DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR', 'EN_REVISION', 'CAMBIOS_SOLICITADOS', 'APROBADO')),
  report_type VARCHAR(20) DEFAULT 'MENSUAL' CHECK (report_type IN ('MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL')),
  source_report_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  version INTEGER DEFAULT 1,
  generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  comments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de logs de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('USER', 'YOUNG', 'FORM', 'REPORT')),
  entity_id INTEGER NOT NULL,
  action VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  meta JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de textos editables
CREATE TABLE IF NOT EXISTS editable_texts (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  text TEXT NOT NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_forms_young_id ON forms(young_id);
CREATE INDEX IF NOT EXISTS idx_forms_created_by ON forms(created_by);
CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);
CREATE INDEX IF NOT EXISTS idx_reports_young_id ON reports(young_id);
CREATE INDEX IF NOT EXISTS idx_reports_form_id ON reports(form_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_young_type_periodo ON reports(young_id, report_type, periodo);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_youngs_assigned_facilitators ON youngs USING GIN(assigned_facilitators);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_youngs_updated_at BEFORE UPDATE ON youngs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_editable_texts_updated_at BEFORE UPDATE ON editable_texts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

