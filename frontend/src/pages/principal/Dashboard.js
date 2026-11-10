import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { getPlanFeatures } from "../../lib/planFeatures";
import PremiumPageHero from "../../components/layout/PremiumPageHero";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Building2, ChartColumnBig, Shield } from "lucide-react";

const DEFAULT_EVENTS = [
  { id: "evt-1", title: "Unit Test - Mathematics", date: "2026-04-03", type: "Exam" },
  { id: "evt-2", title: "PTA Meeting", date: "2026-04-08", type: "Meeting" },
  { id: "evt-3", title: "Diwali Celebration Planning", date: "2026-10-28", type: "Event" },
];

const eventTypeStyles = {
  Exam: { bg: "#E6F1FB", color: "#185FA5" },
  Meeting: { bg: "#EEEDFE", color: "#3C3489" },
  Event: { bg: "#EAF3DE", color: "#27500A" },
  Holiday: { bg: "#FAEEDA", color: "#854F0B" },
};

const PIE_COLORS = ["#185FA5", "#1D9E75", "#EF9F27", "#E24B4A"];

export default function PrincipalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventForm, setEventForm] = useState({ title: "", date: "", type: "Exam" });
  const [events, setEvents] = useState([]);
  const [actionBanner, setActionBanner] = useState({ type: "", text: "" });

  const plan = user?.plan || "basic";
  const maxStudents = getPlanFeatures(plan).maxStudents;
  const eventStorageKey = `principal-events-${user?.school_id || user?.id || "default"}`;

  useEffect(() => {
    Promise.all([API.get("/principal/dashboard"), API.get("/principal/analytics")])
      .then(([dashboardResponse, analyticsResponse]) => {
        setData(dashboardResponse.data);
        setAnalytics(analyticsResponse.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(eventStorageKey);
    if (stored) {
      try {
        setEvents(JSON.parse(stored));
        return;
      } catch {
        localStorage.removeItem(eventStorageKey);
      }
    }
    setEvents(DEFAULT_EVENTS);
  }, [eventStorageKey]);

  useEffect(() => {
    if (events.length) localStorage.setItem(eventStorageKey, JSON.stringify(events));
  }, [events, eventStorageKey]);

  const totalStudents = data?.students || 0;
  const studentUsagePct = Math.min(100, Math.round((totalStudents / Math.max(maxStudents, 1)) * 100));

  const metrics = [
    { label: "Total Students", value: totalStudents, color: "#185FA5", sub: `${totalStudents} / ${maxStudents} student records used` },
    { label: "Teachers", value: data?.teachers || 0, color: "#0F6E56", sub: "Active staff in this school" },
    { label: "Fee Pending", value: data?.fee_pending || 0, color: "#A32D2D", sub: "Students needing fee follow-up" },
    { label: "Marks Entries", value: analytics?.total_marks_entries || 0, color: "#854F0B", sub: "Academic records stored" },
  ];

  const upcomingEvents = useMemo(() => [...events].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6), [events]);

  const feeData = analytics?.fee_summary
    ? [
        { name: "Paid", value: analytics.fee_summary.paid || 0 },
        { name: "Pending", value: analytics.fee_summary.pending || 0 },
        { name: "Partial", value: analytics.fee_summary.partial || 0 },
      ]
    : [];

  const teacherStatusData = [
    { name: "Present", value: (data?.teachers_attendance || []).filter((item) => item.status === "present").length },
    { name: "Leave", value: (data?.teachers_attendance || []).filter((item) => item.status === "leave_approved" || item.status === "leave_pending").length },
    { name: "Not Marked", value: (data?.teachers_attendance || []).filter((item) => item.status === "not_marked").length },
  ];

  const topClasses = (analytics?.class_stats || []).slice().sort((a, b) => b.avg_marks - a.avg_marks).slice(0, 6);

  const addEvent = (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date) return;
    const nextEvent = { id: `evt-${Date.now()}`, title: eventForm.title, date: eventForm.date, type: eventForm.type };
    setEvents((current) => [...current, nextEvent]);
    setEventForm({ title: "", date: "", type: "Exam" });
  };

  const removeEvent = (id) => {
    setEvents((current) => current.filter((event) => event.id !== id));
  };

  const refreshDashboard = () => {
    Promise.all([API.get("/principal/dashboard"), API.get("/principal/analytics")])
      .then(([dashboardResponse, analyticsResponse]) => {
        setData(dashboardResponse.data);
        setAnalytics(analyticsResponse.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const updateLeaveRequest = async (id, action) => {
    setActionBanner({ type: "", text: "" });
    try {
      const response = await API.post(`/principal/teacher-leave/${id}/${action}`);
      setActionBanner({ type: "success", text: response.data.message });
      refreshDashboard();
    } catch (error) {
      setActionBanner({ type: "error", text: error.response?.data?.message || "Failed to update leave request" });
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div>
      <PremiumPageHero
        icon={<Building2 size={22} />}
        title={`Good morning, ${user?.name}`}
        subtitle="Detailed school performance, operations, and staff analytics at a glance."
        meta={[
          { label: "Plan", value: plan.toUpperCase(), icon: <Shield size={16} />, color: "#C17A00" },
          { label: "Analytics", value: "Live Overview", icon: <ChartColumnBig size={16} />, color: "#185FA5" },
        ]}
      />

      {actionBanner.text && (
        <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: actionBanner.type === "error" ? "#FCEBEB" : "#EAF3DE", color: actionBanner.type === "error" ? "#8B1E1E" : "#27500A", border: `1px solid ${actionBanner.type === "error" ? "#F5C2C2" : "#C0DD97"}` }}>
          {actionBanner.text}
        </div>
      )}

      <div style={{ marginBottom: 18, padding: "14px 16px", borderRadius: 14, background: "linear-gradient(135deg, #E6F1FB 0%, #F8FBFF 100%)", border: "1px solid #C9DFF7" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#185FA5", textTransform: "uppercase", letterSpacing: 0.4 }}>Student Capacity</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0C447C", marginTop: 4 }}>
              {totalStudents} students saved out of {maxStudents}
            </div>
            <div style={{ fontSize: 13, color: "#5D7895", marginTop: 4 }}>
              {maxStudents - totalStudents} student slots still available on your {plan} plan.
            </div>
          </div>
          <div style={{ minWidth: 220, flex: 1, maxWidth: 360 }}>
            <div style={{ height: 10, background: "#DCEBFA", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${studentUsagePct}%`, height: "100%", background: "linear-gradient(90deg, #185FA5 0%, #4E95DB 100%)", borderRadius: 999 }}></div>
            </div>
            <div style={{ fontSize: 12, color: "#5D7895", marginTop: 6, textAlign: "right" }}>{studentUsagePct}% of capacity used</div>
          </div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        {metrics.map((metric) => (
          <div className="metric-card" key={metric.label}>
            <div className="label">{metric.label}</div>
            <div className="value" style={{ color: metric.color }}>{metric.value}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>{metric.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Top Class Performance</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topClasses}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" />
              <XAxis dataKey="class" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avg_marks" fill="#185FA5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Fee Collection Status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={feeData} dataKey="value" innerRadius={48} outerRadius={78}>
                {feeData.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Monthly Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={analytics?.monthly_attendance_trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Line type="monotone" dataKey="attendance_pct" stroke="#1D9E75" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 24, marginBottom: 24 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ fontWeight: 600, margin: 0 }}>School Calendar</h3>
              <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>Track unit tests, meetings, celebrations, and holidays</div>
            </div>
            <span className="badge badge-blue">{events.length} events</span>
          </div>

          <form onSubmit={addEvent} style={{ display: "grid", gridTemplateColumns: "1.3fr 0.8fr 0.8fr auto", gap: 10, marginBottom: 18 }}>
            <input value={eventForm.title} placeholder="Unit Test - Science / Diwali Celebration" onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} />
            <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} />
            <select value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}>
              <option value="Exam">Exam</option>
              <option value="Meeting">Meeting</option>
              <option value="Event">Event</option>
              <option value="Holiday">Holiday</option>
            </select>
            <button className="btn-primary" type="submit">Add</button>
          </form>

          <div style={{ display: "grid", gap: 10 }}>
            {upcomingEvents.length === 0 ? (
              <div style={{ padding: 16, borderRadius: 12, background: "#f8f9fc", color: "#888", textAlign: "center" }}>No calendar items yet.</div>
            ) : (
              upcomingEvents.map((event) => {
                const style = eventTypeStyles[event.type] || eventTypeStyles.Event;
                return (
                  <div key={event.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, background: "#fff", border: "1px solid #eef1f7" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ minWidth: 82, padding: "8px 10px", borderRadius: 10, background: style.bg, color: style.color, textAlign: "center", fontWeight: 700, fontSize: 12 }}>
                        {new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{event.title}</div>
                        <div style={{ fontSize: 12, color: "#777", marginTop: 3 }}>{event.type}</div>
                      </div>
                    </div>
                    <button onClick={() => removeEvent(event.id)} style={{ border: "none", background: "#FCEBEB", color: "#791F1F", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>
                      Remove
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Teacher Attendance Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={teacherStatusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3C3489" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: 14 }}>What You Can Do Next</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                "Review teacher leave approvals from the attendance dashboard",
                "Track the highest and lowest performing classes in analytics",
                "Monitor fee follow-up pressure from the fee charts",
                "Keep the school calendar updated for teachers and parents",
              ].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#555" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: "#185FA5", display: "inline-block" }}></span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontWeight: 700 }}>Teacher Leave Requests</h3>
            <span className="badge badge-amber">{(data?.teacher_leave_requests || []).length}</span>
          </div>
          {!(data?.teacher_leave_requests || []).length ? (
            <p style={{ color: "#888", fontSize: 13 }}>No leave requests right now.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {data.teacher_leave_requests.map((item) => (
                <div key={item.id} style={{ padding: 14, borderRadius: 12, background: "#fff", border: "1px solid #eef1f7" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.teacher_name}</div>
                      <div style={{ fontSize: 12, color: "#185FA5", marginTop: 4 }}>{item.class_teacher_of}</div>
                      <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{`Requested leave on ${item.date}`}</div>
                      <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>{item.leave_reason}</div>
                    </div>
                    <span className={item.status === "leave_approved" ? "badge badge-green" : "badge badge-amber"}>
                      {item.status === "leave_approved" ? "Approved" : "Pending"}
                    </span>
                  </div>
                  {item.status === "leave_pending" && (
                    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                      <button className="btn-primary" type="button" onClick={() => updateLeaveRequest(item.id, "approve")}>Approve</button>
                      <button className="btn-outline" type="button" onClick={() => updateLeaveRequest(item.id, "reject")}>Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Subject-Level Performance</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={(analytics?.subject_stats || []).slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" />
              <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avg_marks" fill="#1D9E75" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
