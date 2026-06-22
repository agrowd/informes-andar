"use client";
import { useEffect, useState } from 'react';

export default function FormsList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showDraftsOnly, setShowDraftsOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Selección para fusión trimestral
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generatingTrimestral, setGeneratingTrimestral] = useState(false);

  const loadData = async (pageNum: number = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('pageSize', '20');
      const r = await fetch(`/api/forms?${params.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setItems(j.items || []); 
      setTotalPages(j.totalPages || 1);
      setTotal(j.total || 0);
      setPage(pageNum);
      setLoading(false);
    } catch (err) {
      console.error('Error cargando borradores:', err);
      setLoading(false);
      alert('Error al cargar borradores');
    }
  };

  useEffect(() => {
    loadData(1);
  }, []);

  const changeStatus = async (id: string, status: string) => {
    const statusMessages: Record<string, string> = {
      'EN_REVISION': 'Enviar a revisión',
      'APROBADO': 'Aprobar',
      'BORRADOR': 'Marcar como borrador'
    };
    const action = statusMessages[status] || 'Cambiar estado';
    if (!confirm(`¿Estás seguro de que deseas ${action.toLowerCase()} este borrador?`)) return;
    
    try {
      const res = await fetch(`/api/forms/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Error cambiando estado' }));
        throw new Error(error.error || `HTTP ${res.status}`);
      }
      setItems((prev) => prev.map((it) => it._id === id ? { ...it, status } : it));
      alert('✅ Estado actualizado');
    } catch (error: any) {
      console.error('Error cambiando estado:', error);
      alert('Error: ' + (error.message || 'No se pudo actualizar el estado'));
    }
  };

  const duplicateForm = async (id: string) => {
    if (!confirm('¿Deseas duplicar este borrador para crear uno nuevo basado en este?')) return;
    try {
      const res = await fetch(`/api/forms/${id}/copy`, { method: 'POST' });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Error duplicando formulario' }));
        throw new Error(error.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      alert('✅ Borrador duplicado correctamente. Serás redirigido para editarlo.');
      window.location.href = `/form?formId=${data.id}`;
    } catch (error: any) {
      console.error('Error duplicando borrador:', error);
      alert('Error: ' + (error.message || 'No se pudo duplicar el borrador'));
    }
  };

  // Selección de borradores
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedItems = items.filter(it => selectedIds.has(it._id || it.id));
  const selectedYoungIds = [...new Set(selectedItems.map(it => it.youngId))];
  const sameYoung = selectedYoungIds.length === 1;
  const countIsValid = selectedItems.length === 3;
  const selectionValid = sameYoung && countIsValid;

  const handleGenerateTrimestral = async () => {
    if (!selectionValid) return;
    
    setGeneratingTrimestral(true);
    try {
      const ids = selectedItems.map(it => it._id || it.id);
      const res = await fetch('/api/reports/trimestral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formIds: ids })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error generando informe trimestral' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const result = await res.json();
      alert('✅ Informe Trimestral generado con éxito. Se iniciará la descarga en formato Word.');
      
      // Limpiar selección
      setSelectedIds(new Set());
      setSelectionMode(false);
      
      // Descargar el DOCX
      window.location.href = `/api/reports/${result.reportId}/.docx`;
    } catch (error: any) {
      console.error('Error al generar informe trimestral:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setGeneratingTrimestral(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1>Borradores</h1>
        <button 
          className={`ga-btn ${selectionMode ? 'accent' : 'secondary'}`}
          onClick={() => {
            setSelectionMode(!selectionMode);
            if (selectionMode) setSelectedIds(new Set());
          }}
        >
          {selectionMode ? `✅ ${selectedIds.size} seleccionados` : '🔗 Fusión Trimestral'}
        </button>
      </div>

      <div className="ga-card" style={{ marginBottom: 12 }}>
        <div style={{ display:'flex', gap:8, flexWrap: 'wrap' }}>
          <label style={{ flex:1, minWidth: 200 }}>
            Buscar<br />
            <input 
              className="ga-input" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Buscar por período, facilitador o joven..."
            />
          </label>
          <label style={{ flex:1, minWidth: 150 }}>
            Filtrar por período<br />
            <input 
              className="ga-input" 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)} 
              placeholder="Ej: 2025-01"
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20 }}>
            <input 
              type="checkbox" 
              checked={showDraftsOnly} 
              onChange={(e) => setShowDraftsOnly(e.target.checked)}
            />
            <span>Mostrar solo borradores</span>
          </label>
        </div>

        {/* Barra de fusión trimestral */}
        {selectionMode && (
          <div style={{ 
            marginTop: 12, padding: '10px 14px', 
            background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8,
            display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: 13, color: '#0369A1' }}>
              Seleccione exactamente <strong>3 borradores</strong> del <strong>mismo joven</strong>.
            </span>
            {selectedIds.size > 0 && !sameYoung && (
              <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>
                ⚠️ Los borradores deben pertenecer al mismo concurrente.
              </span>
            )}
            {selectedIds.size > 0 && sameYoung && !countIsValid && (
              <span style={{ fontSize: 12, color: '#D97706', fontWeight: 600 }}>
                ⚠️ Se requieren exactamente 3 borradores (seleccionados: {selectedIds.size}).
              </span>
            )}
            {selectionValid && (
              <button 
                className="ga-btn accent" 
                onClick={handleGenerateTrimestral}
                disabled={generatingTrimestral}
                style={{ fontSize: 13 }}
              >
                {generatingTrimestral ? '⏳ Generando con IA...' : '🔗 Generar Informe Trimestral (Word)'}
              </button>
            )}
            <button 
              className="ga-btn" 
              style={{ fontSize: 12 }}
              onClick={() => setSelectedIds(new Set())}
            >
              Deseleccionar todo
            </button>
          </div>
        )}
      </div>

      {loading ? 'Cargando…' : (
        <div className="ga-card">
        <table className="ga-table">
          <thead>
            <tr>
              {selectionMode && <th style={{ border: '1px solid #ccc', padding: 4, width: 40 }}></th>}
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Período</th>
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Facilitador</th>
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Concurrente (Joven)</th>
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Estado</th>
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Última actualización</th>
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.filter((it) => {
              const searchLower = search.toLowerCase();
              const matchesSearch = !search || 
                String(it.periodo || '').toLowerCase().includes(searchLower) ||
                String(it.facilitadorNombre || '').toLowerCase().includes(searchLower) ||
                String(it.jovenNombre || '').toLowerCase().includes(searchLower);
              const matchesFilter = !filter || String(it.periodo || '').toLowerCase().includes(filter.toLowerCase());
              const matchesDraft = !showDraftsOnly || it.status === 'BORRADOR';
              return matchesSearch && matchesFilter && matchesDraft;
            }).map((it) => {
              const id = it._id || it.id;
              const isSelected = selectedIds.has(id);
              return (
                <tr 
                  key={id}
                  style={isSelected ? { background: '#EFF6FF' } : undefined}
                  onClick={selectionMode ? () => toggleSelect(id) : undefined}
                >
                  {selectionMode && (
                    <td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => toggleSelect(id)}
                        onClick={(e) => e.stopPropagation()} // Prevenir doble trigger
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                    </td>
                  )}
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{it.periodo}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4, fontSize: 13 }}>
                    {it.facilitadorNombre || 'Sin facilitador'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 4, fontSize: 13 }}>
                    {it.jovenNombre || 'Sin joven asignado'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>
                    <span className={`ga-badge ${it.status==='APROBADO'?'approved':it.status==='EN_REVISION'?'review':'draft'}`}>{it.status || 'BORRADOR'}</span>
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 4, fontSize: 12, color: 'var(--muted)' }}>
                    {it.updatedAt ? new Date(it.updatedAt).toLocaleDateString('es-AR') : it.createdAt ? new Date(it.createdAt).toLocaleDateString('es-AR') : '—'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      <a 
                        href={`/form?formId=${id}`} 
                        className="ga-btn secondary" 
                        style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }} 
                        onClick={(e) => {
                          if (selectionMode) e.stopPropagation();
                        }}
                      >
                        ✏️ Editar
                      </a>
                      <a 
                        href={`/api/forms/${id}/export-excel`} 
                        className="ga-btn secondary" 
                        style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }}
                        onClick={(e) => {
                          if (selectionMode) e.stopPropagation();
                        }}
                      >
                        📥 Excel
                      </a>
                      <button 
                        className="ga-btn secondary" 
                        onClick={(e) => {
                          if (selectionMode) e.stopPropagation();
                          duplicateForm(id);
                        }} 
                        style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }}
                        title="Crear una copia de este borrador"
                      >
                        📋 Duplicar
                      </button>
                      <a 
                        href={`/api/forms/${id}/.json`} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ fontSize: 12, padding: '4px 8px' }}
                        onClick={(e) => {
                          if (selectionMode) e.stopPropagation();
                        }}
                      >
                        JSON
                      </a>
                      <button 
                        className="ga-btn" 
                        style={{ background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B', fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }}
                        onClick={async (e) => {
                          if (selectionMode) e.stopPropagation();
                          if (!confirm('¿Estás seguro de que deseas ELIMINAR este borrador? Esta acción no se puede deshacer.')) return;
                          try {
                            const r = await fetch(`/api/forms/${id}`, { method: 'DELETE' });
                            if (r.ok) {
                              alert('Borrador eliminado correctamente');
                              loadData(page);
                            } else {
                              const err = await r.json().catch(() => ({ error: 'Error eliminando' }));
                              alert(`Error: ${err.error || 'No se pudo eliminar'}`);
                            }
                          } catch (err: any) {
                            alert(`Error: ${err.message || 'Error al eliminar'}`);
                          }
                        }}
                        title="Eliminar borrador"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>
            Mostrando {items.filter((it) => {
              const searchLower = search.toLowerCase();
              const matchesSearch = !search || 
                String(it.periodo || '').toLowerCase().includes(searchLower) ||
                String(it.facilitadorNombre || '').toLowerCase().includes(searchLower) ||
                String(it.jovenNombre || '').toLowerCase().includes(searchLower);
              const matchesFilter = !filter || String(it.periodo || '').toLowerCase().includes(filter.toLowerCase());
              const matchesDraft = !showDraftsOnly || it.status === 'BORRADOR';
              return matchesSearch && matchesFilter && matchesDraft;
            }).length} de {total} borradores
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button 
              className="ga-btn" 
              onClick={() => loadData(page - 1)} 
              disabled={page === 1 || loading}
            >
              ← Anterior
            </button>
            <span style={{ fontSize: 14, color: 'var(--text)' }}>
              Página {page} de {totalPages}
            </span>
            <button 
              className="ga-btn" 
              onClick={() => loadData(page + 1)} 
              disabled={page >= totalPages || loading}
            >
              Siguiente →
            </button>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
