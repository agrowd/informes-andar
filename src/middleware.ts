import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname;
    console.log('[Middleware] Request:', { pathname, hasToken: !!req.nextauth.token });
    
    // Rutas protegidas que requieren autenticación
    const protectedPaths = ['/dashboard', '/forms', '/reports', '/youngs', '/audit', '/users'];
    const isPublicPath = pathname === '/login' || pathname.startsWith('/api/auth');
    const isProtected = protectedPaths.some(path => pathname.startsWith(path)) || 
                        (pathname === '/' && !isPublicPath);
    
    console.log('[Middleware] Verificación:', { isProtected, isPublicPath, hasToken: !!req.nextauth.token });
    
    // Si es una ruta protegida y no tiene token, redirigir al login
    if (isProtected && !req.nextauth.token) {
      console.log('[Middleware] Redirigiendo a login desde:', pathname);
      return NextResponse.redirect(new URL('/login', req.url));
    }
    
    // Si está en login y ya tiene sesión, redirigir al dashboard
    if (pathname === '/login' && req.nextauth.token) {
      console.log('[Middleware] Ya autenticado, redirigiendo a dashboard');
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    
    console.log('[Middleware] Permitir acceso a:', pathname);
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        console.log('[Middleware] authorized callback:', { hasToken: !!token });
        return !!token;
      }
    },
    pages: {
      signIn: '/login'
    }
  }
);

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/forms/:path*',
    '/reports/:path*',
    '/youngs/:path*',
    '/audit/:path*',
    '/users/:path*',
    '/login'
  ]
};
