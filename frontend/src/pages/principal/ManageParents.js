import React, { useState } from 'react';
import API from '../../utils/api';

export default function ManageParents() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [added, setAdded] = useState([]);

  const handleAdd = async e => {
    e.preventDefault();
    setLoading(true); setError(''); setMsg('');
    try {
      const { data } = await API.post('/principal/parents', form);
      setMsg('Parent added! Share login credentials with them.');
      setAdded(prev => [data.parent, ...prev]);
      setForm({ name: '', email: '', password: '' });
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-title">Manage Parents</div>
      <div className="page-sub">Add parent accounts and link them to students</div>
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Add New Parent</h3>
          <form onSubmit={handleAdd}>
            <div className="form-group"><label>Parent Name</label>
              <input value={form.name} placeholder="Mr. Venkat Sharma" required onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group"><label>Email</label>
              <input type="email" value={form.email} placeholder="parent@email.com" required onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group"><label>Temporary Password</label>
              <input type="password" value={form.password} placeholder="Share this with parent" required onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <button className="btn-primary" style={{ width: '100%' }} disabled={loading}>{loading ? 'Adding...' : 'Add Parent'}</button>
          </form>
        </div>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Recently Added</h3>
          {added.length === 0 ? <p style={{ color: '#888', fontSize: 13 }}>No parents added this session</p>
            : added.map((p, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f0f2f7' }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{p.email}</div>
                <code style={{ fontSize: 11, background: '#f5f6fa', padding: '2px 6px', borderRadius: 4 }}>{p.user_id}</code>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
