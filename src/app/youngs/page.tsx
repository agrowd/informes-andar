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

  const renderAvatar = (young: Young, size = 48) => {
    if (young.foto) {
      return (
        <img
          src={young.foto}
          alt={young.nombreCompleto}
          style={{ width: size, height: size, borderRadius: 12, objectFit: 'cover', border: '2px solid var(--border)' }}
        />
      );
    }
    return (
      <div style={{
        width: size, height: size, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', color: '#4338ca', fontWeight: 700, border: '2px solid #c7d2fe'
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
    const url = editingId ? `/api/youngs/${editingId}` : '/api/youngs';
    const res = await fetch(url, {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      alert('Guardado correctamente');
      loadYoungs();
      if (!editingId) setView('list');
      else setSelectedYoung({...form});
    }
  };

  const openDetail = (young: Young) => {
    setSelectedYoung(young);
    setEditingId(young.id || young._id || null);
    setForm({ 
      ...young, 
      fechaNacimiento: young.fechaNacimiento?.split('T')[0] || '',
      assignedFacilitators: young.assignedFacilitators || [],
      circuloApoyo: young.circuloApoyo || []
    });
    setView('detail');
    setActiveTab('perfil');
    if (young.id || young._id) loadReportsHistory(young.id || young._id || '');
  };

  const deleteYoung = async (id: string) => {
    if (!confirm('¿Eliminar joven? Esta acción es irreversible.')) return;
    const res = await fetch(`/api/youngs/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadYoungs();
      setView('list');
    }
  };

  // Vistas
  if (view === 'create') {
    return (
      <div className="ga-container">
        <div style={{ marginBottom: 20 }}>
          <button className="ga-btn" onClick={() => setView('list')}>← Volver al listado</button>
        </div>
        <h1>Alta de Nuevo Joven</h1>
        <div className="ga-card">
          <div className="ga-form-grid">
            <label>Nombre Completo<br/><input className="ga-input" value={form.nombreCompleto} onChange={e => setForm({...form, nombreCompleto: e.target.value})}/></label>
            <label>DNI<br/><input className="ga-input" value={form.dni} onChange={e => setForm({...form, dni: e.target.value})}/></label>
            <label>Taller inicial<br/>
              <select className="ga-select" value={form.taller} onChange={e => setForm({...form, taller: e.target.value})}>
                <option value="">Seleccionar taller...</option>
                {talleres.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
              </select>
            </label>
          </div>
          <button className="ga-btn primary" style={{ marginTop: 25, minWidth: 150 }} onClick={handleSave}>Crear Registro</button>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedYoung) {
    return (
      <div className="ga-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30 }}>
          <button className="ga-btn" onClick={() => setView('list')} style={{ padding: '8px 12px' }}>←</button>
          {renderAvatar(selectedYoung, 80)}
          <div>
            <h1 style={{ margin: 0 }}>{selectedYoung.nombreCompleto}</h1>
            <div style={{ display: 'flex', gap: 15, marginTop: 5, color: 'var(--muted)', fontSize: 14 }}>
              <span><strong>DNI:</strong> {selectedYoung.dni}</span>
              <span><strong>Legajo:</strong> {selectedYoung.legajo || '—'}</span>
              <span><strong>Taller:</strong> {selectedYoung.taller || 'Sin asignar'}</span>
            </div>
          </div>
        </div>

        <div className="ga-tabs-nav">
          <button className={`ga-tab ${activeTab === 'perfil' ? 'active' : ''}`} onClick={() => setActiveTab('perfil')}>Información Personal</button>
          <button className={`ga-tab ${activeTab === 'asignaciones' ? 'active' : ''}`} onClick={() => setActiveTab('asignaciones')}>Seguimiento</button>
          <button className={`ga-tab ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>Historial de Informes</button>
        </div>

        {activeTab === 'perfil' && (
          <div className="ga-card">
            <h3>Datos de Identidad</h3>
            <div className="ga-form-grid">
              <label>Nombre Completo<br/><input className="ga-input" value={form.nombreCompleto} onChange={e => setForm({...form, nombreCompleto: e.target.value})}/></label>
              <label>DNI<br/><input className="ga-input" value={form.dni} onChange={e => setForm({...form, dni: e.target.value})}/></label>
              <label>Fecha de Nacimiento<br/><input type="date" className="ga-input" value={form.fechaNacimiento} onChange={e => setForm({...form, fechaNacimiento: e.target.value})}/></label>
              <label>Nº de Legajo<br/><input className="ga-input" value={form.legajo} onChange={e => setForm({...form, legajo: e.target.value})}/></label>
              <label>Obra Social<br/><input className="ga-input" value={form.obraSocial} onChange={e => setForm({...form, obraSocial: e.target.value})}/></label>
              <div style={{ gridColumn: '1/-1' }}>
                <ImageUpload value={form.foto || ''} onChange={url => setForm({...form, foto: url})} label="Foto de Perfil" type="young" />
              </div>
            </div>

            <h3 style={{ marginTop: 30 }}>Círculo de Apoyo</h3>
            <div style={{ background: '#f8fafc', padding: 15, borderRadius: 10, border: '1px solid var(--border)' }}>
              {(form.circuloApoyo || []).map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <input className="ga-input" placeholder="Vínculo (ej: Madre)" list="vinculos-list" value={m.vinculo} onChange={e => {
                    const next = [...form.circuloApoyo!]; next[i].vinculo = e.target.value; setForm({...form, circuloApoyo: next});
                  }}/>
                  <input className="ga-input" placeholder="Nombre completo" value={m.nombre} onChange={e => {
                    const next = [...form.circuloApoyo!]; next[i].nombre = e.target.value; setForm({...form, circuloApoyo: next});
                  }}/>
                  <button className="ga-btn" style={{ color: 'var(--error)', padding: '8px' }} onClick={() => {
                    setForm({...form, circuloApoyo: form.circuloApoyo!.filter((_, idx) => idx !== i)});
                  }}>✕</button>
                </div>
              ))}
              <button className="ga-btn secondary" onClick={() => setForm({...form, circuloApoyo: [...(form.circuloApoyo || []), {nombre:'', vinculo:''}]})}>+ Agregar Integrante</button>
            </div>

            <div style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <button className="ga-btn primary" style={{ minWidth: 150 }} onClick={handleSave}>Guardar Cambios</button>
              <button className="ga-btn" style={{ color: 'var(--error)', background: '#fee' }} onClick={() => deleteYoung(selectedYoung.id || selectedYoung._id || '')}>Eliminar Joven</button>
            </div>
          </div>
        )}

        {activeTab === 'asignaciones' && (
          <div className="ga-card">
            <h3>Gestión de Talleres y Responsables</h3>
            <div className="ga-form-grid">
              <label>Taller Asignado<br/>
                <select className="ga-select" value={form.taller} onChange={e => setForm({...form, taller: e.target.value})}>
                  <option value="">Sin asignar</option>
                  {talleres.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                </select>
              </label>
              <label style={{ gridColumn: '1/-1' }}>Facilitadores Asignados<br/>
                <select multiple className="ga-select" style={{ height: 150, marginTop: 5 }} value={form.assignedFacilitators} onChange={e => setForm({...form, assignedFacilitators: Array.from(e.target.selectedOptions).map(o => o.value)})}>
                  {facilitadores.map(f => <option key={f.id} value={f.id}>{f.name || f.email}</option>)}
                </select>
                <small style={{ color: 'var(--muted)', display: 'block', marginTop: 5 }}>Mantén presionado Ctrl (Windows) o Cmd (Mac) para seleccionar varios.</small>
              </label>
            </div>
            <button className="ga-btn primary" style={{ marginTop: 25 }} onClick={handleSave}>Actualizar Asignaciones</button>
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="ga-card">
            <h3>Historial de Informes Técnicos</h3>
            {loadingHistory ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Cargando historial...</div>
            ) : reportsHistory.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No se registran informes previos para este joven.</div>
            ) : (
              <div className="ga-table-mobile-wrap">
                <table className="ga-table">
                  <thead>
                    <tr>
                      <th>Fecha de Creación</th>
                      <th>Periodo</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportsHistory.map(r => (
                      <tr key={r.id} className="ga-table-row-hover">
                        <td>{formatDate(r.createdAt)}</td>
                        <td><span style={{ fontWeight: 600 }}>{r.periodo}</span></td>
                        <td><span className={`ga-status-pill ${r.status?.toLowerCase()}`}>{r.status}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <a href={`/reports/${r.id}`} className="ga-btn secondary" style={{ fontSize: 12 }}>Abrir Informe</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <datalist id="vinculos-list">
          {integrantesCirculoTipos.map(v => <option key={v} value={v} />)}
        </datalist>
      </div>
    );
  }

  return (
    <div className="ga-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, flexWrap: 'wrap', gap: 15 }}>
        <div>
          <h1 style={{ margin: 0 }}>Jóvenes</h1>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Gestión centralizada de perfiles y seguimiento.</p>
        </div>
        <button className="ga-btn primary" onClick={() => { resetForm(); setView('create'); }}>
          <span style={{ fontSize: 18, marginRight: 5 }}>+</span> Nuevo Joven
        </button>
      </div>

      <div className="ga-card" style={{ marginBottom: 20 }}>
        <input 
          className="ga-input" 
          style={{ width: '100%', maxWidth: 500 }} 
          placeholder="Buscar por nombre, DNI o taller..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      <div className="ga-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="ga-table" style={{ border: 'none' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ width: 80, border: 'none' }}>Foto</th>
              <th style={{ border: 'none' }}>Nombre del Joven</th>
              <th style={{ border: 'none' }}>DNI</th>
              <th style={{ border: 'none' }}>Taller</th>
              <th style={{ width: 100, border: 'none' }}>Perfil</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(y => (
              <tr 
                key={y.id || y._id} 
                onClick={() => openDetail(y)} 
                style={{ cursor: 'pointer' }}
                className="ga-table-row-hover"
              >
                <td style={{ border: 'none' }}>{renderAvatar(y, 44)}</td>
                <td style={{ border: 'none' }}>
                  <div style={{ color: 'var(--primary)', fontWeight: 700 }}>{y.nombreCompleto}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Legajo: {y.legajo || '—'}</div>
                </td>
                <td style={{ border: 'none' }}>{y.dni}</td>
                <td style={{ border: 'none' }}>
                  <span style={{ fontSize: 13, background: '#f1f5f9', padding: '4px 8px', borderRadius: 6 }}>{y.taller || 'Sin taller'}</span>
                </td>
                <td style={{ border: 'none', textAlign: 'right' }}>
                  <button className="ga-btn secondary" style={{ fontSize: 11, padding: '4px 10px' }}>VER FICHA</button>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                  No se encontraron jóvenes con esos criterios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      <div style={{ marginTop: 25, display: 'flex', justifyContent: 'center', gap: 15, alignItems: 'center' }}>
        <button className="ga-btn" onClick={() => loadYoungs(page - 1)} disabled={page === 1}>Anterior</button>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Página {page} de {totalPages}</span>
        <button className="ga-btn" onClick={() => loadYoungs(page + 1)} disabled={page >= totalPages}>Siguiente</button>
      </div>
    </div>
  );
}
