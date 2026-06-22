"use client";

import { useEffect, useMemo, useState } from 'react';
import ImageUpload from '../_components/ImageUpload';
import QualityOfLifeChart from '../_components/QualityOfLifeChart';
import { integrantesCirculoTipos } from '@/lib/form/options';

type Young = {
  _id?: string;
  id?: string;
  nombreCompleto?: string;
  dni?: string;
  taller?: string;
  legajo?: string;
  obraSocial?: string;
  assignedFacilitators?: string[];
  fechaNacimiento?: string | null;
  foto?: string;
  circuloApoyo?: Array<{ nombre?: string; vinculo?: string }>;
  pcp?: any;
};

export default function YoungsPage() {
  const [items, setItems] = useState<Young[]>([]);
  const [facilitadores, setFacilitadores] = useState<any[]>([]);
  const [talleres, setTalleres] = useState<any[]>([]);
  const [form, setForm] = useState<Young>({
    nombreCompleto: '',
    dni: '',
    taller: '',
    legajo: '',
    obraSocial: '',
    assignedFacilitators: [],
    fechaNacimiento: '',
    foto: '',
    circuloApoyo: [],
    pcp: {}
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Estados de navegación
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [selectedYoung, setSelectedYoung] = useState<Young | null>(null);
  const [activeTab, setActiveTab] = useState<'perfil' | 'pcp' | 'asignaciones' | 'historial' | 'analiticas'>('perfil');
  const [reportsHistory, setReportsHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [loadingEvolution, setLoadingEvolution] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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
        alert(json.message || 'Excel importado correctamente');
        loadYoungs();
        if (json.youngId) {
          const params = new URLSearchParams({ page: '1', pageSize: '20' });
          const fetchRes = await fetch(`/api/youngs?${params.toString()}`);
          if (fetchRes.ok) {
            const fetchJson = await fetchRes.json();
            setItems(fetchJson.items || []);
            const imported = (fetchJson.items || []).find((y: any) => String(y.id || y._id) === String(json.youngId));
            if (imported) {
              openDetail(imported);
            }
          }
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

  const loadYoungs = async (pageNum: number = page) => {
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        pageSize: '20'
      });
      const res = await fetch(`/api/youngs?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setItems(json.items || []);
      setTotalPages(json.totalPages || 1);
      setTotal(json.total || 0);
      setPage(pageNum);
    } catch (error) {
      console.error('Error cargando jóvenes:', error);
    }
  };

  const loadReportsHistory = async (youngId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/reports?youngId=${youngId}`);
      if (res.ok) {
        const json = await res.json();
        setReportsHistory(json.items || []);
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadEvolution = async (youngId: string) => {
    setLoadingEvolution(true);
    try {
      const res = await fetch(`/api/youngs/${youngId}/evolution`);
      if (res.ok) {
        const json = await res.json();
        setEvolutionData(json.evolution || []);
      }
    } catch (error) {
      console.error('Error cargando evolución:', error);
    } finally {
      setLoadingEvolution(false);
    }
  };

  useEffect(() => {
    loadYoungs();
    fetch('/api/users').then(r => r.json()).then(j => setFacilitadores(j.items || []));
    fetch('/api/talleres').then(r => r.json()).then(j => setTalleres(j.items || []));
  }, []);

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const normalized = value.includes('T') ? value.split('T')[0] : value;
    const parts = normalized.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return value;
  };

  const renderAvatar = (young: Young, size = 110) => {
    if (young.foto) {
      return (
        <div className="avatar-wrap" style={{ width: size, height: size }}>
          <img
            src={young.foto}
            alt={young.nombreCompleto}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      );
    }
    return (
      <div className="avatar-wrap" style={{ 
        width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', color: '#4338ca', fontSize: size * 0.4, fontWeight: 800
      }}>
        {young.nombreCompleto?.[0]?.toUpperCase() || 'J'}
      </div>
    );
  };

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const v = search.toLowerCase();
    return items.filter(y => y.nombreCompleto?.toLowerCase().includes(v) || y.dni?.includes(v));
  }, [items, search]);

  const initializePCP = (pcp?: any) => {
    const base = pcp || {};
    return {
      anio: base.anio || '',
      rutinas: {
        semana: base.rutinas?.semana || '',
        finDeSemana: base.rutinas?.finDeSemana || ''
      },
      perfil: {
        suenos: Array.isArray(base.perfil?.suenos) ? base.perfil.suenos : [],
        capacidades: Array.isArray(base.perfil?.capacidades) ? base.perfil.capacidades : [],
        resultadosEscalas: {
          gencat: base.perfil?.resultadosEscalas?.gencat || '',
          sis: base.perfil?.resultadosEscalas?.sis || '',
          inico: base.perfil?.resultadosEscalas?.inico || '',
          sanMartin: base.perfil?.resultadosEscalas?.sanMartin || ''
        }
      },
      planFuturo: {
        BF: {
          objetivos: base.planFuturo?.BF?.objetivos || '',
          espacios: base.planFuturo?.BF?.espacios || '',
          apoyos: base.planFuturo?.BF?.apoyos || '',
          responsables: base.planFuturo?.BF?.responsables || ''
        },
        DP: {
          objetivos: base.planFuturo?.DP?.objetivos || '',
          espacios: base.planFuturo?.DP?.espacios || '',
          apoyos: base.planFuturo?.DP?.apoyos || '',
          responsables: base.planFuturo?.DP?.responsables || ''
        },
        RI: {
          objetivos: base.planFuturo?.RI?.objetivos || '',
          espacios: base.planFuturo?.RI?.espacios || '',
          apoyos: base.planFuturo?.RI?.apoyos || '',
          responsables: base.planFuturo?.RI?.responsables || ''
        },
        IS: {
          objetivos: base.planFuturo?.IS?.objetivos || '',
          espacios: base.planFuturo?.IS?.espacios || '',
          apoyos: base.planFuturo?.IS?.apoyos || '',
          responsables: base.planFuturo?.IS?.responsables || ''
        },
        BE: {
          objetivos: base.planFuturo?.BE?.objetivos || '',
          espacios: base.planFuturo?.BE?.espacios || '',
          apoyos: base.planFuturo?.BE?.apoyos || '',
          responsables: base.planFuturo?.BE?.responsables || ''
        },
        AU: {
          objetivos: base.planFuturo?.AU?.objetivos || '',
          espacios: base.planFuturo?.AU?.espacios || '',
          apoyos: base.planFuturo?.AU?.apoyos || '',
          responsables: base.planFuturo?.AU?.responsables || ''
        },
        BM: {
          objetivos: base.planFuturo?.BM?.objetivos || '',
          espacios: base.planFuturo?.BM?.espacios || '',
          apoyos: base.planFuturo?.BM?.apoyos || '',
          responsables: base.planFuturo?.BM?.responsables || ''
        },
        DR: {
          objetivos: base.planFuturo?.DR?.objetivos || '',
          espacios: base.planFuturo?.DR?.espacios || '',
          apoyos: base.planFuturo?.DR?.apoyos || '',
          responsables: base.planFuturo?.DR?.responsables || ''
        }
      }
    };
  };

  const resetForm = () => {
    setForm({ nombreCompleto: '', dni: '', taller: '', legajo: '', obraSocial: '', assignedFacilitators: [], fechaNacimiento: '', foto: '', circuloApoyo: [], pcp: initializePCP() });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.nombreCompleto) return alert('El nombre es obligatorio');
    
    setIsSaving(true);
    try {
      const url = editingId ? `/api/youngs/${editingId}` : '/api/youngs';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        alert('Cambios guardados con éxito');
        loadYoungs();
        if (!editingId) setView('list');
        else {
          setSelectedYoung({...form});
          setActiveTab('perfil');
        }
      } else {
        alert('Error al guardar los datos');
      }
    } catch (err) {
      alert('Error de conexión al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const openDetail = (young: Young) => {
    setSelectedYoung(young);
    setEditingId(young.id || young._id || null);
    setForm({ 
      ...young, 
      nombreCompleto: young.nombreCompleto || '',
      dni: young.dni || '',
      taller: young.taller || '',
      legajo: young.legajo || '',
      obraSocial: young.obraSocial || '',
      fechaNacimiento: young.fechaNacimiento?.split('T')[0] || '',
      assignedFacilitators: young.assignedFacilitators || [],
      circuloApoyo: young.circuloApoyo || [],
      pcp: initializePCP(young.pcp)
    });
    setView('detail');
    setActiveTab('perfil');
    const id = young.id || young._id;
    if (id) {
      loadReportsHistory(id);
      loadEvolution(id);
    }
  };

  const deleteYoung = async (id: string) => {
    if (!confirm('¿ESTÁS SEGURO? Se borrará permanentemente toda la información de este joven.')) return;
    const res = await fetch(`/api/youngs/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadYoungs();
      setView('list');
      alert('Joven eliminado correctamente');
    }
  };

  // Vistas
  if (view === 'create') {
    return (
      <div className="ga-container">
        <div style={{ marginBottom: 30 }}>
          <button className="ga-btn" onClick={() => setView('list')}>← Volver al listado</button>
        </div>
        <h1>Alta de Nuevo Joven</h1>
        
        <div className="ga-card" style={{ padding: 30 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
            <section>
              <h3 style={{ marginBottom: 15, borderBottom: '2px solid #f1f5f9', paddingBottom: 8 }}>1. Foto y Nombre</h3>
              <div style={{ display: 'flex', gap: 25, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: 140 }}>
                  <ImageUpload value={form.foto || ''} onChange={url => setForm({...form, foto: url})} onLoading={setIsUploading} label="Foto" type="young" />
                </div>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <label>Nombre Completo del Joven<br/>
                    <input className="ga-input" style={{ fontSize: 18, padding: 12 }} placeholder="Ej: Juan Pérez" value={form.nombreCompleto} onChange={e => setForm({...form, nombreCompleto: e.target.value})}/>
                  </label>
                </div>
              </div>
            </section>

            <section>
              <h3 style={{ marginBottom: 15, borderBottom: '2px solid #f1f5f9', paddingBottom: 8 }}>2. Información Identitaria</h3>
              <div className="ga-form-grid">
                <label>DNI / Documento<br/><input className="ga-input" placeholder="Solo números" value={form.dni} onChange={e => setForm({...form, dni: e.target.value})}/></label>
                <label>Fecha de Nacimiento<br/><input type="date" className="ga-input" value={form.fechaNacimiento || ''} onChange={e => setForm({...form, fechaNacimiento: e.target.value})}/></label>
                <label>Taller Asignado<br/>
                  <select className="ga-select" value={form.taller} onChange={e => setForm({...form, taller: e.target.value})}>
                    <option value="">Seleccionar taller...</option>
                    {talleres.map(t => <option key={t.id || t._id} value={t.nombre}>{t.nombre}</option>)}
                  </select>
                </label>
              </div>
            </section>

            <section>
              <h3 style={{ marginBottom: 15, borderBottom: '2px solid #f1f5f9', paddingBottom: 8 }}>3. Datos Administrativos</h3>
              <div className="ga-form-grid">
                <label>Nº de Legajo<br/><input className="ga-input" placeholder="0000" value={form.legajo} onChange={e => setForm({...form, legajo: e.target.value})}/></label>
                <label>Obra Social / Prepaga<br/><input className="ga-input" placeholder="Nombre de la cobertura" value={form.obraSocial} onChange={e => setForm({...form, obraSocial: e.target.value})}/></label>
              </div>
            </section>
          </div>
          
          <div style={{ marginTop: 40, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <button className="ga-btn primary" style={{ padding: '12px 40px', fontSize: 16 }} onClick={handleSave} disabled={isSaving || isUploading}>
              {isSaving ? 'Guardando...' : isUploading ? 'Subiendo foto...' : 'Finalizar Alta'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedYoung) {
    return (
      <div className="ga-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30 }}>
          <button className="ga-btn" onClick={() => setView('list')} style={{ padding: '8px 12px' }}>← Volver</button>
          <h1 style={{ margin: 0 }}>Perfil de {selectedYoung.nombreCompleto}</h1>
        </div>

        <div className="ga-tabs-nav">
          <button className={`ga-tab ${activeTab === 'perfil' ? 'active' : ''}`} onClick={() => setActiveTab('perfil')}>Ficha Técnica</button>
          <button className={`ga-tab ${activeTab === 'pcp' ? 'active' : ''}`} onClick={() => setActiveTab('pcp')}>PCP</button>
          <button className={`ga-tab ${activeTab === 'asignaciones' ? 'active' : ''}`} onClick={() => setActiveTab('asignaciones')}>Seguimiento</button>
          <button className={`ga-tab ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>Historial</button>
          <button className={`ga-tab ${activeTab === 'analiticas' ? 'active' : ''}`} onClick={() => setActiveTab('analiticas')}>Analíticas</button>
        </div>

        {activeTab === 'perfil' && (
          <div className="ga-card" style={{ padding: 30 }}>
            <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
              <div style={{ width: 180 }}>
                <ImageUpload value={form.foto || ''} onChange={url => setForm({...form, foto: url})} onLoading={setIsUploading} label="Cambiar Foto" type="young" />
              </div>
              <div style={{ flex: 1, minWidth: 300 }}>
                <div className="ga-form-grid">
                  <label style={{ gridColumn: '1/-1' }}>Nombre Completo<br/><input className="ga-input" value={form.nombreCompleto} onChange={e => setForm({...form, nombreCompleto: e.target.value})}/></label>
                  <label>DNI<br/><input className="ga-input" value={form.dni} onChange={e => setForm({...form, dni: e.target.value})}/></label>
                  <label>Fecha Nacimiento<br/><input type="date" className="ga-input" value={form.fechaNacimiento || ''} onChange={e => setForm({...form, fechaNacimiento: e.target.value})}/></label>
                  <label>Nº Legajo<br/><input className="ga-input" value={form.legajo} onChange={e => setForm({...form, legajo: e.target.value})}/></label>
                  <label>Obra Social<br/><input className="ga-input" value={form.obraSocial} onChange={e => setForm({...form, obraSocial: e.target.value})}/></label>
                </div>
              </div>
            </div>

            <h3 style={{ marginTop: 40, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>Círculo de Apoyo</h3>
            <div style={{ marginTop: 15 }}>
              {(form.circuloApoyo || []).map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <select className="ga-select" style={{ width: 180 }} value={m.vinculo} onChange={e => {
                    const next = [...form.circuloApoyo!]; next[i] = {...next[i], vinculo: e.target.value}; setForm({...form, circuloApoyo: next});
                  }}>
                    <option value="">Vínculo...</option>
                    {integrantesCirculoTipos.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <input className="ga-input" placeholder="Nombre completo" value={m.nombre} onChange={e => {
                    const next = [...form.circuloApoyo!]; next[i] = {...next[i], nombre: e.target.value}; setForm({...form, circuloApoyo: next});
                  }}/>
                  <button className="ga-btn" style={{ color: 'var(--error)' }} onClick={() => {
                    setForm({...form, circuloApoyo: form.circuloApoyo!.filter((_, idx) => idx !== i)});
                  }}>✕</button>
                </div>
              ))}
              <button className="ga-btn secondary" onClick={() => setForm({...form, circuloApoyo: [...(form.circuloApoyo || []), {nombre:'', vinculo:''}]})}>+ Agregar Integrante</button>
            </div>

            <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 25 }}>
              <button className="ga-btn primary" style={{ padding: '10px 30px' }} onClick={handleSave} disabled={isSaving || isUploading}>
                {isSaving ? 'Guardando...' : isUploading ? 'Subiendo foto...' : 'Guardar Todos los Cambios'}
              </button>
              <button className="ga-btn" style={{ color: 'white', background: 'var(--error)', border: 'none' }} onClick={() => deleteYoung(selectedYoung.id || selectedYoung._id || '')}>Eliminar Joven Definitivamente</button>
            </div>
          </div>
        )}

        {activeTab === 'pcp' && (
          <div className="ga-card" style={{ padding: 30 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 15 }}>
              <h2 style={{ margin: 0 }}>Planificación Centrada en la Persona (PCP)</h2>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <label style={{ fontSize: 14, fontWeight: 600 }}>Año de la PCP:</label>
                <input 
                  className="ga-input" 
                  style={{ width: 100, padding: '6px 10px' }} 
                  value={form.pcp?.anio || ''} 
                  onChange={e => {
                    const nextPcp = { ...form.pcp, anio: e.target.value };
                    setForm({ ...form, pcp: nextPcp });
                  }} 
                  placeholder="Ej: 2026" 
                />
              </div>
            </div>

            {/* RUTINAS */}
            <div style={{ marginBottom: 30 }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: 8, marginBottom: 15 }}>1. Mapa de Rutinas</h3>
              <div className="ga-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Mi Semana (Lunes a Viernes)</label>
                  <textarea 
                    rows={6}
                    className="ga-input"
                    value={form.pcp?.rutinas?.semana || ''}
                    onChange={e => {
                      const nextPcp = { ...form.pcp, rutinas: { ...form.pcp?.rutinas, semana: e.target.value } };
                      setForm({ ...form, pcp: nextPcp });
                    }}
                    placeholder="Describe la rutina de lunes a viernes..."
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Fin de Semana (Sábado y Domingo)</label>
                  <textarea 
                    rows={6}
                    className="ga-input"
                    value={form.pcp?.rutinas?.finDeSemana || ''}
                    onChange={e => {
                      const nextPcp = { ...form.pcp, rutinas: { ...form.pcp?.rutinas, finDeSemana: e.target.value } };
                      setForm({ ...form, pcp: nextPcp });
                    }}
                    placeholder="Describe la rutina del fin de semana..."
                  />
                </div>
              </div>
            </div>

            {/* PERFIL */}
            <div style={{ marginBottom: 30 }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: 8, marginBottom: 15 }}>2. Perfil Personal</h3>
              <div className="ga-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {/* SUEÑOS */}
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Sueños de la Persona</label>
                  {(form.pcp?.perfil?.suenos || []).map((sueno: string, idx: number) => (
                    <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                      <input 
                        className="ga-input"
                        value={sueno}
                        onChange={e => {
                          const nextSuenos = [...form.pcp.perfil.suenos];
                          nextSuenos[idx] = e.target.value;
                          const nextPcp = { ...form.pcp, perfil: { ...form.pcp.perfil, suenos: nextSuenos } };
                          setForm({ ...form, pcp: nextPcp });
                        }}
                        placeholder="Ingresa un sueño..."
                      />
                      <button 
                        type="button"
                        className="ga-btn"
                        style={{ color: 'var(--error)' }}
                        onClick={() => {
                          const nextSuenos = form.pcp.perfil.suenos.filter((_: any, i: number) => i !== idx);
                          const nextPcp = { ...form.pcp, perfil: { ...form.pcp.perfil, suenos: nextSuenos } };
                          setForm({ ...form, pcp: nextPcp });
                        }}
                      >✕</button>
                    </div>
                  ))}
                  <button 
                    type="button"
                    className="ga-btn secondary"
                    onClick={() => {
                      const nextSuenos = [...(form.pcp?.perfil?.suenos || []), ''];
                      const nextPcp = { ...form.pcp, perfil: { ...form.pcp?.perfil, suenos: nextSuenos } };
                      setForm({ ...form, pcp: nextPcp });
                    }}
                  >+ Agregar Sueño</button>
                </div>

                {/* CAPACIDADES */}
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Capacidades de la Persona</label>
                  {(form.pcp?.perfil?.capacidades || []).map((capacidad: string, idx: number) => (
                    <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                      <input 
                        className="ga-input"
                        value={capacidad}
                        onChange={e => {
                          const nextCap = [...form.pcp.perfil.capacidades];
                          nextCap[idx] = e.target.value;
                          const nextPcp = { ...form.pcp, perfil: { ...form.pcp.perfil, capacidades: nextCap } };
                          setForm({ ...form, pcp: nextPcp });
                        }}
                        placeholder="Ingresa una capacidad..."
                      />
                      <button 
                        type="button"
                        className="ga-btn"
                        style={{ color: 'var(--error)' }}
                        onClick={() => {
                          const nextCap = form.pcp.perfil.capacidades.filter((_: any, i: number) => i !== idx);
                          const nextPcp = { ...form.pcp, perfil: { ...form.pcp.perfil, capacidades: nextCap } };
                          setForm({ ...form, pcp: nextPcp });
                        }}
                      >✕</button>
                    </div>
                  ))}
                  <button 
                    type="button"
                    className="ga-btn secondary"
                    onClick={() => {
                      const nextCap = [...(form.pcp?.perfil?.capacidades || []), ''];
                      const nextPcp = { ...form.pcp, perfil: { ...form.pcp?.perfil, capacidades: nextCap } };
                      setForm({ ...form, pcp: nextPcp });
                    }}
                  >+ Agregar Capacidad</button>
                </div>
              </div>
            </div>

            {/* RESULTADOS DE ESCALAS */}
            <div style={{ marginBottom: 30 }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: 8, marginBottom: 15 }}>3. Resultados de Escalas (Últimos resultados)</h3>
              <div className="ga-form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>GENCAT</label>
                  <input 
                    className="ga-input"
                    value={form.pcp?.perfil?.resultadosEscalas?.gencat || ''}
                    onChange={e => {
                      const nextPcp = { 
                        ...form.pcp, 
                        perfil: { 
                          ...form.pcp?.perfil, 
                          resultadosEscalas: { ...form.pcp?.perfil?.resultadosEscalas, gencat: e.target.value } 
                        } 
                      };
                      setForm({ ...form, pcp: nextPcp });
                    }}
                    placeholder="Resultados GENCAT"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>SIS</label>
                  <input 
                    className="ga-input"
                    value={form.pcp?.perfil?.resultadosEscalas?.sis || ''}
                    onChange={e => {
                      const nextPcp = { 
                        ...form.pcp, 
                        perfil: { 
                          ...form.pcp?.perfil, 
                          resultadosEscalas: { ...form.pcp?.perfil?.resultadosEscalas, sis: e.target.value } 
                        } 
                      };
                      setForm({ ...form, pcp: nextPcp });
                    }}
                    placeholder="Resultados SIS"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>INICO-FEAPS</label>
                  <input 
                    className="ga-input"
                    value={form.pcp?.perfil?.resultadosEscalas?.inico || ''}
                    onChange={e => {
                      const nextPcp = { 
                        ...form.pcp, 
                        perfil: { 
                          ...form.pcp?.perfil, 
                          resultadosEscalas: { ...form.pcp?.perfil?.resultadosEscalas, inico: e.target.value } 
                        } 
                      };
                      setForm({ ...form, pcp: nextPcp });
                    }}
                    placeholder="Resultados INICO"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>SAN MARTIN</label>
                  <input 
                    className="ga-input"
                    value={form.pcp?.perfil?.resultadosEscalas?.sanMartin || ''}
                    onChange={e => {
                      const nextPcp = { 
                        ...form.pcp, 
                        perfil: { 
                          ...form.pcp?.perfil, 
                          resultadosEscalas: { ...form.pcp?.perfil?.resultadosEscalas, sanMartin: e.target.value } 
                        } 
                      };
                      setForm({ ...form, pcp: nextPcp });
                    }}
                    placeholder="Resultados SAN MARTIN"
                  />
                </div>
              </div>
            </div>

            {/* PLAN DE FUTURO */}
            <div style={{ marginBottom: 30 }}>
              <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: 8, marginBottom: 15 }}>4. Plan de Futuro Personal</h3>
              <div className="ga-table-mobile-wrap">
                <table className="ga-table">
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ width: '120px' }}>Dimensión</th>
                      <th>Objetivos</th>
                      <th>Espacios</th>
                      <th>Apoyos</th>
                      <th>Responsables</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'BF', nombre: 'Bienestar Físico (BF)' },
                      { id: 'DP', nombre: 'Desarrollo Personal (DP)' },
                      { id: 'RI', nombre: 'Relaciones Interpersonales (RI)' },
                      { id: 'IS', nombre: 'Inclusión Social (IS)' },
                      { id: 'BE', nombre: 'Bienestar Emocional (BE)' },
                      { id: 'AU', nombre: 'Autodeterminación (AU)' },
                      { id: 'BM', nombre: 'Bienestar Material (BM)' },
                      { id: 'DR', nombre: 'Derechos (DR)' }
                    ].map(dim => {
                      const dimKey = dim.id;
                      const pfObj = form.pcp?.planFuturo?.[dimKey] || { objetivos: '', espacios: '', apoyos: '', responsables: '' };
                      const handlePfChange = (field: string, val: string) => {
                        const nextPF = { ...form.pcp?.planFuturo };
                        nextPF[dimKey] = { ...pfObj, [field]: val };
                        const nextPcp = { ...form.pcp, planFuturo: nextPF };
                        setForm({ ...form, pcp: nextPcp });
                      };
                      return (
                        <tr key={dim.id}>
                          <td style={{ fontWeight: 600, fontSize: 13, background: '#f8fafc' }}>{dim.nombre}</td>
                          <td>
                            <input 
                              className="ga-input" 
                              style={{ padding: 6, fontSize: 13 }}
                              value={pfObj.objetivos || ''}
                              onChange={e => handlePfChange('objetivos', e.target.value)}
                              placeholder="Objetivos..."
                            />
                          </td>
                          <td>
                            <input 
                              className="ga-input" 
                              style={{ padding: 6, fontSize: 13 }}
                              value={pfObj.espacios || ''}
                              onChange={e => handlePfChange('espacios', e.target.value)}
                              placeholder="Espacios..."
                            />
                          </td>
                          <td>
                            <input 
                              className="ga-input" 
                              style={{ padding: 6, fontSize: 13 }}
                              value={pfObj.apoyos || ''}
                              onChange={e => handlePfChange('apoyos', e.target.value)}
                              placeholder="Apoyos..."
                            />
                          </td>
                          <td>
                            <input 
                              className="ga-input" 
                              style={{ padding: 6, fontSize: 13 }}
                              value={pfObj.responsables || ''}
                              onChange={e => handlePfChange('responsables', e.target.value)}
                              placeholder="Responsables..."
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: 40, borderTop: '1px solid #f1f5f9', paddingTop: 25 }}>
              <button className="ga-btn primary" style={{ padding: '10px 30px' }} onClick={handleSave} disabled={isSaving || isUploading}>
                {isSaving ? 'Guardando PCP...' : 'Guardar Datos PCP'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'asignaciones' && (
          <div className="ga-card" style={{ padding: 30 }}>
            <h3>Seguimiento y Responsables</h3>
            <div className="ga-form-grid">
              <label>Taller Actual<br/>
                <select className="ga-select" value={form.taller} onChange={e => setForm({...form, taller: e.target.value})}>
                  <option value="">Sin asignar</option>
                  {talleres.map(t => <option key={t.id || t._id} value={t.nombre}>{t.nombre}</option>)}
                </select>
              </label>
              <label style={{ gridColumn: '1/-1' }}>Facilitadores Responsables<br/>
                <select multiple className="ga-select" style={{ height: 200, marginTop: 5 }} value={form.assignedFacilitators} onChange={e => setForm({...form, assignedFacilitators: Array.from(e.target.selectedOptions).map(o => o.value)})}>
                  {facilitadores.map(f => <option key={f.id || f._id} value={f.id || f._id}>{f.name || f.email}</option>)}
                </select>
                <small style={{ color: 'var(--muted)', display: 'block', marginTop: 8 }}>Usa Ctrl/Cmd para seleccionar varios responsables.</small>
              </label>
            </div>
            <button className="ga-btn primary" style={{ marginTop: 30, padding: '10px 30px' }} onClick={handleSave}>Actualizar Seguimiento</button>
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="ga-card" style={{ padding: 30 }}>
            <h3 style={{ marginBottom: 20 }}>Historial de Informes de Evolución</h3>
            {loadingHistory ? (
              <div style={{ padding: 40, textAlign: 'center' }}>Cargando informes...</div>
            ) : reportsHistory.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', background: '#f8fafc', borderRadius: 12 }}>
                No hay informes registrados para este joven.
              </div>
            ) : (
              <div className="ga-table-mobile-wrap">
                <table className="ga-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Periodo</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportsHistory.map(r => (
                      <tr key={r.id} className="ga-table-row-hover">
                        <td>{formatDate(r.createdAt)}</td>
                        <td><strong>{r.periodo}</strong></td>
                        <td><span className={`ga-status-pill ${r.status?.toLowerCase()}`}>{r.status}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <a href={`/reports/${r.id}`} className="ga-btn secondary" style={{ fontSize: 12 }}>Ver Informe Completo</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analiticas' && (
          <div className="ga-card" style={{ padding: 30 }}>
            <h3 style={{ marginBottom: 20 }}>Visualización de Progreso</h3>
            {loadingEvolution ? (
              <div style={{ padding: 40, textAlign: 'center' }}>Cargando analíticas...</div>
            ) : evolutionData.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', background: '#f8fafc', borderRadius: 12 }}>
                No hay datos suficientes para generar el gráfico comparativo.
              </div>
            ) : (
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <QualityOfLifeChart periods={evolutionData} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ga-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h1 style={{ margin: 0 }}>Jóvenes</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>Selecciona un joven para ver su ficha completa.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="ga-btn secondary" style={{ padding: '10px 25px', cursor: 'pointer' }}>
            {isImporting ? 'Importando...' : '📥 Importar Excel'}
            <input 
              type="file" 
              accept=".xlsx" 
              style={{ display: 'none' }} 
              disabled={isImporting}
              onChange={handleExcelImport}
            />
          </label>
          <button className="ga-btn primary" style={{ padding: '10px 25px' }} onClick={() => { resetForm(); setView('create'); }}>
            + Nuevo Joven
          </button>
        </div>
      </div>

      <div className="ga-card" style={{ marginBottom: 30 }}>
        <input 
          className="ga-input" 
          style={{ width: '100%', maxWidth: 600, fontSize: 16, padding: '12px 20px' }} 
          placeholder="Buscar por nombre, DNI o taller..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      <div className="ga-young-grid">
        {filteredItems.map(y => (
          <div key={y.id || y._id} className="ga-young-card" onClick={() => openDetail(y)}>
            {renderAvatar(y)}
            <div className="name">{y.nombreCompleto}</div>
            <div className="taller">{y.taller || 'SIN TALLER'}</div>
            <div className="dni">DNI: {y.dni || '—'}</div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 100, color: 'var(--muted)' }}>
            <h3>No se encontraron resultados</h3>
            <p>Intenta con otros términos de búsqueda.</p>
          </div>
        )}
      </div>

      {/* PAGINACIÓN */}
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center', gap: 15, alignItems: 'center' }}>
        <button className="ga-btn" onClick={() => loadYoungs(page - 1)} disabled={page === 1}>Anterior</button>
        <span style={{ fontWeight: 600 }}>{page} / {totalPages}</span>
        <button className="ga-btn" onClick={() => loadYoungs(page + 1)} disabled={page >= totalPages}>Siguiente</button>
      </div>
    </div>
  );
}
