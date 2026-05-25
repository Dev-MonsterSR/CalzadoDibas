import { useState, useEffect, useCallback } from 'react';
import { productService, categoryService } from '../services';
import ProductCard from '../components/ProductCard';

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadProducts = useCallback((cat, pageNum) => {
    setLoading(true);
    const params = { page: pageNum, limit: 12 };
    if (cat !== 'all') params.category = cat;
    productService.list(params).then(res => {
      const newProducts = res.data.products || [];
      setProducts(prev => pageNum === 1 ? newProducts : [...prev, ...newProducts]);
      setHasMore(newProducts.length >= 12);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    categoryService.list().then(res => setCategories(res.data.categories || [])).catch(() => {});
  }, []);

  useEffect(() => { loadProducts(selectedCat, page); }, [selectedCat, page, loadProducts]);

  const allCats = [{ id: 'all', name: 'Todos' }, ...categories];

  const pillStyle = (active) => ({
    padding: '8px 20px', borderRadius: 'var(--radius-full)',
    background: active ? 'var(--primary-container)' : 'transparent',
    color: active ? '#000' : 'var(--text-muted)',
    border: active ? 'none' : '1px solid var(--outline-variant)',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s', letterSpacing: '0.02em',
  });

  return (
    <>
      {/* Catalog Hero */}
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

      {/* Category Pills */}
      <div className="container" style={{ paddingBottom: 32 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {allCats.map(c => (
            <button key={c.id} onClick={() => { setSelectedCat(c.id); setPage(1); setProducts([]); }}
              style={pillStyle(selectedCat === c.id)}
              onMouseEnter={e => { if (selectedCat !== c.id) e.target.style.borderColor = 'var(--primary-container)'; }}
              onMouseLeave={e => { if (selectedCat !== c.id) e.target.style.borderColor = 'var(--outline-variant)'; }}
            >{c.name}</button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <section style={{ paddingBottom: 48 }}>
        <div className="container">
          {loading && page === 1 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 48 }}>Cargando productos...</p>
          ) : products.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 48 }}>No se encontraron productos.</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
              {hasMore && (
                <div style={{ textAlign: 'center', marginTop: 48 }}>
                  <button onClick={() => setPage(p => p + 1)} style={{
                    background: 'transparent', color: 'var(--primary-container)',
                    border: '1px solid var(--primary-container)',
                    padding: '12px 32px', borderRadius: 'var(--radius-full)',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
                    transition: 'all 0.2s',
                  }}
                    onMouseEnter={e => { e.target.style.background = 'var(--primary-container)'; e.target.style.color = '#000'; }}
                    onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--primary-container)'; }}
                  >CARGAR MÁS</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
