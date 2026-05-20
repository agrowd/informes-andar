# ⚙️ Environment Manager

## [L] Local Development
- **URL**: `http://localhost:8000`
- **Puerto**: 8000
- **DB (Mongo)**: Localhost o MongoDB Atlas Free Tier
- **DB (Postgres)**: Neon DB via `.env.local`
- **Comando**: `npm run dev`

## [P] Producción (VPS)
- **IP**: `149.50.128.73`
- **Puerto SSH**: `5782`
- **Usuario**: `root`
- **Ruta del Proyecto**: `/srv/informes-andar`
- **SO**: Debian 12
- **Estrategia**: PM2 + Nginx
- **Dependencias Sistema**: `node`, `pm2`, `libnss3`, `libatk-bridge2.0-0`, `libcups2`, `libdrm2`, `libxkbcommon0`, `libgbm1`, `libasound2` (Playwright)
- **Variables de Entorno Necesarias**:
  - `NEXTAUTH_URL`: `https://tu-dominio.com`
  - `NEXTAUTH_SECRET`: (Mantener el actual o generar uno nuevo)
  - `POSTGRES_URL`: (URL de Neon DB proporcionada en `.env.local`)
  - `OPENAI_API_KEY`: (Key de OpenAI proporcionada en `.env.local`)
  - `PORT`: `8000` (o el que prefieras, mapeado en Nginx)

## 🛠️ Comandos de Despliegue (VPS)
1. `npm install`
2. `npx playwright install-deps`
3. `npm run build`
4. `pm2 start npm --name "informes-andar" -- start`

## 📝 Configuración (.env)
- `IA_ENABLED=true`
- `LLM_PROVIDER=openai`
- `LLM_MODEL=gpt-4o`
- `PORT=8000`
