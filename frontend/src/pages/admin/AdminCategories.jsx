import { useState, useEffect } from 'react';
import { adminService } from '../../services';

const EMPTY = { name: '', slug: '', description: '' };

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminService.listCategories()
      .then(r => setCategories(r.data.categories || []))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY);
    setShowModal(true);
  };
  const openEdit = (c) => {
    setEditId(c.id);
    setForm({ name: c.name || '', slug: c.slug || '', description: c.description || '' });
    setShowModal(true);
  };
  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setForm(EMPTY);
    setEditId(null);
  };

  // Auto-generar slug desde el nombre si está vacío
  const handleNameChange = (v) => {
    setForm(f => ({
      ...f,
      name: v,
      slug: f.slug || v.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await adminService.updateCategory(editId, form);
      } else {
        await adminService.createCategory(form);
      }
      const r = await adminService.listCategories();
      setCategories(r.data.categories || []);
      closeModal();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar la categoría "${name}"?`)) return;
    try {
      await adminService.deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  if (loading) return (
    <p style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Cargando...</p>
  );

  return (
    <div className="container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Organiza tus productos en categorías</p>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginTop: 4 }}>Gestión de Categorías</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110"
          style={{ background: 'var(--primary-container)', color: '#000' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
          Nueva Categoría
        </button>
      </div>

      {/* Grid de cards */}
      {categories.length === 0 ? (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 48, textAlign: 'center', color: 'var(--text-muted)', border: '1px solid var(--outline-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.4 }}>category</span>
          <p style={{ marginTop: 12 }}>No hay categorías. Crea la primera con "+ Nueva Categoría".</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {categories.map(c => (
            <div
              key={c.id}
              style={{
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--outline-variant)', padding: 20,
                transition: 'border-color 0.2s, transform 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-container)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline-variant)'; e.currentTarget.style.transform = 'none'; }}
            >
              {/* Header con icono */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--radius)',
                  background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)', fontSize: 24 }}>category</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</h3>
                  <code style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'monospace' }}>/{c.slug}</code>
                </div>
              </div>

              {/* Descripción */}
              <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, minHeight: 40, marginBottom: 16 }}>
                {c.description || <em style={{ opacity: 0.5 }}>Sin descripción</em>}
              </p>

              {/* Footer con acciones */}
              <div style={{ display: 'flex', gap: 6, paddingTop: 12, borderTop: '1px solid var(--outline-variant)' }}>
                <button
                  onClick={() => openEdit(c)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded bg-primary-container/15 text-primary-container text-label-sm font-bold hover:bg-primary-container/25 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(c.id, c.name)}
                  className="px-3 py-2 rounded bg-error-container/20 text-error text-label-sm font-bold hover:bg-error-container/40 transition-colors"
                  title="Eliminar"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Crear/Editar */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={closeModal}
        >
          <form
            onSubmit={(e) => { e.stopPropagation(); handleSubmit(e); }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
              padding: 28, maxWidth: 500, width: '100%',
              border: '1px solid var(--outline-variant)', color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>
                {editId ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 24, lineHeight: 1 }}
              >×</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                Nombre *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                autoFocus
                placeholder="Ej: Damas, Caballeros, Casual..."
                style={{
                  width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)',
                  border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius)',
                  color: 'var(--text-secondary)', fontSize: 14,
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                Slug *
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')})}
                required
                placeholder="damas"
                style={{
                  width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)',
                  border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius)',
                  color: 'var(--text-secondary)', fontSize: 14, fontFamily: 'monospace',
                }}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
                URL: /categoria/<strong style={{ color: 'var(--text-secondary)' }}>{form.slug || 'slug'}</strong>
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                Descripción
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                rows={2}
                placeholder="Descripción opcional"
                style={{
                  width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)',
                  border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius)',
                  color: 'var(--text-secondary)', fontSize: 14, resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg font-bold text-sm transition-colors"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--outline-variant)' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: 'var(--primary-container)', color: '#000' }}
              >
                {saving ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
                    {editId ? 'Guardar Cambios' : 'Crear Categoría'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
