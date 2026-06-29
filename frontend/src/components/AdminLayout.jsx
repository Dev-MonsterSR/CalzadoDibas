import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';

const NAV_ITEMS = [
  { path: '/admin', icon: 'dashboard', label: 'Dashboard', exact: true },
  { path: '/admin/products', icon: 'inventory_2', label: 'Productos' },
  { path: '/admin/orders', icon: 'receipt_long', label: 'Pedidos' },
  { path: '/admin/users', icon: 'group', label: 'Usuarios' },
  { path: '/admin/categories', icon: 'category', label: 'Categorías' },
  { path: '/admin/coupons', icon: 'local_offer', label: 'Cupones' },
];

function NavItem({ path, icon, label, active, exact }) {
  return (
    <Link
      to={path}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        active
          ? 'text-primary bg-primary-container/15 border-l-4 border-primary pl-3 font-bold'
          : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface border-l-4 border-transparent'
      }`}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
      <span className="font-label-md text-label-md">{label}</span>
    </Link>
  );
}

export default function AdminLayout({ children }) {
  const location = useLocation();
  const { user } = useAuthStore();

  const isActive = (path, exact) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const currentTitle = NAV_ITEMS.find(n => isActive(n.path, n.exact))?.label || 'Admin';

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="w-64 bg-surface-container-lowest border-r border-outline-variant hidden md:flex flex-col sticky top-0 h-screen">
        {/* Logo / Title */}
        <div className="p-6 border-b border-outline-variant">
          <Link to="/admin" className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>admin_panel_settings</span>
            <div>
              <p className="text-on-surface font-bold text-title-sm">CALZADO'S</p>
              <p className="text-on-surface-variant text-label-sm">Admin Panel</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(n => (
            <NavItem
              key={n.path}
              path={n.path}
              icon={n.icon}
              label={n.label}
              active={isActive(n.path, n.exact)}
              exact={n.exact}
            />
          ))}
        </nav>

        {/* User info + Logout */}
        <div className="p-4 border-t border-outline-variant">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-error flex items-center justify-center text-on-primary font-bold">
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-on-surface text-label-md truncate">{user?.name || 'Admin'}</p>
              <p className="text-on-surface-variant text-label-sm truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/"
              className="flex-1 text-center px-3 py-2 rounded bg-surface-variant/50 text-on-surface-variant text-label-sm hover:bg-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined align-middle" style={{ fontSize: 16 }}>storefront</span> Tienda
            </Link>
            <a
              href="/api/auth/logout"
              onClick={(e) => {
                e.preventDefault();
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="flex-1 text-center px-3 py-2 rounded bg-error-container/20 text-error text-label-sm hover:bg-error-container/40 transition-colors cursor-pointer"
            >
              Salir
            </a>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container border-t border-outline-variant h-16 flex items-center justify-around z-50">
        {NAV_ITEMS.slice(0, 5).map(n => (
          <Link
            key={n.path}
            to={n.path}
            className={`flex flex-col items-center gap-1 ${isActive(n.path, n.exact) ? 'text-primary' : 'text-on-surface-variant'}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{n.icon}</span>
            <span className="text-label-sm" style={{ fontSize: 10 }}>{n.label.slice(0, 6)}</span>
          </Link>
        ))}
      </nav>

      {/* Main content area */}
      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-surface-container-lowest/95 backdrop-blur border-b border-outline-variant">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-on-surface-variant text-label-sm">Panel de Administración</p>
              <h1 className="text-on-surface text-title-md font-bold">{currentTitle}</h1>
            </div>
            <Link
              to="/"
              className="md:hidden text-on-surface-variant text-label-sm hover:text-primary"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>storefront</span>
            </Link>
          </div>
        </header>

        <div className="p-6 pb-24 md:pb-6">
          {children}
        </div>
      </main>
    </div>
  );
}
