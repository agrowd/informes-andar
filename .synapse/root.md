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

## 📂 Estructura de Carpetas
- `src/app`: Rutas y componentes de Next.js
- `src/app/_components`: Componentes compartidos
- `src/app/api`: Endpoints de la API
- `src/lib`: Utilidades, configuración de DB y esquemas
- `scripts`: Scripts de mantenimiento y setup de DB
- `tests`: Tests de contrato y funcionalidad (Vitest)
- `docs`: Documentación de referencia y archivos Word

## 🚀 Comandos Principales
- `npm run dev`: Inicia servidor en puerto 8000
- `npm run test`: Ejecuta tests con Vitest
- `npm run build`: Genera el bundle de producción
- `npm run setup:postgres`: Configura las tablas en Postgres

## 🌐 Entornos
- **Local [L]**: `http://localhost:8000`
- **Producción [P]**: VPS (`149.50.128.73:8000`) - Ver [env_manager.md](file:///.synapse/env_manager.md) para detalles de acceso.
