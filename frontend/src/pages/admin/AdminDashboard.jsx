import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';

// === Componentes de graficas SVG ===

function DonutChart({ data, size = 160 }) {
  // data: [{label, value, color}]
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = size / 2;
  const inner = radius * 0.6;
  const cx = radius;
  const cy = radius;
  let acc = 0;

  const segments = data.map((d, i) => {
    const start = (acc / total) * 360;
    acc += d.value;
    const end = (acc / total) * 360;
    const startRad = (start - 90) * Math.PI / 180;
    const endRad = (end - 90) * Math.PI / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const large = end - start > 180 ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
    return { path: path, color: d.color, label: d.label, value: d.value, percent: ((d.value / total) * 100).toFixed(0) };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {segments.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} />
        ))}
        <circle cx={cx} cy={cy} r={inner} fill="var(--bg-secondary)" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#fff" fontSize="20" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-muted)" fontSize="10">total</text>
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{s.value}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 10, minWidth: 30, textAlign: 'right' }}>{s.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data, height = 160 }) {
  // data: [{label, value, color?}]
  const max = Math.max(...data.map(d => d.value), 1);
  const barWidth = 100 / data.length; // %
  return (
    <div style={{ height, position: 'relative' }}>
      <svg width="100%" height={height} preserveAspectRatio="none" viewBox={`0 0 ${data.length * 10} 100`} style={{ width: '100%', height: '100%' }}>
        {data.map((d, i) => {
          const h = (d.value / max) * 80;
          return (
            <g key={i}>
              <rect x={i * 10 + 1} y={90 - h} width={8} height={h} fill={d.color || 'var(--primary-container)'} rx={1} />
            </g>
          );
        })}
      </svg>
      <div style={{ position: 'absolute', bottom: -18, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', fontSize: 10, color: 'var(--text-muted)' }}>
        {data.map((d, i) => (
          <span key={i} style={{ flex: 1, textAlign: 'center' }}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

function LineChart({ data, height = 160 }) {
  // data: [{label, value}]
  const max = Math.max(...data.map(d => d.value), 1);
  const w = data.length * 60;
  const h = height;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1 || 1)) * (w - 40) + 20,
    y: h - 30 - (d.value / max) * (h - 60),
    value: d.value,
    label: d.label,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${h - 20} L ${points[0].x} ${h - 20} Z`;

  return (
    <div style={{ position: 'relative', height: h + 20, marginBottom: 8 }}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary-container)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--primary-container)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#lineGrad)" />
        <path d={pathD} fill="none" stroke="var(--primary-container)" strokeWidth="2" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="var(--primary-container)" />
            <text x={p.x} y={h - 5} textAnchor="middle" fill="var(--text-muted)" fontSize="9">{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function MiniBar({ value, max, color = 'var(--primary-container)' }) {
  const percent = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ width: '100%', height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${percent}%`, height: '100%', background: color, transition: 'width 0.5s ease' }} />
    </div>
  );
}

// === Componente principal ===

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.dashboard().then(res => setStats(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
      <span className="spinner" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 12 }} />
      Cargando dashboard...
    </div>
  );

  // === Calculos para los widgets ===
  const topSellers = stats?.top_sellers?.slice(0, 5) || [];
  const maxTopSeller = Math.max(...topSellers.map(s => parseFloat(s.total_sold || 0)), 1);
  const lowStock = stats?.low_stock?.slice(0, 5) || [];

  // Agrupar stock bajo por producto (un producto puede tener stock bajo en varias sedes)
  const lowStockByProduct = {};
  for (const item of stats?.low_stock || []) {
    if (!lowStockByProduct[item.product_id]) {
      lowStockByProduct[item.product_id] = {
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code,
        warehouses: [],
      };
    }
    lowStockByProduct[item.product_id].warehouses.push(item);
  }
  const groupedLowStock = Object.values(lowStockByProduct).slice(0, 5);

  // Mapeo de codigo de sede a nombre legible
  const WAREHOUSE_LABELS = {
    fabrica: { name: 'Fabrica', icon: 'factory' },
    tienda_trujillo: { name: 'Trujillo', icon: 'storefront' },
    tienda_lima: { name: 'Lima', icon: 'storefront' },
  };
  const WAREHOUSE_COLORS = {
    fabrica: '#8b5cf6',
    tienda_trujillo: '#f59e0b',
    tienda_lima: '#3b82f6',
  };

  // Status breakdown
  const statusBreakdown = (stats?.status_breakdown || []).reduce((acc, s) => {
    acc[s.status] = s.count;
    return acc;
  }, {});

  // Sales by warehouse
  const salesByWarehouse = (stats?.sales_by_warehouse || []).reduce((acc, s) => {
    acc[s.delivery_location] = s;
    return acc;
  }, {});

  // Donut chart: ventas por sede
  const trujilloOrders = parseInt(salesByWarehouse.trujillo?.orders || 0);
  const limaOrders = parseInt(salesByWarehouse.lima?.orders || 0);
  const warehouseDonut = [
    { label: 'Trujillo', value: trujilloOrders, color: '#f59e0b' },
    { label: 'Lima', value: limaOrders, color: '#3b82f6' },
  ];

  // Donut chart: pedidos por estado (top 4)
  const statusDonut = Object.entries(statusBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([status, count], i) => ({
      label: status,
      value: count,
      color: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][i] || '#6b7280',
    }));

  // Line chart: ventas ultimos 7 dias
  const dailyChart = (stats?.daily_sales || []).map(d => ({
    label: new Date(d.day).toLocaleDateString('es-PE', { weekday: 'short' }).slice(0, 3),
    value: parseFloat(d.revenue || 0),
  }));

  // Bar chart: pedidos por status
  const statusBar = Object.entries(statusBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([status, count], i) => ({
      label: status,
      value: count,
      color: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'][i] || '#6b7280',
    }));

  // Tarjeta generica
  const Card = ({ title, icon, children, action }) => (
    <div style={{
      background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
      padding: 20, border: '1px solid var(--outline-variant)', height: '100%',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--primary-container)' }}>{icon}</span>}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Resumen general de CALZADO'S DIBA'S
          </p>
        </div>
        <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>storefront</span>
          Ver tienda
        </Link>
      </div>

      {/* 4 KPI cards principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { icon: 'payments', label: 'Ingresos totales', value: `S/ ${parseFloat(stats?.total_revenue || 0).toFixed(2)}`, color: '#f59e0b' },
          { icon: 'receipt_long', label: 'Pedidos', value: stats?.total_orders || 0, color: '#3b82f6' },
          { icon: 'inventory_2', label: 'Productos', value: stats?.total_products || 0, color: '#8b5cf6' },
          { icon: 'group', label: 'Usuarios', value: stats?.total_users || 0, color: '#10b981' },
        ].map((c, i) => (
          <div key={i} style={{
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
            padding: 16, border: '1px solid var(--outline-variant)',
            display: 'flex', alignItems: 'center', gap: 12,
            transition: 'transform 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius)',
              background: `${c.color}20`, color: c.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{c.icon}</span>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</p>
              <p style={{ color: '#fff', fontSize: 20, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Fila 1: Ventas 7 dias + Ventas por sede */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <Card title="Ventas ultimos 7 dias" icon="trending_up" action={
          <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'monospace' }}>
            S/ {dailyChart.reduce((s, d) => s + d.value, 0).toFixed(2)}
          </span>
        }>
          <LineChart data={dailyChart} />
        </Card>

        <Card title="Pedidos por sede" icon="store">
          {trujilloOrders === 0 && limaOrders === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 32 }}>Sin pedidos aun</p>
          ) : (
            <DonutChart data={warehouseDonut} />
          )}
        </Card>
      </div>

      {/* Fila 2: Top productos + Stock bajo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <Card title="Productos mas vendidos" icon="star" action={
          <Link to="/admin/products" style={{ color: 'var(--primary-container)', fontSize: 11, fontWeight: 600 }}>Ver todos</Link>
        }>
          {topSellers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 32 }}>Sin ventas aun</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topSellers.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--primary-container)', color: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#fff', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <MiniBar value={parseFloat(p.total_sold || 0)} max={maxTopSeller} />
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, minWidth: 28, textAlign: 'right' }}>
                    {parseInt(p.total_sold || 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Stock bajo" icon="warning" action={
          groupedLowStock.length > 0 ? (
            <span style={{ background: 'var(--error-container)', color: 'var(--error)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
              {stats?.low_stock?.length || 0}
            </span>
          ) : null
        }>
          {groupedLowStock.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#10b981' }}>check_circle</span>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>Todo en orden</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groupedLowStock.map((group, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: 8,
                  background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 18, marginTop: 2, flexShrink: 0 }}>warning</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#fff', fontSize: 12, fontWeight: 500, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.product_name}</p>
                    {/* Lista de sedes con stock bajo */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {group.warehouses.map((w, j) => {
                        const wl = WAREHOUSE_LABELS[w.warehouse] || { name: w.warehouse, icon: 'inventory' };
                        const wc = WAREHOUSE_COLORS[w.warehouse] || '#ef4444';
                        return (
                          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 12, color: wc }}>{wl.icon}</span>
                            <span style={{ color: wc, fontWeight: 600, minWidth: 56 }}>{wl.name}</span>
                            <span style={{
                              color: 'var(--text-muted)', fontFamily: 'monospace',
                              marginLeft: 'auto', fontWeight: 700, color: 'var(--error)',
                            }}>
                              {w.stock} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ min {w.min_stock}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {group.warehouses.length > 1 && (
                      <p style={{ color: 'var(--text-muted)', fontSize: 9, marginTop: 4, fontStyle: 'italic' }}>
                        ⚠ En {group.warehouses.length} sedes
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Fila 3: Pedidos por estado (bar) + Pedidos recientes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <Card title="Pedidos por estado" icon="donut_large">
          {statusBar.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 32 }}>Sin pedidos</p>
          ) : (
            <>
              <BarChart data={statusBar} height={130} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 20 }}>
                {statusBar.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', flex: 1, textTransform: 'capitalize' }}>{s.label.replace(/_/g, ' ')}</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card title="Pedidos recientes" icon="schedule" action={
          <Link to="/admin/orders" style={{ color: 'var(--primary-container)', fontSize: 11, fontWeight: 600 }}>Ver todos</Link>
        }>
          {(!stats?.recent_orders || stats.recent_orders.length === 0) ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 32 }}>Sin pedidos</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
              {stats.recent_orders.slice(0, 5).map((o, i) => {
                const st = o.status;
                const colors = {
                  pagado: '#3b82f6', preparando: '#f59e0b', listo_recojo: '#8b5cf6',
                  entregado: '#10b981', cancelado: '#ef4444', pendiente: '#f59e0b',
                };
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: colors[st] || '#6b7280', flexShrink: 0,
                    }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, minWidth: 28 }}>#{o.id}</span>
                    <span style={{ color: '#fff', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customer_name || '—'}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'capitalize' }}>{st?.replace(/_/g, ' ')}</span>
                    <span style={{ color: 'var(--primary-container)', fontSize: 12, fontWeight: 700, minWidth: 70, textAlign: 'right' }}>S/ {parseFloat(o.total).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
