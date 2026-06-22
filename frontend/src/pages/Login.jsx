import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services';
import { useAuthStore } from '../store';

export default function Login() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.login(form);
      login(res.data.token, res.data.user);
      const role = res.data.user?.role;
      if (role === 'admin' || role === 'fabrica') {
        navigate('/admin');
      } else if (role === 'vendedor_trujillo' || role === 'vendedor_lima') {
        navigate('/seller');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px 14px 44px',
    background: 'var(--bg-dark)', border: '1px solid var(--outline-variant)',
    borderRadius: 'var(--radius)', color: 'var(--text-primary)',
    fontSize: 15, outline: 'none', transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  };

  return (
    <section style={{
      minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 48,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.png" alt="CALZADOS DIBA'S" style={{ height: 80, width: 'auto' }} />
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface-card)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          padding: '48px 40px',
        }}>
          <h2 style={{
            color: 'var(--text-on-light)', fontSize: 28, fontWeight: 700,
            textAlign: 'center', marginBottom: 32,
          }}>Ingresar</h2>

          {error && (
            <div style={{
              background: 'var(--error-container)', color: 'var(--error)',
              padding: '12px 16px', borderRadius: 'var(--radius)', marginBottom: 20,
              fontSize: 14,
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Email */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>Email</label>
              <span className="material-symbols-outlined" style={{ position: 'absolute', top: 38, left: 14, color: '#666', fontSize: 20 }}>mail</span>
              <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                placeholder="tu@email.com"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary-container)'}
                onBlur={e => e.target.style.borderColor = 'var(--outline-variant)'}
              />
            </div>

            {/* Password */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ color: '#888', fontSize: 13, fontWeight: 500 }}>Contraseña</label>
                <a href="#" style={{ color: 'var(--primary-container)', fontSize: 13, fontWeight: 500 }}>¿Olvidaste tu contraseña?</a>
              </div>
              <span className="material-symbols-outlined" style={{ position: 'absolute', top: 38, left: 14, color: '#666', fontSize: 20 }}>lock</span>
              <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary-container)'}
                onBlur={e => e.target.style.borderColor = 'var(--outline-variant)'}
              />
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              background: 'var(--primary-container)', color: '#000',
              padding: '14px 32px', borderRadius: 'var(--radius)',
              fontSize: 15, fontWeight: 700, marginTop: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'filter 0.2s', letterSpacing: '0.02em',
            }}
              onMouseEnter={e => { if (!loading) e.target.style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => e.target.style.filter = 'brightness(1)'}
            >
              Ingresar <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '28px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }}/>
            <span style={{ color: '#999', fontSize: 13, fontWeight: 500, letterSpacing: '0.05em' }}>O INGRESAR CON</span>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }}/>
          </div>

          {/* Google */}
          <button style={{
            width: '100%', padding: '12px 32px', borderRadius: 'var(--radius)',
            background: '#fff', border: '1px solid #d1d5db',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontSize: 15, fontWeight: 500, color: '#374151', cursor: 'pointer',
          }}>
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98 6.19a24.01 24.01 0 0 0 0 12.82l7.98-6.19v-3.64z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Google
          </button>

          {/* Register link */}
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 15, color: '#374151' }}>
            ¿No tienes una cuenta?{' '}
            <Link to="/register" style={{ color: 'var(--primary-container)', fontWeight: 600 }}>Regístrate aquí</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
