"use client";
import React, { useState, useEffect, useMemo } from 'react';

interface BlockPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  youngId: number | null;
  youngNombre: string;
  blockNumber: 1 | 2 | 3 | 4;
  onReassigned?: () => void;
}

function getLevelBadge(level: number) {
  switch (level) {
    case 4:
      return {
        label: 'Nivel 4',
        sublabel: 'Puede enseñar (100%)',
        color: '#6b21a8',
        bg: '#f3e8ff',
        border: '#c084fc',
        icon: '⭐'
      };
    case 3:
      return {
        label: 'Nivel 3',
        sublabel: 'Autónomo (75%)',
        color: '#065f46',
        bg: '#ecfdf5',
        border: '#6ee7b7',
        icon: '✓'
      };
    case 2:
      return {
        label: 'Nivel 2',
        sublabel: 'Con apoyos (50%)',
        color: '#0369a1',
        bg: '#f0f9ff',
        border: '#7dd3fc',
        icon: '🤝'
      };
    case 1:
      return {
        label: 'Nivel 1',
        sublabel: 'Inicial / En proceso (25%)',
        color: '#92400e',
        bg: '#fffbeb',
        border: '#fcd34d',
        icon: '🌱'
      };
    default:
      return {
        label: 'Sin evaluar',
        sublabel: '(0%)',
        color: '#64748b',
        bg: '#f1f5f9',
        border: '#cbd5e1',
        icon: '⚪'
      };
  }
}

function formatPeriodLabel(p: string): string {
  if (!p) return '';
  const monthNames: Record<string, string> = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
  };
  const parts = p.split('-');
  if (parts.length === 2 && monthNames[parts[1]]) {
    return `${monthNames[parts[1]]} ${parts[0]}`;
  }
  return p;
}

