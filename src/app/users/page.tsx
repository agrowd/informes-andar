"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', name: '', role: 'FACILITADOR', password: '' });
  const [creating, setCreating] = useState(false);
  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean; userId: string | null; password: string }>({ isOpen: false, userId: null, password: '' });

  const userRole = (session?.user as any)?.role || 'FACILITADOR';
  const canManage = ['ADMIN', 'DIRECTOR'].includes(userRole);

  // Cerrar modal con Escape
  useEffect(() => {
    if (!passwordModal.isOpen) return;
    const onKey = (ev: KeyboardEvent) => { 
      if (ev.key === 'Escape') {
        setPasswordModal({ isOpen: false, userId: null, password: '' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [passwordModal.isOpen]);

  useEffect(() => {
    console.log('[UsersPage] useEffect ejecutado', { 
      hasSession: !!session, 
      userRole, 
      canManage,
      sessionStatus: session ? 'loaded' : 'loading'
    });
    
    // No hacer nada si aún está cargando la sesión
    if (session === undefined) {
      console.log('[UsersPage] Sesión aún cargando...');
      return;
    }
    
    if (!session) {
      console.log('[UsersPage] No hay sesión, redirigiendo a login');
      router.push('/login');
      return;
    }
    
    if (!canManage) {
      console.log('[UsersPage] No tiene permisos, redirigiendo a dashboard');
      alert('No tienes permisos para gestionar usuarios');
      router.push('/');
      return;
    }
    
    console.log('[UsersPage] Cargando usuarios...');
    load();
  }, [session, router, canManage, userRole]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users/all');
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setUsers(data.items || []);
    } catch (error: any) {
      console.error('Error cargando usuarios:', error);
      alert('Error al cargar usuarios: ' + (error?.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    if (!form.email) {
      alert('⚠️ El email es requerido');
      return;
    }
    if (!form.email.includes('@')) {
      alert('⚠️ El email no es válido');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setForm({ email: '', name: '', role: 'FACILITADOR', password: '' });
        await load();
        alert('✅ Usuario creado correctamente');
      } else {
        alert('❌ Error: ' + (data.error || 'No se pudo crear el usuario'));
      }
    } catch (error: any) {
      console.error('Error creando usuario:', error);
      alert('❌ Error al crear usuario: ' + (error?.message || 'Error desconocido'));
    } finally {
      setCreating(false);
    }
  };

  const updateRole = async (userId: string, newRole: string) => {
    if (!confirm(`¿Cambiar rol a ${newRole}?`)) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (res.ok) {
        await load();
        alert('✅ Rol actualizado correctamente');
      } else {
        alert('❌ Error: ' + (data.error || 'No se pudo actualizar el rol'));
      }
    } catch (error: any) {
      console.error('Error actualizando rol:', error);
      alert('❌ Error al actualizar rol: ' + (error?.message || 'Error desconocido'));
    }
  };

  const setPassword = async () => {
    if (!passwordModal.password || passwordModal.password.length < 8) {
      alert('⚠️ La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (!passwordModal.userId) return;
    
    try {
      const res = await fetch(`/api/users/${passwordModal.userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordModal.password })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordModal({ isOpen: false, userId: null, password: '' });
        await load();
        alert('✅ Contraseña establecida correctamente');
      } else {
        alert('❌ Error: ' + (data.error || 'No se pudo establecer la contraseña'));
      }
    } catch (error: any) {
      console.error('Error estableciendo contraseña:', error);
      alert('❌ Error al establecer contraseña: ' + (error?.message || 'Error desconocido'));
    }
  };

  // Mostrar loading mientras se verifica la sesión y permisos
  if (session === undefined) {
    return <div style={{ padding: 20, textAlign: 'center' }}>Cargando...</div>;
  }
  
  if (!canManage) {
    return <div style={{ padding: 20, textAlign: 'center' }}>Verificando permisos...</div>;
  }

  return (
    <div>
      <h1>Gestión de Usuarios</h1>
      
      <div className="ga-card" style={{ marginBottom: 12 }}>
        <h3>Crear nuevo usuario</h3>
        <div className="ga-form-grid">
          <label>
            Email<br />
            <input 
              className="ga-input" 
              type="email"
              value={form.email} 
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
              placeholder="usuario@ejemplo.com"
            />
          </label>
          <label>
            Nombre<br />
            <input 
              className="ga-input" 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              placeholder="Nombre completo"
            />
          </label>
          <label>
            Rol<br />
            <select 
              className="ga-select" 
              value={form.role} 
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="FACILITADOR">Facilitador</option>
              <option value="COORDINACION">Coordinación</option>
              <option value="DIRECTOR">Director</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>
          <label>
            Contraseña (opcional)<br />
            <input 
              className="ga-input" 
              type="password"
              value={form.password} 
              onChange={(e) => setForm({ ...form, password: e.target.value })} 
              placeholder="Dejar vacío para establecer después"
            />
            <small style={{ fontSize: 12, color: '#666', display: 'block', marginTop: 4 }}>
              Si no se establece, el usuario no podrá iniciar sesión hasta que se configure una contraseña
            </small>
          </label>
        </div>
        <div style={{ marginTop: 8 }}>
          <button className="ga-btn primary" onClick={create} disabled={creating || loading}>
            {creating ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>
      </div>

      <div className="ga-card">
        <h3>Listado de usuarios ({users.length})</h3>
        {loading ? (
          <p style={{ color: 'var(--muted)', marginTop: 12 }}>Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <p style={{ color: 'var(--muted)', marginTop: 12 }}>No hay usuarios registrados</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="ga-desktop-only">
              <div className="ga-table-mobile-wrap" style={{ marginTop: 12 }}>
                <table className="ga-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Email</th>
                      <th style={{ textAlign: 'left' }}>Nombre</th>
                      <th style={{ textAlign: 'left' }}>Rol</th>
                      <th style={{ textAlign: 'left' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id || u._id}>
                        <td>{u.email}</td>
                        <td>{u.name || '—'}</td>
                        <td>
                          <span className={`ga-badge ${u.role === 'ADMIN' ? 'approved' : u.role === 'DIRECTOR' ? 'review' : 'draft'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <select 
                              className="ga-select" 
                              value={u.role} 
                              onChange={(e) => updateRole(String(u.id || u._id), e.target.value)}
                              style={{ fontSize: 13, minWidth: 140 }}
                            >
                              <option value="FACILITADOR">Facilitador</option>
                              <option value="COORDINACION">Coordinación</option>
                              <option value="DIRECTOR">Director</option>
                              <option value="ADMIN">Administrador</option>
                            </select>
                            <button 
                              className="ga-btn secondary" 
                              onClick={() => setPasswordModal({ isOpen: true, userId: String(u.id || u._id), password: '' })}
                              style={{ fontSize: 12, padding: '4px 8px' }}
                              title="Establecer contraseña"
                            >
                              🔑
                            </button>
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
              {users.map((u) => (
                <div key={u.id || u._id} className="ga-card" style={{ marginBottom: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{u.name || 'Sin nombre'}</div>
                      <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>{u.email}</div>
                      <span className={`ga-badge ${u.role === 'ADMIN' ? 'approved' : u.role === 'DIRECTOR' ? 'review' : 'draft'}`}>
                        {u.role}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: 'block', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>Cambiar rol:</span>
                      <select 
                        className="ga-select" 
                        value={u.role} 
                        onChange={(e) => updateRole(String(u.id || u._id), e.target.value)}
                      >
                        <option value="FACILITADOR">Facilitador</option>
                        <option value="COORDINACION">Coordinación</option>
                        <option value="DIRECTOR">Director</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    </label>
                    <button 
                      className="ga-btn secondary" 
                      onClick={() => setPasswordModal({ isOpen: true, userId: String(u.id || u._id), password: '' })}
                      style={{ fontSize: 12, width: '100%', marginTop: 8 }}
                    >
                      🔑 Establecer contraseña
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal para establecer contraseña */}
      {passwordModal.isOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.currentTarget === e.target) {
              setPasswordModal({ isOpen: false, userId: null, password: '' });
            }
          }}
        >
          <div 
            style={{
              background: 'white',
              padding: 24,
              borderRadius: 8,
              maxWidth: 400,
              width: '90%',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Establecer contraseña</h3>
            <label style={{ display: 'block', marginBottom: 8 }}>
              Nueva contraseña (mínimo 8 caracteres)<br />
              <input 
                className="ga-input" 
                type="password"
                value={passwordModal.password} 
                onChange={(e) => setPasswordModal({ ...passwordModal, password: e.target.value })} 
                style={{ width: '100%', marginTop: 4 }}
                autoFocus
              />
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button 
                className="ga-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  setPasswordModal({ isOpen: false, userId: null, password: '' });
                }}
              >
                Cancelar
              </button>
              <button 
                className="ga-btn primary" 
                onClick={(e) => {
                  e.stopPropagation();
                  setPassword();
                }}
                disabled={!passwordModal.password || passwordModal.password.length < 8}
              >
                Establecer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

