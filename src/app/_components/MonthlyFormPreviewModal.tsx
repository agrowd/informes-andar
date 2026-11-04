"use client";
import React, { useState, useEffect } from 'react';

interface MonthlyFormPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string | number | null;
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

export default function MonthlyFormPreviewModal({
  isOpen,
  onClose,
  formId
}: MonthlyFormPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any | null>(null);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'skills' | 'observations' | 'metadata'>('skills');
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !formId) {
      setForm(null);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    fetch(`/api/forms/${formId}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setForm(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching form details:', err);
        setError('No se pudo cargar la cuadrícula mensual solicitada.');
        setLoading(false);
      });
  }, [isOpen, formId]);

  if (!isOpen) return null;

  const evaluaciones: any[] = form?.data?.evaluaciones || form?.data?.talleres || [];
  const rawObservaciones = form?.data?.observaciones || form?.data?.datosGenerales?.observaciones || '';
  
  // Workshops list
  const workshops = evaluaciones.map((e: any) => e.taller || e.nombre || 'Sin taller');

  // Filtered skills
  const filteredEvaluaciones = evaluaciones.filter((e: any) => {
    const tName = e.taller || e.nombre || '';
    if (selectedWorkshop !== 'ALL' && tName !== selectedWorkshop) return false;
    return true;
  });

  let totalSkillsCount = 0;
  let evaluatedSkillsCount = 0;
  evaluaciones.forEach((e: any) => {
    const items = e.items || e.habilidades || [];
    items.forEach((item: any) => {
      totalSkillsCount++;
      const lvl = typeof item.nivel === 'number' ? item.nivel : parseInt(item.nivel || '0', 10);
      if (lvl > 0) evaluatedSkillsCount++;
    });
  });

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 950,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 20 }}>📊</span>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#ffffff' }}>
                {form?.jovenNombre || 'Cuadrícula Mensual'}
              </h2>
              {form?.grupo && (
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    textTransform: 'uppercase'
                  }}
                >
                  {form.grupo}
                </span>
              )}
              {form?.periodo && (
                <span
                  style={{
                    background: '#ffffff',
                    color: '#1e3a8a',
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '2px 10px',
                    borderRadius: 12
                  }}
                >
                  Período: {form.periodo}
                </span>
              )}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span>👤 Facilitador: <strong>{form?.facilitadorNombre || 'Sin facilitador'}</strong></span>
              {form?.uploadedBy && form.uploadedBy.toLowerCase() !== (form.facilitadorNombre || '').toLowerCase() && (
                <span style={{ opacity: 0.85 }}>(subido por {form.uploadedBy})</span>
              )}
              <span>Estado: <strong>{form?.status || 'BORRADOR'}</strong></span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: 8,
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 18,
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700
            }}
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 24px' }}>
          <button
            onClick={() => setActiveTab('skills')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'skills' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'skills' ? '3px solid #2563eb' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>📋</span> Habilidades ({evaluatedSkillsCount}/{totalSkillsCount})
          </button>
          <button
            onClick={() => setActiveTab('observations')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'observations' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'observations' ? '3px solid #2563eb' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>📝</span> 3. Observaciones del Mes
            {rawObservaciones ? (
              <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 8 }}>
                {rawObservaciones.length} caracteres
              </span>
            ) : (
              <span style={{ fontSize: 10, background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: 8 }}>
                Sin obs
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'metadata' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'metadata' ? '3px solid #2563eb' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>ℹ️</span> Ficha y Metadatos
          </button>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div style={{ fontWeight: 600 }}>Cargando cuadrícula mensual...</div>
            </div>
          )}

          {error && (
            <div style={{ padding: 16, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, color: '#991b1b' }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && !error && form && (
            <>
              {/* TAB 1: SKILLS */}
              {activeTab === 'skills' && (
                <div>
                  {/* Workshop filter & search */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <input
                        type="text"
                        placeholder="Buscar habilidad o destreza..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          fontSize: 13
                        }}
                      />
                    </div>
                    <div>
                      <select
                        value={selectedWorkshop}
                        onChange={(e) => setSelectedWorkshop(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          fontSize: 13,
                          fontWeight: 600,
                          background: '#ffffff'
                        }}
                      >
                        <option value="ALL">Todos los Talleres ({evaluaciones.length})</option>
                        {workshops.map((w: string, idx: number) => (
                          <option key={idx} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {filteredEvaluaciones.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', background: '#f8fafc', borderRadius: 12 }}>
                      No se encontraron talleres con los filtros seleccionados.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {filteredEvaluaciones.map((t: any, idx: number) => {
                        const tName = t.taller || t.nombre || 'Taller sin nombre';
                        const items = (t.items || t.habilidades || []).filter((it: any) => {
                          const text = (it.nombre || it.item || '').toLowerCase();
                          return text.includes(searchQuery.toLowerCase());
                        });

                        return (
                          <div
                            key={idx}
                            style={{
                              border: '1px solid #e2e8f0',
                              borderRadius: 12,
                              overflow: 'hidden',
                              background: '#ffffff'
                            }}
                          >
                            <div
                              style={{
                                background: '#f1f5f9',
                                padding: '10px 16px',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <span style={{ fontWeight: 800, color: '#1e3a8a', fontSize: 14 }}>
                                🛠️ {tName}
                              </span>
                              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                {items.length} destrezas evaluadas
                              </span>
                            </div>

                            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
                              {items.map((it: any, itemIdx: number) => {
                                const skillName = it.nombre || it.item || `Habilidad #${itemIdx + 1}`;
                                const lvl = typeof it.nivel === 'number' ? it.nivel : parseInt(it.nivel || '0', 10);
                                const badge = getLevelBadge(lvl);

                                return (
                                  <div
                                    key={itemIdx}
                                    style={{
                                      padding: '10px 12px',
                                      borderRadius: 8,
                                      border: '1px solid #f1f5f9',
                                      background: lvl > 0 ? '#fafafa' : '#ffffff',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      gap: 10
                                    }}
                                  >
                                    <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                                      {skillName}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: '3px 8px',
                                        borderRadius: 6,
                                        background: badge.bg,
                                        color: badge.color,
                                        border: `1px solid ${badge.border}`,
                                        whiteSpace: 'nowrap',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4
                                      }}
                                    >
                                      <span>{badge.icon}</span> {badge.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: OBSERVATIONS */}
              {activeTab === 'observations' && (
                <div style={{ background: '#f8fafc', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#1e3a8a', fontWeight: 800 }}>
                    📝 Sección 3: Observaciones y Seguimiento Narrativo del Mes
                  </h3>
                  {rawObservaciones ? (
                    <div style={{ whiteSpace: 'pre-line', fontSize: 14, lineHeight: 1.7, color: '#334155' }}>
                      {rawObservaciones}
                    </div>
                  ) : (
                    <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                      ⚠️ No se registraron observaciones narrativas en la sección 3 para este formulario mensual.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: METADATA */}
              {activeTab === 'metadata' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                  <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Concurrente</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                      {form.jovenNombre}
                    </div>
                  </div>
                  <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Grupo Institucional</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1e40af', marginTop: 4 }}>
                      {form.grupo}
                    </div>
                  </div>
                  <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Período / Mes Evaluado</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                      {form.periodo}
                    </div>
                  </div>
                  <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Facilitador Asignado</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                      {form.facilitadorNombre}
                    </div>
                  </div>
                  {form.uploadedBy && (
                    <div style={{ padding: 16, background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: 12, color: '#1e40af' }}>Subido / Procesado Por</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1e3a8a', marginTop: 4 }}>
                        {form.uploadedBy}
                      </div>
                    </div>
                  )}
                  <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>ID de Base de Datos</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#64748b', marginTop: 4 }}>
                      Formulario #{form.id}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', gap: 10 }}>
            {form?.id && (
              <>
                <a
                  href={`/form?formId=${form.id}`}
                  className="ga-btn primary"
                  style={{ fontSize: 13, padding: '7px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  ✏️ Editar en Formulario Completo
                </a>
                <a
                  href={`/api/forms/${form.id}/export-excel`}
                  className="ga-btn secondary"
                  style={{ fontSize: 13, padding: '7px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  📥 Descargar Planilla Excel
                </a>
              </>
            )}
          </div>

          <button
            type="button"
            className="ga-btn"
            onClick={onClose}
            style={{ fontSize: 13, padding: '7px 16px' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
