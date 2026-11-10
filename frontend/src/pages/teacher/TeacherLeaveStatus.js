import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import { CalendarClock, CalendarDays, Users } from "lucide-react";

export default function TeacherLeaveStatus() {
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState({ type: "", text: "" });
  const [leaveForm, setLeaveForm] = useState({ date: "", reason: "" });
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [studentLeaveRequests, setStudentLeaveRequests] = useState([]);

  const loadDashboard = () => {
    setLoading(true);
    API.get("/teacher/dashboard").then((response) => {
      setLeaveRequests(response.data?.teacher_leave_requests || []);
      setStudentLeaveRequests(response.data?.student_leave_requests || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const pendingTeacherLeaves = leaveRequests.filter((item) => !["leave_approved", "leave_rejected"].includes(item.status)).length;

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setLeaveSaving(true);
    setBanner({ type: "", text: "" });
    try {
      const response = await API.post("/teacher/leave", leaveForm);
      setBanner({ type: "success", text: response.data.message });
      setLeaveForm({ date: "", reason: "" });
      loadDashboard();
    } catch (error) {
      setBanner({ type: "error", text: error.response?.data?.message || "Failed to submit leave request" });
    } finally {
      setLeaveSaving(false);
    }
  };

  const handleStudentLeaveReview = async (id, status) => {
    setBanner({ type: "", text: "" });
    try {
      const response = await API.post(`/teacher/student-leave/${id}/review`, { status });
      setBanner({ type: "success", text: response.data.message });
      loadDashboard();
    } catch (error) {
      setBanner({ type: "error", text: error.response?.data?.message || "Failed to review student leave" });
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="page-title">Leave Status</div>
      <div className="page-sub">Apply for leave, track your requests, and review parent leave requests in one place.</div>

      {banner.text && (
        <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: banner.type === "error" ? "#FCEBEB" : "#EAF3DE", color: banner.type === "error" ? "#8B1E1E" : "#27500A", border: `1px solid ${banner.type === "error" ? "#F5C2C2" : "#C0DD97"}` }}>
          {banner.text}
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 100%)", border: "1px solid #E4EBF5", borderRadius: 20, padding: "18px 20px", boxShadow: "0 16px 32px rgba(15, 23, 42, 0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CalendarDays size={20} color="#185FA5" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "#122B4A" }}>Apply Leave</div>
              <div style={{ fontSize: 12, color: "#6A7890" }}>Submit your leave request from here.</div>
            </div>
          </div>
          <form onSubmit={handleApplyLeave} style={{ display: "grid", gap: 10 }}>
            <input type="date" value={leaveForm.date} onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })} />
            <input type="text" placeholder="Reason for leave" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
            <button type="submit" className="btn-primary" disabled={leaveSaving}>{leaveSaving ? "Submitting..." : "Apply Leave"}</button>
          </form>
          <div style={{ marginTop: 12, fontSize: 13, color: "#6A7890" }}>Pending requests: <strong style={{ color: "#122B4A" }}>{pendingTeacherLeaves}</strong></div>
        </div>

        <div style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #FFFDFC 100%)", border: "1px solid #E6EDF6", borderRadius: 20, padding: "18px 20px", boxShadow: "0 16px 32px rgba(15, 23, 42, 0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: "#FFF2EE", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CalendarClock size={20} color="#C2410C" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "#122B4A" }}>My Leave Request Status</div>
              <div style={{ fontSize: 12, color: "#6A7890" }}>Track all leave requests you have submitted.</div>
            </div>
          </div>
          {leaveRequests.length === 0 ? (
            <p style={{ color: "#888", fontSize: 13 }}>No leave requests yet.</p>
          ) : leaveRequests.map((request) => (
            <div key={request.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f0f2f7" }}>
              <div>
                <div style={{ fontWeight: 600, color: "#122B4A" }}>{request.date}</div>
                <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>{request.leave_reason}</div>
              </div>
              <span className={`badge ${request.status === "leave_approved" ? "badge-green" : request.status === "leave_rejected" ? "badge-red" : "badge-amber"}`}>
                {request.status === "leave_approved" ? "Approved" : request.status === "leave_rejected" ? "Rejected" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ borderRadius: 22, border: "1px solid #E6EDF6", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: "#EAF8F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={19} color="#1D9E75" />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, margin: 0 }}>Parent Leave Requests</h3>
              <div style={{ fontSize: 12, color: "#6A7890", marginTop: 4 }}>Review and respond to pending leave requests from parents.</div>
            </div>
          </div>
          <span className="badge badge-amber">{studentLeaveRequests.length}</span>
        </div>
        {studentLeaveRequests.length === 0 ? (
          <p style={{ color: "#888", fontSize: 13 }}>No student leave requests pending.</p>
        ) : studentLeaveRequests.map((request) => (
          <div key={request.id} style={{ border: "1px solid #eef1f7", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>{request.student_name}</div>
            <div style={{ fontSize: 12, color: "#185FA5", marginTop: 4 }}>{request.class_label}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Leave date: {request.date}</div>
            <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>{request.reason}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button className="btn-primary" type="button" onClick={() => handleStudentLeaveReview(request.id, "approved")}>Approve</button>
              <button className="btn-outline" type="button" onClick={() => handleStudentLeaveReview(request.id, "rejected")}>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
