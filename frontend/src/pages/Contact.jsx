export default function Contact() {
  const infoCards = [
    { icon: 'location_on', title: 'Trujillo', lines: ['Jr. Pizarro 456', 'Lun - Sáb: 9am - 8pm'] },
    { icon: 'location_on', title: 'Lima', lines: ['Av. Larco 1024', 'Lun - Sáb: 9am - 8pm'] },
    { icon: 'phone', title: 'Teléfono', lines: ['+51 945 123 456', 'WhatsApp disponible'] },
  ];

  return (
    <>
      <section style={{ padding: '64px 0 32px', textAlign: 'center' }}>
        <div className="container">
          <h1 style={{ color: '#fff', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, marginBottom: 12 }}>Contacto</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 17, maxWidth: 600, margin: '0 auto' }}>
            Estamos aquí para ayudarte. Visítanos o escríbenos.
          </p>
        </div>
      </section>

      <section style={{ padding: '32px 0 64px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 48 }}>
            {infoCards.map((c, i) => (
              <div key={i} style={{
                background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)',
                padding: 32, textAlign: 'center', color: 'var(--text-on-light)',
              }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)', fontSize: 40, marginBottom: 16 }}>{c.icon}</span>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{c.title}</h3>
                {c.lines.map((l, j) => <p key={j} style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.6 }}>{l}</p>)}
              </div>
            ))}
          </div>

          {/* Contact Form */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 40, maxWidth: 600, margin: '0 auto', border: '1px solid var(--outline-variant)' }}>
            <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>Envíanos un mensaje</h2>
            <form style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <input type="text" placeholder="Nombre" style={{
                padding: '14px 16px', background: 'var(--bg-dark)', border: '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 15, outline: 'none',
              }} />
              <input type="email" placeholder="Email" style={{
                padding: '14px 16px', background: 'var(--bg-dark)', border: '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 15, outline: 'none',
              }} />
              <textarea rows={5} placeholder="Mensaje" style={{
                padding: '14px 16px', background: 'var(--bg-dark)', border: '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 15, outline: 'none', resize: 'vertical',
              }}/>
              <button type="submit" style={{
                background: 'var(--primary-container)', color: '#000', padding: '14px 32px',
                borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 700,
              }}>Enviar Mensaje</button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
