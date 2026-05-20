"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import EditableText from '../../_components/EditableText';

const REPORT_TYPE_LABELS: Record<string, string> = {
  'MENSUAL': '📄 Mensual',
  'TRIMESTRAL': '📋 Trimestral',
  'SEMESTRAL': '📑 Semestral',
  'ANUAL': '📚 Anual',
};

const REPORT_TYPE_COLORS: Record<string, string> = {
  'MENSUAL': '#3B82F6',
  'TRIMESTRAL': '#8B5CF6',
  'SEMESTRAL': '#F59E0B',
  'ANUAL': '#10B981',
};

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
  const [editMode, setEditMode] = useState(false);
  const [editedSections, setEditedSections] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
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
      });
  }, [id]);

  const handleEditStart = () => {
    if (!data?.data?.secciones) return;
    setEditedSections(JSON.parse(JSON.stringify(data.data.secciones)));
    setEditMode(true);
  };

  const handleEditCancel = () => {
    setEditedSections(null);
    setEditMode(false);
  };

  const handleFragmentChange = (sectionKey: string, fragIndex: number, newText: string) => {
    setEditedSections((prev: any) => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated[sectionKey] = [...(updated[sectionKey] || [])];
      updated[sectionKey][fragIndex] = { ...updated[sectionKey][fragIndex], texto: newText };
      return updated;
    });
  };

  const handleEditSave = async () => {
    if (!editedSections) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secciones: editedSections })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error guardando' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      // Actualizar datos locales
      setData((prev: any) => ({
        ...prev,
        data: { ...prev.data, secciones: editedSections },
        version: result.version || prev.version
      }));
      setEditMode(false);
      setEditedSections(null);
      setToasts((t) => [{ id: Date.now(), type: 'success', text: `Informe actualizado (v${result.version}). PDF regenerado.` }, ...t]);
    } catch (err: any) {
      setToasts((t) => [{ id: Date.now(), type: 'error', text: err.message || 'Error al guardar' }, ...t]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Cargando…</div>;
  if (!data?.data) return <div>No encontrado</div>;

  const rep = data.data;
  const sections = editMode ? editedSections : (rep.secciones || {});
  const openCount = comments.filter((c) => c.status !== 'RESOLVED').length;
  const reportType = data.reportType || rep.reportType || 'MENSUAL';

  return (
    <div>
      <EditableText k="report.review.title" fallback="Revisión de informe" tag="h1" />
      
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <div><b><EditableText k="report.review.periodo" fallback="Período:" tag="span" /></b> {data.periodo}</div>
        <span 
          className="ga-badge"
          style={{ 
            background: REPORT_TYPE_COLORS[reportType] || '#3B82F6',
            color: '#fff',
            padding: '2px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600
          }}
        >
          {REPORT_TYPE_LABELS[reportType] || reportType}
        </span>
      </div>
      
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
        
        {/* Botón editar texto inline */}
        {!editMode ? (
          <button 
            className="ga-btn" 
            style={{ background: '#EFF6FF', borderColor: '#93C5FD', color: '#1E40AF' }}
            onClick={handleEditStart}
            title="Editar el texto narrativo del informe directamente"
          >
            ✏️ Editar texto
          </button>
        ) : (
          <>
            <button 
              className="ga-btn accent"
              onClick={handleEditSave}
              disabled={saving}
              title="Guardar cambios y regenerar PDF"
            >
              {saving ? '⏳ Guardando...' : '💾 Guardar cambios'}
            </button>
            <button 
              className="ga-btn"
              onClick={handleEditCancel}
              disabled={saving}
            >
              ❌ Cancelar edición
            </button>
          </>
        )}
        
        <button className="ga-btn secondary" onClick={() => {
          window.location.href = `/form?reportId=${id}`;
        }} title="Cargar este informe en el formulario para editarlo">
          📋 Editar en formulario
        </button>
        <button className="ga-btn secondary" onClick={async () => {
          try {
            const res = await fetch(`/api/reports/${id}/copy`, { method: 'POST' });
            if (!res.ok) {
              const error = await res.json().catch(() => ({ error: 'Error copiando informe' }));
              throw new Error(error.error || `HTTP ${res.status}`);
            }
            const result = await res.json();
            alert('Formulario duplicado. Redirigiendo para editar el nuevo mes...');
            // Redirigir al formulario con los datos del borrador copiado
            window.location.href = `/form?formId=${result.id}`;
          } catch (error: any) {
            alert('Error: ' + (error.message || 'No se pudo copiar el informe'));
          }
        }} title="Duplicar formulario para crear el informe del próximo mes">
          📋 Duplicar para otro mes
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

      {editMode && (
        <div className="ga-card" style={{ marginTop: 8, background: '#EFF6FF', borderColor: '#93C5FD', padding: '8px 12px' }}>
          <small style={{ color: '#1E40AF' }}>
            ✏️ <strong>Modo edición activo.</strong> Editá los textos narrativos de cada sección. Al guardar, se regenerará automáticamente el PDF.
          </small>
        </div>
      )}

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
                {editMode ? (
                  <textarea
                    style={{
                      width: '100%',
                      minHeight: 100,
                      padding: 8,
                      border: '2px solid #93C5FD',
                      borderRadius: 6,
                      fontFamily: 'inherit',
                      fontSize: 14,
                      lineHeight: 1.5,
                      resize: 'vertical',
                      background: '#F8FAFC'
                    }}
                    value={f.texto}
                    onChange={(e) => handleFragmentChange(key, i, e.target.value)}
                  />
                ) : (
                  <div>{f.texto}</div>
                )}
                {Array.isArray(f.fuentes) && f.fuentes.length > 0 && (
                  <div style={{ color: '#666', fontSize: 12 }}>fuentes: {f.fuentes.join(', ')}</div>
                )}
                {/* Comentarios */}
                {!editMode && (
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
                )}
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
