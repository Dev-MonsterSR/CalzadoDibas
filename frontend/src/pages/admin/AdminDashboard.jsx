import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.dashboard().then(res => setStats(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Cargando...</p>;

  const cards = [
    { icon: 'inventory_2', label: 'Productos', value: stats?.total_products, color: 'var(--primary-container)', link: '/admin/products' },
    { icon: 'receipt_long', label: 'Pedidos', value: stats?.total_orders, color: '#3b82f6', link: '/admin/orders' },
    { icon: 'group', label: 'Usuarios', value: stats?.total_users, color: '#10b981', link: '/admin/users' },
    { icon: 'category', label: 'Categorías', value: stats?.total_categories, color: '#8b5cf6', link: '/admin/categories' },
  ];

  return (
    <section style={{ padding: '48px 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>Dashboard Admin</h1>
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 14 }}>← Volver a la tienda</Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 40 }}>
          {cards.map((c, i) => (
            <Link key={i} to={c.link} style={{
              background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
              padding: 28, border: '1px solid var(--outline-variant)',
              transition: 'transform 0.2s, border-color 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = c.color; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--outline-variant)'; }}
            >
              <span className="material-symbols-outlined" style={{ color: c.color, fontSize: 32, marginBottom: 12 }}>{c.icon}</span>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>{c.label}</p>
              <p style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>{c.value ?? '—'}</p>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 28, border: '1px solid var(--outline-variant)' }}>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Acciones rápidas</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[['/admin/products', 'Gestionar Productos'], ['/admin/orders', 'Gestionar Pedidos'], ['/admin/users', 'Usuarios'], ['/admin/categories', 'Categorías'], ['/admin/coupons', 'Cupones']].map(([path, label]) => (
              <Link key={path} to={path}>
                <button style={{
                  padding: '10px 20px', borderRadius: 'var(--radius)',
                  background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
                  border: '1px solid var(--outline-variant)', fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.target.style.borderColor = 'var(--primary-container)'; e.target.style.color = 'var(--primary-container)'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'var(--outline-variant)'; e.target.style.color = 'var(--text-muted)'; }}
                >{label}</button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
