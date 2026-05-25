import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '../services';
import ProductCard from '../components/ProductCard';

const benefits = [
  { icon: 'verified', title: 'Calidad Garantizada', desc: 'Materiales premium y acabados perfectos en cada par.' },
  { icon: 'local_offer', title: 'Descuento por Mayor', desc: 'Precios especiales para compras de 3+ pares. Ideal para revendedores.' },
  { icon: 'location_on', title: 'Dos Tiendas, Un Servicio', desc: 'Encuéntranos en Trujillo y Lima con la misma atención de primera.' },
];

const stats = [
  { icon: 'workspace_premium', value: '10+', label: 'Años de Experiencia' },
  { icon: 'storefront', value: '2', label: 'Tiendas Físicas' },
  { icon: 'category', value: '500+', label: 'Modelos Exclusivos' },
];

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService.list({ limit: 4 }).then(res => setFeatured(res.data.products || [])).finally(() => setLoading(false));
  }, []);

  const glassCard = {
    background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-xl)',
    padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 8, transition: 'transform 0.3s ease',
  };

  const btnPrimary = {
    background: 'var(--primary-container)', color: '#000',
    padding: '14px 32px', borderRadius: 'var(--radius)',
    fontSize: 14, fontWeight: 700, letterSpacing: '0.03em',
    transition: 'filter 0.2s', border: 'none', cursor: 'pointer',
  };

  const btnSecondary = {
    background: 'transparent', color: 'var(--primary-dim)',
    padding: '14px 32px', borderRadius: 'var(--radius)',
    fontSize: 14, fontWeight: 600, letterSpacing: '0.03em',
    border: '1px solid var(--primary-dim)', cursor: 'pointer',
    transition: 'background 0.2s',
  };

  return (
    <>
      {/* Hero */}
      <section style={{
        position: 'relative', minHeight: '85vh', display: 'flex', alignItems: 'center',
        overflow: 'hidden',
      }}>
        {/* Background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, #0A0A0A 0%, #1a1510 50%, #0A0A0A 100%)',
          }}/>
          {/* Decorative shapes */}
          <div style={{ position: 'absolute', top: '10%', right: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)' }}/>
          <div style={{ position: 'absolute', bottom: '20%', left: '5%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)' }}/>
        </div>

        <div className="container" style={{ position: 'relative', zIndex: 1, width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }} className="hero-grid">
            {/* Left */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <h1 style={{
                color: '#fff', fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.1,
                fontWeight: 700, letterSpacing: '-0.02em',
              }}>
                Calza con estilo <br/><span style={{ color: 'var(--primary-container)' }}>y comodidad</span>
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 18, lineHeight: 1.6, maxWidth: 480 }}>
                Descubre la colección exclusiva de CALZADOS DIBA'S. Artesanía premium, diseño contemporáneo y el ajuste perfecto para cada ocasión.
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                <Link to="/catalogo">
                  <button style={btnPrimary} onMouseEnter={e => e.target.style.filter = 'brightness(1.1)'} onMouseLeave={e => e.target.style.filter = 'brightness(1)'}>
                    Ver Catálogo
                  </button>
                </Link>
                <Link to="/nosotros">
                  <button style={btnSecondary} onMouseEnter={e => e.target.style.background = 'rgba(245,158,11,0.1)'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                    Conoce Nuestra Historia
                  </button>
                </Link>
              </div>
            </div>

            {/* Right - Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {stats.map((s, i) => (
                <div key={i} style={{
                  ...glassCard,
                  transform: i % 2 === 0 ? 'translateY(8px)' : 'translateY(-8px)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = i % 2 === 0 ? 'translateY(8px)' : 'translateY(-8px)'; }}
                >
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)', fontSize: 36 }}>{s.icon}</span>
                  <span style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>{s.value}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section style={{
        padding: '64px 0', borderTop: '1px solid var(--outline-variant)',
        borderBottom: '1px solid var(--outline-variant)',
        background: 'var(--bg-secondary)',
      }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
          {benefits.map((b, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 16, padding: '32px 24px', textAlign: 'center',
              borderLeft: i > 0 ? '1px solid var(--outline-variant)' : 'none',
              borderRight: i < 2 ? '1px solid var(--outline-variant)' : 'none',
            }} className="benefit-item">
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--bg-highest)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)', fontSize: 32 }}>{b.icon}</span>
              </div>
              <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 600 }}>{b.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section style={{ padding: '64px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ color: '#fff', fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Productos Destacados</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>La selección de la temporada para ti.</p>
            </div>
            <Link to="/catalogo" style={{
              color: 'var(--primary-dim)', fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4, letterSpacing: '0.03em',
            }}>
              Ver todo el catálogo <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
            </Link>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 48 }}>Cargando...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
              {featured.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
