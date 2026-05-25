import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productService, reviewService } from '../services';
import { useAuthStore, useCartStore } from '../store';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState(null);
  const [qty, setQty] = useState(1);
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      productService.getById(id),
      reviewService.getByProduct(id)
    ]).then(([resP, resR]) => {
      setProduct(resP.data.product);
      setReviews(resR.data.reviews || []);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    if (!selectedSize) return alert('Selecciona una talla');
    addItem(product, selectedSize, qty);
  };

  if (loading) return <p style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Cargando...</p>;
  if (!product) return <p style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Producto no encontrado</p>;

  const image = product.primary_image || product.images?.[0]?.image_url || 'https://placehold.co/800x800/1a1a1a/f59e0b?text=DIBAS';
  const allImages = [image, ...(product.images || []).map(i => i.image_url).filter(u => u !== image)];
  const sizes = [36, 37, 38, 39, 40, 41, 42, 43];

  return (
    <section style={{ padding: '48px 0' }}>
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ marginBottom: 32 }}>
          <Link to="/catalogo" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            ← Volver al catálogo
          </Link>
        </div>

        {/* Product */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 64 }}>
          {/* Image Gallery */}
          <div>
            <div style={{
              background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)',
              overflow: 'hidden', aspectRatio: '1', marginBottom: 12,
            }}>
              <img src={image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>

          {/* Info Card */}
          <div style={{
            background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)',
            padding: 32, color: 'var(--text-on-light)',
          }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{product.name}</h1>
            <p style={{ color: '#666', fontSize: 15, marginBottom: 20, lineHeight: 1.6 }}>{product.description}</p>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary-container)' }}>
                S/ {parseFloat(product.price_retail).toFixed(2)}
              </span>
              {product.price_wholesale && parseFloat(product.price_wholesale) < parseFloat(product.price_retail) && (
                <span style={{ fontSize: 14, color: '#888' }}>
                  Mayorista (3+): S/ {parseFloat(product.price_wholesale).toFixed(2)}
                </span>
              )}
            </div>

            {/* Sizes */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: '#374151' }}>Talla</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {sizes.map(s => (
                  <button key={s} onClick={() => setSelectedSize(s)} style={{
                    width: 44, height: 44, borderRadius: 'var(--radius)',
                    border: `2px solid ${selectedSize === s ? '#000' : '#d1d5db'}`,
                    background: selectedSize === s ? '#000' : '#fff',
                    color: selectedSize === s ? '#fff' : '#374151',
                    fontSize: 15, fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>{s}</button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: '#374151' }}>Cantidad</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} style={{
                  width: 44, height: 44, border: '1px solid #d1d5db', borderRadius: 'var(--radius) 0 0 var(--radius)',
                  background: '#f9fafb', fontSize: 18, cursor: 'pointer', color: '#374151',
                }}>−</button>
                <span style={{
                  width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid #d1d5db', borderLeft: 'none', borderRight: 'none',
                  fontSize: 16, fontWeight: 600, color: '#374151',
                }}>{qty}</span>
                <button onClick={() => setQty(qty + 1)} style={{
                  width: 44, height: 44, border: '1px solid #d1d5db', borderRadius: '0 var(--radius) var(--radius) 0',
                  background: '#f9fafb', fontSize: 18, cursor: 'pointer', color: '#374151',
                }}>+</button>
              </div>
              {qty >= 3 && (
                <p style={{ color: 'var(--primary-container)', fontSize: 13, fontWeight: 600, marginTop: 8 }}>
                  🎉 ¡Precio mayorista aplicado!
                </p>
              )}
            </div>

            {/* Add to Cart */}
            <button onClick={handleAddToCart} style={{
              width: '100%', padding: '16px 32px',
              background: 'var(--primary-container)', color: '#000',
              borderRadius: 'var(--radius)', fontSize: 16, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'filter 0.2s',
            }}
              onMouseEnter={e => e.target.style.filter = 'brightness(1.1)'}
              onMouseLeave={e => e.target.style.filter = 'brightness(1)'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>shopping_bag</span>
              Agregar al Carrito
            </button>
          </div>
        </div>

        {/* Reviews */}
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
          padding: 32, borderTop: '1px solid var(--outline-variant)',
        }}>
          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
            Reseñas ({reviews.length})
          </h2>
          {reviews.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Aún no hay reseñas para este producto.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {reviews.map(r => (
                <div key={r._id || r.id} style={{
                  background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', padding: 20,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'var(--primary-container)', color: '#000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 14,
                    }}>{(r.user_name || 'U')[0]}</div>
                    <div>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{r.user_name}</span>
                      {r.is_verified_purchase && (
                        <span style={{ color: 'var(--primary-container)', fontSize: 11, marginLeft: 8 }}>
                          ✓ Compra verificada
                        </span>
                      )}
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                      {[...Array(5)].map((_, i) => (
                        <span key={i} style={{
                          color: i < r.rating ? 'var(--primary-container)' : 'var(--bg-highest)',
                          fontSize: 16,
                        }}>★</span>
                      ))}
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.5, marginBottom: 8 }}>{r.comment}</p>
                  {r.photos?.length > 0 && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {r.photos.map((p, i) => (
                        <img key={i} src={p.url} alt={p.caption} style={{
                          width: 80, height: 80, borderRadius: 'var(--radius-sm)', objectFit: 'cover',
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
