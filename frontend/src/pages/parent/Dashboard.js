import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { canUseFeature } from "../../lib/planFeatures";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

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

const ATTENDANCE_COLORS = ["#1D9E75", "#E24B4A", "#EF9F27"];

export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasChatRoom = canUseFeature(user?.plan, "chatRoom");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const eventStorageKey = `principal-events-${user?.school_id || user?.id || "default"}`;

  const loadDashboard = () => {
    API.get("/parent/dashboard")
      .then((response) => {
        setData(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load data");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDashboard();
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

  const children = data?.children || (data?.child ? [data.child] : []);
  const attendance = data?.attendance || {};
  const marksData = data?.marks || {};
  const attendancePieData = [
    { name: "Present", value: attendance.present || 0 },
    { name: "Absent", value: attendance.absent || 0 },
    { name: "Late", value: attendance.late || 0 },
  ];

  const marksTrendData = (marksData.records || []).slice(-6).map((record, index) => ({
    name: record.subject ? `${record.subject.slice(0, 8)}-${index + 1}` : `Test ${index + 1}`,
    marks: record.marks || 0,
  }));

  if (loading) return <div className="loading">Loading...</div>;
  if (error) {
    return (
      <div>
        <div className="page-title">Parent Dashboard</div>
        <div className="card" style={{ padding: 30, textAlign: "center", color: "#888" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>!</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No child linked to your account</div>
          <div style={{ fontSize: 13 }}>Please contact the principal to link your child to this account.</div>
          <div style={{ marginTop: 12, fontSize: 12, color: "#aaa" }}>Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">Welcome, {user?.name}</div>
      <div className="page-sub">Your overview is kept simple again, and the class timetable now has its own sidebar page.</div>

      {children.length > 0 && (
        <div style={{ background: "#E6F1FB", border: "1px solid #B5D4F4", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#0C447C", marginBottom: 8 }}>
            {children.length > 1 ? "Your Children:" : "Your Child:"}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {children.map((currentChild) => (
              <div key={currentChild.id} style={{ background: "#fff", borderRadius: 8, padding: "8px 14px", border: "1px solid #B5D4F4" }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#0C447C" }}>{currentChild.name}</div>
                <div style={{ fontSize: 11, color: "#888" }}>Class {currentChild.class}{currentChild.section ? ` - Sec ${currentChild.section}` : ""} | Roll {currentChild.roll_no || "-"}</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  <span style={{ background: currentChild.fee_status === "paid" ? "#EAF3DE" : currentChild.fee_status === "partial" ? "#FAEEDA" : "#FCEBEB", color: currentChild.fee_status === "paid" ? "#27500A" : currentChild.fee_status === "partial" ? "#633806" : "#791F1F", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                    Fee: {currentChild.fee_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: "Attendance %", value: `${attendance.pct || 0}%`, color: "#0F6E56" },
          { label: "Present / Working", value: `${attendance.present || 0}/${attendance.working_days || 0}`, color: "#185FA5" },
          { label: "Days Absent", value: attendance.absent || 0, color: "#A32D2D" },
          { label: "Subjects", value: (marksData.subject_summary || []).length, color: "#854F0B" },
        ].map((metric) => (
          <div key={metric.label} className="metric-card">
            <div className="label">{metric.label}</div>
            <div className="value" style={{ color: metric.color }}>{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 14 }}>Subject Performance</h3>
          {(marksData.subject_summary || []).length === 0 ? (
            <p style={{ color: "#888", fontSize: 13 }}>No marks uploaded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={marksData.subject_summary}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="avg" fill="#185FA5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 14 }}>Attendance Breakdown</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={attendancePieData} dataKey="value" innerRadius={48} outerRadius={78}>
                {attendancePieData.map((_, index) => <Cell key={index} fill={ATTENDANCE_COLORS[index % ATTENDANCE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 14 }}>Recent Marks Trend</h3>
          {marksTrendData.length === 0 ? (
            <p style={{ color: "#888", fontSize: 13 }}>No marks history yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={marksTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="marks" stroke="#1D9E75" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 style={{ fontWeight: 600, margin: 0 }}>School Calendar</h3>
              <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>Upcoming exams, meetings, celebrations, and holidays</div>
            </div>
            <span className="badge badge-blue">{events.length} events</span>
          </div>
          {events.length === 0 ? (
            <p style={{ color: "#888", fontSize: 13 }}>No school calendar items yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {events.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5).map((event) => {
                const style = eventTypeStyles[event.type] || eventTypeStyles.Event;
                return (
                  <div key={event.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, border: "1px solid #eef1f7", background: "#fff" }}>
                    <div style={{ minWidth: 82, padding: "8px 10px", borderRadius: 10, background: style.bg, color: style.color, textAlign: "center", fontWeight: 700, fontSize: 12 }}>
                      {new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{event.title}</div>
                      <div style={{ fontSize: 12, color: "#777", marginTop: 3 }}>{event.type}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 14 }}>Children Details Access</h3>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 10 }}>
              Check admission details, blood group, address, parent contact information, and assigned class teacher.
            </div>
            <button type="button" className="btn-primary" onClick={() => navigate("/dashboard/parent/student-details")}>Open Children Details</button>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 14 }}>Class Timetable</h3>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 10 }}>
              View the weekly timetable separately in a clean tabular layout designed by the class teacher.
            </div>
            <button type="button" className="btn-primary" onClick={() => navigate("/dashboard/parent/timetable")}>Open Timetable</button>
          </div>

          {hasChatRoom && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontWeight: 600, marginBottom: 14 }}>Parent-Teacher Chat Room</h3>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 10 }}>
                Send live messages to your child&apos;s class teacher right inside the portal.
              </div>
              <button type="button" className="btn-primary" onClick={() => navigate("/dashboard/parent/chat")}>Open Chat Room</button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
