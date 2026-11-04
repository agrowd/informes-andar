"use client";
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useActiveCycle } from '@/lib/cycleState';

export default function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [userRole, setUserRole] = useState<string>('');
  const { activeYear, setActiveYear } = useActiveCycle();
  
  useEffect(() => {
    if (session?.user) {
      const role = (session.user as any).role || 'FACILITADOR';
      setUserRole(role);
    }
  }, [session]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href);
  };
  const cls = (href: string) => `ga-link${isActive(href) ? ' active' : ''}`;

  const canManageUsers = ['ADMIN', 'DIRECTOR'].includes(userRole);
  const canViewAudit = ['ADMIN', 'DIRECTOR', 'COORDINACION'].includes(userRole);
  const canManageTalleres = ['ADMIN', 'DIRECTOR', 'COORDINACION'].includes(userRole);

  // No mostrar navbar en la página de login
  if (pathname === '/login') {
    return null;
  }

  if (status === 'loading') {
    return <nav className="ga-nav"><div>Cargando...</div></nav>;
  }

  if (!session) {
    return (
      <nav className="ga-nav">
        <a className={cls('/')} href="/">Inicio</a>
        <div className="ga-spacer" />
        <a className="ga-link" href="/login">Ingresar</a>
      </nav>
    );
  }

  return (
    <nav className="ga-nav" style={{ alignItems: 'center' }}>
      <a className={cls('/')} href="/">Inicio</a>
      <a className={cls('/form')} href="/form">Cargar Informe</a>
      <a className={cls('/forms')} href="/forms">Cuadrícula Mensual</a>
      <a className={cls('/reports')} href="/reports">Informes</a>
      <a className={cls('/final-reports')} href="/final-reports">Informe Final</a>
      <a className={cls('/youngs')} href="/youngs">Jóvenes</a>
      {canManageTalleres && <a className={cls('/talleres')} href="/talleres">Talleres</a>}
      {canManageUsers && <a className={cls('/users')} href="/users">Usuarios</a>}
      {canViewAudit && <a className={cls('/audit')} href="/audit">Auditoría</a>}
      
      <div className="ga-spacer" />

      {/* Selector de Ciclo Lectivo */}
      <div 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 6, 
          background: activeYear === '2027' ? '#fef3c7' : '#eff6ff', 
          border: `1px solid ${activeYear === '2027' ? '#f59e0b' : '#bfdbfe'}`,
          padding: '4px 10px', 
          borderRadius: 20,
          marginRight: 10
        }}
        title="Ciclo lectivo activo: cambia de año para ver o cargar formularios e informes correspondientes a ese ciclo"
      >
        <span style={{ fontSize: 12, fontWeight: 800, color: activeYear === '2027' ? '#b45309' : '#1e40af' }}>
          📅 Ciclo:
        </span>
        <select
          value={activeYear}
          onChange={(e) => setActiveYear(e.target.value)}
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: activeYear === '2027' ? '#92400e' : '#1e3a8a',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            outline: 'none',
            padding: 0
          }}
        >
          <option value="2026">2026 (Consolidado)</option>
          <option value="2027">2027 (Nuevo Ciclo)</option>
          <option value="2028">2028</option>
        </select>
      </div>

      <span className="ga-desktop-only" style={{ fontSize: 12, color: '#666', marginRight: 8 }}>
        {session.user?.name || session.user?.email} ({userRole})
      </span>
      <a className="ga-link" href="/api/auth/signout" style={{border:'1px solid var(--border)',padding:'6px 12px',borderRadius:8,whiteSpace:'nowrap'}}>Salir</a>
    </nav>
  );
}
