"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import EditableText from '@/app/_components/EditableText';

export default function Dashboard() {
  const { data: session } = useSession();
  const [forms, setForms] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [youngs, setYoungs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [period, setPeriod] = useState('');
  
  // Verificar si el usuario puede ver el tablero general
  const userRole = (session?.user as any)?.role || 'FACILITADOR';
  const canViewGeneralDashboard = ['ADMIN', 'DIRECTOR', 'COORDINACION'].includes(userRole);

  const load = async () => {
    try {
      const [f, r, y, s] = await Promise.all([
        fetch('/api/forms')
          .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .catch((err) => {
            console.error('Error cargando borradores:', err);
            return { items: [] };
          }),
        fetch('/api/reports')
          .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .catch((err) => {
            console.error('Error cargando informes:', err);
            return { items: [] };
          }),
        fetch('/api/youngs')
          .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .catch((err) => {
            console.error('Error cargando jóvenes:', err);
            return { items: [] };
          }),
        fetch('/api/dashboard/stats')
          .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .catch((err) => {
            console.error('Error cargando estadísticas:', err);
            return null;
          }),
      ]);
      setForms(f.items || []);
      setReports(r.items || []);
      setYoungs(y.items || []);
      setStats(s);
    } catch (err) {
      console.error('Error en load del dashboard:', err);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredReports = reports.filter((r:any) => !period || String(r.periodo||'').toLowerCase().includes(period.toLowerCase()));
  const cnt = (s: string) => filteredReports.filter((r:any) => r.status === s).length;
  const totals = stats?.reportsByStatus || {
    BORRADOR: cnt('BORRADOR'),
    EN_REVISION: cnt('EN_REVISION'),
    CAMBIOS_SOLICITADOS: cnt('CAMBIOS_SOLICITADOS'),
    APROBADO: cnt('APROBADO'),
  };

  const copyReport = async (reportId: string) => {
    if (!confirm('¿Deseas copiar este informe para crear uno nuevo?')) return;
    try {
      const res = await fetch(`/api/reports/${reportId}/copy`, { method: 'POST' });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Error copiando informe' }));
        throw new Error(error.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      alert('Informe copiado correctamente. Serás redirigido al formulario para editarlo.');
      // Redirigir al formulario con el ID del informe copiado
      window.location.href = `/form?reportId=${data.id}`;
    } catch (error: any) {
      console.error('Error al copiar informe:', error);
      alert('Error: ' + (error.message || 'No se pudo copiar el informe'));
    }
  };

  const copyForm = async (formId: string) => {
    if (!confirm('¿Deseas duplicar este borrador para crear uno nuevo basado en este?')) return;
    try {
      const res = await fetch(`/api/forms/${formId}/copy`, { method: 'POST' });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Error duplicando borrador' }));
        throw new Error(error.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      alert('Borrador duplicado correctamente. Serás redirigido para editarlo.');
      window.location.href = `/form?formId=${data.id}`;
    } catch (error: any) {
      console.error('Error al duplicar borrador:', error);
      alert('Error: ' + (error.message || 'No se pudo duplicar el borrador'));
    }
  };

  // Agrupar informes por grupo
  const reportsByGroup = filteredReports.reduce((acc: any, report: any) => {
    const grupo = report.grupo || 'Sin grupo';
    if (!acc[grupo]) {
      acc[grupo] = [];
    }
    acc[grupo].push(report);
    return acc;
  }, {});

  // Obtener todos los grupos únicos (de youngs) para mostrar los 10 grupos
  const allGroups = Array.from(new Set(youngs.map((y: any) => y.taller).filter(Boolean))).sort();
  
  // Limitar a los primeros 10 grupos más importantes o todos si son menos de 10
  const topGroups = allGroups.slice(0, 10);

  const exportData = (type: string) => {
    window.location.href = `/api/dashboard/export?format=csv&type=${type}`;
  };

  return (
    <div>
      <EditableText k="dash.titulo" fallback="Tablero" tag="h1" />
      <div className="ga-card" style={{ marginBottom: 12 }}>
        <div className="ga-row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <label style={{ flex:1, minWidth: 200 }}>
            <EditableText k="dash.filtroPeriodo" fallback="Filtrar por período" tag="span" /><br />
            <input className="ga-input" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Ej: 2025-01..2025-06" />
          </label>
          <button className="ga-btn" onClick={load}>Actualizar</button>
          {canViewGeneralDashboard && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="ga-btn secondary" onClick={() => exportData('reports')} title="Exportar informes a CSV">
                📊 Exportar informes
              </button>
              <button className="ga-btn secondary" onClick={() => exportData('forms')} title="Exportar borradores a CSV">
                📝 Exportar borradores
              </button>
              <button className="ga-btn secondary" onClick={() => exportData('youngs')} title="Exportar jóvenes a CSV">
                👥 Exportar jóvenes
              </button>
            </div>
          )}
        </div>
      </div>
      {!canViewGeneralDashboard && (
        <div className="ga-card" style={{ marginBottom: 12, padding: 16, background: '#f0f7ff', border: '1px solid #bfdbfe' }}>
          <p style={{ margin: 0, color: '#1e40af' }}>
            <strong>Vista de facilitador:</strong> Solo puedes ver tus propios borradores e informes.
          </p>
        </div>
      )}
      
      <div className="ga-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        <div className="ga-card">
          <div style={{ fontSize: 12, color: '#666' }}>Informes realizados</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{stats?.reportsTotal || filteredReports.length}</div>
          <a href="/reports">Ver informes</a>
        </div>
        <div className="ga-card" style={{ border: stats?.missingReports > 0 ? '2px solid #f59e0b' : undefined }}>
          <div style={{ fontSize: 12, color: '#666' }}>Informes faltantes</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: stats?.missingReports > 0 ? '#f59e0b' : undefined }}>
            {stats?.missingReports || 0}
          </div>
          {stats?.missingReports > 0 && (
            <span style={{ fontSize: 12, color: '#666' }}>Borradores sin informe</span>
          )}
        </div>
        <div className="ga-card">
          <div style={{ fontSize: 12, color: '#666' }}>Borradores pendientes</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{stats?.formsPending || forms.filter((f: any) => f.status === 'BORRADOR').length}</div>
          <a href="/forms">Ver borradores</a>
        </div>
        <div className="ga-card">
          <div style={{ fontSize: 12, color: '#666' }}>Jóvenes</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{youngs.length}</div>
          <a href="/youngs">Gestionar jóvenes</a>
        </div>
      </div>

      {stats?.missingReportsList && stats.missingReportsList.length > 0 && (
        <div className="ga-card" style={{ marginTop: 12, border: '2px solid #f59e0b', background: '#FFF7ED' }}>
          <h3 style={{ color: '#f59e0b', marginTop: 0 }}>⚠️ Informes faltantes</h3>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
            Los siguientes borradores aún no tienen informe asociado:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.missingReportsList.map((item: any, idx: number) => (
              <div key={idx} style={{ 
                padding: '12px', 
                background: 'white', 
                borderRadius: 8, 
                border: '1px solid #FED7AA',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}>
                <div style={{ fontWeight: 500 }}>Período: {item.periodo || 'Sin período'}</div>
                <a 
                  href={`/forms/${item.formId}`} 
                  className="ga-btn secondary"
                  style={{ alignSelf: 'flex-start', fontSize: 13 }}
                >
                  Ver borrador →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ga-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 12 }}>
        <div className="ga-card">
          <EditableText k="dash.latestForms" fallback="Últimos borradores" tag="h3" />
          <ul>
            {forms.slice(0, 5).map((f) => (
              <li key={f._id || f.id} style={{ marginBottom: 4 }}>
                {f.periodo || '—'} — {f.status || 'BORRADOR'}
                <div style={{ display: 'inline-flex', gap: 8, marginLeft: 8 }}>
                  <a href={`/form?formId=${f._id || f.id}`} style={{ fontSize: 12 }}>Editar</a>
                  <button 
                    onClick={() => copyForm(f._id || f.id)}
                    className="ga-btn secondary"
                    style={{ fontSize: 11, padding: '2px 6px' }}
                    title="Duplicar borrador"
                  >
                    📋 Duplicar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="ga-card">
          <EditableText k="dash.latestReports" fallback="Últimos informes" tag="h3" />
          <ul>
            {filteredReports.slice(0, 5).map((r) => (
              <li key={r.id}>
                {r.periodo || '—'} — {r.status || 'BORRADOR'}
                <a href={`/reports/${r.id}`} style={{ marginLeft: 8, fontSize: 12 }}>Ver</a>
                <button 
                  onClick={() => copyReport(r.id)} 
                  className="ga-btn secondary"
                  style={{ marginLeft: 8, fontSize: 12, padding: '4px 8px' }}
                  title="Copiar informe"
                >
                  📋 Copiar
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="ga-card" style={{ marginTop: 12 }}>
        <EditableText k="dash.statusTitle" fallback="Estado de informes" tag="h3" />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap: 8 }}>
          <div><div className="ga-badge draft"><EditableText k="dash.status.draft" fallback="BORRADOR" tag="span" /></div><div style={{ fontSize:24,fontWeight:700 }}>{totals.BORRADOR}</div></div>
          <div><div className="ga-badge review"><EditableText k="dash.status.review" fallback="EN_REVISION" tag="span" /></div><div style={{ fontSize:24,fontWeight:700 }}>{totals.EN_REVISION}</div></div>
          <div><div className="ga-badge draft"><EditableText k="dash.status.changes" fallback="CAMBIOS_SOLICITADOS" tag="span" /></div><div style={{ fontSize:24,fontWeight:700 }}>{totals.CAMBIOS_SOLICITADOS}</div></div>
          <div><div className="ga-badge approved"><EditableText k="dash.status.approved" fallback="APROBADO" tag="span" /></div><div style={{ fontSize:24,fontWeight:700 }}>{totals.APROBADO}</div></div>
        </div>
      </div>

      {canViewGeneralDashboard && (
        <div className="ga-card" style={{ marginTop: 12 }}>
          <EditableText k="dash.informesPorGrupo" fallback="Informes por Grupo" tag="h3" />
          <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
            Visualización de informes cargados por cada grupo (máximo 10 informes por grupo)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {topGroups.map((grupo: string) => {
              const grupoReports = (reportsByGroup[grupo] || []).slice(0, 10); // Máximo 10 informes por grupo
              const grupoTotal = (reportsByGroup[grupo] || []).length;
              const grupoCompleted = grupoReports.filter((r: any) => r.status === 'APROBADO').length;
              
              return (
                <div key={grupo} className="ga-card" style={{ border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{grupo}</h4>
                    <span style={{ fontSize: 12, color: '#666' }}>
                      {grupoTotal} {grupoTotal === 1 ? 'informe' : 'informes'}
                    </span>
                  </div>
                  
                  {grupoReports.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {grupoReports.map((report: any) => (
                        <div 
                          key={report.id} 
                          style={{ 
                            padding: '8px 12px', 
                            background: '#f9fafb', 
                            borderRadius: 6,
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>
                              {report.jovenNombre || 'Sin nombre'}
                            </div>
                            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                              {report.periodo || 'Sin período'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className={`ga-badge ${report.status?.toLowerCase() === 'aprobado' ? 'approved' : report.status?.toLowerCase() === 'en_revision' ? 'review' : 'draft'}`} style={{ fontSize: 10 }}>
                              {report.status || 'BORRADOR'}
                            </span>
                            <a 
                              href={`/reports/${report.id}`} 
                              style={{ fontSize: 12, color: '#667eea' }}
                              title="Ver informe"
                            >
                              Ver →
                            </a>
                          </div>
                        </div>
                      ))}
                      {grupoTotal > 10 && (
                        <div style={{ fontSize: 12, color: '#666', textAlign: 'center', padding: '8px', fontStyle: 'italic' }}>
                          ... y {grupoTotal - 10} informe{grupoTotal - 10 !== 1 ? 's' : ''} más
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#999', fontStyle: 'italic', padding: '12px 0' }}>
                      Aún no hay informes cargados para este grupo
                    </div>
                  )}
                  
                  {grupoCompleted > 0 && (
                    <div style={{ marginTop: 12, padding: '8px', background: '#f0fdf4', borderRadius: 6, fontSize: 12, color: '#166534' }}>
                      ✓ {grupoCompleted} informe{grupoCompleted !== 1 ? 's' : ''} aprobado{grupoCompleted !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            })}
            
            {topGroups.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: '#666' }}>
                No hay grupos registrados aún
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
