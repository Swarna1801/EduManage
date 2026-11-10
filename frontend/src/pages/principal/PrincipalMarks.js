import React, { useEffect, useMemo, useState } from "react";
import API from "../../utils/api";
import PremiumLock from "../../components/PremiumLock";
import { useAuth } from "../../context/AuthContext";
import { canUseFeature } from "../../lib/planFeatures";

const CLASSES = ["9", "10", "11", "12"];
const SECTIONS = ["A", "B", "C", "D"];

export default function PrincipalMarks() {
  const { user } = useAuth();
  const plan = user?.plan || "basic";
  const hasPremiumMarks = canUseFeature(plan, "partWiseMarks");

  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState([]);
  const [exams, setExams] = useState([]);
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [detailClass, setDetailClass] = useState(null);
  const [detailSortFilter, setDetailSortFilter] = useState("roll_asc");
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [examAnalytics, setExamAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [notifying, setNotifying] = useState(null);

  useEffect(() => {
    const requests = [API.get("/principal/students"), API.get("/principal/marks-overview")];
    if (hasPremiumMarks) requests.push(API.get("/exams"));

    Promise.all(requests).then((responses) => {
      setStudents(responses[0].data);
      setMarks(responses[1].data);
      if (hasPremiumMarks) setExams(responses[2].data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [hasPremiumMarks]);

  useEffect(() => {
    if (!hasPremiumMarks || !detailClass) return;
    const matchingExams = exams.filter((exam) => exam.class === detailClass.class && exam.section === detailClass.section && (!subjectFilter || exam.subject === subjectFilter));
    const nextExamId = matchingExams[0]?.id ? String(matchingExams[0].id) : "";
    setSelectedExamId(nextExamId);
  }, [hasPremiumMarks, detailClass, exams, subjectFilter]);

  useEffect(() => {
    if (!hasPremiumMarks || !selectedExamId) {
      setExamAnalytics(null);
      return;
    }

    setAnalyticsLoading(true);
    API.get("/exams/" + selectedExamId + "/analytics")
      .then((response) => setExamAnalytics(response.data))
      .catch(() => setExamAnalytics(null))
      .finally(() => setAnalyticsLoading(false));
  }, [hasPremiumMarks, selectedExamId]);

  const subjects = [...new Set(marks.map((mark) => mark.subject).filter(Boolean))];

  const getClassMarks = () => {
    const groups = {};
    students.forEach((student) => {
      const key = student.class + "-" + (student.section || "?");
      if (!groups[key]) groups[key] = { class: student.class, section: student.section, students: [], marks: [] };
      groups[key].students.push(student);
    });
    marks.forEach((mark) => {
      const student = students.find((item) => item.id === mark.student_id);
      if (!student) return;
      if (subjectFilter && mark.subject !== subjectFilter) return;
      const key = student.class + "-" + (student.section || "?");
      if (groups[key]) groups[key].marks.push(mark);
    });
    return Object.values(groups).sort((a, b) => a.class.localeCompare(b.class));
  };

  const getDetailMarks = (cls) => {
    const classStudents = students.filter((student) => student.class === cls.class && student.section === cls.section);
    return classStudents.map((student) => {
      const studentMarks = marks.filter((mark) => mark.student_id === student.id && (!subjectFilter || mark.subject === subjectFilter));
      const avg = studentMarks.length ? Math.round(studentMarks.reduce((acc, mark) => acc + mark.marks, 0) / studentMarks.length) : null;
      const bySubject = {};
      studentMarks.forEach((mark) => {
        if (!bySubject[mark.subject]) bySubject[mark.subject] = [];
        bySubject[mark.subject].push(mark.marks);
      });
      return { ...student, avg, total_entries: studentMarks.length, bySubject };
    });
  };

  const notifyParent = async (student) => {
    setNotifying(student.id);
    setMsg("");
    setError("");
    try {
      await API.post("/principal/notify-marks", {
        student_id: student.id,
        student_name: student.name,
        average: student.avg,
        subject: subjectFilter || undefined,
      });
      setMsg("Marks notification sent to parent of " + student.name);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send marks notification");
    } finally {
      setNotifying(null);
    }
  };

  const classMarks = getClassMarks();
  const filteredClass = classMarks.filter((cls) => {
    if (classFilter && cls.class !== classFilter) return false;
    if (sectionFilter && cls.section !== sectionFilter) return false;
    return true;
  });

  const detailStats = useMemo(() => (detailClass ? getDetailMarks(detailClass) : []), [detailClass, students, marks, subjectFilter]);
  const sortedDetailStats = useMemo(() => {
    const parseRoll = (rollNo) => {
      const value = String(rollNo || "").trim();
      if (!value) return Number.MAX_SAFE_INTEGER;
      const match = value.match(/\d+/);
      return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
    };

    return [...detailStats].sort((a, b) => {
      if (detailSortFilter === "rank_asc") {
        if ((b.avg ?? -1) !== (a.avg ?? -1)) return (b.avg ?? -1) - (a.avg ?? -1);
        return (a.name || "").localeCompare(b.name || "");
      }

      if (detailSortFilter === "rank_desc") {
        if ((a.avg ?? -1) !== (b.avg ?? -1)) return (a.avg ?? -1) - (b.avg ?? -1);
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
  const allSubjects = [...new Set(detailStats.flatMap((student) => Object.keys(student.bySubject)))];
  const lowPerformers = sortedDetailStats.filter((student) => student.avg !== null && student.avg < 50);
  const matchingExams = hasPremiumMarks && detailClass
    ? exams.filter((exam) => exam.class === detailClass.class && exam.section === detailClass.section && (!subjectFilter || exam.subject === subjectFilter))
    : [];

  if (loading) return <div className="loading">Loading...</div>;

  if (detailClass) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => { setDetailClass(null); setMsg(""); setError(""); }} className="btn-outline">Back</button>
          <div>
            <div className="page-title" style={{ margin: 0 }}>Class {detailClass.class} - Section {detailClass.section} Marks</div>
            <div className="page-sub" style={{ margin: 0 }}>Detailed student-wise performance</div>
          </div>
        </div>

        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {hasPremiumMarks ? (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700 }}>Premium Performance Watchlist</h3>
                  <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Low-scoring students with quick parent notification</div>
                </div>
                <span className="badge badge-amber">Premium Insight</span>
              </div>

              <div className="grid-3" style={{ marginBottom: 16 }}>
                <div className="metric-card">
                  <div className="label">Low Performers</div>
                  <div className="value" style={{ color: "#A32D2D" }}>{lowPerformers.length}</div>
                </div>
                <div className="metric-card">
                  <div className="label">Class Average</div>
                  <div className="value" style={{ color: "#185FA5" }}>{detailStats.length ? Math.round(detailStats.filter((student) => student.avg !== null).reduce((acc, student) => acc + student.avg, 0) / Math.max(detailStats.filter((student) => student.avg !== null).length, 1)) : 0}</div>
                </div>
                <div className="metric-card">
                  <div className="label">Top Score</div>
                  <div className="value" style={{ color: "#0F6E56" }}>{detailStats.length ? Math.max(...detailStats.map((student) => student.avg || 0)) : 0}</div>
                </div>
              </div>

              {lowPerformers.length === 0 ? (
                <div style={{ padding: 14, borderRadius: 10, background: "#EAF3DE", color: "#27500A", fontSize: 13 }}>
                  No low performers detected in this class right now.
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Roll No</th><th>Average</th><th>Entries</th><th>Status</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {lowPerformers.map((student) => (
                        <tr key={student.id}>
                          <td><strong>{student.name}</strong></td>
                          <td>{student.roll_no || "-"}</td>
                          <td>{student.avg}</td>
                          <td>{student.total_entries}</td>
                          <td><span className="badge badge-red">Needs Support</span></td>
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

            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700 }}>Premium Part-wise Exam Analytics</h3>
                  <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>View part-wise marks, analytics, and rankings for uploaded premium exams</div>
                </div>
                <div className="form-group" style={{ margin: 0, minWidth: 280 }}>
                  <label>Select Exam</label>
                  <select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}>
                    <option value="">-- Select Exam --</option>
                    {matchingExams.map((exam) => <option key={exam.id} value={exam.id}>{exam.exam_name} - {exam.subject}</option>)}
                  </select>
                </div>
              </div>

              {!selectedExamId ? (
                <div style={{ padding: 14, borderRadius: 10, background: "#f5f6fa", color: "#666", fontSize: 13 }}>
                  No premium exam selected for this class and filter.
                </div>
              ) : analyticsLoading ? (
                <div className="loading">Loading exam analytics...</div>
              ) : examAnalytics?.analytics ? (
                <>
                  <div className="grid-4" style={{ marginBottom: 18 }}>
                    {[
                      { label: "Class Avg", value: examAnalytics.analytics.classAvg + "/" + examAnalytics.exam.total_max_marks, color: "#185FA5" },
                      { label: "Highest", value: examAnalytics.analytics.highest, color: "#0F6E56" },
                      { label: "Pass Count", value: examAnalytics.analytics.passCount, color: "#854F0B" },
                      { label: "Fail Count", value: examAnalytics.analytics.failCount, color: "#A32D2D" },
                    ].map((metric, index) => (
                      <div key={index} className="metric-card">
                        <div className="label">{metric.label}</div>
                        <div className="value" style={{ color: metric.color }}>{metric.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12, marginBottom: 18 }}>
                    {examAnalytics.analytics.partStats.map((part, index) => (
                      <div key={index} style={{ background: "#f9fafb", border: "1px solid #e8eaf0", borderRadius: 12, padding: 14 }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>{part.partName}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: part.avgPct >= 75 ? "#0F6E56" : part.avgPct >= 50 ? "#854F0B" : "#A32D2D" }}>{part.avg}<span style={{ fontSize: 12, color: "#777" }}> / {part.maxMarks}</span></div>
                        <div style={{ height: 6, borderRadius: 4, background: "#edf0f5", margin: "10px 0" }}>
                          <div style={{ width: part.avgPct + "%", height: "100%", borderRadius: 4, background: part.avgPct >= 75 ? "#1D9E75" : part.avgPct >= 50 ? "#EF9F27" : "#E24B4A" }}></div>
                        </div>
                        <div style={{ fontSize: 12, color: "#666" }}>High: {part.highest} | Low: {part.lowest}</div>
                      </div>
                    ))}
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Rank</th><th>Name</th><th>Roll No</th>{examAnalytics.exam.parts.map((part) => <th key={part.partName}>{part.partName}</th>)}<th>Total</th><th>%</th><th>Grade</th></tr>
                      </thead>
                      <tbody>
                        {examAnalytics.marks.map((mark, index) => (
                          <tr key={mark.id}>
                            <td>#{index + 1}</td>
                            <td><strong>{mark.student_name}</strong></td>
                            <td>{mark.roll_no || "-"}</td>
                            {examAnalytics.exam.parts.map((part) => {
                              const partMark = mark.part_marks.find((item) => item.partName === part.partName);
                              return <td key={part.partName}>{partMark ? `${partMark.obtained}/${part.maxMarks}` : "-"}</td>;
                            })}
                            <td><strong>{mark.total}</strong></td>
                            <td>{mark.percentage}%</td>
                            <td><span className={mark.percentage >= 50 ? "badge badge-green" : "badge badge-red"}>{mark.grade}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div style={{ padding: 14, borderRadius: 10, background: "#f5f6fa", color: "#666", fontSize: 13 }}>
                  No part-wise analytics available for this exam yet.
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <PremiumLock feature="Low-performer watchlist, parent alerts, and part-wise exam analytics" />
          </div>
        )}

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 700 }}>Student Marks Details</h3>
              <div style={{ fontSize: 12, color: "#66758C", marginTop: 4 }}>
                Sort this section by roll number or rank.
              </div>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 220 }}>
              <select value={detailSortFilter} onChange={(e) => setDetailSortFilter(e.target.value)}>
                <option value="roll_asc">Roll Number Wise</option>
                <option value="rank_asc">Rank Wise High-Low</option>
                <option value="rank_desc">Rank Wise Low-High</option>
                <option value="name_asc">Student Name A-Z</option>
              </select>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Roll No</th>
                  {allSubjects.map((subject) => <th key={subject}>{subject}</th>)}
                  <th>Average</th><th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {sortedDetailStats.map((student, index) => {
                  const avg = student.avg || 0;
                  const grade = avg >= 90 ? "A+" : avg >= 80 ? "A" : avg >= 70 ? "B" : avg >= 60 ? "C" : avg >= 50 ? "D" : "F";
                  const gradeColor = avg >= 60 ? "#0F6E56" : avg >= 50 ? "#854F0B" : "#A32D2D";
                  return (
                    <tr key={student.id}>
                      <td>{index + 1}</td>
                      <td><strong>{student.name}</strong></td>
                      <td>{student.roll_no || "-"}</td>
                      {allSubjects.map((subject) => {
                        const subjectMarks = student.bySubject[subject];
                        const subjectAvg = subjectMarks ? Math.round(subjectMarks.reduce((acc, value) => acc + value, 0) / subjectMarks.length) : null;
                        return <td key={subject}>{subjectAvg !== null ? <span style={{ fontWeight: 500, color: subjectAvg >= 60 ? "#0F6E56" : subjectAvg >= 50 ? "#854F0B" : "#A32D2D" }}>{subjectAvg}</span> : "-"}</td>;
                      })}
                      <td><strong>{student.avg ?? "-"}</strong></td>
                      <td><span style={{ background: gradeColor + "22", color: gradeColor, padding: "2px 8px", borderRadius: 4, fontWeight: 600, fontSize: 12 }}>{student.avg !== null ? grade : "-"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">Marks Overview</div>
      <div className="page-sub">Class-wise academic performance</div>

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
        <div className="form-group" style={{ margin: 0, minWidth: 160 }}>
          <label>Filter by Subject</label>
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="">All Subjects</option>
            {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </div>
        {(classFilter || sectionFilter || subjectFilter) && <button className="btn-outline" onClick={() => { setClassFilter(""); setSectionFilter(""); setSubjectFilter(""); }}>Clear</button>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {filteredClass.map((cls, index) => {
          const avg = cls.marks.length ? Math.round(cls.marks.reduce((acc, mark) => acc + mark.marks, 0) / cls.marks.length) : 0;
          const color = avg >= 75 ? "#1D9E75" : avg >= 50 ? "#EF9F27" : "#E24B4A";
          const bg = avg >= 75 ? "#EAF3DE" : avg >= 50 ? "#FAEEDA" : "#FCEBEB";
          const subjectAverages = {};
          cls.marks.forEach((mark) => {
            if (!subjectAverages[mark.subject]) subjectAverages[mark.subject] = [];
            subjectAverages[mark.subject].push(mark.marks);
          });
          return (
            <div key={index} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Class {cls.class} - Sec {cls.section || "?"}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{cls.students.length} students · {cls.marks.length} entries</div>
                </div>
                <div style={{ background: bg, color, fontWeight: 700, fontSize: 20, padding: "6px 12px", borderRadius: 8 }}>{avg || "-"}</div>
              </div>
              {Object.entries(subjectAverages).slice(0, 3).map(([subject, marksArray], subjectIndex) => {
                const subjectAvg = Math.round(marksArray.reduce((acc, value) => acc + value, 0) / marksArray.length);
                return (
                  <div key={subjectIndex} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#555" }}>{subject}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 80, height: 4, borderRadius: 2, background: "#f0f2f7" }}>
                        <div style={{ width: subjectAvg + "%", height: "100%", borderRadius: 2, background: subjectAvg >= 60 ? "#1D9E75" : subjectAvg >= 50 ? "#EF9F27" : "#E24B4A" }}></div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{subjectAvg}</span>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => { setDetailClass(cls); setMsg(""); setError(""); }} style={{ width: "100%", marginTop: 12, padding: "7px", borderRadius: 8, border: "1.5px solid #185FA5", background: "#fff", color: "#185FA5", fontWeight: 500, fontSize: 12, cursor: "pointer" }}>
                View Details
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
