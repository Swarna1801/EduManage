import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ school_name: '', admin_name: '', email: '', password: '', plan: 'basic' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await API.post('/auth/register', form);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  if (result) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2>Registration Successful!</h2>
          <p style={{ color: '#888', marginBottom: 24 }}>Your school account has been created.</p>
          <div style={{ background: '#f5f6fa', borderRadius: 10, padding: 16, marginBottom: 24, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <span style={{ color: '#888', fontSize: 13 }}>School ID</span>
              <strong style={{ color: '#185FA5' }}>{result.school_id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <span style={{ color: '#888', fontSize: 13 }}>Admin ID</span>
              <strong>{result.admin_id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: '#888', fontSize: 13 }}>Plan</span>
              <span className={`badge ${result.plan === 'premium' ? 'badge-green' : 'badge-blue'}`}>{result.plan}</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 20 }}>Please save your School ID. You'll need it to log in.</p>
          <button className="btn-primary" style={{ width: '100%', padding: 12 }} onClick={() => navigate('/payment', { state: { school_id: result.school_id, plan: result.plan, admin_id: result.admin_id } })}>
            Proceed to Payment →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">S</div>
        <h2>School Registration</h2>
        <p className="auth-sub">Principal / Admin only</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>School Name</label>
            <input name="school_name" placeholder="St. Joseph's Academy" required onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Admin / Principal Name</label>
            <input name="admin_name" placeholder="Dr. Ramesh Kumar" required onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input name="email" type="email" placeholder="admin@school.edu" required onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input name="password" type="password" placeholder="Min. 6 characters" required onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Select Plan</label>
            <div className="plan-toggle">
              {['basic', 'premium'].map(p => (
                <div key={p} className={`plan-opt ${form.plan === p ? 'selected' : ''}`} onClick={() => setForm({ ...form, plan: p })}>
                  <div className="plan-opt-name">{p.charAt(0).toUpperCase() + p.slice(1)}</div>
                  <div className="plan-opt-price">{p === 'basic' ? '₹999/mo' : '₹2,499/mo'}</div>
                </div>
              ))}
            </div>
          </div>
          <button className="btn-primary" style={{ width: '100%', padding: 12, marginTop: 8 }} disabled={loading}>
            {loading ? 'Registering...' : 'Register & Proceed to Payment'}
          </button>
        </form>
        <p className="auth-footer">Already registered? <span onClick={() => navigate('/login')}>Login here</span></p>
      </div>
    </div>
  );
}
