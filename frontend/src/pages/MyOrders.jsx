import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../services';

const statusStyles = {
  pendiente: { bg: '#fef3c7', color: '#92400e', label: 'Pendiente' },
  pagado: { bg: '#d1fae5', color: '#065f46', label: 'Pagado' },
  preparando: { bg: '#dbeafe', color: '#1e40af', label: 'Preparando' },
  enviado: { bg: '#e0e7ff', color: '#3730a3', label: 'Enviado' },
  entregado: { bg: '#d1fae5', color: '#065f46', label: 'Entregado' },
  cancelado: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelado' },
};

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderService.myOrders().then(res => setOrders(res.data.orders || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Cargando...</p>;

  return (
    <section style={{ padding: '48px 0' }}>
      <div className="container">
        <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 700, marginBottom: 32 }}>Mis Pedidos</h1>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--bg-highest)', marginBottom: 16 }}>receipt_long</span>
            <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>No tienes pedidos aún</p>
            <Link to="/catalogo"><button style={{ marginTop: 16, background: 'var(--primary-container)', color: '#000', padding: '10px 24px', borderRadius: 'var(--radius)', fontWeight: 600 }}>Ir al Catálogo</button></Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orders.map(order => {
              const st = statusStyles[order.status] || statusStyles.pendiente;
              return (
                <Link key={order.id} to={`/orders/${order.id}`} style={{
                  background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)',
                  padding: 24, color: 'var(--text-on-light)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'transform 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 18 }}>Pedido #{order.id}</span>
                      <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                    </div>
                    <p style={{ color: '#6b7280', fontSize: 14 }}>{new Date(order.created_at).toLocaleDateString('es-PE')} · {order.items?.length || 0} producto(s)</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary-container)' }}>S/ {parseFloat(order.total).toFixed(2)}</span>
                    <p style={{ color: '#888', fontSize: 12, marginTop: 4 }}>{order.payment_method?.toUpperCase()}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
