import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';

export default function TeacherAnalytics() {
  const [teachers, setTeachers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (subjectFilter) params.append('subject', subjectFilter);
      const r = await API.get(`/principal/teacher-analytics?${params}`);
      setTeachers(r.data);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  const fetchDetail = async (id) => {
    setDetailLoading(true);
    try {
      const r = await API.get(`/principal/teacher-analytics/${id}`);
      setDetail(r.data);
    } catch (e) { console.log(e); }
    finally { setDetailLoading(false); }
  };

  useEffect(() => { fetchTeachers(); }, [search, subjectFilter]);

  const ratingColor = { Excellent:'badge-green', Good:'badge-blue', Average:'badge-amber', 'No data':'badge-red' };

  const subjects = [...new Set(teachers.map(t => t.subject).filter(Boolean))];

  return (
    <div>
      {!selected ? (
        <>
          <div className="page-title">Teacher Analytics</div>
          <div className="page-sub">Performance overview of all teachers</div>

          <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
            <div className="form-group" style={{ margin:0, flex:1, minWidth:200 }}>
              <label>Search teacher</label>
              <input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin:0, minWidth:180 }}>
              <label>Filter by subject</label>
              <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
                <option value="">-- All Subjects --</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {(search || subjectFilter) && (
              <div style={{ display:'flex', alignItems:'flex-end' }}>
                <button className="btn-outline" onClick={() => { setSearch(''); setSubjectFilter(''); }}>Clear</button>
              </div>
            )}
          </div>

          {loading ? <div className="loading">Loading teachers...</div> : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Teacher</th>
                      <th>Subject</th>
                      <th>Students</th>
                      <th>Classes</th>
                      <th>Avg Student Marks</th>
                      <th>Attendance %</th>
                      <th>Rating</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.length === 0
                      ? <tr><td colSpan={9} style={{ textAlign:'center', color:'#888', padding:24 }}>No teachers found</td></tr>
                      : teachers.map((t,i) => (
                        <tr key={t.id}>
                          <td>{i+1}</td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:30, height:30, borderRadius:'50%', background:'#E6F1FB', color:'#0C447C', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, fontSize:12 }}>
                                {t.name?.charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontSize:13, fontWeight:500 }}>{t.name}</div>
                                <div style={{ fontSize:11, color:'#888' }}>{t.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>{t.subject || <span style={{ color:'#aaa' }}>—</span>}</td>
                          <td>{t.total_students}</td>
                          <td>{t.classes_handled?.join(', ') || '—'}</td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ flex:1, height:5, background:'#f0f2f7', borderRadius:3, overflow:'hidden', minWidth:60 }}>
                                <div style={{ height:'100%', width:`${t.avg_student_marks}%`, background: t.avg_student_marks >= 75 ? '#1D9E75' : t.avg_student_marks >= 50 ? '#EF9F27' : '#E24B4A', borderRadius:3 }} />
                              </div>
                              <span style={{ fontSize:12, fontWeight:500 }}>{t.avg_student_marks}</span>
                            </div>
                          </td>
                          <td>{t.attendance_pct}%</td>
                          <td><span className={`badge ${ratingColor[t.rating] || 'badge-blue'}`}>{t.rating}</span></td>
                          <td>
                            <button className="btn-outline" style={{ padding:'4px 12px', fontSize:12 }}
                              onClick={() => { setSelected(t); fetchDetail(t.id); }}>
                              View →
                            </button>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <button className="btn-outline" style={{ fontSize:12 }} onClick={() => { setSelected(null); setDetail(null); }}>← Back</button>
            <div>
              <div className="page-title">{selected.name}</div>
              <div className="page-sub">{selected.subject || 'No subject'} · {selected.email}</div>
            </div>
          </div>

          {detailLoading ? <div className="loading">Loading teacher details...</div> : detail && (
            <>
              <div className="grid-4" style={{ marginBottom:20 }}>
                <div className="metric-card"><div className="label">Total Students</div><div className="value" style={{ color:'#185FA5' }}>{detail.total_students}</div></div>
                <div className="metric-card"><div className="label">Avg Marks</div><div className="value" style={{ color:'#0F6E56' }}>{detail.avg_marks}/100</div></div>
                <div className="metric-card"><div className="label">Attendance %</div><div className="value" style={{ color:'#854F0B' }}>{detail.attendance_pct}%</div></div>
                <div className="metric-card"><div className="label">Rating</div>
                  <div style={{ marginTop:6 }}>
                    <span className={`badge ${ratingColor[selected.rating] || 'badge-blue'}`} style={{ fontSize:13 }}>{selected.rating}</span>
                  </div>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom:20 }}>
                <div className="card">
                  <h3 style={{ fontWeight:600, marginBottom:14 }}>Performance Trend</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={detail.monthly_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
                      <XAxis dataKey="month" tick={{ fontSize:11 }} />
                      <YAxis domain={[0,100]} tick={{ fontSize:11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="avg" stroke="#185FA5" strokeWidth={2} dot={{ r:4 }} name="Avg Marks" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="card">
                  <h3 style={{ fontWeight:600, marginBottom:14 }}>Subject Performance</h3>
                  {detail.subject_stats?.length === 0
                    ? <p className="muted">No marks data yet</p>
                    : <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={detail.subject_stats}>
                          <XAxis dataKey="subject" tick={{ fontSize:11 }} />
                          <YAxis domain={[0,100]} tick={{ fontSize:11 }} />
                          <Tooltip />
                          <Bar dataKey="avg" fill="#0F6E56" radius={[4,4,0,0]} name="Avg Marks" />
                        </BarChart>
                      </ResponsiveContainer>
                  }
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontWeight:600, marginBottom:14 }}>Assigned Students ({detail.total_students})</h3>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>#</th><th>Name</th><th>Class</th><th>Section</th><th>Roll No</th><th>Fee Status</th></tr></thead>
                    <tbody>
                      {detail.students?.length === 0
                        ? <tr><td colSpan={6} style={{ textAlign:'center', color:'#888', padding:20 }}>No students assigned</td></tr>
                        : detail.students.map((s,i) => (
                          <tr key={s.id}>
                            <td>{i+1}</td>
                            <td><strong>{s.name}</strong></td>
                            <td>{s.class}</td>
                            <td>{s.section || '—'}</td>
                            <td>{s.roll_no || '—'}</td>
                            <td><span className={`badge ${s.fee_status==='paid'?'badge-green':s.fee_status==='partial'?'badge-amber':'badge-red'}`}>{s.fee_status}</span></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
