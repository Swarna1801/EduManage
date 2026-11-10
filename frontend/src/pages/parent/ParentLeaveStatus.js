import React, { useEffect, useMemo, useState } from "react";
import API from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

export default function ParentLeaveStatus() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leaveForm, setLeaveForm] = useState({ student_id: "", date: "", reason: "" });
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [banner, setBanner] = useState({ type: "", text: "" });

  const loadDashboard = () => {
    API.get("/parent/dashboard")
      .then((response) => {
        setData(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load leave data");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const children = data?.children || (data?.child ? [data.child] : []);
  const leaveRequests = data?.leave_requests || [];

  const latestDecisionTime = useMemo(
    () =>
      leaveRequests.reduce((latest, request) => {
        if (!["approved", "rejected"].includes(request.status)) return latest;
        const updatedAt = request?.updatedAt ? new Date(request.updatedAt).getTime() : 0;
        return updatedAt > latest ? updatedAt : latest;
      }, 0),
    [leaveRequests]
  );

  useEffect(() => {
    if (latestDecisionTime) {
      localStorage.setItem(
        `parent_leave_status_seen_${user?.school_id || "school"}_${user?.id || "default"}`,
        String(latestDecisionTime)
      );
    }
  }, [latestDecisionTime, user?.id, user?.school_id]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setLeaveSaving(true);
    setBanner({ type: "", text: "" });
    try {
      const response = await API.post("/parent/student-leave", leaveForm);
      setBanner({ type: "success", text: response.data.message });
      setLeaveForm({ student_id: "", date: "", reason: "" });
      loadDashboard();
    } catch (err) {
      setBanner({ type: "error", text: err.response?.data?.message || "Failed to apply leave" });
    } finally {
      setLeaveSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="card">{error}</div>;

  return (
    <div>
      <div className="page-title">Leave Status</div>
      <div className="page-sub">Apply student leave and track approvals or rejections from the class teacher.</div>

      {banner.text && (
        <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: banner.type === "error" ? "#FCEBEB" : "#EAF3DE", color: banner.type === "error" ? "#8B1E1E" : "#27500A", border: `1px solid ${banner.type === "error" ? "#F5C2C2" : "#C0DD97"}` }}>
          {banner.text}
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 14 }}>Apply Student Leave</h3>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>Send a prior leave request to the class teacher for approval.</div>
          <form onSubmit={handleApplyLeave} style={{ display: "grid", gap: 10 }}>
            <select value={leaveForm.student_id} onChange={(e) => setLeaveForm({ ...leaveForm, student_id: e.target.value })} required>
              <option value="">-- Select Child --</option>
              {children.map((childItem) => (
                <option key={childItem.id} value={childItem.id}>{childItem.name}</option>
              ))}
            </select>
            <input type="date" value={leaveForm.date} onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })} required />
            <input type="text" placeholder="Reason for leave" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} required />
            <button className="btn-primary" type="submit" disabled={leaveSaving}>{leaveSaving ? "Submitting..." : "Apply Leave"}</button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 14 }}>Leave Request Status</h3>
          {leaveRequests.length === 0 ? (
            <p style={{ color: "#888", fontSize: 13 }}>No leave requests yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 10, maxHeight: 460, overflowY: "auto", paddingRight: 4 }}>
              {leaveRequests.slice(0, 20).map((request) => {
                const requestChild = children.find((childItem) => childItem.id === request.student_id);
                return (
                  <div key={request.id} style={{ padding: "12px 0", borderBottom: "1px solid #f0f2f7" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{requestChild?.name || "Student"} - {request.date}</div>
                        <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>{request.reason}</div>
                      </div>
                      <span className={`badge ${request.status === "approved" ? "badge-green" : request.status === "rejected" ? "badge-red" : "badge-amber"}`}>
                        {request.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
