import { useState, useEffect, useRef } from 'react';
import { authService } from '../services';
import { useAuthStore } from '../store';
import { useNavigate } from 'react-router-dom';

// Client ID se lee del .env (frontend/.env con VITE_GOOGLE_CLIENT_ID)
// Para rotar el Client ID solo se cambia el .env y se hace rebuild del frontend.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const inputStyle = {
  width: '100%', padding: '14px 16px 14px 44px',
  background: 'var(--bg-dark)', border: '1px solid var(--outline-variant)',
  borderRadius: 'var(--radius)', color: 'var(--text-primary)',
  fontSize: 15, outline: 'none', transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

export default function GoogleLoginButton({ text = 'Continuar con Google' }) {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingData, setPendingData] = useState(null);  // {google_id, email, name} cuando requiere telefono
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const buttonRef = useRef(null);

  const navigateAfterLogin = (user) => {
    const role = user?.role;
    if (role === 'admin' || role === 'fabrica') {
      navigate('/admin');
    } else if (role === 'vendedor_trujillo' || role === 'vendedor_lima') {
      navigate('/seller');
    } else {
      navigate('/');
    }
  };

  // Decodifica el JWT de Google (sin verificar firma - solo para extraer info)
  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  // Un solo useEffect que:
  // 1) Espera a que el SDK de Google cargue (window.google)
  // 2) Llama a initialize() UNA SOLA VEZ
  // 3) Renderiza el boton oficial
  // El array de dependencias vacio [] garantiza que solo se ejecute al montar.
  useEffect(() => {
    let initialized = false;
    let cleaned = false;

    // Decodifica el JWT de Google (sin verificar firma - solo para extraer info)
    const parseJwt = (token) => {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        );
        return JSON.parse(jsonPayload);
      } catch {
        return null;
      }
    };

    // Maneja el callback de Google con el JWT del usuario
    const handleCredentialResponse = async (response) => {
      setError('');
      setLoading(true);
      try {
        const payload = parseJwt(response.credential);
        if (!payload) {
          throw new Error('No se pudo decodificar la respuesta de Google');
        }
        const { sub: google_id, email, name } = payload;
        if (!email || !google_id) {
          throw new Error('Faltan datos de Google');
        }

        const res = await authService.loginGoogle({ google_id, email, name });

        if (res.data.requires_phone) {
          setPendingData(res.data);
          setLoading(false);
          return;
        }

        login(res.data.token, res.data.user);
        navigateAfterLogin(res.data.user);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Error con Google');
      } finally {
        setLoading(false);
      }
    };

    const tryInit = () => {
      if (!window.google || initialized || cleaned) return;
      initialized = true;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      if (buttonRef.current) {
        // Configurar el boton oficial de Google.
        // use_fedcm_for_prompt: true activa el popup nativo del navegador (FedCM)
        // que muestra la lista de cuentas de Google en un dialogo modal
        // nativo (en vez de una ventana separada).
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 360,
          use_fedcm_for_prompt: true,
        });
      }
    };

    if (window.google) {
      tryInit();
    } else {
      const interval = setInterval(() => {
        if (window.google && !initialized && !cleaned) {
          clearInterval(interval);
          tryInit();
        }
      }, 200);
      const timeout = setTimeout(() => {
        clearInterval(interval);
        cleaned = true;
      }, 15000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
        cleaned = true;
      };
    }
  }, []);

  // Manejar el submit del modal de completar perfil
  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPhoneError('');

    // Validar telefono peruano
    if (!/^9\d{8}$/.test(phone)) {
      setPhoneError('El telefono debe empezar con 9 y tener 9 digitos.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.completeGoogleProfile({
        google_id: pendingData.google_id,
        phone,
        address: address.trim() || null,
      });
      login(res.data.token, res.data.user);
      navigateAfterLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al completar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setPendingData(null);
    setPhone('');
    setAddress('');
    setPhoneError('');
    setError('');
  };

  return (
    <>
      <div style={{ width: '100%' }}>
        <div ref={buttonRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 40 }} />
        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
            Iniciando sesion con Google...
          </p>
        )}
        {error && !pendingData && (
          <p style={{ color: 'var(--error)', fontSize: 12, textAlign: 'center', marginTop: 8 }}>{error}</p>
        )}
      </div>

      {/* Modal de completar perfil (cuando el usuario no tiene telefono) */}
      {pendingData && (
        <div
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCompleteSubmit}
            className="login-card"
            style={{
              background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)',
              padding: '32px 28px', maxWidth: 420, width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <h2 style={{ color: 'var(--text-on-light)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                  Hola, {pendingData.name.split(' ')[0]}!
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                  Para completar tu registro necesitamos unos datos mas.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 0 }}
              >×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
              {/* Email (read-only) */}
              <div>
                <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 4, fontWeight: 500 }}>Email</label>
                <input type="email" value={pendingData.email} readOnly style={{ ...inputStyle, background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }} />
              </div>

              {/* Telefono (obligatorio) */}
              <div>
                <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 4, fontWeight: 500 }}>
                  Telefono <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="987654321"
                  maxLength={9}
                  required
                  autoFocus
                  style={phoneError ? { ...inputStyle, borderColor: 'var(--error)' } : inputStyle}
                />
                {phoneError && (
                  <p style={{ color: 'var(--error)', fontSize: 11, marginTop: 4 }}>{phoneError}</p>
                )}
                <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>Necesario para entregas</p>
              </div>

              {/* Direccion (opcional) */}
              <div>
                <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 4, fontWeight: 500 }}>
                  Direccion <span style={{ color: 'var(--text-muted)' }}>(opcional)</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Av. Principal 123, Trujillo"
                  style={inputStyle}
                />
              </div>
            </div>

            {error && (
              <p style={{ color: 'var(--error)', fontSize: 12, textAlign: 'center', marginTop: 12 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 mt-5 py-3 rounded font-bold text-sm transition-all hover:brightness-110 disabled:opacity-50"
              style={{ background: 'var(--primary-container)', color: '#000' }}
            >
              {loading ? 'Completando...' : 'Completar registro'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
