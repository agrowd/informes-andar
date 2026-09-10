"use client";
import React, { useState, useEffect } from 'react';

interface GenerateFinalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (report: any) => void;
  initialYoungId?: string;
}

export default function GenerateFinalReportModal({
  isOpen,
  onClose,
  onSuccess,
  initialYoungId
}: GenerateFinalReportModalProps) {
  const [youngs, setYoungs] = useState<any[]>([]);
  const [selectedYoungId, setSelectedYoungId] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loadingYoungs, setLoadingYoungs] = useState<boolean>(false);
  const [loadingDiagnostic, setLoadingDiagnostic] = useState<boolean>(false);
  const [diagnosticData, setDiagnosticData] = useState<any | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successReport, setSuccessReport] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessReport(null);
      setDiagnosticData(null);
      setSelectedYoungId(initialYoungId || '');
      setSelectedGroup('TODOS');
      setSearchTerm('');

      setLoadingYoungs(true);
      fetch('/api/youngs?pageSize=150')
        .then(res => res.json())
        .then(data => {
          setYoungs(data.items || []);
          if (initialYoungId) {
            loadDiagnostic(initialYoungId);
          }
        })
        .catch(err => console.error('Error cargando concurrentes:', err))
        .finally(() => setLoadingYoungs(false));
    }
  }, [isOpen, initialYoungId]);

  const loadDiagnostic = async (youngId: string) => {
    if (!youngId) return;
    setLoadingDiagnostic(true);
    setError('');
    try {
      const res = await fetch(`/api/reports/final?youngId=${youngId}`);
      if (!res.ok) {
        throw new Error('No se pudo verificar el estado de los insumos del concurrente');
      }
      const data = await res.json();
      setDiagnosticData(data);
    } catch (err: any) {
      console.error('Error cargando diagnóstico:', err);
      setError(err.message || 'Error al diagnosticar insumos');
    } finally {
      setLoadingDiagnostic(false);
    }
  };

  const handleSelectYoung = (youngId: string) => {
    setSelectedYoungId(youngId);
    setDiagnosticData(null);
    setError('');
    if (youngId) {
      loadDiagnostic(youngId);
    }
  };

  const handleGenerateFinal = async () => {
    if (!selectedYoungId) return;
    setGenerating(true);
    setError('');

    try {
      const res = await fetch('/api/reports/final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youngId: parseInt(selectedYoungId)
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: 'Error generando informe final' }));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const result = await res.json();
      setSuccessReport(result.report);
      onSuccess(result.report);
    } catch (err: any) {
      console.error('Error generando informe final:', err);
      setError(err.message || 'Error al generar el informe final');
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  const groups = ['TODOS', 'Emprendedores', 'Artesanos', 'Promotores', 'Empoderadas', 'Atrapasueños', 'Buenos Mozos', 'Clave de Sol'];

  const filteredYoungs = youngs.filter(y => {
    const matchesGroup = selectedGroup === 'TODOS' || (y.taller && y.taller.toLowerCase() === selectedGroup.toLowerCase());
    const matchesSearch = !searchTerm || (y.nombreCompleto && y.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesGroup && matchesSearch;
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2500,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Banner Superior Gradiente Dorado/Ámbar */}
        <div style={{
          height: '6px',
          background: 'linear-gradient(90deg, #f59e0b 0%, #ec4899 50%, #8b5cf6 100%)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }} />

        <div style={{ padding: '24px 28px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏆 Generador de Informe Final Anual</span>
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                Fusión longitudinal con IA del ciclo anual en la plantilla institucional oficial de Word.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '4px'
              }}
            >
              ✕
            </button>
          </div>

          {/* Estado de Éxito */}
          {successReport ? (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ fontSize: '40px' }}>🎉</div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#166534' }}>
                ¡Informe Final Anual Generado Exitosamente!
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#15803d' }}>
                Se consolidó la evolución de <strong>{successReport.jovenNombre}</strong> para el período <strong>{successReport.periodo}</strong>.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '8px' }}>
                <a
                  href={`/api/reports/${successReport.id}/.docx`}
                  className="ga-btn"
                  style={{
                    background: '#16a34a',
                    color: '#ffffff',
                    padding: '10px 20px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  📥 Descargar Word (.docx)
                </a>
                <a
                  href={`/reports/${successReport.id}`}
                  className="ga-btn secondary"
                  style={{
                    padding: '10px 20px',
                    fontWeight: 600,
                    borderRadius: '8px'
                  }}
                >
                  👁️ Ver y Revisar
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Selector de Concurrente */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  1. Seleccionar Concurrente:
                </label>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      background: '#f8fafc',
                      fontWeight: 600
                    }}
                  >
                    {groups.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <select
                  value={selectedYoungId}
                  onChange={(e) => handleSelectYoung(e.target.value)}
                  disabled={loadingYoungs || generating}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    background: '#ffffff',
                    fontWeight: 600,
                    color: selectedYoungId ? '#0f172a' : '#94a3b8'
                  }}
                >
                  <option value="">-- Elige un concurrente ({filteredYoungs.length} disponibles) --</option>
                  {filteredYoungs.map(y => (
                    <option key={y.id} value={y.id}>
                      {y.nombreCompleto} ({y.taller || 'Sin taller'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Diagnóstico de Insumos del Joven */}
              {loadingDiagnostic && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                  ⏳ Verificando insumos del concurrente...
                </div>
              )}

              {diagnosticData && !loadingDiagnostic && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Composición del Informe Final (Los 4 Insumos)
                    </span>
                    <span className="ga-badge" style={{ fontSize: '11px', background: '#e0e7ff', color: '#3730a3', fontWeight: 700 }}>
                      {diagnosticData.young.grupo}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {/* Bloque 1: Trimestral 1 */}
                    <div style={{
                      background: diagnosticData.blocks.trimestral1.available ? '#ecfdf5' : '#fffbeb',
                      border: `1px solid ${diagnosticData.blocks.trimestral1.available ? '#a7f3d0' : '#fde68a'}`,
                      padding: '10px 12px',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📄 1. Trimestral Ene-Feb-Mar</span>
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '4px', color: diagnosticData.blocks.trimestral1.available ? '#065f46' : '#92400e' }}>
                        {diagnosticData.blocks.trimestral1.available 
                          ? `✅ Listo: Informe #${diagnosticData.blocks.trimestral1.id}`
                          : '⚠️ Pendiente (Word manual)'}
                      </div>
                    </div>

                    {/* Bloque 2: Mensuales 1 */}
                    <div style={{
                      background: diagnosticData.blocks.mensuales1.available ? '#ecfdf5' : '#fffbeb',
                      border: `1px solid ${diagnosticData.blocks.mensuales1.available ? '#a7f3d0' : '#fde68a'}`,
                      padding: '10px 12px',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📋 2. Mensuales Abr-May-Jun</span>
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '4px', color: diagnosticData.blocks.mensuales1.available ? '#065f46' : '#92400e' }}>
                        {diagnosticData.blocks.mensuales1.available 
                          ? `✅ ${diagnosticData.blocks.mensuales1.count} cuadrículas listas`
                          : '⚠️ Sin cuadrículas registradas'}
                      </div>
                    </div>

                    {/* Bloque 3: Trimestral 2 */}
                    <div style={{
                      background: diagnosticData.blocks.trimestral2.available ? '#ecfdf5' : '#fffbeb',
                      border: `1px solid ${diagnosticData.blocks.trimestral2.available ? '#a7f3d0' : '#fde68a'}`,
                      padding: '10px 12px',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📄 3. Trimestral Abr-May-Jun</span>
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '4px', color: diagnosticData.blocks.trimestral2.available ? '#065f46' : '#92400e' }}>
                        {diagnosticData.blocks.trimestral2.available 
                          ? `✅ Listo: Informe #${diagnosticData.blocks.trimestral2.id}`
                          : '⚠️ Pendiente de generación'}
                      </div>
                    </div>

                    {/* Bloque 4: Mensuales 2 */}
                    <div style={{
                      background: diagnosticData.blocks.mensuales2.available ? '#ecfdf5' : '#fffbeb',
                      border: `1px solid ${diagnosticData.blocks.mensuales2.available ? '#a7f3d0' : '#fde68a'}`,
                      padding: '10px 12px',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📋 4. Mensuales Ago-Sep</span>
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '4px', color: diagnosticData.blocks.mensuales2.available ? '#065f46' : '#92400e' }}>
                        {diagnosticData.blocks.mensuales2.available 
                          ? `✅ ${diagnosticData.blocks.mensuales2.count} cuadrículas listas`
                          : '⚠️ Pendientes de carga en Excel'}
                      </div>
                    </div>
                  </div>

                  {diagnosticData.existingFinal && (
                    <div style={{
                      marginTop: '12px',
                      padding: '8px 12px',
                      background: '#fef3c7',
                      border: '1px solid #fde68a',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#92400e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>ℹ️ Este concurrente ya posee un Informe Final previo (ID #{diagnosticData.existingFinal.id}). Al generar, se guardará una nueva versión consolidada.</span>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#991b1b',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Acciones */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={generating}
                  className="ga-btn secondary"
                  style={{ padding: '10px 20px', borderRadius: '8px' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGenerateFinal}
                  disabled={generating || !selectedYoungId}
                  className="ga-btn"
                  style={{
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 24px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    cursor: (generating || !selectedYoungId) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(217, 119, 6, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {generating ? (
                    <>
                      <span>⏳ Sintetizando con IA...</span>
                    </>
                  ) : (
                    <>
                      <span>✨ Generar Informe Final Anual con IA</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
