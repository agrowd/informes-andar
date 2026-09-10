"use client";
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import UploadManualDocxModal from '@/app/_components/UploadManualDocxModal';

export default function InicioPage() {
  const { data: session } = useSession();
  const [forms, setForms] = useState<any[]>([]);
  const [formsTotal, setFormsTotal] = useState(0);
  const [reports, setReports] = useState<any[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [youngs, setYoungs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const userRole = (session?.user as any)?.role || 'FACILITADOR';
  const isPrivileged = ['ADMIN', 'DIRECTOR', 'COORDINACION'].includes(userRole);

  const handleDeleteReport = async (reportId: string, jovenNombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas ELIMINAR el informe de "${jovenNombre || 'este concurrente'}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error al eliminar' }));
        alert(`Error: ${err.error || 'No se pudo eliminar el informe'}`);
        return;
      }
      alert('Informe eliminado correctamente');
      load();
    } catch (err: any) {
      alert('Error: ' + (err?.message || 'No se pudo eliminar el informe'));
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [f, r, y] = await Promise.all([
        fetch('/api/forms?pageSize=12')
          .then(res => res.ok ? res.json() : { items: [], total: 0 })
          .catch(err => {
            console.error('Error cargando cuadrículas:', err);
            return { items: [], total: 0 };
          }),
        fetch('/api/reports?pageSize=8')
          .then(res => res.ok ? res.json() : { items: [], total: 0 })
          .catch(err => {
            console.error('Error cargando informes:', err);
            return { items: [], total: 0 };
          }),
        fetch('/api/youngs?pageSize=100')
          .then(res => res.ok ? res.json() : { items: [], total: 0 })
          .catch(err => {
            console.error('Error cargando jóvenes:', err);
            return { items: [], total: 0 };
          }),
      ]);
      setForms(f.items || []);
      setFormsTotal(f.total || f.items?.length || 0);
      setReports(r.items || []);
      setReportsTotal(r.total || r.items?.length || 0);
      setYoungs(y.items || []);
    } catch (err) {
      console.error('Error en load del inicio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Resumen agrupado por Grupo institucional oficial (los talleres son las actividades internas)
  const talleresSummary = useMemo(() => {
    const map: Record<string, { count: number; facilitador: string }> = {
      'Emprendedores': { count: 0, facilitador: 'Analía Almada' },
      'Artesanos': { count: 0, facilitador: 'Leonardo Villamayor' },
      'Buenos Mozos': { count: 0, facilitador: 'Marina Trejo' },
      'Atrapasueños': { count: 0, facilitador: 'Matías Maciel' },
      'Empoderadas': { count: 0, facilitador: 'Ana Reartes' },
      'Clave de Sol': { count: 0, facilitador: 'Juliana Arias' },
      'Promotores': { count: 0, facilitador: 'Lemuel Sola' }
    };

    youngs.forEach(y => {
      let t = y.taller;
      if (t === 'Atrapa Sueños') t = 'Atrapasueños';
      if (t && map[t]) {
        map[t].count++;
      } else if (t) {
        if (!map[t]) map[t] = { count: 0, facilitador: 'Facilitador asignado' };
        map[t].count++;
      }
    });

    return Object.entries(map);
  }, [youngs]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* 1. ENCABEZADO PRINCIPAL DE INICIO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, color: '#1e3a8a', fontWeight: 800 }}>Inicio</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: 14 }}>
            Sistema de Seguimiento Curricular, Cuadrículas Mensuales e Informes · Granja Andar
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/form" className="ga-btn primary" style={{ padding: '9px 18px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <span>➕</span> Cargar Cuadrícula Mensual
          </a>
          <a href="/youngs" className="ga-btn secondary" style={{ padding: '9px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <span>👥</span> Concurrentes
          </a>
          <a href="/reports" className="ga-btn secondary" style={{ padding: '9px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <span>📄</span> Informes
          </a>
        </div>
      </div>

      {/* 2. TARJETAS DE INDICADORES CLAVE (KPIs) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <a href="/youngs" className="ga-card" style={{ padding: 20, textDecoration: 'none', color: 'inherit', borderLeft: '4px solid #2563eb', transition: 'all 0.2s ease', display: 'block' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>👥 Concurrentes Activos</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>{youngs.length}</div>
          <div style={{ fontSize: 12, color: '#2563eb', marginTop: 6, fontWeight: 600 }}>Ver listado de jóvenes →</div>
        </a>

        <a href="/forms" className="ga-card" style={{ padding: 20, textDecoration: 'none', color: 'inherit', borderLeft: '4px solid #10b981', transition: 'all 0.2s ease', display: 'block' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>📋 Cuadrículas Mensuales</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>{formsTotal || forms.length}</div>
          <div style={{ fontSize: 12, color: '#10b981', marginTop: 6, fontWeight: 600 }}>Gestionar cuadrículas →</div>
        </a>

        <a href="/reports" className="ga-card" style={{ padding: 20, textDecoration: 'none', color: 'inherit', borderLeft: '4px solid #8b5cf6', transition: 'all 0.2s ease', display: 'block' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>📄 Informes Trimestrales</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>{reportsTotal || reports.length}</div>
          <div style={{ fontSize: 12, color: '#8b5cf6', marginTop: 6, fontWeight: 600 }}>Ver informes Word / PDF →</div>
        </a>

        <a href="/youngs" className="ga-card" style={{ padding: 20, textDecoration: 'none', color: 'inherit', borderLeft: '4px solid #f59e0b', transition: 'all 0.2s ease', display: 'block' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>🏫 Talleres Activos</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>{talleresSummary.length}</div>
          <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 6, fontWeight: 600 }}>Ver talleres y grupos →</div>
        </a>
      </div>

      {/* 3. PARTE NUEVA PRINCIPAL: ÚLTIMOS INFORMES MENSUALES EDITADOS */}
      <div className="ga-card" style={{ padding: 26, marginBottom: 28, borderRadius: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
              <span>📋</span> Últimos Informes Mensuales Editados
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
              Cuadrículas mensuales de habilidades y observaciones modificadas recientemente
            </p>
          </div>
          <a href="/forms" className="ga-btn secondary" style={{ fontSize: 13, padding: '7px 15px', fontWeight: 600 }}>
            Ver todas las cuadrículas ({formsTotal || forms.length}) →
          </a>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Cargando cuadrículas recientes...</div>
        ) : forms.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 8 }}>
            No hay cuadrículas mensuales registradas.
          </div>
        ) : (
          <div className="ga-table-mobile-wrap">
            <table className="ga-table">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th>Concurrente</th>
                  <th>Grupo / Taller</th>
                  <th>Período</th>
                  <th>Facilitador</th>
                  <th>Última Modificación</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center', width: 220 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {forms.slice(0, 10).map(f => {
                  const formId = f._id || f.id;
                  const tallerName = f.data?.datosGenerales?.taller || f.data?.datosGenerales?.grupo || 'Sin grupo';
                  return (
                    <tr key={formId} className="ga-table-row-hover">
                      <td>
                        <strong style={{ color: '#1e293b', fontSize: 14 }}>{f.jovenNombre || 'Sin nombre'}</strong>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: 6,
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #dbeafe',
                          textTransform: 'uppercase',
                          letterSpacing: 0.3
                        }}>
                          {tallerName}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#334155' }}>{f.periodo || '—'}</strong>
                      </td>
                      <td style={{ fontSize: 13, color: '#475569' }}>
                        {f.facilitadorNombre || 'Sin facilitador'}
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>
                        {formatDateTime(f.updatedAt || f.updated_at)}
                      </td>
                      <td>
                        <span className={`ga-badge ${f.status === 'APROBADO' ? 'approved' : f.status === 'EN_REVISION' ? 'review' : 'draft'}`} style={{ fontSize: 11 }}>
                          {f.status || 'BORRADOR'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'center' }}>
                          <a 
                            href={`/form?formId=${formId}`} 
                            className="ga-btn primary" 
                            style={{ fontSize: 12, padding: '5px 11px', fontWeight: 600 }}
                            title="Editar esta cuadrícula mensual"
                          >
                            ✏️ Editar
                          </a>
                          <a 
                            href={`/api/forms/${formId}/export-excel`} 
                            className="ga-btn secondary" 
                            style={{ fontSize: 12, padding: '5px 9px' }}
                            title="Descargar planilla Excel"
                          >
                            📥 Excel
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. DISTRIBUCIÓN POR GRUPOS */}
      <div className="ga-card" style={{ padding: 26, marginBottom: 28, borderRadius: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
              <span>🏫</span> Grupos Institucionales
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
              Distribución oficial de concurrentes por grupo (los talleres y actividades formativas se desarrollan al interior de cada grupo)
            </p>
          </div>
          <a href="/youngs" className="ga-btn secondary" style={{ fontSize: 13, padding: '7px 15px', fontWeight: 600 }}>
            Ver todos los concurrentes →
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {talleresSummary.map(([taller, info]) => (
            <div
              key={taller}
              style={{
                padding: '18px 20px',
                background: '#f8fafc',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#1e3a8a', fontWeight: 700 }}>{taller}</h3>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: info.count > 0 ? '#dbeafe' : '#f1f5f9',
                    color: info.count > 0 ? '#1e40af' : '#64748b'
                  }}>
                    {info.count} {info.count === 1 ? 'joven' : 'jóvenes'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
                  👤 Responsable: <strong style={{ color: '#334155' }}>{info.facilitador}</strong>
                </div>
              </div>
              <a
                href={`/youngs?search=${encodeURIComponent(taller)}`}
                style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                Ver concurrentes de este grupo →
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* 5. ÚLTIMOS INFORMES TRIMESTRALES (WORD / PDF) */}
      {reports.length > 0 && (
        <div className="ga-card" style={{ padding: 26, borderRadius: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 19, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
                <span>📄</span> Últimos Informes Trimestrales (Word / PDF)
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
                Informes evolutivos trimestrales consolidados para visualización y descarga
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="ga-btn primary"
                onClick={() => setShowUploadModal(true)}
                style={{ fontSize: 13, padding: '7px 15px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span>📤</span> Subir Informe Word (.docx)
              </button>
              <a href="/reports" className="ga-btn secondary" style={{ fontSize: 13, padding: '7px 15px', fontWeight: 600 }}>
                Ver todos los informes ({reportsTotal || reports.length}) →
              </a>
            </div>
          </div>

          <div className="ga-table-mobile-wrap">
            <table className="ga-table">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th>Concurrente</th>
                  <th>Grupo</th>
                  <th>Facilitador</th>
                  <th>Período</th>
                  <th>Fecha de Generación</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right', width: isPrivileged ? 260 : 200 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 6).map(r => (
                  <tr key={r.id} className="ga-table-row-hover">
                    <td>
                      <strong style={{ color: '#1e293b', fontSize: 14 }}>{r.jovenNombre || r.joven_nombre || 'Sin nombre'}</strong>
                    </td>
                    <td>
                      <span className="ga-badge" style={{ fontSize: 11, fontWeight: 700, background: '#f1f5f9', color: '#1e3a8a' }}>
                        {r.grupo || 'Sin grupo'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: '#334155', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span>👤</span> {r.facilitadorNombre || r.facilitador_nombre || 'Sin facilitador'}
                      </span>
                    </td>
                    <td><strong style={{ color: '#334155' }}>{r.periodo || '—'}</strong></td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{formatDateTime(r.createdAt || r.created_at)}</td>
                    <td>
                      <span className={`ga-badge ${r.status?.toLowerCase() === 'aprobado' ? 'approved' : r.status?.toLowerCase() === 'en_revision' ? 'review' : 'draft'}`} style={{ fontSize: 11 }}>
                        {r.status || 'BORRADOR'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <a href={`/reports/${r.id}`} className="ga-btn secondary" style={{ fontSize: 12, padding: '5px 11px', fontWeight: 600 }}>
                          Ver Informe
                        </a>
                        <a href={`/api/reports/${r.id}/.docx`} className="ga-btn primary" style={{ fontSize: 12, padding: '5px 11px', fontWeight: 600 }}>
                          📥 Word
                        </a>
                        {isPrivileged && (
                          <button
                            type="button"
                            className="ga-btn"
                            title="Eliminar informe"
                            onClick={() => handleDeleteReport(r.id, r.jovenNombre || r.joven_nombre)}
                            style={{
                              background: '#fee2e2',
                              borderColor: '#fca5a5',
                              color: '#991b1b',
                              fontSize: 12,
                              padding: '5px 9px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para subir informe DOCX manual */}
      <UploadManualDocxModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          setShowUploadModal(false);
          load();
        }}
      />
    </div>
  );
}
