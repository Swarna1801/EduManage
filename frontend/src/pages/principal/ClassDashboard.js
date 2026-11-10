import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';

const CLASSES = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const SECTIONS = ['A','B','C','D','E'];

export default function ClassDashboard() {
  const [cls, setCls] = useState('');
  const [section, setSection] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!cls) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cls) params.append('class', cls);
      if (section) params.append('section', section);
      const r = await API.get(`/principal/class-dashboard?${params}`);
      setData(r.data);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [cls, section]);

  return (
    <div>
      <div className="page-title">Class Dashboard</div>
      <div className="page-sub">Select class and section to view detailed analytics</div>

      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <div className="form-group" style={{ margin:0, minWidth:160 }}>
          <label>Select Class</label>
          <select value={cls} onChange={e => setCls(e.target.value)}>
            <option value="">-- All Classes --</option>
            {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin:0, minWidth:160 }}>
          <label>Select Section</label>
          <select value={section} onChange={e => setSection(e.target.value)}>
            <option value="">-- All Sections --</option>
            {SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </div>
        {(cls || section) && (
          <div style={{ display:'flex', alignItems:'flex-end' }}>
            <button className="btn-outline" onClick={() => { setCls(''); setSection(''); setData(null); }}>Clear Filter</button>
          </div>
        )}
      </div>

      {!cls && (
        <div className="card" style={{ textAlign:'center', padding:40 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏫</div>
          <h3>Select a class to view dashboard</h3>
          <p className="muted">Choose class and section from the dropdowns above</p>
        </div>
      )}

      {loading && <div className="loading">Loading class data...</div>}

      {data && !loading && (
        <>
          <div style={{ background:'#E6F1FB', borderRadius:10, padding:'10px 16px', marginBottom:16, fontSize:13, color:'#0C447C', fontWeight:500 }}>
            Showing data for: Class {cls}{section ? ` - Section ${section}` : ' (All Sections)'}
          </div>

          <div className="grid-4" style={{ marginBottom:20 }}>
            <div className="metric-card"><div className="label">Total Students</div><div className="value" style={{ color:'#185FA5' }}>{data.total_students}</div></div>
            <div className="metric-card"><div className="label">Attendance %</div><div className="value" style={{ color:'#0F6E56' }}>{data.attendance_pct}%</div></div>
            <div className="metric-card"><div className="label">Avg Marks</div><div className="value" style={{ color:'#854F0B' }}>{data.avg_marks}/100</div></div>
            <div className="metric-card"><div className="label">Teachers</div><div className="value" style={{ color:'#3C3489' }}>{data.teachers?.length || 0}</div></div>
          </div>

          <div className="grid-2" style={{ marginBottom:20 }}>
            <div className="card">
              <h3 style={{ fontWeight:600, marginBottom:14 }}>Subject-wise Performance</h3>
              {data.subject_stats?.length === 0
                ? <p className="muted">No marks uploaded yet</p>
                : <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.subject_stats}>
                      <XAxis dataKey="subject" tick={{ fontSize:11 }} />
                      <YAxis domain={[0,100]} tick={{ fontSize:11 }} />
                      <Tooltip />
                      <Bar dataKey="avg" fill="#185FA5" radius={[4,4,0,0]} name="Avg Marks" />
                    </BarChart>
                  </ResponsiveContainer>
              }
            </div>

            <div className="card">
              <h3 style={{ fontWeight:600, marginBottom:14 }}>Teachers in this Class</h3>
              {data.teachers?.length === 0
                ? <p className="muted">No teachers assigned</p>
                : data.teachers.map((t,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom:'1px solid #f0f2f7' }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:'#E6F1FB', color:'#0C447C', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, fontSize:13 }}>
                      {t.name?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500 }}>{t.name}</div>
                      <div style={{ fontSize:12, color:'#888' }}>{t.subject || 'No subject'} · {t.email}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom:20 }}>
            <div className="card">
              <h3 style={{ fontWeight:600, marginBottom:14 }}>Fee Collection Status</h3>
              <div style={{ display:'flex', gap:12 }}>
                {[
                  { label:'Paid', val: data.fee_summary?.paid || 0, color:'#EAF3DE', tc:'#27500A' },
                  { label:'Pending', val: data.fee_summary?.pending || 0, color:'#FCEBEB', tc:'#791F1F' },
                  { label:'Partial', val: data.fee_summary?.partial || 0, color:'#FAEEDA', tc:'#633806' },
                ].map((f,i) => (
                  <div key={i} style={{ flex:1, background:f.color, borderRadius:8, padding:'12px', textAlign:'center' }}>
                    <div style={{ fontSize:22, fontWeight:600, color:f.tc }}>{f.val}</div>
                    <div style={{ fontSize:12, color:f.tc }}>{f.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontWeight:600, marginBottom:14 }}>Student List</h3>
              <div style={{ maxHeight:200, overflowY:'auto' }}>
                {data.students?.length === 0
                  ? <p className="muted">No students in this class/section</p>
                  : data.students.map((s,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f0f2f7', fontSize:13 }}>
                      <span>{s.name}</span>
                      <span style={{ color:'#888' }}>Roll {s.roll_no || '-'}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
