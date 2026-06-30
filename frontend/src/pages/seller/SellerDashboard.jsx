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
              <section className="xl:col-span-2 bg-surface-container rounded-xl border border-outline-variant/30 overflow-hidden">
                <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center">
                  <h2 className="font-title-md text-title-md text-on-surface">Pedidos para Despacho</h2>
                  <button onClick={() => setCurrentView('orders')} className="text-primary hover:underline text-label-md font-label-md">Ver mi historial</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-high/50">
                        <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">ID</th>
                        <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Cliente</th>
                        <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Items</th>
                        <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20">
                      {pickupOrders.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">No hay pedidos pendientes de recojo</td></tr>
                      )}
                      {pickupOrders.map(order => {
                        const statusBadge = {
                          'pagado': { label: 'Pagado', bg: 'bg-blue-500/10', text: 'text-blue-500' },
                          'preparando': { label: 'Preparando', bg: 'bg-orange-500/10', text: 'text-orange-500' },
                          'listo_recojo': { label: 'Listo Recojo', bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
                        }[order.status] || { label: order.status, bg: 'bg-gray-500/10', text: 'text-gray-500' };
                        return (
                        <tr key={order.id} className="hover:bg-surface-variant/20 transition-colors">
                          <td className="px-6 py-4 text-on-surface font-label-md">#{order.id}</td>
                          <td className="px-6 py-4 text-on-surface-variant font-body-md">{order.customer_name || 'Cliente'}</td>
                          <td className="px-6 py-4 text-on-surface-variant font-body-md">{order.items?.length || 0} items</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 ${statusBadge.bg} ${statusBadge.text} text-xs font-bold rounded`}>{statusBadge.label}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleVerifyQR(order.id)} disabled={verifying} className="bg-primary text-on-primary px-3 py-1.5 rounded text-xs font-bold hover:brightness-110 flex items-center gap-1 ml-auto disabled:opacity-50">
                              <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
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
              <section className="bg-surface-container rounded-xl border border-outline-variant/30 flex flex-col">
                <div className="p-6 border-b border-outline-variant/30">
                  <h2 className="font-title-md text-title-md text-on-surface mb-4">Consulta de Stock</h2>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                    <input className="w-full bg-surface-variant/30 border-outline-variant/30 rounded-lg pl-10 text-sm focus:ring-primary focus:border-primary" placeholder="Buscar producto..." type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                </div>
                <div className="p-6 space-y-6 flex-1">
                  {filteredInventory.slice(0, 5).map(item => {
                    const isLow = item.stock <= item.min_stock;
                    return (
                      <div key={item.id} className="group">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-label-md text-label-md text-on-surface">{item.product_name}</span>
                          <span className={`text-xs font-bold ${isLow ? 'text-error' : 'text-primary'}`}>
                            {isLow ? `Stock Bajo (${item.stock})` : `Disponible (${item.stock})`}
                          </span>
                        </div>
                        <span className="bg-surface-variant/50 px-2 py-1 rounded text-[10px] text-on-surface-variant">Código: {item.product_code}</span>
                      </div>
                    );
                  })}
                  {filteredInventory.length === 0 && <p className="text-center text-on-surface-variant py-8">No se encontraron productos</p>}
                  <div className="mt-auto pt-6 border-t border-outline-variant/30">
                    <button onClick={() => setCurrentView('inventory')} className="w-full bg-surface-variant/30 hover:bg-surface-variant/50 text-on-surface text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
                      <span className="material-symbols-outlined text-sm">list_alt</span>
                      VER CATÁLOGO COMPLETO
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
            <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-8 text-center">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">point_of_sale</span>
              <h2 className="font-title-md text-title-md text-on-surface mb-2">Punto de Venta</h2>
              <p className="text-on-surface-variant mb-6">Esta funcionalidad estará disponible próximamente.<br/>Por ahora, los clientes pueden crear pedidos desde la tienda online.</p>
              <button onClick={() => navigate('/catalogo')} className="bg-primary-container text-on-primary-container px-6 py-3 rounded-lg font-label-md hover:brightness-110 transition-all">
                Ir al Catálogo
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

              {pickupOrders.map(order => (
                <div key={order.id} className="bg-surface-container rounded-xl border border-outline-variant/30 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-title-md text-title-md text-on-surface">Orden #{order.id}</h3>
                      <p className="text-on-surface-variant">{order.customer_name || 'Cliente'}</p>
                      <p className="text-xs text-on-surface-variant mt-1">{order.customer_phone || ''}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-bold rounded">LISTO RECOJO</span>
                      <p className="text-primary font-bold mt-2">S/ {parseFloat(order.total).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="border-t border-outline-variant/20 pt-4 mb-4">
                    {order.items?.map(item => (
                      <div key={item.id} className="flex justify-between py-1 text-sm">
                        <span className="text-on-surface-variant">{item.product_name} ×{item.quantity}</span>
                        <span className="text-on-surface">S/ {(item.price_at_purchase * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => handleVerifyQR(order.id)} className="w-full bg-primary-container text-on-primary-container py-3 rounded-lg font-label-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">qr_code_scanner</span>
                    VERIFICAR QR Y ENTREGAR
                  </button>
                </div>
              ))}

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
              <div className="bg-error-container/10 border border-error/30 rounded-xl p-4 mb-6 flex items-start gap-3">
                <span className="material-symbols-outlined text-error mt-1">warning</span>
                <div>
                  <p className="font-label-md text-error mb-1">Alerta de Stock Bajo</p>
                  <p className="text-sm text-on-surface-variant">{lowStockItems.length} producto(s) por debajo del mínimo</p>
                </div>
              </div>
            )}

            {/* Inventory Grid */}
            <div className="space-y-4">
              {filteredInventory.map(item => {
                const isLow = item.stock <= item.min_stock;
                const sizes = item.sizes || [];
                return (
                  <div key={item.id} className={`bg-surface-container rounded-xl border p-6 ${isLow ? 'border-error/50' : 'border-outline-variant/30'}`}>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-2">
                          <h3 className="font-label-md text-on-surface text-lg">{item.product_name}</h3>
                          <span className={`text-xs font-bold px-2 py-1 rounded ${isLow ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                            {item.stock} uds total
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mb-1">Código: {item.product_code}</p>
                        <p className="text-xs text-on-surface-variant">Mínimo: {item.min_stock} uds</p>
                      </div>
                      <button
                        onClick={() => handleAdjustStock(item)}
                        className="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg font-label-md text-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Ajustar Stock
                      </button>
                    </div>

                    {/* Sizes Grid */}
                    {sizes.length > 0 && (
                      <div className="border-t border-outline-variant/20 pt-4">
                        <p className="text-xs font-label-md text-on-surface-variant mb-3">Stock por Talla:</p>
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                          {sizes.map(s => {
                            const isSizeLow = s.stock === 0;
                            const isSizeWarning = s.stock > 0 && s.stock <= 2;
                            return (
                              <div
                                key={s.size}
                                className={`p-2 rounded-lg border text-center ${
                                  isSizeLow
                                    ? 'bg-error/10 border-error/30'
                                    : isSizeWarning
                                    ? 'bg-yellow-500/10 border-yellow-500/30'
                                    : 'bg-surface-variant/30 border-outline-variant/30'
                                }`}
                              >
                                <div className="text-sm font-bold text-on-surface">{s.size}</div>
                                <div className={`text-xs mt-1 ${
                                  isSizeLow ? 'text-error' : isSizeWarning ? 'text-yellow-500' : 'text-on-surface-variant'
                                }`}>
                                  {s.stock}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Stock Bar */}
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-surface-variant/30 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isLow ? 'bg-error' : 'bg-primary'}`}
                          style={{ width: `${Math.min(100, (item.stock / (item.min_stock * 3)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-on-surface-variant whitespace-nowrap">
                        {Math.round((item.stock / (item.min_stock * 3)) * 100)}%
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
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">Información de tu cuenta</p>
            </header>

            <div className="max-w-2xl">
              <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-8">
                <div className="flex items-center gap-6 mb-8 pb-8 border-b border-outline-variant/30">
                  <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-2xl font-bold">
                    {sellerInitials}
                  </div>
                  <div>
                    <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{sellerName}</h2>
                    <p className="text-on-surface-variant">{user?.email}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-primary-container/10 text-primary text-xs font-bold rounded">
                      {locationLabels[location] || 'Personal de Tienda'}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-on-surface-variant text-sm mb-2">Rol</label>
                    <div className="bg-surface-variant/30 rounded-lg px-4 py-3 text-on-surface">
                      {user?.role === 'vendedor_trujillo' ? 'Vendedor - Trujillo' : 'Vendedor - Lima'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-on-surface-variant text-sm mb-2">Email</label>
                    <div className="bg-surface-variant/30 rounded-lg px-4 py-3 text-on-surface">{user?.email}</div>
                  </div>
                  <div>
                    <label className="block text-on-surface-variant text-sm mb-2">Sede asignada</label>
                    <div className="bg-surface-variant/30 rounded-lg px-4 py-3 text-on-surface">{locationLabels[location]}</div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-outline-variant/30">
                  <button onClick={logout} className="w-full bg-error-container/20 hover:bg-error-container/30 text-error py-3 rounded-lg font-label-md flex items-center justify-center gap-2 transition-all">
                    <span className="material-symbols-outlined">logout</span>
                    Cerrar Sesión
                  </button>
                </div>
              </div>
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
