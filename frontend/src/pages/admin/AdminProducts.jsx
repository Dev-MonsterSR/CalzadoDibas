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
  }); setImageFiles([]); setShowForm(true); };

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
      setShowForm(false);
      setImageFiles([]);
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

        {/* Form Modal */}
        {showForm && (
          <form onSubmit={handleSubmit} style={{
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
            padding: 28, marginBottom: 24, border: '1px solid var(--outline-variant)', color: 'var(--text-secondary)',
          }}>
            <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 20 }}>{editId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
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
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                Imágenes del producto {editId ? '(agregar nuevas)' : '(opcional)'}
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={e => setImageFiles(Array.from(e.target.files || []))}
                style={{ ...inputStyle, padding: '8px 10px' }}
              />
              {imageFiles.length > 0 && (
                <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  {imageFiles.length} imagen(es) seleccionada(s)
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" style={{ background: 'var(--primary-container)', color: '#000', padding: '10px 24px', borderRadius: 'var(--radius)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>{editId ? 'Guardar Cambios' : 'Crear Producto'}</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', padding: '10px 24px', borderRadius: 'var(--radius)', border: '1px solid var(--outline-variant)', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        )}

        {/* Table */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                {['ID', 'Nombre', 'Código', 'Precio', 'Mayorista', 'Categoría', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-muted)' }}>{p.id}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, color: '#fff', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{p.code}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, color: '#fff', fontWeight: 600 }}>S/ {parseFloat(p.price_retail || 0).toFixed(2)}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, color: 'var(--text-muted)' }}>S/ {parseFloat(p.price_wholesale || 0).toFixed(2)}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14 }}>{p.category_name || '—'}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <button onClick={() => handleToggle(p.id, p.is_active)} style={{
                      padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: p.is_active ? '#d1fae5' : '#fee2e2',
                      color: p.is_active ? '#065f46' : '#991b1b',
                    }}>{p.is_active ? 'Activo' : 'Inactivo'}</button>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(p)} style={{ background: 'none', color: 'var(--primary-container)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Editar</button>
                      <button onClick={() => handleDelete(p.id, p.name)} style={{ background: 'none', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No hay productos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)',
  border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius)',
  color: 'var(--text-secondary)', fontSize: 14,
};
