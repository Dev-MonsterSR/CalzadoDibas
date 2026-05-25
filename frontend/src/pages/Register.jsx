import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services';
import { useAuthStore } from '../store';

export default function Register() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirm: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.passwordConfirm) return setError('Las contraseñas no coinciden');
    setLoading(true);
    try {
      const res = await authService.register({
        name: form.name, email: form.email, password: form.password, phone: form.phone || undefined
      });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse');
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
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.png" alt="CALZADOS DIBA'S" style={{ height: 80, width: 'auto' }} />
        </div>

        <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', padding: '48px 40px' }}>
          <h2 style={{ color: 'var(--text-on-light)', fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 32 }}>Crear Cuenta</h2>

          {error && (
            <div style={{ background: 'var(--error-container)', color: 'var(--error)', padding: '12px 16px', borderRadius: 'var(--radius)', marginBottom: 20, fontSize: 14 }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Name */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>Nombre completo</label>
              <span className="material-symbols-outlined" style={{ position: 'absolute', top: 38, left: 14, color: '#666', fontSize: 20 }}>person</span>
              <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Tu nombre" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary-container)'}
                onBlur={e => e.target.style.borderColor = 'var(--outline-variant)'}
              />
            </div>

            {/* Email */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>Email</label>
              <span className="material-symbols-outlined" style={{ position: 'absolute', top: 38, left: 14, color: '#666', fontSize: 20 }}>mail</span>
              <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                placeholder="tu@email.com" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary-container)'}
                onBlur={e => e.target.style.borderColor = 'var(--outline-variant)'}
              />
            </div>

            {/* Phone */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>Teléfono <span style={{color: '#666'}}>(opcional)</span></label>
              <span className="material-symbols-outlined" style={{ position: 'absolute', top: 38, left: 14, color: '#666', fontSize: 20 }}>phone</span>
              <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="987654321" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary-container)'}
                onBlur={e => e.target.style.borderColor = 'var(--outline-variant)'}
              />
            </div>

            {/* Password */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>Contraseña</label>
              <span className="material-symbols-outlined" style={{ position: 'absolute', top: 38, left: 14, color: '#666', fontSize: 20 }}>lock</span>
              <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                placeholder="Mín. 8 caracteres" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary-container)'}
                onBlur={e => e.target.style.borderColor = 'var(--outline-variant)'}
              />
            </div>

            {/* Confirm */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', color: '#888', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>Confirmar contraseña</label>
              <span className="material-symbols-outlined" style={{ position: 'absolute', top: 38, left: 14, color: '#666', fontSize: 20 }}>lock_reset</span>
              <input type="password" required value={form.passwordConfirm} onChange={e => setForm({...form, passwordConfirm: e.target.value})}
                placeholder="Repite tu contraseña" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary-container)'}
                onBlur={e => e.target.style.borderColor = 'var(--outline-variant)'}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              background: 'var(--primary-container)', color: '#000',
              padding: '14px 32px', borderRadius: 'var(--radius)',
              fontSize: 15, fontWeight: 700, marginTop: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              Crear Cuenta <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 15, color: '#374151' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: 'var(--primary-container)', fontWeight: 600 }}>Inicia sesión</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
