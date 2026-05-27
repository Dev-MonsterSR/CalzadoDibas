import { Link } from 'react-router-dom';

export default function Footer() {
  const linkStyle = {
    color: 'var(--text-muted)', fontSize: 13, fontWeight: 500,
    transition: 'color 0.2s', opacity: 0.8,
  };

  const socialLinks = [
    { name: 'Facebook', href: 'https://facebook.com', brand: '#1877F2' },
    { name: 'Instagram', href: 'https://instagram.com', brand: '#E4405F' },
    { name: 'WhatsApp', href: 'https://wa.me/', brand: '#25D366' },
  ];

  const socialIcon = (name) => {
    if (name === 'Facebook') {
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="currentColor" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.03 1.79-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.33l-.53 3.5h-2.8V24C19.61 23.09 24 18.1 24 12.07Z"/>
        </svg>
      );
    }

    if (name === 'Instagram') {
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="currentColor" d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85 0 3.2-.01 3.58-.07 4.85-.15 3.23-1.67 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07-3.2 0-3.58-.01-4.85-.07-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85 0-3.2.01-3.58.07-4.85.15-3.24 1.66-4.77 4.92-4.92 1.27-.06 1.65-.07 4.85-.07Zm0-2.16C8.74 0 8.33.01 7.05.07 2.69.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12c0 3.26.01 3.67.07 4.95.2 4.36 2.62 6.78 6.98 6.98 1.28.06 1.69.07 4.95.07 3.26 0 3.67-.01 4.95-.07 4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95 0-3.26-.01-3.67-.07-4.95-.2-4.35-2.63-6.78-6.98-6.98C15.67.01 15.26 0 12 0Zm0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84Zm0 10.16A4 4 0 1 1 12 8a4 4 0 0 1 0 8Zm6.41-10.84a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z"/>
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="currentColor" d="M16.75 13.96c.25.13 1.48.73 1.69.81.21.08.36.13.41.21.05.08.08.92-.23 1.81-.31.89-1.82 1.69-2.49 1.76-.64.07-1.45.1-2.34-.18-.54-.17-1.24-.4-2.14-.78-3.77-1.63-6.22-5.46-6.4-5.71-.18-.25-1.53-2.04-1.53-3.89 0-1.85.97-2.76 1.31-3.14.34-.37.74-.46.99-.46.25 0 .49 0 .7.01.22.01.51-.08.8.62.31.76 1.05 2.63 1.14 2.82.09.19.15.41.03.66-.12.25-.18.41-.36.63-.18.21-.38.48-.54.64-.18.18-.37.38-.16.74.21.36.93 1.54 1.99 2.5 1.37 1.22 2.52 1.6 2.88 1.78.36.18.57.15.78-.09.21-.25.9-1.05 1.14-1.41.24-.36.48-.3.8-.18Z"/>
      </svg>
    );
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {socialLinks.map(({ name, href, brand }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noreferrer"
                style={{
                  ...linkStyle,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: '1px solid var(--outline-variant)',
                  borderRadius: 999,
                  padding: '8px 12px',
                  width: 'fit-content',
                  minWidth: 140,
                  background: 'var(--bg-primary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.borderColor = brand;
                  e.currentTarget.style.color = brand;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                  e.currentTarget.style.borderColor = 'var(--outline-variant)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                {socialIcon(name)}
                <span>{name}</span>
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
