# Guía de Despliegue en Vercel

## Pasos para configurar el proyecto en Vercel

### 1. Configurar Variables de Entorno

Ve al dashboard de Vercel:
- URL: https://vercel.com/agrowds-projects/informes-andar/settings/environment-variables

O desde la terminal:
```bash
vercel env add GEMINI_API_KEY production
vercel env add MONGODB_URI production
vercel env add NEXTAUTH_SECRET production
# ... etc
```

### 2. Variables de Entorno Requeridas

**Obligatorias:**
```bash
# MongoDB
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/database

# NextAuth
NEXTAUTH_SECRET=tu_secret_secreto_aqui  # Genera uno con: openssl rand -base64 32
NEXTAUTH_URL=https://informes-andar.vercel.app  # Tu URL de producción

# Gemini (IA)
GEMINI_API_KEY=tu_api_key_de_google_ai_studio
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
LLM_TEMPERATURE=0
IA_ENABLED=true
```

**Opcionales:**
```bash
# Si usas autenticación por email
EMAIL_SERVER=smtp://usuario:password@smtp.gmail.com:587
EMAIL_FROM=noreply@tudominio.com

# Si usas Google OAuth
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret

# Otros
IA_LOCAL_ONLY=false
PORT=8000
```

### 3. Obtener API Key de Gemini

1. Ve a: https://aistudio.google.com/apikey
2. Crea una nueva API key
3. Cópiala y agrégala como variable de entorno `GEMINI_API_KEY` en Vercel

### 4. Generar NEXTAUTH_SECRET

Desde tu terminal:
```bash
openssl rand -base64 32
```

O usa cualquier generador de strings aleatorios seguros.

### 5. Deploy a Producción

**Opción A: Desde la terminal (recomendado)**
```bash
vercel deploy --prod
```

**Opción B: Desde el dashboard**
- Ve a: https://vercel.com/agrowds-projects/informes-andar
- Click en "Deployments"
- Click en "..." del último deployment
- "Promote to Production"

### 6. Verificar el Deploy

Una vez desplegado, tu aplicación estará disponible en:
- Producción: https://informes-andar.vercel.app
- Preview: https://informes-andar-j3d86pdpo-agrowds-projects.vercel.app

### 7. Configurar Dominio Personalizado (Opcional)

1. Ve a: https://vercel.com/agrowds-projects/informes-andar/settings/domains
2. Agrega tu dominio
3. Sigue las instrucciones de DNS

## Comandos Útiles

```bash
# Ver logs en tiempo real
vercel logs informes-andar.vercel.app

# Ver variables de entorno
vercel env ls

# Agregar variable de entorno
vercel env add NOMBRE_VARIABLE production

# Deploy solo preview
vercel deploy

# Deploy a producción
vercel deploy --prod

# Ver información del proyecto
vercel inspect informes-andar.vercel.app
```

## Troubleshooting

**Si el build falla:**
- Revisa los logs: `vercel logs`
- Verifica que todas las variables de entorno estén configuradas
- Asegúrate de que `pnpm-lock.yaml` esté commiteado

**Si la app no funciona:**
- Verifica que `NEXTAUTH_URL` coincida con tu dominio de producción
- Revisa que `GEMINI_API_KEY` sea válida
- Verifica que `MONGODB_URI` sea correcta y tenga acceso desde internet

