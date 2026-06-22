import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, useCartStore } from '../store';

export default function Header() {
  const { user, logout } = useAuthStore();
  const { items } = useCartStore();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: scrolled ? 'var(--bg-secondary)' : 'var(--bg-primary)',
      borderBottom: `1px solid var(--outline-variant)`,
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      transition: 'all 0.3s ease',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="CALZADOS DIBA'S" style={{ height: 56, width: 'auto' }} />
        </Link>

        {/* Desktop Nav */}
        <nav style={{ display: 'flex', gap: 24 }} className="desktop-nav">
          {[['/', 'Inicio'], ['/catalogo', 'Catálogo'], ['/nosotros', 'Nosotros'], ['/contacto', 'Contacto']].map(([path, label]) => (
            <Link key={path} to={path} style={{
              color: path === window.location.pathname ? 'var(--primary-container)' : 'var(--text-muted)',
              fontWeight: path === window.location.pathname ? 700 : 500,
              fontSize: 14, letterSpacing: '0.05em',
              borderBottom: path === window.location.pathname ? '2px solid var(--primary-container)' : 'none',
              paddingBottom: 4,
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => e.target.style.color = 'var(--primary-container)'}
              onMouseLeave={e => {
                if (path !== window.location.pathname) e.target.style.color = 'var(--text-muted)';
              }}
            >{label}</Link>
          ))}
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user ? (
            <>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Hola, {user.name}</span>
              <Link to="/orders" style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>
                Mis Pedidos
              </Link>
              {(user.role === 'admin' || user.role === 'vendedor_trujillo' || user.role === 'vendedor_lima') && (
                <Link to={user.role === 'admin' ? '/admin' : '/seller'} style={{
                  background: 'var(--primary-container)', color: '#000',
                  padding: '6px 16px', borderRadius: 'var(--radius-full)',
                  fontSize: 13, fontWeight: 700, letterSpacing: '0.02em',
                }}>
                  {user.role === 'admin' ? '🛡 Admin' : '🏪 Vendedor'}
                </Link>
              )}
              <button onClick={() => { logout(); navigate('/'); }} style={{
                fontSize: 14, color: 'var(--text-muted)', background: 'none',
                border: 'none', cursor: 'pointer', letterSpacing: '0.05em',
              }}>Salir</button>
            </>
          ) : (
            <Link to="/login" style={{
              background: 'var(--primary-container)', color: '#000',
              padding: '8px 20px', borderRadius: 'var(--radius)',
              fontSize: 14, fontWeight: 600, letterSpacing: '0.03em',
              transition: 'filter 0.2s',
            }}
              onMouseEnter={e => e.target.style.filter = 'brightness(1.1)'}
              onMouseLeave={e => e.target.style.filter = 'brightness(1)'}
            >Ingresar</Link>
          )}

          <Link to="/cart" style={{
            color: 'var(--primary-container)', position: 'relative',
            display: 'flex', alignItems: 'center', cursor: 'pointer',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>shopping_cart</span>
            {totalItems > 0 && (
              <span style={{
                position: 'absolute', top: -8, right: -10,
                background: 'var(--primary-container)', color: '#000',
                borderRadius: 'var(--radius-full)',
                width: 20, height: 20, fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{totalItems}</span>
            )}
          </Link>

          {/* Mobile menu */}
          <button onClick={() => setMobileOpen(!mobileOpen)} style={{
            background: 'none', color: 'var(--text-primary)',
            padding: 0,
          }} className="mobile-menu-btn">
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>{mobileOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div style={{
          background: 'var(--bg-secondary)', borderTop: '1px solid var(--outline-variant)',
          padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {[['/', 'Inicio'], ['/catalogo', 'Catálogo'], ['/nosotros', 'Nosotros'], ['/contacto', 'Contacto']].map(([path, label]) => (
            <Link key={path} to={path} onClick={() => setMobileOpen(false)} style={{
              color: 'var(--text-muted)', fontSize: 16, fontWeight: 500, padding: '8px 0',
            }}>{label}</Link>
          ))}
        </div>
      )}
    </header>
  );
}
