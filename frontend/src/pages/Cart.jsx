import { Link, useNavigate } from 'react-router-dom';
import { useCartStore, useAuthStore } from '../store';

export default function Cart() {
  const { items, updateQuantity, removeItem, clear, getSubtotal, getTotal, isWholesale } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <section style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--bg-highest)' }}>shopping_cart</span>
        <h2 style={{ color: '#fff', fontSize: 24 }}>Tu carrito está vacío</h2>
        <Link to="/catalogo">
          <button style={{
            background: 'var(--primary-container)', color: '#000',
            padding: '12px 28px', borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 600,
          }}>Ver Catálogo</button>
        </Link>
      </section>
    );
  }

  return (
    <section style={{ padding: '48px 0' }}>
      <div className="container">
        <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 700, marginBottom: 32 }}>Carrito</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start' }}>
          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.map((item, i) => (
              <div key={i} style={{
                background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)',
                padding: 20, display: 'flex', gap: 20, color: 'var(--text-on-light)',
              }}>
                <img src={item.product.primary_image || item.product.images?.[0]?.image_url || '/logo.png'} alt={item.product.name}
                  style={{ width: 120, height: 120, borderRadius: 'var(--radius)', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{item.product.name}</h3>
                  <p style={{ color: '#888', fontSize: 14, marginBottom: 12 }}>Talla: {item.size}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      <button onClick={() => updateQuantity(i, item.quantity - 1)} style={{
                        width: 32, height: 32, border: '1px solid #d1d5db', borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                        background: '#f9fafb', cursor: 'pointer', color: '#374151',
                      }}>−</button>
                      <span style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #d1d5db', borderLeft: 'none', borderRight: 'none', fontSize: 14, fontWeight: 600 }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(i, item.quantity + 1)} style={{
                        width: 32, height: 32, border: '1px solid #d1d5db', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                        background: '#f9fafb', cursor: 'pointer', color: '#374151',
                      }}>+</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: 18, fontWeight: 700 }}>S/ {(item.price * item.quantity).toFixed(2)}</span>
                      <button onClick={() => removeItem(i)} style={{
                        background: 'none', color: '#ef4444', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div style={{
            background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)',
            padding: 28, color: 'var(--text-on-light)', position: 'sticky', top: 96,
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Resumen</h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#6b7280' }}>Subtotal</span>
              <span style={{ fontWeight: 600 }}>S/ {getSubtotal().toFixed(2)}</span>
            </div>

            {isWholesale() && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: 'var(--primary-container)', fontWeight: 600 }}>💰 Descuento mayorista</span>
                <span style={{ color: 'var(--primary-container)', fontWeight: 700 }}>-S/ {(getSubtotal() - getTotal()).toFixed(2)}</span>
              </div>
            )}

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-container)' }}>S/ {getTotal().toFixed(2)}</span>
            </div>

            <button onClick={() => { if (!user) { navigate('/login'); return; } navigate('/checkout'); }} style={{
              width: '100%', padding: '14px 32px', marginTop: 20,
              background: 'var(--primary-container)', color: '#000',
              borderRadius: 'var(--radius)', fontSize: 16, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              Proceder al Pago <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
