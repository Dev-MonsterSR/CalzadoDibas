import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';

const statusMap = {
  pendiente: { bg: '#fef3c7', color: '#92400e', label: 'Pendiente' },
  pagado: { bg: '#d1fae5', color: '#065f46', label: 'Pagado' },
  preparando: { bg: '#dbeafe', color: '#1e40af', label: 'Preparando' },
  enviado: { bg: '#e0e7ff', color: '#3730a3', label: 'Enviado' },
  entregado: { bg: '#d1fae5', color: '#065f46', label: 'Entregado' },
  cancelado: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelado' },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.listOrders().then(res => setOrders(res.data.orders || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Cargando...</p>;

  return (
    <section style={{ padding: '48px 0' }}>
      <div className="container">
        <Link to="/admin" style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8, display: 'block' }}>← Dashboard</Link>
        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginBottom: 32 }}>Gestión de Pedidos</h1>

        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                {['ID', 'Cliente', 'Total', 'Estado', 'Fecha'].map(h => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const st = statusMap[o.status] || statusMap.pendiente;
                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                    <td style={{ padding: '12px 20px', fontWeight: 600, color: '#fff' }}>#{o.id}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <div>
                        <span style={{ color: '#fff', fontWeight: 500 }}>{o.customer_name || 'N/A'}</span>
                        <p style={{ color: '#888', fontSize: 12 }}>{o.customer_email || ''}</p>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', fontWeight: 700, color: 'var(--primary-container)' }}>S/ {parseFloat(o.total).toFixed(2)}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 14, color: '#888' }}>{new Date(o.created_at).toLocaleDateString('es-PE')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
