# Configuración de Cloudinary para Subida de Imágenes (Opcional)

## Problema Resuelto

El error "read-only file system" en Vercel se ha solucionado. Ahora las imágenes se guardan como base64 directamente en la base de datos. Esto funciona, pero para mejor rendimiento puedes configurar Cloudinary.

## Solución Actual (Funciona sin configuración)

Actualmente, las imágenes se guardan como **data URLs base64** directamente en la base de datos. Esto funciona perfectamente pero:
- Las imágenes ocupan más espacio en la base de datos
- Las consultas pueden ser más lentas con muchas imágenes grandes

## Configuración Opcional de Cloudinary (Recomendado)

Para mejor rendimiento, puedes configurar Cloudinary (gratis hasta 25GB):

### Paso 1: Crear cuenta en Cloudinary

1. Ve a https://cloudinary.com/users/register/free
2. Crea una cuenta gratuita
3. Verifica tu email

### Paso 2: Obtener credenciales

1. En el Dashboard de Cloudinary, verás:
   - **Cloud Name**: Tu nombre de nube (ej: `mi-nube`)
   - **API Key**: Tu clave de API
   - **API Secret**: Tu secreto de API

### Paso 3: Crear Upload Preset

1. En el Dashboard, ve a **Settings** → **Upload**
2. Scroll hasta **Upload presets**
3. Clic en **Add upload preset**
4. Configura:
   - **Preset name**: `informes-andar` (o el que prefieras)
   - **Signing mode**: **Unsigned** (para que funcione sin autenticación en el servidor)
   - **Folder**: `informes-andar` (opcional, para organizar)
5. Guarda el preset

### Paso 4: Configurar variables de entorno en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com
2. Ve a **Settings** → **Environment Variables**
3. Agrega estas variables:

```
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_UPLOAD_PRESET=informes-andar
```

4. **NO** necesitas agregar `CLOUDINARY_API_SECRET` porque usamos un preset unsigned

### Paso 5: Redesplegar

Después de agregar las variables de entorno, Vercel automáticamente redespelgará la aplicación. Si no, puedes hacerlo manualmente.

## Verificación

Una vez configurado Cloudinary:
- Las imágenes se subirán a Cloudinary
- Obtendrás URLs públicas (ej: `https://res.cloudinary.com/...`)
- Las imágenes serán más rápidas de cargar
- No ocuparán espacio en tu base de datos

## Nota

Si no configuras Cloudinary, el sistema seguirá funcionando usando base64. La configuración es completamente opcional pero recomendada para producción.

