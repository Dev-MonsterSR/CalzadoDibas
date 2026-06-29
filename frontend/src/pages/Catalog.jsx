import { useState, useEffect, useCallback, useMemo } from 'react';
import { productService, categoryService } from '../services';
import ProductCard from '../components/ProductCard';

export default function Catalog() {
  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',     // 'all' o ID
    warehouse: 'all',    // 'all' | 'trujillo' | 'lima'
    minPrice: '',
    maxPrice: '',
  });

  // Datos
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Cargar categorías al montar
  useEffect(() => {
    categoryService.list()
      .then(res => setCategories(res.data.categories || []))
      .catch(() => {});
  }, []);

  const buildParams = useCallback((overrides = {}) => {
    const f = { ...filters, ...overrides };
    const params = { page, limit: 12 };
    if (f.category !== 'all') params.category = f.category;
    if (f.search.trim()) params.search = f.search.trim();
    if (f.warehouse !== 'all') params.warehouse = f.warehouse;
    if (f.minPrice !== '' && !isNaN(f.minPrice)) params.min_price = f.minPrice;
    if (f.maxPrice !== '' && !isNaN(f.maxPrice)) params.max_price = f.maxPrice;
    return params;
  }, [filters, page]);

  const loadProducts = useCallback((overrides = {}) => {
    setLoading(true);
    const params = buildParams(overrides);
    productService.list(params).then(res => {
      const newProducts = res.data.products || [];
      setProducts(prev => params.page === 1 ? newProducts : [...prev, ...newProducts]);
      setHasMore(newProducts.length >= 12);
      setTotalCount(res.data.total || newProducts.length);
    }).finally(() => setLoading(false));
  }, [buildParams]);

  // Recargar cuando cambian los filtros (reset a page 1)
  useEffect(() => {
    setPage(1);
    loadProducts({ page: 1 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Cargar mas productos cuando cambia page
  useEffect(() => {
    if (page > 1) loadProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const updateFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', category: 'all', warehouse: 'all', minPrice: '', maxPrice: '' });
  };

  const hasActiveFilters = useMemo(() => (
    filters.search !== '' || filters.category !== 'all' || filters.warehouse !== 'all' ||
    filters.minPrice !== '' || filters.maxPrice !== ''
  ), [filters]);

  // Estilos
  const sidebarStyle = {
    width: 280, flexShrink: 0, position: 'sticky', top: 16, alignSelf: 'flex-start',
    background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--outline-variant)', padding: 20,
    maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', background: 'var(--bg-tertiary)',
    border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius)',
    color: 'var(--text-secondary)', fontSize: 13,
  };

  const filterLabelStyle = {
    color: 'var(--text-muted)', fontSize: 12, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
  };

  return (
    <>
      {/* Hero */}
      <section style={{ padding: '64px 0 32px', textAlign: 'center' }}>
        <div className="container">
          <h1 style={{ color: '#fff', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 12 }}>
            COLECCIÓN EXCLUSIVA
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 17, maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
            Descubre nuestra última selección de calzado premium. Diseñados para la elegancia moderna y el confort absoluto.
          </p>
        </div>
      </section>

      {/* Layout: Sidebar + Grid */}
      <section style={{ paddingBottom: 64 }}>
        <div className="container" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Sidebar de filtros */}
          <aside style={sidebarStyle} className="catalog-sidebar">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>
                <span className="material-symbols-outlined align-middle" style={{ fontSize: 18, marginRight: 6 }}>tune</span>
                Filtros
              </h2>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-primary-container text-label-sm font-bold hover:underline"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Buscar */}
            <div style={{ marginBottom: 20 }}>
              <label style={filterLabelStyle}>Buscar</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', fontSize: 18, pointerEvents: 'none',
                }}>search</span>
                <input
                  type="text"
                  placeholder="Nombre del producto..."
                  value={filters.search}
                  onChange={e => updateFilter('search', e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 36 }}
                />
              </div>
            </div>

            {/* Categorias */}
            <div style={{ marginBottom: 20 }}>
              <label style={filterLabelStyle}>Categoría</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  onClick={() => updateFilter('category', 'all')}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-left text-sm transition-colors ${
                    filters.category === 'all'
                      ? 'bg-primary-container/15 text-primary-container font-bold'
                      : 'text-on-surface-variant hover:bg-surface-variant/30'
                  }`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    {filters.category === 'all' ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                  <span>Todas</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{categories.length}</span>
                </button>
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => updateFilter('category', c.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-left text-sm transition-colors ${
                      filters.category === String(c.id)
                        ? 'bg-primary-container/15 text-primary-container font-bold'
                        : 'text-on-surface-variant hover:bg-surface-variant/30'
                    }`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      {filters.category === String(c.id) ? 'radio_button_checked' : 'radio_button_unchecked'}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sede / Warehouse */}
            <div style={{ marginBottom: 20 }}>
              <label style={filterLabelStyle}>Sede</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { value: 'all', label: 'Todas las sedes', icon: 'store' },
                  { value: 'trujillo', label: 'Trujillo', icon: 'location_on' },
                  { value: 'lima', label: 'Lima', icon: 'location_on' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateFilter('warehouse', opt.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-left text-sm transition-colors ${
                      filters.warehouse === opt.value
                        ? 'bg-primary-container/15 text-primary-container font-bold'
                        : 'text-on-surface-variant hover:bg-surface-variant/30'
                    }`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      {filters.warehouse === opt.value ? 'radio_button_checked' : 'radio_button_unchecked'}
                    </span>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, opacity: 0.7 }}>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Precio */}
            <div style={{ marginBottom: 20 }}>
              <label style={filterLabelStyle}>Precio (S/)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  min="0"
                  placeholder="Mín"
                  value={filters.minPrice}
                  onChange={e => updateFilter('minPrice', e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Máx"
                  value={filters.maxPrice}
                  onChange={e => updateFilter('maxPrice', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Resumen */}
            <div style={{ paddingTop: 12, borderTop: '1px solid var(--outline-variant)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {totalCount > 0 ? `${totalCount} producto${totalCount !== 1 ? 's' : ''} encontrado${totalCount !== 1 ? 's' : ''}` : 'Sin resultados'}
              </p>
            </div>
          </aside>

          {/* Grid de productos */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {loading && page === 1 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 80 }}>
                <span className="spinner" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 12 }} />
                Cargando productos...
              </p>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 64, opacity: 0.3 }}>search_off</span>
                <p style={{ marginTop: 12 }}>No se encontraron productos con esos filtros.</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-5 py-2 rounded-lg text-sm font-bold transition-all hover:brightness-110"
                    style={{ background: 'var(--primary-container)', color: '#000' }}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                <div style={{
                  display: 'grid', gap: 20,
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                }} className="catalog-grid">
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
                {hasMore && (
                  <div style={{ textAlign: 'center', marginTop: 48 }}>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      className="catalog-load-more px-8 py-3 rounded-full font-bold text-sm transition-all hover:brightness-110"
                      style={{
                        background: 'transparent', color: 'var(--primary-container)',
                        border: '1px solid var(--primary-container)',
                      }}
                    >
                      CARGAR MÁS
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
