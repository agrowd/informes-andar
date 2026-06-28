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

  const normalizeSections = (rawSecciones: any, type: string) => {
    if (!rawSecciones) return {};
    const normalized: any = {};
    for (const [key, val] of Object.entries(rawSecciones)) {
      if (typeof val === 'string') {
        normalized[key] = [{ id: '0', texto: val, fuentes: [] }];
      } else if (Array.isArray(val)) {
        normalized[key] = val.map((f: any, i: number) => ({
          id: f.id || String(i),
          texto: f.texto || '',
          fuentes: f.fuentes || []
        }));
      } else {
        normalized[key] = [];
      }
    }
    return normalized;
  };

  const denormalizeSections = (normalized: any, type: string) => {
    if (type === 'MENSUAL') {
      return normalized;
    }
    const raw: any = {};
    for (const [key, frags] of Object.entries(normalized)) {
      raw[key] = (frags as any[]).map(f => f.texto).join('\n\n');
    }
    return raw;
  };

  const handleEditStart = () => {
    if (!data?.data?.secciones) return;
    const normalized = normalizeSections(data.data.secciones, reportType);
    setEditedSections(normalized);
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
      const toSave = denormalizeSections(editedSections, reportType);
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secciones: toSave })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error guardando' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      setData((prev: any) => ({
        ...prev,
        data: { ...prev.data, secciones: toSave },
        version: result.version || prev.version,
        pdfUrl: result.pdfUrl || prev.pdfUrl
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

  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setSaving(true);
    setToasts((t) => [{ id: Date.now(), type: 'info', text: 'Subiendo y procesando Word...' }, ...t]);

    try {
      const res = await fetch(`/api/reports/${id}/upload-docx`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error al subir el archivo' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const result = await res.json();
      setToasts((t) => [{ id: Date.now(), type: 'success', text: result.message || 'Word subido y guardado exitosamente.' }, ...t]);

      // Recargar datos para refrescar la visualización
      setTimeout(() => {
        location.reload();
      }, 1500);

    } catch (err: any) {
      setToasts((t) => [{ id: Date.now(), type: 'error', text: err.message || 'Error al subir el archivo Word' }, ...t]);
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
            alert('Cuadrícula Mensual duplicada. Redirigiendo para editar el nuevo mes...');
            // Redirigir al formulario con los datos de la cuadrícula copiada
            window.location.href = `/form?formId=${result.id}`;
          } catch (error: any) {
            alert('Error: ' + (error.message || 'No se pudo copiar el informe'));
          }
        }} title="Duplicar formulario para crear la Cuadrícula Mensual del próximo mes">
          📋 Duplicar para otro mes
        </button>
        
        {/* Controles de Descarga y Carga de Word (.docx) */}
        {data.hasEditedDocx ? (
          <>
            <a href={`/api/reports/${id}/.docx`} className="ga-btn" style={{ background: '#10B981', color: '#fff', border: 'none' }} title="Descargar la versión personalizada de Word guardada en la base de datos">
              📥 Descargar Word Editado
            </a>
            <a href={`/api/reports/${id}/.docx?original=true`} className="ga-btn secondary" title="Descargar la versión de Word original generada automáticamente por IA">
              📥 Descargar Word Original
            </a>
          </>
        ) : (
          <a href={`/api/reports/${id}/.docx`} className="ga-btn" style={{ background: '#3B82F6', color: '#fff', border: 'none' }} title="Descargar el Word autogenerado">
            📥 Descargar Word (.docx)
          </a>
        )}
        
        <button className="ga-btn secondary" onClick={() => document.getElementById('docx-upload-input')?.click()} title="Subir archivo Word (.docx) editado localmente para guardarlo como la versión definitiva">
          📤 Importar Word Editado
        </button>
        <input 
          type="file" 
          id="docx-upload-input" 
          accept=".docx" 
          style={{ display: 'none' }} 
          onChange={handleDocxUpload} 
        />

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

      {/* Banner de archivo Word personalizado subido */}
      {data.hasEditedDocx && (
        <div className="ga-card" style={{ marginTop: 12, background: '#ECFDF5', borderColor: '#A7F3D0', padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 24 }}>💾</div>
          <div>
            <strong style={{ color: '#047857', fontSize: '14px' }}>Versión de Word Personalizada Activa</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#065F46' }}>
              Se está sirviendo y guardando una versión editada del Word: <strong>{data.editedDocxFilename}</strong> {data.editedAt && `(subida el ${new Date(data.editedAt).toLocaleString('es-AR')})`}.
            </p>
          </div>
        </div>
      )}

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
      {editMode ? (
        /* VISTA EDITABLE: PSEUDO-WORD (PAGINA A4 SIMULADA) */
        <div style={{
          background: '#f1f5f9',
          padding: '30px 15px',
          borderRadius: 12,
          border: '1px solid #cbd5e1',
          marginTop: 20
        }}>
          {/* Barra de herramientas flotante del Pseudo-Word */}
          <div style={{
            background: '#fff',
            padding: '12px 20px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            position: 'sticky',
            top: 10,
            zIndex: 10
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>✍️ Editor Pseudo-Word (v{data.version})</span>
              <span style={{ 
                background: '#EFF6FF', 
                color: '#1D4ED8', 
                padding: '2px 8px', 
                borderRadius: 4, 
                fontSize: 11, 
                fontWeight: 600 
              }}>
                Edición Interactiva
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="ga-btn accent" onClick={handleEditSave} disabled={saving} style={{ padding: '6px 16px' }}>
                {saving ? '⏳ Guardando...' : '💾 Guardar Todo'}
              </button>
              <button className="ga-btn" onClick={handleEditCancel} disabled={saving} style={{ padding: '6px 16px' }}>
                ❌ Cancelar
              </button>
            </div>
          </div>

          {/* Página A4 Simulada */}
          <div style={{
            background: '#fff',
            maxWidth: '800px',
            margin: '0 auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            borderRadius: 2,
            border: '1px solid #e2e8f0',
            padding: '50px 60px',
            minHeight: '1000px',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            color: '#334155',
            lineHeight: 1.6
          }}>
            {/* Encabezado formal de Granja Andar */}
            <div style={{
              borderBottom: '2px solid #3B82F6',
              paddingBottom: 15,
              marginBottom: 30,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0, color: '#1E3A8A', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>ASOCIACIÓN CIVIL ANDAR</h2>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Programa de Apoyos y Desarrollo Personal</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 700, color: '#1E3A8A', fontSize: 13 }}>INFORME EVOLUTIVO</span><br />
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Período: {data.periodo}</span>
              </div>
            </div>

            {/* Cuadro de Datos del Concurrente */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '16px 20px',
              marginBottom: 30,
              fontSize: 14,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px 20px',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.01)'
            }}>
              <div><strong>Nombre:</strong> {data.jovenNombre || rep.datosGenerales?.nombreCompleto}</div>
              <div><strong>Taller/Grupo:</strong> {data.grupo || rep.datosGenerales?.grupo}</div>
              <div><strong>Facilitadores:</strong> {rep.datosGenerales?.facilitadores}</div>
              <div><strong>Meta Anual / Sueño:</strong> {rep.datosGenerales?.metaSueno}</div>
              {rep.datosGenerales?.dni && <div><strong>DNI:</strong> {rep.datosGenerales.dni}</div>}
              {rep.datosGenerales?.obraSocial && <div><strong>Obra Social:</strong> {rep.datosGenerales.obraSocial}</div>}
            </div>

            {/* Cuerpo del Reporte (Secciones Editables) */}
            <div style={{ fontSize: 15 }}>
              {Object.entries(sections).map(([key, frags]: any) => (
                <div key={key} style={{ marginBottom: 30 }}>
                  <h4 style={{
                    color: '#1E3A8A',
                    fontSize: 14,
                    textTransform: 'uppercase',
                    letterSpacing: '0.7px',
                    borderBottom: '1px solid #E2E8F0',
                    paddingBottom: 6,
                    marginBottom: 12,
                    fontWeight: 700
                  }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  
                  {(frags as any[]).map((f: any, i: number) => (
                    <div key={f.id || i} style={{ marginBottom: 12 }}>
                      <textarea
                        style={{
                          width: '100%',
                          minHeight: 140,
                          padding: '12px 16px',
                          border: '1.5px solid #CBD5E1',
                          borderRadius: 6,
                          fontFamily: 'inherit',
                          fontSize: '14.5px',
                          lineHeight: 1.6,
                          color: '#334155',
                          background: '#fff',
                          resize: 'vertical',
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
                        }}
                        value={f.texto}
                        onChange={(e) => handleFragmentChange(key, i, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* VISTA DE LECTURA NORMAL (CON SECCIONES NORMALIZADAS) */
        Object.entries(sections).map(([key, frags]: any) => (
          <div key={key} style={{ marginTop: 24 }} className="ga-card">
            <h3 style={{ 
              color: '#1E3A8A', 
              borderBottom: '2px solid #E2E8F0', 
              paddingBottom: 6,
              textTransform: 'uppercase',
              fontSize: 15,
              fontWeight: 700
            }}>
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </h3>
            <ul style={{ listStyleType: 'none', paddingLeft: 0, marginTop: 12 }}>
              {(frags as any[]).map((f: any, i: number) => (
                <li key={f.id || i} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '15px', lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap' }}>
                    {f.texto}
                  </div>
                  {Array.isArray(f.fuentes) && f.fuentes.length > 0 && (
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                      Fuentes: {f.fuentes.join(', ')}
                    </div>
                  )}
                  {/* Comentarios */}
                  <div className="ga-card" style={{ marginTop: 12, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>💬</span>
                      <EditableText k="report.review.comments.title" fallback="Comentarios de Coordinación" tag="span" />
                    </div>
                    
                    <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                      {comments.filter((c) => c.sectionKey === key && (c.fragmentId === (f.id || String(i)))).map((c) => (
                        <li key={c._id} style={{ fontSize: 13, marginBottom: 6, color: '#475569' }}>
                          <span>{c.text}</span>
                          {c.status === 'RESOLVED' ? (
                            <span className="ga-badge approved" style={{ marginLeft: 8, fontSize: 10, background: '#D1FAE5', color: '#065F46' }}>resuelto</span>
                          ) : (
                            <button className="ga-btn" style={{ marginLeft: 8, padding: '2px 8px', fontSize: 11 }} onClick={async () => {
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

                    <div className="ga-row" style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <input 
                        className="ga-input" 
                        placeholder="Agregar observación o cambio solicitado..." 
                        style={{ flex: 1, fontSize: 13, padding: '6px 12px' }}
                        value={newComment.key === key && newComment.frag === (f.id || String(i)) ? (newComment.text || '') : ''}
                        onChange={(e) => setNewComment({ key, frag: f.id || String(i), text: e.target.value })} 
                      />
                      <button className="ga-btn" style={{ padding: '6px 14px', fontSize: 13 }} onClick={async () => {
                        const text = (newComment.key === key && newComment.frag === (f.id || String(i)) ? (newComment.text || '') : '').trim();
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
        ))
      )}

      {/* Toasts */}
      <div className="ga-toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`ga-toast ${t.type}`}>{t.text}</div>
        ))}
      </div>
    </div>
  );
}
