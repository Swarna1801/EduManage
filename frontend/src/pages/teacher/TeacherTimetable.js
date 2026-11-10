import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import PremiumPageHero from "../../components/layout/PremiumPageHero";
import { CalendarClock, GraduationCap, LayoutGrid, ShieldCheck } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const createTeacherSchedule = () => DAYS.map((day) => ({ day, periods: PERIODS.map((period) => ({ period, class_name: "", section: "", subject: "", time: "" })) }));
const createStudentSchedule = () => DAYS.map((day) => ({ day, periods: PERIODS.map((period) => ({ period, subject: "", time: "", room: "" })) }));
const getCell = (schedule, day, period) => schedule.find((item) => item.day === day)?.periods?.find((row) => row.period === period) || null;

const tableShellStyle = {
  overflow: "auto",
  borderRadius: 22,
  border: "1px solid #E3EAF4",
  background: "linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
};

const headerCellStyle = {
  padding: "16px 14px",
  background: "linear-gradient(180deg, #F8FBFF 0%, #EEF4FB 100%)",
  color: "#5B6B82",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  borderBottom: "1px solid #E3EAF4",
};

const periodCellStyle = {
  padding: "16px 14px",
  background: "#FCFDFE",
  borderBottom: "1px solid #EEF2F7",
  verticalAlign: "top",
  minWidth: 110,
};

const bodyCellStyle = {
  padding: "14px",
  borderBottom: "1px solid #EEF2F7",
  verticalAlign: "top",
  minWidth: 170,
};

const displayCellStyle = {
  minWidth: 140,
  borderRadius: 16,
  padding: "12px 13px",
  background: "linear-gradient(180deg, #FFFFFF 0%, #F7FAFD 100%)",
  border: "1px solid #E6EDF6",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
};

const inputGridStyle = {
  display: "grid",
  gap: 8,
  minWidth: 160,
  padding: "12px",
  borderRadius: 16,
  background: "linear-gradient(180deg, #FFFFFF 0%, #F7FAFD 100%)",
  border: "1px solid #E6EDF6",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
};

