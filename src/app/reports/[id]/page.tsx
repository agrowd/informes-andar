"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import EditableText from '../../_components/EditableText';

export default function ReportReview({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState<{ key?: string; frag?: string; text?: string }>({});
  const [toasts, setToasts] = useState<{ id: number; type: 'success'|'error'|'info'; text: string }[]>([]);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const userRole = (session?.user as any)?.role || 'FACILITADOR';
  const isAdmin = userRole === 'ADMIN';
  const canReview = ['ADMIN', 'COORDINACION'].includes(userRole);

  useEffect(() => {
    fetch(`/api/reports/${id}/.json`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(j => { 
        setData(j); 
        setLoading(false); 
      })
      .catch((err) => {
        console.error('Error cargando informe:', err);
        setLoading(false);
        setToasts((t) => [{ id: Date.now(), type: 'error', text: 'Error al cargar informe' }, ...t]);
      });
    
    fetch(`/api/reports/${id}/comments`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(j => setComments(j.items || []))
      .catch((err) => {
        console.error('Error cargando comentarios:', err);
        // No crítico, solo loguear
      });
    
    // Cargar historial de auditoría
    fetch(`/api/audit?entityType=REPORT&entityId=${id}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(j => setAuditHistory(j.items || []))
      .catch((err) => {
        console.error('Error cargando historial:', err);
        // No crítico
      });
  }, [id]);

  if (loading) return <div>Cargando…</div>;
  if (!data?.data) return <div>No encontrado</div>;

  const rep = data.data;
  const sections = rep.secciones || {};
  const openCount = comments.filter((c) => c.status !== 'RESOLVED').length;

  return (
    <div>
      <EditableText k="report.review.title" fallback="Revisión de informe" tag="h1" />
      <div><b><EditableText k="report.review.periodo" fallback="Período:" tag="span" /></b> {data.periodo}</div>
      <div className="ga-row">
        <span><b><EditableText k="report.review.estado" fallback="Estado:" tag="span" /></b> {data.status}</span>
        <span><b>Versión:</b> {data.version || 1}</span>
        {openCount>0 && <span className="ga-badge review">{openCount} comentarios abiertos</span>}
      </div>
      <div style={{ margin: '8px 0', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {canReview && (
          <button className="ga-btn accent" disabled={comments.some((c) => c.status!=='RESOLVED')} onClick={async () => {
            const r = await fetch(`/api/reports/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'APROBADO' }) });
            if (r.ok) location.reload();
            else {
              const err = await r.json().catch(() => ({ error: 'Error aprobando' }));
              setToasts((t) => [{ id: Date.now(), type: 'error', text: err.error || 'Error al aprobar informe' }, ...t]);
            }
          }}>Aprobar</button>
        )}
        {canReview && (
          <button className="ga-btn" onClick={async () => {
            const r = await fetch(`/api/reports/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'EN_REVISION' }) });
            if (r.ok) location.reload();
            else {
              const err = await r.json().catch(() => ({ error: 'Error cambiando estado' }));
              setToasts((t) => [{ id: Date.now(), type: 'error', text: err.error || 'Error al cambiar estado' }, ...t]);
            }
          }}>Marcar en revisión</button>
        )}
        {canReview && (
          <button 
            className="ga-btn" 
            style={{ background: '#FEF2F2', borderColor: '#FCA5A5', color: '#991B1B' }}
            onClick={async () => {
              if (openCount === 0) {
                if (!confirm('No hay comentarios abiertos. ¿Deseas solicitar cambios de todas formas?')) return;
              }
              const r = await fetch(`/api/reports/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CAMBIOS_SOLICITADOS' }) });
              if (r.ok) {
                location.reload();
              } else {
                const err = await r.json().catch(() => ({ error: 'Error solicitando cambios' }));
                setToasts((t) => [{ id: Date.now(), type: 'error', text: err.error || 'Error al solicitar cambios' }, ...t]);
              }
            }}
            title="Solicitar cambios al facilitador"
          >
            📝 Solicitar cambios
          </button>
        )}
        <button className="ga-btn secondary" onClick={() => {
          window.location.href = `/?reportId=${id}`;
        }} title="Cargar este informe en el formulario para editarlo">
          ✏️ Editar en formulario
        </button>
        <button className="ga-btn secondary" onClick={async () => {
          try {
            const res = await fetch(`/api/reports/${id}/copy`, { method: 'POST' });
            if (!res.ok) {
              const error = await res.json().catch(() => ({ error: 'Error copiando informe' }));
              throw new Error(error.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            alert('Informe copiado. Redirigiendo al formulario...');
            window.location.href = `/?reportId=${data.id}`;
          } catch (error: any) {
            alert('Error: ' + (error.message || 'No se pudo copiar el informe'));
          }
        }} title="Copiar informe para crear uno nuevo">
          📋 Copiar informe
        </button>
        <button className="ga-btn secondary" onClick={() => setShowHistory(!showHistory)}>
          📜 {showHistory ? 'Ocultar' : 'Ver'} historial
        </button>
        {isAdmin && (
          <button 
            className="ga-btn" 
            style={{ background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' }}
            onClick={async () => {
              if (!confirm('¿Estás seguro de que deseas ELIMINAR este informe? Esta acción no se puede deshacer.')) return;
              
              try {
                const r = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
                if (r.ok) {
                  alert('Informe eliminado correctamente');
                  window.location.href = '/reports';
                } else {
                  const err = await r.json().catch(() => ({ error: 'Error eliminando' }));
                  setToasts((t) => [{ id: Date.now(), type: 'error', text: err.error || 'Error al eliminar informe' }, ...t]);
                }
              } catch (err: any) {
                setToasts((t) => [{ id: Date.now(), type: 'error', text: err.message || 'Error al eliminar informe' }, ...t]);
              }
            }}
            title="Eliminar informe (solo ADMIN)"
          >
            🗑️ Eliminar
          </button>
        )}
        {comments.some((c) => c.status!=='RESOLVED') && <span style={{ marginLeft: 8, color: '#9A3412' }}>Hay comentarios abiertos</span>}
      </div>

      {showHistory && (
        <div className="ga-card" style={{ marginTop: 16 }}>
          <h3>Historial de cambios</h3>
          {auditHistory.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No hay registros de historial para este informe.</p>
          ) : (
            <table className="ga-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Acción</th>
                  <th>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {auditHistory.map((a) => (
                  <tr key={a._id || a.id}>
                    <td>{new Date(a.createdAt || a.created_at).toLocaleString('es-AR')}</td>
                    <td><span className="ga-badge">{a.action}</span></td>
                    <td>
                      <small style={{ color: 'var(--muted)' }}>
                        {a.meta ? JSON.stringify(a.meta, null, 2) : 'Sin detalles'}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {Object.entries(sections).map(([key, frags]: any) => (
        <div key={key} style={{ marginTop: 16 }}>
          <h3>{key}</h3>
          <ul>
            {(frags as any[]).map((f: any, i: number) => (
              <li key={f.id || i}>
                <div>{f.texto}</div>
                {Array.isArray(f.fuentes) && f.fuentes.length > 0 && (
                  <div style={{ color: '#666', fontSize: 12 }}>fuentes: {f.fuentes.join(', ')}</div>
                )}
                {/* Comentarios */}
                <div className="ga-card" style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 12, color: '#666' }}><EditableText k="report.review.comments.title" fallback="Comentarios de Coordinación" tag="span" /></div>
                  <ul>
                    {comments.filter((c) => c.sectionKey === key && (c.fragmentId === (f.id || String(i)))).map((c) => (
                      <li key={c._id} style={{ fontSize: 14 }}>
                        {c.text} {c.status==='RESOLVED' && <span className="ga-badge approved" style={{ marginLeft: 6 }}>resuelto</span>}
                        {c.status!=='RESOLVED' && (
                          <button className="ga-btn" style={{ marginLeft: 8 }} onClick={async () => {
                            const res = await fetch(`/api/reports/${id}/comments`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commentId: c._id, status: 'RESOLVED' }) });
                            if (!res.ok) {
                              setToasts((t) => [{ id: Date.now(), type: 'error', text: 'Error al marcar comentario como resuelto' }, ...t]);
                              return;
                            }
                            const j = await fetch(`/api/reports/${id}/comments`)
                              .then(r => {
                                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                                return r.json();
                              })
                              .catch(() => ({ items: [] }));
                            setComments(j.items || []);
                            setToasts((t) => [{ id: Date.now(), type: 'success', text: 'Comentario marcado como resuelto' }, ...t]);
                          }}>Marcar resuelto</button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="ga-row">
                    <input className="ga-input" placeholder="Agregar comentario" value={newComment.key===key && newComment.frag===(f.id||String(i)) ? (newComment.text||'') : ''}
                      onChange={(e) => setNewComment({ key, frag: f.id || String(i), text: e.target.value })} />
                    <button className="ga-btn" onClick={async () => {
                      const text = (newComment.key===key && newComment.frag===(f.id||String(i)) ? (newComment.text||'') : '').trim();
                      if (!text) return;
                      const r = await fetch(`/api/reports/${id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sectionKey: key, fragmentId: f.id || String(i), text }) });
                      if (!r.ok) {
                        const error = await r.json().catch(() => ({ error: 'Error agregando comentario' }));
                        setToasts((t) => [{ id: Date.now(), type: 'error', text: error.error || 'Error al agregar comentario' }, ...t]);
                        return;
                      }
                      const j = await fetch(`/api/reports/${id}/comments`)
                        .then(r => {
                          if (!r.ok) throw new Error(`HTTP ${r.status}`);
                          return r.json();
                        })
                        .catch(() => ({ items: [] }));
                      setComments(j.items || []);
                      setNewComment({});
                      setToasts((t) => [{ id: Date.now(), type: 'info', text: 'Comentario agregado. Estado: CAMBIOS_SOLICITADOS' }, ...t]);
                    }}>Guardar</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Toasts */}
      <div className="ga-toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`ga-toast ${t.type}`}>{t.text}</div>
        ))}
      </div>
    </div>
  );
}


