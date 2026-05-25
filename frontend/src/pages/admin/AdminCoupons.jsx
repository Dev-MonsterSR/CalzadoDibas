import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ code: '', discount_percent: 10, max_uses: 0, valid_from: '', valid_until: '' });

  useEffect(() => {
    adminService.listCoupons().then(r => setCoupons(r.data.coupons || [])).catch(() => setCoupons([])).finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditId(null); setForm({ code: '', discount_percent: 10, max_uses: 0, valid_from: '', valid_until: '' }); setShowForm(true); };
  const openEdit = (c) => {
    setEditId(c.id);
    setForm({
      code: c.code || '', discount_percent: c.discount_percent || 10, max_uses: c.max_uses || 0,
      valid_from: c.valid_from ? c.valid_from.split('T')[0] : '',
      valid_until: c.valid_until ? c.valid_until.split('T')[0] : '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form };
      if (!data.valid_from) delete data.valid_from;
      if (!data.valid_until) delete data.valid_until;
      if (!data.max_uses) data.max_uses = 0;

      if (editId) {
        await adminService.updateCoupon(editId, data);
      } else {
        await adminService.createCoupon(data);
      }
      const r = await adminService.listCoupons();
      setCoupons(r.data.coupons || []);
      setShowForm(false);
    } catch (err) { alert(err.response?.data?.message || 'Error al guardar'); }
  };

  const handleDelete = async (id, code) => {
    if (!confirm(`¿Eliminar cupón "${code}"?`)) return;
    try {
      await adminService.deleteCoupon(id);
      setCoupons(prev => prev.filter(c => c.id !== id));
    } catch (err) { alert('Error'); }
  };

  const handleToggle = async (id) => {
    try {
      const coupon = coupons.find(c => c.id === id);
      await adminService.toggleCoupon(id, !coupon?.is_active);
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c));
    } catch (err) { alert('Error'); }
  };

  if (loading) return <p style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Cargando...</p>;

  return (
    <section style={{ padding: '48px 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <Link to="/admin" style={{ color: 'var(--text-muted)', fontSize: 14 }}>← Dashboard</Link>
            <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginTop: 8 }}>Gestión de Cupones</h1>
          </div>
          <button onClick={openCreate} style={{ background: 'var(--primary-container)', color: '#000', padding: '10px 20px', borderRadius: 'var(--radius)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>+ Nuevo Cupón</button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
            padding: 28, marginBottom: 24, border: '1px solid var(--outline-variant)', color: 'var(--text-secondary)',
          }}>
            <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 20 }}>{editId ? 'Editar Cupón' : 'Nuevo Cupón'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Código *</label>
                <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} required placeholder="VERANO20" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Descuento % *</label>
                <input type="number" min={1} max={100} value={form.discount_percent} onChange={e => setForm({...form, discount_percent: parseInt(e.target.value)})} required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Válido desde</label>
                <input type="date" value={form.valid_from} onChange={e => setForm({...form, valid_from: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Válido hasta</label>
                <input type="date" value={form.valid_until} onChange={e => setForm({...form, valid_until: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Usos máximos (0 = ilimitado)</label>
                <input type="number" min={0} value={form.max_uses} onChange={e => setForm({...form, max_uses: parseInt(e.target.value)})} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" style={{ background: 'var(--primary-container)', color: '#000', padding: '10px 24px', borderRadius: 'var(--radius)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>{editId ? 'Guardar' : 'Crear Cupón'}</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', padding: '10px 24px', borderRadius: 'var(--radius)', border: '1px solid var(--outline-variant)', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {coupons.map(c => (
            <div key={c.id} style={{
              background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
              padding: 20, border: '1px solid var(--outline-variant)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <h3 style={{ color: 'var(--primary-container)', fontSize: 18, fontWeight: 700, fontFamily: 'monospace', marginBottom: 4 }}>{c.code}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                  {c.discount_percent}% descuento · {c.uses_count || 0}/{c.max_uses || '∞'} usos
                  {c.valid_from && <span> · Desde {new Date(c.valid_from).toLocaleDateString('es-PE')}</span>}
                  {c.valid_until && <span> · Hasta {new Date(c.valid_until).toLocaleDateString('es-PE')}</span>}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => handleToggle(c.id)} style={{
                  padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: c.is_active ? '#d1fae5' : '#fee2e2',
                  color: c.is_active ? '#065f46' : '#991b1b',
                }}>{c.is_active ? 'Activo' : 'Inactivo'}</button>
                <button onClick={() => openEdit(c)} style={{ background: 'none', color: 'var(--primary-container)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Editar</button>
                <button onClick={() => handleDelete(c.id, c.code)} style={{ background: 'none', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Eliminar</button>
              </div>
            </div>
          ))}
          {coupons.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No hay cupones creados</p>}
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
