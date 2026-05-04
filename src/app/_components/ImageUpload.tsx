"use client";
import { useState, useRef } from 'react';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  type?: 'young' | 'form' | 'general';
  maxSize?: number; // en MB
  disabled?: boolean;
  className?: string;
}

export default function ImageUpload({ 
  value, 
  onChange, 
  label = 'Subir imagen',
  type = 'general',
  maxSize = 5,
  disabled = false,
  className = ''
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen');
      return;
    }

    // Validar tamaño
    if (file.size > maxSize * 1024 * 1024) {
      setError(`El archivo es demasiado grande. Máximo ${maxSize}MB`);
      return;
    }

    // Preview local
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Subir archivo
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
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
        setPreview(null);
      }
    } catch (err) {
      setError('Error al subir la imagen');
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className} style={{ marginTop: 8 }}>
      {label && <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>{label}</label>}
      
      {preview ? (
        <div style={{ 
          position: 'relative', 
          display: 'inline-block',
          borderRadius: 8,
          overflow: 'hidden',
          border: '2px solid var(--border)'
        }}>
          <img 
            src={preview} 
            alt="Preview" 
            style={{ 
              display: 'block',
              maxWidth: '100%',
              maxHeight: 300,
              objectFit: 'contain',
              background: '#f5f5f5'
            }} 
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="ga-btn"
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(220, 38, 38, 0.9)',
                color: 'white',
                border: 'none',
                padding: '6px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              ✕ Eliminar
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 8,
            padding: '24px',
            textAlign: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: disabled ? '#f5f5f5' : 'white',
            transition: 'all 0.2s',
            opacity: disabled ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!disabled && !uploading) {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.background = '#f0f7ff';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled && !uploading) {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'white';
            }
          }}
        >
          {uploading ? (
            <div>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
              <div style={{ color: 'var(--muted)' }}>Subiendo imagen...</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Haz clic para subir imagen</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                JPG, PNG, WebP o GIF (máx. {maxSize}MB)
              </div>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        style={{ display: 'none' }}
      />

      {error && (
        <div style={{
          marginTop: 8,
          padding: 8,
          background: '#fee',
          color: '#c33',
          borderRadius: 6,
          fontSize: 13
        }}>
          {error}
        </div>
      )}

      {value && !preview && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
          Imagen actual: <a href={value} target="_blank" rel="noopener noreferrer">{value}</a>
        </div>
      )}
    </div>
  );
}

