"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function TalleresPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const userRole = (session?.user as any)?.role || 'FACILITADOR';
  const canManage = ['ADMIN', 'DIRECTOR', 'COORDINACION'].includes(userRole);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!canManage) {
      alert('No tienes permisos para gestionar talleres');
      router.push('/dashboard');
      return;
    }
    load();
  }, [session, router, canManage]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/talleres');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setItems(j.items || []);
    } catch (err) {
      console.error('Error cargando talleres:', err);
      alert('Error al cargar lista de talleres');
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    if (!form.nombre) {
      alert('El nombre es requerido');
      return;
    }
    try {
      const res = await fetch('/api/talleres', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(form) 
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Error creando taller' }));
        throw new Error(error.error || `HTTP ${res.status}`);
      }
      setForm({ nombre: '', descripcion: '' });
      await load();
      alert('✅ Taller creado correctamente');
    } catch (error: any) {
      console.error('Error creando taller:', error);
      alert('Error: ' + (error.message || 'No se pudo crear el taller'));
    }
  };

  const startEdit = (taller: any) => {
    setEditingId(String(taller.id || taller._id));
    setForm({
      nombre: taller.nombre || '',
      descripcion: taller.descripcion || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ nombre: '', descripcion: '' });
  };

  const update = async () => {
    if (!form.nombre) {
      alert('El nombre es requerido');
      return;
    }
    if (!editingId) return;
    try {
      const res = await fetch(`/api/talleres/${editingId}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(form) 
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Error editando taller' }));
        throw new Error(error.error || `HTTP ${res.status}`);
      }
      setEditingId(null);
      setForm({ nombre: '', descripcion: '' });
      await load();
      alert('✅ Taller actualizado correctamente');
    } catch (error: any) {
      console.error('Error editando taller:', error);
      alert('Error: ' + (error.message || 'No se pudo actualizar el taller'));
    }
  };

  const deleteTaller = async (id: string) => {
    const taller = items.find((t: any) => String(t.id || t._id) === id);
    const nombre = taller?.nombre || 'este taller';
    if (!confirm(`¿Estás seguro de que deseas eliminar el taller "${nombre}"?\n\nEsta acción NO se puede deshacer y no se podrá eliminar si hay jóvenes asignados.\n\n¿Deseas continuar?`)) return;
    try {
      const res = await fetch(`/api/talleres/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Error eliminando taller' }));
        throw new Error(error.error || `HTTP ${res.status}`);
      }
      await load();
      alert('✅ Taller eliminado correctamente');
    } catch (error: any) {
      console.error('Error eliminando taller:', error);
      alert('Error: ' + (error.message || 'No se pudo eliminar el taller'));
    }
  };

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center' }}>Cargando...</div>;
  }

  return (
    <div>
      <h1>Gestión de Talleres</h1>
      
      <div className="ga-card" style={{ marginBottom: 12 }}>
        <h3>{editingId ? 'Editar taller' : 'Crear nuevo taller'}</h3>
        <div className="ga-form-grid">
          <label style={{ gridColumn: '1 / -1' }}>
            Nombre del taller<br />
            <input 
              className="ga-input" 
              value={form.nombre} 
              onChange={(e) => setForm({ ...form, nombre: e.target.value })} 
              placeholder="Ej: Taller de Carpintería"
              required
              style={{ width: '100%' }}
            />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Descripción (opcional)<br />
            <textarea 
              className="ga-textarea" 
              value={form.descripcion || ''} 
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })} 
              placeholder="Descripción del taller..."
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </label>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          {editingId ? (
            <>
              <button className="ga-btn primary" onClick={update}>Guardar cambios</button>
              <button className="ga-btn" onClick={cancelEdit}>Cancelar</button>
            </>
          ) : (
            <button className="ga-btn primary" onClick={create}>Crear taller</button>
          )}
        </div>
      </div>

      <div className="ga-card">
        <h3>Listado de talleres ({items.length})</h3>
        {items.length === 0 ? (
          <p style={{ color: 'var(--muted)', marginTop: 12 }}>No hay talleres registrados</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="ga-desktop-only">
              <div className="ga-table-mobile-wrap" style={{ marginTop: 12 }}>
                <table className="ga-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Nombre</th>
                      <th style={{ textAlign: 'left' }}>Descripción</th>
                      <th style={{ textAlign: 'left' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((t) => (
                      <tr key={t._id || t.id}>
                        <td style={{ fontWeight: 500 }}>{t.nombre}</td>
                        <td style={{ color: 'var(--muted)' }}>{t.descripcion || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="ga-btn secondary" onClick={() => startEdit(t)} style={{ fontSize: 12, padding: '4px 8px' }}>
                              ✏️ Editar
                            </button>
                            {['ADMIN', 'DIRECTOR'].includes(userRole) && (
                              <button className="ga-btn" onClick={() => deleteTaller(String(t.id || t._id))} style={{ fontSize: 12, padding: '4px 8px', background: '#fee', color: '#c33' }}>
                                🗑️ Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Mobile cards */}
            <div className="ga-mobile-only" style={{ marginTop: 12 }}>
              {items.map((t) => (
                <div key={t._id || t.id} className="ga-card" style={{ marginBottom: 12, padding: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 16 }}>{t.nombre}</div>
                  {t.descripcion && (
                    <div style={{ color: 'var(--muted)', marginBottom: 12, fontSize: 14 }}>{t.descripcion}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="ga-btn secondary" onClick={() => startEdit(t)} style={{ fontSize: 12 }}>
                      ✏️ Editar
                    </button>
                    {['ADMIN', 'DIRECTOR'].includes(userRole) && (
                      <button className="ga-btn" onClick={() => deleteTaller(String(t.id || t._id))} style={{ fontSize: 12, background: '#fee', color: '#c33' }}>
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

