"use client";
import React, { useState, useEffect } from 'react';

interface UploadManualDocxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (report: any) => void;
}

export default function UploadManualDocxModal({ isOpen, onClose, onSuccess }: UploadManualDocxModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [youngs, setYoungs] = useState<any[]>([]);
  const [selectedYoungId, setSelectedYoungId] = useState<string>('');
  const [periodo, setPeriodo] = useState<string>('');
  const [facilitadorNombre, setFacilitadorNombre] = useState<string>('');
  const [loadingYoungs, setLoadingYoungs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successData, setSuccessData] = useState<any | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessData(null);
      setFile(null);
      setSelectedYoungId('');
      setPeriodo('');
      setFacilitadorNombre('');

      // Cargar lista de jóvenes para selección manual opcional
      setLoadingYoungs(true);
      fetch('/api/youngs?pageSize=150')
        .then(res => res.json())
        .then(data => {
          setYoungs(data.items || []);
        })
        .catch(err => console.error('Error cargando jóvenes para modal:', err))
        .finally(() => setLoadingYoungs(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.endsWith('.docx')) {
        setError('El archivo seleccionado debe ser un documento de Word (.docx)');
        setFile(null);
        return;
      }
      setFile(selected);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (!dropped.name.endsWith('.docx')) {
        setError('El archivo debe ser un documento de Word (.docx)');
        return;
      }
      setFile(dropped);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor seleccioná un archivo .docx para subir');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedYoungId) formData.append('youngId', selectedYoungId);
      if (periodo) formData.append('periodo', periodo);
      if (facilitadorNombre) formData.append('facilitadorNombre', facilitadorNombre);

      const res = await fetch('/api/reports/upload-manual-docx', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar el archivo Word');
      }

      setSuccessData(data.report);
      onSuccess(data.report);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado al subir el documento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 16
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        maxWidth: 580,
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Encabezado */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📤</span> Cargar Informe Trimestral (Word / .docx)
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#bfdbfe' }}>
              Subí un informe redactado a mano por el facilitador para integrarlo al sistema
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: 22,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4
            }}
          >
            ✕
          </button>
        </div>

        {/* Contenido */}
        <div style={{ padding: 24, maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
          {successData ? (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#166534', fontSize: 20, fontWeight: 700 }}>
                ¡Informe cargado e interpretado con éxito!
              </h3>
              <p style={{ color: '#475569', fontSize: 14, marginBottom: 20 }}>
                El archivo Word se almacenó y procesó correctamente. Ya está disponible para edición y para la futura fusión en el Informe Final.
              </p>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 16,
                textAlign: 'left',
                marginBottom: 24
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11, display: 'block', fontWeight: 600 }}>CONCURRENTE</span>
                    <strong style={{ color: '#1e293b' }}>{successData.jovenNombre}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11, display: 'block', fontWeight: 600 }}>GRUPO / TALLER</span>
                    <span className="ga-badge" style={{ marginTop: 2 }}>{successData.grupo || 'General'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11, display: 'block', fontWeight: 600 }}>FACILITADOR RESPONSABLE</span>
                    <strong style={{ color: '#1e293b' }}>{successData.facilitadorNombre}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11, display: 'block', fontWeight: 600 }}>PERÍODO</span>
                    <strong style={{ color: '#2563eb' }}>{successData.periodo}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <a
                  href={`/reports/${successData.id}`}
                  className="ga-btn primary"
                  style={{ padding: '9px 18px', fontWeight: 700, textDecoration: 'none' }}
                >
                  Ver y Revisar Informe →
                </a>
                <a
                  href={`/api/reports/${successData.id}/.docx`}
                  className="ga-btn secondary"
                  style={{ padding: '9px 18px', fontWeight: 600, textDecoration: 'none' }}
                >
                  📥 Descargar Word
                </a>
                <button
                  type="button"
                  className="ga-btn"
                  onClick={onClose}
                  style={{ padding: '9px 18px' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{
                  padding: '12px 16px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  color: '#991b1b',
                  fontSize: 13,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Zona Drag & Drop */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${isDragOver ? '#2563eb' : '#cbd5e1'}`,
                  borderRadius: 12,
                  padding: '28px 16px',
                  textAlign: 'center',
                  background: isDragOver ? '#eff6ff' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                  marginBottom: 20
                }}
                onClick={() => document.getElementById('manual-docx-input')?.click()}
              >
                <input
                  type="file"
                  id="manual-docx-input"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                {file ? (
                  <div>
                    <strong style={{ color: '#1e3a8a', fontSize: 14 }}>{file.name}</strong>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      {(file.size / 1024).toFixed(1)} KB · Click para cambiar archivo
                    </div>
                  </div>
                ) : (
                  <div>
                    <strong style={{ color: '#334155', fontSize: 14 }}>
                      Arrastrá el archivo Word (.docx) aquí o hacé click para buscar
                    </strong>
                    <p style={{ color: '#64748b', fontSize: 12, margin: '6px 0 0 0' }}>
                      Admite informes trimestrales creados a mano por los facilitadores
                    </p>
                  </div>
                )}
              </div>

              {/* Campos opcionales de confirmación */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⚙️</span> Opciones de asignación (Opcional - se autodetecta del texto si se deja vacío)
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Concurrente / Joven:
                    </label>
                    <select
                      className="ga-select"
                      value={selectedYoungId}
                      onChange={(e) => setSelectedYoungId(e.target.value)}
                      style={{ width: '100%', fontSize: 13, padding: '8px 10px', borderRadius: 8 }}
                      disabled={loadingYoungs || uploading}
                    >
                      <option value="">🔍 Detectar automáticamente por el nombre en el Word</option>
                      {youngs.map(y => (
                        <option key={y.id} value={y.id}>
                          {y.nombre_completo || y.nombreCompleto} ({y.taller || 'Sin taller'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                        Período:
                      </label>
                      <input
                        type="text"
                        className="ga-input"
                        placeholder="Ej: 2026-04 – 2026-06 (autodetectar)"
                        value={periodo}
                        onChange={(e) => setPeriodo(e.target.value)}
                        style={{ width: '100%', fontSize: 13, padding: '8px 10px', borderRadius: 8 }}
                        disabled={uploading}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                        Facilitador Responsable:
                      </label>
                      <input
                        type="text"
                        className="ga-input"
                        placeholder="Ej: Lemuel Sola (autodetectar)"
                        value={facilitadorNombre}
                        onChange={(e) => setFacilitadorNombre(e.target.value)}
                        style={{ width: '100%', fontSize: 13, padding: '8px 10px', borderRadius: 8 }}
                        disabled={uploading}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  className="ga-btn secondary"
                  onClick={onClose}
                  disabled={uploading}
                  style={{ padding: '9px 18px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="ga-btn primary"
                  disabled={!file || uploading}
                  style={{
                    padding: '9px 20px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  {uploading ? (
                    <>
                      <span>⏳</span> Interpretando documento Word...
                    </>
                  ) : (
                    <>
                      <span>📥</span> Guardar e Importar Informe
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
