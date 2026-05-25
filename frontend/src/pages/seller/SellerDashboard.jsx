import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sellerService, inventoryService } from '../../services';

export default function SellerDashboard() {
  const [stats, setStats] = useState({});
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    sellerService.dashboard?.().then(res => setStats(res.data || {})).catch(() => setStats({}));
    inventoryService.getMyInventory?.().then(res => {
      const items = res.data?.inventory || [];
      setInventory(items);
      setLowStockItems(items.filter(i => i.stock <= i.min_stock));
    }).catch(() => {});
  }, []);

  if (loading) return <p style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Cargando...</p>;

  return (
    <section style={{ padding: '48px 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>Panel Vendedor</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Gestiona tu inventario y pedidos de recojo</p>
          </div>
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 14 }}>← Volver a la tienda</Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { icon: 'inventory_2', label: 'En Inventario', value: inventory.length, color: 'var(--primary-container)' },
            { icon: 'warning', label: 'Stock Bajo', value: lowStockItems.length, color: '#ef4444' },
            { icon: 'pending', label: 'Pedidos Pendientes', value: stats.pending_pickup || 0, color: '#f59e0b' },
            { icon: 'done_all', label: 'Completados Hoy', value: stats.completed_today || 0, color: '#10b981' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
              padding: 24, border: '1px solid var(--outline-variant)',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <span className="material-symbols-outlined" style={{ color: s.color, fontSize: 28 }}>{s.icon}</span>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{s.label}</p>
                <p style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div style={{
            background: '#1c1917', border: '1px solid #fbbf24',
            borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span className="material-symbols-outlined" style={{ color: '#fbbf24' }}>warning</span>
              <h3 style={{ color: '#fbbf24', fontSize: 16, fontWeight: 600 }}>Alerta de Stock Bajo</h3>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {lowStockItems.map(item => (
                <span key={item.id} style={{
                  background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: 'var(--radius-full)', padding: '4px 12px',
                  color: '#fbbf24', fontSize: 13, fontWeight: 500,
                }}>{item.product_name}: {item.stock} uds.</span>
              ))}
            </div>
          </div>
        )}

        {/* Inventory Table */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--outline-variant)' }}>
            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>Inventario de mi tienda</h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                {['Producto', 'Código', 'Stock Actual', 'Stock Mínimo', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => {
                const isLow = item.stock <= item.min_stock;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                    <td style={{ padding: '12px 20px', color: '#fff', fontWeight: 500 }}>{item.product_name}</td>
                    <td style={{ padding: '12px 20px', fontSize: 14, fontFamily: 'monospace', color: '#888' }}>{item.product_code}</td>
                    <td style={{ padding: '12px 20px', fontWeight: 700, color: isLow ? '#ef4444' : '#fff' }}>{item.stock}</td>
                    <td style={{ padding: '12px 20px', fontSize: 14 }}>{item.min_stock}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600,
                        background: isLow ? '#fee2e2' : '#d1fae5',
                        color: isLow ? '#991b1b' : '#065f46',
                      }}>{isLow ? 'Stock Bajo' : 'OK'}</span>
                    </td>
                  </tr>
                );
              })}
              {inventory.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Sin inventario</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