export default function TeacherTimetable() {
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState({ type: "", text: "" });
  const [teacherSchedule, setTeacherSchedule] = useState(createTeacherSchedule());
  const [studentSchedule, setStudentSchedule] = useState(createStudentSchedule());
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [classTeacherOf, setClassTeacherOf] = useState("");
  const [editingTeacher, setEditingTeacher] = useState(false);
  const [editingStudent, setEditingStudent] = useState(false);
  const [teacherSaving, setTeacherSaving] = useState(false);
  const [studentSaving, setStudentSaving] = useState(false);
  const [view, setView] = useState("teacher");
  const handledClassCount = Array.from(new Set(teacherOptions.map((item) => `${item.class_name}-${item.section || ""}`).filter((item) => item && item !== "-"))).length;
  const handledSubjectCount = Array.from(new Set(teacherOptions.map((item) => item.subject).filter(Boolean))).length;

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await API.get("/teacher/dashboard");
      setTeacherSchedule(response.data?.teacher_timetable?.schedule || createTeacherSchedule());
      setStudentSchedule(response.data?.class_timetable?.schedule || createStudentSchedule());
      setTeacherOptions(response.data?.teacher_timetable?.options || []);
      setClassTeacherOf(response.data?.class_teacher_of || "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const onTeacherField = (day, period, field, value) => setTeacherSchedule((current) => current.map((item) => item.day !== day ? item : { ...item, periods: item.periods.map((row) => row.period !== period ? row : { ...row, [field]: value }) }));
  const onStudentField = (day, period, field, value) => setStudentSchedule((current) => current.map((item) => item.day !== day ? item : { ...item, periods: item.periods.map((row) => row.period !== period ? row : { ...row, [field]: value }) }));

  const saveTeacherTimetable = async () => {
    setTeacherSaving(true);
    setBanner({ type: "", text: "" });
    try {
      const response = await API.post("/teacher/timetable", { schedule: teacherSchedule });
      setTeacherSchedule(response.data?.schedule || teacherSchedule);
      setEditingTeacher(false);
      setBanner({ type: "success", text: response.data?.message || "Teacher timetable saved" });
    } catch (error) {
      setBanner({ type: "error", text: error.response?.data?.message || "Failed to save teacher timetable" });
    } finally {
      setTeacherSaving(false);
    }
  };

  const saveStudentTimetable = async () => {
    setStudentSaving(true);
    setBanner({ type: "", text: "" });
    try {
      const response = await API.post("/teacher/class-timetable", { schedule: studentSchedule });
      setStudentSchedule(response.data?.schedule || studentSchedule);
      setEditingStudent(false);
      setBanner({ type: "success", text: response.data?.message || "Student timetable saved" });
    } catch (error) {
      setBanner({ type: "error", text: error.response?.data?.message || "Failed to save student timetable" });
    } finally {
      setStudentSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <PremiumPageHero
        icon={<CalendarClock size={22} />}
        title="Timetable Workspace"
        subtitle={view === "teacher"
          ? "Design and review your own premium teaching timetable with a cleaner weekly classroom view."
          : "Manage the student timetable that parents can view for your class teacher section."}
        badge="Premium Timetable"
        meta={[
          { label: "View", value: view === "teacher" ? "Teacher Timetable" : "Student Timetable", icon: <LayoutGrid size={16} />, color: "#185FA5", minWidth: 170, maxWidth: 220 },
          { label: "Handled Classes", value: String(handledClassCount || 0), icon: <GraduationCap size={16} />, color: "#0F6E56", minWidth: 130, maxWidth: 170 },
          { label: "Subjects", value: String(handledSubjectCount || 0), icon: <ShieldCheck size={16} />, color: "#8A5409", minWidth: 110, maxWidth: 130 },
        ]}
      />

      {banner.text && (
        <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: banner.type === "error" ? "#FCEBEB" : "#EAF3DE", color: banner.type === "error" ? "#8B1E1E" : "#27500A", border: `1px solid ${banner.type === "error" ? "#F5C2C2" : "#C0DD97"}` }}>
          {banner.text}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 22 }}>
        <div style={{ borderRadius: 20, padding: "18px 20px", background: "linear-gradient(135deg, #F4F9FF 0%, #FFFFFF 100%)", border: "1px solid #E4EBF5", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#73839A", letterSpacing: 0.8, textTransform: "uppercase" }}>Active Mode</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#122B4A", marginTop: 8 }}>{view === "teacher" ? "Teacher" : "Student"}</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#66758C" }}>{view === "teacher" ? "Personal teaching schedule" : "Parent-visible class schedule"}</div>
        </div>
        <div style={{ borderRadius: 20, padding: "18px 20px", background: "linear-gradient(135deg, #FFF8EE 0%, #FFFFFF 100%)", border: "1px solid #EEE3CA", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#8A6A28", letterSpacing: 0.8, textTransform: "uppercase" }}>Class Teacher Role</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#122B4A", marginTop: 8 }}>{classTeacherOf ? `Class ${classTeacherOf}` : "Not Assigned"}</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#7A6D54" }}>{classTeacherOf ? "Student timetable can be published to parents." : "Only teacher timetable is available right now."}</div>
        </div>
        <div style={{ borderRadius: 20, padding: "18px 20px", background: "linear-gradient(135deg, #F3FBF6 0%, #FFFFFF 100%)", border: "1px solid #DFEEE6", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6E7E57", letterSpacing: 0.8, textTransform: "uppercase" }}>Coverage</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#122B4A", marginTop: 8 }}>{DAYS.length} Days x {PERIODS.length} Periods</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#66758C" }}>Premium weekly planner from Monday to Saturday.</div>
        </div>
      </div>

      <div className="card" style={{ borderRadius: 24, border: "1px solid #E4EBF5", boxShadow: "0 20px 42px rgba(15, 23, 42, 0.05)", padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ padding: "22px 22px 0" }}>
            <h3 style={{ fontWeight: 600, margin: 0 }}>{view === "teacher" ? "Teacher Timetable" : "Student Timetable"}</h3>
            <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>
              {view === "teacher"
                ? "Rows are periods and columns are Monday to Saturday for the classes and subjects you handle."
                : `This timetable is visible to parents for ${classTeacherOf ? `Class ${classTeacherOf.replace("-", " Section ")}` : "your class teacher assignment"}.`}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", width: "100%", padding: "22px 22px 0" }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className={view === "teacher" ? "btn-primary" : "btn-outline"} onClick={() => setView("teacher")}>Teacher Timetable</button>
              {classTeacherOf && <button type="button" className={view === "student" ? "btn-primary" : "btn-outline"} onClick={() => setView("student")}>View Student Timetable</button>}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {view === "teacher" ? (
                editingTeacher ? (
                  <>
                    <button type="button" className="btn-outline" onClick={() => { setEditingTeacher(false); loadDashboard(); }}>Cancel</button>
                    <button type="button" className="btn-primary" onClick={saveTeacherTimetable} disabled={teacherSaving}>{teacherSaving ? "Saving..." : "Save Teacher Timetable"}</button>
                  </>
                ) : (
                  <button type="button" className="btn-primary" onClick={() => setEditingTeacher(true)}>Edit Teacher Timetable</button>
                )
              ) : classTeacherOf ? (
                editingStudent ? (
                  <>
                    <button type="button" className="btn-outline" onClick={() => { setEditingStudent(false); loadDashboard(); }}>Cancel</button>
                    <button type="button" className="btn-primary" onClick={saveStudentTimetable} disabled={studentSaving}>{studentSaving ? "Saving..." : "Save Student Timetable"}</button>
                  </>
                ) : (
                  <button type="button" className="btn-primary" onClick={() => setEditingStudent(true)}>Edit Student Timetable</button>
                )
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ padding: 22 }}>
          <div style={tableShellStyle}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={headerCellStyle}>Day</th>
                {PERIODS.map((period) => <th key={period} style={headerCellStyle}>Period {period}</th>)}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => (
                <tr key={day}>
                  <td style={periodCellStyle}>
                    <div style={{ fontWeight: 800, color: "#122B4A", fontSize: 18, lineHeight: 1.2 }}>{day}</div>
                    <div style={{ fontSize: 12, color: "#72839B", marginTop: 6 }}>Weekday</div>
                  </td>
                  {PERIODS.map((period) => {
                    const teacherCell = getCell(teacherSchedule, day, period);
                    const studentCell = getCell(studentSchedule, day, period);
                    return (
                      <td key={`${day}-${period}`} style={bodyCellStyle}>
                        {view === "teacher" ? (
                          editingTeacher ? (
                            <div style={inputGridStyle}>
                              <select value={teacherCell?.class_name || ""} onChange={(e) => onTeacherField(day, period, "class_name", e.target.value)}>
                                <option value="">Class</option>
                                {[...new Set(teacherOptions.map((item) => item.class_name).filter(Boolean))].map((item) => <option key={item} value={item}>{item}</option>)}
                              </select>
                              <select value={teacherCell?.section || ""} onChange={(e) => onTeacherField(day, period, "section", e.target.value)}>
                                <option value="">Section</option>
                                {[...new Set(teacherOptions.filter((item) => item.class_name === (teacherCell?.class_name || "")).map((item) => item.section).filter(Boolean))].map((item) => <option key={item} value={item}>{item}</option>)}
                              </select>
                              <select value={teacherCell?.subject || ""} onChange={(e) => onTeacherField(day, period, "subject", e.target.value)}>
                                <option value="">Subject</option>
                                {teacherOptions
                                  .filter((item) => item.class_name === (teacherCell?.class_name || "") && (teacherCell?.section ? item.section === teacherCell.section : true))
                                  .map((item, index) => <option key={`${item.class_name}-${item.section}-${item.subject}-${index}`} value={item.subject}>{item.subject || "Class Teacher"}</option>)}
                              </select>
                              <input value={teacherCell?.time || ""} placeholder="09:00 - 09:45" onChange={(e) => onTeacherField(day, period, "time", e.target.value)} />
                            </div>
                          ) : (
                            <div style={displayCellStyle}>
                              <div style={{ fontWeight: 800, color: "#0C447C", fontSize: 14 }}>{teacherCell?.class_name ? `Class ${teacherCell.class_name}${teacherCell.section ? `-${teacherCell.section}` : ""}` : "Free Slot"}</div>
                              <div style={{ fontSize: 12, color: "#555", marginTop: 6, fontWeight: 600 }}>{teacherCell?.subject || "No subject assigned"}</div>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "4px 8px", borderRadius: 999, background: "#EAF2FE", color: "#185FA5", fontSize: 11, fontWeight: 700 }}>
                                <CalendarClock size={12} />
                                {teacherCell?.time || "Time not set"}
                              </div>
                            </div>
                          )
                        ) : (
                          editingStudent ? (
                            <div style={inputGridStyle}>
                              <input value={studentCell?.subject || ""} placeholder="Subject" onChange={(e) => onStudentField(day, period, "subject", e.target.value)} />
                              <input value={studentCell?.time || ""} placeholder="09:00 - 09:45" onChange={(e) => onStudentField(day, period, "time", e.target.value)} />
                              <input value={studentCell?.room || ""} placeholder="Room" onChange={(e) => onStudentField(day, period, "room", e.target.value)} />
                            </div>
                          ) : (
                            <div style={displayCellStyle}>
                              <div style={{ fontWeight: 800, color: "#0C447C", fontSize: 14 }}>{studentCell?.subject || "No subject assigned"}</div>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "4px 8px", borderRadius: 999, background: "#EAF2FE", color: "#185FA5", fontSize: 11, fontWeight: 700 }}>
                                <CalendarClock size={12} />
                                {studentCell?.time || "Time not set"}
                              </div>
                              <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>{studentCell?.room || "Room not set"}</div>
                            </div>
                          )
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
