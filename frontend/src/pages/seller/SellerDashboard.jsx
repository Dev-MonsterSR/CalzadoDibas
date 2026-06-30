import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store';
import { inventoryService } from '../../services';
import QRScanner from '../../components/seller/QRScanner';
import AdjustStockModal from '../../components/seller/AdjustStockModal';
import { useNavigate } from 'react-router-dom';

const locationLabels = { trujillo: 'Trujillo', lima: 'Lima' };
const roleLocationMap = { vendedor_trujillo: 'trujillo', vendedor_lima: 'lima' };

export default function SellerDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('dashboard');
  const [pickupOrders, setPickupOrders] = useState([]);
  const [deliveredToday, setDeliveredToday] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);

  const location = roleLocationMap[user?.role] || '';
  const sellerName = user?.name || 'Asesor de Ventas';
  const sellerInitials = sellerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const fetchData = useCallback(async () => {
    try {
      const [pickupRes, deliveredRes, invRes] = await Promise.allSettled([
        inventoryService.pickupOrders(),
        inventoryService.deliveredToday(),
        inventoryService.getMyInventory(),
      ]);
      if (pickupRes.status === 'fulfilled') setPickupOrders(pickupRes.value.data?.orders || []);
      if (deliveredRes.status === 'fulfilled') setDeliveredToday(deliveredRes.value.data?.orders || []);
      if (invRes.status === 'fulfilled') setInventory(invRes.value.data?.inventory || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh cada 30 segundos para que el vendedor vea pedidos nuevos
    // sin tener que refrescar manualmente la pagina
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const lowStockItems = inventory.filter(i => i.stock <= i.min_stock);
  const totalSalesToday = deliveredToday.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

  const handleScan = async (token) => {
    setVerifying(true);
    setFeedback(null);
    try {
      const res = await inventoryService.verifyQR(token);
      if (res.data?.valid) {
        setFeedback({ type: 'success', message: `✓ Entrega confirmada — Orden #${res.data.order?.id}` });
        fetchData();
      } else {
        setFeedback({ type: 'error', message: res.data?.message || 'QR inválido o expirado' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Error al verificar el código' });
    } finally {
      setVerifying(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleVerifyQR = (orderId) => {
    setScannerOpen(true);
  };

  const handleAdjustStock = (item) => {
    setSelectedInventoryItem(item);
    setAdjustModalOpen(true);
  };

  const handleAdjustSuccess = () => {
    setFeedback({ type: 'success', message: 'Stock ajustado correctamente' });
    fetchData();
    setTimeout(() => setFeedback(null), 4000);
  };

  const filteredInventory = inventory.filter(item =>
    item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex">
      {/* Sidebar - Liquid Glass */}
      <aside
        className="seller-sidebar w-72 border-r border-outline-variant hidden md:flex flex-col h-screen sticky top-0"
        style={{
          background: 'rgba(24, 24, 27, 0.85)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        }}
      >
        <div className="p-stack-md flex items-center justify-center border-b border-outline-variant h-20">
          <img
            alt="Logo Calzados Diba's"
            className="h-10 object-contain"
            src="/logo.png"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling.style.display = 'block';
            }}
          />
          <span style={{ display: 'none', color: 'var(--primary-container)', fontWeight: 800, fontSize: 22, letterSpacing: 1 }}>DIBA'S</span>
        </div>
        <nav className="flex-1 py-stack-md space-y-1 overflow-y-auto px-4">
          <NavItem icon="dashboard" label="Panel" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
          <NavItem icon="add_shopping_cart" label="Venta Nueva" active={currentView === 'pos'} onClick={() => setCurrentView('pos')} />
          <NavItem icon="list_alt" label="Mis Pedidos" active={currentView === 'orders'} onClick={() => setCurrentView('orders')} />
          <NavItem icon="inventory_2" label="Almacén/Stock" active={currentView === 'inventory'} onClick={() => setCurrentView('inventory')} />
          <NavItem icon="person" label="Mi Perfil" active={currentView === 'profile'} onClick={() => setCurrentView('profile')} />
        </nav>
        <div className="p-6 border-t border-outline-variant bg-surface-container/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold">
              {sellerInitials}
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface">{sellerName}</p>
              <p className="text-xs text-on-surface-variant">{locationLabels[location] || 'Personal de Tienda'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-y-auto bg-background p-margin-mobile md:p-margin-desktop">
        
        {/* Feedback */}
        {feedback && (
          <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${
            feedback.type === 'success' 
              ? 'bg-green-500/10 border border-green-500 text-green-400' 
              : 'bg-error-container/20 border border-error text-error'
          }`}>
            <span className="material-symbols-outlined">
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            {feedback.message}
          </div>
        )}

        {/* ============ DASHBOARD VIEW ============ */}
        {currentView === 'dashboard' && (
          <>
            <header
              className="seller-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-stack-lg p-4 rounded-xl"
              style={{
                background: 'rgba(24, 24, 27, 0.7)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface">Panel Operativo</h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">Hola {sellerName}, listo para gestionar las ventas de hoy.</p>
              </div>
              <div className="flex items-center gap-4">
                <button className="p-2 rounded-full border border-outline-variant hover:bg-surface-variant transition-colors relative">
                  <span className="material-symbols-outlined">notifications</span>
                  {lowStockItems.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>}
                </button>
                <div className="h-8 w-px bg-outline-variant mx-2"></div>
                <button onClick={() => setScannerOpen(true)} className="bg-primary-container text-on-primary-container px-6 py-2.5 rounded-lg font-label-md text-label-md flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-xl">photo_camera</span>
                  ESCANEAR QR
                </button>
              </div>
            </header>

            {/* Metric Cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-stack-lg">
              <MetricCard icon="point_of_sale" iconBg="bg-primary-container/10" iconColor="text-primary" label="MIS VENTAS DEL DÍA" value={`S/ ${totalSalesToday.toFixed(2)}`} valueColor="text-primary" badge="Hoy" badgeColor="text-green-400" />
              <MetricCard icon="package_2" iconBg="bg-secondary/10" iconColor="text-secondary" label="PEDIDOS POR PREPARAR" value={pickupOrders.length} valueColor="text-secondary" badge={`${pickupOrders.length} Listos`} badgeColor="text-secondary" />
              <MetricCard icon="assignment_late" iconBg="bg-error-container/20" iconColor="text-error" label="TAREAS PENDIENTES" value={`${lowStockItems.length} Tareas`} valueColor="text-error" badge="Pendiente" badgeColor="text-error" />
            </section>

            {/* Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-gutter">
              {/* Orders Table */}
              <section
                className="xl:col-span-2 overflow-hidden"
                style={{
                  background: 'rgba(24, 24, 27, 0.7)',
                  backdropFilter: 'blur(12px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                }}
              >
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 2 }}>Pedidos para Despacho</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{pickupOrders.length} pedido{pickupOrders.length !== 1 ? 's' : ''} listo{pickupOrders.length !== 1 ? 's' : ''} para entregar</p>
                  </div>
                  <button
                    onClick={() => setCurrentView('orders')}
                    style={{ color: 'var(--primary-container)', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    Ver mi historial
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                        <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</th>
                        <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items</th>
                        <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</th>
                        <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pickupOrders.length === 0 && (
                        <tr><td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay pedidos pendientes de recojo</td></tr>
                      )}
                      {pickupOrders.map(order => {
                        const statusConfig = {
                          'pagado': { label: 'PAGADO', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
                          'preparando': { label: 'PREPARANDO', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
                          'listo_recojo': { label: 'LISTO', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
                          'entregado': { label: 'ENTREGADO', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
                        }[order.status] || { label: order.status, color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
                        return (
                        <tr key={order.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{ color: 'var(--primary-container)', fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}>#{order.id}</span>
                          </td>
                          <td style={{ padding: '14px 20px', color: '#fff', fontSize: 14, fontWeight: 500 }}>
                            {order.customer_name || 'Cliente'}
                          </td>
                          <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                            {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 10px', borderRadius: 999,
                              fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                              color: statusConfig.color, background: statusConfig.bg,
                              border: `1px solid ${statusConfig.color}50`,
                            }}>
                              {statusConfig.label}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleVerifyQR(order.id)}
                              disabled={verifying}
                              className="transition-all hover:brightness-110 active:scale-95"
                              style={{
                                background: 'var(--primary-container)', color: '#000',
                                padding: '8px 14px', borderRadius: 6,
                                fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
                                border: 'none', cursor: verifying ? 'not-allowed' : 'pointer',
                                opacity: verifying ? 0.6 : 1,
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>qr_code_scanner</span>
                              VERIFICAR QR
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Stock Panel */}
              <section
                className="flex flex-col"
                style={{
                  background: 'rgba(24, 24, 27, 0.7)',
                  backdropFilter: 'blur(12px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                }}
              >
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Consulta de Stock</h2>
                    <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: 18 }}>inventory_2</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{
                      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--text-muted)', fontSize: 18, pointerEvents: 'none',
                    }}>search</span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Buscar producto..."
                      style={{
                        width: '100%', padding: '10px 14px 10px 40px',
                        background: 'var(--bg-dark)', border: '1px solid var(--outline-variant)',
                        borderRadius: 'var(--radius)', color: 'var(--text-primary)',
                        fontSize: 13, outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                  {filteredInventory.slice(0, 5).map(item => {
                    const isLow = item.stock <= item.min_stock;
                    return (
                      <div key={item.id} style={{
                        padding: '10px 12px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                            color: isLow ? '#ef4444' : '#10b981',
                            background: isLow ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                            padding: '3px 8px', borderRadius: 999,
                          }}>
                            {isLow ? 'STOCK BAJO' : 'DISPONIBLE'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }}>{item.product_code}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }}>{item.stock} uds</span>
                        </div>
                      </div>
                    );
                  })}
                  {filteredInventory.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: 13 }}>No se encontraron productos</p>}
                  <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      onClick={() => setCurrentView('inventory')}
                      className="w-full transition-all hover:brightness-110"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        color: '#fff', padding: '10px 16px', borderRadius: 8,
                        fontSize: 12, fontWeight: 700,
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>list_alt</span>
                      VER CATALOGO COMPLETO
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* Activity Chart */}
            <section className="mt-stack-lg bg-surface-container rounded-xl border border-outline-variant/30 p-6">
              <div className="mb-8">
                <h2 className="font-title-md text-title-md text-on-surface">Resumen de mi Jornada</h2>
                <p className="text-xs text-on-surface-variant">Entregas completadas hoy: {deliveredToday.length}</p>
              </div>
              <div className="h-48 flex items-end justify-between gap-4">
                {deliveredToday.length > 0 ? deliveredToday.slice(0, 7).map((order, i) => (
                  <div key={order.id} className={`w-full rounded-t-lg group relative transition-all ${i === 2 ? 'bg-primary h-36 hover:brightness-110' : 'bg-primary/20 hover:bg-primary/40'}`} style={{ height: `${Math.max(48, (i + 1) * 24)}px` }} />
                )) : <div className="w-full text-center text-on-surface-variant py-8">Sin entregas registradas hoy</div>}
              </div>
            </section>

            <footer className="mt-stack-lg py-8 text-center border-t border-outline-variant/30">
              <p className="text-xs text-on-surface-variant">© 2026 CALZADOS DIBA'S. Panel del Personal de Tienda - v2.4.0</p>
            </footer>
          </>
        )}

        {/* ============ POS VIEW (Venta Nueva) ============ */}
        {currentView === 'pos' && (
          <>
            <header
              className="seller-header mb-stack-lg p-4 rounded-xl"
              style={{
                background: 'rgba(24, 24, 27, 0.7)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <h1 className="font-headline-lg text-headline-lg text-on-surface">Venta Nueva</h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">Crear un nuevo pedido manualmente</p>
            </header>
            <div style={{
              background: 'rgba(24, 24, 27, 0.7)',
              backdropFilter: 'blur(12px) saturate(180%)',
              WebkitBackdropFilter: 'blur(12px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: 60, textAlign: 'center',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: 20, margin: '0 auto 20px',
                background: 'rgba(200, 169, 110, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(200, 169, 110, 0.3)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--primary-container)' }}>point_of_sale</span>
              </div>
              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Punto de Venta</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
                Esta funcionalidad estara disponible proximamente.<br/>
                Por ahora, los clientes pueden crear pedidos desde la tienda online.
              </p>
              <button
                onClick={() => navigate('/catalogo')}
                className="transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: 'var(--primary-container)', color: '#000',
                  padding: '12px 24px', borderRadius: 8,
                  fontSize: 14, fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
                Ir al Catalogo
              </button>
            </div>
          </>
        )}

        {/* ============ ORDERS VIEW (Mis Pedidos) ============ */}
        {currentView === 'orders' && (
          <>
            <header
              className="seller-header mb-stack-lg p-4 rounded-xl"
              style={{
                background: 'rgba(24, 24, 27, 0.7)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <h1 className="font-headline-lg text-headline-lg text-on-surface">Mis Pedidos</h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">Pedidos asignados a tu sede ({locationLabels[location]})</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-outline-variant/30">
              <button onClick={() => {}} className={`pb-3 font-label-md ${true ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant'}`}>
                Por Entregar ({pickupOrders.length})
              </button>
              <button onClick={() => {}} className={`pb-3 font-label-md ${false ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant'}`}>
                Entregados Hoy ({deliveredToday.length})
              </button>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              {pickupOrders.length === 0 && deliveredToday.length === 0 && (
                <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-12 text-center">
                  <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">inbox</span>
                  <p className="text-on-surface-variant">No hay pedidos asignados</p>
                </div>
              )}

              {pickupOrders.map(order => {
                const statusConfig = {
                  'pagado': { label: 'PAGADO', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: 'credit_card' },
                  'preparando': { label: 'PREPARANDO', color: '#a855f7', bg: 'rgba(168,85,247,0.15)', icon: 'inventory_2' },
                  'listo_recojo': { label: 'LISTO RECOJO', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: 'check_circle' },
                  'entregado': { label: 'ENTREGADO', color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: 'task_alt' },
                }[order.status] || { label: order.status, color: '#6b7280', bg: 'rgba(107,114,128,0.15)', icon: 'pending' };
                return (
                <div key={order.id} style={{
                  background: 'rgba(24, 24, 27, 0.7)',
                  backdropFilter: 'blur(12px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 16,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: statusConfig.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24, color: statusConfig.color }}>
                          {statusConfig.icon}
                        </span>
                      </div>
                      <div>
                        <h3 style={{ color: 'var(--primary-container)', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                          Orden #{order.id}
                        </h3>
                        <p style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
                          {order.customer_name || 'Cliente'}
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                          {order.customer_phone || 'Sin telefono'}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px', borderRadius: 999,
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                        color: statusConfig.color, background: statusConfig.bg,
                        border: `1px solid ${statusConfig.color}40`,
                      }}>
                        {statusConfig.label}
                      </span>
                      <p style={{ color: 'var(--primary-container)', fontSize: 18, fontWeight: 700, marginTop: 8, fontFamily: 'monospace' }}>
                        S/ {parseFloat(order.total).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, marginBottom: 16 }}>
                    {order.items?.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 13 }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, opacity: 0.5 }}>checkroom</span>
                          {item.product_name} <span style={{ color: 'var(--text-muted)' }}>×{item.quantity}</span>
                        </span>
                        <span style={{ color: '#fff', fontWeight: 500, fontFamily: 'monospace' }}>
                          S/ {(item.price_at_purchase * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleVerifyQR(order.id)}
                    disabled={verifying}
                    className="w-full flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-95"
                    style={{
                      background: 'var(--primary-container)', color: '#000',
                      padding: '12px 16px', borderRadius: 8,
                      fontSize: 14, fontWeight: 700, letterSpacing: '0.02em',
                      border: 'none', cursor: verifying ? 'not-allowed' : 'pointer',
                      opacity: verifying ? 0.6 : 1,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>qr_code_scanner</span>
                    VERIFICAR QR Y ENTREGAR
                  </button>
                </div>
                );
              })}

              {deliveredToday.map(order => (
                <div key={order.id} className="bg-surface-container rounded-xl border border-outline-variant/30 p-6 opacity-75">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-title-md text-title-md text-on-surface">Orden #{order.id}</h3>
                      <p className="text-on-surface-variant">{order.customer_name || 'Cliente'}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded">ENTREGADO</span>
                      <p className="text-xs text-on-surface-variant mt-2">
                        {order.delivered_at ? new Date(order.delivered_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ============ INVENTORY VIEW (Almacén/Stock) ============ */}
        {currentView === 'inventory' && (
          <>
            <header
              className="seller-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-stack-lg p-4 rounded-xl"
              style={{
                background: 'rgba(24, 24, 27, 0.7)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface">Almacén / Stock</h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">Inventario de {locationLabels[location]} - Stock por tallas</p>
              </div>
              <button onClick={() => navigate('/catalogo')} className="bg-surface-variant/30 hover:bg-surface-variant/50 text-on-surface px-4 py-2 rounded-lg font-label-md flex items-center gap-2 transition-all">
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                Ver Catálogo
              </button>
            </header>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                <input className="w-full bg-surface-container border border-outline-variant/30 rounded-lg pl-12 pr-4 py-3 text-on-surface focus:ring-primary focus:border-primary" placeholder="Buscar por nombre o código..." type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 12, padding: 16, marginBottom: 24,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: 22 }}>warning</span>
                </div>
                <div>
                  <p style={{ color: '#ef4444', fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Alerta de Stock Bajo</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{lowStockItems.length} producto{lowStockItems.length !== 1 ? 's' : ''} por debajo del minimo</p>
                </div>
              </div>
            )}

            {/* Inventory Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filteredInventory.map(item => {
                const isLow = item.stock <= item.min_stock;
                const sizes = item.sizes || [];
                const stockPercent = Math.min(100, (item.stock / (item.min_stock * 3)) * 100);
                return (
                  <div key={item.id} style={{
                    background: 'rgba(24, 24, 27, 0.7)',
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    border: `1px solid ${isLow ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 12, padding: 20,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{item.product_name}</h3>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px', borderRadius: 999,
                            fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
                            color: isLow ? '#ef4444' : '#10b981',
                            background: isLow ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                            border: `1px solid ${isLow ? '#ef444440' : '#10b98140'}`,
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                              {isLow ? 'trending_down' : 'check_circle'}
                            </span>
                            {item.stock} uds total
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, color: 'var(--text-muted)', fontSize: 12, flexWrap: 'wrap' }}>
                          <span>Codigo: <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{item.product_code}</span></span>
                          <span>Minimo: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{item.min_stock} uds</span></span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAdjustStock(item)}
                        className="transition-all hover:brightness-110 active:scale-95"
                        style={{
                          background: 'var(--primary-container)', color: '#000',
                          padding: '8px 16px', borderRadius: 8,
                          fontSize: 13, fontWeight: 700,
                          border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                        Ajustar Stock
                      </button>
                    </div>

                    {/* Sizes Grid */}
                    {sizes.length > 0 && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock por Talla</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 8 }}>
                          {sizes.map(s => {
                            const isSizeLow = s.stock === 0;
                            const isSizeWarning = s.stock > 0 && s.stock <= 2;
                            const sizeColor = isSizeLow ? '#ef4444' : isSizeWarning ? '#f59e0b' : '#10b981';
                            const sizeBg = isSizeLow ? 'rgba(239,68,68,0.08)' : isSizeWarning ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)';
                            return (
                              <div
                                key={s.size}
                                style={{
                                  padding: '10px 8px', borderRadius: 8,
                                  background: sizeBg,
                                  border: `1px solid ${sizeColor}50`,
                                  textAlign: 'center',
                                }}
                              >
                                <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{s.size}</div>
                                <div style={{ color: sizeColor, fontSize: 13, fontWeight: 700, marginTop: 2 }}>{s.stock}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Stock Bar */}
                    <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          width: `${stockPercent}%`,
                          height: '100%',
                          background: isLow ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, #10b981, #34d399)',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', minWidth: 36, textAlign: 'right' }}>
                        {Math.round(stockPercent)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredInventory.length === 0 && (
              <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">inventory_2</span>
                <p className="text-on-surface-variant">No se encontraron productos</p>
              </div>
            )}
          </>
        )}

        {/* ============ PROFILE VIEW (Mi Perfil) ============ */}
        {currentView === 'profile' && (
          <>
            <header
              className="seller-header mb-stack-lg p-4 rounded-xl"
              style={{
                background: 'rgba(24, 24, 27, 0.7)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <h1 className="font-headline-lg text-headline-lg text-on-surface">Mi Perfil</h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">Informacion de tu cuenta</p>
            </header>

            <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Profile card */}
              <div style={{
                background: 'rgba(24, 24, 27, 0.7)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: 32,
                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary-container) 0%, #8b6f3a 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#000', fontSize: 28, fontWeight: 800, flexShrink: 0,
                    boxShadow: '0 4px 16px rgba(200, 169, 110, 0.4)',
                  }}>
                    {sellerInitials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{sellerName}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>{user?.email}</p>
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 999,
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
                      color: 'var(--primary-container)', background: 'rgba(200, 169, 110, 0.12)',
                      border: '1px solid rgba(200, 169, 110, 0.3)',
                    }}>
                      {locationLabels[location] || 'Personal de Tienda'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { label: 'Rol', value: user?.role === 'vendedor_trujillo' ? 'Vendedor - Trujillo' : 'Vendedor - Lima', icon: 'badge' },
                    { label: 'Email', value: user?.email, icon: 'mail' },
                    { label: 'Sede asignada', value: locationLabels[location], icon: 'storefront' },
                  ].map(field => (
                    <div key={field.label} style={{
                      padding: '12px 16px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: 'rgba(200, 169, 110, 0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--primary-container)' }}>{field.icon}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{field.label}</p>
                        <p style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{field.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={logout}
                className="transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  padding: '14px 24px', borderRadius: 10,
                  fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                Cerrar Sesion
              </button>
            </div>
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation - Liquid Glass */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 flex items-center justify-around"
        style={{
          background: 'rgba(24, 24, 27, 0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
        }}
      >
        <button onClick={() => setCurrentView('dashboard')} className={`${currentView === 'dashboard' ? 'text-primary' : 'text-on-surface-variant'} flex flex-col items-center`}>
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px]">Panel</span>
        </button>
        <button onClick={() => setCurrentView('inventory')} className={`${currentView === 'inventory' ? 'text-primary' : 'text-on-surface-variant'} flex flex-col items-center`}>
          <span className="material-symbols-outlined">inventory_2</span>
          <span className="text-[10px]">Stock</span>
        </button>
        <button onClick={() => setScannerOpen(true)} className="bg-primary-container text-on-primary-container p-3 rounded-full -translate-y-6 shadow-lg">
          <span className="material-symbols-outlined">photo_camera</span>
        </button>
        <button onClick={() => setCurrentView('orders')} className={`${currentView === 'orders' ? 'text-primary' : 'text-on-surface-variant'} flex flex-col items-center`}>
          <span className="material-symbols-outlined">list_alt</span>
          <span className="text-[10px]">Pedidos</span>
        </button>
        <button onClick={() => setCurrentView('profile')} className={`${currentView === 'profile' ? 'text-primary' : 'text-on-surface-variant'} flex flex-col items-center`}>
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px]">Perfil</span>
        </button>
      </nav>

      {/* QR Scanner Modal */}
      <QRScanner isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />
      
      {/* Adjust Stock Modal */}
      <AdjustStockModal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        inventoryItem={selectedInventoryItem}
        onSuccess={handleAdjustSuccess}
      />
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
      active
        ? 'text-primary bg-primary-container/15 border-l-4 border-primary pl-3 font-bold'
        : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface border-l-4 border-transparent'
    }`}>
      <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
      <span className="font-label-md text-label-md">{label}</span>
    </button>
  );
}

function MetricCard({ icon, iconBg, iconColor, label, value, valueColor, badge, badgeColor }) {
  return (
    <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/30 group hover:border-primary/50 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 ${iconBg} rounded-lg ${iconColor}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span className={`${badgeColor} text-xs font-bold`}>{badge}</span>
      </div>
      <h3 className="text-on-surface-variant font-label-md text-label-md">{label}</h3>
      <p className={`font-headline-lg text-headline-lg ${valueColor} mt-2`}>{value}</p>
    </div>
  );
}
