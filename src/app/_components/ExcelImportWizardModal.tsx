"use client";
import React, { useState } from 'react';

interface ImportedMonth {
  formId: string;
  periodo: string;
}

interface ExcelImportWizardModalProps {
  isOpen: boolean;
  youngId: string;
  importedMonths: ImportedMonth[];
  onClose: () => void;
  onSuccess?: (reportId: string) => void;
}

export default function ExcelImportWizardModal({
  isOpen,
  youngId,
  importedMonths,
  onClose,
  onSuccess
}: ExcelImportWizardModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    importedMonths.map(m => m.formId)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleSelect = (formId: string) => {
    setSelectedIds(prev => 
      prev.includes(formId) 
        ? prev.filter(id => id !== formId) 
        : [...prev, formId]
    );
  };

  const handleMerge = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/reports/trimestral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formIds: selectedIds })
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Error generando informe trimestral' }));
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      const result = await res.json();
      
      // Descargar el Word
      window.location.href = `/api/reports/${result.reportId}/.docx`;
      if (onSuccess) {
        onSuccess(result.reportId);
      }
      onClose();
    } catch (err: any) {
      console.error('Error fusionando importados:', err);
      setError(err.message || 'Ocurrió un error inesperado al generar el informe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '30px',
        maxWidth: '560px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative'
      }}>
        {/* Banner Superior con Gradiente */}
        <div style={{
          height: '6px',
          background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✨ Importación Completada</span>
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
            Se importaron con éxito la <strong>Planificación Centrada en la Persona (PCP)</strong> y las planillas mensuales.
          </p>
        </div>

        {/* Sección de Selección de Períodos */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Borradores Mensuales Detectados
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {importedMonths.map(month => {
              const isChecked = selectedIds.includes(month.formId);
              return (
                <label 
                  key={month.formId} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: isChecked ? '#eff6ff' : '#ffffff',
                    border: `1px solid ${isChecked ? '#bfdbfe' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isChecked ? '#1d4ed8' : '#334155'
                  }}
                >
                  <input 
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelect(month.formId)}
                    disabled={loading}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: '2px solid #cbd5e1',
                      cursor: 'pointer'
                    }}
                  />
                  <span>Período: {month.periodo}</span>
                </label>
              );
            })}
          </div>

          <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
            Selecciona entre 1 y 3 meses para consolidar el reporte trimestral con IA.
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#991b1b',
            fontSize: '13px',
            fontWeight: 500
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="ga-btn secondary"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Cerrar y ver borradores
          </button>
          
          <button
            type="button"
            onClick={handleMerge}
            disabled={loading || selectedIds.length === 0}
            className="ga-btn accent"
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 700,
              borderRadius: '8px',
              cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
            }}
          >
            {loading ? (
              <>
                <span>Generando con IA...</span>
              </>
            ) : (
              <>
                <span>🔗 Fusionar y Generar Reporte (Word)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
