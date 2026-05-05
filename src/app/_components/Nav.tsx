"use client";
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [userRole, setUserRole] = useState<string>('');
  
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
    <nav className="ga-nav">
      <a className={cls('/')} href="/">Tablero</a>
      <a className={cls('/form')} href="/form">Cargar Informe</a>
      <a className={cls('/forms')} href="/forms">Formularios</a>
      <a className={cls('/reports')} href="/reports">Informes</a>
      <a className={cls('/youngs')} href="/youngs">Jóvenes</a>
      {canManageTalleres && <a className={cls('/talleres')} href="/talleres">Talleres</a>}
      {canManageUsers && <a className={cls('/users')} href="/users">Usuarios</a>}
      {canViewAudit && <a className={cls('/audit')} href="/audit">Auditoría</a>}
      <div className="ga-spacer" />
      <span className="ga-desktop-only" style={{ fontSize: 12, color: '#666', marginRight: 8 }}>
        {session.user?.name || session.user?.email} ({userRole})
      </span>
      <a className="ga-link" href="/api/auth/signout" style={{border:'1px solid var(--border)',padding:'6px 12px',borderRadius:8,whiteSpace:'nowrap'}}>Salir</a>
    </nav>
  );
}


