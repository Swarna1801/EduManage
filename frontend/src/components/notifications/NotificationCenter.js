import React, { useEffect, useMemo, useState } from "react";
import API from "../../utils/api";

const sortByNewest = (items) =>
  [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

const CATEGORY_TITLES = {
  marks: "Marks Updates",
  attendance: "Attendance Updates",
  teacher_attendance: "Teacher Attendance",
  fees: "Fee Alerts",
  students: "Student Records",
  teachers: "Teacher Updates",
  parents: "Parent Accounts",
  announcements: "Announcements",
  chat: "Chat Messages",
  general: "General",
};

export default function NotificationCenter({ apiBasePath, subtitle, emptyTitle, emptySubtitle }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [busyNotificationId, setBusyNotificationId] = useState(null);
  const [clearingCategory, setClearingCategory] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    API.get(`${apiBasePath}/notifications`)
      .then((response) => {
        setNotifications(sortByNewest(Array.isArray(response.data) ? response.data : []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [apiBasePath]);

  const clearNotification = async (notificationId) => {
    setBusyNotificationId(notificationId);
    setActionError("");
    try {
      await API.delete(`${apiBasePath}/notifications/${notificationId}`);
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
      await API.delete(`${apiBasePath}/notifications/category/${categoryKey}`);
      setNotifications((current) =>
        current.filter((item) => {
          const normalizedCategory = CATEGORY_TITLES[item.category] ? item.category : "general";
          return normalizedCategory !== categoryKey;
        })
      );
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to clear notifications");
    } finally {
      setClearingCategory("");
    }
  };

  const filteredNotifications = useMemo(
    () =>
      sortByNewest(
        notifications.filter((notification) => {
          const key = CATEGORY_TITLES[notification.category] ? notification.category : "general";
          return !categoryFilter || key === categoryFilter;
        })
      ),
    [notifications, categoryFilter]
  );

  const typeColor = { info: "#E6F1FB", alert: "#FCEBEB", reminder: "#FAEEDA" };
  const typeText = { info: "#0C447C", alert: "#791F1F", reminder: "#633806" };
  const typeIcon = { info: "i", alert: "!", reminder: "R" };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="page-title">Notifications</div>
      <div className="page-sub">{subtitle}</div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="form-group" style={{ margin: 0, minWidth: 220 }}>
          <label>Filter by Category</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Notifications</option>
            {Object.entries(CATEGORY_TITLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
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
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "#E6F1FB", color: "#0C447C", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, marginBottom: 12 }}>i</div>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>{emptyTitle}</div>
            <div style={{ fontSize: 13 }}>{emptySubtitle}</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>Recent Notifications</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="badge badge-blue">{filteredNotifications.length}</span>
                {categoryFilter && (
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => clearCategoryNotifications(categoryFilter)}
                    disabled={clearingCategory === categoryFilter}
                    style={{ padding: "6px 10px", fontSize: 12 }}
                  >
                    {clearingCategory === categoryFilter ? "Clearing..." : "Clear Filtered"}
                  </button>
                )}
              </div>
            </div>

            {filteredNotifications.map((notification) => (
              <div key={notification.id} style={{ padding: "14px 0", borderBottom: "1px solid #f0f2f7", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: typeColor[notification.type] || "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  <span style={{ color: typeText[notification.type] || "#0C447C", fontWeight: 700 }}>{typeIcon[notification.type] || "i"}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{notification.title}</div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>{notification.message}</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                    {new Date(notification.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, height: "fit-content", background: typeColor[notification.type] || "#E6F1FB", color: typeText[notification.type] || "#0C447C" }}>
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
                    x
                  </button>
                </div>
              </div>
            ))}

            {filteredNotifications.length === 0 && (
              <div style={{ textAlign: "center", color: "#888", padding: 32 }}>
                No notifications found for the selected category.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
