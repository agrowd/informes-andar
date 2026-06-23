"use client";
import { useEffect, useState } from 'react';
import ExcelImportWizardModal from '../_components/ExcelImportWizardModal';

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
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Estados de asistente de importación Excel
  const [isImporting, setIsImporting] = useState(false);
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [importWizardYoungId, setImportWizardYoungId] = useState('');
  const [importWizardMonths, setImportWizardMonths] = useState<any[]>([]);

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/youngs/import-excel', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        const json = await res.json();
        loadData(1);
        if (json.importedMonths && json.importedMonths.length > 0) {
          setImportWizardYoungId(json.youngId || '');
          setImportWizardMonths(json.importedMonths);
          setImportWizardOpen(true);
        } else {
          alert(json.message || 'Excel importado correctamente');
        }
      } else {
        const json = await res.json();
        alert(json.error || 'Error al importar el archivo Excel');
      }
    } catch (err) {
      console.error('Error importando Excel:', err);
      alert('Error de conexión al importar Excel');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

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

  useEffect(() => {
    if (items.length > 0) {
      const initialExpanded: Record<string, boolean> = {};
      items.forEach(it => {
        const yId = it.youngId || 'sin-joven';
        initialExpanded[yId] = true; // Todo expandido por defecto para facilidad de uso
      });
      setExpandedIds(initialExpanded);
    }
  }, [items]);

  const toggleExpand = (youngId: string) => {
    setExpandedIds(prev => ({
      ...prev,
      [youngId]: !prev[youngId]
    }));
  };

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
  const countIsValid = selectedItems.length >= 1 && selectedItems.length <= 3;
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
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button 
            className={`ga-btn ${selectionMode ? 'accent' : 'secondary'}`}
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (!selectionMode) setSelectedIds(new Set());
            }}
            style={{ padding: '10px 20px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {selectionMode ? `✅ Cancelar Fusión` : '🔗 Fusionar Borradores'}
          </button>
          <label className="ga-btn secondary" style={{ padding: '10px 20px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {isImporting ? 'Importando...' : '📥 Importar Excel'}
            <input 
              type="file" 
              accept=".xlsx" 
              style={{ display: 'none' }} 
              disabled={isImporting}
              onChange={handleExcelImport}
            />
          </label>
          {selectedIds.size > 0 && (
            <button 
              className="ga-btn"
              style={{ background: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b', padding: '10px 20px', fontWeight: 600 }}
              onClick={() => setSelectedIds(new Set())}
            >
              🧹 Limpiar Selección ({selectedIds.size})
            </button>
          )}
        </div>
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


      </div>

      {selectionMode && (
        <div style={{ 
          padding: '12px 18px', 
          background: '#eff6ff', 
          border: '1px solid #bfdbfe', 
          borderRadius: '8px',
          color: '#1e40af',
          fontSize: '14px',
          fontWeight: 500,
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          💡 <span>Selecciona entre 1 y 3 borradores mensuales (checklists de cuadraditos) del <strong>mismo joven</strong> para generar el informe trimestral.</span>
        </div>
      )}

      {loading ? 'Cargando…' : (() => {
        // Filtrar ítems
        const filteredItems = items.filter((it) => {
          const searchLower = search.toLowerCase();
          const matchesSearch = !search || 
            String(it.periodo || '').toLowerCase().includes(searchLower) ||
            String(it.facilitadorNombre || '').toLowerCase().includes(searchLower) ||
            String(it.jovenNombre || '').toLowerCase().includes(searchLower);
          const matchesFilter = !filter || String(it.periodo || '').toLowerCase().includes(filter.toLowerCase());
          const matchesDraft = !showDraftsOnly || it.status === 'BORRADOR';
          return matchesSearch && matchesFilter && matchesDraft;
        });

        // Agrupar ítems por joven
        const grouped: Record<string, { jovenNombre: string; youngId: string; drafts: any[] }> = {};
        filteredItems.forEach(it => {
          const yId = it.youngId || 'sin-joven';
          const name = it.jovenNombre || 'Sin joven asignado';
          if (!grouped[yId]) {
            grouped[yId] = {
              youngId: yId,
              jovenNombre: name,
              drafts: []
            };
          }
          grouped[yId].drafts.push(it);
        });
        const groupedList = Object.values(grouped);

        return (
          <div>
            {groupedList.length === 0 ? (
              <div className="ga-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                No se encontraron borradores mensuales.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {groupedList.map((group) => {
                  const isExpanded = !!expandedIds[group.youngId];
                  return (
                    <div 
                      key={group.youngId} 
                      className="ga-card" 
                      style={{ 
                        padding: 0, 
                        overflow: 'hidden', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        background: '#ffffff'
                      }}
                    >
                      {/* Cabecera del Accordion */}
                      <div 
                        onClick={() => toggleExpand(group.youngId)}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '16px 20px', 
                          background: '#f8fafc', 
                          borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '18px' }}>👤</span>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e3a8a' }}>
                            {group.jovenNombre}
                          </span>
                          <span style={{ 
                            background: '#eff6ff', 
                            color: '#2563eb', 
                            padding: '2px 8px', 
                            borderRadius: '20px', 
                            fontSize: '12px', 
                            fontWeight: 600,
                            border: '1px solid #bfdbfe'
                          }}>
                            {group.drafts.length} {group.drafts.length === 1 ? 'borrador mensual' : 'borradores mensuales'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {selectionMode && group.drafts.some(d => selectedIds.has(d._id || d.id)) && (
                            <span style={{ 
                              fontSize: '12px', 
                              background: '#fef08a', 
                              color: '#854d0e', 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              fontWeight: 600 
                            }}>
                              📝 {group.drafts.filter(d => selectedIds.has(d._id || d.id)).length} seleccionados
                            </span>
                          )}
                          <span style={{ 
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
                            transition: 'transform 0.2s ease',
                            fontSize: '14px',
                            color: '#64748b'
                          }}>
                            ▶
                          </span>
                        </div>
                      </div>

                      {/* Contenido Desplegable */}
                      {isExpanded && (
                        <div style={{ padding: '16px 20px', background: '#ffffff', overflowX: 'auto' }}>
                          <table className="ga-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                {selectionMode && <th style={{ border: '1px solid #ccc', padding: 4, width: 40 }}></th>}
                                <th style={{ border: '1px solid #ccc', padding: 4 }}>Período</th>
                                <th style={{ border: '1px solid #ccc', padding: 4 }}>Facilitador</th>
                                <th style={{ border: '1px solid #ccc', padding: 4 }}>Estado</th>
                                <th style={{ border: '1px solid #ccc', padding: 4 }}>Última actualización</th>
                                <th style={{ border: '1px solid #ccc', padding: 4, textAlign: 'center', width: '260px' }}>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.drafts.map((it: any) => {
                                const id = it._id || it.id;
                                const isSelected = selectedIds.has(id);
                                return (
                                  <tr 
                                    key={id}
                                    style={{
                                      background: isSelected ? '#EFF6FF' : undefined,
                                      cursor: selectionMode ? 'pointer' : undefined
                                    }}
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
                                    <td style={{ border: '1px solid #ccc', padding: 4, fontWeight: 'bold' }}>{it.periodo}</td>
                                    <td style={{ border: '1px solid #ccc', padding: 4, fontSize: 13 }}>
                                      {it.facilitadorNombre || 'Sin facilitador'}
                                    </td>
                                    <td style={{ border: '1px solid #ccc', padding: 4 }}>
                                      <span className={`ga-badge ${it.status==='APROBADO'?'approved':it.status==='EN_REVISION'?'review':'draft'}`}>{it.status || 'BORRADOR'}</span>
                                    </td>
                                    <td style={{ border: '1px solid #ccc', padding: 4, fontSize: 12, color: 'var(--muted)' }}>
                                      {it.updatedAt ? new Date(it.updatedAt).toLocaleDateString('es-AR') : it.createdAt ? new Date(it.createdAt).toLocaleDateString('es-AR') : '—'}
                                    </td>
                                    <td style={{ border: '1px solid #ccc', padding: 4 }}>
                                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                        <a 
                                          href={`/form?formId=${id}`} 
                                          className="ga-btn secondary" 
                                          style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }} 
                                        >
                                          ✏️ Editar
                                        </a>
                                        <a 
                                          href={`/api/forms/${id}/export-excel`} 
                                          className="ga-btn secondary" 
                                          style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }}
                                        >
                                          📥 Excel
                                        </a>
                                        <button 
                                          className="ga-btn secondary" 
                                          onClick={() => duplicateForm(id)} 
                                          style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }}
                                          title="Crear una copia de este borrador"
                                        >
                                          📋 Duplicar
                                        </button>
                                        <button 
                                          className="ga-btn" 
                                          style={{ background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B', fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }}
                                          onClick={async () => {
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ color: 'var(--muted)', fontSize: 14 }}>
                Mostrando {filteredItems.length} de {total} borradores
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
        );
      })()}

      {/* Panel de Control Flotante para Fusión */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '16px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          zIndex: 1000,
          color: '#ffffff',
          width: '90%',
          maxWidth: '800px',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              {selectedIds.size} {selectedIds.size === 1 ? 'borrador seleccionado' : 'borradores seleccionados'}
            </span>
            {sameYoung && selectedItems.length > 0 && (
              <span style={{ fontSize: '13px', color: '#93c5fd' }}>
                Concurrente: <strong>{selectedItems[0].jovenNombre || 'Sin nombre'}</strong>
              </span>
            )}
            {!sameYoung && (
              <span style={{ fontSize: '13px', color: '#fca5a5', fontWeight: 600 }}>
                ⚠️ Los borradores deben ser del mismo joven.
              </span>
            )}
            {sameYoung && !countIsValid && (
              <span style={{ fontSize: '13px', color: '#fde047', fontWeight: 600 }}>
                ⚠️ Selecciona entre 1 y 3 borradores (máximo 3).
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              className="ga-btn"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#cbd5e1',
                padding: '8px 16px',
                fontSize: '13px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedIds(new Set())}
            >
              Deseleccionar todo
            </button>
            <button
              className="ga-btn"
              disabled={!selectionValid || generatingTrimestral}
              style={{
                background: selectionValid ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'rgba(255,255,255,0.05)',
                color: selectionValid ? '#ffffff' : 'rgba(255,255,255,0.3)',
                border: 'none',
                padding: '10px 24px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '8px',
                cursor: selectionValid ? 'pointer' : 'not-allowed',
                boxShadow: selectionValid ? '0 10px 15px -3px rgba(37, 99, 235, 0.3)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={handleGenerateTrimestral}
            >
              {generatingTrimestral ? (
                <span>⏳ Generando con IA...</span>
              ) : (
                <span>🔗 Fusionar y Generar Reporte (Word)</span>
              )}
            </button>
          </div>

          <style jsx>{`
            @keyframes slideUp {
              from { transform: translate(-50%, 100px); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* Modal Asistente de Fusión Post-Importación */}
      {importWizardOpen && (
        <ExcelImportWizardModal
          isOpen={importWizardOpen}
          youngId={importWizardYoungId}
          importedMonths={importWizardMonths}
          onClose={() => setImportWizardOpen(false)}
        />
      )}
    </div>
  );
}
