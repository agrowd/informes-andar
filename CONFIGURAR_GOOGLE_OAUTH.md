# Configuración de Google OAuth para Login

## Pasos para configurar Google OAuth

### 1. Crear un proyecto en Google Cloud Console

1. Ve a: https://console.cloud.google.com/
2. Crea un nuevo proyecto o selecciona uno existente
3. Nombre del proyecto: "Informes Andar" (o el que prefieras)

### 2. Habilitar Google+ API

1. En el menú lateral, ve a **APIs & Services** → **Library**
2. Busca "Google+ API" o "Google Identity"
3. Haz clic en **Enable**

### 3. Configurar pantalla de consentimiento OAuth

1. Ve a **APIs & Services** → **OAuth consent screen**
2. Selecciona **External** (a menos que tengas cuenta de Google Workspace)
3. Completa la información:
   - **App name**: Sistema de Informes Andar
   - **User support email**: tu email
   - **Developer contact information**: tu email
4. Haz clic en **Save and Continue**
5. En **Scopes**, haz clic en **Save and Continue** (no necesitas agregar scopes adicionales)
6. En **Test users** (si es necesario), agrega los emails de prueba
7. Haz clic en **Save and Continue**

### 4. Crear credenciales OAuth 2.0

1. Ve a **APIs & Services** → **Credentials**
2. Haz clic en **Create Credentials** → **OAuth client ID**
3. Selecciona **Web application**
4. Completa:
   - **Name**: Informes Andar Web Client
   
   - **Authorized JavaScript origins** (SOLO el dominio, SIN rutas):
     - `http://localhost:8000` (para desarrollo local)
     - `https://informes-andar.vercel.app` (tu dominio de producción)
     - ⚠️ **IMPORTANTE**: Solo el dominio, sin `/api/auth/callback/google`
   
   - **Authorized redirect URIs** (URL completa con la ruta):
     - `http://localhost:8000/api/auth/callback/google`
     - `https://informes-andar.vercel.app/api/auth/callback/google`
     - `https://informes-andar-[hash].vercel.app/api/auth/callback/google`
     - ⚠️ **IMPORTANTE**: Aquí SÍ va la ruta completa `/api/auth/callback/google`
   
5. Haz clic en **Create**
6. **Copia el Client ID y Client Secret** (los necesitarás)

**Resumen:**
- **JavaScript origins**: Solo dominio (ej: `https://informes-andar.vercel.app`)
- **Redirect URIs**: Dominio + ruta completa (ej: `https://informes-andar.vercel.app/api/auth/callback/google`)

### 5. Agregar variables de entorno en Vercel

**Opción A: Desde la terminal**
```bash
vercel env add GOOGLE_CLIENT_ID production
# Pega tu Client ID cuando te lo pida

vercel env add GOOGLE_CLIENT_SECRET production
# Pega tu Client Secret cuando te lo pida
```

**Opción B: Desde el Dashboard de Vercel**
1. Ve a: https://vercel.com/agrowds-projects/informes-andar/settings/environment-variables
2. Haz clic en **Add New**
3. Nombre: `GOOGLE_CLIENT_ID`
4. Valor: tu Client ID de Google
5. Selecciona: Production, Preview, Development
6. Haz clic en **Save**
7. Repite para `GOOGLE_CLIENT_SECRET`

### 6. Para desarrollo local

Agrega estas variables a tu archivo `.env.local`:
```bash
GOOGLE_CLIENT_ID=tu_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
```

### 7. Verificar que funciona

1. Haz deploy: `vercel deploy --prod`
2. Ve a tu aplicación en producción
3. Haz clic en "Iniciar sesión con Google"
4. Deberías ver la pantalla de consentimiento de Google
5. Después de autorizar, deberías estar logueado

## Notas importantes

- El **Client ID** y **Client Secret** son sensibles, nunca los compartas públicamente
- Los redirect URIs deben coincidir exactamente con las URLs de tu aplicación
- Si cambias el dominio, actualiza los Authorized redirect URIs en Google Cloud Console
- Para producción, asegúrate de que el proyecto esté en modo "Production" en OAuth consent screen (requiere verificación de Google si es público)

## Troubleshooting

**Error: "redirect_uri_mismatch"**
- Verifica que las URLs en Google Cloud Console coincidan exactamente con las de tu app
- Incluye el protocolo (http/https) y la ruta completa `/api/auth/callback/google`

**Error: "access_denied"**
- Verifica que el email esté en la lista de test users (si la app está en modo Testing)
- O configura la app en modo Production

**El botón de Google no aparece**
- Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén configurados
- Haz un nuevo deploy después de agregar las variables

