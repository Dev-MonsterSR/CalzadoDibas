import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';

const EMPTY_PRODUCT = { name: '', description: '', code: '', material: '', brand: 'DIBAS', price_retail: '', price_wholesale: '', category_id: '' };

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [imageFiles, setImageFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  useEffect(() => {
    Promise.all([
      adminService.listProducts().then(r => setProducts(r.data.products || [])),
      adminService.listCategories().then(r => setCategories(r.data.categories || [])),
    ]).finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditId(null); setForm(EMPTY_PRODUCT); setImageFiles([]); setShowForm(true); };
  const openEdit = (p) => { setEditId(p.id); setForm({
    name: p.name || '', description: p.description || '', code: p.code || '',
    material: p.material || '', brand: p.brand || 'DIBAS',
    price_retail: p.price_retail || '', price_wholesale: p.price_wholesale || '',
    category_id: p.category_id || '',
  }); setImageFiles([]); setShowForm(true);
    // Cargar imagenes existentes del producto (ordenadas por position)
    setExistingImages(p.images && p.images.length > 0
      ? [...p.images].sort((a, b) => a.position - b.position)
      : []
    );
  };

  // Resetear imagenes existentes al cerrar el form o crear nuevo
  const closeForm = () => {
    setShowForm(false);
    setImageFiles([]);
    setExistingImages([]);
  };

  const handleDeleteExistingImage = async (imageId) => {
    if (!editId) return;
    if (!confirm('¿Eliminar esta imagen?')) return;
    try {
      await adminService.deleteProductImage(editId, imageId);
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err) {
      alert('Error al eliminar imagen: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSetPrimary = async (imageId) => {
    if (!editId) return;
    try {
      await adminService.setPrimaryImage(editId, imageId);
      // Reordenar localmente
      setExistingImages(prev => prev.map(img => ({ ...img, is_primary: img.id === imageId ? 1 : 0 })));
    } catch (err) {
      alert('Error al marcar como principal: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await adminService.updateProduct(editId, form);

        if (imageFiles.length > 0) {
          const imagesForm = new FormData();
          Array.from(imageFiles).forEach(file => imagesForm.append('images', file));
          await adminService.uploadProductImages(editId, imagesForm);
        }
      } else {
        if (imageFiles.length > 0) {
          const createForm = new FormData();
          Object.entries(form).forEach(([key, value]) => createForm.append(key, value ?? ''));
          Array.from(imageFiles).forEach(file => createForm.append('images', file));
          await adminService.createProduct(createForm);
        } else {
          await adminService.createProduct(form);
        }
      }
      const r = await adminService.listProducts();
      setProducts(r.data.products || []);
      closeForm();
    } catch (err) { alert(err.response?.data?.message || 'Error al guardar'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    try {
      await adminService.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) { alert(err.response?.data?.message || 'Error al eliminar'); }
  };

  const handleToggle = async (id, current) => {
    try {
      await adminService.updateProduct(id, { is_active: !current });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !p.is_active } : p));
    } catch (err) { alert('Error'); }
  };

  if (loading) return <p style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Cargando...</p>;

  return (
    <section style={{ padding: '48px 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <Link to="/admin" style={{ color: 'var(--text-muted)', fontSize: 14 }}>← Dashboard</Link>
            <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginTop: 8 }}>Gestión de Productos</h1>
          </div>
          <button onClick={openCreate} style={{ background: 'var(--primary-container)', color: '#000', padding: '10px 20px', borderRadius: 'var(--radius)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>+ Nuevo Producto</button>
        </div>

        {/* Form Modal (flotante con overlay) */}
        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={closeForm}
          >
          <form onSubmit={(e) => { e.stopPropagation(); handleSubmit(e); }} onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
            padding: 28, maxWidth: 800, width: '100%', maxHeight: '90vh', overflowY: 'auto',
            border: '1px solid var(--outline-variant)', color: 'var(--text-secondary)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: '#fff', fontSize: 20 }}>{editId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button type="button" onClick={closeForm} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 24, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Nombre *</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Código SKU *</label>
                <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Categoría *</label>
                <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} required style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Marca</label>
                <input type="text" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Material</label>
                <input type="text" value={form.material} onChange={e => setForm({...form, material: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Precio Venta *</label>
                <input type="number" step="0.01" min="0" value={form.price_retail} onChange={e => setForm({...form, price_retail: e.target.value})} required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Precio Mayorista *</label>
                <input type="number" step="0.01" min="0" value={form.price_wholesale} onChange={e => setForm({...form, price_wholesale: e.target.value})} required style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Descripción</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} style={{...inputStyle, resize: 'vertical'}} />
            </div>
            {/* Imagenes existentes del producto (solo al editar) */}
            {editId && existingImages.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                  Imágenes actuales ({existingImages.length})
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                  {existingImages.map(img => (
                    <div key={img.id} style={{ position: 'relative', border: img.is_primary ? '2px solid var(--primary-container)' : '1px solid var(--outline-variant)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
                      <img src={img.image_url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                      {img.is_primary ? (
                        <div style={{ position: 'absolute', top: 4, left: 4, background: 'var(--primary-container)', color: '#000', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>PRINCIPAL</div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(img.id)}
                          style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, border: 'none', padding: '2px 6px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                        >Marcar principal</button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingImage(img.id)}
                        title="Eliminar imagen"
                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(220, 38, 38, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: 1 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                {editId ? 'Agregar nuevas imágenes' : 'Imágenes del producto (opcional)'}
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={e => setImageFiles(Array.from(e.target.files || []))}
                style={{ ...inputStyle, padding: '8px 10px' }}
              />
              {imageFiles.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                    {imageFiles.length} imagen(es) nueva(s) - Vista previa:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                    {imageFiles.map((file, idx) => (
                      <div key={idx} style={{ position: 'relative', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
                        <img src={URL.createObjectURL(file)} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, padding: '2px 4px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" style={{ background: 'var(--primary-container)', color: '#000', padding: '10px 24px', borderRadius: 'var(--radius)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>{editId ? 'Guardar Cambios' : 'Crear Producto'}</button>
              <button type="button" onClick={closeForm} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', padding: '10px 24px', borderRadius: 'var(--radius)', border: '1px solid var(--outline-variant)', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
          </div>
        )}

        {/* Grid de cards con imagenes */}
        {products.length === 0 ? (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 48, textAlign: 'center', color: 'var(--text-muted)', border: '1px solid var(--outline-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.4 }}>inventory_2</span>
            <p style={{ marginTop: 12 }}>No hay productos. Crea el primero con "+ Nuevo Producto".</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {products.map(p => {
              const primaryImg = p.images && p.images.length > 0
                ? p.images.find(i => i.is_primary) || p.images[0]
                : null;
              return (
                <div key={p.id} style={{
                  background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--outline-variant)', overflow: 'hidden',
                  transition: 'transform 0.2s, border-color 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--primary-container)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--outline-variant)'; }}
                >
                  {/* Imagen principal */}
                  <div style={{ position: 'relative', aspectRatio: '1', background: 'var(--bg-tertiary)' }}>
                    {primaryImg ? (
                      <img src={primaryImg.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--text-muted)', opacity: 0.3 }}>image</span>
                      </div>
                    )}
                    {p.images && p.images.length > 1 && (
                      <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '4px 8px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>photo_library</span>
                        {p.images.length}
                      </div>
                    )}
                    {!p.is_active && (
                      <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(220, 38, 38, 0.9)', color: '#fff', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 700 }}>
                        INACTIVO
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: 16 }}>
                    <div style={{ marginBottom: 4 }}>
                      <p style={{ color: '#fff', fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 2 }}>{p.name}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>{p.code}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0' }}>
                      <span style={{ color: 'var(--primary-container)', fontSize: 18, fontWeight: 700 }}>S/ {parseFloat(p.price_retail || 0).toFixed(2)}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>mayor: S/ {parseFloat(p.price_wholesale || 0).toFixed(2)}</span>
                    </div>
                    {p.category_name && (
                      <span style={{ display: 'inline-block', padding: '3px 10px', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', borderRadius: 'var(--radius-full)', fontSize: 11, marginBottom: 12 }}>
                        {p.category_name}
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--outline-variant)' }}>
                      <button
                        onClick={() => openEdit(p)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded bg-primary-container/15 text-primary-container text-label-sm font-bold hover:bg-primary-container/25 transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggle(p.id, p.is_active)}
                        className="px-3 py-2 rounded bg-surface-variant/50 text-on-surface-variant text-label-sm font-bold hover:bg-surface-variant transition-colors"
                        title={p.is_active ? 'Desactivar' : 'Activar'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{p.is_active ? 'visibility_off' : 'visibility'}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="px-3 py-2 rounded bg-error-container/20 text-error text-label-sm font-bold hover:bg-error-container/40 transition-colors"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)',
  border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius)',
  color: 'var(--text-secondary)', fontSize: 14,
};
