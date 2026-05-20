"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

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

const MERGE_RULES: Record<string, { sourceType: string; label: string; requiredCount: number }> = {
  'TRIMESTRAL': { sourceType: 'MENSUAL', label: 'Trimestral (3 mensuales)', requiredCount: 3 },
  'SEMESTRAL': { sourceType: 'TRIMESTRAL', label: 'Semestral (2 trimestrales)', requiredCount: 2 },
  'ANUAL': { sourceType: 'SEMESTRAL', label: 'Anual (2 semestrales)', requiredCount: 2 },
};

export default function ReportsList() {
  const { data: session } = useSession();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Selección para fusión
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTargetType, setMergeTargetType] = useState<string>('');
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');
  
  const userRole = (session?.user as any)?.role || 'FACILITADOR';
  const isAdmin = userRole === 'ADMIN';

  const loadData = async (pageNum: number = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('pageSize', '20');
      if (typeFilter) params.set('reportType', typeFilter);
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
  }, [typeFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedItems = items.filter((it) => selectedIds.has(it.id));
  
  // Detectar automáticamente el tipo de merge basado en la selección
  const detectMergeType = (): string | null => {
    if (selectedItems.length === 0) return null;
    const types = [...new Set(selectedItems.map((it) => it.reportType || 'MENSUAL'))];
    if (types.length !== 1) return null; // Todos deben ser del mismo tipo
    
    const sourceType = types[0];
    for (const [targetType, rule] of Object.entries(MERGE_RULES)) {
      if (rule.sourceType === sourceType && selectedItems.length === rule.requiredCount) {
        return targetType;
      }
    }
    return null;
  };

  const openMergeModal = () => {
    const detected = detectMergeType();
    if (detected) {
      setMergeTargetType(detected);
    } else {
      setMergeTargetType('');
    }
    setMergeError('');
    setShowMergeModal(true);
  };

  const handleMerge = async () => {
    if (!mergeTargetType) return;
    setMerging(true);
    setMergeError('');

    try {
      const res = await fetch('/api/reports/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceReportIds: selectedItems.map((it) => parseInt(it.id)),
          targetType: mergeTargetType,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const result = await res.json();
      alert(`✅ Informe ${REPORT_TYPE_LABELS[mergeTargetType] || mergeTargetType} generado correctamente.\nPeríodo: ${result.periodo}\nPDF: ${result.pdfUrl || 'Generado'}`);
      setShowMergeModal(false);
      setSelectionMode(false);
      setSelectedIds(new Set());
      loadData(1);
    } catch (err: any) {
      setMergeError(err.message || 'Error al fusionar informes');
    } finally {
      setMerging(false);
    }
  };

  // Filtrado local
  const filteredItems = items.filter((it) => {
    const matchesSearch = !search || String(it.periodo || '').toLowerCase().includes(search.toLowerCase()) || 
                         (it.jovenNombre && String(it.jovenNombre).toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = !filter || String(it.periodo || '').toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = !status || it.status === status;
    return matchesSearch && matchesFilter && matchesStatus;
  });

  // Validación de la selección actual
  const selectedSourceTypes = [...new Set(selectedItems.map((it) => it.reportType || 'MENSUAL'))];
  const selectedYoungIds = [...new Set(selectedItems.map((it) => it.youngId))];
  const selectionValid = selectedSourceTypes.length === 1 && selectedYoungIds.length === 1;
  const detectedMerge = detectMergeType();

  return (
    <div>
      <h1>Informes generados</h1>
      <div className="ga-card" style={{ marginBottom: 12 }}>
        <div style={{ display:'flex', gap:8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
            Tipo<br />
            <select className="ga-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Todos</option>
              <option value="MENSUAL">📄 Mensual</option>
              <option value="TRIMESTRAL">📋 Trimestral</option>
              <option value="SEMESTRAL">📑 Semestral</option>
              <option value="ANUAL">📚 Anual</option>
            </select>
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
          <button 
            className={`ga-btn ${selectionMode ? 'accent' : 'secondary'}`}
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedIds(new Set());
            }}
            style={{ height: 38, whiteSpace: 'nowrap' }}
          >
            {selectionMode ? `✅ ${selectedIds.size} seleccionados` : '🔗 Fusionar informes'}
          </button>
        </div>

        {/* Barra de fusión */}
        {selectionMode && (
          <div style={{ 
            marginTop: 10, padding: '10px 14px', 
            background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8,
            display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: 13, color: '#0369A1' }}>
              Seleccioná los informes del <strong>mismo joven</strong> y <strong>mismo tipo</strong> para fusionarlos.
            </span>
            {selectedIds.size > 0 && !selectionValid && (
              <span style={{ fontSize: 12, color: '#DC2626' }}>
                ⚠️ Los informes deben ser del mismo tipo y joven.
              </span>
            )}
            {selectedIds.size > 0 && selectionValid && !detectedMerge && (
              <span style={{ fontSize: 12, color: '#D97706' }}>
                ⚠️ Cantidad incorrecta. Para Trimestral: 3 mensuales. Para Semestral: 2 trimestrales. Para Anual: 2 semestrales.
              </span>
            )}
            {detectedMerge && (
              <button 
                className="ga-btn accent" 
                style={{ fontSize: 13 }}
                onClick={openMergeModal}
              >
                🔗 Fusionar en {REPORT_TYPE_LABELS[detectedMerge]}
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
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Joven</th>
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Período</th>
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Tipo</th>
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Estado</th>
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((it) => {
              const isSelected = selectedIds.has(it.id);
              const reportType = it.reportType || 'MENSUAL';
              return (
                <tr 
                  key={it.id} 
                  style={isSelected ? { background: '#EFF6FF' } : undefined}
                  onClick={selectionMode ? () => toggleSelect(it.id) : undefined}
                >
                  {selectionMode && (
                    <td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => toggleSelect(it.id)}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                    </td>
                  )}
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>
                    {it.jovenNombre || 'Sin nombre'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{it.periodo}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>
                    <span 
                      style={{ 
                        background: REPORT_TYPE_COLORS[reportType] || '#3B82F6',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {REPORT_TYPE_LABELS[reportType] || reportType}
                    </span>
                  </td>
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
                        window.location.href = `/form?reportId=${it.id}`;
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
              );
            })}
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

      {/* Modal de fusión */}
      {showMergeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 24, maxWidth: 500, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ margin: '0 0 16px 0' }}>🔗 Fusionar informes</h2>
            
            <div style={{ marginBottom: 16 }}>
              <strong>Informes seleccionados ({selectedItems.length}):</strong>
              <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                {selectedItems.map((it) => (
                  <li key={it.id} style={{ fontSize: 14, marginBottom: 4 }}>
                    <span style={{ 
                      background: REPORT_TYPE_COLORS[it.reportType || 'MENSUAL'],
                      color: '#fff', padding: '1px 6px', borderRadius: 3, fontSize: 10, marginRight: 6
                    }}>
                      {REPORT_TYPE_LABELS[it.reportType || 'MENSUAL']}
                    </span>
                    {it.jovenNombre} — {it.periodo}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label><strong>Tipo de informe a generar:</strong></label>
              <select 
                className="ga-select" 
                value={mergeTargetType} 
                onChange={(e) => setMergeTargetType(e.target.value)}
                style={{ marginTop: 6, width: '100%' }}
              >
                <option value="">— Seleccionar —</option>
                {Object.entries(MERGE_RULES).map(([key, rule]) => (
                  <option key={key} value={key} disabled={
                    selectedSourceTypes[0] !== rule.sourceType || selectedItems.length !== rule.requiredCount
                  }>
                    {rule.label}
                    {selectedSourceTypes[0] !== rule.sourceType ? ` (requiere ${rule.sourceType})` : ''}
                    {selectedSourceTypes[0] === rule.sourceType && selectedItems.length !== rule.requiredCount ? ` (requiere ${rule.requiredCount})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {mergeError && (
              <div style={{ 
                background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 6, 
                padding: '8px 12px', marginBottom: 16, color: '#991B1B', fontSize: 13 
              }}>
                ❌ {mergeError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button 
                className="ga-btn" 
                onClick={() => setShowMergeModal(false)}
                disabled={merging}
              >
                Cancelar
              </button>
              <button 
                className="ga-btn accent" 
                onClick={handleMerge}
                disabled={!mergeTargetType || merging}
              >
                {merging ? '⏳ Fusionando con IA...' : '🔗 Fusionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
