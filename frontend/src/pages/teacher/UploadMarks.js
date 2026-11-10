import React, { useEffect, useMemo, useRef, useState } from "react";
import API from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import PremiumLock from "../../components/PremiumLock";
import PremiumPageHero from "../../components/layout/PremiumPageHero";
import { canUseFeature } from "../../lib/planFeatures";
import { BookOpen, ClipboardCheck, Eye, GraduationCap, Send } from "lucide-react";

const EXAM_NAMES = ["Unit Exam 1", "Unit Exam 2", "Mid Term", "Quarterly", "Half Yearly", "Annual"];
const getDefaultParts = (allowPartWiseMarks) =>
  allowPartWiseMarks
    ? [{ partName: "Part A", maxMarks: "" }]
    : [{ partName: "Total Marks", maxMarks: "100" }];

const emptyForm = (allowPartWiseMarks) => ({
  exam_name: "",
  class: "",
  section: "",
  subject: "",
  parts: getDefaultParts(allowPartWiseMarks),
});

const getColor = (pct) => (pct >= 75 ? "#0F6E56" : pct >= 50 ? "#854F0B" : "#A32D2D");

export default function UploadMarks() {
  const { user } = useAuth();
  const plan = user?.plan || "basic";
  const allowPartWiseMarks = canUseFeature(plan, "partWiseMarks");

  const [page, setPage] = useState("list");
  const [workspace, setWorkspace] = useState({ assignments: [], my_exams: [], review_groups: [], class_teacher_of: null });
  const [dashboardAssignments, setDashboardAssignments] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examMarks, setExamMarks] = useState(null);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentMarks, setStudentMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overall");
  const [notifyLoadingKey, setNotifyLoadingKey] = useState("");
  const [form, setForm] = useState(emptyForm(allowPartWiseMarks));
  const [editingExamId, setEditingExamId] = useState(null);
  const [selectedReviewGroupKey, setSelectedReviewGroupKey] = useState("");
  const [reviewSortFilter, setReviewSortFilter] = useState("marks_desc");
  const initializedTabRef = useRef(false);

  const loadWorkspace = async () => {
    try {
      const response = await API.get("/exams/workspace");
      setWorkspace(response.data || { assignments: [], my_exams: [], review_groups: [], class_teacher_of: null });
    } catch {
      setWorkspace({ assignments: [], my_exams: [], review_groups: [], class_teacher_of: null });
    }
  };

  const loadDashboardAssignments = async () => {
    try {
      const response = await API.get("/teacher/dashboard");
      setDashboardAssignments(response.data?.class_assignments || []);
    } catch {
      setDashboardAssignments([]);
    }
  };

  useEffect(() => {
    loadWorkspace();
    loadDashboardAssignments();
  }, []);

  useEffect(() => {
    setForm((prev) => ({ ...emptyForm(allowPartWiseMarks), class: prev.class, section: prev.section, subject: prev.subject }));
  }, [allowPartWiseMarks]);

  const assignments = (workspace.assignments && workspace.assignments.length
    ? workspace.assignments
    : dashboardAssignments) || [];
  const myExams = workspace.my_exams || [];
  const reviewGroups = workspace.review_groups || [];

  useEffect(() => {
    if (initializedTabRef.current) {
      if (!workspace.class_teacher_of && activeTab === "review") {
        setActiveTab("overall");
      }
      return;
    }

    if (workspace.class_teacher_of) {
      setActiveTab("overall");
      initializedTabRef.current = true;
      return;
    }

    if (workspace.assignments || workspace.my_exams || workspace.review_groups) {
      setActiveTab("overall");
      initializedTabRef.current = true;
    }
  }, [workspace.class_teacher_of, workspace.assignments, workspace.my_exams, workspace.review_groups, activeTab]);

  useEffect(() => {
    if (!workspace.class_teacher_of || !reviewGroups.length) {
      setSelectedReviewGroupKey("");
      setReviewSummary(null);
      return;
    }

    setSelectedReviewGroupKey((currentKey) => {
      if (currentKey && reviewGroups.some((group) => group.key === currentKey)) {
        return currentKey;
      }
      return reviewGroups[0].key;
    });
  }, [workspace.class_teacher_of, reviewGroups]);

  useEffect(() => {
    if (!workspace.class_teacher_of || !selectedReviewGroupKey) return;
    const group = reviewGroups.find((item) => item.key === selectedReviewGroupKey);
    if (!group || group.uploaded_subjects === 0) {
      setReviewSummary(null);
      return;
    }
    loadOverallReview(group, { navigate: false });
  }, [workspace.class_teacher_of, reviewGroups, selectedReviewGroupKey]);

  const assignmentOptions = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.class && assignment.subject)
        .sort((left, right) => `${left.class}-${left.section}-${left.subject}`.localeCompare(`${right.class}-${right.section}-${right.subject}`, undefined, { numeric: true })),
    [assignments]
  );

  const groupedAssignments = useMemo(() => {
    const map = new Map();
    assignmentOptions.forEach((assignment) => {
      const key = `${assignment.class}-${assignment.section || ""}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(assignment);
    });
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      class: items[0].class,
      section: items[0].section || "",
      subjects: items.map((item) => item.subject),
    }));
  }, [assignmentOptions]);

  const selectedAssignment = useMemo(() => {
    if (!form.class) return null;
    const classMatches = assignmentOptions.filter(
      (assignment) =>
        assignment.class === form.class &&
        (assignment.section || "") === (form.section || "")
    );
    if (!classMatches.length) return null;
    return (
      classMatches.find((assignment) => assignment.subject === form.subject) ||
      classMatches.find((assignment) => assignment.is_class_teacher) ||
      classMatches.find((assignment) => assignment.subject === user?.subject) ||
      classMatches[0]
    );
  }, [assignmentOptions, form.class, form.section, form.subject, user?.subject]);

  const totalMax = form.parts.reduce((acc, part) => acc + (Number(part.maxMarks) || 0), 0);

  const changeAssignment = (assignmentKey) => {
    const assignment = groupedAssignments.find((item) => item.key === assignmentKey);
    if (!assignment) return;
    const matchingSubject =
      assignmentOptions.find(
        (item) =>
          item.class === assignment.class &&
          (item.section || "") === (assignment.section || "") &&
          item.is_class_teacher
      ) ||
      assignmentOptions.find(
        (item) =>
          item.class === assignment.class &&
          (item.section || "") === (assignment.section || "") &&
          item.subject === user?.subject
      ) ||
      assignmentOptions.find(
        (item) =>
          item.class === assignment.class &&
          (item.section || "") === (assignment.section || "")
      );

    setForm((prev) => ({
      ...prev,
      class: assignment.class,
      section: assignment.section || "",
      subject: matchingSubject?.subject || "",
    }));
  };

  const addPart = () =>
    setForm((prev) => ({
      ...prev,
      parts: [...prev.parts, { partName: `Part ${String.fromCharCode(65 + prev.parts.length)}`, maxMarks: "" }],
    }));

  const removePart = (index) =>
    setForm((prev) => ({
      ...prev,
      parts: prev.parts.filter((_, currentIndex) => currentIndex !== index),
    }));

  const updatePart = (index, field, value) =>
    setForm((prev) => ({
      ...prev,
      parts: prev.parts.map((part, currentIndex) => (currentIndex === index ? { ...part, [field]: value } : part)),
    }));

  const handleEditExam = (exam) => {
    setEditingExamId(exam.id);
    setForm({
      exam_name: exam.exam_name || "",
      class: exam.class || "",
      section: exam.section || "",
      subject: exam.subject || "",
      parts: (exam.parts && exam.parts.length
        ? exam.parts.map((part) => ({ partName: part.partName, maxMarks: String(part.maxMarks) }))
        : getDefaultParts(allowPartWiseMarks)),
    });
    setError("");
    setMsg("");
    setPage("create");
  };

  const editingExam = editingExamId ? myExams.find((exam) => exam.id === editingExamId) : null;
  const isNameOnlyEdit = !!editingExam?.has_uploaded_marks;

  const handleSaveExam = async (event) => {
    event.preventDefault();
    if (!selectedAssignment) {
      setError("Select one class and subject assignment");
      return;
    }
    if (!form.exam_name) {
      setError("Select exam name");
      return;
    }
    if (form.parts.some((part) => !part.partName || !part.maxMarks)) {
      setError("Fill all part details");
      return;
    }

    setLoading(true);
    setError("");
    setMsg("");
    try {
      const payload = {
        exam_name: form.exam_name,
        class: form.class,
        section: form.section || null,
        subject: form.subject,
        parts: allowPartWiseMarks ? form.parts : getDefaultParts(false),
      };

      if (editingExamId) {
        await API.patch(`/exams/${editingExamId}`, payload);
        setMsg("Exam updated");
      } else {
        await API.post("/exams", payload);
        setMsg("Exam created");
      }

      setForm(emptyForm(allowPartWiseMarks));
      setEditingExamId(null);
      await loadWorkspace();
      setPage("list");
      setActiveTab("uploads");
    } catch (err) {
      setError(err.response?.data?.message || (editingExamId ? "Failed to update exam" : "Failed to create exam"));
    } finally {
      setLoading(false);
    }
  };

  const openMarksEntry = async (exam) => {
    setSelectedExam(exam);
    setLoading(true);
    setError("");
    try {
      const query = exam.section ? `class=${exam.class}&section=${exam.section}` : `class=${exam.class}`;
      const [studentsResponse, marksResponse] = await Promise.all([
        API.get(`/teacher/students?${query}`),
        API.get(`/exams/${exam.id}/marks`).catch(() => ({ data: { marks: [] } })),
      ]);

      const studentList = studentsResponse.data || [];
      const existingMarks = marksResponse.data?.marks || [];
      const initial = {};

      studentList.forEach((student) => {
        const existing = existingMarks.find((item) => item.student_id === student.id);
        const partMap = {};
        exam.parts.forEach((part) => {
          const existingPart = existing?.part_marks?.find((item) => item.partName === part.partName);
          partMap[part.partName] = existingPart ? String(existingPart.obtained) : "";
        });
        initial[student.id] = partMap;
      });

      setStudents(studentList);
      setStudentMarks(initial);
      setPage("marks");
    } catch {
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const viewResults = async (exam) => {
    setSelectedExam(exam);
    setLoading(true);
    setError("");
    try {
      const response = await API.get(`/exams/${exam.id}/marks`);
      setExamMarks(response.data);
      setPage("results");
    } catch {
      setError("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const updateMark = (studentId, partName, value) =>
    setStudentMarks((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [partName]: value },
    }));

  const getTotal = (studentId) =>
    !selectedExam
      ? 0
      : selectedExam.parts.reduce((acc, part) => acc + (Number(studentMarks[studentId]?.[part.partName]) || 0), 0);

  const getPct = (studentId) =>
    !selectedExam?.total_max_marks ? 0 : Math.round((getTotal(studentId) / selectedExam.total_max_marks) * 100);

  const getGrade = (pct) => (pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "F");

  const handleSubmitMarks = async () => {
    setLoading(true);
    setError("");
    setMsg("");
    try {
      await API.post("/exams/marks", {
        exam_id: selectedExam.id,
        student_marks: students.map((student) => ({
          student_id: student.id,
          part_marks: selectedExam.parts.map((part) => ({
            partName: part.partName,
            maxMarks: Number(part.maxMarks),
            obtained: Number(studentMarks[student.id]?.[part.partName]) || 0,
          })),
        })),
      });
      setMsg("Marks saved successfully");
      await loadWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save marks");
    } finally {
      setLoading(false);
    }
  };

  const deleteExam = async (id) => {
    if (!window.confirm("Delete this exam and its uploaded marks?")) return;
    try {
      await API.delete(`/exams/${id}`);
      setMsg("Exam deleted");
      await loadWorkspace();
    } catch {
      setError("Failed to delete exam");
    }
  };

  const loadOverallReview = async (group, { navigate = true } = {}) => {
    const uploadedSubjects = group.subjects.filter((item) => item.uploaded && item.exam_id);
    if (!uploadedSubjects.length) {
      setError("No uploaded subject marks available yet for overall view");
      if (!navigate) {
        setReviewSummary(null);
      }
      return;
    }

    setLoading(true);
    setError("");
    try {
      const responses = await Promise.all(
        uploadedSubjects.map((item) => API.get(`/exams/${item.exam_id}/marks`))
      );

      const uploadedResults = responses.map((response, index) => ({
        subject: uploadedSubjects[index].subject,
        exam: response.data?.exam,
        marks: response.data?.marks || [],
      }));

      const studentMap = new Map();

      uploadedResults.forEach((result) => {
        result.marks.forEach((mark) => {
          if (!studentMap.has(mark.student_id)) {
            studentMap.set(mark.student_id, {
              student_id: mark.student_id,
              student_name: mark.student_name,
              roll_no: mark.roll_no,
              subjects: {},
              total: 0,
              max_total: 0,
            });
          }

          const row = studentMap.get(mark.student_id);
          row.subjects[result.subject] = {
            total: mark.total,
            percentage: mark.percentage,
            grade: mark.grade,
          };
          row.total += Number(mark.total) || 0;
          row.max_total += Number(result.exam?.total_max_marks) || 100;
        });
      });

      const rows = Array.from(studentMap.values())
        .map((row) => ({
          ...row,
          overall_percentage: row.max_total ? Math.round((row.total / row.max_total) * 100) : 0,
        }))
        .sort((left, right) => right.total - left.total);

      setReviewSummary({
        group,
        uploadedSubjects: uploadedResults.map((item) => item.subject),
        pendingSubjects: group.subjects.filter((item) => !item.uploaded).map((item) => item.subject),
        rows,
      });
      if (navigate) {
        setPage("overall");
      }
    } catch {
      setError("Failed to load overall class review");
      if (!navigate) {
        setReviewSummary(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const openOverallReview = async (group) => {
    setSelectedReviewGroupKey(group.key);
    await loadOverallReview(group, { navigate: true });
  };

  const notifyTeacher = async (group, subjectRow) => {
    if (!subjectRow.teacher_id) {
      setError("No teacher assigned for this subject yet");
      return;
    }
    const key = `${group.key}-${subjectRow.subject}`;
    setNotifyLoadingKey(key);
    setError("");
    setMsg("");
    try {
      await API.post("/exams/notify-pending", {
        exam_name: group.exam_name,
        class: group.class,
        section: group.section || null,
        subject: subjectRow.subject,
      });
      setMsg(`Reminder sent for ${subjectRow.subject}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reminder");
    } finally {
      setNotifyLoadingKey("");
    }
  };

  const goBackToWorkspace = () => {
    setPage("list");
    setError("");
    setEditingExamId(null);
    setForm(emptyForm(allowPartWiseMarks));
    setActiveTab("overall");
  };

  const sortedReviewRows = useMemo(() => {
    const rows = reviewSummary?.rows || [];
    const parseRoll = (rollNo) => {
      const value = String(rollNo || "").trim();
      if (!value) return Number.MAX_SAFE_INTEGER;
      const match = value.match(/\d+/);
      return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
    };

    return [...rows].sort((a, b) => {
      if (reviewSortFilter === "roll_asc") {
        const rollCompare = parseRoll(a.roll_no) - parseRoll(b.roll_no);
        if (rollCompare !== 0) return rollCompare;
        return String(a.roll_no || "").localeCompare(String(b.roll_no || "")) || a.student_name.localeCompare(b.student_name);
      }

      if (reviewSortFilter === "marks_asc") {
        if (a.total !== b.total) return a.total - b.total;
        if (a.overall_percentage !== b.overall_percentage) return a.overall_percentage - b.overall_percentage;
        return a.student_name.localeCompare(b.student_name);
      }

      if (reviewSortFilter === "name_asc") {
        return a.student_name.localeCompare(b.student_name);
      }

      if (a.total !== b.total) return b.total - a.total;
      if (a.overall_percentage !== b.overall_percentage) return b.overall_percentage - a.overall_percentage;
      return a.student_name.localeCompare(b.student_name);
    });
  }, [reviewSummary, reviewSortFilter]);

  const renderList = () => (
    <div>
      <PremiumPageHero
        icon={<BookOpen size={22} />}
        title="Upload and View Marks"
        subtitle="Upload your subject marks and, as class teacher, review exam progress across all subjects for your class."
        meta={[
          { label: "My Exams", value: String(myExams.length), icon: <ClipboardCheck size={16} />, color: "#185FA5" },
          { label: "Assignments", value: String(assignmentOptions.length), icon: <GraduationCap size={16} />, color: "#0F6E56" },
          { label: "Class Review", value: String(reviewGroups.length), icon: <Eye size={16} />, color: "#8A5409" },
        ]}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: "#7A889C", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>Marks Workspace</div>
          <div className="page-sub">
            {workspace.class_teacher_of
              ? `Class teacher review active for Class ${workspace.class_teacher_of}`
              : "Subject upload workspace"}
          </div>
        </div>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        {workspace.class_teacher_of && (
          <button type="button" className={activeTab === "overall" ? "btn-primary" : "btn-outline"} onClick={() => setActiveTab("overall")}>
            Overall Marks
          </button>
        )}
        <button type="button" className={activeTab === "uploads" ? "btn-primary" : "btn-outline"} onClick={() => setActiveTab("uploads")}>
          My Subject Uploads
        </button>
        {workspace.class_teacher_of && (
          <button type="button" className={activeTab === "review" ? "btn-primary" : "btn-outline"} onClick={() => setActiveTab("review")}>
            My Class Review
          </button>
        )}
      </div>

      {activeTab === "overall" && workspace.class_teacher_of && reviewGroups.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "#7A889C", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>Overall Class Marks</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#102542", marginTop: 6 }}>
                {reviewSummary?.group?.exam_name || "Class Marks Overview"}
              </div>
              <div style={{ fontSize: 14, color: "#66758C", marginTop: 6 }}>
                This stays visible as the main class summary with student totals and rank.
              </div>
            </div>
            {reviewSummary?.group && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div className="form-group" style={{ minWidth: 320, marginBottom: 0 }}>
                  <label>Select Exam</label>
                  <select value={selectedReviewGroupKey} onChange={(event) => setSelectedReviewGroupKey(event.target.value)}>
                    {reviewGroups.map((group) => (
                      <option key={group.key} value={group.key}>
                        {group.exam_name} | Class {group.class}{group.section ? `-${group.section}` : ""} | {group.uploaded_subjects}/{group.total_subjects} uploaded
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ minWidth: 220, marginBottom: 0 }}>
                  <label>Sort Students</label>
                  <select value={reviewSortFilter} onChange={(event) => setReviewSortFilter(event.target.value)}>
                    <option value="marks_desc">Marks Wise High-Low</option>
                    <option value="marks_asc">Marks Wise Low-High</option>
                    <option value="roll_asc">Roll Number Wise</option>
                    <option value="name_asc">Student Name A-Z</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {reviewSummary?.group?.key === selectedReviewGroupKey ? (
            <>
              {reviewSummary.pendingSubjects.length > 0 && (
                <div className="card" style={{ marginBottom: 16, background: "#FFF8EE", border: "1px solid #F3DFC0", color: "#8A5409" }}>
                  Pending subjects: {reviewSummary.pendingSubjects.join(", ")}
                </div>
              )}

              <div className="grid-4" style={{ marginBottom: 18 }}>
                <div className="metric-card">
                  <div className="label">Students</div>
                  <div className="value" style={{ color: "#185FA5" }}>{reviewSummary.rows.length}</div>
                </div>
                <div className="metric-card">
                  <div className="label">Uploaded Subjects</div>
                  <div className="value" style={{ color: "#0F6E56" }}>{reviewSummary.uploadedSubjects.length}</div>
                </div>
                <div className="metric-card">
                  <div className="label">Class Average</div>
                  <div className="value" style={{ color: "#8A5409" }}>
                    {reviewSummary.rows.length
                      ? `${Math.round(reviewSummary.rows.reduce((sum, row) => sum + row.overall_percentage, 0) / reviewSummary.rows.length)}%`
                      : "0%"}
                  </div>
                </div>
                <div className="metric-card">
                  <div className="label">Top Rank</div>
                  <div className="value" style={{ color: "#27500A" }}>
                    {reviewSummary.rows[0] ? reviewSummary.rows[0].student_name : "-"}
                  </div>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Student</th>
                      <th>Roll</th>
                      {reviewSummary.uploadedSubjects.map((subject) => <th key={subject}>{subject}</th>)}
                      <th>Total</th>
                      <th>Overall %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedReviewRows.map((row, index) => (
                      <tr key={row.student_id}>
                        <td>#{index + 1}</td>
                        <td><strong>{row.student_name}</strong></td>
                        <td>{row.roll_no || "-"}</td>
                        {reviewSummary.uploadedSubjects.map((subject) => (
                          <td key={`${row.student_id}-${subject}`}>
                            {row.subjects[subject] ? (
                              <span style={{ color: getColor(row.subjects[subject].percentage), fontWeight: 700 }}>
                                {row.subjects[subject].total}
                              </span>
                            ) : "-"}
                          </td>
                        ))}
                        <td><strong style={{ color: getColor(row.overall_percentage) }}>{row.total}/{row.max_total}</strong></td>
                        <td>{row.overall_percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ padding: 18, borderRadius: 12, background: "#F7FAFD", border: "1px solid #E4EBF5", color: "#66758C" }}>
              {loading ? "Loading overall class marks..." : "No uploaded subject marks yet for the selected exam."}
            </div>
          )}
        </div>
      )}

      {activeTab === "overall" && workspace.class_teacher_of && reviewGroups.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#888" }}>
          No overall class marks are available yet. Once subject teachers upload exam marks, they will appear here.
        </div>
      )}

      {activeTab === "uploads" ? (
        <div style={{ display: "grid", gap: 16 }}>
          {!allowPartWiseMarks && (
            <div style={{ display: "grid", gap: 12 }}>
              <PremiumLock feature="Part-wise marks upload" />
              <div style={{ padding: 14, borderRadius: 12, background: "#F7FAFD", border: "1px solid #E4EBF5", color: "#66758C" }}>
                Basic plan teachers can still create exams and upload one total score out of 100 for each student.
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn-primary" onClick={() => { setEditingExamId(null); setForm(emptyForm(allowPartWiseMarks)); setPage("create"); setError(""); setMsg(""); }}>
              + Create New Exam
            </button>
          </div>

          {myExams.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 40, color: "#888" }}>
              No exams yet. Create an exam for one of your subject assignments to start uploading marks.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
              {myExams.map((exam) => (
                <div key={exam.id} className="card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 17 }}>{exam.exam_name}</div>
                      <div style={{ fontSize: 12, color: "#66758C", marginTop: 3 }}>
                        {exam.subject} | Class {exam.class}{exam.section ? `-${exam.section}` : ""}
                      </div>
                      <div style={{ fontSize: 11, color: "#95A0B2", marginTop: 3 }}>{new Date(exam.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{ background: "#E6F1FB", borderRadius: 10, padding: "8px 12px", textAlign: "center", minWidth: 82 }}>
                      <div style={{ fontWeight: 800, color: "#0C447C", fontSize: 22 }}>{exam.total_max_marks}</div>
                      <div style={{ fontSize: 10, color: "#6D7B90" }}>Total</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                    {exam.parts.map((part, index) => (
                      <span key={`${exam.id}-${index}`} style={{ background: "#F5F7FB", borderRadius: 999, padding: "4px 10px", fontSize: 11, color: "#506077" }}>
                        {part.partName}: {part.maxMarks}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => openMarksEntry(exam)} className="btn-primary" style={{ flex: 1 }}>
                      {exam.has_uploaded_marks ? "Edit Marks" : "Enter Marks"}
                    </button>
                    <button onClick={() => handleEditExam(exam)} className="btn-outline" style={{ flex: 1 }}>
                      {exam.has_uploaded_marks ? "Edit Exam Name" : "Edit Exam"}
                    </button>
                    <button onClick={() => viewResults(exam)} className="btn-outline" style={{ flex: 1 }}>
                      Results
                    </button>
                    <button
                      onClick={() => deleteExam(exam.id)}
                      style={{ padding: "8px 12px", borderRadius: 10, border: "none", background: "#FCEBEB", color: "#8B1E1E", cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "review" ? (
        reviewGroups.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40, color: "#888" }}>
            No class-level exam groups yet. Once subject teachers create exams for your class, they will appear here grouped by exam name.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {reviewGroups.map((group) => (
              <div key={group.key} className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{group.exam_name}</div>
                    <div style={{ fontSize: 13, color: "#66758C", marginTop: 4 }}>
                      Class {group.class}{group.section ? `-${group.section}` : ""} | {group.uploaded_subjects}/{group.total_subjects} subjects uploaded
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ padding: "10px 14px", borderRadius: 12, background: "#F6F9FD", color: "#185FA5", fontWeight: 700 }}>
                      {group.total_students} students
                    </div>
                    {group.uploaded_subjects > 0 && (
                      <button type="button" className="btn-outline" onClick={() => openOverallReview(group)}>
                        View Overall
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
                  {group.subjects.map((subjectRow) => (
                    <div key={`${group.key}-${subjectRow.subject}`} style={{ border: "1px solid #E4EBF5", borderRadius: 14, padding: 14, background: "#FFFFFF" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#122B4A" }}>{subjectRow.subject}</div>
                          <div style={{ fontSize: 12, color: "#66758C", marginTop: 4 }}>
                            {subjectRow.teacher_name || "Teacher not mapped"}
                          </div>
                        </div>
                        <span
                          style={{
                            borderRadius: 999,
                            padding: "4px 8px",
                            fontSize: 11,
                            fontWeight: 700,
                            background: subjectRow.uploaded ? "#EAF3DE" : "#FCEBEB",
                            color: subjectRow.uploaded ? "#27500A" : "#8B1E1E",
                          }}
                        >
                          {subjectRow.uploaded ? "Uploaded" : "Pending"}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: "#7B8798", marginTop: 10 }}>
                        {subjectRow.uploaded
                          ? `${subjectRow.uploaded_count}/${subjectRow.total_students} student marks saved`
                          : "Waiting for subject teacher to upload"}
                      </div>

                      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        {subjectRow.exam_id ? (
                          <button className="btn-outline" style={{ flex: 1 }} onClick={() => viewResults(myExams.find((exam) => exam.id === subjectRow.exam_id) || { id: subjectRow.exam_id, exam_name: group.exam_name, class: group.class, section: group.section, subject: subjectRow.subject, total_max_marks: 100, parts: [{ partName: "Total Marks", maxMarks: 100 }] })}>
                            View
                          </button>
                        ) : (
                          <div style={{ flex: 1 }} />
                        )}

                        {!subjectRow.uploaded && (
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ flex: 1 }}
                            onClick={() => notifyTeacher(group, subjectRow)}
                            disabled={notifyLoadingKey === `${group.key}-${subjectRow.subject}`}
                          >
                            <Send size={14} style={{ marginRight: 6 }} />
                            {notifyLoadingKey === `${group.key}-${subjectRow.subject}` ? "Sending..." : "Notify"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );

  const renderCreate = () => (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button className="btn-outline" onClick={goBackToWorkspace}>Back</button>
        <div className="page-title" style={{ margin: 0 }}>{editingExamId ? (isNameOnlyEdit ? "Edit Exam Name" : "Edit Exam") : "Create New Exam"}</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <form onSubmit={handleSaveExam}>
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Exam Setup</h3>
          <div className="grid-3">
            <div className="form-group">
              <label>Class You Handle</label>
              <select
                value={form.class ? `${form.class}-${form.section || ""}` : ""}
                onChange={(event) => changeAssignment(event.target.value)}
                disabled={isNameOnlyEdit}
                required
              >
                <option value="">-- Select --</option>
                {groupedAssignments.map((assignment) => (
                  <option
                    key={assignment.key}
                    value={assignment.key}
                  >
                    Class {assignment.class}{assignment.section ? `-${assignment.section}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Exam Name</label>
              <select value={form.exam_name} required onChange={(event) => setForm((prev) => ({ ...prev, exam_name: event.target.value }))}>
                <option value="">-- Select --</option>
                {EXAM_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Subject To Upload</label>
              <input value={form.subject} readOnly placeholder="Auto-filled from your assignment" />
            </div>
          </div>

          {groupedAssignments.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 13, color: "#66758C" }}>
              Classes handled:
              {" "}
              {groupedAssignments.map((item) => `Class ${item.class}${item.section ? `-${item.section}` : ""}`).join(", ")}
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div>
              <h3 style={{ fontWeight: 600, margin: 0 }}>Marks Structure</h3>
              <div style={{ fontSize: 12, color: "#7B8798", marginTop: 4 }}>Total: <strong>{totalMax}</strong> marks</div>
            </div>
            {allowPartWiseMarks ? (
              <button type="button" className="btn-outline" onClick={addPart} disabled={isNameOnlyEdit}>+ Add Part</button>
            ) : (
              <PremiumLock feature="Part-wise marks upload" compact />
            )}
          </div>

          {allowPartWiseMarks ? (
            form.parts.map((part, index) => (
              <div key={`part-${index}`} style={{ display: "grid", gridTemplateColumns: "1fr 160px auto", gap: 12, marginBottom: 10 }}>
                <input value={part.partName} onChange={(event) => updatePart(index, "partName", event.target.value)} placeholder="Part name" disabled={isNameOnlyEdit} />
                <input type="number" min="1" value={part.maxMarks} onChange={(event) => updatePart(index, "maxMarks", event.target.value)} placeholder="Max marks" disabled={isNameOnlyEdit} />
                {form.parts.length > 1 ? (
                  <button type="button" onClick={() => removePart(index)} disabled={isNameOnlyEdit} style={{ borderRadius: 10, border: "none", background: "#FCEBEB", color: "#8B1E1E", padding: "0 12px", cursor: isNameOnlyEdit ? "not-allowed" : "pointer", opacity: isNameOnlyEdit ? 0.6 : 1 }}>
                    Remove
                  </button>
                ) : <span />}
              </div>
            ))
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <PremiumLock feature="Part-wise marks upload" />
              <div style={{ padding: 14, borderRadius: 12, background: "#F7FAFD", border: "1px solid #E4EBF5", color: "#66758C" }}>
                Basic plan uses one total score out of 100 for each student.
              </div>
            </div>
          )}
        </div>

        {editingExamId && (
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 12, background: "#F7FAFD", border: "1px solid #E4EBF5", color: "#66758C" }}>
            {isNameOnlyEdit
              ? "Marks already exist for this exam. Use Edit Marks to change scores. This screen only lets you rename the exam."
              : "Update the exam setup here. Use Enter Marks to add or revise student scores."}
          </div>
        )}

        <button className="btn-primary" disabled={loading}>
          {loading ? (editingExamId ? "Saving..." : "Creating...") : (editingExamId ? "Save Changes" : "Create Exam")}
        </button>
      </form>
    </div>
  );

  const renderMarks = () => (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button className="btn-outline" onClick={goBackToWorkspace}>Back</button>
        <div>
          <div className="page-title" style={{ margin: 0 }}>{selectedExam.exam_name} - {selectedExam.has_uploaded_marks ? "Edit Marks" : "Enter Marks"}</div>
          <div style={{ fontSize: 13, color: "#66758C" }}>
            {selectedExam.subject} | Class {selectedExam.class}{selectedExam.section ? `-${selectedExam.section}` : ""} | Total {selectedExam.total_max_marks}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Roll</th>
                {selectedExam.parts.map((part) => <th key={part.partName}>{part.partName} / {part.maxMarks}</th>)}
                <th>Total</th>
                <th>%</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6 + selectedExam.parts.length} style={{ textAlign: "center", padding: 24, color: "#888" }}>No students found</td>
                </tr>
              ) : students.map((student, index) => {
                const total = getTotal(student.id);
                const pct = getPct(student.id);
                return (
                  <tr key={student.id}>
                    <td>{index + 1}</td>
                    <td><strong>{student.name}</strong></td>
                    <td>{student.roll_no || "-"}</td>
                    {selectedExam.parts.map((part) => (
                      <td key={`${student.id}-${part.partName}`}>
                        <input
                          type="number"
                          min="0"
                          max={part.maxMarks}
                          value={studentMarks[student.id]?.[part.partName] ?? ""}
                          onChange={(event) => updateMark(student.id, part.partName, event.target.value)}
                          style={{ width: 72, textAlign: "center" }}
                        />
                      </td>
                    ))}
                    <td><strong style={{ color: getColor(pct) }}>{total}</strong></td>
                    <td>{pct ? `${pct}%` : "-"}</td>
                    <td>{total ? getGrade(pct) : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {students.length > 0 && (
          <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
            <button className="btn-primary" onClick={handleSubmitMarks} disabled={loading}>
              {loading ? "Saving..." : "Save Marks"}
            </button>
            <button className="btn-outline" onClick={() => viewResults(selectedExam)}>View Results</button>
          </div>
        )}
      </div>
    </div>
  );

  const renderResults = () => (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button className="btn-outline" onClick={goBackToWorkspace}>Back</button>
        <div>
          <div className="page-title" style={{ margin: 0 }}>{selectedExam.exam_name} - Results</div>
          <div style={{ fontSize: 13, color: "#66758C" }}>
            {selectedExam.subject} | Class {selectedExam.class}{selectedExam.section ? `-${selectedExam.section}` : ""}
          </div>
        </div>
      </div>

      {!examMarks?.marks?.length ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#888" }}>No marks uploaded yet.</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th>Roll</th>
                  {selectedExam.parts.map((part) => <th key={part.partName}>{part.partName}</th>)}
                  <th>Total</th>
                  <th>%</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {examMarks.marks.map((mark, index) => (
                  <tr key={mark.id}>
                    <td>#{index + 1}</td>
                    <td><strong>{mark.student_name}</strong></td>
                    <td>{mark.roll_no || "-"}</td>
                    {selectedExam.parts.map((part) => {
                      const partMark = mark.part_marks.find((item) => item.partName === part.partName);
                      return <td key={`${mark.id}-${part.partName}`}>{partMark?.obtained || 0}</td>;
                    })}
                    <td><strong style={{ color: getColor(mark.percentage) }}>{mark.total}</strong></td>
                    <td>{mark.percentage}%</td>
                    <td>{mark.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderOverall = () => (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button className="btn-outline" onClick={goBackToWorkspace}>Back</button>
        <div>
          <div className="page-title" style={{ margin: 0 }}>{reviewSummary.group.exam_name} - Overall Class View</div>
          <div style={{ fontSize: 13, color: "#66758C" }}>
            Class {reviewSummary.group.class}{reviewSummary.group.section ? `-${reviewSummary.group.section}` : ""} | Uploaded subjects: {reviewSummary.uploadedSubjects.join(", ")}
          </div>
        </div>
      </div>

      {reviewSummary.pendingSubjects.length > 0 && (
        <div className="card" style={{ marginBottom: 16, background: "#FFF8EE", border: "1px solid #F3DFC0", color: "#8A5409" }}>
          Pending subjects: {reviewSummary.pendingSubjects.join(", ")}
        </div>
      )}

      <div className="grid-4" style={{ marginBottom: 18 }}>
        <div className="metric-card">
          <div className="label">Students</div>
          <div className="value" style={{ color: "#185FA5" }}>{reviewSummary.rows.length}</div>
        </div>
        <div className="metric-card">
          <div className="label">Uploaded Subjects</div>
          <div className="value" style={{ color: "#0F6E56" }}>{reviewSummary.uploadedSubjects.length}</div>
        </div>
        <div className="metric-card">
          <div className="label">Class Average</div>
          <div className="value" style={{ color: "#8A5409" }}>
            {reviewSummary.rows.length
              ? `${Math.round(reviewSummary.rows.reduce((sum, row) => sum + row.overall_percentage, 0) / reviewSummary.rows.length)}%`
              : "0%"}
          </div>
        </div>
        <div className="metric-card">
          <div className="label">Top Overall</div>
          <div className="value" style={{ color: "#27500A" }}>
            {reviewSummary.rows[0] ? `${reviewSummary.rows[0].student_name}` : "-"}
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <div className="form-group" style={{ margin: 0, minWidth: 220 }}>
            <label>Sort Students</label>
            <select value={reviewSortFilter} onChange={(event) => setReviewSortFilter(event.target.value)}>
              <option value="marks_desc">Marks Wise High-Low</option>
              <option value="marks_asc">Marks Wise Low-High</option>
              <option value="roll_asc">Roll Number Wise</option>
              <option value="name_asc">Student Name A-Z</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th>Roll</th>
                {reviewSummary.uploadedSubjects.map((subject) => <th key={subject}>{subject}</th>)}
                <th>Overall Total</th>
                <th>Overall %</th>
              </tr>
            </thead>
            <tbody>
              {sortedReviewRows.map((row, index) => (
                <tr key={row.student_id}>
                  <td>#{index + 1}</td>
                  <td><strong>{row.student_name}</strong></td>
                  <td>{row.roll_no || "-"}</td>
                  {reviewSummary.uploadedSubjects.map((subject) => (
                    <td key={`${row.student_id}-${subject}`}>
                      {row.subjects[subject] ? (
                        <span style={{ color: getColor(row.subjects[subject].percentage), fontWeight: 700 }}>
                          {row.subjects[subject].total}
                        </span>
                      ) : "-"}
                    </td>
                  ))}
                  <td><strong style={{ color: getColor(row.overall_percentage) }}>{row.total}/{row.max_total}</strong></td>
                  <td>{row.overall_percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (page === "create") return renderCreate();
  if (page === "marks" && selectedExam) return renderMarks();
  if (page === "results" && selectedExam) return renderResults();
  if (page === "overall" && reviewSummary) return renderOverall();
  return renderList();
}
