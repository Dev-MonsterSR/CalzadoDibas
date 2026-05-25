export default function About() {
  const timeline = [
    { year: '2014', text: 'Apertura de nuestra primera tienda en Trujillo' },
    { year: '2018', text: 'Expansión a Lima — Av. Larco 1024' },
    { year: '2022', text: 'Lanzamiento de nuestra tienda online' },
    { year: '2026', text: 'Más de 500 modelos y 10 años de experiencia' },
  ];

  return (
    <>
      <section style={{ padding: '64px 0 32px', textAlign: 'center' }}>
        <div className="container">
          <h1 style={{ color: '#fff', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, marginBottom: 12 }}>Nuestra Historia</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 17, maxWidth: 700, margin: '0 auto', lineHeight: 1.7 }}>
            CALZADOS DIBA'S nació con la visión de ofrecer calzado de calidad premium a precios accesibles.
            Desde nuestra primera tienda en Trujillo, nos hemos comprometido con la excelencia en cada par.
          </p>
        </div>
      </section>

      <section style={{ padding: '32px 0 64px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 48, alignItems: 'center', marginBottom: 64 }}>
            <div>
              <h2 style={{ color: 'var(--primary-container)', fontSize: 14, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>NUESTRA MISIÓN</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 20, fontWeight: 600, lineHeight: 1.5, marginBottom: 16 }}>
                Ofrecer calzado que combine estilo, comodidad y durabilidad para cada peruano.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.7 }}>
                Cada par es cuidadosamente seleccionado con materiales premium y acabados perfectos.
                Creemos que el calzado de calidad no debería ser un lujo, sino un derecho.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[{v: '10+', l: 'Años'}, {v: '2', l: 'Tiendas'}, {v: '500+', l: 'Modelos'}, {v: '15K+', l: 'Clientes'}].map((s, i) => (
                <div key={i} style={{
                  background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)',
                  padding: 28, textAlign: 'center', border: '1px solid var(--outline-variant)',
                }}>
                  <span style={{ color: 'var(--primary-container)', fontSize: 36, fontWeight: 700, display: 'block' }}>{s.v}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 40 }}>Nuestro Camino</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600, margin: '0 auto' }}>
            {timeline.map((t, i) => (
              <div key={i} style={{
                display: 'flex', gap: 20, alignItems: 'center',
                padding: 20, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)',
                border: '1px solid var(--outline-variant)',
              }}>
                <span style={{
                  color: '#000', background: 'var(--primary-container)',
                  padding: '6px 14px', borderRadius: 'var(--radius-full)',
                  fontSize: 14, fontWeight: 700, flexShrink: 0,
                }}>{t.year}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 16 }}>{t.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
