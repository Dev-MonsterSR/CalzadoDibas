import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store';

const WAREHOUSES = [
  { value: 'tienda_trujillo', label: 'Trujillo' },
  { value: 'tienda_lima', label: 'Lima' },
];

export default function ProductCard({ product }) {
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState('tienda_trujillo');
  const { addItem } = useCartStore();

  const price = product.price_retail;
    const image = product.primary_image || product.images?.[0]?.image_url || '/logo.png';

  const sizes = [36, 37, 38, 39, 40, 41, 42, 43].filter(s => s >= 36 && s <= 44);

  // Tallas disponibles en la sede elegida
  const availableSizes = product.inventory?.[selectedWarehouse]?.sizes || {};
  const isSizeAvailable = (size) => {
    const stock = availableSizes[size];
    return stock !== undefined && stock > 0;
  };

  return (
    <div className="product-card" style={{
      background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0px 12px 32px rgba(0,0,0,0.5)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
    >
      {/* Image */}
      <Link to={`/producto/${product.id}`} className="product-card-image" style={{ display: 'block', height: 260, overflow: 'hidden', position: 'relative', background: 'var(--bg-tertiary)' }}>
        <img src={image} alt={product.name} style={{
          width: '100%', height: '100%', objectFit: 'cover',
          transition: 'transform 0.5s ease',
        }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        />
        {product.is_new && (
          <span style={{
            position: 'absolute', top: 12, left: 12,
            background: 'var(--primary-container)', color: '#000',
            padding: '4px 10px', borderRadius: 'var(--radius-sm)',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>Nuevo</span>
        )}
      </Link>

      {/* Info */}
      <div className="product-card-info" style={{ padding: 20 }}>
        <Link to={`/producto/${product.id}`} style={{ display: 'block' }}>
          <h3 style={{
            color: 'var(--text-on-light)', fontSize: 16, fontWeight: 700,
            marginBottom: 4, lineHeight: 1.3,
          }}>{product.name}</h3>
        </Link>

        <p style={{ color: 'var(--text-on-light)', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
          S/ {parseFloat(price).toFixed(2)}
        </p>

        {/* Sede selector */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sede de recojo</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {WAREHOUSES.map(w => (
              <button
                key={w.value}
                onClick={() => setSelectedWarehouse(w.value)}
                style={{
                  flex: 1, padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${selectedWarehouse === w.value ? '#000' : '#d1d5db'}`,
                  background: selectedWarehouse === w.value ? '#000' : 'transparent',
                  color: selectedWarehouse === w.value ? '#fff' : '#374151',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sizes */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tallas</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {sizes.slice(0, 5).map(size => {
              const available = isSizeAvailable(size);
              const isSelected = selectedSize === size;
              return (
                <button
                  key={size}
                  onClick={() => available && setSelectedSize(size)}
                  disabled={!available}
                  style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${isSelected ? '#000' : available ? '#d1d5db' : '#e5e7eb'}`,
                    background: isSelected ? '#000' : available ? 'transparent' : '#f3f4f6',
                    color: isSelected ? '#fff' : available ? 'var(--text-on-light)' : '#9ca3af',
                    fontSize: 12, fontWeight: 500,
                    cursor: available ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s', opacity: available ? 1 : 0.5,
                  }}
                >{size}</button>
              );
            })}
          </div>
        </div>

        {/* Add to Cart */}
        <button onClick={() => {
          if (!selectedSize) { alert('Selecciona una talla'); return; }
          if (!isSizeAvailable(selectedSize)) { alert(`Talla ${selectedSize} agotada en ${selectedWarehouse === 'tienda_trujillo' ? 'Trujillo' : 'Lima'}`); return; }
          addItem(product, selectedSize, 1, selectedWarehouse);
        }} style={{
          width: '100%', padding: '10px 0',
          background: 'var(--primary-container)', color: '#000',
          borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'filter 0.2s', letterSpacing: '0.03em',
        }}
          onMouseEnter={e => e.target.style.filter = 'brightness(1.1)'}
          onMouseLeave={e => e.target.style.filter = 'brightness(1)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>shopping_bag</span>
          Agregar
        </button>
      </div>
    </div>
  );
}
