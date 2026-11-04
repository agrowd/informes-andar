"use client";
import React, { useState, useEffect } from 'react';
import { useActiveCycle } from '@/lib/cycleState';

interface UploadExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  initialYoungId?: string;
  initialFile?: File | null;
  targetBlockTitle?: string;
}

export default function UploadExcelModal({
  isOpen,
  onClose,
  onSuccess,
  initialYoungId,
  initialFile,
  targetBlockTitle
}: UploadExcelModalProps) {
  const { activeYear } = useActiveCycle();
  const [file, setFile] = useState<File | null>(null);
  const [youngs, setYoungs] = useState<any[]>([]);
  const [selectedYoungId, setSelectedYoungId] = useState<string>('');
  const [loadingYoungs, setLoadingYoungs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successData, setSuccessData] = useState<any | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessData(null);
      setFile(initialFile || null);
      setSelectedYoungId(initialYoungId || '');

      setLoadingYoungs(true);
      fetch('/api/youngs?pageSize=150')
        .then(res => res.json())
        .then(data => {
          setYoungs(data.items || []);
        })
        .catch(err => console.error('Error cargando jóvenes para modal de Excel:', err))
        .finally(() => setLoadingYoungs(false));
    }
  }, [isOpen, initialYoungId, initialFile]);

  if (!isOpen) return null;

  const validateAndSetFile = (f: File) => {
    const isExcel = f.name.endsWith('.xlsx') || f.name.endsWith('.xls');
    if (!isExcel) {
      setError('El archivo seleccionado debe ser una planilla de Excel (.xlsx o .xls)');
      setFile(null);
      return false;
    }
    setFile(f);
    setError('');
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor seleccioná o arrastrá un archivo Excel (.xlsx) para subir');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedYoungId) formData.append('youngId', selectedYoungId);
      formData.append('year', activeYear);

      const res = await fetch('/api/youngs/import-excel', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la planilla Excel');
      }

      setSuccessData(data);
      onSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al importar la planilla Excel');
    } finally {
      setUploading(false);
    }
  };

  const selectedYoung = youngs.find(y => String(y.id) === String(selectedYoungId));

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
          background: 'linear-gradient(135deg, #065f46, #059669)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📊</span> Cargar Planilla Excel Mensual {targetBlockTitle ? `(${targetBlockTitle})` : ''}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#a7f3d0' }}>
              Arrastrá y soltá directamente el archivo Excel (.xlsx) o seleccionalo
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
                ¡Planilla Excel Importada con Éxito!
              </h3>
              <p style={{ color: '#475569', fontSize: 14, marginBottom: 20 }}>
                {successData.message || 'Los formularios mensuales y cuadrículas se procesaron y guardaron correctamente.'}
              </p>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  type="button"
                  className="ga-btn primary"
                  onClick={onClose}
                  style={{ padding: '9px 24px', fontWeight: 700 }}
                >
                  Entendido / Continuar
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

              {/* Zona Drag & Drop Gigante */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                style={{
                  border: `3px dashed ${isDragOver ? '#059669' : '#94a3b8'}`,
                  borderRadius: 14,
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: isDragOver ? '#ecfdf5' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                  marginBottom: 20,
                  boxShadow: isDragOver ? '0 0 0 4px rgba(16, 185, 129, 0.2)' : 'none'
                }}
                onClick={() => document.getElementById('excel-modal-file-input')?.click()}
              >
                <input
                  type="file"
                  id="excel-modal-file-input"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <div style={{ fontSize: 44, marginBottom: 10 }}>📊</div>
                {file ? (
                  <div>
                    <strong style={{ color: '#065f46', fontSize: 15, display: 'block', wordBreak: 'break-all' }}>
                      {file.name}
                    </strong>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                      {(file.size / 1024).toFixed(1)} KB · Hacé click o arrastrá otro para cambiar
                    </div>
                  </div>
                ) : (
                  <div>
                    <strong style={{ color: '#1e293b', fontSize: 15, display: 'block', marginBottom: 4 }}>
                      ⚡ Arrastrá el archivo Excel (.xlsx) directamente aquí
                    </strong>
                    <p style={{ color: '#475569', fontSize: 13, margin: '6px 0 0 0' }}>
                      O hacé click para abrir el explorador de archivos
                    </p>
                    <div style={{
                      marginTop: 12,
                      display: 'inline-block',
                      background: '#e2e8f0',
                      color: '#334155',
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600
                    }}>
                      Ideal si el explorador de archivos falla o tarda en abrir
                    </div>
                  </div>
                )}
              </div>

              {/* Selección / Confirmación del Joven */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Concurrente / Joven a asignar:
                </label>
                <select
                  className="ga-select"
                  value={selectedYoungId}
                  onChange={(e) => setSelectedYoungId(e.target.value)}
                  style={{ width: '100%', fontSize: 13, padding: '8px 10px', borderRadius: 8 }}
                  disabled={loadingYoungs || uploading}
                >
                  <option value="">🔍 Autodetectar por el nombre dentro de la planilla Excel</option>
                  {youngs.map(y => (
                    <option key={y.id} value={y.id}>
                      {y.nombre_completo || y.nombreCompleto} ({y.taller || 'Sin taller'})
                    </option>
                  ))}
                </select>
                {selectedYoung && (
                  <div style={{ fontSize: 12, color: '#047857', marginTop: 6, fontWeight: 600 }}>
                    ✓ Asignando planilla a: {selectedYoung.nombre_completo || selectedYoung.nombreCompleto} ({selectedYoung.taller})
                  </div>
                )}
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
                    background: '#059669',
                    borderColor: '#059669',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  {uploading ? (
                    <>
                      <span>⏳</span> Procesando planilla Excel...
                    </>
                  ) : (
                    <>
                      <span>📥</span> Importar Planilla Excel
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
