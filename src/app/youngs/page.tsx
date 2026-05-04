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
      alert('No se pudo cargar la lista de jóvenes');
    }
  };

  useEffect(() => {
    loadYoungs();

    fetch('/api/users')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => setFacilitadores(json.items || []))
      .catch((err) => console.warn('Error cargando facilitadores:', err));

    fetch('/api/talleres')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => setTalleres(json.items || []))
      .catch((err) => console.warn('Error cargando talleres:', err));
  }, []);

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const normalized = value.includes('T') ? value.split('T')[0] : value;
    const parts = normalized.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return value;
  };

  const getInitials = (name?: string) => {
    if (!name) return 'J';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((segment) => segment[0]?.toUpperCase() ?? '')
      .join('');
  };

  const renderAvatar = (young: Young) => {
    if (young.foto) {
      return (
        <img
          src={young.foto}
          alt={young.nombreCompleto || 'Foto del joven'}
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            objectFit: 'cover',
            border: '1px solid var(--border)'
          }}
          loading="lazy"
        />
      );
    }

    return (
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#e0e7ff',
          color: '#4338ca',
          fontWeight: 600,
          border: '1px solid #c7d2fe'
        }}
      >
        {getInitials(young.nombreCompleto)}
      </div>
    );
  };

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const value = search.toLowerCase();
    return items.filter((young) => {
      return (
        (young.nombreCompleto || '').toLowerCase().includes(value) ||
        (young.dni || '').toLowerCase().includes(value) ||
        (young.taller || '').toLowerCase().includes(value) ||
        (young.legajo || '').toLowerCase().includes(value) ||
        (young.obraSocial || '').toLowerCase().includes(value)
      );
    });
  }, [items, search]);

  const resetForm = () =>
    setForm({
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

  const handleCreateOrUpdate = async () => {
    if (!form.nombreCompleto) {
      alert('El nombre completo es obligatorio');
      return;
    }

    const payload = {
      ...form,
      assignedFacilitators: form.assignedFacilitators || [],
      circuloApoyo: (form.circuloApoyo || []).map((m) => ({
        nombre: m?.nombre || '',
        vinculo: m?.vinculo || ''
      }))
    };

    const url = editingId ? `/api/youngs/${editingId}` : '/api/youngs';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Error en el guardado' }));
        throw new Error(error.error || `HTTP ${res.status}`);
      }
      await loadYoungs();
      resetForm();
      setEditingId(null);
      alert(editingId ? 'Joven actualizado correctamente' : 'Joven creado correctamente');
    } catch (error: any) {
      console.error('Error guardando joven:', error);
      alert(error?.message || 'No se pudo guardar el joven');
    }
  };

  const startEdit = (young: Young) => {
    setEditingId(young.id || young._id || null);
    setForm({
      nombreCompleto: young.nombreCompleto || '',
      dni: young.dni || '',
      taller: young.taller || '',
      legajo: young.legajo || '',
      obraSocial: young.obraSocial || '',
      foto: young.foto || '',
      fechaNacimiento: young.fechaNacimiento
        ? typeof young.fechaNacimiento === 'string'
          ? young.fechaNacimiento.split('T')[0]
          : new Date(young.fechaNacimiento).toISOString().split('T')[0]
        : '',
      assignedFacilitators: young.assignedFacilitators || [],
      circuloApoyo: young.circuloApoyo || []
    });
  };

  const deleteYoung = async (id: string) => {
    const target = items.find((y) => (y._id || y.id) === id);
    const name = target?.nombreCompleto || 'este joven';
    if (!confirm(`¿Eliminar a "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/youngs/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Error eliminando' }));
        throw new Error(error.error || `HTTP ${res.status}`);
      }
      await loadYoungs(page);
      alert('Joven eliminado correctamente');
    } catch (error: any) {
      console.error('Error eliminando joven:', error);
      alert(error?.message || 'No se pudo eliminar el joven');
    }
  };

  const circuloDatalistId = 'youngs-circulo-vinculos';

  return (
    <div>
      <h1>Jóvenes</h1>

      <div className="ga-card" style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Buscar<br />
          <input
            className="ga-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, DNI, legajo u obra social..."
            style={{ width: '100%' }}
          />
        </label>
      </div>

      <div className="ga-card" style={{ marginBottom: 12 }}>
        <h3>{editingId ? 'Editar joven' : 'Alta de joven'}</h3>
        <div className="ga-form-grid">
          <label>
            Nombre completo<br />
            <input
              className="ga-input"
              value={form.nombreCompleto || ''}
              onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
            />
          </label>
          <label>
            DNI<br />
            <input className="ga-input" value={form.dni || ''} onChange={(e) => setForm({ ...form, dni: e.target.value })} />
          </label>
          <label>
            Taller<br />
            <select
              className="ga-select"
              value={form.taller || ''}
              onChange={(e) => setForm({ ...form, taller: e.target.value })}
            >
              <option value="">Seleccione un taller...</option>
              {talleres.map((t) => (
                <option key={t.id || t._id} value={t.nombre}>
                  {t.nombre}
                </option>
              ))}
            </select>
            <small style={{ fontSize: 12, color: '#666' }}>
              ¿No está en la lista? Crealo desde <a href="/talleres">/talleres</a>
            </small>
          </label>
          <label>
            Fecha de nacimiento<br />
            <input
              className="ga-input"
              type="date"
              value={form.fechaNacimiento || ''}
              onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
            />
          </label>
          <label>
            Nº de legajo<br />
            <input className="ga-input" value={form.legajo || ''} onChange={(e) => setForm({ ...form, legajo: e.target.value })} />
          </label>
          <label>
            Obra social<br />
            <input
              className="ga-input"
              value={form.obraSocial || ''}
              onChange={(e) => setForm({ ...form, obraSocial: e.target.value })}
            />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Asignar facilitadores<br />
            <select
              className="ga-select"
              multiple
              value={form.assignedFacilitators || []}
              onChange={(e) => setForm({ ...form, assignedFacilitators: Array.from(e.target.selectedOptions).map((o) => o.value) })}
              style={{ minHeight: 100 }}
            >
              {facilitadores.map((f) => (
                <option key={f.id || f._id} value={f.id || f._id}>
                  {f.name || f.email}
                </option>
              ))}
            </select>
            <small style={{ fontSize: 12, color: '#666' }}>Ctrl/Cmd para seleccionar múltiples</small>
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <ImageUpload
              value={form.foto || ''}
              onChange={(url) => setForm({ ...form, foto: url })}
              label="Foto del/la joven"
              type="young"
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <b>Círculo de apoyo</b>
            <p style={{ fontSize: 12, color: '#666' }}>Primero seleccioná el vínculo (Madre, Hermano/a, etc.) y luego el nombre propio.</p>
            {(form.circuloApoyo || []).map((miembro, index) => (
              <div key={index} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                <input
                  className="ga-input"
                  list={circuloDatalistId}
                  placeholder="Vínculo (ej: Madre)"
                  value={miembro?.vinculo || ''}
                  onChange={(e) => {
                    const next = [...(form.circuloApoyo || [])];
                    next[index] = { ...next[index], vinculo: e.target.value };
                    setForm({ ...form, circuloApoyo: next });
                  }}
                  style={{ flex: '1 1 160px', minWidth: 130 }}
                />
                <input
                  className="ga-input"
                  placeholder="Nombre (ej: Cristina)"
                  value={miembro?.nombre || ''}
                  onChange={(e) => {
                    const next = [...(form.circuloApoyo || [])];
                    next[index] = { ...next[index], nombre: e.target.value };
                    setForm({ ...form, circuloApoyo: next });
                  }}
                  style={{ flex: '2 1 220px', minWidth: 160 }}
                />
                <button
                  type="button"
                  className="ga-btn"
                  onClick={() => {
                    const next = (form.circuloApoyo || []).filter((_, idx) => idx !== index);
                    setForm({ ...form, circuloApoyo: next });
                  }}
                  style={{ background: '#fee', color: '#c33' }}
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              className="ga-btn secondary"
              onClick={() => setForm({ ...form, circuloApoyo: [...(form.circuloApoyo || []), { nombre: '', vinculo: '' }] })}
            >
              + Agregar integrante
            </button>
            <datalist id={circuloDatalistId}>
              {integrantesCirculoTipos.map((tipo) => (
                <option key={tipo} value={tipo} />
              ))}
            </datalist>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="ga-btn primary" onClick={handleCreateOrUpdate} style={{ minWidth: 150 }}>
            {editingId ? 'Guardar cambios' : 'Crear joven'}
          </button>
          {editingId && (
            <button className="ga-btn" onClick={() => { resetForm(); setEditingId(null); }}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="ga-card">
        <h3>Listado ({filteredItems.length} de {total})</h3>
        {items.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No hay jóvenes registrados</p>
        ) : (
          <>
            <div className="ga-desktop-only">
              <div className="ga-table-mobile-wrap" style={{ marginTop: 12 }}>
                <table className="ga-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Foto</th>
                      <th>Nombre</th>
                      <th>Datos personales</th>
                      <th>Nº de legajo</th>
                      <th>Obra social</th>
                      <th>Taller</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((young) => (
                      <tr key={young._id || young.id}>
                        <td>{renderAvatar(young)}</td>
                        <td style={{ fontWeight: 500 }}>{young.nombreCompleto}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                            <span><strong>DNI:</strong> {young.dni || '—'}</span>
                            <span><strong>Fecha nac.:</strong> {formatDate(young.fechaNacimiento)}</span>
                          </div>
                        </td>
                        <td>{young.legajo || '—'}</td>
                        <td>{young.obraSocial || '—'}</td>
                        <td>{young.taller || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="ga-btn secondary" onClick={() => startEdit(young)} style={{ fontSize: 12, padding: '4px 8px' }}>
                              Editar
                            </button>
                            <button
                              className="ga-btn"
                              onClick={() => deleteYoung(young.id || young._id || '')}
                              style={{ fontSize: 12, padding: '4px 8px', background: '#fee', color: '#c33' }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="ga-mobile-only" style={{ marginTop: 12 }}>
              {filteredItems.map((young) => (
                <div key={young._id || young.id} className="ga-card" style={{ marginBottom: 12, padding: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                    {renderAvatar(young)}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{young.nombreCompleto}</div>
                      <div style={{ fontSize: 13, color: '#444' }}>
                        <div>DNI: {young.dni || '—'}</div>
                        <div>Fecha nac.: {formatDate(young.fechaNacimiento)}</div>
                        <div>Legajo: {young.legajo || '—'}</div>
                        <div>Obra social: {young.obraSocial || '—'}</div>
                        {young.taller && <div>Taller: {young.taller}</div>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="ga-btn secondary" onClick={() => startEdit(young)} style={{ fontSize: 12 }}>
                      Editar
                    </button>
                    <button
                      className="ga-btn"
                      onClick={() => deleteYoung(young.id || young._id || '')}
                      style={{ fontSize: 12, background: '#fee', color: '#c33' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <div style={{ color: 'var(--muted)', fontSize: 14 }}>
                Mostrando {filteredItems.length} de {total} jóvenes
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="ga-btn" onClick={() => loadYoungs(page - 1)} disabled={page === 1}>
                  ← Anterior
                </button>
                <span> Página {page} de {totalPages} </span>
                <button className="ga-btn" onClick={() => loadYoungs(page + 1)} disabled={page >= totalPages}>
                  Siguiente →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
