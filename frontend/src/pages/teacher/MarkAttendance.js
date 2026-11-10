import React, { useEffect, useMemo, useState } from "react";
import API from "../../utils/api";
import PremiumPageHero from "../../components/layout/PremiumPageHero";
import { CalendarCheck2, CalendarDays, History, School } from "lucide-react";

export default function MarkAttendance() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [classInfo, setClassInfo] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [pastRecords, setPastRecords] = useState([]);
  const [view, setView] = useState("mark");
  const [selectedHistoryDate, setSelectedHistoryDate] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");

  useEffect(() => {
    API.get("/teacher/class-students")
      .then((response) => {
        setStudents(response.data);
        const initial = {};
        response.data.forEach((student) => { initial[student.id] = "present"; });
        setAttendance(initial);
        setFetching(false);
        if (response.data.length > 0) fetchPastRecords(response.data);
      })
      .catch(() => setFetching(false));

    API.get("/teacher/dashboard")
      .then((response) => { if (response.data.class_teacher_of) setClassInfo(`Class ${response.data.class_teacher_of.replace("-", " Section ")}`); })
      .catch(() => {});
  }, []);

  const fetchPastRecords = async (studentList) => {
    try {
      const records = [];
      for (const student of studentList) {
        const response = await API.get(`/teacher/attendance/${student.id}`);
        response.data.records.forEach((record) => records.push({
          ...record,
          student_name: student.name,
          roll_no: student.roll_no || null,
        }));
      }
      const byDate = {};
      records.forEach((record) => {
        if (!byDate[record.date]) byDate[record.date] = [];
        byDate[record.date].push(record);
      });
      setPastRecords(Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7));
    } catch {}
  };

  const setStatus = (id, status) => setAttendance((current) => ({ ...current, [id]: status }));

  const handleSubmit = async () => {
    setLoading(true);
    setMsg("");
    const records = students.map((student) => ({ student_id: student.id, status: attendance[student.id] || "present" }));
    try {
      await API.post("/teacher/attendance", { records, date });
      setMsg("Attendance marked successfully and principal has been notified.");
      fetchPastRecords(students);
    } catch {
      setMsg("Failed to save attendance");
    } finally {
      setLoading(false);
    }
  };

  const counts = { present: 0, absent: 0, late: 0 };
  Object.values(attendance).forEach((status) => {
    if (counts[status] !== undefined) counts[status] += 1;
  });

  const statusColor = { present: "#EAF3DE", absent: "#FCEBEB", late: "#FAEEDA" };
  const statusText = { present: "#27500A", absent: "#791F1F", late: "#633806" };
  const historyDates = useMemo(() => pastRecords.map(([recordDate]) => recordDate), [pastRecords]);

  useEffect(() => {
    if (!historyDates.length) {
      setSelectedHistoryDate("");
      return;
    }

    const nextDate = selectedHistoryDate && historyDates.includes(selectedHistoryDate)
      ? selectedHistoryDate
      : historyDates[0];

    if (nextDate !== selectedHistoryDate) {
      setSelectedHistoryDate(nextDate);
    }
  }, [historyDates, selectedHistoryDate]);

  const filteredPastRecords = useMemo(() => {
    if (!selectedHistoryDate) return pastRecords;
    return pastRecords.filter(([recordDate]) => recordDate === selectedHistoryDate);
  }, [pastRecords, selectedHistoryDate]);

  const filteredPastRecordsByStatus = useMemo(() => {
    return filteredPastRecords.map(([recordDate, records]) => [
      recordDate,
      historyStatusFilter === "all"
        ? records
        : records.filter((record) => record.status === historyStatusFilter),
    ]);
  }, [filteredPastRecords, historyStatusFilter]);

  const historySummary = useMemo(() => {
    return filteredPastRecords.reduce((summary, [, records]) => {
      records.forEach((record) => {
        summary.total += 1;
        summary[record.status] = (summary[record.status] || 0) + 1;
      });
      return summary;
    }, { total: 0, present: 0, absent: 0, late: 0 });
  }, [filteredPastRecords]);

  if (fetching) return <div className="loading">Loading...</div>;

  if (!classInfo && students.length === 0) {
    return (
      <div>
        <PremiumPageHero
          icon={<CalendarCheck2 size={22} />}
          title="Mark Attendance"
          subtitle="Daily attendance command center for your assigned class."
          meta={[{ label: "Class", value: classInfo || "Not Assigned", icon: <School size={16} />, color: "#0F6E56" }]}
        />
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>!</div>
          <h3>You are not assigned as a Class Teacher</h3>
          <p style={{ color: "#888", marginTop: 8 }}>Contact the principal to assign you as class teacher.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PremiumPageHero
        icon={<CalendarCheck2 size={22} />}
        title="Mark Attendance"
        subtitle={`Attendance for ${classInfo || "your class"} with quick switching between daily entry and history.`}
        meta={[
          { label: "Class", value: classInfo || "Assigned Class", icon: <School size={16} />, color: "#0F6E56" },
          { label: "View", value: view === "mark" ? "Mark Today" : "History", icon: <History size={16} />, color: "#185FA5" },
        ]}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setView("mark")} style={{ padding: "7px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 500, fontSize: 13, background: view === "mark" ? "#185FA5" : "#f5f6fa", color: view === "mark" ? "#fff" : "#555" }}>Mark Today</button>
        <button onClick={() => setView("history")} style={{ padding: "7px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 500, fontSize: 13, background: view === "history" ? "#185FA5" : "#f5f6fa", color: view === "history" ? "#fff" : "#555" }}>View History</button>
      </div>

      {view === "mark" && (
        <>
          <div className="grid-3" style={{ marginBottom: 16 }}>
            <div className="metric-card"><div className="label">Present</div><div className="value" style={{ color: "#0F6E56" }}>{counts.present}</div></div>
            <div className="metric-card"><div className="label">Absent</div><div className="value" style={{ color: "#A32D2D" }}>{counts.absent}</div></div>
            <div className="metric-card"><div className="label">Late</div><div className="value" style={{ color: "#854F0B" }}>{counts.late}</div></div>
          </div>

          {msg && <div className={`alert ${msg.includes("successfully") ? "alert-success" : "alert-error"}`} style={{ marginBottom: 12 }}>{msg}</div>}

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 600 }}>{classInfo} - {students.length} students</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ fontSize: 13, color: "#888" }}>Date:</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid #dde1ea", fontSize: 13 }} />
              </div>
            </div>

            {students.length === 0 ? <p style={{ color: "#888" }}>No students in your class yet.</p> : students.map((student) => (
              <div key={student.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f0f2f7" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#E6F1FB", color: "#0C447C", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{student.name}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>Roll {student.roll_no || "-"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["present", "absent", "late"].map((status) => (
                    <button key={status} onClick={() => setStatus(student.id, status)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", background: attendance[student.id] === status ? statusColor[status] : "#f5f6fa", color: attendance[student.id] === status ? statusText[status] : "#888", outline: attendance[student.id] === status ? `2px solid ${status === "present" ? "#1D9E75" : status === "absent" ? "#E24B4A" : "#EF9F27"}` : "none" }}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {students.length > 0 && (
              <button className="btn-primary" style={{ marginTop: 16, padding: "10px 32px" }} onClick={handleSubmit} disabled={loading}>
                {loading ? "Saving..." : "Done - Mark Attendance"}
              </button>
            )}
          </div>
        </>
      )}

      {view === "history" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ fontWeight: 700, margin: 0 }}>Past Attendance Records</h3>
              <div style={{ fontSize: 13, color: "#66758C", marginTop: 4 }}>
                Filter attendance history by date and review the class snapshot.
              </div>
            </div>
            <span className="badge badge-blue">{filteredPastRecords.length} day view</span>
          </div>

          <div style={{ marginBottom: 18, border: "1px solid #e7edf7", borderRadius: 20, padding: 16, background: "linear-gradient(180deg, #FCFDFF 0%, #F4F8FF 100%)" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="form-group" style={{ margin: 0, minWidth: 220 }}>
                <label style={{ color: "#5E6C84", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Calendar Filter</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="date"
                    value={selectedHistoryDate}
                    onChange={(e) => setSelectedHistoryDate(e.target.value)}
                    min={historyDates[historyDates.length - 1] || undefined}
                    max={historyDates[0] || undefined}
                    style={{ padding: "11px 42px 11px 14px", borderRadius: 12, border: "1.5px solid #d7e2f0", fontSize: 14, width: "100%" }}
                  />
                  <CalendarDays size={18} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#5D7495", pointerEvents: "none" }} />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0, minWidth: 180 }}>
                <label style={{ color: "#5E6C84", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Status Filter</label>
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  style={{ padding: "11px 14px", borderRadius: 12, border: "1.5px solid #d7e2f0", fontSize: 14, width: "100%" }}
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                </select>
              </div>
              {historyDates.length > 0 && selectedHistoryDate !== historyDates[0] && (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setSelectedHistoryDate(historyDates[0])}
                >
                  Latest
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <span className="badge badge-blue">
                {selectedHistoryDate
                  ? new Date(`${selectedHistoryDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                  : "All dates"}
              </span>
              <span className="badge badge-blue" style={{ textTransform: "capitalize" }}>
                {historyStatusFilter === "all" ? "All status" : historyStatusFilter}
              </span>
              <span className="badge badge-green">{historySummary.present} present</span>
              <span className="badge badge-red">{historySummary.absent} absent</span>
              <span className="badge badge-amber">{historySummary.late} late</span>
            </div>
          </div>

          {pastRecords.length === 0 ? <p style={{ color: "#888" }}>No past records found.</p> : !filteredPastRecords.length ? (
            <p style={{ color: "#888" }}>No attendance history found for the selected date.</p>
          ) : filteredPastRecordsByStatus.map(([recordDate, records]) => (
            <div key={recordDate} style={{ marginBottom: 16, border: "1px solid #eef2f7", borderRadius: 18, padding: 16, background: "#fff", boxShadow: "0 10px 24px rgba(18, 43, 74, 0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#185FA5" }}>
                    {new Date(`${recordDate}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </div>
                  <div style={{ fontSize: 12, color: "#66758C", marginTop: 4 }}>
                    {records.length} students recorded
                  </div>
                </div>
                <button
                  onClick={() => { setDate(recordDate); setView("mark"); }}
                  style={{ padding: "8px 14px", fontSize: 12, borderRadius: 10, border: "1px solid #B8D0EE", background: "#F3F8FF", color: "#0C447C", cursor: "pointer", fontWeight: 600 }}
                >
                  Edit This Day
                </button>
              </div>

              <div style={{ border: "1px solid #edf2f7", borderRadius: 16, overflow: "hidden", background: "#FBFDFF" }}>
                <div style={{ display: "grid", gridTemplateColumns: "72px 110px minmax(180px, 1fr) 140px", gap: 12, padding: "12px 16px", background: "#F4F8FD", borderBottom: "1px solid #e8eef6", fontSize: 12, fontWeight: 700, color: "#5E6C84", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <div>#</div>
                  <div>Roll No</div>
                  <div>Student</div>
                  <div>Status</div>
                </div>
                {!records.length ? (
                  <div style={{ padding: "18px 16px", fontSize: 13, color: "#66758C" }}>
                    No students match the selected status filter for this date.
                  </div>
                ) : (
                  <div style={{ maxHeight: 420, overflowY: "auto" }}>
                    {records
                    .slice()
                    .sort((a, b) => {
                      const aRoll = Number.parseInt(a.roll_no, 10);
                      const bRoll = Number.parseInt(b.roll_no, 10);
                      if (!Number.isNaN(aRoll) && !Number.isNaN(bRoll) && aRoll !== bRoll) return aRoll - bRoll;
                      return String(a.roll_no || "").localeCompare(String(b.roll_no || "")) || a.student_name.localeCompare(b.student_name);
                    })
                    .map((record, index) => (
                      <div key={`${record.student_name}-${index}`} style={{ display: "grid", gridTemplateColumns: "72px 110px minmax(180px, 1fr) 140px", gap: 12, padding: "13px 16px", borderBottom: index === records.length - 1 ? "none" : "1px solid #eef2f7", alignItems: "center" }}>
                        <div style={{ fontSize: 13, color: "#5E6C84", fontWeight: 600 }}>{index + 1}</div>
                        <div style={{ fontSize: 13, color: "#122B4A", fontWeight: 600 }}>{record.roll_no || "-"}</div>
                        <div style={{ fontSize: 14, color: "#122B4A", fontWeight: 600 }}>{record.student_name}</div>
                        <div>
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "5px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: "capitalize", background: statusColor[record.status], color: statusText[record.status] }}>
                            {record.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
