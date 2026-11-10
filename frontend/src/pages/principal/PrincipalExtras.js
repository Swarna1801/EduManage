import React, { useEffect, useMemo, useState } from "react";
import API from "../../utils/api";

const sortByNewest = (items) =>
  [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

export function PrincipalMarks() {
  return (
    <div>
      <div className="page-title">Marks Overview</div>
      <div className="page-sub">View all uploaded marks across classes</div>
      <div className="card">
        <p style={{ color: "#888", fontSize: 14 }}>Marks are uploaded by teachers. Use the Analytics page to see aggregated performance charts.</p>
        <a href="/dashboard/principal/analytics" className="btn-primary" style={{ display: "inline-block", marginTop: 14, textDecoration: "none" }}>Go to Analytics</a>
      </div>
    </div>
  );
}

export function PrincipalFees() {
  return (
    <div>
      <div className="page-title">Fee Tracking</div>
      <div className="page-sub">Monitor fee collection status</div>
      <div className="card">
        <p style={{ color: "#888", fontSize: 14, marginBottom: 14 }}>Fee statuses are managed per student. Go to Manage Students to update fee status.</p>
        <a href="/dashboard/principal/students" className="btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>Manage Students</a>
      </div>
    </div>
  );
}

export function PrincipalNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [busyNotificationId, setBusyNotificationId] = useState(null);
  const [clearingCategory, setClearingCategory] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    API.get("/principal/notifications")
      .then((response) => {
        setNotifications(Array.isArray(response.data) ? response.data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const clearNotification = async (notificationId) => {
    setBusyNotificationId(notificationId);
    setActionError("");
    try {
      await API.delete(`/principal/notifications/${notificationId}`);
      setNotifications((current) => current.filter((item) => item.id !== notificationId));
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to clear notification");
    } finally {
      setBusyNotificationId(null);
    }
  };

  const clearCategoryNotifications = async (categoryKey) => {
    setClearingCategory(categoryKey);
    setActionError("");
    try {
      await API.delete(`/principal/notifications/category/${categoryKey}`);
      setNotifications((current) =>
        current.filter((item) => {
          const normalizedCategory = titles[item.category] ? item.category : "general";
          return normalizedCategory !== categoryKey;
        })
      );
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to clear notifications");
    } finally {
      setClearingCategory("");
    }
  };

  const groups = useMemo(() => {
    const grouped = {
      marks: [],
      attendance: [],
      teacher_attendance: [],
      fees: [],
      students: [],
      teachers: [],
      parents: [],
      announcements: [],
      general: [],
    };

    notifications.forEach((notification) => {
      const key = grouped[notification.category] ? notification.category : "general";
      if (categoryFilter && key !== categoryFilter) return;
      grouped[key].push(notification);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key] = sortByNewest(grouped[key]);
    });

    return grouped;
  }, [notifications, categoryFilter]);

  const titles = {
    marks: "Marks Updates",
    attendance: "Attendance Updates",
    teacher_attendance: "Teacher Attendance",
    fees: "Fee Alerts",
    students: "Student Records",
    teachers: "Teacher Updates",
    parents: "Parent Accounts",
    announcements: "Announcements",
    general: "General",
  };

  const typeColor = { info: "#E6F1FB", alert: "#FCEBEB", reminder: "#FAEEDA" };
  const typeText = { info: "#0C447C", alert: "#791F1F", reminder: "#633806" };
  const priorityColor = { critical: "#A32D2D", high: "#A15A07", normal: "#185FA5" };
  const priorityBg = { critical: "#FCEBEB", high: "#FFF4E8", normal: "#E6F1FB" };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="page-title">Notifications</div>
      <div className="page-sub">System-wide alerts grouped by operational section</div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="form-group" style={{ margin: 0, minWidth: 220 }}>
          <label>Filter by Category</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Notifications</option>
            {Object.entries(titles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        {categoryFilter && <button className="btn-outline" onClick={() => setCategoryFilter("")}>Clear</button>}
      </div>

      {actionError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {actionError}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="card">
          <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>!</div>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>No notifications yet</div>
            <div style={{ fontSize: 13 }}>Marks, attendance, fee alerts, and announcements will appear here in separate sections.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {Object.entries(groups).map(([key, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={key} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontWeight: 700 }}>{titles[key]}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="badge badge-blue">{items.length}</span>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => clearCategoryNotifications(key)}
                      disabled={clearingCategory === key}
                      style={{ padding: "6px 10px", fontSize: 12 }}
                    >
                      {clearingCategory === key ? "Clearing..." : "Clear All"}
                    </button>
                  </div>
                </div>

                {items.map((notification) => (
                  <div key={notification.id} style={{ padding: "14px 0", borderBottom: "1px solid #f0f2f7", display: "flex", gap: 12, background: notification.source_role === "super_user" ? "linear-gradient(135deg, #FFF8E8 0%, rgba(255,255,255,0) 65%)" : "transparent", borderRadius: 12, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: typeColor[notification.type] || "#E6F1FB",
                        color: typeText[notification.type] || "#0C447C",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {key.slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{notification.title}</div>
                        {notification.source_role === "super_user" && (
                          <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "#FFF4E8", color: "#A15A07" }}>
                            Platform Priority
                          </span>
                        )}
                        {notification.priority && (
                          <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: priorityBg[notification.priority] || "#E6F1FB", color: priorityColor[notification.priority] || "#185FA5" }}>
                            {notification.priority}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>{notification.message}</div>
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                        {new Date(notification.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          height: "fit-content",
                          background: typeColor[notification.type] || "#E6F1FB",
                          color: typeText[notification.type] || "#0C447C",
                        }}
                      >
                        {notification.type || "info"}
                      </span>
                      <button
                        type="button"
                        onClick={() => clearNotification(notification.id)}
                        disabled={busyNotificationId === notification.id}
                        aria-label="Clear notification"
                        title="Clear notification"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          border: "1px solid #d9e2f0",
                          background: "#fff",
                          color: "#6A7890",
                          fontSize: 16,
                          lineHeight: 1,
                          cursor: busyNotificationId === notification.id ? "wait" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: busyNotificationId === notification.id ? 0.65 : 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {categoryFilter && Object.values(groups).every((items) => items.length === 0) && (
            <div className="card" style={{ textAlign: "center", color: "#888", padding: 32 }}>
              No notifications found for the selected category.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
