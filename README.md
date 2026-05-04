## Sistema de Formularios e Informes Evolutivos (Granja Andar)

### Stack
- Next.js 14 (App Router) + TypeScript
- MongoDB Atlas (Mongoose)
- AJV (+ ajv-formats)
- Nunjucks (fallback determinístico)
- Playwright (HTML → PDF)
- NextAuth (email/Google)
- Vitest (tests de contrato)

### Scripts (puerto 8000 obligatorio)
```json
{
  "dev": "next dev -p 8000",
  "build": "next build",
  "start": "next start -p 8000",
  "test": "vitest run"
}
```

### Variables de entorno (.env.example)
Fede crea/edita los .env manualmente con Notepad. No se crean ni modifican `.env*` automáticamente.

```bash
IA_ENABLED=true
IA_LOCAL_ONLY=false
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
LLM_TEMPERATURE=0
GEMINI_API_KEY=tu_api_key_aqui
# O si usas OpenAI:
# LLM_PROVIDER=openai
# LLM_MODEL=gpt-4o-mini
# OPENAI_API_KEY=tu_api_key_aqui
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:8000
PORT=8000
```

**Proveedores de IA soportados:**
- `gemini` (recomendado): Usa `GEMINI_API_KEY` y modelos como `gemini-1.5-flash`, `gemini-1.5-pro`
- `openai`: Usa `OPENAI_API_KEY` y modelos como `gpt-4o-mini`, `gpt-4`

### Flujo funcional
- Borrador → Revisión Coordinación → Aprobado → PDF/descarga
- Auditoría (quién/fecha/versión) y versionado por período

### API
- POST `/api/generate-report`: recibe JSON del formulario (valida `form.schema.json`), genera informe (IA o fallback), valida `report.schema.json`, renderiza HTML y PDF.

### Comandos
- pnpm install
- pnpm dev (http://localhost:8000)
- pnpm build && pnpm start
- pnpm test

### Material de referencia
- `docs/preguntas_para_el_informe_evolutivo.docx`
- `docs/Celis_Analia_Informe_evolutivo.docx`


