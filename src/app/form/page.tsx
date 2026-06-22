"use client";
import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DEFAULT_TALLERES, ChecklistTaller, ChecklistItem } from '@/lib/form/defaultChecklists';

const INITIAL_DATA = {
  datosGenerales: {
    nombreCompleto: '',
    periodo: '',
    taller: '',
    youngId: '',
    facilitadorNombre: ''
  },
  talleres: [] as ChecklistTaller[],
  observaciones: ''
};

const PERIODS = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

export default function ChecklistFormPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [data, setData] = useState<any>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [youngs, setYoungs] = useState<any[]>([]);
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [toasts, setToasts] = useState<{ id: number; type: 'success'|'error'|'info'; text: string }[]>([]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [{ id, type, text }, ...prev]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // 1. Cargar lista de jóvenes
  useEffect(() => {
    const loadYoungs = async () => {
      try {
        const r = await fetch('/api/youngs');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        setYoungs(j.items || []);
      } catch (err) {
        console.error('Error cargando jóvenes:', err);
        addToast('Error al cargar lista de jóvenes', 'error');
      }
    };
    loadYoungs();
  }, []);

  // 2. Cargar datos del formulario (existente o nuevo)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get('formId');
    const youngIdParam = urlParams.get('youngId');

    const loadInitialData = async () => {
      setLoading(true);
      try {
        if (formId) {
          setCurrentFormId(formId);
          const r = await fetch(`/api/forms/${formId}/.json`);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const result = await r.json();
          if (result.data) {
            const loaded = { ...result.data };
            if (!loaded.talleres || loaded.talleres.length === 0) {
              loaded.talleres = JSON.parse(JSON.stringify(DEFAULT_TALLERES));
            }
            setData(loaded);
            lastSavedDataRef.current = JSON.stringify(loaded);
            localStorage.setItem('checklistFormData', lastSavedDataRef.current);
            addToast(`Borrador mensual cargado para ${loaded.datosGenerales?.nombreCompleto || 'joven'}`, 'success');
          }
        } else {
          // Es un formulario nuevo
          const base = JSON.parse(JSON.stringify(INITIAL_DATA));
          base.talleres = JSON.parse(JSON.stringify(DEFAULT_TALLERES));
          
          if (youngIdParam) {
            base.datosGenerales.youngId = youngIdParam;
          }
          if (session?.user?.name) {
            base.datosGenerales.facilitadorNombre = session.user.name;
          }
          
          setData(base);
          setCurrentFormId(null);
          lastSavedDataRef.current = JSON.stringify(base);
          localStorage.setItem('checklistFormData', lastSavedDataRef.current);
        }
      } catch (err: any) {
        console.error('Error cargando borrador:', err);
        addToast('Error al cargar datos del borrador', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [session]);

  // 3. Auto-completar datos del joven cuando cambia youngId
  useEffect(() => {
    const youngId = data.datosGenerales?.youngId;
    if (!youngId || youngs.length === 0) return;

    const selectedYoung = youngs.find(y => String(y.id || y._id) === String(youngId));
    if (selectedYoung) {
      setData((prev: any) => {
        const next = { ...prev };
        next.datosGenerales = {
          ...next.datosGenerales,
          youngId,
          nombreCompleto: selectedYoung.nombreCompleto || '',
          taller: selectedYoung.taller || prev.datosGenerales.taller || ''
        };
        return next;
      });
    }
  }, [data.datosGenerales?.youngId, youngs]);

  // 4. Autosave Hook
  useEffect(() => {
    if (loading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const dataString = JSON.stringify(data);
    if (dataString === lastSavedDataRef.current) return;

    // Si no están los campos clave, guardar solo en localStorage localmente
    if (!data.datosGenerales?.youngId || !data.datosGenerales?.periodo) {
      localStorage.setItem('checklistFormData', dataString);
      return;
    }

    setSaving('saving');
    localStorage.setItem('checklistFormData', dataString);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const url = '/api/forms';
        const method = currentFormId ? 'PUT' : 'POST';
        const body = currentFormId
          ? JSON.stringify({ id: currentFormId, data })
          : JSON.stringify({ data, saveAsDraft: true });

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `HTTP ${res.status}`);
        }

        const result = await res.json();
        if (result.id && !currentFormId) {
          setCurrentFormId(result.id);
          // Actualizar URL con el formId sin recargar la página
          const newUrl = `${window.location.pathname}?formId=${result.id}`;
          window.history.replaceState({ path: newUrl }, '', newUrl);
        }

        lastSavedDataRef.current = dataString;
        setSaving('saved');
        setTimeout(() => setSaving('idle'), 2000);
      } catch (err: any) {
        console.error('Error en guardado automático:', err);
        setSaving('error');
        addToast(`Error al guardar automáticamente: ${err.message}`, 'error');
        setTimeout(() => setSaving('idle'), 3000);
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [data, currentFormId, loading]);

  // 5. Guardado manual
  const handleSaveManual = async () => {
    if (!data.datosGenerales?.youngId) {
      alert('Debe seleccionar un joven.');
      return;
    }
    if (!data.datosGenerales?.periodo) {
      alert('Debe seleccionar el período.');
      return;
    }

    setSaving('saving');
    try {
      const url = '/api/forms';
      const method = currentFormId ? 'PUT' : 'POST';
      const body = currentFormId
        ? JSON.stringify({ id: currentFormId, data })
        : JSON.stringify({ data, saveAsDraft: true });

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }

      const result = await res.json();
      if (result.id && !currentFormId) {
        setCurrentFormId(result.id);
        const newUrl = `${window.location.pathname}?formId=${result.id}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }

      lastSavedDataRef.current = JSON.stringify(data);
      setSaving('saved');
      addToast('Borrador guardado exitosamente', 'success');
      setTimeout(() => setSaving('idle'), 2000);
    } catch (err: any) {
      console.error('Error en guardado manual:', err);
      setSaving('error');
      alert(`Error al guardar: ${err.message}`);
    }
  };

  // 6. Modificaciones de Talleres y Habilidades
  const updateDatosGenerales = (field: string, val: any) => {
    setData((prev: any) => ({
      ...prev,
      datosGenerales: {
        ...prev.datosGenerales,
        [field]: val
      }
    }));
  };

  const handleTallerNameChange = (tallerIdx: number, newName: string) => {
    setData((prev: any) => {
      const next = { ...prev };
      next.talleres[tallerIdx].nombre = newName;
      return next;
    });
  };

  const handleAddTaller = () => {
    const name = prompt('Ingrese el nombre del nuevo taller:');
    if (!name || !name.trim()) return;
    setData((prev: any) => ({
      ...prev,
      talleres: [...prev.talleres, { nombre: name.trim().toUpperCase(), items: [] }]
    }));
    addToast(`Taller "${name}" agregado`, 'success');
  };

  const handleDeleteTaller = (tallerIdx: number) => {
    const taller = data.talleres[tallerIdx];
    if (!confirm(`¿Estás seguro de que deseas eliminar el taller "${taller.nombre}" y todos sus ítems?`)) return;
    setData((prev: any) => {
      const next = { ...prev };
      next.talleres.splice(tallerIdx, 1);
      return next;
    });
    addToast(`Taller eliminado`, 'info');
  };

  const handleItemChange = (tallerIdx: number, itemIdx: number, field: keyof ChecklistItem, value: any) => {
    setData((prev: any) => {
      const next = { ...prev };
      next.talleres[tallerIdx].items[itemIdx][field] = value;
      return next;
    });
  };

  const handleItemNameChange = (tallerIdx: number, itemIdx: number, newName: string) => {
    setData((prev: any) => {
      const next = { ...prev };
      next.talleres[tallerIdx].items[itemIdx].nombre = newName;
      return next;
    });
  };

  const handleAddItem = (tallerIdx: number) => {
    const name = prompt('Ingrese el nombre de la habilidad o ítem:');
    if (!name || !name.trim()) return;
    setData((prev: any) => {
      const next = { ...prev };
      next.talleres[tallerIdx].items.push({
        nombre: name.trim(),
        enseñado: false,
        apoyo: false,
        sola: false
      });
      return next;
    });
    addToast(`Habilidad agregada`, 'success');
  };

  const handleDeleteItem = (tallerIdx: number, itemIdx: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta habilidad?')) return;
    setData((prev: any) => {
      const next = { ...prev };
      next.talleres[tallerIdx].items.splice(itemIdx, 1);
      return next;
    });
    addToast('Habilidad eliminada', 'info');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', fontSize: 18, color: '#666' }}>
        ⏳ Cargando borrador mensual...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-sans, system-ui)' }}>
      {/* 1. Header con estado de guardado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, color: '#1e3a8a', fontSize: '28px', fontWeight: 800 }}>📋 Grilla de Checklist Mensual</h1>
          <p style={{ margin: '4px 0 0 0', color: '#666' }}>Complete las habilidades de cada taller y guarde los resultados.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saving === 'saving' && <span style={{ color: '#d97706', fontSize: 14, fontWeight: 500 }}>⏳ Guardando...</span>}
          {saving === 'saved' && <span style={{ color: '#16a34a', fontSize: 14, fontWeight: 500 }}>✓ Cambios guardados</span>}
          {saving === 'error' && <span style={{ color: '#dc2626', fontSize: 14, fontWeight: 500 }}>❌ Error al guardar</span>}
          
          <button className="ga-btn secondary" onClick={() => router.push('/')}>Volver</button>
          {currentFormId && (
            <a 
              href={`/api/forms/${currentFormId}/export-excel`}
              className="ga-btn secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              📥 Exportar Excel
            </a>
          )}
          <button className="ga-btn primary" onClick={handleSaveManual}>Guardar borrador</button>
        </div>
      </div>

      {/* 2. Datos Generales */}
      <div className="ga-card" style={{ marginBottom: 24, padding: 20, border: '1px solid #bfdbfe', background: '#f8fafc' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a' }}>1. Información General</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Joven / Concurrente:</span>
            <select 
              className="ga-select" 
              value={data.datosGenerales?.youngId || ''} 
              onChange={(e) => updateDatosGenerales('youngId', e.target.value)}
              disabled={!!currentFormId}
            >
              <option value="">— Seleccionar joven —</option>
              {youngs.map(y => (
                <option key={y.id || y._id} value={y.id || y._id}>{y.nombreCompleto}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Período (Mes):</span>
            <select 
              className="ga-select" 
              value={data.datosGenerales?.periodo || ''} 
              onChange={(e) => updateDatosGenerales('periodo', e.target.value)}
            >
              <option value="">— Seleccionar período —</option>
              {PERIODS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Taller Principal:</span>
            <input 
              type="text" 
              className="ga-input" 
              value={data.datosGenerales?.taller || ''} 
              onChange={(e) => updateDatosGenerales('taller', e.target.value)} 
              placeholder="Ej: DEPORTE"
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Facilitador/a responsable:</span>
            <input 
              type="text" 
              className="ga-input" 
              value={data.datosGenerales?.facilitadorNombre || ''} 
              onChange={(e) => updateDatosGenerales('facilitadorNombre', e.target.value)} 
              placeholder="Nombre del facilitador"
            />
          </label>
        </div>
      </div>

      {/* 3. Grilla de Checklists de Talleres */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: '#1e3a8a', fontSize: '20px' }}>2. Desempeño en Talleres y Habilidades</h2>
          <button className="ga-btn secondary" onClick={handleAddTaller}>➕ Agregar Taller</button>
        </div>

        {data.talleres.map((taller: ChecklistTaller, tIdx: number) => (
          <div key={tIdx} className="ga-card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 12 }}>
            {/* Header del Taller */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
              <input 
                type="text" 
                value={taller.nombre} 
                onChange={(e) => handleTallerNameChange(tIdx, e.target.value.toUpperCase())}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  fontSize: 16, 
                  fontWeight: 700, 
                  color: '#1e293b', 
                  width: '70%',
                  padding: '2px 6px',
                  borderRadius: 4
                }}
                onFocus={(e) => e.target.style.background = '#fff'}
                onBlur={(e) => e.target.style.background = 'transparent'}
                title="Haga clic para renombrar el taller"
              />
              <button 
                type="button" 
                onClick={() => handleDeleteTaller(tIdx)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#ef4444', 
                  cursor: 'pointer', 
                  fontSize: 14,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                🗑️ Eliminar Taller
              </button>
            </div>

            {/* Habilidades en este Taller */}
            <div style={{ padding: '12px 20px' }}>
              {taller.items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontStyle: 'italic', fontSize: 14 }}>
                  No hay habilidades añadidas a este taller aún.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '10px 8px', color: '#475569', fontWeight: 600 }}>Habilidad / Ítem</th>
                      <th style={{ textAlign: 'center', padding: '10px 8px', color: '#475569', fontWeight: 600, width: '120px' }}>Enseñado</th>
                      <th style={{ textAlign: 'center', padding: '10px 8px', color: '#475569', fontWeight: 600, width: '120px' }}>Con Apoyo</th>
                      <th style={{ textAlign: 'center', padding: '10px 8px', color: '#475569', fontWeight: 600, width: '120px' }}>Sola</th>
                      <th style={{ textAlign: 'center', padding: '10px 8px', width: '60px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {taller.items.map((item: ChecklistItem, iIdx: number) => (
                      <tr key={iIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px' }}>
                          <input 
                            type="text" 
                            value={item.nombre} 
                            onChange={(e) => handleItemNameChange(tIdx, iIdx, e.target.value)}
                            style={{ 
                              background: 'transparent', 
                              border: 'none', 
                              fontSize: 14, 
                              color: '#334155', 
                              width: '100%',
                              padding: '4px 6px',
                              borderRadius: 4
                            }}
                            onFocus={(e) => e.target.style.background = '#f8fafc'}
                            onBlur={(e) => e.target.style.background = 'transparent'}
                          />
                        </td>
                        
                        {/* Checkbox Enseñado */}
                        <td 
                          style={{ 
                            textAlign: 'center', 
                            padding: '8px', 
                            background: item.enseñado ? '#eff6ff' : 'transparent',
                            transition: 'background 0.2s'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={item.enseñado || false} 
                            onChange={(e) => handleItemChange(tIdx, iIdx, 'enseñado', e.target.checked)}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                          />
                        </td>

                        {/* Checkbox Apoyo */}
                        <td 
                          style={{ 
                            textAlign: 'center', 
                            padding: '8px', 
                            background: item.apoyo ? '#fffbeb' : 'transparent',
                            transition: 'background 0.2s'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={item.apoyo || false} 
                            onChange={(e) => handleItemChange(tIdx, iIdx, 'apoyo', e.target.checked)}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                          />
                        </td>

                        {/* Checkbox Sola */}
                        <td 
                          style={{ 
                            textAlign: 'center', 
                            padding: '8px', 
                            background: item.sola ? '#fcf7ff' : 'transparent',
                            transition: 'background 0.2s'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={item.sola || false} 
                            onChange={(e) => handleItemChange(tIdx, iIdx, 'sola', e.target.checked)}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                          />
                        </td>

                        {/* Eliminar Ítem */}
                        <td style={{ textAlign: 'center', padding: '8px' }}>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteItem(tIdx, iIdx)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}
                            title="Eliminar habilidad"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Botón agregar ítem */}
              <div style={{ marginTop: 12 }}>
                <button 
                  type="button" 
                  className="ga-btn secondary" 
                  style={{ padding: '6px 12px', fontSize: 13 }}
                  onClick={() => handleAddItem(tIdx)}
                >
                  ➕ Agregar Habilidad
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Observaciones */}
      <div className="ga-card" style={{ marginBottom: 40, padding: 20 }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#1e3a8a' }}>3. Observaciones y detalles del mes</h3>
        <textarea 
          className="ga-textarea-large" 
          rows={6}
          value={data.observaciones || ''} 
          onChange={(e) => setData((prev: any) => ({ ...prev, observaciones: e.target.value }))}
          placeholder="Escriba aquí comentarios adicionales, observaciones destacadas o detalles específicos de la evolución del joven durante este mes..."
          style={{ width: '100%', fontSize: 14, padding: 12 }}
        />
      </div>

      {/* Toasts de feedback */}
      <div style={{ position: 'fixed', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 1000 }}>
        {toasts.map(t => (
          <div 
            key={t.id} 
            style={{ 
              padding: '12px 20px', 
              borderRadius: 8, 
              color: '#fff', 
              fontSize: 14,
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              background: t.type === 'success' ? '#16a34a' : t.type === 'error' ? '#dc2626' : '#2563eb',
              animation: 'slideIn 0.3s ease'
            }}
          >
            {t.text}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
