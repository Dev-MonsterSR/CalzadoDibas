import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderService } from '../services';
import { useAuthStore } from '../store';

const statusConfig = {
  pendiente: { bg: '#fef3c7', color: '#92400e', label: 'Pendiente', icon: 'schedule' },
  pagado: { bg: '#d1fae5', color: '#065f46', label: 'Pagado', icon: 'check_circle' },
  preparando: { bg: '#dbeafe', color: '#1e40af', label: 'Preparando', icon: 'local_shipping' },
  enviado: { bg: '#e0e7ff', color: '#3730a3', label: 'Enviado', icon: 'local_shipping' },
  entregado: { bg: '#d1fae5', color: '#065f46', label: 'Entregado', icon: 'check_circle' },
  cancelado: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelado', icon: 'cancel' },
};

const paymentLabels = { culqi: 'Tarjeta (Culqi)', yape: 'Yape', plin: 'Plin' };
const deliveryLabels = { recojo_tienda: 'Recojo en tienda', envio_agencia: 'Envío a agencia' };

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [order, setOrder] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    orderService.getById(id).then(res => {
      setOrder(res.data.order);
    }).finally(() => setLoading(false));
  }, [id]);

  const fetchQR = async () => {
    try {
      const res = await orderService.getQR(id);
      setQrCode(res.data.qr_code);
    } catch (err) {
      console.error('QR error:', err);
    }
  };

  const handleUploadProof = async (e) => {
    e.preventDefault();
    if (!proofFile) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('proof', proofFile);
      await orderService.uploadPaymentProof(id, formData);
      setSuccess('Comprobante subido. Esperando confirmación.');
      setOrder({ ...order, payment_proof: 'pending' });
    } catch (err) {
      setError(err.response?.data?.message || 'Error al subir comprobante');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Cargando...</p>;
  if (!order) return <p style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Pedido no encontrado</p>;

  const st = statusConfig[order.status] || statusConfig.pendiente;
  const isPickup = order.delivery_method === 'recojo_tienda';
  const isPendingPayment = order.status === 'pendiente' && (order.payment_method === 'yape' || order.payment_method === 'plin');
  const paymentLabel = paymentLabels[order.payment_method] || order.payment_method;
  const deliveryLabel = deliveryLabels[order.delivery_method] || order.delivery_method;

  const locationLabels = { trujillo: 'Trujillo — Jr. Pizarro 456', lima: 'Lima — Av. Larco 1024' };

  return (
    <section style={{ padding: '48px 0' }}>
      <div className="container" style={{ maxWidth: 800 }}>
        <Link to="/orders" style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, display: 'block' }}>← Volver a mis pedidos</Link>

        <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', padding: 32, color: 'var(--text-on-light)', marginBottom: 24 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700 }}>Pedido #{order.id}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{new Date(order.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <span style={{
              background: st.bg, color: st.color, padding: '6px 16px', borderRadius: 'var(--radius-full)',
              fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{st.icon}</span>
              {st.label}
            </span>
          </div>

          {/* Items */}
          <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: 20 }}>
            {order.items?.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--outline-variant)' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{item.product_name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 8 }}>×{item.quantity}</span>
                </div>
                <span style={{ fontWeight: 600 }}>S/ {(item.price_at_purchase * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24, padding: 20, background: 'var(--bg-dark)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)' }}>
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Método de pago</p>
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{paymentLabel}</p>
            </div>
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Entrega</p>
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{deliveryLabel}{isPickup ? ` (${locationLabels[order.delivery_location] || order.delivery_location})` : ''}</p>
            </div>
            {order.tracking_code && order.payment_method === 'culqi' && (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>ID de transacción</p>
                <p style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{order.tracking_code}</p>
              </div>
            )}
          </div>

          {/* QR Code for pickup orders */}
          {isPickup && order.status === 'pagado' && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button onClick={fetchQR} style={{
                padding: '12px 24px', background: 'var(--primary-container)', color: '#000',
                border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer', fontSize: 14,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <span className="material-symbols-outlined">qr_code</span>
                {qrCode ? 'Actualizar QR' : 'Generar QR de recojo'}
              </button>
              {qrCode && (
                <div style={{ marginTop: 20, padding: 20, background: '#fff', borderRadius: 'var(--radius)', display: 'inline-block' }}>
                  <img src={qrCode} alt="QR de recojo" style={{ width: 250, height: 250 }} />
                  <p style={{ color: '#333', fontSize: 13, marginTop: 8, fontWeight: 600 }}>
                    Presenta este QR al recoger tu pedido
                  </p>
                  <p style={{ color: '#666', fontSize: 12 }}>{locationLabels[order.delivery_location]}</p>
                </div>
              )}
            </div>
          )}

          {/* Upload payment proof for Yape/Plin */}
          {isPendingPayment && (
            <div style={{ marginTop: 24, padding: 20, background: 'var(--bg-dark)', borderRadius: 'var(--radius)', border: '1px solid var(--outline-variant)' }}>
              <p style={{ fontWeight: 600, marginBottom: 12 }}>Subir comprobante de pago</p>
              {error && <p style={{ color: 'var(--error)', fontSize: 13, marginBottom: 8 }}>{error}</p>}
              {success && <p style={{ color: 'var(--success, #059669)', fontSize: 13, marginBottom: 8 }}>{success}</p>}
              <form onSubmit={handleUploadProof}>
                <input type="file" accept="image/*,.pdf" onChange={e => setProofFile(e.target.files[0])}
                  style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-muted)' }} />
                <button type="submit" disabled={uploading || !proofFile} style={{
                  padding: '10px 20px', background: uploading ? '#666' : 'var(--primary-container)',
                  color: '#000', border: 'none', borderRadius: 'var(--radius)', fontWeight: 700,
                  cursor: uploading || !proofFile ? 'not-allowed' : 'pointer', fontSize: 14,
                }}>
                  {uploading ? 'Subiendo...' : 'Subir comprobante'}
                </button>
              </form>
            </div>
          )}

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTop: '2px solid var(--outline-variant)' }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-container)' }}>S/ {parseFloat(order.total).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
