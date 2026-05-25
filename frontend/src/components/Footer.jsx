import { Link } from 'react-router-dom';

export default function Footer() {
  const linkStyle = {
    color: 'var(--text-muted)', fontSize: 13, fontWeight: 500,
    transition: 'color 0.2s', opacity: 0.8,
  };

  return (
    <footer style={{
      background: 'var(--bg-secondary)', borderTop: '1px solid var(--outline-variant)',
      marginTop: 'auto',
    }}>
      <div className="container" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 32, padding: '48px 0',
      }}>
        {/* Brand */}
        <div>
          <img src="/logo.png" alt="CALZADOS DIBA'S" style={{ height: 72, width: 'auto', marginBottom: 12, display: 'block' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
            © 2026 CALZADOS DIBA'S.<br/>Todos los derechos reservados.
          </p>
        </div>

        {/* Tiendas */}
        <div>
          <h4 style={{ color: 'var(--primary-container)', fontSize: 14, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 12, textTransform: 'uppercase' }}>
            Nuestras Tiendas
          </h4>
          <ul style={{ listStyle: 'none' }}>
            <li style={{ marginBottom: 8 }}>
              <a href="#" style={linkStyle} onMouseEnter={e => e.target.style.opacity = '1'} onMouseLeave={e => e.target.style.opacity = '0.8'}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>location_on</span>
                Trujillo: Jr. Pizarro 456
              </a>
            </li>
            <li>
              <a href="#" style={linkStyle} onMouseEnter={e => e.target.style.opacity = '1'} onMouseLeave={e => e.target.style.opacity = '0.8'}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>location_on</span>
                Lima: Av. Larco 1024
              </a>
            </li>
          </ul>
        </div>

        {/* Síguenos */}
        <div>
          <h4 style={{ color: 'var(--primary-container)', fontSize: 14, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 12, textTransform: 'uppercase' }}>
            Síguenos
          </h4>
          <div style={{ display: 'flex', gap: 16 }}>
            {['facebook', 'instagram', 'chat'].map(social => (
              <a key={social} href="#" style={{ ...linkStyle, display: 'flex', alignItems: 'center', gap: 6 }}
                onMouseEnter={e => e.target.style.opacity = '1'} onMouseLeave={e => e.target.style.opacity = '0.8'}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{social}</span>
                {social === 'chat' ? 'WhatsApp' : social.charAt(0).toUpperCase() + social.slice(1)}
              </a>
            ))}
          </div>
        </div>

        {/* Links */}
        <div>
          <h4 style={{ color: 'var(--primary-container)', fontSize: 14, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 12, textTransform: 'uppercase' }}>
            Navegación
          </h4>
          <ul style={{ listStyle: 'none' }}>
            {[['/', 'Inicio'], ['/catalogo', 'Catálogo'], ['/nosotros', 'Nosotros'], ['/contacto', 'Contacto']].map(([path, label]) => (
              <li key={path} style={{ marginBottom: 6 }}>
                <Link to={path} style={linkStyle} onMouseEnter={e => e.target.style.opacity = '1'} onMouseLeave={e => e.target.style.opacity = '0.8'}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
