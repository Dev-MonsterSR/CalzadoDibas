import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });

  useEffect(() => {
    adminService.listCategories().then(r => setCategories(r.data.categories || [])).finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditId(null); setForm({ name: '', slug: '', description: '' }); setShowForm(true); };
  const openEdit = (c) => { setEditId(c.id); setForm({ name: c.name || '', slug: c.slug || '', description: c.description || '' }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await adminService.updateCategory(editId, form);
      } else {
        await adminService.createCategory(form);
      }
      const r = await adminService.listCategories();
      setCategories(r.data.categories || []);
      setShowForm(false);
    } catch (err) { alert(err.response?.data?.message || 'Error al guardar'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    try {
      await adminService.deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleToggle = async (id) => {
    try {
      const { data } = await adminService.toggleCategory(id);
      setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active: data.category.is_active } : c));
    } catch (err) { alert('Error'); }
  };

  if (loading) return <p style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Cargando...</p>;

  return (
    <section style={{ padding: '48px 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <Link to="/admin" style={{ color: 'var(--text-muted)', fontSize: 14 }}>← Dashboard</Link>
            <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginTop: 8 }}>Gestión de Categorías</h1>
          </div>
          <button onClick={openCreate} style={{ background: 'var(--primary-container)', color: '#000', padding: '10px 20px', borderRadius: 'var(--radius)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>+ Nueva Categoría</button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
            padding: 28, marginBottom: 24, border: '1px solid var(--outline-variant)', color: 'var(--text-secondary)',
          }}>
            <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 20 }}>{editId ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Nombre *</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Slug *</label>
                <input type="text" value={form.slug} onChange={e => setForm({...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} required placeholder="ej: damas" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Descripción</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} style={{...inputStyle, resize: 'vertical'}} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" style={{ background: 'var(--primary-container)', color: '#000', padding: '10px 24px', borderRadius: 'var(--radius)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>{editId ? 'Guardar' : 'Crear'}</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', padding: '10px 24px', borderRadius: 'var(--radius)', border: '1px solid var(--outline-variant)', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {categories.map(c => (
            <div key={c.id} style={{
              background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
              padding: 20, border: '1px solid var(--outline-variant)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{c.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{c.description || 'Sin descripción'}</p>
                <code style={{ color: 'var(--text-muted)', fontSize: 12 }}>/categoria/{c.slug}</code>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => handleToggle(c.id)} style={{
                  padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: c.is_active ? '#d1fae5' : '#fee2e2',
                  color: c.is_active ? '#065f46' : '#991b1b',
                }}>{c.is_active ? 'Activa' : 'Inactiva'}</button>
                <button onClick={() => openEdit(c)} style={{ background: 'none', color: 'var(--primary-container)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Editar</button>
                <button onClick={() => handleDelete(c.id, c.name)} style={{ background: 'none', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Eliminar</button>
              </div>
            </div>
          ))}
          {categories.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No hay categorías</p>}
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