export default function BlockPreviewModal({
  isOpen,
  onClose,
  youngId,
  youngNombre,
  blockNumber,
  onReassigned
}: BlockPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string>('');
  const [reassigning, setReassigning] = useState(false);
  const [reassignSuccess, setReassignSuccess] = useState<string>('');

  // Subvistas para Bloques 2 y 4 (Excels)
  const [excelTab, setExcelTab] = useState<'progression' | 'months'>('progression');
  const [selectedTaller, setSelectedTaller] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ADVANCED' | 'AUTONOMOUS' | 'SUPPORT'>('ALL');
  const [searchSkill, setSearchSkill] = useState<string>('');
  const [expandedWorkshops, setExpandedWorkshops] = useState<Record<string, boolean>>({});

  const blockNames: Record<number, string> = {
    1: 'Bloque 1: Trimestral 1 (Ene - Mar - Verano)',
    2: 'Bloque 2: Evaluaciones Mensuales 1 (Abr - Jun)',
    3: 'Bloque 3: Trimestral 2 (Abr - Jun)',
    4: 'Bloque 4: Evaluaciones Mensuales 2 (Ago - Dic)'
  };

  const loadPreview = async () => {
    if (!youngId) return;
    setLoading(true);
    setError('');
    setReassignSuccess('');
    try {
      const res = await fetch(`/api/reports/final/block-preview?youngId=${youngId}&block=${blockNumber}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cargar vista previa');
      setData(json);
      // Expandir talleres por defecto en la vista mensual
      if (json?.progression?.talleres) {
        const initialExp: Record<string, boolean> = {};
        json.progression.talleres.forEach((t: any) => {
          initialExp[t.nombre] = true;
        });
        setExpandedWorkshops(initialExp);
      }
    } catch (err: any) {
      console.error('Error cargando preview de bloque:', err);
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && youngId) {
      loadPreview();
    }
  }, [isOpen, youngId, blockNumber]);

  // Filtrado reactivo de talleres y habilidades en la vista de progresión
  const filteredTalleres = useMemo(() => {
    if (!data?.progression?.talleres) return [];
    let list = data.progression.talleres;

    if (selectedTaller !== 'ALL') {
      list = list.filter((t: any) => t.nombre === selectedTaller);
    }

    const search = searchSkill.toLowerCase().trim();

    return list.map((t: any) => {
      let skills = t.skills || [];

      if (search) {
        skills = skills.filter((s: any) => s.nombre.toLowerCase().includes(search));
      }

      if (statusFilter === 'ADVANCED') {
        skills = skills.filter((s: any) => s.delta > 0);
      } else if (statusFilter === 'AUTONOMOUS') {
        skills = skills.filter((s: any) => s.ultimoNivel >= 3);
      } else if (statusFilter === 'SUPPORT') {
        skills = skills.filter((s: any) => s.ultimoNivel === 1 || s.ultimoNivel === 2);
      }

      return {
        ...t,
        skills
      };
    }).filter((t: any) => t.skills.length > 0);
  }, [data?.progression?.talleres, selectedTaller, statusFilter, searchSkill]);

  if (!isOpen) return null;

  const handleReassign = async (targetYoungId: number) => {
    if (!data) return;
    setReassigning(true);
    try {
      const payload: any = { targetYoungId };
      if (data.reportId) {
        payload.reportId = data.reportId;
      } else if (data.months && data.months.length > 0) {
        payload.formId = data.months[0].id;
      }

      const res = await fetch('/api/reports/final/reassign-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al reasignar');

      setReassignSuccess(json.message || 'Bloque reasignado correctamente.');
      if (onReassigned) onReassigned();
      setTimeout(() => {
        loadPreview();
      }, 1200);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setReassigning(false);
    }
  };

  const toggleWorkshop = (tallerNombre: string) => {
    setExpandedWorkshops(prev => ({
      ...prev,
      [tallerNombre]: !prev[tallerNombre]
    }));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 16
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        maxWidth: 880,
        width: '100%',
        maxHeight: '92vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Cabecera */}
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              👁️ VISTA PREVIA Y EVOLUCIÓN DE INSUMOS
            </div>
            <h2 style={{ margin: '4px 0 0 0', fontSize: 17, fontWeight: 800, color: '#f8fafc' }}>
              {blockNames[blockNumber]}
            </h2>
            <div style={{ fontSize: 13, color: '#38bdf8', marginTop: 3, fontWeight: 600 }}>
              Concurrente: {youngNombre}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#ffffff',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
              padding: '6px 10px',
              borderRadius: 8
            }}
          >
            ✕
          </button>
        </div>

        {/* Cuerpo */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: 16, color: '#1e293b', fontWeight: 700 }}>Cargando contenido y progresión del bloque...</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Analizando planillas mensuales, habilidades y avances...</div>
            </div>
          ) : error ? (
            <div style={{
              padding: 16,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 10,
              color: '#991b1b'
            }}>
              ⚠️ {error}
            </div>
          ) : !data?.hasData ? (
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: 18, fontWeight: 700 }}>
                No hay información registrada en este bloque
              </h3>
              <p style={{ color: '#64748b', fontSize: 14, maxWidth: 500, margin: '0 auto 20px auto' }}>
                {data?.message || 'Aún no se ha cargado el archivo o evaluación correspondiente a este período para este concurrente.'}
              </p>
              <button
                type="button"
                className="ga-btn secondary"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          ) : (
            <div>
              {/* Notificación de Reasignación Exitosa */}
              {reassignSuccess && (
                <div style={{
                  padding: '12px 16px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: 10,
                  color: '#065f46',
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span>✓</span>
                  <span>{reassignSuccess}</span>
                </div>
              )}

              {/* Banner de Verificación de Identidad / Discrepancia */}
              {data.mismatch ? (
                <div style={{
                  padding: 16,
                  background: '#fef2f2',
                  border: '2px solid #ef4444',
                  borderRadius: 12,
                  marginBottom: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>⚠️</span>
                    <div>
                      <strong style={{ color: '#991b1b', fontSize: 14, display: 'block' }}>
                        ¡Alerta de Identidad en este Bloque!
                      </strong>
                      <span style={{ color: '#b91c1c', fontSize: 13 }}>
                        {data.mismatch.warning}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    background: 'white',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #fecaca',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8
                  }}>
                    <span style={{ fontSize: 12, color: '#475569' }}>
                      ¿Deseas corregir la asignación y mover este insumo a <strong>{data.mismatch.detectedYoungName}</strong>?
                    </span>
                    <button
                      onClick={() => handleReassign(data.mismatch.detectedYoungId)}
                      disabled={reassigning}
                      style={{
                        padding: '6px 14px',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: reassigning ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {reassigning ? '⏳ Reasignando...' : `🔁 Reasignar a ${data.mismatch.detectedYoungName}`}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#166534',
                  fontSize: 13,
                  fontWeight: 600
                }}>
                  <span>✅</span>
                  <span>Verificación de Identidad: El contenido de este bloque coincide con <strong>{youngNombre}</strong>.</span>
                </div>
              )}

              {/* Metadatos Generales */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '12px 18px',
                marginBottom: 20,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
                fontSize: 13
              }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, display: 'block' }}>PERÍODO</span>
                  <strong style={{ color: '#1e293b' }}>{data.periodo || 'Mensuales Evaluados'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, display: 'block' }}>FACILITADOR / EQUIPO</span>
                  <strong style={{ color: '#1e293b' }}>{data.facilitador || data.months?.[0]?.facilitador || 'Equipo Andar'}</strong>
                </div>
                {data.filename && (
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, display: 'block' }}>ARCHIVO ORIGINAL</span>
                    <span style={{ color: '#2563eb', fontWeight: 600 }}>{data.filename}</span>
                  </div>
                )}
                {data.reportId && (
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, display: 'block' }}>ACCIONES</span>
                    <a
                      href={`/api/reports/${data.reportId}/.docx`}
                      download
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        color: '#059669',
                        fontWeight: 700,
                        textDecoration: 'none',
                        fontSize: 12
                      }}
                    >
                      📥 Descargar Word (.docx)
                    </a>
                  </div>
                )}
              </div>

              {/* CONTENIDO SEGÚN TIPO */}
              {(blockNumber === 1 || blockNumber === 3) ? (
                /* INFORME TRIMESTRAL WORD */
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 10 }}>
                    📝 Secciones y Narrativa del Documento:
                  </div>

                  {data.secciones && Object.keys(data.secciones).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {Object.entries(data.secciones).map(([key, val]: [string, any]) => {
                        if (!val || (typeof val === 'string' && !val.trim())) return null;
                        return (
                          <div key={key} style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                            padding: 12
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a8a', textTransform: 'capitalize', marginBottom: 4 }}>
                              {key.replace(/([A-Z])/g, ' $1')}
                            </div>
                            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                              {typeof val === 'string' ? val : JSON.stringify(val)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : data.rawPreview ? (
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: 14,
                      fontSize: 13,
                      color: '#334155',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-line',
                      maxHeight: 350,
                      overflowY: 'auto'
                    }}>
                      {data.rawPreview}
                    </div>
                  ) : (
                    <div style={{ color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>
                      No se encontraron párrafos de texto interpretados en este informe.
                    </div>
                  )}
                </div>
              ) : (
                /* PLANILLAS MENSUALES EXCEL: VISTA DE HABILIDADES Y PROGRESIÓN */
                <div>
                  {/* Selector de Pestañas de Vista */}
                  <div style={{
                    display: 'flex',
                    gap: 8,
                    borderBottom: '2px solid #e2e8f0',
                    marginBottom: 16,
                    paddingBottom: 2
                  }}>
                    <button
                      onClick={() => setExcelTab('progression')}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        background: 'transparent',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        color: excelTab === 'progression' ? '#2563eb' : '#64748b',
                        borderBottom: excelTab === 'progression' ? '3px solid #2563eb' : '3px solid transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span>📈 Evolución y Progreso de Habilidades</span>
                      {data.progression?.advancedCount > 0 && (
                        <span style={{
                          background: '#ecfdf5',
                          color: '#065f46',
                          fontSize: 11,
                          padding: '1px 6px',
                          borderRadius: 10,
                          fontWeight: 800
                        }}>
                          +{data.progression.advancedCount} avanzaron
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setExcelTab('months')}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        background: 'transparent',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        color: excelTab === 'months' ? '#2563eb' : '#64748b',
                        borderBottom: excelTab === 'months' ? '3px solid #2563eb' : '3px solid transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span>📋 Planillas por Mes y Observaciones ({data.count} meses)</span>
                    </button>
                  </div>

                  {excelTab === 'progression' && data.progression ? (
                    <div>
                      {/* Tarjetas KPI de Resumen */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                        gap: 10,
                        marginBottom: 16
                      }}>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block' }}>TOTAL HABILIDADES</span>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                            {data.progression.totalSkills}
                          </div>
                          <span style={{ fontSize: 11, color: '#64748b' }}>en {data.progression.talleres.length} talleres</span>
                        </div>

                        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 12 }}>
                          <span style={{ fontSize: 11, color: '#065f46', fontWeight: 700, display: 'block' }}>📈 AVANZARON DE NIVEL</span>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#047857', marginTop: 2 }}>
                            {data.progression.advancedCount}
                          </div>
                          <span style={{ fontSize: 11, color: '#065f46' }}>progreso detectado</span>
                        </div>

                        <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: 12 }}>
                          <span style={{ fontSize: 11, color: '#6b21a8', fontWeight: 700, display: 'block' }}>⭐ AUTONOMÍA (NIVEL 3/4)</span>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed', marginTop: 2 }}>
                            {data.progression.highAutonomyCount}
                          </div>
                          <span style={{ fontSize: 11, color: '#6b21a8' }}>habilidades consolidadas</span>
                        </div>

                        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: 12 }}>
                          <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 700, display: 'block' }}>🤝 CON APOYOS (NIVEL 1/2)</span>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#0284c7', marginTop: 2 }}>
                            {data.progression.supportNeededCount}
                          </div>
                          <span style={{ fontSize: 11, color: '#0369a1' }}>en proceso de desarrollo</span>
                        </div>
                      </div>

                      {/* Barra de Filtros y Búsqueda */}
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 16,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 10
                      }}>
                        {/* Selector de Taller */}
                        <div style={{ flex: '1 1 200px' }}>
                          <select
                            value={selectedTaller}
                            onChange={(e) => setSelectedTaller(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#1e293b'
                            }}
                          >
                            <option value="ALL">🏢 Todos los Talleres ({data.progression.talleres.length})</option>
                            {data.progression.talleres.map((t: any) => (
                              <option key={t.nombre} value={t.nombre}>
                                {t.nombre} ({t.skillsCount} hab. {t.advancedCount > 0 ? `· 📈 +${t.advancedCount}` : ''})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Buscador */}
                        <div style={{ flex: '1 1 180px' }}>
                          <input
                            type="text"
                            placeholder="🔍 Buscar habilidad..."
                            value={searchSkill}
                            onChange={(e) => setSearchSkill(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              fontSize: 12
                            }}
                          />
                        </div>

                        {/* Píldoras de Filtro por Estado */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setStatusFilter('ALL')}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              border: 'none',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: statusFilter === 'ALL' ? '#0f172a' : '#f1f5f9',
                              color: statusFilter === 'ALL' ? '#ffffff' : '#475569'
                            }}
                          >
                            Todas
                          </button>
                          <button
                            onClick={() => setStatusFilter('ADVANCED')}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              border: 'none',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: statusFilter === 'ADVANCED' ? '#059669' : '#ecfdf5',
                              color: statusFilter === 'ADVANCED' ? '#ffffff' : '#065f46'
                            }}
                          >
                            📈 Avanzaron ({data.progression.advancedCount})
                          </button>
                          <button
                            onClick={() => setStatusFilter('AUTONOMOUS')}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              border: 'none',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: statusFilter === 'AUTONOMOUS' ? '#7c3aed' : '#f5f3ff',
                              color: statusFilter === 'AUTONOMOUS' ? '#ffffff' : '#6b21a8'
                            }}
                          >
                            ⭐ Autónomas ({data.progression.highAutonomyCount})
                          </button>
                          <button
                            onClick={() => setStatusFilter('SUPPORT')}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              border: 'none',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: statusFilter === 'SUPPORT' ? '#0284c7' : '#f0f9ff',
                              color: statusFilter === 'SUPPORT' ? '#ffffff' : '#0369a1'
                            }}
                          >
                            🤝 Con Apoyos ({data.progression.supportNeededCount})
                          </button>
                        </div>
                      </div>

                      {/* Lista de Talleres y Habilidades */}
                      {filteredTalleres.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {filteredTalleres.map((t: any) => {
                            const isExpanded = expandedWorkshops[t.nombre] !== false;
                            return (
                              <div key={t.nombre} style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: 10,
                                overflow: 'hidden'
                              }}>
                                {/* Encabezado de Taller */}
                                <div
                                  onClick={() => toggleWorkshop(t.nombre)}
                                  style={{
                                    padding: '10px 16px',
                                    background: '#f8fafc',
                                    borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 13, color: '#64748b' }}>{isExpanded ? '▼' : '▶'}</span>
                                    <strong style={{ fontSize: 13.5, color: '#1e293b' }}>{t.nombre}</strong>
                                    <span style={{
                                      background: '#e2e8f0',
                                      color: '#475569',
                                      fontSize: 11,
                                      padding: '2px 7px',
                                      borderRadius: 10,
                                      fontWeight: 600
                                    }}>
                                      {t.skills.length} habilidades
                                    </span>
                                  </div>

                                  {t.advancedCount > 0 && (
                                    <span style={{
                                      background: '#ecfdf5',
                                      color: '#065f46',
                                      border: '1px solid #a7f3d0',
                                      fontSize: 11,
                                      padding: '3px 8px',
                                      borderRadius: 8,
                                      fontWeight: 700,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}>
                                      <span>📈</span>
                                      <span>{t.advancedCount} avanzaron de nivel</span>
                                    </span>
                                  )}
                                </div>

                                {/* Lista de Habilidades de este taller */}
                                {isExpanded && (
                                  <div style={{ padding: '8px 16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      {t.skills.map((s: any, idx: number) => {
                                        const lastBadge = getLevelBadge(s.ultimoNivel);
                                        return (
                                          <div key={idx} style={{
                                            padding: '10px 14px',
                                            borderRadius: 8,
                                            background: s.delta > 0 ? '#f0fdf4' : '#ffffff',
                                            border: s.delta > 0 ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6
                                          }}>
                                            {/* Fila Superior: Nombre y Badge de Evolución */}
                                            <div style={{
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'flex-start',
                                              flexWrap: 'wrap',
                                              gap: 8
                                            }}>
                                              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', flex: '1 1 250px' }}>
                                                {s.nombre}
                                              </span>

                                              {/* Badge de Progreso / Delta */}
                                              {s.delta > 0 ? (
                                                <span style={{
                                                  background: '#059669',
                                                  color: '#ffffff',
                                                  fontSize: 11,
                                                  fontWeight: 800,
                                                  padding: '3px 9px',
                                                  borderRadius: 12,
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: 4
                                                }}>
                                                  📈 Avanzó +{s.delta} {s.delta === 1 ? 'nivel' : 'niveles'} (N{s.primerNivel} ➔ N{s.ultimoNivel})
                                                </span>
                                              ) : s.ultimoNivel >= 3 ? (
                                                <span style={{
                                                  background: '#f5f3ff',
                                                  color: '#6b21a8',
                                                  border: '1px solid #c084fc',
                                                  fontSize: 11,
                                                  fontWeight: 700,
                                                  padding: '2px 8px',
                                                  borderRadius: 12
                                                }}>
                                                  ⭐ Autonomía consolidada (Nivel {s.ultimoNivel})
                                                </span>
                                              ) : s.ultimoNivel > 0 ? (
                                                <span style={{
                                                  background: '#f1f5f9',
                                                  color: '#475569',
                                                  fontSize: 11,
                                                  fontWeight: 600,
                                                  padding: '2px 8px',
                                                  borderRadius: 12
                                                }}>
                                                  🔄 Nivel {s.ultimoNivel} sostenido
                                                </span>
                                              ) : (
                                                <span style={{
                                                  background: '#f8fafc',
                                                  color: '#94a3b8',
                                                  fontSize: 11,
                                                  padding: '2px 8px',
                                                  borderRadius: 12
                                                }}>
                                                  ⚪ Sin evaluar
                                                </span>
                                              )}
                                            </div>

                                            {/* Trayectoria Período a Período */}
                                            <div style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              flexWrap: 'wrap',
                                              gap: 8,
                                              fontSize: 12,
                                              marginTop: 2
                                            }}>
                                              <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>Trayectoria:</span>
                                              {data.progression.periods.map((p: string, pIdx: number) => {
                                                const lvl = s.nivelesPorPeriodo[p] ?? 0;
                                                const b = getLevelBadge(lvl);
                                                const isNext = pIdx < data.progression.periods.length - 1;
                                                return (
                                                  <React.Fragment key={p}>
                                                    <span style={{
                                                      background: b.bg,
                                                      color: b.color,
                                                      border: `1px solid ${b.border}`,
                                                      padding: '2px 8px',
                                                      borderRadius: 6,
                                                      fontSize: 11,
                                                      fontWeight: 700,
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: 4
                                                    }}>
                                                      <span style={{ color: '#475569', fontWeight: 600 }}>{formatPeriodLabel(p)}:</span>
                                                      <span>{b.icon} {b.label}</span>
                                                    </span>
                                                    {isNext && (
                                                      <span style={{ color: '#94a3b8', fontSize: 12 }}>➔</span>
                                                    )}
                                                  </React.Fragment>
                                                );
                                              })}
                                            </div>

                                            {/* Barra de progreso visual (0 a 100%) */}
                                            <div style={{
                                              height: 5,
                                              background: '#e2e8f0',
                                              borderRadius: 4,
                                              overflow: 'hidden',
                                              marginTop: 4
                                            }}>
                                              <div style={{
                                                height: '100%',
                                                width: `${(s.ultimoNivel / 4) * 100}%`,
                                                background: s.ultimoNivel === 4 ? '#9333ea' : s.ultimoNivel === 3 ? '#059669' : s.ultimoNivel === 2 ? '#0284c7' : s.ultimoNivel === 1 ? '#d97706' : '#cbd5e1',
                                                borderRadius: 4,
                                                transition: 'width 0.3s ease'
                                              }} />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{
                          padding: 30,
                          textAlign: 'center',
                          background: '#f8fafc',
                          borderRadius: 8,
                          color: '#64748b',
                          fontSize: 13
                        }}>
                          No se encontraron habilidades que coincidan con los filtros seleccionados.
                        </div>
                      )}
                    </div>
                  ) : (
                    /* PESTAÑA: PLANILLAS POR MES Y TALLER */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {data.months && data.months.length > 0 ? (
                        data.months.map((m: any) => (
                          <div key={m.id} style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            padding: 16
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                                📅 Período {formatPeriodLabel(m.periodo)} ({m.periodo})
                              </span>
                              <span className="ga-badge" style={{ fontSize: 11 }}>
                                {m.taller || 'Taller'}
                              </span>
                            </div>

                            {/* Desglose de Talleres y Habilidades */}
                            {m.talleres && m.talleres.length > 0 && (
                              <div style={{ marginBottom: 14 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>
                                  TALLERES Y HABILIDADES EVALUADAS:
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {m.talleres.map((t: any, idx: number) => (
                                    <div key={idx} style={{
                                      background: '#f8fafc',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: 8,
                                      padding: '8px 12px'
                                    }}>
                                      <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 6
                                      }}>
                                        <strong style={{ fontSize: 12.5, color: '#1e3a8a' }}>{t.nombre}</strong>
                                        <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                                          {t.itemsEvaluadosCount || t.items?.filter((it: any) => (it.nivel || 0) > 0).length || 0} / {t.itemsCount || t.items?.length || 0} evaluadas
                                        </span>
                                      </div>

                                      {/* Lista de habilidades evaluadas */}
                                      {t.items && t.items.length > 0 && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 6 }}>
                                          {t.items.map((it: any, itIdx: number) => {
                                            const b = getLevelBadge(it.nivel || 0);
                                            return (
                                              <div key={itIdx} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                background: '#ffffff',
                                                border: '1px solid #e2e8f0',
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                fontSize: 11.5
                                              }}>
                                                <span style={{ color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 6 }}>
                                                  {it.nombre}
                                                </span>
                                                <span style={{
                                                  background: b.bg,
                                                  color: b.color,
                                                  border: `1px solid ${b.border}`,
                                                  padding: '1px 6px',
                                                  borderRadius: 4,
                                                  fontSize: 10,
                                                  fontWeight: 700,
                                                  whiteSpace: 'nowrap'
                                                }}>
                                                  {b.icon} {b.label}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Observaciones del Facilitador */}
                            {m.observaciones ? (
                              <div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                                  OBSERVACIONES DEL FACILITADOR ({m.observaciones.length} caracteres):
                                </span>
                                <div style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  padding: 12,
                                  borderRadius: 8,
                                  fontSize: 12.5,
                                  color: '#334155',
                                  lineHeight: 1.6,
                                  whiteSpace: 'pre-line'
                                }}>
                                  {m.observaciones}
                                </div>
                              </div>
                            ) : (
                              <div style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>
                                Sin observaciones narrativas cargadas para este mes.
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div style={{ color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>
                          No hay registros mensuales para este período.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie */}
        <div style={{
          padding: '14px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {blockNumber === 2 || blockNumber === 4 ? '📊 Planillas Excel de Granja Andar' : '📝 Informe Trimestral en Word (.docx)'}
          </span>
          <button
            type="button"
            className="ga-btn secondary"
            onClick={onClose}
            style={{ padding: '8px 20px', fontWeight: 700 }}
          >
            Cerrar Vista Previa
          </button>
        </div>
      </div>
    </div>
  );
}
