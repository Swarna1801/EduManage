import React, { useEffect, useMemo, useState } from "react";
import API from "../../utils/api";
import PremiumPageHero from "../../components/layout/PremiumPageHero";
import { BookOpen, UserSquare2 } from "lucide-react";

export default function ParentMarks() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedExamGroup, setSelectedExamGroup] = useState(null);
  const [subjectFilter, setSubjectFilter] = useState("");

  useEffect(() => {
    API.get("/parent/dashboard")
      .then((response) => {
        const kids = response.data.children || (response.data.child ? [response.data.child] : []);
        const validKids = kids.filter(Boolean);
        setChildren(validKids);
        if (validKids[0]) {
          setSelectedChild(validKids[0]);
          fetchExamMarks(validKids[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchExamMarks = (childId) => {
    setLoading(true);
    setData(null);
    setSelectedExamGroup(null);
    API.get(`/parent/exam-marks?child_id=${childId}`)
      .then((response) => {
        setData(response.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const getColor = (pct) => (pct >= 75 ? "#0F6E56" : pct >= 50 ? "#854F0B" : "#A32D2D");
  const getBg = (pct) => (pct >= 75 ? "#EAF3DE" : pct >= 50 ? "#FAEEDA" : "#FCEBEB");

  const exams = data?.exams || [];
  const student = data?.student || selectedChild || {};
  const subjects = [...new Set(exams.map((exam) => exam.subject).filter(Boolean))];
  const filteredExams = subjectFilter ? exams.filter((exam) => exam.subject === subjectFilter) : exams;

  const examGroups = useMemo(
    () =>
      Object.values(
        filteredExams.reduce((acc, exam) => {
          if (!acc[exam.exam_name]) {
            acc[exam.exam_name] = {
              exam_name: exam.exam_name,
              class: exam.class,
              section: exam.section,
              exams: [],
              total: 0,
              totalMax: 0,
            };
          }

          acc[exam.exam_name].exams.push(exam);
          acc[exam.exam_name].total += Number(exam.total) || 0;
          acc[exam.exam_name].totalMax += Number(exam.total_max_marks) || 0;
          return acc;
        }, {})
      )
        .map((group) => ({
          ...group,
          percentage: group.totalMax ? Math.round((group.total / group.totalMax) * 100) : 0,
        }))
        .sort((left, right) => left.exam_name.localeCompare(right.exam_name)),
    [filteredExams]
  );

  return (
    <div>
      <PremiumPageHero
        icon={<BookOpen size={22} />}
        title="Marks Report"
        subtitle="Grouped exam performance for each child, with a quick summary on top and a detailed view for every exam."
        meta={[
          { label: "Child", value: student?.name || selectedChild?.name || "Not Linked", icon: <UserSquare2 size={16} />, color: "#157A54" },
          { label: "Exams", value: String(examGroups.length || 0), icon: <BookOpen size={16} />, color: "#185FA5" },
        ]}
      />

      {children.length > 1 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {children.map((child, index) => (
            <div
              key={index}
              onClick={() => {
                setSelectedChild(child);
                fetchExamMarks(child.id);
              }}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                cursor: "pointer",
                border: selectedChild?.id === child.id ? "2px solid #185FA5" : "1.5px solid #E8EAF0",
                background: selectedChild?.id === child.id ? "#E6F1FB" : "#FFFFFF",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>{child.name}</div>
              <div style={{ fontSize: 11, color: "#888" }}>Class {child.class}{child.section ? ` Sec ${child.section}` : ""}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : exams.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#888" }}>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>No exam results yet for {student.name}</div>
          <div style={{ fontSize: 13 }}>Results will appear here once the teacher uploads marks.</div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="form-group" style={{ margin: 0, minWidth: 220 }}>
              <label>Filter by Subject</label>
              <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
                <option value="">All Subjects</option>
                {subjects.map((subject) => <option key={subject}>{subject}</option>)}
              </select>
            </div>
            {subjectFilter && <button className="btn-outline" onClick={() => setSubjectFilter("")}>Clear</button>}
            <div style={{ marginLeft: "auto", fontSize: 13, color: "#888", alignSelf: "center" }}>
              {examGroups.length} exam group(s) for {student.name}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16, marginBottom: 24 }}>
            {examGroups.map((group, index) => (
              <div key={index} className="card" style={{ padding: 20, border: selectedExamGroup?.exam_name === group.exam_name ? "2px solid #185FA5" : "1px solid #E8EAF0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{group.exam_name}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      Class {group.class}{group.section ? ` Sec ${group.section}` : ""} · {group.exams.length} subject(s)
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 24, color: getColor(group.percentage) }}>{group.total}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>/ {group.totalMax}</div>
                  </div>
                </div>

                <div style={{ height: 6, borderRadius: 3, background: "#F0F2F7", marginBottom: 10 }}>
                  <div style={{ width: `${group.percentage}%`, height: "100%", borderRadius: 3, background: getColor(group.percentage) }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ background: getBg(group.percentage), color: getColor(group.percentage), padding: "2px 10px", borderRadius: 4, fontWeight: 700, fontSize: 13 }}>
                    {group.percentage}% Overall
                  </span>
                  <button type="button" className="btn-outline" onClick={() => setSelectedExamGroup(group)}>View</button>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {group.exams.map((exam, examIndex) => (
                    <div key={examIndex} style={{ background: getBg(exam.percentage || 0), borderRadius: 6, padding: "6px 10px", fontSize: 11, minWidth: 108 }}>
                      <div style={{ color: getColor(exam.percentage || 0), fontWeight: 700 }}>{exam.subject}</div>
                      <div style={{ color: getColor(exam.percentage || 0) }}>{exam.total}/{exam.total_max_marks}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selectedExamGroup && (
            <div
              onClick={() => setSelectedExamGroup(null)}
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
                  width: "min(1040px, 100%)",
                  maxHeight: "88vh",
                  overflowY: "auto",
                  background: "#FFFFFF",
                  borderRadius: 24,
                  padding: 24,
                  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}>
                  <div>
                    <h3 style={{ fontWeight: 700, margin: 0, color: "#185FA5" }}>{selectedExamGroup.exam_name} - Detailed Marks</h3>
                    <div style={{ fontSize: 13, color: "#66758C", marginTop: 6 }}>
                      {student.name} · Class {selectedExamGroup.class}{selectedExamGroup.section ? ` Sec ${selectedExamGroup.section}` : ""} · {selectedExamGroup.exams.length} subject(s)
                    </div>
                  </div>
                  <button type="button" className="btn-outline" onClick={() => setSelectedExamGroup(null)}>Close</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, background: "#F9FAFB", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                  {[
                    { label: "Total Marks", value: `${selectedExamGroup.total}/${selectedExamGroup.totalMax}`, color: getColor(selectedExamGroup.percentage) },
                    { label: "Percentage", value: `${selectedExamGroup.percentage}%`, color: getColor(selectedExamGroup.percentage) },
                    { label: "Subjects", value: String(selectedExamGroup.exams.length), color: getColor(selectedExamGroup.percentage) },
                  ].map((item, index) => (
                    <div key={index} style={{ background: "#FFFFFF", borderRadius: 8, padding: "12px 16px", border: "1px solid #E8EAF0", textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gap: 16 }}>
                  {selectedExamGroup.exams.map((exam, examIndex) => (
                    <div key={examIndex} style={{ border: "1px solid #E6EDF6", borderRadius: 16, padding: 18, background: "#FCFDFF" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 18 }}>{exam.subject}</div>
                          <div style={{ fontSize: 12, color: "#888" }}>Grade {exam.grade} · {exam.percentage}%</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, fontSize: 24, color: getColor(exam.percentage) }}>{exam.total}</div>
                          <div style={{ fontSize: 12, color: "#888" }}>/ {exam.total_max_marks}</div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
                        {exam.part_marks.map((partMark, partIndex) => {
                          const pct = Math.round((partMark.obtained / partMark.maxMarks) * 100);
                          return (
                            <div key={partIndex} style={{ background: "#F9FAFB", borderRadius: 10, padding: 16, border: "1px solid #E8EAF0" }}>
                              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{partMark.partName}</div>
                              <div style={{ fontSize: 26, fontWeight: 700, color: getColor(pct) }}>
                                {partMark.obtained}
                                <span style={{ fontSize: 14, color: "#888" }}>/{partMark.maxMarks}</span>
                              </div>
                              <div style={{ height: 4, borderRadius: 2, background: "#E8EAF0", marginTop: 8 }}>
                                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: getColor(pct) }} />
                              </div>
                              <div style={{ fontSize: 12, color: getColor(pct), marginTop: 4, fontWeight: 500 }}>{pct}%</div>
                              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{pct >= 75 ? "Good" : pct >= 50 ? "Average" : "Needs Work"}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
