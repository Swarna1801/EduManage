import React, { useEffect, useMemo, useState } from "react";
import API from "../../utils/api";
import PremiumLock from "../../components/PremiumLock";
import { useAuth } from "../../context/AuthContext";
import { canUseFeature } from "../../lib/planFeatures";

const CLASSES = ["9", "10", "11", "12"];
const SECTIONS = ["A", "B", "C", "D"];

const getDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const getMonthKey = (value) => {
  const dateKey = getDateKey(value);
  return dateKey ? dateKey.slice(0, 7) : "";
};

const formatMonthLabel = (value) => {
  const dateKey = getDateKey(value);
  if (!dateKey) return "";
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const formatFullDateLabel = (value) => {
  const dateKey = getDateKey(value);
  if (!dateKey) return "";
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function PrincipalAttendance() {
  const { user } = useAuth();
  const plan = user?.plan || "basic";
  const hasAttendanceInsights = canUseFeature(plan, "attendanceInsights");

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [detailClass, setDetailClass] = useState(null);
  const [detailSortFilter, setDetailSortFilter] = useState("roll_asc");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [notifying, setNotifying] = useState(null);
  const [teacherAttendance, setTeacherAttendance] = useState([]);
  const [teacherAttendanceHistory, setTeacherAttendanceHistory] = useState([]);
  const [teacherLeaveRequests, setTeacherLeaveRequests] = useState([]);
  const [showTeacherAttendance, setShowTeacherAttendance] = useState(false);
  const [teacherActionMsg, setTeacherActionMsg] = useState("");
  const [teacherStatusFilter, setTeacherStatusFilter] = useState("all");
  const [teacherSortFilter, setTeacherSortFilter] = useState("name_asc");
  const [selectedTeacherHistoryDate, setSelectedTeacherHistoryDate] = useState("");
  const [selectedTeacherLeaveDate, setSelectedTeacherLeaveDate] = useState("");

  useEffect(() => {
    Promise.all([
      API.get("/principal/students"),
      API.get("/principal/attendance-overview"),
      API.get("/principal/dashboard"),
    ]).then(([studentResponse, attendanceResponse, dashboardResponse]) => {
      setStudents(studentResponse.data);
      setAttendance(attendanceResponse.data);
      setTeacherAttendance(dashboardResponse.data?.teachers_attendance || []);
      setTeacherAttendanceHistory(dashboardResponse.data?.teacher_attendance_history || []);
      setTeacherLeaveRequests(dashboardResponse.data?.teacher_leave_requests || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const refreshTeacherAttendance = async () => {
    const dashboardResponse = await API.get("/principal/dashboard");
    setTeacherAttendance(dashboardResponse.data?.teachers_attendance || []);
    setTeacherAttendanceHistory(dashboardResponse.data?.teacher_attendance_history || []);
    setTeacherLeaveRequests(dashboardResponse.data?.teacher_leave_requests || []);
  };

  const getClassStats = () => {
    const groups = {};
    students.forEach((student) => {
      const key = student.class + "-" + (student.section || "?");
      if (!groups[key]) groups[key] = { class: student.class, section: student.section, students: [], total_att: 0, present: 0, working_dates: new Set() };
      groups[key].students.push(student);
    });
    attendance.forEach((record) => {
      const student = students.find((item) => item.id === record.student_id);
      if (!student) return;
      const key = student.class + "-" + (student.section || "?");
      if (groups[key]) {
        groups[key].total_att += 1;
        if (record.status === "present") groups[key].present += 1;
        groups[key].working_dates.add(record.date);
      }
    });
    return Object.values(groups)
      .map((group) => ({ ...group, working_days: group.working_dates.size }))
      .sort((a, b) => a.class.localeCompare(b.class) || (a.section || "").localeCompare(b.section || ""));
  };

  const getWeekStats = (label) => {
    const today = new Date();
    const isThisWeek = (dateStr) => {
      const date = new Date(dateStr);
      const day = today.getDay() || 7;
      const monday = new Date(today);
      monday.setDate(today.getDate() - day + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      if (label === "this") return date >= monday && date <= sunday;
      const lastMonday = new Date(monday);
      lastMonday.setDate(monday.getDate() - 7);
      const lastSunday = new Date(monday);
      lastSunday.setDate(monday.getDate() - 1);
      return date >= lastMonday && date <= lastSunday;
    };
    const filtered = attendance.filter((record) => isThisWeek(record.date));
    const present = filtered.filter((record) => record.status === "present").length;
    return { total: filtered.length, present, pct: filtered.length ? Math.round((present / filtered.length) * 100) : 0 };
  };

  const getDetailStats = (cls) => {
    const classStudents = students.filter((student) => student.class === cls.class && student.section === cls.section);
    const studentIds = classStudents.map((student) => student.id);
    const classAttendance = attendance.filter((record) => studentIds.includes(record.student_id));
    const classWorkingDays = new Set(classAttendance.map((record) => record.date)).size;

    return classStudents.map((student) => {
      const studentAttendance = classAttendance
        .filter((record) => record.student_id === student.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      const present = studentAttendance.filter((record) => record.status === "present").length;
      const absent = studentAttendance.filter((record) => record.status === "absent").length;
      const late = studentAttendance.filter((record) => record.status === "late").length;
      const pct = classWorkingDays ? Math.round((present / classWorkingDays) * 100) : 0;

      let lateStreak = 0;
      for (const record of studentAttendance) {
        if (record.status === "late") lateStreak += 1;
        else break;
      }

      const riskReason = pct < 75 ? "low" : lateStreak >= 2 ? "late" : null;
      return {
        ...student,
        total: studentAttendance.length,
        workingDays: classWorkingDays,
        present,
        absent,
        late,
        pct,
        lateStreak,
        riskReason,
      };
    });
  };

  const notifyParent = async (student) => {
    setNotifying(student.id);
    setMsg("");
    setError("");
    try {
      await API.post("/principal/notify-attendance", {
        student_id: student.id,
        student_name: student.name,
        reason: student.riskReason,
      });
      setMsg("Attendance notification sent to parent of " + student.name);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send attendance notification");
    } finally {
      setNotifying(null);
    }
  };

  const updateLeaveRequest = async (id, action) => {
    setTeacherActionMsg("");
    try {
      const response = await API.post(`/principal/teacher-leave/${id}/${action}`);
      setTeacherActionMsg(response.data.message);
      await refreshTeacherAttendance();
    } catch (err) {
      setTeacherActionMsg(err.response?.data?.message || "Failed to update leave request");
    }
  };

  const thisWeek = getWeekStats("this");
  const lastWeek = getWeekStats("last");
  const classStats = getClassStats();
  const filteredStats = classStats.filter((cls) => {
    if (classFilter && cls.class !== classFilter) return false;
    if (sectionFilter && cls.section !== sectionFilter) return false;
    return true;
  });

  const detailStats = useMemo(() => (detailClass ? getDetailStats(detailClass) : []), [detailClass, students, attendance]);
  const sortedDetailStats = useMemo(() => {
    const parseRoll = (rollNo) => {
      const value = String(rollNo || "").trim();
      if (!value) return Number.MAX_SAFE_INTEGER;
      const match = value.match(/\d+/);
      return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
    };

    return [...detailStats].sort((a, b) => {
      if (detailSortFilter === "rank_asc") {
        if (b.pct !== a.pct) return b.pct - a.pct;
        if (b.present !== a.present) return b.present - a.present;
        return (a.name || "").localeCompare(b.name || "");
      }

      if (detailSortFilter === "rank_desc") {
        if (a.pct !== b.pct) return a.pct - b.pct;
        if (a.present !== b.present) return a.present - b.present;
        return (a.name || "").localeCompare(b.name || "");
      }

      if (detailSortFilter === "name_asc") {
        return (a.name || "").localeCompare(b.name || "");
      }

      const rollCompare = parseRoll(a.roll_no) - parseRoll(b.roll_no);
      if (rollCompare !== 0) return rollCompare;
      return String(a.roll_no || "").localeCompare(String(b.roll_no || "")) || (a.name || "").localeCompare(b.name || "");
    });
  }, [detailStats, detailSortFilter]);
  const atRiskStudents = sortedDetailStats.filter((student) => student.riskReason);
  const todayDate = new Date().toISOString().split("T")[0];

  const normalizedTodayTeacherAttendance = useMemo(
    () => teacherAttendance.map((item) => ({ ...item, id: item.id || `today-${item.teacher_id}`, date: todayDate })),
    [teacherAttendance, todayDate]
  );

  const teacherRoster = useMemo(
    () => normalizedTodayTeacherAttendance.map((item) => ({
      teacher_id: item.teacher_id,
      teacher_name: item.teacher_name,
      class_teacher_of: item.class_teacher_of,
    })),
    [normalizedTodayTeacherAttendance]
  );

  const teacherAttendanceByDate = useMemo(() => {
    const grouped = {};
    [...teacherAttendanceHistory, ...normalizedTodayTeacherAttendance].forEach((item) => {
      if (!item?.date || !item?.teacher_id) return;
      if (!grouped[item.date]) grouped[item.date] = {};
      grouped[item.date][item.teacher_id] = item;
    });
    return grouped;
  }, [teacherAttendanceHistory, normalizedTodayTeacherAttendance]);

  const teacherAttendanceDates = useMemo(
    () => Object.keys(teacherAttendanceByDate).sort((a, b) => new Date(b) - new Date(a)),
    [teacherAttendanceByDate]
  );

  const teacherLeaveRequestDates = useMemo(
    () => [...new Set(teacherLeaveRequests.map((item) => item?.date).filter(Boolean))].sort((a, b) => new Date(b) - new Date(a)),
    [teacherLeaveRequests]
  );

  useEffect(() => {
    if (!teacherLeaveRequestDates.length) {
      setSelectedTeacherLeaveDate("");
      return;
    }

    const nextSelectedDate = selectedTeacherLeaveDate
      ? (teacherLeaveRequestDates.includes(selectedTeacherLeaveDate) ? selectedTeacherLeaveDate : teacherLeaveRequestDates[0])
      : teacherLeaveRequestDates[0];

    if (nextSelectedDate !== selectedTeacherLeaveDate) {
      setSelectedTeacherLeaveDate(nextSelectedDate);
    }
  }, [teacherLeaveRequestDates, selectedTeacherLeaveDate]);

  useEffect(() => {
    if (!teacherAttendanceDates.length) {
      setSelectedTeacherHistoryDate("");
      return;
    }

    const nextSelectedDate = teacherAttendanceDates.includes(selectedTeacherHistoryDate)
      ? selectedTeacherHistoryDate
      : teacherAttendanceDates[0];

    if (nextSelectedDate !== selectedTeacherHistoryDate) {
      setSelectedTeacherHistoryDate(nextSelectedDate);
    }
  }, [teacherAttendanceDates, selectedTeacherHistoryDate]);

  const selectedTeacherAttendanceItems = useMemo(() => {
    if (!selectedTeacherHistoryDate) return [];

    const attendanceForDate = teacherAttendanceByDate[selectedTeacherHistoryDate] || {};

    return teacherRoster.map((teacher) => {
      const existingRecord = attendanceForDate[teacher.teacher_id];
      if (existingRecord) return existingRecord;
      return {
        id: `not-marked-${teacher.teacher_id}-${selectedTeacherHistoryDate}`,
        teacher_id: teacher.teacher_id,
        teacher_name: teacher.teacher_name,
        class_teacher_of: teacher.class_teacher_of,
        date: selectedTeacherHistoryDate,
        status: "not_marked",
        marked_at: null,
        leave_reason: null,
        approved_at: null,
      };
    });
  }, [selectedTeacherHistoryDate, teacherAttendanceByDate, teacherRoster]);

  const filteredTeacherAttendance = useMemo(() => {
    const statusRank = {
      present: 1,
      leave_approved: 2,
      leave_pending: 3,
      not_marked: 4,
    };

    const filteredItems = selectedTeacherAttendanceItems.filter((item) => {
      if (teacherStatusFilter === "all") return true;
      if (teacherStatusFilter === "marked") return item.status !== "not_marked";
      return item.status === teacherStatusFilter;
    });

    return [...filteredItems].sort((a, b) => {
      if (teacherSortFilter === "name_desc") {
        return (b.teacher_name || "").localeCompare(a.teacher_name || "");
      }

      if (teacherSortFilter === "class_asc") {
        const classCompare = (a.class_teacher_of || "").localeCompare(b.class_teacher_of || "");
        if (classCompare !== 0) return classCompare;
        return (a.teacher_name || "").localeCompare(b.teacher_name || "");
      }

      if (teacherSortFilter === "status_asc") {
        const rankCompare = (statusRank[a.status] || 99) - (statusRank[b.status] || 99);
        if (rankCompare !== 0) return rankCompare;
        return (a.teacher_name || "").localeCompare(b.teacher_name || "");
      }

      return (a.teacher_name || "").localeCompare(b.teacher_name || "");
    });
  }, [selectedTeacherAttendanceItems, teacherStatusFilter, teacherSortFilter]);

  const filteredTeacherLeaveRequests = useMemo(() => {
    if (!selectedTeacherLeaveDate) return teacherLeaveRequests;
    return teacherLeaveRequests.filter((item) => getDateKey(item.date) === selectedTeacherLeaveDate);
  }, [teacherLeaveRequests, selectedTeacherLeaveDate]);

  const getTeacherStatusLabel = (status) => {
    if (status === "present") return "Present";
    if (status === "leave_approved") return "On Leave";
    if (status === "leave_pending") return "Leave Pending";
    return "Not Marked";
  };

  const getTeacherStatusBadgeClass = (status) => {
    if (status === "present") return "badge-green";
    if (status === "leave_approved") return "badge-blue";
    if (status === "leave_pending") return "badge-amber";
    return "badge-red";
  };

  const formatTeacherAttendanceNote = (item, includeDate = false) => {
    const dateText = includeDate ? ` on ${item.date}` : "";
    if (item.status === "present" && item.marked_at) {
      return `Present${dateText} at ${new Date(item.marked_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (item.status === "leave_approved") {
      return `Approved leave${dateText}${item.leave_reason ? ` - ${item.leave_reason}` : ""}`;
    }
    if (item.status === "leave_pending") {
      return `Leave pending${dateText}${item.leave_reason ? ` - ${item.leave_reason}` : ""}`;
    }
    return includeDate ? `Not marked on ${item.date}` : "Not marked today";
  };

  const teacherCalendarSummary = useMemo(() => {
    return selectedTeacherAttendanceItems.reduce((summary, item) => {
      summary.total += 1;
      summary[item.status] = (summary[item.status] || 0) + 1;
      return summary;
    }, { total: 0, present: 0, leave_pending: 0, leave_approved: 0, not_marked: 0 });
  }, [selectedTeacherAttendanceItems]);

  if (loading) return <div className="loading">Loading...</div>;

  if (detailClass) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => { setDetailClass(null); setMsg(""); setError(""); }} className="btn-outline">Back</button>
          <div>
            <div className="page-title" style={{ margin: 0 }}>Class {detailClass.class} - Section {detailClass.section} Attendance</div>
            <div className="page-sub" style={{ margin: 0 }}>Detailed student-wise attendance</div>
          </div>
        </div>

        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {hasAttendanceInsights ? (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700 }}>Premium Attendance Watchlist</h3>
                <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Students with low attendance or repeated late arrivals</div>
              </div>
              <span className="badge badge-amber">Premium Insight</span>
            </div>

            <div className="grid-3" style={{ marginBottom: 16 }}>
              <div className="metric-card">
                <div className="label">At Risk Students</div>
                <div className="value" style={{ color: "#A32D2D" }}>{atRiskStudents.length}</div>
              </div>
              <div className="metric-card">
                <div className="label">Low Attendance</div>
                <div className="value" style={{ color: "#EF9F27" }}>{atRiskStudents.filter((student) => student.riskReason === "low").length}</div>
              </div>
              <div className="metric-card">
                <div className="label">Late Streak Alerts</div>
                <div className="value" style={{ color: "#185FA5" }}>{atRiskStudents.filter((student) => student.riskReason === "late").length}</div>
              </div>
            </div>

            {atRiskStudents.length === 0 ? (
              <div style={{ padding: 14, borderRadius: 10, background: "#EAF3DE", color: "#27500A", fontSize: 13 }}>
                No at-risk students detected in this class right now.
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Name</th><th>Roll No</th><th>Attendance %</th><th>Late Count</th><th>Alert Type</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {atRiskStudents.map((student) => (
                      <tr key={student.id}>
                        <td><strong>{student.name}</strong></td>
                        <td>{student.roll_no || "-"}</td>
                        <td>{student.pct}%</td>
                        <td>{student.late}</td>
                        <td>
                          <span className={student.riskReason === "low" ? "badge badge-red" : "badge badge-amber"}>
                            {student.riskReason === "low" ? "Low Attendance" : `Late Streak (${student.lateStreak})`}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => notifyParent(student)}
                            disabled={notifying === student.id}
                            style={{ padding: "6px 12px", fontSize: 12, borderRadius: 6, border: "none", background: "#E6F1FB", color: "#185FA5", cursor: "pointer", fontWeight: 600, opacity: notifying === student.id ? 0.7 : 1 }}
                          >
                            {notifying === student.id ? "Sending..." : "Notify Parent"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <PremiumLock feature="Attendance watchlist and parent alerts for low attendance / repeated late arrivals" />
          </div>
        )}

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 700 }}>Student Attendance Details</h3>
              <div style={{ fontSize: 12, color: "#66758C", marginTop: 4 }}>
                Sort this class list by roll number or attendance rank.
              </div>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 220 }}>
              <select value={detailSortFilter} onChange={(e) => setDetailSortFilter(e.target.value)}>
                <option value="roll_asc">Roll Number Wise</option>
                <option value="rank_asc">Attendance Rank High-Low</option>
                <option value="rank_desc">Attendance Rank Low-High</option>
                <option value="name_asc">Student Name A-Z</option>
              </select>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Name</th><th>Roll No</th><th>Present</th><th>Absent</th><th>Late</th><th>Working Days</th><th>Attendance %</th><th>Status</th></tr>
              </thead>
              <tbody>
                {sortedDetailStats.map((student, index) => (
                  <tr key={student.id}>
                    <td>{index + 1}</td>
                    <td><strong>{student.name}</strong></td>
                    <td>{student.roll_no || "-"}</td>
                    <td style={{ color: "#0F6E56", fontWeight: 500 }}>{student.present}</td>
                    <td style={{ color: "#A32D2D", fontWeight: 500 }}>{student.absent}</td>
                    <td style={{ color: "#854F0B", fontWeight: 500 }}>{student.late}</td>
                    <td>{`${student.present}/${student.workingDays}`}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#f0f2f7" }}>
                          <div style={{ width: student.pct + "%", height: "100%", borderRadius: 3, background: student.pct >= 75 ? "#1D9E75" : student.pct >= 50 ? "#EF9F27" : "#E24B4A" }}></div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: student.pct >= 75 ? "#0F6E56" : student.pct >= 50 ? "#854F0B" : "#A32D2D", minWidth: 35 }}>{student.pct}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: student.pct >= 75 ? "#EAF3DE" : student.pct >= 50 ? "#FAEEDA" : "#FCEBEB", color: student.pct >= 75 ? "#27500A" : student.pct >= 50 ? "#633806" : "#791F1F" }}>
                        {student.pct >= 75 ? "Good" : student.pct >= 50 ? "Average" : "Low"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">Attendance Overview</div>
      <div className="page-sub">School-wide attendance analytics</div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: "This Week Attendance", value: thisWeek.pct + "%", sub: `${thisWeek.present} present out of ${thisWeek.total} marked entries`, color: "#0F6E56" },
          { label: "Last Week Attendance", value: lastWeek.pct + "%", sub: `${lastWeek.present} present out of ${lastWeek.total} marked entries`, color: "#185FA5" },
          { label: "Total Students", value: students.length, sub: "enrolled", color: "#854F0B" },
          { label: "Classes Tracked", value: classStats.length, sub: "class sections", color: "#5B2D8E" },
        ].map((metric, index) => (
          <div key={index} className="metric-card">
            <div className="label">{metric.label}</div>
            <div className="value" style={{ color: metric.color }}>{metric.value}</div>
            <div style={{ fontSize: 11, color: "#888" }}>{metric.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          type="button"
          className={showTeacherAttendance ? "btn-outline" : "btn-primary"}
          onClick={() => setShowTeacherAttendance(false)}
        >
          Student Attendance
        </button>
        <button
          type="button"
          className={showTeacherAttendance ? "btn-primary" : "btn-outline"}
          onClick={() => setShowTeacherAttendance(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, whiteSpace: "nowrap" }}
        >
          Teacher Attendance & Leave Request
          {teacherLeaveRequests.length > 0 && (
            <span className="badge badge-amber">{teacherLeaveRequests.length}</span>
          )}
        </button>
      </div>

      {showTeacherAttendance ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 24 }}>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700 }}>Teacher Leave Requests</h3>
                {selectedTeacherLeaveDate && (
                  <div style={{ fontSize: 12, color: "#66758C", marginTop: 4 }}>
                    Showing leave requests for {formatFullDateLabel(selectedTeacherLeaveDate)}
                  </div>
                )}
              </div>
              <span className="badge badge-amber">{filteredTeacherLeaveRequests.length}</span>
            </div>
            {teacherActionMsg && <div className="alert alert-success">{teacherActionMsg}</div>}
            <div style={{ marginBottom: 18, border: "1px solid #eef1f7", borderRadius: 18, padding: 14, background: "linear-gradient(180deg, #FCFDFF 0%, #F6F9FE 100%)" }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div className="form-group" style={{ margin: 0, minWidth: 220 }}>
                  <input
                    type="date"
                    value={selectedTeacherLeaveDate}
                    onChange={(e) => setSelectedTeacherLeaveDate(e.target.value)}
                    min={teacherLeaveRequestDates[teacherLeaveRequestDates.length - 1] || undefined}
                    max={teacherLeaveRequestDates[0] || undefined}
                  />
                </div>
                {teacherLeaveRequestDates.length > 0 && selectedTeacherLeaveDate !== teacherLeaveRequestDates[0] && (
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setSelectedTeacherLeaveDate(teacherLeaveRequestDates[0])}
                  >
                    Latest
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, alignItems: "center" }}>
                <span className="badge badge-blue">
                  {selectedTeacherLeaveDate ? formatFullDateLabel(selectedTeacherLeaveDate) : "All leave dates"}
                </span>
                <span className="badge badge-amber">{filteredTeacherLeaveRequests.length} requests</span>
                <span className="badge badge-green">{filteredTeacherLeaveRequests.filter((item) => item.status === "leave_approved").length} approved</span>
                <span className="badge badge-amber">{filteredTeacherLeaveRequests.filter((item) => item.status === "leave_pending").length} pending</span>
              </div>
            </div>
            {!teacherLeaveRequests.length ? (
              <p style={{ color: "#888", fontSize: 13 }}>No leave requests right now.</p>
            ) : !filteredTeacherLeaveRequests.length ? (
              <p style={{ color: "#888", fontSize: 13 }}>
                No teacher leave requests match the selected date.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 12, maxHeight: 480, overflowY: "auto", paddingRight: 4 }}>
                {filteredTeacherLeaveRequests.map((item) => (
                  <div key={item.id} style={{ padding: 14, borderRadius: 12, background: "#fff", border: "1px solid #eef1f7" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{item.teacher_name}</div>
                        <div style={{ fontSize: 12, color: "#185FA5", marginTop: 4 }}>{item.class_teacher_of}</div>
                        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                          {item.status === "leave_approved" ? `Approved leave on ${item.date}` : `Requested leave on ${item.date}`}
                        </div>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700 }}>Teachers Attendance</h3>
                {selectedTeacherHistoryDate && (
                  <div style={{ fontSize: 12, color: "#66758C", marginTop: 4 }}>
                    Showing attendance for {formatFullDateLabel(selectedTeacherHistoryDate)}
                  </div>
                )}
              </div>
              <span className="badge badge-blue">{filteredTeacherAttendance.length}</span>
            </div>
            <div style={{ marginBottom: 18, border: "1px solid #eef1f7", borderRadius: 18, padding: 14, background: "linear-gradient(180deg, #FCFDFF 0%, #F6F9FE 100%)" }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div className="form-group" style={{ margin: 0, minWidth: 220 }}>
                  <input
                    type="date"
                    value={selectedTeacherHistoryDate}
                    onChange={(e) => setSelectedTeacherHistoryDate(e.target.value)}
                    min={teacherAttendanceDates[teacherAttendanceDates.length - 1] || undefined}
                    max={teacherAttendanceDates[0] || todayDate}
                  />
                </div>
                {selectedTeacherHistoryDate && (
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setSelectedTeacherHistoryDate(todayDate)}
                  >
                    Today
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginTop: 10 }}>
                <div className="form-group" style={{ margin: 0, minWidth: 180, flex: "1 1 180px" }}>
                  <select value={teacherStatusFilter} onChange={(e) => setTeacherStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="marked">Marked</option>
                    <option value="not_marked">Not Marked</option>
                    <option value="present">Present</option>
                    <option value="leave_pending">Leave Pending</option>
                    <option value="leave_approved">On Leave</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0, minWidth: 180, flex: "1 1 180px" }}>
                  <select value={teacherSortFilter} onChange={(e) => setTeacherSortFilter(e.target.value)}>
                    <option value="name_asc">Teacher Name A-Z</option>
                    <option value="name_desc">Teacher Name Z-A</option>
                    <option value="class_asc">Class Wise</option>
                    <option value="status_asc">Status Wise</option>
                  </select>
                </div>
                {teacherStatusFilter !== "all" && (
                  <button className="btn-outline" type="button" onClick={() => setTeacherStatusFilter("all")}>
                    Clear Filter
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, alignItems: "center" }}>
                <span className="badge badge-blue">
                  {selectedTeacherHistoryDate ? formatFullDateLabel(selectedTeacherHistoryDate) : "Select a date"}
                </span>
                <span className="badge badge-blue">{teacherCalendarSummary.total} teachers</span>
                <span className="badge badge-green">{teacherCalendarSummary.present} present</span>
                <span className="badge badge-amber">{teacherCalendarSummary.leave_pending + teacherCalendarSummary.leave_approved} leave</span>
                <span className="badge badge-red">{teacherCalendarSummary.not_marked} not marked</span>
              </div>
            </div>
            {!filteredTeacherAttendance.length ? (
              <p style={{ color: "#888", fontSize: 13 }}>
                {selectedTeacherHistoryDate
                  ? "No teacher attendance records match this filter for the selected date."
                  : "No teacher attendance history is available for the selected date."}
              </p>
            ) : (
              <div style={{ display: "grid", gap: 10, maxHeight: 480, overflowY: "auto", paddingRight: 4 }}>
                {filteredTeacherAttendance.map((item) => (
                  <div key={item.id || `${item.teacher_id}-${item.date}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f0f2f7" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.teacher_name}</div>
                      <div style={{ fontSize: 12, color: "#185FA5", marginTop: 4 }}>{item.class_teacher_of}</div>
                      <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                        Date: {new Date(`${item.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                      <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
                        {formatTeacherAttendanceNote(item, true)}
                      </div>
                    </div>
                    <span className={`badge ${getTeacherStatusBadgeClass(item.status)}`}>
                      {getTeacherStatusLabel(item.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {!showTeacherAttendance && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="form-group" style={{ margin: 0, minWidth: 140 }}>
              <label>Filter by Class</label>
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                <option value="">All Classes</option>
                {CLASSES.map((cls) => <option key={cls} value={cls}>Class {cls}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 140 }}>
              <label>Filter by Section</label>
              <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
                <option value="">All Sections</option>
                {SECTIONS.map((section) => <option key={section} value={section}>Section {section}</option>)}
              </select>
            </div>
            {(classFilter || sectionFilter) && <button className="btn-outline" onClick={() => { setClassFilter(""); setSectionFilter(""); }}>Clear</button>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 16 }}>
            {filteredStats.map((cls, index) => {
              const pct = cls.total_att ? Math.round((cls.present / cls.total_att) * 100) : 0;
              const color = pct >= 75 ? "#1D9E75" : pct >= 50 ? "#EF9F27" : "#E24B4A";
              const bg = pct >= 75 ? "#EAF3DE" : pct >= 50 ? "#FAEEDA" : "#FCEBEB";
              return (
                <div key={index} className="card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>Class {cls.class} - Section {cls.section || "?"}</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{cls.students.length} students</div>
                    </div>
                    <div style={{ background: bg, color, fontWeight: 700, fontSize: 20, padding: "6px 12px", borderRadius: 8 }}>{pct}%</div>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "#f0f2f7", marginBottom: 12 }}>
                    <div style={{ width: pct + "%", height: "100%", borderRadius: 4, background: color, transition: "width 0.5s" }}></div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    {[
                      { label: "Present", val: cls.present, color: "#0F6E56", bg: "#EAF3DE" },
                      { label: "Absent", val: cls.total_att - cls.present, color: "#A32D2D", bg: "#FCEBEB" },
                      { label: "Working Days", val: cls.working_days, color: "#185FA5", bg: "#E6F1FB" },
                    ].map((stat, statIndex) => (
                      <div key={statIndex} style={{ flex: 1, background: stat.bg, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: stat.color }}>{stat.val}</div>
                        <div style={{ fontSize: 10, color: stat.color, opacity: 0.8 }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setDetailClass(cls); setMsg(""); setError(""); }} style={{ width: "100%", padding: "7px", borderRadius: 8, border: "1.5px solid #185FA5", background: "#fff", color: "#185FA5", fontWeight: 500, fontSize: 12, cursor: "pointer" }}>
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
