"use client";
import { useState, useRef, useEffect } from 'react';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  type?: 'young' | 'form' | 'general';
  maxSize?: number; // en MB
  disabled?: boolean;
  className?: string;
  onLoading?: (loading: boolean) => void;
}

export default function ImageUpload({ 
  value, 
  onChange, 
  label = 'Subir imagen',
  type = 'general',
  maxSize = 10,
  disabled = false,
  className = '',
  onLoading
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          }, 'image/jpeg', 0.7); // 0.7 es la calidad de compresión
        };
        img.onerror = () => reject(new Error('Image load failed'));
      };
      reader.onerror = () => reject(new Error('File read failed'));
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen');
      return;
    }

    // Preview local rápido
    const localReader = new FileReader();
    localReader.onloadend = () => setPreview(localReader.result as string);
    localReader.readAsDataURL(file);

    setUploading(true);
    if (onLoading) onLoading(true);
    setError('');

    try {
      console.log(`[CLIENT] Comprimiendo imagen original: ${file.size} bytes`);
      const compressedBlob = await compressImage(file);
      console.log(`[CLIENT] Imagen comprimida: ${compressedBlob.size} bytes`);

      const formData = new FormData();
      formData.append('file', compressedBlob, 'upload.jpg');
      formData.append('type', type);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok && data.url) {
        onChange(data.url);
        setError('');
      } else {
        setError(data.error || 'Error al subir la imagen');
        setPreview(value || null);
      }
    } catch (err) {
      console.error(err);
      setError('Error al procesar la imagen');
      setPreview(value || null);
    } finally {
      setUploading(false);
      if (onLoading) onLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
    setError('');
  };

  return (
    <div className={className} style={{ marginTop: 8 }}>
      {label && <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>{label}</label>}
      
      {preview ? (
        <div style={{ 
          position: 'relative', 
          display: 'inline-block',
          borderRadius: 12,
          overflow: 'hidden',
          border: '2px solid var(--border)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <img 
            src={preview} 
            alt="Preview" 
            style={{ 
              display: 'block',
              maxWidth: '100%',
              width: 140,
              height: 140,
              objectFit: 'cover',
              background: '#f8fafc'
            }} 
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                background: 'rgba(220, 38, 38, 0.9)',
                color: 'white',
                border: 'none',
                width: 24,
                height: 24,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10
              }}
              title="Eliminar"
            >
              ✕
            </button>
          )}
          {uploading && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 'bold'
            }}>
              Subiendo...
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          style={{
            width: 140,
            height: 140,
            border: '2px dashed var(--border)',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: '#f8fafc',
            transition: 'all 0.2s',
            opacity: uploading ? 0.6 : 1
          }}
        >
          <div style={{ fontSize: 24 }}>📷</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
            {uploading ? 'Subiendo...' : 'Subir Foto'}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        style={{ display: 'none' }}
      />

      {error && (
        <div style={{ marginTop: 4, color: 'var(--error)', fontSize: 11 }}>{error}</div>
      )}
    </div>
  );
}
