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
      console.error('Error cargando formularios:', err);
      setLoading(false);
      alert('Error al cargar formularios');
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
    if (!confirm(`¿Estás seguro de que deseas ${action.toLowerCase()} este formulario?`)) return;
    
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
    if (!confirm('¿Deseas duplicar este formulario para crear uno nuevo basado en este?')) return;
    try {
      const res = await fetch(`/api/forms/${id}/copy`, { method: 'POST' });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Error duplicando formulario' }));
        throw new Error(error.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      alert('✅ Formulario duplicado correctamente. Serás redirigido para editarlo.');
      window.location.href = `/form?formId=${data.id}`;
    } catch (error: any) {
      console.error('Error duplicando formulario:', error);
      alert('Error: ' + (error.message || 'No se pudo duplicar el formulario'));
    }
  };

  return (
    <div>
      <h1>Formularios</h1>
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
      </div>
      {loading ? 'Cargando…' : (
        <div className="ga-card">
        <table className="ga-table">
          <thead>
            <tr>
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
            }).map((it) => (
              <tr key={it._id}>
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
                    <a href={`/form?formId=${it._id}`} className="ga-btn secondary" style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }} title="Abrir en formulario para editar">
                      ✏️ Editar
                    </a>
                    <button 
                      className="ga-btn primary" 
                      style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }}
                      onClick={async () => {
                        if (!confirm('¿Deseas generar un informe desde este formulario? Se abrirá en el formulario para generar.')) return;
                        window.location.href = `/form?formId=${it._id}`;
                      }}
                      title="Generar informe desde este formulario"
                    >
                      📄 Generar
                    </button>
                    <button 
                      className="ga-btn secondary" 
                      onClick={() => duplicateForm(it._id)} 
                      style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }}
                      title="Crear una copia de este formulario"
                    >
                      📋 Duplicar
                    </button>
                    <a href={`/api/forms/${it._id}/.json`} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '4px 8px' }}>JSON</a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>
            Mostrando             {items.filter((it) => {
              const searchLower = search.toLowerCase();
              const matchesSearch = !search || 
                String(it.periodo || '').toLowerCase().includes(searchLower) ||
                String(it.facilitadorNombre || '').toLowerCase().includes(searchLower) ||
                String(it.jovenNombre || '').toLowerCase().includes(searchLower);
              const matchesFilter = !filter || String(it.periodo || '').toLowerCase().includes(filter.toLowerCase());
              const matchesDraft = !showDraftsOnly || it.status === 'BORRADOR';
              return matchesSearch && matchesFilter && matchesDraft;
            }).length} de {total} formularios
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


