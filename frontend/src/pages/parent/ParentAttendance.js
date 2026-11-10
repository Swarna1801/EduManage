import React, { useEffect, useMemo, useState } from "react";
import API from "../../utils/api";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ParentAttendance() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    API.get("/parent/dashboard")
      .then((response) => {
        const kids = response.data.children || (response.data.child ? [response.data.child] : []);
        setChildren(kids);
        if (kids[0]) {
          setSelectedChild(kids[0]);
          fetchAttendance(kids[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchAttendance = (childId) => {
    setLoading(true);
    setStatusFilter("");
    API.get(`/parent/attendance?child_id=${childId}`)
      .then((response) => {
        setData(response.data);
        const firstRecordDate = response.data?.records?.[0]?.date;
        if (firstRecordDate) {
          const parsed = new Date(firstRecordDate);
          setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const records = data?.records || [];
  const summary = data?.summary || {};
  const student = data?.student || selectedChild || {};

  const statusColor = { present: "#EAF3DE", absent: "#FCEBEB", late: "#FFF8CC" };
  const statusText = { present: "#27500A", absent: "#791F1F", late: "#B98900" };
  const statusBorder = { present: "#CDE1B9", absent: "#F2C6C6", late: "#F3E08A" };

  const filteredRecords = useMemo(
    () => records.filter((record) => (statusFilter ? record.status === statusFilter : true)),
    [records, statusFilter]
  );

  const recordsByDate = useMemo(
    () =>
      records.reduce((acc, record) => {
        const key = new Date(record.date).toISOString().slice(0, 10);
        acc[key] = record.status;
        return acc;
      }, {}),
    [records]
  );

  const monthLabel = calendarMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
  const leadingDays = monthStart.getDay();
  const totalDays = monthEnd.getDate();
  const calendarCells = [];

  for (let i = 0; i < leadingDays; i += 1) {
    calendarCells.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const cellDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    const key = cellDate.toISOString().slice(0, 10);
    calendarCells.push({
      day,
      key,
      status: recordsByDate[key] || "",
    });
  }

  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null);
  }

  return (
    <div>
      <div className="page-title">Attendance Report</div>
      <div className="page-sub">Daily attendance records</div>

      {children.length > 1 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {children.map((child, index) => (
            <div
              key={index}
              onClick={() => {
                setSelectedChild(child);
                fetchAttendance(child.id);
              }}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                cursor: "pointer",
                border: selectedChild?.id === child.id ? "2px solid #185FA5" : "1.5px solid #E8EAF0",
                background: selectedChild?.id === child.id ? "#E6F1FB" : "#FFFFFF",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, color: selectedChild?.id === child.id ? "#0C447C" : "#333" }}>{child.name}</div>
              <div style={{ fontSize: 11, color: "#888" }}>Class {child.class}{child.section ? ` Sec ${child.section}` : ""}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          <div className="grid-4" style={{ marginBottom: 24 }}>
            {[
              { label: "Attendance %", value: `${summary.pct || 0}%`, color: summary.pct >= 75 ? "#0F6E56" : summary.pct >= 50 ? "#854F0B" : "#A32D2D" },
              { label: "Present / Working", value: `${summary.present || 0}/${summary.working_days || 0}`, color: "#185FA5" },
              { label: "Absent", value: summary.absent || 0, color: "#A32D2D" },
              { label: "Late", value: summary.late || 0, color: "#854F0B" },
            ].map((metric, index) => (
              <div key={index} className="metric-card">
                <div className="label">{metric.label}</div>
                <div className="value" style={{ color: metric.color }}>{metric.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) 1fr", gap: 20 }}>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10 }}>
                <h3 style={{ fontWeight: 600, margin: 0 }}>Attendance Calendar</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-outline" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                    Prev
                  </button>
                  <button className="btn-outline" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                    Next
                  </button>
                </div>
              </div>

              <div style={{ fontWeight: 700, color: "#122B4A", marginBottom: 12 }}>{monthLabel}</div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 10 }}>
                {WEEK_DAYS.map((day) => (
                  <div key={day} style={{ fontSize: 11, fontWeight: 700, color: "#73839A", textTransform: "uppercase", textAlign: "center" }}>
                    {day}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                {calendarCells.map((cell, index) =>
                  cell ? (
                    <div
                      key={cell.key}
                      style={{
                        minHeight: 54,
                        borderRadius: 12,
                        border: `1px solid ${cell.status ? statusBorder[cell.status] : "#E8EAF0"}`,
                        background: cell.status ? statusColor[cell.status] : "#FFFFFF",
                        color: cell.status ? statusText[cell.status] : "#66758C",
                        padding: "8px 6px",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{cell.day}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "capitalize" }}>{cell.status || "-"}</div>
                    </div>
                  ) : (
                    <div key={`empty-${index}`} />
                  )
                )}
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
                {["present", "absent", "late"].map((status) => (
                  <div key={status} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 999, background: statusText[status] }} />
                    <span style={{ fontSize: 12, color: "#66758C", textTransform: "capitalize" }}>{status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
                <h3 style={{ fontWeight: 600, margin: 0 }}>Attendance Records - {student.name}</h3>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
                  <div className="form-group" style={{ margin: 0, minWidth: 180 }}>
                    <label>Filter by Status</label>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                      <option value="">-- All Status --</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                    </select>
                  </div>
                  {statusFilter && <button className="btn-outline" onClick={() => setStatusFilter("")}>Clear</button>}
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <p style={{ color: "#888" }}>No attendance records found for this filter.</p>
              ) : (
                filteredRecords.map((attendance, index) => (
                  <div key={index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F0F2F7" }}>
                    <div style={{ fontSize: 13 }}>
                      {new Date(attendance.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </div>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        background: statusColor[attendance.status],
                        color: statusText[attendance.status],
                      }}
                    >
                      {attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
