"use client";
import { useEffect, useState, useMemo } from 'react';
import ExcelImportWizardModal from '../_components/ExcelImportWizardModal';

const INSTITUTIONAL_GROUPS = [
  { id: 'TODOS', label: '🌐 Todos' },
  { id: 'Emprendedores', label: 'Emprendedores' },
  { id: 'Artesanos', label: 'Artesanos' },
  { id: 'Promotores', label: 'Promotores' },
  { id: 'Empoderadas', label: 'Empoderadas' },
  { id: 'Atrapasueños', label: 'Atrapasueños' },
  { id: 'Buenos Mozos', label: 'Buenos Mozos' },
  { id: 'Clave de Sol', label: 'Clave de Sol' }
];

export default function FormsList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('TODOS');
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

  // Sincronizar parámetro ?grupo= de la URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const g = params.get('grupo') || params.get('group');
      if (g) {
        setSelectedGroup(g);
      }
    }
  }, []);

  const handleWizardSuccess = (reportId: string) => {
    window.location.href = '/reports';
  };

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
      params.set('pageSize', '1000');
      const r = await fetch(`/api/forms?${params.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setItems(j.items || []); 
      setTotalPages(j.totalPages || 1);
      setTotal(j.total || 0);
      setPage(pageNum);
      setLoading(false);
    } catch (err) {
      console.error('Error cargando cuadrículas:', err);
      setLoading(false);
      alert('Error al cargar cuadrículas');
    }
  };

  useEffect(() => {
    loadData(1);
  }, []);

  useEffect(() => {
    // Por defecto, todas las cuadrículas comienzan COLAPSADAS para ahorrar espacio
    setExpandedIds({});
  }, [items]);

  const toggleExpand = (youngId: string) => {
    setExpandedIds(prev => ({
      ...prev,
      [youngId]: !prev[youngId]
    }));
  };

  const expandAll = (yIds: string[]) => {
    const all: Record<string, boolean> = {};
    yIds.forEach(id => { all[id] = true; });
    setExpandedIds(all);
  };

  const collapseAll = () => {
    setExpandedIds({});
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

  const duplicateForm = async (id: string, currentPeriod?: string) => {
    let sugerido = '';
    if (currentPeriod) {
      const match = currentPeriod.match(/^(\d{4})-(\d{2})$/);
      if (match) {
        let year = parseInt(match[1]);
        let month = parseInt(match[2]);
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
        sugerido = `${year}-${String(month).padStart(2, '0')}`;
      }
    }
    
    const nuevoPeriodo = prompt(
      `¿Para qué período (mes) deseas duplicar este borrador?\n(Formato sugerido: AAAA-MM)`,
      sugerido || currentPeriod || ''
    );
    
    if (nuevoPeriodo === null) return;
    const trimmed = nuevoPeriodo.trim();
    if (!trimmed) {
      alert('Debes ingresar un período válido.');
      return;
    }

    try {
      const res = await fetch(`/api/forms/${id}/copy`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo: trimmed })
      });
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

  const allYoungsMap = useMemo(() => {
    const map: Record<string, { youngId: string; jovenNombre: string; grupo: string; drafts: any[] }> = {};
    items.forEach(it => {
      const yId = it.youngId ? String(it.youngId) : `noyoung-${it.jovenNombre || 'desconocido'}`;
      let grp = it.grupo || 'Sin grupo';
      if (grp.toLowerCase() === 'atrapa sueños') grp = 'Atrapasueños';
      if (!map[yId]) {
        map[yId] = {
          youngId: yId,
          jovenNombre: it.jovenNombre || 'Sin joven asignado',
          grupo: grp,
          drafts: []
        };
      }
      map[yId].drafts.push(it);
    });
    return map;
  }, [items]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, { youngs: number; forms: number }> = {
      TODOS: { youngs: Object.keys(allYoungsMap).length, forms: items.length }
    };
    INSTITUTIONAL_GROUPS.forEach(g => {
      if (g.id !== 'TODOS') counts[g.id] = { youngs: 0, forms: 0 };
    });

    Object.values(allYoungsMap).forEach(y => {
      let g = y.grupo;
      if (g.toLowerCase() === 'atrapa sueños') g = 'Atrapasueños';
      if (counts[g]) {
        counts[g].youngs++;
        counts[g].forms += y.drafts.length;
      }
    });

    return counts;
  }, [allYoungsMap, items]);

  const filteredYoungs = useMemo(() => {
    return Object.values(allYoungsMap).filter(y => {
      // 1. Filtrado por Grupo Institucional
      if (selectedGroup && selectedGroup !== 'TODOS') {
        const selLower = selectedGroup.toLowerCase().trim();
        const grpLower = (y.grupo || '').toLowerCase().trim();
        const matchesGroup = grpLower === selLower || 
          (selLower === 'atrapasueños' && grpLower === 'atrapa sueños') ||
          grpLower.includes(selLower);
        if (!matchesGroup) return false;
      }

      // 2. Filtrado por Texto (concurrente, grupo o facilitador)
      const searchLower = search.toLowerCase().trim();
      if (searchLower) {
        const matchesSearch = 
          y.jovenNombre.toLowerCase().includes(searchLower) ||
          (y.grupo || '').toLowerCase().includes(searchLower) ||
          y.drafts.some(d => 
            String(d.periodo || '').toLowerCase().includes(searchLower) ||
            String(d.facilitadorNombre || '').toLowerCase().includes(searchLower)
          );
        if (!matchesSearch) return false;
      }

      // 3. Filtrado por período
      const filterPeriodLower = filter.toLowerCase().trim();
      if (filterPeriodLower) {
        const hasPeriod = y.drafts.some(d => String(d.periodo || '').toLowerCase().includes(filterPeriodLower));
        if (!hasPeriod) return false;
      }

      // 4. Filtrado por solo borradores
      if (showDraftsOnly) {
        const hasDraft = y.drafts.some(d => d.status === 'BORRADOR');
        if (!hasDraft) return false;
      }

      return true;
    });
  }, [allYoungsMap, selectedGroup, search, filter, showDraftsOnly]);

  const totalVisibleForms = useMemo(() => {
    return filteredYoungs.reduce((acc, y) => acc + y.drafts.length, 0);
  }, [filteredYoungs]);

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

  const generateTrimestralForYoung = async (youngName: string, drafts: any[]) => {
    if (!drafts || drafts.length === 0) {
      alert('Este concurrente no tiene cuadrículas mensuales registradas.');
      return;
    }
    const ids = drafts.slice(0, 3).map(it => it._id || it.id);
    const count = ids.length;

    if (!confirm(`¿Deseas generar el Informe Trimestral para "${youngName}" unificando sus ${count} cuadrícula(s) mensual(es) con Inteligencia Artificial?`)) {
      return;
    }

    setGeneratingTrimestral(true);
    try {
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
      alert('✅ Informe Trimestral generado con éxito. Se iniciará la descarga en formato Word (.docx).');
      
      window.location.href = `/api/reports/${result.reportId}/.docx`;
    } catch (error: any) {
      console.error('Error al generar informe trimestral:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setGeneratingTrimestral(false);
    }
  };

  const selectAllForYoung = (drafts: any[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      drafts.slice(0, 3).forEach(d => next.add(d._id || d.id));
      return next;
    });
  };

  const deselectAllForYoung = (drafts: any[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      drafts.forEach(d => next.delete(d._id || d.id));
      return next;
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <h1>Cuadrículas Mensuales</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className={`ga-btn ${selectionMode ? 'accent' : 'secondary'}`}
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (!selectionMode) setSelectedIds(new Set());
            }}
            style={{ padding: '10px 20px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {selectionMode ? `✅ Cancelar Fusión` : '🔗 Fusionar Cuadrículas'}
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

      {/* Tarjeta de Filtros con Selector de Grupos Institucionales */}
      <div className="ga-card" style={{ marginBottom: 16, padding: '16px 20px' }}>
        {/* 1. Selector de Grupo Institucional en Pills */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🏫</span> Filtrar por Grupo Institucional:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {INSTITUTIONAL_GROUPS.map(tab => {
              const isActive = (tab.id === 'TODOS' && (!selectedGroup || selectedGroup === 'TODOS')) ||
                selectedGroup.toLowerCase().trim() === tab.id.toLowerCase().trim();
              const c = groupCounts[tab.id] || { youngs: 0, forms: 0 };
              const countText = `${c.youngs}`;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    const nextGroup = tab.id;
                    setSelectedGroup(nextGroup);
                    if (typeof window !== 'undefined') {
                      const url = new URL(window.location.href);
                      if (nextGroup === 'TODOS') {
                        url.searchParams.delete('grupo');
                      } else {
                        url.searchParams.set('grupo', nextGroup);
                      }
                      window.history.replaceState({}, '', url.toString());
                    }
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 700,
                    border: isActive ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: isActive ? '#eff6ff' : '#ffffff',
                    color: isActive ? '#1d4ed8' : '#64748b',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: 11,
                    padding: '1px 7px',
                    borderRadius: 10,
                    background: isActive ? '#2563eb' : '#e2e8f0',
                    color: isActive ? '#ffffff' : '#475569'
                  }}>
                    {countText}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Filtros de búsqueda y período */}
        <div style={{ display:'flex', gap:12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ flex: 2, minWidth: 200 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Buscar</span>
            <input 
              className="ga-input" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Buscar por concurrente, facilitador o período..."
              style={{ marginTop: 4 }}
            />
          </label>
          <label style={{ flex: 1, minWidth: 160 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Grupo</span>
            <select
              className="ga-select"
              value={selectedGroup}
              onChange={(e) => {
                const nextGroup = e.target.value;
                setSelectedGroup(nextGroup);
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  if (nextGroup === 'TODOS') {
                    url.searchParams.delete('grupo');
                  } else {
                    url.searchParams.set('grupo', nextGroup);
                  }
                  window.history.replaceState({}, '', url.toString());
                }
              }}
              style={{ marginTop: 4, width: '100%' }}
            >
              {INSTITUTIONAL_GROUPS.map(g => {
                const c = groupCounts[g.id] || { youngs: 0, forms: 0 };
                return (
                  <option key={g.id} value={g.id}>
                    {g.label} ({c.youngs} concurrentes - {c.forms} cuadrículas)
                  </option>
                );
              })}
            </select>
          </label>
          <label style={{ flex: 1, minWidth: 130 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Filtrar por período</span>
            <input 
              className="ga-input" 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)} 
              placeholder="Ej: 2026-04"
              style={{ marginTop: 4 }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10 }}>
            <input 
              type="checkbox" 
              checked={showDraftsOnly} 
              onChange={(e) => setShowDraftsOnly(e.target.checked)}
            />
            <span style={{ fontSize: 13, color: '#475569' }}>Solo en borrador</span>
          </label>
          {(selectedGroup !== 'TODOS' || search || filter || showDraftsOnly) && (
            <button
              type="button"
              className="ga-btn secondary"
              style={{ padding: '8px 12px', fontSize: 12, marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              onClick={() => {
                setSelectedGroup('TODOS');
                setSearch('');
                setFilter('');
                setShowDraftsOnly(false);
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('grupo');
                  window.history.replaceState({}, '', url.pathname);
                }
              }}
            >
              ✕ Limpiar filtros
            </button>
          )}
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
          💡 <span>Selecciona entre 1 y 3 cuadrículas mensuales del <strong>mismo joven</strong> para generar el informe trimestral.</span>
        </div>
      )}

      {loading ? 'Cargando…' : (() => {
        return (
          <div>
            {filteredYoungs.length === 0 ? (
              <div className="ga-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                No se encontraron cuadrículas mensuales para los filtros seleccionados.
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 4px', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                    👥 Mostrando {filteredYoungs.length} concurrentes ({totalVisibleForms} cuadrículas en total)
                    {selectedGroup !== 'TODOS' && <strong style={{ color: '#2563eb', marginLeft: 6 }}>en {selectedGroup}</strong>}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      type="button" 
                      className="ga-btn secondary" 
                      style={{ fontSize: '12px', padding: '4px 10px', height: 'auto' }}
                      onClick={() => expandAll(filteredYoungs.map(g => g.youngId))}
                    >
                      📂 Expandir todos
                    </button>
                    <button 
                      type="button" 
                      className="ga-btn secondary" 
                      style={{ fontSize: '12px', padding: '4px 10px', height: 'auto' }}
                      onClick={collapseAll}
                    >
                      📁 Colapsar todos
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredYoungs.map((group) => {
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
                          padding: '14px 20px', 
                          background: '#f8fafc', 
                          borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background 0.2s ease',
                          flexWrap: 'wrap',
                          gap: 12
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '18px' }}>👤</span>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e3a8a' }}>
                            {group.jovenNombre}
                          </span>
                          <span style={{ 
                            background: '#e0e7ff', 
                            color: '#3730a3', 
                            padding: '2px 8px', 
                            borderRadius: '6px', 
                            fontSize: '11px', 
                            fontWeight: 700,
                            border: '1px solid #c7d2fe'
                          }}>
                            {group.grupo}
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
                            {group.drafts.length} {group.drafts.length === 1 ? 'cuadrícula mensual' : 'cuadrículas mensuales'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
                          {/* Botón rápido Generar Trimestral para este joven */}
                          {group.drafts.length > 0 && (
                            <button
                              type="button"
                              className="ga-btn"
                              disabled={generatingTrimestral}
                              onClick={() => generateTrimestralForYoung(group.jovenNombre, group.drafts)}
                              style={{
                                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '5px 12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                borderRadius: '6px',
                                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: generatingTrimestral ? 'wait' : 'pointer'
                              }}
                              title={`Generar informe trimestral unificando las ${group.drafts.length} cuadrículas con IA`}
                            >
                              {generatingTrimestral ? '⏳ Generando...' : `⚡ Generar Trimestral (${group.drafts.length})`}
                            </button>
                          )}

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
                          <span 
                            style={{ 
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
                              transition: 'transform 0.2s ease',
                              fontSize: '14px',
                              color: '#64748b',
                              cursor: 'pointer',
                              padding: '4px 8px'
                            }}
                            onClick={() => toggleExpand(group.youngId)}
                          >
                            ▶
                          </span>
                        </div>
                      </div>

                      {/* Contenido Desplegable */}
                      {isExpanded && (
                        <div style={{ padding: '16px 20px', background: '#ffffff', overflowX: 'auto' }}>
                          {selectionMode && (
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                              <button
                                type="button"
                                className="ga-btn secondary"
                                style={{ fontSize: 11, padding: '4px 10px' }}
                                onClick={() => selectAllForYoung(group.drafts)}
                              >
                                ✅ Seleccionar las {Math.min(group.drafts.length, 3)} cuadrículas
                              </button>
                              <button
                                type="button"
                                className="ga-btn secondary"
                                style={{ fontSize: 11, padding: '4px 10px' }}
                                onClick={() => deselectAllForYoung(group.drafts)}
                              >
                                ✕ Deseleccionar todas
                              </button>
                            </div>
                          )}
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
                                          onClick={() => duplicateForm(id, it.periodo)} 
                                          style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }}
                                          title="Crear una copia de este borrador"
                                        >
                                          📋 Duplicar
                                        </button>
                                        <button 
                                          className="ga-btn" 
                                          style={{ background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B', fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }}
                                          onClick={async () => {
                                            if (!confirm('¿Estás seguro de que deseas ELIMINAR esta cuadrícula mensual? Esta acción no se puede deshacer.')) return;
                                            try {
                                              const r = await fetch(`/api/forms/${id}`, { method: 'DELETE' });
                                              if (r.ok) {
                                                alert('Cuadrícula Mensual eliminada correctamente');
                                                loadData(page);
                                              } else {
                                                const err = await r.json().catch(() => ({ error: 'Error eliminando' }));
                                                alert(`Error: ${err.error || 'No se pudo eliminar'}`);
                                              }
                                            } catch (err: any) {
                                              alert(`Error: ${err.message || 'Error al eliminar'}`);
                                            }
                                          }}
                                          title="Eliminar cuadrícula"
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
              </div>
            )}

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ color: 'var(--muted)', fontSize: 14 }}>
                Mostrando {totalVisibleForms} de {total} cuadrículas
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
              {selectedIds.size} {selectedIds.size === 1 ? 'cuadrícula seleccionada' : 'cuadrículas seleccionadas'}
            </span>
            {sameYoung && selectedItems.length > 0 && (
              <span style={{ fontSize: '13px', color: '#93c5fd' }}>
                Concurrente: <strong>{selectedItems[0].jovenNombre || 'Sin nombre'}</strong>
              </span>
            )}
            {!sameYoung && (
              <span style={{ fontSize: '13px', color: '#fca5a5', fontWeight: 600 }}>
                ⚠️ Las cuadrículas deben ser del mismo joven.
              </span>
            )}
            {sameYoung && !countIsValid && (
              <span style={{ fontSize: '13px', color: '#fde047', fontWeight: 600 }}>
                ⚠️ Selecciona entre 1 y 3 cuadrículas (máximo 3).
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
          onSuccess={handleWizardSuccess}
        />
      )}
    </div>
  );
}
