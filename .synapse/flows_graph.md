# 🔄 Logic Flows

## 1. Generación de Informe
1. Usuario completa formulario en UI.
2. Guardado automático (actualmente localStorage, migrando a DB).
3. POST a `/api/generate-report`.
4. Validación de schema de entrada (AJV).
5. Envío de prompt a IA (Gemini/OpenAI).
6. Validación de schema de salida de la IA (AJV).
7. Almacenamiento en DB (Mongo/Postgres).
8. Renderizado de HTML (Nunjucks).
9. Conversión a PDF (Playwright).
10. Retorno de URLs de informe y PDF.

## 2. Flujo de Estados
`BORRADOR` → `EN_REVISION` → `CAMBIOS_SOLICITADOS` (pendiente) → `APROBADO`

## 3. Autenticación
- Login vía Email (Magic Link) o Google.
- Roles: `ADMIN`, `COORDINACION`, `FACILITADOR`, `DIRECTOR`.
