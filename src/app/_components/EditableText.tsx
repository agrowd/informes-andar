"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function EditableText({ k, fallback, tag = 'span', className = '' }: { k: string; fallback: string; tag?: 'span'|'h1'|'h2'|'h3'|'label'|'div'; className?: string }) {
  const { data: session } = useSession();
  const [text, setText] = useState<string>(fallback);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const loadedRemoteRef = useRef(false);
  const lastFallbackRef = useRef(fallback);
  const snapshotRef = useRef<string>('');
  
  // Verificar si el usuario puede editar
  const userRole = (session?.user as any)?.role || 'FACILITADOR';
  const canEdit = ['ADMIN', 'COORDINACION'].includes(userRole);

  useEffect(() => {
    fetch(`/api/editable-text/${encodeURIComponent(k)}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { 
        if (d?.text) { 
          setText(d.text); 
        } 
        loadedRemoteRef.current = true; 
      })
      .catch((err) => {
        console.error(`Error cargando texto editable [${k}]:`, err);
        // No crítico, usar fallback
      });
  }, [k]);

  // Si el fallback cambia y no hay valor remoto, sincronizar texto mostrado
  useEffect(() => {
    const prev = lastFallbackRef.current;
    lastFallbackRef.current = fallback;
    if (!loadedRemoteRef.current) {
      if (!text || text === '' || text === prev) {
        setText(fallback);
      }
    }
  }, [fallback]);

  const onSave = async () => {
    try {
      setSaving(true); setError(null);
      const r = await fetch(`/api/editable-text/${encodeURIComponent(k)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || 'Error al guardar');
      }
      const result = await r.json();
      if (result.text) {
        setText(result.text);
        loadedRemoteRef.current = true;
      }
      setEditing(false);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const closeModal = useCallback(() => {
    setEditing(false);
    setSaving(false);
    setError(null);
    setConfirmingClose(false);
  }, []);

  const requestClose = useCallback((force = false) => {
    const hasChanges = text !== snapshotRef.current;
    if (hasChanges && !force) {
      setConfirmingClose(true);
      return;
    }
    if (hasChanges) {
      setText(snapshotRef.current);
    }
    closeModal();
  }, [text, closeModal]);

  const handleOpen = () => {
    snapshotRef.current = text;
    setError(null);
    setEditing(true);
  };

  const Wrapper: any = tag as any;

  // Cerrar con Escape
  useEffect(() => {
    if (!editing) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        if (confirmingClose) {
          setConfirmingClose(false);
          return;
        }
        requestClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, confirmingClose, requestClose]);

  return (
    <span className={`editable-text ${className}`}>
      <Wrapper className="editable-text__content">{text || fallback}</Wrapper>
      {canEdit && (
        <button type="button" className="ga-btn secondary" title="Editar" onClick={handleOpen} style={{ marginLeft: 6 }}>
          ✎
        </button>
      )}
      {editing && canEdit && (
        <>
          <div className="editable-text__modal" onClick={(e) => { if (e.currentTarget === e.target) { requestClose(); } }}>
            <div className="editable-text__dialog ga-card" style={{ padding: 12 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 6 }}>
                <b>Editar texto</b>
                <button type="button" className="ga-btn" onClick={(e) => { e.stopPropagation(); requestClose(); }} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}>✕</button>
              </div>
              <textarea value={text} onChange={(e) => setText(e.target.value)} className="ga-textarea-large" />
              {error && <div style={{ color: 'crimson', marginTop: 6 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button type="button" className="ga-btn primary" onClick={(e) => { e.stopPropagation(); onSave(); }} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" className="ga-btn" onClick={(e) => { e.stopPropagation(); requestClose(); }}>Cancelar</button>
              </div>
            </div>
          </div>
          {confirmingClose && (
            <div className="editable-text__confirm" onClick={(e) => { if (e.currentTarget === e.target) { setConfirmingClose(false); } }}>
              <div className="editable-text__dialog ga-card" style={{ padding: 16, maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
                <strong>Hay cambios sin guardar</strong>
                <p style={{ margin: '8px 0 14px' }}>Si salís ahora vas a perder los cambios hechos en este texto. ¿Querés salir sin guardar?</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="ga-btn" style={{ background: '#e53935', color: '#fff' }} onClick={() => requestClose(true)}>Salir sin guardar</button>
                  <button type="button" className="ga-btn primary" onClick={() => setConfirmingClose(false)}>Seguir editando</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <style>{`.editable-text__modal{position:fixed;inset:0;background:rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;z-index:1000}.editable-text__confirm{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1100}`}</style>
    </span>
  );
}
