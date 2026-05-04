# Configuración Rápida en Vercel

## ✅ Variables ya configuradas

Tu proyecto ya tiene estas variables en Vercel:
- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `IA_ENABLED`
- `LLM_PROVIDER`
- `LLM_MODEL`
- `LLM_TEMPERATURE`
- `OPENAI_API_KEY`
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`

## 🔧 Pasos para usar Gemini

### 1. Agregar API Key de Gemini

**Opción A: Desde la terminal**
```bash
vercel env add GEMINI_API_KEY production
```
Cuando te pregunte, pega tu API key de Google AI Studio.

**Opción B: Desde el Dashboard**
1. Ve a: https://vercel.com/agrowds-projects/informes-andar/settings/environment-variables
2. Click en "Add New"
3. Nombre: `GEMINI_API_KEY`
4. Valor: tu API key (obtenerla en https://aistudio.google.com/apikey)
5. Selecciona: Production, Preview, Development
6. Click "Save"

### 2. Actualizar LLM_PROVIDER a Gemini

**Opción A: Desde la terminal**
```bash
vercel env rm LLM_PROVIDER production
vercel env add LLM_PROVIDER production
# Cuando te pregunte, escribe: gemini
```

**Opción B: Desde el Dashboard**
1. Ve a las variables de entorno
2. Busca `LLM_PROVIDER`
3. Click en "Edit"
4. Cambia el valor a: `gemini`
5. Guarda

### 3. Actualizar LLM_MODEL (opcional)

Si quieres usar `gemini-1.5-flash`:
```bash
vercel env rm LLM_MODEL production
vercel env add LLM_MODEL production
# Cuando te pregunte, escribe: gemini-1.5-flash
```

### 4. Obtener API Key de Gemini

1. Ve a: https://aistudio.google.com/apikey
2. Si no tienes cuenta, créala con tu cuenta de Google
3. Click en "Create API Key"
4. Selecciona un proyecto o crea uno nuevo
5. Copia la API key (empieza con `AIza...`)

### 5. Hacer Deploy a Producción

```bash
vercel deploy --prod
```

Esto desplegará los cambios y aplicará las nuevas variables de entorno.

## 📋 Resumen de Variables Necesarias

Para usar Gemini, necesitas tener configurado:
```bash
GEMINI_API_KEY=AIza...tu_key_aqui
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash  # o gemini-1.5-pro
LLM_TEMPERATURE=0
IA_ENABLED=true
```

## 🚀 Verificar que Funciona

Una vez desplegado:
1. Ve a: https://informes-andar.vercel.app
2. Intenta generar un informe
3. Si funciona, verás que usa Gemini en lugar de OpenAI

## 🔍 Ver Logs si hay Problemas

```bash
vercel logs informes-andar.vercel.app --follow
```

