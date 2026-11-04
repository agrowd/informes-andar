"use client";
import React, { useState, useEffect } from 'react';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string | number | null;
  reportTitle?: string;
}

const SECTION_LABELS: Record<string, string> = {
  metaAlcanzada: '1. Meta Alcanzada / Eje Central',
  participacion: '2. Participación en las Actividades',
  integracionRelaciones: '3. Relaciones Interpersonales y Compañerismo',
  actividadesRelacionadas: '4. Actividades y Desempeño Práctico',
  vidaIndependiente: '5. Vida Independiente y Autonomía',
  habilidadesViajar: '6. Habilidades de Desplazamiento y Movilidad',
  desarrolloPersonal: '7. Desarrollo Personal y Aprendizaje',
  metasDeportivas: '8. Metas de Actividad Física y Deporte Adaptado',
  metasSociales: '9. Metas de Inclusión Social y Comunitaria',
  dimensionesCalidadVida: '10. Dimensiones de Calidad de Vida',
  actividadesComplementarias: '11. Actividades Complementarias y Recreativas',
  mejoraCalidadVida: '12. Proyección y Plan de Apoyos'
};

export default function ReportPreviewModal({
  isOpen,
  onClose,
  reportId,
  reportTitle
}: ReportPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any | null>(null);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'narrative' | 'sections' | 'metadata'>('narrative');

  useEffect(() => {
    if (!isOpen || !reportId) {
      setReport(null);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    fetch(`/api/reports/${reportId}/.json`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setReport(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching report details:', err);
        setError('No se pudo cargar la vista previa del informe.');
        setLoading(false);
      });
  }, [isOpen, reportId]);

  if (!isOpen) return null;

  const data = report?.data || {};
  const datosGenerales = data.datosGenerales || {};
  const secciones = data.secciones || {};
  const isFinalReport = !!(data.parte1_informeFinal || data.parte2_planAbordaje || data.esInformeFinal);

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
            background: isFinalReport
              ? 'linear-gradient(135deg, #b45309 0%, #d97706 100%)'
              : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22 }}>{isFinalReport ? '🏆' : '📄'}</span>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#ffffff' }}>
                {datosGenerales.nombreCompleto || reportTitle || `Informe #${reportId}`}
              </h2>
              {datosGenerales.grupo && (
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
                  {datosGenerales.grupo}
                </span>
              )}
              <span
                style={{
                  background: '#ffffff',
                  color: isFinalReport ? '#b45309' : '#1e3a8a',
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '2px 10px',
                  borderRadius: 12
                }}
              >
                {report?.periodo || datosGenerales.periodo || 'Período'}
              </span>
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span>👤 Facilitador: <strong>{datosGenerales.facilitadorNombre || datosGenerales.facilitador || 'Sin facilitador'}</strong></span>
              {datosGenerales.uploadedBy && (
                <span style={{ opacity: 0.85 }}>(subido por {datosGenerales.uploadedBy})</span>
              )}
              <span>Estado: <strong>{report?.status || 'BORRADOR'}</strong></span>
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
            onClick={() => setActiveTab('narrative')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'narrative' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'narrative' ? '3px solid #2563eb' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>📖</span> Contenido Evolutivo Completo
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'sections' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'sections' ? '3px solid #2563eb' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>📑</span> Secciones ({Object.keys(secciones).length || 12})
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
            <span>ℹ️</span> Ficha Institucional
          </button>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#ffffff' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div style={{ fontWeight: 600 }}>Cargando informe...</div>
            </div>
          )}

          {error && (
            <div style={{ padding: 16, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, color: '#991b1b' }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && !error && report && (
            <>
              {/* TAB 1: NARRATIVE VIEW */}
              {activeTab === 'narrative' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {Object.entries(secciones).map(([key, value]: any) => {
                    const label = SECTION_LABELS[key] || key;
                    if (!value || typeof value !== 'string' || value.trim().length === 0) return null;

                    return (
                      <div
                        key={key}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: '18px 20px'
                        }}
                      >
                        <h3 style={{ margin: '0 0 10px 0', fontSize: 15, color: '#1e3a8a', fontWeight: 800 }}>
                          {label}
                        </h3>
                        <div style={{ fontSize: 14, lineHeight: 1.7, color: '#334155', whiteSpace: 'pre-line' }}>
                          {value}
                        </div>
                      </div>
                    );
                  })}

                  {Object.keys(secciones).length === 0 && data.textoBrutoOriginal && (
                    <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, whiteSpace: 'pre-line', fontSize: 14, lineHeight: 1.7 }}>
                      {data.textoBrutoOriginal}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SECTIONS LIST */}
              {activeTab === 'sections' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                  {Object.entries(SECTION_LABELS).map(([k, label]) => {
                    const hasContent = !!(secciones[k] && secciones[k].trim().length > 0);
                    return (
                      <div
                        key={k}
                        style={{
                          padding: 14,
                          borderRadius: 10,
                          border: `1px solid ${hasContent ? '#dcfce7' : '#fee2e2'}`,
                          background: hasContent ? '#f0fdf4' : '#fff5f5'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: hasContent ? '#166534' : '#991b1b' }}>
                            {label}
                          </span>
                          <span style={{ fontSize: 14 }}>{hasContent ? '✓' : '⚠️'}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                          {hasContent ? `${secciones[k].length} caracteres redactados` : 'Sección pendiente'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: METADATA */}
              {activeTab === 'metadata' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                  <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Concurrente</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                      {datosGenerales.nombreCompleto}
                    </div>
                  </div>
                  <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Grupo Institucional</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1e40af', marginTop: 4 }}>
                      {datosGenerales.grupo}
                    </div>
                  </div>
                  <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Período Consolidado</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                      {report.periodo || datosGenerales.periodo}
                    </div>
                  </div>
                  <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Facilitador</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                      {datosGenerales.facilitadorNombre || datosGenerales.facilitador}
                    </div>
                  </div>
                  {datosGenerales.uploadedBy && (
                    <div style={{ padding: 16, background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: 12, color: '#1e40af' }}>Subido / Procesado Por</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1e3a8a', marginTop: 4 }}>
                        {datosGenerales.uploadedBy}
                      </div>
                    </div>
                  )}
                  <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>ID de Informe</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#64748b', marginTop: 4 }}>
                      Informe #{reportId} (v{report.version || 1})
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
            {reportId && (
              <>
                <a
                  href={`/reports/${reportId}`}
                  className="ga-btn secondary"
                  style={{ fontSize: 13, padding: '7px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  🔍 Abrir Página de Edición
                </a>
                <a
                  href={`/api/reports/${reportId}/.docx`}
                  className="ga-btn primary"
                  style={{ fontSize: 13, padding: '7px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  📥 Descargar Word (.docx)
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
