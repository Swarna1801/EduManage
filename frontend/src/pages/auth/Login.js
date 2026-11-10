import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const roleColors = { principal: '#185FA5', teacher: '#0F6E56', parent: '#854F0B' };

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', role: 'principal' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await API.post('/auth/login', form);
      login({ name: data.name, role: data.role, plan: data.plan, school_name: data.school_name }, data.token);
      navigate(`/${data.role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo" style={{ background: roleColors[form.role] }}>S</div>
        <h2>Welcome back</h2>
        <p className="auth-sub">Smart School Analytics System</p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="role-tabs">
          {['principal', 'teacher', 'parent'].map(r => (
            <button key={r} className={`role-tab ${form.role === r ? 'active' : ''}`}
              style={form.role === r ? { borderColor: roleColors[r], color: roleColors[r], background: roleColors[r] + '15' } : {}}
              onClick={() => setForm({ ...form, role: r })}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="your@email.com" required onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" required onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn-primary" style={{ width: '100%', padding: 12, background: roleColors[form.role] }} disabled={loading}>
            {loading ? 'Signing in...' : `Sign in as ${form.role.charAt(0).toUpperCase() + form.role.slice(1)}`}
          </button>
        </form>
        <p className="auth-footer">New school? <span onClick={() => navigate('/register')}>Register here</span></p>
      </div>
    </div>
  );
}
