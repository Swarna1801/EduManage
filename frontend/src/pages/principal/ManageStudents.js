import React, { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Filter, GraduationCap, Users } from "lucide-react";
import PremiumPageHero from "../../components/layout/PremiumPageHero";
import API from "../../utils/api";

const CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const SECTIONS = ["A", "B", "C", "D", "E"];

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [activeClass, setActiveClass] = useState("1");
  const [sectionFilter, setSectionFilter] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchAll = () => {
    API.get("/principal/students").then((response) => setStudents(response.data)).catch((e) => console.log(e));
    API.get("/principal/teachers").then((response) => setTeachers(response.data)).catch((e) => console.log(e));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!CLASSES.includes(activeClass)) {
      setActiveClass("1");
    }
  }, [activeClass]);

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find((item) => item.id === teacherId);
    return teacher ? teacher.name : null;
  };

  const classStudents = useMemo(() => students.filter((student) => student.class === activeClass), [students, activeClass]);

  const filtered = classStudents.filter((student) => {
    if (sectionFilter && student.section !== sectionFilter) return false;
    return true;
  });

  const availableSections = [...new Set(classStudents.map((student) => student.section).filter(Boolean))].sort();
  const totalStudents = students.length;
  const totalAssigned = students.filter((student) => student.teacher_id).length;
  const detailRows = selectedStudent
    ? [
        { label: "Student Name", value: selectedStudent.name },
        { label: "Student ID", value: selectedStudent.student_id || selectedStudent.id },
        { label: "Class", value: selectedStudent.class ? `Class ${selectedStudent.class}` : "-" },
        { label: "Section", value: selectedStudent.section ? `Section ${selectedStudent.section}` : "-" },
        { label: "Roll No", value: selectedStudent.roll_no || "-" },
        { label: "Gender", value: selectedStudent.gender || "-" },
        { label: "Date Of Birth", value: selectedStudent.dob || selectedStudent.date_of_birth || "-" },
        { label: "Parent Name", value: selectedStudent.parent_name || "-" },
        { label: "Parent Email", value: selectedStudent.parent_email || "-" },
        { label: "Parent Phone", value: selectedStudent.parent_phone || "-" },
        { label: "Address", value: selectedStudent.address || "-" },
        { label: "Assigned Teacher", value: getTeacherName(selectedStudent.teacher_id) || "Not assigned" },
        { label: "Fee Status", value: selectedStudent.fee_status || "-" },
      ]
    : [];

  return (
    <div>
      <PremiumPageHero
        icon={<GraduationCap size={22} />}
        title="Students List"
        subtitle="Browse students class by class, quickly filter by section, and keep the assigned teacher mapping easy to scan."
        meta={[
          { label: "Total Students", value: String(totalStudents), icon: <Users size={16} />, color: "#185FA5", minWidth: 145 },
          { label: "Active Class", value: `Class ${activeClass}`, icon: <BookOpenCheck size={16} />, color: "#8A5409", minWidth: 145 },
          { label: "Assigned", value: `${totalAssigned}/${totalStudents}`, icon: <Filter size={16} />, color: "#0F6E56", minWidth: 145 },
        ]}
      />

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: 20, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#66758C", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Browse By Class
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#102542", marginBottom: 4 }}>
              Class Navigation
            </div>
            <div style={{ color: "#66758C", maxWidth: 760, lineHeight: 1.6, fontSize: 14 }}>
              Pick a class card to refresh the student list instantly. Use the section filter below when you want a narrower view.
            </div>
          </div>

          <div
            style={{
              minWidth: 200,
              padding: "12px 14px",
              borderRadius: 14,
              background: "linear-gradient(180deg, #F8FBFF 0%, #EEF5FF 100%)",
              border: "1px solid #DCE8F7",
            }}
          >
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, color: "#73839A" }}>Current View</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#185FA5", marginTop: 4 }}>Class {activeClass}</div>
            <div style={{ color: "#66758C", marginTop: 2, fontSize: 13 }}>{filtered.length} student(s) visible</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
          {CLASSES.map((cls) => {
            const count = students.filter((student) => student.class === cls).length;
            const active = activeClass === cls;

            return (
              <button
                key={cls}
                onClick={() => {
                  setActiveClass(cls);
                  setSectionFilter("");
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: active ? "1.5px solid #185FA5" : "1px solid #DCE5F0",
                  background: active ? "linear-gradient(180deg, #ECF5FF 0%, #E3F0FF 100%)" : "#FFFFFF",
                  color: active ? "#185FA5" : "#1F2E43",
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: active ? "0 14px 30px rgba(24, 95, 165, 0.12)" : "0 10px 24px rgba(15, 23, 42, 0.04)",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800 }}>Class {cls}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: active ? "#185FA5" : "#6E7D92", marginTop: 4 }}>
                  {count} student(s)
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 240px) minmax(220px, 280px) 1fr", gap: 14, alignItems: "end" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Selected Class</label>
            <input value={`Class ${activeClass}`} disabled />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Filter by Section</label>
            <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
              <option value="">-- All Sections --</option>
              {availableSections.length > 0
                ? availableSections.map((section) => (
                    <option key={section} value={section}>
                      Section {section}
                    </option>
                  ))
                : SECTIONS.map((section) => (
                    <option key={section} value={section}>
                      Section {section}
                    </option>
                  ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", minHeight: 44 }}>
            {sectionFilter ? <button className="btn-outline" onClick={() => setSectionFilter("")}>Clear Filter</button> : <span />}
            <div style={{ fontSize: 13, color: "#66758C", fontWeight: 700 }}>
              Showing {filtered.length} of {classStudents.length} students in Class {activeClass}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: 18, color: "#102542" }}>Class {activeClass} Students</h3>
            <div style={{ color: "#66758C", marginTop: 4, fontSize: 14 }}>
              Student roster for Class {activeClass}{sectionFilter ? `, Section ${sectionFilter}` : ""}.
            </div>
          </div>
          <span
            style={{
              fontSize: 13,
              color: "#66758C",
              fontWeight: 700,
              padding: "8px 12px",
              borderRadius: 999,
              background: "#F7FAFD",
              border: "1px solid #E4EBF5",
            }}
          >
            {filtered.length} record(s)
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Class</th>
                <th>Section</th>
                <th>Roll No</th>
                <th>Assigned Teacher</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "#888", padding: 24 }}>
                    No students found for Class {activeClass}{sectionFilter ? ` - Section ${sectionFilter}` : ""}
                  </td>
                </tr>
              ) : (
                filtered.map((student, index) => (
                  <tr key={student.id}>
                    <td>{index + 1}</td>
                    <td><strong>{student.name}</strong></td>
                    <td>Class {student.class}</td>
                    <td>
                      {student.section ? (
                        <span className="badge badge-blue">Sec {student.section}</span>
                      ) : (
                        <span style={{ color: "#aaa" }}>-</span>
                      )}
                    </td>
                    <td>{student.roll_no || "-"}</td>
                    <td>
                      {student.teacher_id && getTeacherName(student.teacher_id) ? (
                        <span className="badge badge-green">{getTeacherName(student.teacher_id)}</span>
                      ) : (
                        <span style={{ color: "#aaa", fontSize: 12 }}>Not assigned</span>
                      )}
                    </td>
                    <td>
                      <button className="btn-outline" onClick={() => setSelectedStudent(student)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStudent && (
        <div
          onClick={() => setSelectedStudent(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.42)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1200,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(760px, 100%)",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#FFFFFF",
              borderRadius: 24,
              padding: 24,
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#66758C", textTransform: "uppercase", letterSpacing: 0.8 }}>
                  Student Details
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#102542", marginTop: 6 }}>
                  {selectedStudent.name}
                </div>
                <div style={{ color: "#66758C", marginTop: 6 }}>
                  Class {selectedStudent.class}{selectedStudent.section ? ` • Section ${selectedStudent.section}` : ""}{selectedStudent.roll_no ? ` • Roll ${selectedStudent.roll_no}` : ""}
                </div>
              </div>
              <button className="btn-outline" onClick={() => setSelectedStudent(null)}>
                Close
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {detailRows.map((row) => (
                <div key={row.label} style={{ padding: "14px 16px", borderRadius: 16, background: "#F8FBFF", border: "1px solid #E4EBF5" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#73839A", textTransform: "uppercase", letterSpacing: 0.7 }}>
                    {row.label}
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 700, color: "#122B4A", wordBreak: "break-word" }}>
                    {row.value || "-"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
