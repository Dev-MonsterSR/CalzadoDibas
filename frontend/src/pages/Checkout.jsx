import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService, culqiService } from '../services';
import { useCartStore, useAuthStore } from '../store';

const YAPE_NUMBER = '999555666';
const PLIN_NUMBER = '999555666';

export default function Checkout() {
  const { items, getSubtotal, getTotal, clear, isWholesale } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ delivery_method: 'recojo_tienda', delivery_location: 'trujillo', payment_method: 'yape' });
  const [cardForm, setCardForm] = useState({ card_number: '', cvv: '', expiry_month: '', expiry_year: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('checkout'); // checkout | processing | payment-qr | success

  if (items.length === 0) { navigate('/cart'); return null; }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStep('processing');

    try {
      const orderItems = items.map(i => ({ product_id: i.product.id, quantity: i.quantity }));

      // 1. Create order
      const { data } = await orderService.create({ items: orderItems, ...form });
      const order = data.order;

      // 2. If Culqi payment, process through Culqi
      if (form.payment_method === 'culqi') {
        // Validate card form
        if (!cardForm.card_number || !cardForm.cvv || !cardForm.expiry_month || !cardForm.expiry_year) {
          setError('Completa los datos de la tarjeta');
          setStep('checkout');
          return;
        }

        await culqiService.payWithCard({
          order_id: order.id,
          card_number: cardForm.card_number.replace(/\s/g, ''),
          cvv: cardForm.cvv,
          expiry_month: parseInt(cardForm.expiry_month),
          expiry_year: parseInt(cardForm.expiry_year),
          email: user.email
        });
        clear();
        navigate('/orders');
        return;
      }

      // For Yape/Plin, order stays as "pendiente" - user must upload proof
      clear();
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.culqi_error?.user_message || 'Error al procesar el pago');
      setStep('checkout');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { value: 'yape', label: 'Yape', icon: 'phone_android', color: '#7c3aed' },
    { value: 'plin', label: 'Plin', icon: 'phone_android', color: '#06b6d4' },
    { value: 'culqi', label: 'Tarjeta (Culqi)', icon: 'credit_card', color: 'var(--primary-container)' },
  ];

  if (step === 'processing') {
    return (
      <section style={{ padding: '48px 0', textAlign: 'center' }}>
        <div className="container">
          <div className="spinner" style={{ margin: '40px auto' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 18 }}>Procesando tu pedido...</p>
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: '48px 0' }}>
      <div className="container">
        <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 700, marginBottom: 32 }}>Checkout</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start' }}>
          {/* Form */}
          <form onSubmit={handleSubmit} style={{
            background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)',
            padding: 32, color: 'var(--text-on-light)',
          }}>
            {error && (
              <div style={{ background: 'var(--error-container)', color: 'var(--error)', padding: '12px 16px', borderRadius: 'var(--radius)', marginBottom: 20, fontSize: 14 }}>{error}</div>
            )}

            {/* Delivery Method */}
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Método de entrega</h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              {[['recojo_tienda', 'Recojo en Tienda'], ['envio_agencia', 'Envío a Agencia']].map(([v, l]) => (
                <label key={v} style={{
                  flex: 1, padding: '14px 16px', borderRadius: 'var(--radius)',
                  border: `2px solid ${form.delivery_method === v ? 'var(--primary-container)' : '#d1d5db'}`,
                  background: form.delivery_method === v ? 'rgba(245,158,11,0.05)' : 'transparent',
                  cursor: 'pointer', textAlign: 'center', fontSize: 14, fontWeight: 600,
                }}>
                  <input type="radio" name="delivery" value={v} checked={form.delivery_method === v}
                    onChange={e => setForm({...form, delivery_method: e.target.value})}
                    style={{ display: 'none' }}
                  />
                  {l}
                </label>
              ))}
            </div>

            {/* Location */}
            {form.delivery_method === 'recojo_tienda' && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Tienda de recojo</label>
                <select value={form.delivery_location} onChange={e => setForm({...form, delivery_location: e.target.value})} style={inputStyle}>
                  <option value="trujillo">Trujillo — Jr. Pizarro 456</option>
                  <option value="lima">Lima — Av. Larco 1024</option>
                </select>
              </div>
            )}

            {/* Payment Method */}
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Método de pago</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {paymentMethods.map(m => (
                <label key={m.value} style={{
                  padding: '14px 16px', borderRadius: 'var(--radius)',
                  border: `2px solid ${form.payment_method === m.value ? m.color : '#d1d5db'}`,
                  background: form.payment_method === m.value ? `${m.color}10` : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <input type="radio" name="payment" value={m.value} checked={form.payment_method === m.value}
                    onChange={e => setForm({...form, payment_method: e.target.value})}
                    style={{ display: 'none' }}
                  />
                  <span className="material-symbols-outlined" style={{ color: m.color, fontSize: 24 }}>{m.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{m.label}</span>
                </label>
              ))}
            </div>

            {/* Card form for Culqi */}
            {form.payment_method === 'culqi' && (
              <div style={{ marginBottom: 24, padding: 20, background: 'rgba(245,158,11,0.05)', borderRadius: 'var(--radius)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p style={{ color: 'var(--primary-container)', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>💳 Datos de tarjeta</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Número de tarjeta</label>
                    <input type="text" placeholder="4111 1111 1111 1111" maxLength={19}
                      value={cardForm.card_number}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                        const formatted = v.replace(/(.{4})/g, '$1 ').trim();
                        setCardForm({...cardForm, card_number: formatted});
                      }}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Vencimiento</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select value={cardForm.expiry_month} onChange={e => setCardForm({...cardForm, expiry_month: e.target.value})} style={{...inputStyle, flex: 1}}>
                        <option value="">Mes</option>
                        {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                      </select>
                      <select value={cardForm.expiry_year} onChange={e => setCardForm({...cardForm, expiry_year: e.target.value})} style={{...inputStyle, flex: 1}}>
                        <option value="">Año</option>
                        {[2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>CVV</label>
                    <input type="text" placeholder="123" maxLength={4}
                      value={cardForm.cvv}
                      onChange={e => setCardForm({...cardForm, cvv: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>Procesado de forma segura por Culqi</p>
              </div>
            )}

            {/* Yape info */}
            {form.payment_method === 'yape' && (
              <div style={{ marginBottom: 24, padding: 16, background: '#7c3aed10', borderRadius: 'var(--radius)', border: '1px solid #7c3aed30' }}>
                <p style={{ color: '#7c3aed', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Envía a Yape:</p>
                <p style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{YAPE_NUMBER}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Subirás el comprobante después</p>
              </div>
            )}

            {/* Plin info */}
            {form.payment_method === 'plin' && (
              <div style={{ marginBottom: 24, padding: 16, background: '#06b6d410', borderRadius: 'var(--radius)', border: '1px solid #06b6d430' }}>
                <p style={{ color: '#06b6d4', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Envía a Plin:</p>
                <p style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{PLIN_NUMBER}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Subirás el comprobante después</p>
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '16px 32px',
              background: 'var(--primary-container)', color: '#000',
              borderRadius: 'var(--radius)', fontSize: 16, fontWeight: 700,
              opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? 'Procesando...' : 'Confirmar y Pagar'}
            </button>
          </form>

          {/* Summary */}
          <div style={{
            background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)',
            padding: 28, color: 'var(--text-on-light)', position: 'sticky', top: 96,
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Resumen del pedido</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: '#6b7280' }}>{item.product.name} × {item.quantity}</span>
                  <span style={{ fontWeight: 600 }}>S/ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-container)' }}>S/ {getTotal().toFixed(2)}</span>
            </div>
            {isWholesale() && (
              <p style={{ color: 'var(--primary-container)', fontSize: 13, fontWeight: 600, marginTop: 8, textAlign: 'center' }}>
                🎉 ¡Precio mayorista aplicado!
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const inputStyle = {
  width: '100%', padding: '12px 14px',
  background: 'var(--bg-dark)', border: '1px solid var(--outline-variant)',
  borderRadius: 'var(--radius)', color: 'var(--text-primary)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
