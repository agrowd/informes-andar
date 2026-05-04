"use client";

import { useEffect, useMemo, useState } from 'react';
import ImageUpload from '../_components/ImageUpload';
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
    circuloApoyo: []
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Estados de navegación
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [selectedYoung, setSelectedYoung] = useState<Young | null>(null);
  const [activeTab, setActiveTab] = useState<'perfil' | 'asignaciones' | 'historial'>('perfil');
  const [reportsHistory, setReportsHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

  const resetForm = () => {
    setForm({ nombreCompleto: '', dni: '', taller: '', legajo: '', obraSocial: '', assignedFacilitators: [], fechaNacimiento: '', foto: '', circuloApoyo: [] });
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
      circuloApoyo: young.circuloApoyo || []
    });
    setView('detail');
    setActiveTab('perfil');
    const id = young.id || young._id;
    if (id) loadReportsHistory(id);
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
          <button className={`ga-tab ${activeTab === 'asignaciones' ? 'active' : ''}`} onClick={() => setActiveTab('asignaciones')}>Seguimiento</button>
          <button className={`ga-tab ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>Historial de Informes</button>
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
        <button className="ga-btn primary" style={{ padding: '10px 25px' }} onClick={() => { resetForm(); setView('create'); }}>
          + Nuevo Joven
        </button>
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
