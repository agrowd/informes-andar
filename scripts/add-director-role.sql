-- Script para agregar rol DIRECTOR y actualizar usuarios existentes

-- 1. Agregar DIRECTOR al enum de roles en la tabla users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'DIRECTOR', 'COORDINACION', 'FACILITADOR'));

-- 2. Crear usuario Natoh como ADMIN (ajusta el email según sea necesario)
-- IMPORTANTE: Cambia el email por el email real de Natoh
INSERT INTO users (email, name, role) 
VALUES ('natoh@ejemplo.com', 'Natoh', 'ADMIN')
ON CONFLICT (email) DO UPDATE SET role = 'ADMIN', name = 'Natoh';

-- 3. Si ya existe un usuario con email específico, actualizarlo a ADMIN
-- UPDATE users SET role = 'ADMIN' WHERE email = 'natoh@ejemplo.com';

