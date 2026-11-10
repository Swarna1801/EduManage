import React, { useEffect, useState } from 'react';
import API from '../../utils/api';

export default function BoardRoom() {
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', target: 'both' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchAnnouncements = () => {
    API.get('/principal/announcements').then(r => setAnnouncements(r.data)).catch(e => console.log(e));
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) { setError('Title and description are required'); return; }
    setLoading(true); setError(''); setMsg('');
    try {
      await API.post('/principal/announcements', form);
      setMsg('Announcement created and sent successfully!');
      setForm({ title: '', description: '', target: 'both' });
      setShowForm(false);
      fetchAnnouncements();
    } catch (err) { setError(err.response?.data?.message || 'Failed to create announcement'); }
    finally { setLoading(false); }
  };

  const targetColor = { teachers:'badge-blue', parents:'badge-amber', both:'badge-purple' };
  const targetLabel = { teachers:'Teachers only', parents:'Parents only', both:'Teachers & Parents' };

  const filtered = filter === 'all' ? announcements : announcements.filter(a => a.target === filter);

  const timeAgo = (date) => {
    const diff = Math.floor((new Date() - new Date(date)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div className="page-title">Board Room</div>
          <div className="page-sub">Create and manage school announcements</div>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Announcement'}
        </button>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom:24 }}>
          <h3 style={{ fontWeight:600, marginBottom:16 }}>Create Announcement</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Title</label>
              <input value={form.title} placeholder="e.g. Parent Teacher Meeting on Friday"
                required onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} placeholder="Write your announcement here..."
                rows={4} required onChange={e => setForm({...form, description: e.target.value})}
                style={{ width:'100%', padding:'10px 12px', fontSize:14, borderRadius:8, border:'1.5px solid #dde1ea', resize:'vertical', fontFamily:'inherit' }} />
            </div>
            <div className="form-group">
              <label>Send to</label>
              <div style={{ display:'flex', gap:10 }}>
                {[
                  { val:'both', label:'Teachers & Parents', icon:'👥' },
                  { val:'teachers', label:'Teachers only', icon:'👨‍🏫' },
                  { val:'parents', label:'Parents only', icon:'👨‍👩‍👧' },
                ].map(opt => (
                  <div key={opt.val} onClick={() => setForm({...form, target: opt.val})}
                    style={{ flex:1, border: form.target===opt.val ? '2px solid #185FA5' : '1.5px solid #e8eaf0',
                      background: form.target===opt.val ? '#E6F1FB' : '#fff',
                      borderRadius:10, padding:'12px', cursor:'pointer', textAlign:'center' }}>
                    <div style={{ fontSize:22, marginBottom:4 }}>{opt.icon}</div>
                    <div style={{ fontSize:12, fontWeight:500, color: form.target===opt.val ? '#0C447C' : '#555' }}>{opt.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn-primary" style={{ padding:'10px 28px' }} disabled={loading}>
              {loading ? 'Sending...' : 'Send Announcement 📢'}
            </button>
          </form>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {['all','both','teachers','parents'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:'6px 16px', borderRadius:20, border: filter===f ? '2px solid #185FA5' : '0.5px solid #dde1ea',
              background: filter===f ? '#E6F1FB' : 'transparent',
              color: filter===f ? '#0C447C' : '#888', fontSize:12, cursor:'pointer', fontWeight: filter===f ? 500 : 400 }}>
            {f === 'all' ? 'All' : targetLabel[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:40 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📢</div>
          <h3>No announcements yet</h3>
          <p className="muted">Create your first announcement above</p>
        </div>
      ) : filtered.map((ann,i) => (
        <div key={i} className="card" style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'#E6F1FB', color:'#0C447C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>📢</div>
              <div>
                <div style={{ fontWeight:600, fontSize:14 }}>{ann.title}</div>
                <div style={{ fontSize:11, color:'#888' }}>{timeAgo(ann.createdAt)}</div>
              </div>
            </div>
            <span className={`badge ${targetColor[ann.target] || 'badge-blue'}`}>{targetLabel[ann.target]}</span>
          </div>
          <p style={{ fontSize:13, color:'#555', lineHeight:1.6, marginLeft:46 }}>{ann.description}</p>
        </div>
      ))}
    </div>
  );
}
