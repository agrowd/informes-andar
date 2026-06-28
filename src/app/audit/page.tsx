"use client";
import { useEffect, useState } from 'react';

export default function AuditPage() {
  const [items, setItems] = useState<any[]>([]);
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (entityType) qs.set('entityType', entityType);
      if (entityId) qs.set('entityId', entityId);
      const r = await fetch('/api/audit?' + qs.toString());
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setItems(j.items || []);
    } catch (err) {
      console.error('Error cargando auditoría:', err);
      alert('Error al cargar auditoría');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, []);

  return (
    <div>
      <h1>Bitácora de auditoría</h1>
      <div className="ga-card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label>
            Tipo de entidad<br />
            <select 
              className="ga-select" 
              value={entityType} 
              onChange={(e) => setEntityType(e.target.value)}
              style={{ minWidth: 150 }}
            >
              <option value="">Todos</option>
              <option value="FORM">Cuadrículas</option>
              <option value="REPORT">Informes</option>
              <option value="YOUNG">Jóvenes</option>
              <option value="USER">Usuarios</option>
            </select>
          </label>
          <label>
            ID de entidad<br />
            <input 
              className="ga-input" 
              placeholder="ID específico (opcional)" 
              value={entityId} 
              onChange={(e) => setEntityId(e.target.value)}
              style={{ minWidth: 200 }}
            />
          </label>
          <button className="ga-btn primary" onClick={load} disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
          <button className="ga-btn" onClick={() => {
            setEntityType('');
            setEntityId('');
            load();
          }}>
            Limpiar filtros
          </button>
        </div>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Cargando...</div>
      ) : items.length === 0 ? (
        <div className="ga-card">
          <p style={{ color: 'var(--muted)', textAlign: 'center' }}>No se encontraron registros de auditoría.</p>
        </div>
      ) : (
        <div className="ga-card">
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Registros encontrados: {items.length}</h3>
          </div>
          <div className="ga-table-mobile-wrap">
            <table className="ga-table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Tipo de entidad</th>
                  <th>ID de entidad</th>
                  <th>Acción</th>
                  <th>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a._id || a.id}>
                    <td>{new Date(a.createdAt || a.created_at).toLocaleString('es-AR')}</td>
                    <td><span className="ga-badge">{a.entityType || a.entity_type}</span></td>
                    <td><code style={{ fontSize: 11 }}>{String(a.entityId || a.entity_id || '').substring(0, 24)}...</code></td>
                    <td><span className="ga-badge" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#1E40AF' }}>{a.action}</span></td>
                    <td>
                      <details>
                        <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--muted)' }}>Ver detalles</summary>
                        <pre style={{ margin: '8px 0 0 0', fontSize: 11, whiteSpace: 'pre-wrap', background: '#F9FAFB', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 200 }}>
                          {JSON.stringify(a.meta || {}, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


