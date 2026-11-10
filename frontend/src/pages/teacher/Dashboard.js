import React, { useEffect, useMemo, useState } from "react";
import API from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlarmClock,
  BellRing,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Crown,
  GraduationCap,
  LayoutDashboard,
  PlusCircle,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

const COLORS = ["#1D9E75", "#E24B4A", "#EF9F27"];
const DEFAULT_EVENTS = [
  { id: "evt-1", title: "Unit Test - Mathematics", date: "2026-04-03", type: "Exam" },
  { id: "evt-2", title: "PTA Meeting", date: "2026-04-08", type: "Meeting" },
  { id: "evt-3", title: "Diwali Celebration Planning", date: "2026-10-28", type: "Event" },
];

const dayLabel = () => new Date().toLocaleDateString("en-IN", { weekday: "long" });
const startMinutes = (value) => {
  const match = String(value || "").split("-")[0].trim().match(/^(\d{1,2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};
const todayIso = () => new Date().toLocaleDateString("en-CA");

export default function TeacherDashboard() {
  const { user } = useAuth();
  const isPremium = user?.plan === "premium";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState({ type: "", text: "" });
  const [reminderForm, setReminderForm] = useState({ title: "", date: "" });
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [events, setEvents] = useState([]);
  const [customReminders, setCustomReminders] = useState([]);
  const [completedReminders, setCompletedReminders] = useState([]);
  const [dismissedReminderIds, setDismissedReminderIds] = useState([]);
  const [showCompletedReminders, setShowCompletedReminders] = useState(false);
  const eventStorageKey = `principal-events-${user?.school_id || user?.id || "default"}`;
  const teacherReminderScope = `${user?.id || "default"}-${user?.plan || "basic"}`;
  const reminderStorageKey = `teacher-reminders-${teacherReminderScope}`;
  const reminderCompletedStorageKey = `teacher-reminders-completed-${teacherReminderScope}`;
  const reminderDismissedStorageKey = `teacher-reminders-dismissed-${teacherReminderScope}`;
  const legacyReminderStorageKey = `teacher-reminders-${user?.school_id || user?.id || "default"}`;
  const legacyReminderCompletedStorageKey = `teacher-reminders-completed-${user?.school_id || user?.id || "default"}`;
  const legacyReminderDismissedStorageKey = `teacher-reminders-dismissed-${user?.school_id || user?.id || "default"}`;

  const loadDashboard = () => {
    API.get("/teacher/dashboard").then((response) => {
      setData(response.data);
      setLoading(false);
    }).catch(() => setLoading(false));
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

  useEffect(() => {
    if (legacyReminderStorageKey !== reminderStorageKey) {
      localStorage.removeItem(legacyReminderStorageKey);
    }
    if (legacyReminderCompletedStorageKey !== reminderCompletedStorageKey) {
      localStorage.removeItem(legacyReminderCompletedStorageKey);
    }
    if (legacyReminderDismissedStorageKey !== reminderDismissedStorageKey) {
      localStorage.removeItem(legacyReminderDismissedStorageKey);
    }
  }, [
    legacyReminderCompletedStorageKey,
    legacyReminderDismissedStorageKey,
    legacyReminderStorageKey,
    reminderCompletedStorageKey,
    reminderDismissedStorageKey,
    reminderStorageKey,
  ]);

  useEffect(() => {
    const stored = localStorage.getItem(reminderStorageKey);
    if (stored) {
      try {
        setCustomReminders(JSON.parse(stored));
        return;
      } catch {
        localStorage.removeItem(reminderStorageKey);
      }
    }
    setCustomReminders([]);
  }, [reminderStorageKey]);

  useEffect(() => {
    const stored = localStorage.getItem(reminderCompletedStorageKey);
    if (stored) {
      try {
        setCompletedReminders(JSON.parse(stored));
        return;
      } catch {
        localStorage.removeItem(reminderCompletedStorageKey);
      }
    }
    setCompletedReminders([]);
  }, [reminderCompletedStorageKey]);

  useEffect(() => {
    const stored = localStorage.getItem(reminderDismissedStorageKey);
    if (stored) {
      try {
        setDismissedReminderIds(JSON.parse(stored));
        return;
      } catch {
        localStorage.removeItem(reminderDismissedStorageKey);
      }
    }
    setDismissedReminderIds([]);
  }, [reminderDismissedStorageKey]);

  const analytics = data?.analytics || {};
  const classTeacherOf = data?.class_teacher_of;
  const teacherAttendanceToday = data?.teacher_attendance_today;
  const teacherSchedule = data?.teacher_timetable?.schedule || [];
  const teacherOptions = data?.teacher_timetable?.options || [];
  const subjectAverages = (analytics.marks_by_subject || []).slice(0, 6);
  const strongestSubject = [...subjectAverages].sort((a, b) => (b.avg || 0) - (a.avg || 0))[0];
  const handledAssignments = Array.from(
    new Map(
      teacherOptions
        .filter((item) => item?.class_name && item?.subject)
        .map((item) => [
          `${item.class_name}-${item.section || ""}-${item.subject}`,
          {
            classLabel: `Class ${item.class_name}${item.section ? `-${item.section}` : ""}`,
            subject: item.subject,
          },
        ])
    ).values()
  );

  const handledClassesWithSubjects = useMemo(() => {
    const grouped = new Map();

    handledAssignments.forEach((assignment) => {
      if (!grouped.has(assignment.classLabel)) {
        grouped.set(assignment.classLabel, new Set());
      }
      if (assignment.subject) {
        grouped.get(assignment.classLabel).add(assignment.subject);
      }
    });

    return Array.from(grouped.entries()).map(([classLabel, subjects]) => ({
      classLabel,
      subjects: Array.from(subjects),
    }));
  }, [handledAssignments]);

  const nextPeriods = useMemo(() => {
    const today = teacherSchedule.find((item) => item.day === dayLabel());
    if (!today) return [];
    const now = new Date().getHours() * 60 + new Date().getMinutes();
    return (today.periods || [])
      .map((item) => ({ ...item, mins: startMinutes(item.time) }))
      .filter((item) => item.class_name && item.subject && item.mins !== null && item.mins >= now)
      .sort((a, b) => a.mins - b.mins)
      .slice(0, 3);
  }, [teacherSchedule]);

  const upcomingEvents = useMemo(() => (
    [...events]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 4)
  ), [events]);

  const reminderItems = useMemo(() => {
    const today = todayIso();
    const items = [];

    items.push({
      id: `attendance-daily-${today}`,
      title: "Mark attendance for today",
      subtitle: teacherAttendanceToday?.status === "present" ? "Your daily attendance is completed." : "Daily reminder for teacher attendance marking.",
      tone: teacherAttendanceToday?.status === "present" ? "done" : "pending",
    });

    events
      .filter((event) => event.type === "Exam" && event.date === today)
      .forEach((event) => {
        items.push({
          id: `exam-${event.id}`,
          title: `Marks reminder: ${event.title}`,
          subtitle: "Exam date is today. Upload marks as scheduled by the principal.",
          tone: "exam",
        });
      });

    customReminders
      .filter((item) => !item.date || item.date >= today)
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
      .forEach((item) => {
        items.push({
          id: item.id,
          title: item.title,
          subtitle: item.date ? `Custom reminder for ${item.date}` : "Custom reminder",
          tone: "custom",
        });
      });

    return items;
  }, [customReminders, events, teacherAttendanceToday?.status]);

  const completedReminderIds = useMemo(
    () => completedReminders.map((item) => item.id),
    [completedReminders]
  );

  const reminders = useMemo(
    () => reminderItems.filter((item) => !completedReminderIds.includes(item.id) && !dismissedReminderIds.includes(item.id)),
    [completedReminderIds, dismissedReminderIds, reminderItems]
  );

  const metrics = [
    {
      label: "My Students",
      value: classTeacherOf ? (data?.class_teacher_students || 0) : (data?.total_students || 0),
      color: "#0F6E56",
      note: classTeacherOf ? "Class teacher students" : "Handled sections",
      icon: <Users size={18} color="#0F6E56" />,
      bg: "linear-gradient(135deg, #F1FBF6 0%, #FFFFFF 100%)",
    },
    {
      label: "Present Today",
      value: data?.present_today || 0,
      color: "#185FA5",
      note: teacherAttendanceToday?.status === "present" ? "Attendance marked" : "Mark your status",
      icon: <CheckCircle2 size={18} color="#185FA5" />,
      bg: "linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)",
    },
    {
      label: "Attendance %",
      value: `${data?.attendance_pct || 0}%`,
      color: "#3B6D11",
      note: Number(data?.attendance_pct || 0) >= 90 ? "Excellent consistency" : "Keep improving",
      icon: <TrendingUp size={18} color="#3B6D11" />,
      bg: "linear-gradient(135deg, #F7FCEB 0%, #FFFFFF 100%)",
    },
    {
      label: "Avg Marks",
      value: data?.avg_marks || 0,
      color: "#854F0B",
      note: strongestSubject?.subject ? `Best in ${strongestSubject.subject}` : "Marks insight loading",
      icon: <BookOpen size={18} color="#854F0B" />,
      bg: "linear-gradient(135deg, #FFF7EB 0%, #FFFFFF 100%)",
    },
  ];

  const handleMarkPresent = async () => {
    setAttendanceSaving(true);
    setBanner({ type: "", text: "" });
    try {
      const response = await API.post("/teacher/present");
      setBanner({ type: "success", text: response.data.message });
      loadDashboard();
    } catch (error) {
      setBanner({ type: "error", text: error.response?.data?.message || "Failed to mark present" });
    } finally {
      setAttendanceSaving(false);
    }
  };

  const handleAddReminder = (e) => {
    e.preventDefault();
    if (!reminderForm.title.trim()) return;

    const nextReminders = [
      ...customReminders,
      {
        id: `rem-${Date.now()}`,
        title: reminderForm.title.trim(),
        date: reminderForm.date || "",
      },
    ];
    setCustomReminders(nextReminders);
    localStorage.setItem(reminderStorageKey, JSON.stringify(nextReminders));
    setReminderForm({ title: "", date: "" });
  };

  const handleDoneReminder = (reminderId) => {
    const reminder = reminderItems.find((item) => item.id === reminderId);
    if (!reminder || completedReminderIds.includes(reminderId)) {
      return;
    }

    const nextCompleted = [...completedReminders, reminder];
    setCompletedReminders(nextCompleted);
    localStorage.setItem(reminderCompletedStorageKey, JSON.stringify(nextCompleted));
  };

  const handleClearCompletedReminder = (reminderId) => {
    const nextCompleted = completedReminders.filter((item) => item.id !== reminderId);
    setCompletedReminders(nextCompleted);
    localStorage.setItem(reminderCompletedStorageKey, JSON.stringify(nextCompleted));

    const nextDismissed = dismissedReminderIds.includes(reminderId)
      ? dismissedReminderIds
      : [...dismissedReminderIds, reminderId];
    setDismissedReminderIds(nextDismissed);
    localStorage.setItem(reminderDismissedStorageKey, JSON.stringify(nextDismissed));

    if (String(reminderId).startsWith("rem-")) {
      const nextReminders = customReminders.filter((item) => item.id !== reminderId);
      setCustomReminders(nextReminders);
      localStorage.setItem(reminderStorageKey, JSON.stringify(nextReminders));
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div
        style={{
          marginBottom: 22,
          borderRadius: 24,
          padding: "28px",
          background: "radial-gradient(circle at top left, rgba(255,245,219,0.96) 0%, rgba(255,255,255,0.98) 36%, rgba(235,244,255,0.96) 100%)",
          border: "1px solid #E4EBF5",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 18, alignItems: "start" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 999, background: "#FFFFFFCC", border: "1px solid #E7EDF5", color: "#8A5409", fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
              <Crown size={14} />
              {isPremium ? "Premium Teacher Workspace" : "Teacher Workspace"}
            </div>
            <div className="page-title" style={{ marginBottom: 8 }}>{`Welcome, ${user?.name}`}</div>
            <div className="page-sub" style={{ maxWidth: 760, fontSize: 16, lineHeight: 1.65 }}>
              {isPremium
                ? "A premium teacher overview with faster actions, richer classroom intelligence, and a more polished daily workflow."
                : "Your daily classroom dashboard for attendance, marks, and teaching updates."}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18, alignItems: "stretch" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 16, background: "#FFFFFFCC", border: "1px solid #E7EDF5", minWidth: 150 }}>
                <LayoutDashboard size={17} color="#185FA5" />
                <div>
                  <div style={{ fontSize: 11, color: "#73839A", textTransform: "uppercase", letterSpacing: 0.7 }}>Today</div>
                  <div style={{ fontWeight: 700, color: "#122B4A" }}>{dayLabel()}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 16, background: "#FFFFFFCC", border: "1px solid #E7EDF5", minWidth: 220 }}>
                <Sparkles size={17} color="#7B52D6" />
                <div>
                  <div style={{ fontSize: 11, color: "#73839A", textTransform: "uppercase", letterSpacing: 0.7 }}>Class Role</div>
                  <div style={{ fontWeight: 700, color: "#122B4A" }}>{classTeacherOf ? `Class ${classTeacherOf.replace("-", " Section ")}` : "Subject Teacher"}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 16, background: "#FFFFFFCC", border: "1px solid #E7EDF5", flex: "1 1 420px", minWidth: 320 }}>
                <Users size={17} color="#0F6E56" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "#73839A", textTransform: "uppercase", letterSpacing: 0.7 }}>Handled Classes</div>
                  {handledClassesWithSubjects.length > 0 ? (
                    <div style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                      {handledClassesWithSubjects.map((assignment) => (
                        <div key={assignment.classLabel} style={{ minWidth: 88 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#122B4A" }}>{assignment.classLabel}</div>
                          <div style={{ fontSize: 10, color: "#6B7B91", marginTop: 1 }}>
                            {assignment.subjects.length > 0 ? assignment.subjects.join(", ") : "Class teacher"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginTop: 3, fontSize: 12, fontWeight: 700, color: "#122B4A" }}>
                      No classes mapped
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: "#FFFFFFD9", border: "1px solid #E8EEF6", borderRadius: 20, padding: 18, alignSelf: "start" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: "#E8F2FE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle2 size={20} color="#185FA5" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#122B4A" }}>Attendance Pulse</div>
                  <div style={{ fontSize: 12, color: "#66758C" }}>{teacherAttendanceToday?.status === "present" ? "Marked for today" : "Waiting for your check-in"}</div>
                </div>
              </div>
              <span className={`badge ${teacherAttendanceToday?.status === "present" ? "badge-green" : "badge-amber"}`}>
                {teacherAttendanceToday?.status === "present" ? "Present" : "Pending"}
              </span>
            </div>
            <button type="button" onClick={handleMarkPresent} disabled={attendanceSaving || teacherAttendanceToday?.status === "present"} className="btn-primary" style={{ width: "100%" }}>
              {teacherAttendanceToday?.status === "present" ? "Present Marked" : attendanceSaving ? "Saving..." : "Mark Present"}
            </button>
          </div>
        </div>
      </div>

      {banner.text && (
        <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: banner.type === "error" ? "#FCEBEB" : "#EAF3DE", color: banner.type === "error" ? "#8B1E1E" : "#27500A", border: `1px solid ${banner.type === "error" ? "#F5C2C2" : "#C0DD97"}` }}>
          {banner.text}
        </div>
      )}

      <div className="grid-4" style={{ marginBottom: 24 }}>
        {metrics.map((metric) => (
          <div key={metric.label} style={{ borderRadius: 20, padding: 20, border: "1px solid #E5ECF5", background: metric.bg, boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#76849B", textTransform: "uppercase", letterSpacing: 0.8 }}>{metric.label}</div>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: "#FFFFFFCC", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #EBF0F6" }}>
                {metric.icon}
              </div>
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: metric.color, lineHeight: 1, marginBottom: 8 }}>{metric.value}</div>
            <div style={{ fontSize: 13, color: "#66758C" }}>{metric.note}</div>
          </div>
        ))}
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card" style={{ borderRadius: 22, border: "1px solid #E6EDF6", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: "#EAF8F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={19} color="#1D9E75" />
            </div>
            <h3 style={{ fontWeight: 700, margin: 0 }}>Attendance Breakdown</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={[{ name: "Present", value: analytics.attendance_by_status?.present || 0 }, { name: "Absent", value: analytics.attendance_by_status?.absent || 0 }, { name: "Late", value: analytics.attendance_by_status?.late || 0 }]} dataKey="value" innerRadius={48} outerRadius={78}>
                {[0, 1, 2].map((index) => <Cell key={index} fill={COLORS[index]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ borderRadius: 22, border: "1px solid #E6EDF6", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: "#EDF5FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={19} color="#185FA5" />
            </div>
            <h3 style={{ fontWeight: 700, margin: 0 }}>Subject Averages</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={subjectAverages}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" />
              <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avg" fill="#185FA5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ borderRadius: 22, border: "1px solid #E6EDF6", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: "#EEF8F5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GraduationCap size={19} color="#0F6E56" />
            </div>
            <h3 style={{ fontWeight: 700, margin: 0 }}>Class Strength</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.class_strength || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#1D9E75" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card" style={{ borderRadius: 22, border: "1px solid #E6EDF6", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)", minHeight: 360 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: "#F1EEFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CalendarClock size={19} color="#6B4CE6" />
            </div>
            <h3 style={{ fontWeight: 700, margin: 0 }}>Next Teaching Periods</h3>
          </div>
          <div style={{ maxHeight: 270, overflowY: "auto", paddingRight: 4 }}>
            {nextPeriods.length === 0 ? (
              <p style={{ color: "#888", fontSize: 13 }}>No more periods scheduled today.</p>
            ) : nextPeriods.map((period) => (
              <div key={`${period.period}-${period.time}`} style={{ padding: "10px 0", borderBottom: "1px solid #f0f2f7" }}>
                <div style={{ fontWeight: 700 }}>{`Class ${period.class_name}${period.section ? `-${period.section}` : ""} • ${period.subject}`}</div>
                <div style={{ fontSize: 12, color: "#185FA5" }}>{period.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 100%)", border: "1px solid #E4EBF5", borderRadius: 20, padding: "18px 20px", boxShadow: "0 16px 32px rgba(15, 23, 42, 0.04)", minHeight: 360 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: "#FFF4E8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlarmClock size={20} color="#A15A07" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "#122B4A" }}>Reminders</div>
              <div style={{ fontSize: 12, color: "#6A7890" }}>Daily attendance, scheduled exam marks, and your own reminders.</div>
            </div>
          </div>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setShowCompletedReminders((current) => !current)}
              style={{ padding: "7px 12px", whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {`Completed ${completedReminders.length ? `(${completedReminders.length})` : ""}`}
            </button>
          </div>
          <div style={{ display: "grid", gap: 10, marginBottom: 14, maxHeight: showCompletedReminders ? 144 : 220, overflowY: "auto", paddingRight: 4 }}>
            {reminders.length === 0 ? (
              <p style={{ color: "#888", fontSize: 13 }}>No reminders right now.</p>
            ) : reminders.map((reminder) => (
              <div key={reminder.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", justifyContent: "space-between", padding: 12, borderRadius: 14, background: "#fff", border: "1px solid #E8EEF6" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 12, background: reminder.tone === "done" ? "#EAF8F2" : reminder.tone === "exam" ? "#FFF4E8" : reminder.tone === "custom" ? "#EEF2FF" : "#FFF8E8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {reminder.tone === "done" ? <CheckCircle2 size={16} color="#1D9E75" /> : reminder.tone === "exam" ? <BookOpen size={16} color="#A15A07" /> : reminder.tone === "custom" ? <BellRing size={16} color="#6B4CE6" /> : <CircleAlert size={16} color="#C2410C" />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#122B4A", fontSize: 14 }}>{reminder.title}</div>
                    <div style={{ fontSize: 12, color: "#6A7890", marginTop: 4 }}>{reminder.subtitle}</div>
                  </div>
                </div>
                <button type="button" className="btn-outline" onClick={() => handleDoneReminder(reminder.id)} style={{ padding: "7px 12px", whiteSpace: "nowrap", flexShrink: 0 }}>
                  Done
                </button>
              </div>
            ))}
          </div>
          {showCompletedReminders && (
            <div style={{ marginBottom: 14, paddingTop: 12, borderTop: "1px solid #E8EEF6" }}>
              <div style={{ fontWeight: 700, color: "#122B4A", marginBottom: 10 }}>Completed Tasks</div>
              <div style={{ display: "grid", gap: 10, maxHeight: 120, overflowY: "auto", paddingRight: 4 }}>
                {completedReminders.length === 0 ? (
                  <p style={{ color: "#888", fontSize: 13, margin: 0 }}>No completed tasks yet.</p>
                ) : completedReminders.map((reminder) => (
                  <div key={`completed-${reminder.id}`} style={{ display: "flex", gap: 10, alignItems: "flex-start", justifyContent: "space-between", padding: 12, borderRadius: 14, background: "#F8FBFF", border: "1px solid #E8EEF6" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", minWidth: 0 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 12, background: "#EAF8F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <CheckCircle2 size={16} color="#1D9E75" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#122B4A", fontSize: 14 }}>{reminder.title}</div>
                        <div style={{ fontSize: 12, color: "#6A7890", marginTop: 4 }}>{reminder.subtitle}</div>
                      </div>
                    </div>
                    <button type="button" className="btn-outline" onClick={() => handleClearCompletedReminder(reminder.id)} style={{ padding: "7px 12px", whiteSpace: "nowrap", flexShrink: 0 }}>
                      Clear
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <form onSubmit={handleAddReminder} style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr auto", gap: 10, alignItems: "center" }}>
            <input type="text" placeholder="Add reminder" value={reminderForm.title} onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })} />
            <input type="date" value={reminderForm.date} onChange={(e) => setReminderForm({ ...reminderForm, date: e.target.value })} />
            <button type="submit" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              <PlusCircle size={16} />
              Add
            </button>
          </form>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card" style={{ borderRadius: 22, border: "1px solid #E6EDF6", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)", minHeight: 360 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: "#EDF5FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CalendarDays size={19} color="#185FA5" />
            </div>
            <h3 style={{ fontWeight: 700, margin: 0 }}>School Calendar</h3>
          </div>
          <div style={{ maxHeight: 270, overflowY: "auto", paddingRight: 4 }}>
            {upcomingEvents.length === 0 ? (
              <p style={{ color: "#888", fontSize: 13 }}>No school events available.</p>
            ) : (
              upcomingEvents.map((event) => (
                <div key={event.id} style={{ padding: "12px 0", borderBottom: "1px solid #f0f2f7" }}>
                  <div style={{ fontWeight: 600 }}>{event.title}</div>
                  <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>{new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card" style={{ borderRadius: 22, border: "1px solid #E6EDF6", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)", minHeight: 360 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: "#EEF8F5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={19} color="#0F6E56" />
            </div>
            <h3 style={{ fontWeight: 700, margin: 0 }}>Today&apos;s Snapshot</h3>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ padding: "12px 14px", borderRadius: 14, background: "#F8FBFF", border: "1px solid #E8EEF6" }}>
              <div style={{ fontSize: 12, color: "#6A7890", marginBottom: 4 }}>Pending reminders</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#122B4A" }}>{reminders.length}</div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 14, background: "#F8FBFF", border: "1px solid #E8EEF6" }}>
              <div style={{ fontSize: 12, color: "#6A7890", marginBottom: 4 }}>Upcoming periods today</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#122B4A" }}>{nextPeriods.length}</div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 14, background: "#F8FBFF", border: "1px solid #E8EEF6" }}>
              <div style={{ fontSize: 12, color: "#6A7890", marginBottom: 4 }}>Next event</div>
              {upcomingEvents[0] ? (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#122B4A" }}>{upcomingEvents[0].title}</div>
                  <div style={{ fontSize: 12, color: "#66758C", marginTop: 4 }}>
                    {new Date(upcomingEvents[0].date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: "#66758C" }}>No events scheduled</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
