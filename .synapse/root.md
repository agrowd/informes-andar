# 🌳 Project Root: Sistema de Formularios e Informes Evolutivos (Granja Andar)

## 📌 Propósito
Sistema para la gestión de formularios e informes evolutivos de los concurrentes de Granja Andar, utilizando IA para la generación de reportes narrativos basados en datos estructurados.

## 🏗️ Arquitectura
- **Frontend/Backend**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Base de Datos**: 
  - MongoDB Atlas (Mongoose) - Primaria actual
  - Vercel Postgres (Neon) - En transición/soporte híbrido
- **Autenticación**: NextAuth.js (Google & Email)
- **IA**: Google Generative AI (Gemini 1.5 Flash) / OpenAI (GPT-4o-mini)
- **Validación**: AJV (JSON Schema)
- **Reportes**: 
  - Nunjucks (Templates)
  - Playwright (HTML to PDF conversion)
  - Mammoth/Docx (Word manipulation)

## 📂 Estructura de Carpetas y Módulos
- `src/app`: Rutas y vistas de Next.js (`/`, `/forms`, `/reports`, `/final-reports`, `/youngs`, `/talleres`, `/users`, `/audit`)
- `src/app/_components`: Componentes compartidos y modales (asistente de importación, upload Word con IA, generación final)
- `src/app/api`: Endpoints REST (`/api/reports/final`, `/api/reports/upload-manual-docx`, etc.)
- `src/lib`: Utilidades, generadores con IA (`quarterlyGenerator.ts`, `finalReportGenerator.ts`), esquemas y DB
- `scripts`: Scripts de mantenimiento y migraciones de DB
- `tests`: Tests de contrato y funcionalidad (Vitest)
- `docs`: Documentación de referencia y archivos institucionales Word/Excel

## 🚀 Comandos Principales
- `npm run dev`: Inicia servidor en puerto 8000
- `npm run test`: Ejecuta tests con Vitest
- `npm run build`: Genera el bundle de producción
- `npm run setup:postgres`: Configura las tablas en Postgres

## 🌐 Entornos
- **Local [L]**: `http://localhost:8000`
- **Producción [P]**: VPS (`149.50.128.73:8000`) - Ver [env_manager.md](file:///.synapse/env_manager.md) para detalles de acceso.
