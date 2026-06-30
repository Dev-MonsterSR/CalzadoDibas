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

function BarChart({ data, height = 180 }) {
  // data: [{label, value, color?}]
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = Math.max(360, data.length * 50);  // ancho minimo 360, 50px por barra
  const h = height;
  const padding = { top: 30, right: 20, bottom: 30, left: 50 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const barWidth = Math.min(30, (chartW / data.length) * 0.7);
  const slot = chartW / data.length;

  // 4 lineas de grid horizontales
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
    y: padding.top + chartH * (1 - pct),
    value: max * pct,
  }));

  return (
    <div style={{ position: 'relative', height: h, width: '100%', overflow: 'hidden' }}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary-container)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--primary-container)" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        {/* Grid lines horizontales */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padding.left} y1={g.y} x2={w - padding.right} y2={g.y} stroke="var(--outline-variant)" strokeWidth="0.5" strokeDasharray={i === 0 ? '0' : '2,2'} opacity="0.4" />
            <text x={padding.left - 6} y={g.y + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="monospace">
              {g.value === 0 ? '0' : g.value >= 1000 ? `${(g.value / 1000).toFixed(1)}k` : g.value.toFixed(0)}
            </text>
          </g>
        ))}
        {/* Barras */}
        {data.map((d, i) => {
          const barH = (d.value / max) * chartH;
          const x = padding.left + slot * i + (slot - barWidth) / 2;
          const y = padding.top + chartH - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barH} fill="url(#barGrad)" rx={2} />
              {/* Valor encima de la barra (solo si es >0) */}
              {d.value > 0 && (
                <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fill="var(--text-secondary)" fontSize="9" fontWeight="600" fontFamily="monospace">
                  {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value.toFixed(0)}
                </text>
              )}
              {/* Label debajo */}
              <text x={x + barWidth / 2} y={h - 10} textAnchor="middle" fill="var(--text-muted)" fontSize="10">
                {d.label}
              </text>
            </g>
          );
        })}
        {/* Eje X (linea base) */}
        <line x1={padding.left} y1={padding.top + chartH} x2={w - padding.right} y2={padding.top + chartH} stroke="var(--outline-variant)" strokeWidth="1" />
      </svg>
    </div>
  );
}

