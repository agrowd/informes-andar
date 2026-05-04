"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function ReportsList() {
  const { data: session } = useSession();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  const userRole = (session?.user as any)?.role || 'FACILITADOR';
  const isAdmin = userRole === 'ADMIN';

  const loadData = async (pageNum: number = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('pageSize', '20');
      const r = await fetch(`/api/reports?${params.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setItems(j.items || []); 
      setTotalPages(j.totalPages || 1);
      setTotal(j.total || 0);
      setPage(pageNum);
      setLoading(false);
    } catch (err) {
      console.error('Error cargando informes:', err);
      setLoading(false);
      alert('Error al cargar informes');
    }
  };

  useEffect(() => {
    loadData(1);
  }, []);

  // Recargar cuando cambian filtros (solo búsqueda local ahora)
  const filteredItems = items.filter((it) => {
    const matchesSearch = !search || String(it.periodo || '').toLowerCase().includes(search.toLowerCase()) || 
                         (it.jovenNombre && String(it.jovenNombre).toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = !filter || String(it.periodo || '').toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = !status || it.status === status;
    return matchesSearch && matchesFilter && matchesStatus;
  });

  return (
    <div>
      <h1>Informes generados</h1>
      <div className="ga-card" style={{ marginBottom: 12 }}>
        <div style={{ display:'flex', gap:8, flexWrap: 'wrap' }}>
          <label style={{ flex:1, minWidth: 200 }}>
            Buscar<br />
            <input 
              className="ga-input" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Buscar por período, nombre..."
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
          <label>
            Estado<br />
            <select className="ga-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="BORRADOR">BORRADOR</option>
              <option value="EN_REVISION">EN_REVISION</option>
              <option value="CAMBIOS_SOLICITADOS">CAMBIOS_SOLICITADOS</option>
              <option value="APROBADO">APROBADO</option>
            </select>
          </label>
        </div>
      </div>
      {loading ? 'Cargando…' : (
        <div className="ga-card">
        <table className="ga-table">
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Período</th>
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Estado</th>
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((it) => (
              <tr key={it.id}>
                <td style={{ border: '1px solid #ccc', padding: 4 }}>{it.periodo}</td>
                <td style={{ border: '1px solid #ccc', padding: 4 }}>
                  <span className={`ga-badge ${it.status==='APROBADO'?'approved':it.status==='EN_REVISION'?'review':it.status==='CAMBIOS_SOLICITADOS'?'draft':'draft'}`}>{it.status || 'BORRADOR'}</span>
                  {typeof it.openComments==='number' && it.openComments>0 && (
                    <span className="ga-badge review" style={{ marginLeft: 6 }}>{it.openComments} comentarios</span>
                  )}
                </td>
                <td style={{ border: '1px solid #ccc', padding: 4 }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    {it.pdfUrl ? <a href={it.pdfUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '4px 8px' }}>PDF</a> : <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>}
                    <a href={`/api/reports/${it.id}/.json`} style={{ fontSize: 12, padding: '4px 8px' }} target="_blank" rel="noreferrer">JSON</a>
                    {it.status === 'APROBADO' && <button className="ga-btn" style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }} onClick={async () => {
                      const r = await fetch(`/api/reports/${it.id}/pdf`, { method: 'POST' });
                      const j = await r.json();
                      if (j.pdfUrl) window.open(j.pdfUrl, '_blank');
                    }}>Re-PDF</button>}
                    <button className="ga-btn accent" style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }} onClick={async () => {
                      await fetch(`/api/reports/${it.id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'APROBADO' }) });
                      location.reload();
                    }}>Aprobar</button>
                    <a className="ga-btn secondary" style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }} href={`/reports/${it.id}`}>Revisar</a>
                    <button className="ga-btn secondary" style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }} onClick={() => {
                      window.location.href = `/?reportId=${it.id}`;
                    }} title="Cargar en formulario para editar">
                      ✏️ Editar
                    </button>
                    <a style={{ fontSize: 12, padding: '4px 8px' }} href={`/api/reports/${it.id}/.docx`}>DOCX</a>
                    {isAdmin && (
                      <button 
                        className="ga-btn" 
                        style={{ background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B', fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }}
                        onClick={async () => {
                          if (!confirm('¿Estás seguro de que deseas ELIMINAR este informe? Esta acción no se puede deshacer.')) return;
                          try {
                            const r = await fetch(`/api/reports/${it.id}`, { method: 'DELETE' });
                            if (r.ok) {
                              alert('Informe eliminado');
                              loadData(page);
                            } else {
                              const err = await r.json().catch(() => ({ error: 'Error eliminando' }));
                              alert(`Error: ${err.error || 'No se pudo eliminar el informe'}`);
                            }
                          } catch (err: any) {
                            alert(`Error: ${err.message || 'Error al eliminar informe'}`);
                          }
                        }}
                        title="Eliminar informe (solo ADMIN)"
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
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>
            Mostrando {filteredItems.length} de {total} informes
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


