import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';

const ROLES = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'vendedor_trujillo', label: 'Vendedor Trujillo' },
  { value: 'vendedor_lima', label: 'Vendedor Lima' },
  { value: 'admin', label: 'Admin' },
  { value: 'fabrica', label: 'Fábrica' },
];

const ROLE_COLORS = {
  cliente: { bg: '#374151', fg: '#d1d5db' },
  admin: { bg: '#dc2626', fg: '#fff' },
  vendedor_trujillo: { bg: '#2563eb', fg: '#fff' },
  vendedor_lima: { bg: '#7c3aed', fg: '#fff' },
  fabrica: { bg: '#059669', fg: '#fff' },
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.listUsers().then(r => setUsers(r.data.users || [])).finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (id, newRole) => {
    try {
      await adminService.updateUserRole(id, newRole);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    } catch (e) { alert(e.response?.data?.message || 'Error'); }
  };

  const handleToggleActive = async (id) => {
    try {
      const { data } = await adminService.toggleUserActive(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: data.user.is_active } : u));
    } catch (e) { alert(e.response?.data?.message || 'Error'); }
  };

  if (loading) return <p style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Cargando...</p>;

  return (
    <section style={{ padding: '48px 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <Link to="/admin" style={{ color: 'var(--text-muted)', fontSize: 14 }}>← Dashboard</Link>
            <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginTop: 8 }}>Gestión de Usuarios</h1>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{users.length} usuarios</span>
        </div>

        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)', minWidth: 800 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                {['ID', 'Nombre', 'Email', 'Rol', 'Teléfono', 'Estado', 'Fecha'].map(h => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                  <td style={{ padding: '14px 20px', fontSize: 14, color: 'var(--text-muted)' }}>{u.id}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, color: '#fff', fontWeight: 500 }}>{u.name}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} style={{
                      background: ROLE_COLORS[u.role]?.bg || '#374151', color: ROLE_COLORS[u.role]?.fg || '#fff',
                      border: 'none', borderRadius: 'var(--radius-full)', padding: '4px 12px',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 14 }}>{u.phone || '—'}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <button onClick={() => handleToggleActive(u.id)} style={{
                      padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600,
                      background: u.is_active ? '#d1fae5' : '#fee2e2',
                      color: u.is_active ? '#065f46' : '#991b1b', border: 'none', cursor: 'pointer',
                    }}>{u.is_active ? 'Activo' : 'Inactivo'}</button>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-muted)' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('es-PE') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
