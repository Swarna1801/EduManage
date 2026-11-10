import React, { useEffect, useMemo, useState } from "react";
import API from "../../utils/api";
import PremiumPageHero from "../../components/layout/PremiumPageHero";
import { useLocation } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BellRing, Crown, Database, School, ShieldCheck, Sparkles, Users } from "lucide-react";

const expiryTone = {
  active: { bg: "#EAF8F2", color: "#0F6E56", label: "Active" },
  expiring: { bg: "#FFF4E8", color: "#A15A07", label: "Expiring Soon" },
  expired: { bg: "#FCEBEB", color: "#A32D2D", label: "Expired" },
  no_expiry: { bg: "#EEF2FF", color: "#4C51BF", label: "No Expiry" },
};

const sectionMeta = {
  overview: {
    title: "Super User Control Center",
    subtitle: "Monitor subscribed schools, manage plan upgrades or downgrades, track expiry risk, and review overall platform analytics.",
  },
  schools: {
    title: "School Insights",
    subtitle: "Select a school to view stored data, principal details, and core school usage from one premium control panel.",
  },
  notifications: {
    title: "Priority Notices",
    subtitle: "Send high-priority platform messages to principals and review the latest notices sent from the control center.",
  },
};

export default function SuperDashboard() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [banner, setBanner] = useState({ type: "", text: "" });
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drafts, setDrafts] = useState({});
  const [notifyForm, setNotifyForm] = useState({ school_id: "", title: "", message: "", priority: "critical" });
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);

  const activeSection = location.pathname.includes("/notifications")
    ? "notifications"
    : location.pathname.includes("/schools")
      ? "schools"
      : "overview";

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await API.get("/super/dashboard");
      setData(response.data);
      setLoading(false);
    } catch (error) {
      setBanner({ type: "error", text: error.response?.data?.message || "Failed to load control center" });
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const schools = data?.schools || [];
  const summary = data?.summary || {};
  const recentNotifications = data?.recent_notifications || [];

  useEffect(() => {
    if (!selectedSchoolId && schools.length > 0) {
      setSelectedSchoolId(schools[0].id);
    }
  }, [schools, selectedSchoolId]);

  const selectedSchool = schools.find((school) => school.id === selectedSchoolId) || schools[0] || null;

  const filteredSchools = useMemo(() => schools.filter((school) => {
    if (planFilter && school.plan !== planFilter) return false;
    if (statusFilter && school.expiry_state !== statusFilter) return false;
    return true;
  }), [schools, planFilter, statusFilter]);

  const updateDraft = (schoolId, field, value) => {
    const currentSchool = schools.find((item) => item.id === schoolId);
    setDrafts((current) => ({
      ...current,
      [schoolId]: {
        plan: current[schoolId]?.plan ?? currentSchool?.plan ?? "basic",
        plan_expires_at: current[schoolId]?.plan_expires_at ?? currentSchool?.plan_expires_at ?? "",
        payment_status: current[schoolId]?.payment_status ?? currentSchool?.payment_status ?? "pending",
        subscription_status: current[schoolId]?.subscription_status ?? currentSchool?.subscription_status ?? "trial",
        is_active: current[schoolId]?.is_active ?? currentSchool?.is_active ?? false,
        [field]: value,
      },
    }));
  };

  const saveSchool = async (schoolId) => {
    setBanner({ type: "", text: "" });
    try {
      await API.patch(`/super/schools/${schoolId}/plan`, drafts[schoolId] || {});
      setBanner({ type: "success", text: "School subscription updated successfully." });
      loadDashboard();
    } catch (error) {
      setBanner({ type: "error", text: error.response?.data?.message || "Failed to update school plan" });
    }
  };

  const sendNotification = async (e) => {
    e.preventDefault();
    setBanner({ type: "", text: "" });
    try {
      const response = await API.post("/super/notifications", notifyForm);
      setBanner({ type: "success", text: response.data.message });
      setNotifyForm({ school_id: "", title: "", message: "", priority: "critical" });
      loadDashboard();
    } catch (error) {
      setBanner({ type: "error", text: error.response?.data?.message || "Failed to send priority notification" });
    }
  };

  if (loading) return <div className="loading">Loading control center...</div>;

  const detailMetrics = selectedSchool ? [
    { label: "Students", value: selectedSchool.total_students || 0, color: "#185FA5", sub: "Student records stored" },
    { label: "Teachers", value: selectedSchool.total_teachers || 0, color: "#0F6E56", sub: "Teacher accounts in school" },
    { label: "Parents", value: selectedSchool.total_parents || 0, color: "#6B4CE6", sub: "Parent accounts linked" },
    { label: "Marks", value: selectedSchool.total_marks || 0, color: "#A15A07", sub: "Marks entries stored" },
    { label: "Attendance", value: selectedSchool.total_attendance_records || 0, color: "#A32D2D", sub: "Attendance records stored" },
    { label: "Notifications", value: selectedSchool.total_notifications || 0, color: "#185FA5", sub: "Notifications stored" },
  ] : [];

  const schoolStorageChart = selectedSchool ? [
    { name: "Students", value: selectedSchool.total_students || 0 },
    { name: "Teachers", value: selectedSchool.total_teachers || 0 },
    { name: "Parents", value: selectedSchool.total_parents || 0 },
    { name: "Marks", value: selectedSchool.total_marks || 0 },
    { name: "Attendance", value: selectedSchool.total_attendance_records || 0 },
    { name: "Notices", value: selectedSchool.total_notifications || 0 },
  ] : [];

  return (
    <div>
      <PremiumPageHero
        icon={<Crown size={22} />}
        title={sectionMeta[activeSection].title}
        subtitle={sectionMeta[activeSection].subtitle}
        badge="Platform Owner Workspace"
        meta={[
          { label: "Schools", value: String(summary.total_schools || 0), icon: <School size={16} />, color: "#185FA5", minWidth: 150 },
          { label: "Expiring Soon", value: String(summary.expiring_soon || 0), icon: <BellRing size={16} />, color: "#A15A07", minWidth: 170 },
          { label: "Premium", value: String(summary.premium_schools || 0), icon: <Sparkles size={16} />, color: "#6B4CE6", minWidth: 140 },
        ]}
      />

      {banner.text && (
        <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: banner.type === "error" ? "#FCEBEB" : "#EAF3DE", color: banner.type === "error" ? "#8B1E1E" : "#27500A", border: `1px solid ${banner.type === "error" ? "#F5C2C2" : "#C0DD97"}` }}>
          {banner.text}
        </div>
      )}

      {(activeSection === "overview" || activeSection === "schools") && (
        <>
          <div className="grid-4" style={{ marginBottom: 24 }}>
            {[
              { label: "Total Schools", value: summary.total_schools || 0, color: "#185FA5", sub: "Subscribed schools on the platform" },
              { label: "Premium Plans", value: summary.premium_schools || 0, color: "#6B4CE6", sub: "Schools currently on premium" },
              { label: "Basic Plans", value: summary.basic_schools || 0, color: "#0F6E56", sub: "Schools currently on basic" },
              { label: "Expired / Expiring", value: `${summary.expired || 0} / ${summary.expiring_soon || 0}`, color: "#A15A07", sub: "Need renewal attention" },
            ].map((metric) => (
              <div key={metric.label} className="metric-card">
                <div className="label">{metric.label}</div>
                <div className="value" style={{ color: metric.color }}>{metric.value}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: "#778399" }}>{metric.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: activeSection === "schools" ? "0.8fr 1.2fr" : "1fr 1fr", gap: 24, marginBottom: 24 }}>
            <div className="card" style={{ borderRadius: 22, border: "1px solid #E4EBF5", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700 }}>{activeSection === "schools" ? "School Directory" : "Subscribed Schools"}</h3>
                  <div style={{ fontSize: 13, color: "#6A7890", marginTop: 4 }}>Click a school to inspect plan, principal contact, and stored data.</div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
                  <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
                    <label>Plan</label>
                    <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
                      <option value="">All Plans</option>
                      <option value="basic">Basic</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0, minWidth: 170 }}>
                    <label>Expiry State</label>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="">All States</option>
                      <option value="active">Active</option>
                      <option value="expiring">Expiring Soon</option>
                      <option value="expired">Expired</option>
                      <option value="no_expiry">No Expiry</option>
                    </select>
                  </div>
                  {(planFilter || statusFilter) && <button className="btn-outline" onClick={() => { setPlanFilter(""); setStatusFilter(""); }}>Clear</button>}
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {filteredSchools.map((school) => {
                  const tone = expiryTone[school.expiry_state] || expiryTone.active;
                  return (
                    <button
                      key={school.id}
                      type="button"
                      onClick={() => setSelectedSchoolId(school.id)}
                      style={{
                        textAlign: "left",
                        padding: 16,
                        borderRadius: 18,
                        border: selectedSchoolId === school.id ? "1px solid #BFD3F4" : "1px solid #E7EDF6",
                        background: selectedSchoolId === school.id ? "linear-gradient(135deg, #F4F9FF 0%, #FFFFFF 100%)" : "#fff",
                        boxShadow: selectedSchoolId === school.id ? "0 14px 28px rgba(24, 95, 165, 0.08)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                        <div>
                          <div style={{ fontWeight: 800, color: "#122B4A", fontSize: 18 }}>{school.school_name}</div>
                          <div style={{ fontSize: 12, color: "#6A7890", marginTop: 5 }}>{school.school_id}</div>
                          <div style={{ fontSize: 12, color: "#6A7890", marginTop: 5 }}>{school.principal_email}</div>
                        </div>
                        <span style={{ padding: "4px 8px", borderRadius: 999, background: tone.bg, color: tone.color, fontSize: 11, fontWeight: 700 }}>{tone.label}</span>
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                        <span className="badge badge-blue">{school.plan}</span>
                        <span className="badge badge-green">{school.total_students} students</span>
                        <span className="badge badge-amber">{school.total_teachers} teachers</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ borderRadius: 22, border: "1px solid #E4EBF5", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)" }}>
              {!selectedSchool ? (
                <p style={{ color: "#888", fontSize: 13 }}>Select a school to view its details.</p>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: 800 }}>{selectedSchool.school_name}</h3>
                      <div style={{ fontSize: 13, color: "#6A7890", marginTop: 4 }}>{selectedSchool.school_id}</div>
                      <div style={{ fontSize: 13, color: "#6A7890", marginTop: 4 }}>Principal: {selectedSchool.principal_name} • {selectedSchool.principal_email}</div>
                    </div>
                    <span style={{ padding: "6px 10px", borderRadius: 999, background: expiryTone[selectedSchool.expiry_state]?.bg || "#EEF2FF", color: expiryTone[selectedSchool.expiry_state]?.color || "#4C51BF", fontSize: 11, fontWeight: 700 }}>
                      {expiryTone[selectedSchool.expiry_state]?.label || "No Expiry"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 }}>
                    {detailMetrics.map((metric) => (
                      <div key={metric.label} style={{ borderRadius: 18, padding: "16px 18px", border: "1px solid #E7EDF6", background: "#fff" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#7B889A", textTransform: "uppercase", letterSpacing: 0.8 }}>{metric.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: metric.color, marginTop: 8 }}>{metric.value}</div>
                        <div style={{ fontSize: 12, color: "#6A7890", marginTop: 6 }}>{metric.sub}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 18 }}>
                    <div style={{ borderRadius: 18, padding: "16px 18px", border: "1px solid #E7EDF6", background: "linear-gradient(135deg, #F8FBFF 0%, #FFFFFF 100%)" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#7B889A", textTransform: "uppercase", letterSpacing: 0.8 }}>Subscription</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#122B4A", marginTop: 8 }}>{selectedSchool.plan.toUpperCase()}</div>
                      <div style={{ fontSize: 13, color: "#6A7890", marginTop: 6 }}>
                        {selectedSchool.plan_expires_at ? `Expires on ${selectedSchool.plan_expires_at}` : "Expiry not set"}
                      </div>
                    </div>
                    <div style={{ borderRadius: 18, padding: "16px 18px", border: "1px solid #E7EDF6", background: "linear-gradient(135deg, #FFF8EE 0%, #FFFFFF 100%)" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#7B889A", textTransform: "uppercase", letterSpacing: 0.8 }}>School Data Stored</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#122B4A", marginTop: 8 }}>
                        {(selectedSchool.total_marks || 0) + (selectedSchool.total_attendance_records || 0) + (selectedSchool.total_notifications || 0) + (selectedSchool.total_announcements || 0)}
                      </div>
                      <div style={{ fontSize: 13, color: "#6A7890", marginTop: 6 }}>Marks, attendance, notifications, and announcements combined.</div>
                    </div>
                  </div>

                  <div style={{ borderRadius: 20, padding: 18, border: "1px solid #E7EDF6", background: "#fff", marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <Database size={18} color="#185FA5" />
                      <div style={{ fontWeight: 700, color: "#122B4A" }}>Stored Data Analytics</div>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={schoolStorageChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#185FA5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ overflow: "auto" }}>
                    <table style={{ width: "100%", minWidth: 920 }}>
                      <thead>
                        <tr>
                          <th>Plan</th>
                          <th>Expiry</th>
                          <th>Status</th>
                          <th>Payment</th>
                          <th>Active</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const draft = drafts[selectedSchool.id] || selectedSchool;
                          return (
                            <tr>
                              <td>
                                <select value={draft.plan || "basic"} onChange={(e) => updateDraft(selectedSchool.id, "plan", e.target.value)}>
                                  <option value="basic">Basic</option>
                                  <option value="premium">Premium</option>
                                </select>
                              </td>
                              <td>
                                <input type="date" value={draft.plan_expires_at || ""} onChange={(e) => updateDraft(selectedSchool.id, "plan_expires_at", e.target.value)} />
                              </td>
                              <td>
                                <select value={draft.subscription_status || "trial"} onChange={(e) => updateDraft(selectedSchool.id, "subscription_status", e.target.value)}>
                                  <option value="trial">Trial</option>
                                  <option value="active">Active</option>
                                  <option value="expiring">Expiring</option>
                                  <option value="expired">Expired</option>
                                </select>
                              </td>
                              <td>
                                <select value={draft.payment_status || "pending"} onChange={(e) => updateDraft(selectedSchool.id, "payment_status", e.target.value)}>
                                  <option value="pending">Pending</option>
                                  <option value="paid">Paid</option>
                                </select>
                              </td>
                              <td>
                                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "#566579" }}>
                                  <input type="checkbox" checked={Boolean(draft.is_active)} onChange={(e) => updateDraft(selectedSchool.id, "is_active", e.target.checked)} />
                                  {draft.is_active ? "Active" : "Inactive"}
                                </label>
                              </td>
                              <td>
                                <button className="btn-primary" onClick={() => saveSchool(selectedSchool.id)}>Save School</button>
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {(activeSection === "overview" || activeSection === "notifications") && (
        <div style={{ display: "grid", gridTemplateColumns: activeSection === "notifications" ? "1.1fr 0.9fr" : "0.95fr 1.05fr", gap: 24, marginBottom: 24 }}>
          <div className="card" style={{ borderRadius: 22, border: "1px solid #E4EBF5", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: "#FFF4E8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BellRing size={20} color="#A15A07" />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "#122B4A" }}>Notify Principal</div>
                <div style={{ fontSize: 12, color: "#6A7890" }}>Priority platform messages appear first in the principal portal.</div>
              </div>
            </div>
            <form onSubmit={sendNotification} style={{ display: "grid", gap: 10 }}>
              <select value={notifyForm.school_id} onChange={(e) => setNotifyForm({ ...notifyForm, school_id: e.target.value })} required>
                <option value="">Select school</option>
                {schools.map((school) => <option key={school.id} value={school.id}>{school.school_name}</option>)}
              </select>
              <input type="text" placeholder="Notification title" value={notifyForm.title} onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })} required />
              <textarea placeholder="Write the message for the principal..." value={notifyForm.message} onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })} rows={6} required />
              <select value={notifyForm.priority} onChange={(e) => setNotifyForm({ ...notifyForm, priority: e.target.value })}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
              </select>
              <button className="btn-primary" type="submit">Send Priority Notification</button>
            </form>
          </div>

          <div className="card" style={{ borderRadius: 22, border: "1px solid #E4EBF5", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShieldCheck size={20} color="#6B4CE6" />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "#122B4A" }}>Recent Platform Notices</div>
                <div style={{ fontSize: 12, color: "#6A7890" }}>Latest high-priority updates sent from the control center.</div>
              </div>
            </div>
            {recentNotifications.length === 0 ? (
              <p style={{ color: "#888", fontSize: 13 }}>No platform notices sent yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {recentNotifications.map((item) => (
                  <div key={item.id} style={{ padding: 14, borderRadius: 14, border: "1px solid #E7EDF6", background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ fontWeight: 700, color: "#122B4A" }}>{item.title}</div>
                      <span style={{ padding: "4px 8px", borderRadius: 999, background: item.priority === "critical" ? "#FCEBEB" : item.priority === "high" ? "#FFF4E8" : "#E6F1FB", color: item.priority === "critical" ? "#A32D2D" : item.priority === "high" ? "#A15A07" : "#185FA5", fontSize: 11, fontWeight: 700 }}>
                        {item.priority || "normal"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#6A7890", marginTop: 6 }}>{item.message}</div>
                    <div style={{ fontSize: 11, color: "#9AA6B5", marginTop: 8 }}>{new Date(item.createdAt).toLocaleString("en-IN")}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