function LineChart({ data, height = 180 }) {
  // data: [{label, value}]
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = Math.max(360, data.length * 50);
  const h = height;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const slot = chartW / Math.max(1, data.length - 1);
  const points = data.map((d, i) => ({
    x: padding.left + slot * i,
    y: padding.top + chartH - (d.value / max) * chartH,
    value: d.value,
    label: d.label,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  // Grid lines horizontales (5 lineas: 0, 25, 50, 75, 100%)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
    y: padding.top + chartH * (1 - pct),
    value: max * pct,
  }));

  return (
    <div style={{ position: 'relative', height: h, width: '100%', overflow: 'hidden' }}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary-container)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary-container)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines horizontales */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padding.left} y1={g.y} x2={w - padding.right} y2={g.y} stroke="var(--outline-variant)" strokeWidth="0.5" strokeDasharray={i === 0 ? '0' : '2,2'} opacity="0.4" />
            <text x={padding.left - 6} y={g.y + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="monospace">
              {g.value === 0 ? '0' : g.value >= 1000 ? `${(g.value / 1000).toFixed(1)}k` : g.value.toFixed(0)}
            </text>
          </g>
        ))}
        {/* Area debajo de la linea */}
        <path d={areaD} fill="url(#lineGrad)" />
        {/* Linea */}
        <path d={pathD} fill="none" stroke="var(--primary-container)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Puntos y labels */}
        {points.map((p, i) => (
          <g key={i}>
            {/* Halo blanco para que el punto resalte */}
            <circle cx={p.x} cy={p.y} r="5" fill="var(--bg-secondary)" />
            <circle cx={p.x} cy={p.y} r="3.5" fill="var(--primary-container)" />
            {/* Valor encima del punto (solo si es >0) */}
            {p.value > 0 && (
              <text x={p.x} y={p.y - 10} textAnchor="middle" fill="var(--text-secondary)" fontSize="9" fontWeight="600" fontFamily="monospace">
                {p.value >= 1000 ? `${(p.value / 1000).toFixed(1)}k` : p.value.toFixed(0)}
              </text>
            )}
            {/* Label debajo */}
            <text x={p.x} y={h - 8} textAnchor="middle" fill="var(--text-muted)" fontSize="10">
              {p.label}
            </text>
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
  const [salesRange, setSalesRange] = useState('1m');

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

  // Filtrar stock bajo: solo mostrar tiendas (no fabrica)
  const lowStockFiltered = (stats?.low_stock || []).filter(item => item.warehouse !== 'fabrica');

  // Agrupar stock bajo por producto (un producto puede tener stock bajo en varias sedes)
  const lowStockByProduct = {};
  for (const item of lowStockFiltered) {
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

  // === Selector de rango de tiempo para el grafico de ventas ===
  // State declarado ARRIBA del early return (regla de React: hooks en el mismo orden)
  const RANGE_OPTIONS = [
    { value: '7d', label: '7 dias' },
    { value: '1m', label: '1 mes' },
    { value: '3m', label: '3 meses' },
    { value: '6m', label: '6 meses' },
    { value: '1y', label: '1 año' },
  ];

  // Calcular datos segun el rango
  const getSalesChartData = () => {
    if (salesRange === '7d') {
      // Ultimos 7 dias (diario) - 7 puntos
      return (stats?.daily_sales || []).map(d => ({
        label: new Date(d.day).toLocaleDateString('es-PE', { weekday: 'short' }).slice(0, 3),
        value: parseFloat(d.revenue || 0),
        orders: d.orders || 0,
      }));
    } else if (salesRange === '1m') {
      // Ultimas 4 semanas - 4 puntos (semana por semana)
      return (stats?.weekly_sales || []).map(w => ({
        label: w.label,
        value: parseFloat(w.revenue || 0),
        orders: w.orders || 0,
      }));
    } else if (salesRange === '3m' || salesRange === '6m') {
      // Por mes, ultimos 6 meses
      return (stats?.monthly_sales || []).map(m => ({
        label: m.month,
        value: parseFloat(m.revenue || 0),
        orders: m.orders || 0,
      }));
    } else if (salesRange === '1y') {
      // Por mes, ultimos 12 meses (12 puntos)
      return (stats?.yearly_sales || []).map(m => ({
        label: m.label,
        value: parseFloat(m.revenue || 0),
        orders: m.orders || 0,
      }));
    }
    return [];
  };
  const dailyChart = getSalesChartData();
  const totalRange = dailyChart.reduce((s, d) => s + d.value, 0);
  const ordersRange = dailyChart.reduce((s, d) => s + d.orders, 0);

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

  // Line chart: ventas (calculado arriba segun el rango seleccionado)
  // const dailyChart eliminado - ya se calcula en getSalesChartData()

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
        <Card title="Ventas" icon="trending_up" action={
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSalesRange(opt.value)}
                style={{
                  background: salesRange === opt.value ? 'var(--primary-container)' : 'var(--bg-tertiary)',
                  color: salesRange === opt.value ? '#000' : 'var(--text-muted)',
                  border: 'none',
                  padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                  fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >{opt.label}</button>
            ))}
          </div>
        }>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 700, fontFamily: 'monospace' }}>
              S/ {totalRange.toFixed(2)}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              {ordersRange} pedido{ordersRange !== 1 ? 's' : ''}
            </span>
          </div>
          {dailyChart.length === 0 || totalRange === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 32 }}>
              Sin ventas en este rango
            </p>
          ) : (
            <LineChart data={dailyChart} height={180} />
          )}
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
              {lowStockFiltered.length}
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
