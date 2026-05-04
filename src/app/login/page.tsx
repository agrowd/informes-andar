"use client";
import { signIn, getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Si ya está logueado, redirigir al dashboard
    getSession().then(session => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  const handleCredentialsLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      setLoading(false);
      return;
    }
    
    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl: '/dashboard'
      });
      
      if (result?.error) {
        console.error('Error en login:', result.error);
        setError(result.error === 'CredentialsSignin' ? 'Email o contraseña incorrectos' : 'Error al iniciar sesión. Intenta nuevamente.');
        setLoading(false);
      } else if (result?.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError('Error desconocido al iniciar sesión');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error en login:', err);
      setError('Error al iniciar sesión. Por favor intenta nuevamente.');
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div className="ga-card" style={{ 
        maxWidth: 420, 
        width: '100%', 
        padding: '32px 28px',
        margin: '0 16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        background: '#fff',
        borderRadius: '12px'
      }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: 8, 
          fontSize: 'clamp(24px, 5vw, 32px)',
          fontWeight: 600,
          color: '#333'
        }}>
          Sistema de Informes Andar
        </h1>
        <p style={{
          textAlign: 'center',
          marginBottom: 32,
          color: '#666',
          fontSize: 14
        }}>
          Inicia sesión para continuar
        </p>
        
        {error && (
          <div style={{ 
            background: '#fee', 
            color: '#c33', 
            padding: 12, 
            borderRadius: 8, 
            marginBottom: 16,
            fontSize: 14,
            border: '1px solid #fcc'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleCredentialsLogin}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Usuario / Email
          </label>
          <input
            type="text"
            name="email"
            required
            className="ga-input"
            style={{ width: '100%', marginBottom: 16 }}
            placeholder="Ingresa tu email o usuario"
            disabled={loading}
            autoComplete="username"
            autoFocus
          />
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Contraseña
          </label>
          <input
            type="password"
            name="password"
            required
            className="ga-input"
            style={{ width: '100%', marginBottom: 20 }}
            placeholder="Ingresa tu contraseña"
            disabled={loading}
            autoComplete="current-password"
          />
          <button 
            type="submit" 
            className="ga-btn primary" 
            style={{ width: '100%', fontSize: 16, padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <p style={{ 
          marginTop: 24, 
          fontSize: 12, 
          color: '#666', 
          textAlign: 'center' 
        }}>
          Al iniciar sesión, aceptas los términos de uso del sistema
        </p>
      </div>
    </div>
  );
}

