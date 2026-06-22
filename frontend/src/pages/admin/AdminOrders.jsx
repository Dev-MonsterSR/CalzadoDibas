import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';

const statusMap = {
  pendiente: { bg: '#fef3c7', color: '#92400e', label: 'Pendiente' },
  pendiente_validacion: { bg: '#fef3c7', color: '#92400e', label: 'Pendiente validación' },
  pagado: { bg: '#d1fae5', color: '#065f46', label: 'Pagado' },
  preparando: { bg: '#dbeafe', color: '#1e40af', label: 'Preparando' },
  enviado: { bg: '#e0e7ff', color: '#3730a3', label: 'Enviado' },
  listo_recojo: { bg: '#ddd6fe', color: '#5b21b6', label: 'Listo para recojo' },
  entregado: { bg: '#d1fae5', color: '#065f46', label: 'Entregado' },
  cancelado: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelado' },
  rechazado_pago: { bg: '#fee2e2', color: '#991b1b', label: 'Pago rechazado' },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const fetchOrders = () => {
    adminService.listOrders().then(res => setOrders(res.data.orders || [])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleReadyPickup = async (orderId) => {
    setBusyId(orderId);
    try {
      const res = await adminService.readyPickup(orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: res.data.order.status } : o));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al marcar como listo');
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setBusyId(orderId);
    try {
      await adminService.updateOrderStatus(orderId, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cambiar estado');
    } finally {
      setBusyId(null);
    }
  };

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
                {['ID', 'Cliente', 'Total', 'Estado', 'Fecha', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const st = statusMap[o.status] || statusMap.pendiente;
                const isPaid = o.status === 'pagado';
                const isPreparing = o.status === 'preparando';
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
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {o.delivery_method === 'recojo_tienda' && isPaid && (
                          <button
                            onClick={() => handleUpdateStatus(o.id, 'preparando')}
                            disabled={busyId === o.id}
                            style={{ background: '#dbeafe', color: '#1e40af', border: 'none', padding: '6px 12px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Preparando
                          </button>
                        )}
                        {o.delivery_method === 'recojo_tienda' && isPreparing && (
                          <button
                            onClick={() => handleReadyPickup(o.id)}
                            disabled={busyId === o.id}
                            style={{ background: '#ddd6fe', color: '#5b21b6', border: 'none', padding: '6px 12px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            ✓ Listo recojo
                          </button>
                        )}
                        {o.delivery_method === 'recojo_tienda' && o.status === 'listo_recojo' && (
                          <span style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>Esperando entrega</span>
                        )}
                        {o.delivery_method === 'envio_agencia' && isPaid && (
                          <button
                            onClick={() => handleUpdateStatus(o.id, 'preparando')}
                            disabled={busyId === o.id}
                            style={{ background: '#dbeafe', color: '#1e40af', border: 'none', padding: '6px 12px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Preparar envío
                          </button>
                        )}
                      </div>
                    </td>
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
