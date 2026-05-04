import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any) as any;
    
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'general'; // 'young', 'form', 'general'

    if (!file) {
      console.log('[UPLOAD] Error: No se proporcionó archivo');
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    console.log(`[UPLOAD] Recibido: ${file.name} (${file.size} bytes), tipo: ${file.type}`);

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, WebP, GIF)' }, { status: 400 });
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'El archivo es demasiado grande. Máximo 5MB' }, { status: 400 });
    }

    // Convertir File a base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    // Intentar subir a Cloudinary usando su API REST (sin necesidad de instalar paquetes)
    const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudinaryUploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    if (cloudinaryCloudName && cloudinaryUploadPreset) {
      console.log('[UPLOAD] Intentando subir a Cloudinary...');
      try {
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('file', `data:${file.type};base64,${base64}`);
        cloudinaryFormData.append('upload_preset', cloudinaryUploadPreset);
        cloudinaryFormData.append('folder', `informes-andar/${type}`);

        const cloudinaryResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
          {
            method: 'POST',
            body: cloudinaryFormData
          }
        );

        const cloudinaryData = await cloudinaryResponse.json();

        if (cloudinaryData.secure_url) {
          console.log('[UPLOAD] Éxito Cloudinary:', cloudinaryData.secure_url);
          return NextResponse.json({ 
            success: true, 
            url: cloudinaryData.secure_url,
            filename: cloudinaryData.original_filename || file.name,
            size: file.size,
            type: file.type
          });
        } else {
          throw new Error(cloudinaryData.error?.message || 'Error al subir a Cloudinary');
        }
      } catch (cloudinaryError: any) {
        console.error('Error con Cloudinary, usando base64:', cloudinaryError);
        // Continuar con base64 como fallback
      }
    }

    // Fallback: usar base64 directamente (guardar como data URL)
    console.log('[UPLOAD] Usando Fallback Base64 (URL muy larga)');
    const base64Data = `data:${file.type};base64,${base64}`;
    
    return NextResponse.json({ 
      success: true, 
      url: base64Data,
      filename: file.name,
      size: file.size,
      type: file.type
    });
  } catch (error: any) {
    console.error('Error subiendo archivo:', error);
    return NextResponse.json({ 
      error: `Error al subir el archivo: ${error?.message || 'Error desconocido'}` 
    }, { status: 500 });
  }
}

