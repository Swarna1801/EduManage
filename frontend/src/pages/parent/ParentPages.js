import React, { useEffect, useState } from 'react';
import API from '../../utils/api';

export function ParentAttendance() {
  const [data, setData] = useState(null);
  useEffect(() => { API.get('/parent/child').then(r => setData(r.data)); }, []);
  const att = data?.attendance;

  return (
    <div>
      <div className="page-title">Attendance Record</div>
      <div className="page-sub">Your child's attendance history</div>
      {att && (
        <>
          <div className="grid-3" style={{ marginBottom: 20 }}>
            <div className="metric-card"><div className="label">Present / Working</div><div className="value" style={{ color: '#185FA5' }}>{`${att.present || 0}/${att.working_days || 0}`}</div></div>
            <div className="metric-card"><div className="label">Absent</div><div className="value" style={{ color: '#A32D2D' }}>{att.absent || 0}</div></div>
            <div className="metric-card"><div className="label">Attendance %</div><div className="value" style={{ color: '#3B6D11' }}>{att.pct}%</div></div>
          </div>
          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: 14 }}>Recent Attendance</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {att.records.length === 0
                    ? <tr><td colSpan={2} style={{ textAlign: 'center', color: '#888', padding: 20 }}>No records yet</td></tr>
                    : att.records.map((r, i) => (
                      <tr key={i}>
                        <td>{r.date}</td>
                        <td><span className={`badge ${r.status === 'present' ? 'badge-green' : r.status === 'late' ? 'badge-amber' : 'badge-red'}`}>{r.status}</span></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ParentMarks() {
  const [data, setData] = useState(null);
  useEffect(() => { API.get('/parent/child').then(r => setData(r.data)); }, []);
  const marks = data?.marks;

  return (
    <div>
      <div className="page-title">Marks Report</div>
      <div className="page-sub">Your child's exam results by subject</div>
      {marks?.subject_summary?.map((s, i) => (
        <div className="metric-card" key={i} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="label">{s.subject}</div>
            <strong style={{ fontSize: 18, color: s.avg >= 75 ? '#1D9E75' : s.avg >= 50 ? '#EF9F27' : '#E24B4A' }}>{s.avg}/100</strong>
          </div>
          <div style={{ height: 6, background: '#f0f2f7', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${s.avg}%`, background: s.avg >= 75 ? '#1D9E75' : s.avg >= 50 ? '#EF9F27' : '#E24B4A', borderRadius: 4 }} />
          </div>
        </div>
      ))}
      {!marks?.subject_summary?.length && <div className="card"><p style={{ color: '#888' }}>No marks uploaded yet by teacher.</p></div>}
    </div>
  );
}

export function ParentFees() {
  const [data, setData] = useState(null);
  useEffect(() => { API.get('/parent/child').then(r => setData(r.data)); }, []);
  const child = data?.child;
  const feeColor = { paid: 'badge-green', pending: 'badge-red', partial: 'badge-amber' };

  return (
    <div>
      <div className="page-title">Fee Status</div>
      <div className="page-sub">Your child's fee payment status</div>
      <div className="card">
        {child ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f0f2f7' }}>
              <span style={{ fontSize: 14, color: '#555' }}>Student</span>
              <strong>{child.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f0f2f7' }}>
              <span style={{ fontSize: 14, color: '#555' }}>Class</span>
              <span>{child.class}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
              <span style={{ fontSize: 14, color: '#555' }}>Fee Status</span>
              <span className={`badge ${feeColor[child.fee_status]}`} style={{ textTransform: 'capitalize', fontSize: 14 }}>{child.fee_status}</span>
            </div>
          </div>
        ) : <p style={{ color: '#888' }}>Loading...</p>}
      </div>
    </div>
  );
}

export function ParentNotifications() {
  const [data, setData] = useState(null);
  useEffect(() => { API.get('/parent/child').then(r => setData(r.data)); }, []);

  return (
    <div>
      <div className="page-title">Notifications</div>
      <div className="page-sub">School alerts and updates</div>
      <div className="card">
        {data?.notifications?.length === 0 && <p style={{ color: '#888', fontSize: 13 }}>No notifications yet.</p>}
        {data?.notifications?.map((n, i) => (
          <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #f0f2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>{n.message}</div>
            </div>
            <span className={`badge ${n.type === 'alert' ? 'badge-red' : n.type === 'reminder' ? 'badge-amber' : 'badge-blue'}`}>{n.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
