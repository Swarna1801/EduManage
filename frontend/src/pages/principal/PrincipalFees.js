import React, { useEffect, useState } from "react";
import API from "../../utils/api";

const CLASSES = ["9","10","11","12"];
const SECTIONS = ["A","B","C","D"];

export default function PrincipalFees() {
  const [students, setStudents] = useState([]);
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [feeFilter, setFeeFilter] = useState("");
  const [msg, setMsg] = useState("");
  const [notifying, setNotifying] = useState(null);
  const [bulkNotifying, setBulkNotifying] = useState(false);

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = () => {
    API.get("/principal/students").then(r => setStudents(r.data));
  };

  const updateFee = async (id, fee_status) => {
    try {
      await API.patch("/principal/students/" + id + "/fee", { fee_status });
      setMsg("Fee status updated!");
      fetchStudents();
      setTimeout(() => setMsg(""), 2000);
    } catch { setMsg("Failed to update"); }
  };

  const notifyParent = async (student) => {
    setNotifying(student.id);
    try {
      await API.post("/principal/notify-fee", { student_id: student.id, student_name: student.name });
      setMsg("Notification sent to parent of " + student.name);
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("Failed to send notification"); }
    finally { setNotifying(null); }
  };

  const notifyAllFiltered = async () => {
    const actionableStudents = filtered.filter((student) => student.fee_status === "pending" || student.fee_status === "partial");
    if (actionableStudents.length === 0) {
      setMsg("No pending or partial students found for the selected filters");
      setTimeout(() => setMsg(""), 2500);
      return;
    }

    setBulkNotifying(true);
    try {
      for (const student of actionableStudents) {
        await API.post("/principal/notify-fee", { student_id: student.id, student_name: student.name });
      }
      setMsg(`Notifications sent to ${actionableStudents.length} parent(s)`);
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg("Failed to send bulk notifications");
    } finally {
      setBulkNotifying(false);
    }
  };

  const filtered = students.filter(s => {
    if (classFilter && s.class !== classFilter) return false;
    if (sectionFilter && s.section !== sectionFilter) return false;
    if (feeFilter && s.fee_status !== feeFilter) return false;
    return true;
  });

  const summary = {
    paid: students.filter(s => s.fee_status === "paid").length,
    pending: students.filter(s => s.fee_status === "pending").length,
    partial: students.filter(s => s.fee_status === "partial").length,
  };
  const actionableFilteredCount = filtered.filter((student) => student.fee_status === "pending" || student.fee_status === "partial").length;

  const feeColor = { paid:"#EAF3DE", pending:"#FCEBEB", partial:"#FAEEDA" };
  const feeText = { paid:"#27500A", pending:"#791F1F", partial:"#633806" };

  return (
    <div>
      <div className="page-title">Fee Tracking</div>
      <div className="page-sub">Monitor and manage fee collection</div>

      {msg && <div className="alert alert-success" style={{ marginBottom:16 }}>{msg}</div>}

      <div className="grid-3" style={{ marginBottom:24 }}>
        {[
          { label:"Paid", count:summary.paid, color:"#0F6E56", bg:"#EAF3DE", pct: students.length ? Math.round((summary.paid/students.length)*100) : 0 },
          { label:"Pending", count:summary.pending, color:"#A32D2D", bg:"#FCEBEB", pct: students.length ? Math.round((summary.pending/students.length)*100) : 0 },
          { label:"Partial", count:summary.partial, color:"#854F0B", bg:"#FAEEDA", pct: students.length ? Math.round((summary.partial/students.length)*100) : 0 },
        ].map((m,i) => (
          <div key={i} className="card" style={{ background:m.bg, border:"none" }}>
            <div style={{ fontSize:28, fontWeight:700, color:m.color }}>{m.count}</div>
            <div style={{ fontSize:14, fontWeight:600, color:m.color }}>{m.label}</div>
            <div style={{ fontSize:12, color:m.color, opacity:0.7 }}>{m.pct}% of students</div>
            <div style={{ marginTop:8, height:4, borderRadius:2, background:"rgba(0,0,0,0.1)" }}>
              <div style={{ width:m.pct+"%", height:"100%", borderRadius:2, background:m.color }}></div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap", alignItems:"flex-end" }}>
        <div className="form-group" style={{ margin:0, minWidth:140 }}>
          <label>Class</label>
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)}>
            <option value="">All Classes</option>
            {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin:0, minWidth:140 }}>
          <label>Section</label>
          <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}>
            <option value="">All Sections</option>
            {SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin:0, minWidth:140 }}>
          <label>Fee Status</label>
          <select value={feeFilter} onChange={e => setFeeFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
          </select>
        </div>
        {(classFilter||sectionFilter||feeFilter) && (
          <button className="btn-outline" onClick={() => { setClassFilter(""); setSectionFilter(""); setFeeFilter(""); }}>Clear</button>
        )}
        <button
          className="btn-primary"
          onClick={notifyAllFiltered}
          disabled={bulkNotifying || actionableFilteredCount === 0}
          style={{ opacity: bulkNotifying || actionableFilteredCount === 0 ? 0.7 : 1 }}
        >
          {bulkNotifying ? "Notifying..." : `Notify All${actionableFilteredCount ? ` (${actionableFilteredCount})` : ""}`}
        </button>
        <div style={{ marginLeft:"auto", fontSize:13, color:"#888", alignSelf:"center" }}>
          Showing {filtered.length} of {students.length}
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Name</th><th>Class</th><th>Section</th><th>Roll No</th><th>Fee Status</th><th>Update</th><th>Notify Parent</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={8} style={{ textAlign:"center", color:"#888", padding:24 }}>No students found</td></tr>
                : filtered.map((s,i) => (
                  <tr key={s.id}>
                    <td>{i+1}</td>
                    <td><strong>{s.name}</strong></td>
                    <td>Class {s.class}</td>
                    <td>{s.section ? <span className="badge badge-blue">Sec {s.section}</span> : "—"}</td>
                    <td>{s.roll_no || "—"}</td>
                    <td>
                      <span style={{ padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:500, background:feeColor[s.fee_status], color:feeText[s.fee_status] }}>
                        {s.fee_status}
                      </span>
                    </td>
                    <td>
                      <select value={s.fee_status} onChange={e => updateFee(s.id, e.target.value)}
                        style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #dde1ea", fontSize:12 }}>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                      </select>
                    </td>
                    <td>
                      {s.fee_status !== "paid" && (
                        <button onClick={() => notifyParent(s)} disabled={notifying === s.id}
                          style={{ padding:"4px 10px", fontSize:11, borderRadius:6, border:"none", background:"#E6F1FB", color:"#0C447C", cursor:"pointer", fontWeight:500 }}>
                          {notifying === s.id ? "Sending..." : "Notify"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
