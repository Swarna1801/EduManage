import React, { useEffect, useMemo, useState } from "react";
import PremiumLock from "../../components/PremiumLock";
import { useAuth } from "../../context/AuthContext";
import { canUseFeature } from "../../lib/planFeatures";
import { buildShareableUrl, isLocalPublicUrl } from "../../lib/publicUrl";
import API from "../../utils/api";

const SUBJECTS = ["Mathematics", "Science", "English", "Social Studies", "Tamil", "Hindi", "Physics", "Chemistry", "Biology", "History", "Geography", "Computer Science"];
const SECTIONS = ["A", "B", "C", "D", "E"];
const CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const createEmptyForm = () => ({
  name: "",
  email: "",
  password: "",
  class_teacher_of: "",
  class_teacher_section: "",
  subjects: [{ class: "", section: "", subject: "" }],
});

export default function ManageTeachers() {
  const { user } = useAuth();
  const hasSelfOnboarding = canUseFeature(user?.plan, "selfOnboarding");
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState(createEmptyForm());
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [viewMode, setViewMode] = useState("browse");
  const [activeClass, setActiveClass] = useState("1");
  const [browseSearch, setBrowseSearch] = useState("");
  const [browseSubjectFilter, setBrowseSubjectFilter] = useState("");
  const [browseSectionFilter, setBrowseSectionFilter] = useState("");

  const fetchTeachers = () => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (subjectFilter) params.append("subject", subjectFilter);
    API.get("/principal/teachers?" + params).then((r) => setTeachers(r.data)).catch((e) => console.log(e));
  };

  useEffect(() => {
    fetchTeachers();
  }, [search, subjectFilter]);

  const resetFormState = () => {
    setForm(createEmptyForm());
    setEditingTeacherId(null);
    setShowForm(false);
  };

  const addSubjectRow = () => setForm({ ...form, subjects: [...form.subjects, { class: "", section: "", subject: "" }] });
  const removeSubjectRow = (index) => setForm({ ...form, subjects: form.subjects.filter((_, idx) => idx !== index) });

  const updateSubjectRow = (index, field, value) => {
    const updated = [...form.subjects];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, subjects: updated });
  };

  const parseSection = (sectionStr) => {
    try {
      return JSON.parse(sectionStr);
    } catch {
      return null;
    }
  };

  const buildPayload = () => {
    const validSubjects = form.subjects.filter((subject) => subject.class && subject.subject);
    const sectionData = JSON.stringify({
      class_teacher_of: form.class_teacher_of ? form.class_teacher_of + (form.class_teacher_section ? "-" + form.class_teacher_section : "") : "",
      subjects: validSubjects,
    });

    const payload = {
      name: form.name,
      email: form.email,
      subject: validSubjects[0]?.subject || "",
      section: sectionData,
      teacher_type: form.class_teacher_of ? "class_teacher" : "subject_teacher",
    };

    if (form.password) payload.password = form.password;
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");

    try {
      const payload = buildPayload();
      if (editingTeacherId) {
        await API.patch("/principal/teachers/" + editingTeacherId, payload);
        setMsg("Teacher updated successfully!");
      } else {
        await API.post("/principal/teachers", payload);
        setMsg("Teacher added successfully!");
      }
      resetFormState();
      fetchTeachers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm("Delete teacher " + name + "?")) return;
    try {
      await API.delete("/principal/teachers/" + id);
      setMsg("Teacher deleted");
      fetchTeachers();
    } catch (err) {
      setError("Failed to delete");
    }
  };

  const handleEdit = (teacher) => {
    const parsed = parseSection(teacher.section);
    const classTeacherParts = parsed?.class_teacher_of ? parsed.class_teacher_of.split("-") : ["", ""];
    const parsedSubjects = parsed?.subjects?.filter((subject) => subject.class && subject.subject) || [];

    setForm({
      name: teacher.name || "",
      email: teacher.email || "",
      password: "",
      class_teacher_of: classTeacherParts[0] || "",
      class_teacher_section: classTeacherParts[1] || "",
      subjects: parsedSubjects.length ? parsedSubjects : [{ class: "", section: "", subject: teacher.subject || "" }],
    });
    setEditingTeacherId(teacher.id);
    setShowForm(true);
    setMsg("");
    setError("");
  };

  const handleGenerateInvite = async () => {
    setInviteMsg("");
    setInviteError("");
    setInviteLink("");
    setGeneratingInvite(true);
    try {
      const response = await API.post("/principal/teacher-invite-links");
      const rawLink = response.data?.invite_link || "";
      const fullLink = buildShareableUrl(rawLink);
      await navigator.clipboard.writeText(fullLink);
      setInviteLink(fullLink);
      setInviteMsg("Teacher invite link generated and copied.");
    } catch (err) {
      setInviteError(err.response?.data?.message || "Failed to generate teacher invite link");
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setInviteMsg("Teacher invite link copied again.");
  };

  const subjects = [...new Set(teachers.map((teacher) => teacher.subject).filter(Boolean))];
  const filtered = typeFilter ? teachers.filter((teacher) => teacher.teacher_type === typeFilter) : teachers;
  const classCounts = useMemo(() => {
    const counts = Object.fromEntries(CLASSES.map((cls) => [cls, 0]));
    teachers.forEach((teacher) => {
      const parsed = parseSection(teacher.section);
      const assignments = parsed?.subjects?.filter((subject) => subject.class && subject.subject) || [];
      const handledClasses = new Set(assignments.map((subject) => subject.class));
      if (parsed?.class_teacher_of) {
        handledClasses.add(String(parsed.class_teacher_of).split("-")[0]);
      }
      handledClasses.forEach((cls) => {
        if (counts[cls] !== undefined) counts[cls] += 1;
      });
    });
    return counts;
  }, [teachers]);

  const classTeacherAssignments = useMemo(
    () =>
      teachers
        .map((teacher) => {
          const parsed = parseSection(teacher.section);
          const classTeacherValue = parsed?.class_teacher_of || "";
          const [assignedClass, assignedSection] = classTeacherValue ? classTeacherValue.split("-") : ["", ""];
          if (assignedClass !== activeClass) return null;
          return {
            id: `${teacher.id}-class-teacher`,
            type: "Class Teacher",
            subject: "Class Teacher",
            section: assignedSection || "-",
            teacherName: teacher.name,
            email: teacher.email,
            teacherId: teacher.user_id,
          };
        })
        .filter(Boolean),
    [teachers, activeClass]
  );

  const subjectTeacherAssignments = useMemo(
    () =>
      teachers
        .flatMap((teacher) => {
          const parsed = parseSection(teacher.section);
          const assignments = parsed?.subjects?.filter((subject) => subject.class && subject.subject) || [];
          return assignments
            .filter((subject) => subject.class === activeClass)
            .map((subject, index) => ({
              id: `${teacher.id}-${subject.subject}-${subject.section || "na"}-${index}`,
              type: "Subject Teacher",
              subject: subject.subject,
              section: subject.section || "-",
              teacherName: teacher.name,
              email: teacher.email,
              teacherId: teacher.user_id,
            }));
        })
        .sort((left, right) => `${left.subject}-${left.section}-${left.teacherName}`.localeCompare(`${right.subject}-${right.section}-${right.teacherName}`)),
    [teachers, activeClass]
  );

  const classTeacherSections = classTeacherAssignments.map((item) => item.section).filter((section) => section && section !== "-");
  const browseSubjects = [...new Set(subjectTeacherAssignments.map((item) => item.subject).filter(Boolean))].sort();
  const browseSections = [...new Set([...classTeacherAssignments, ...subjectTeacherAssignments].map((item) => item.section).filter((section) => section && section !== "-"))].sort();
  const normalizedBrowseSearch = browseSearch.trim().toLowerCase();
  const filteredClassTeacherAssignments = classTeacherAssignments.filter((item) => {
    if (browseSectionFilter && item.section !== browseSectionFilter) return false;
    if (normalizedBrowseSearch && !`${item.teacherName} ${item.email} ${item.teacherId}`.toLowerCase().includes(normalizedBrowseSearch)) return false;
    return true;
  });
  const filteredSubjectTeacherAssignments = subjectTeacherAssignments.filter((item) => {
    if (browseSubjectFilter && item.subject !== browseSubjectFilter) return false;
    if (browseSectionFilter && item.section !== browseSectionFilter) return false;
    if (normalizedBrowseSearch && !`${item.subject} ${item.teacherName} ${item.email} ${item.teacherId}`.toLowerCase().includes(normalizedBrowseSearch)) return false;
    return true;
  });
  const filteredRecordCount = filteredClassTeacherAssignments.length + filteredSubjectTeacherAssignments.length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          {viewMode === "manage" && (
            <div style={{ marginBottom: 10 }}>
              <button className="btn-outline" onClick={() => { setViewMode("browse"); setShowForm(false); setEditingTeacherId(null); }}>
                Back To Class View
              </button>
            </div>
          )}
          <div className="page-title">Teachers</div>
          <div className="page-sub">
            {viewMode === "browse"
              ? `Browse class-wise teachers from Class 1 to Class 12 and then open full management when needed.`
              : `${teachers.length} teacher(s) registered`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          {viewMode === "browse" ? (
            <button className="btn-primary" onClick={() => setViewMode("manage")}>
              Manage Teachers
            </button>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 6, width: 156 }}>
                {!hasSelfOnboarding && <PremiumLock feature="Teacher self-onboarding invite links" compact />}
                <button
                  type="button"
                  className="btn-outline"
                  onClick={hasSelfOnboarding ? handleGenerateInvite : undefined}
                  disabled={!hasSelfOnboarding || generatingInvite}
                  title={!hasSelfOnboarding ? "Upgrade to Premium to unlock teacher self-onboarding invite links" : ""}
                  style={!hasSelfOnboarding ? { opacity: 0.65, cursor: "not-allowed", width: "100%", justifyContent: "center" } : { width: "100%", justifyContent: "center" }}
                >
                  {generatingInvite ? "Generating..." : "Generate Link"}
                </button>
              </div>
              <button
                className="btn-primary"
                onClick={() => {
                  if (showForm) {
                    resetFormState();
                  } else {
                    setShowForm(true);
                    setEditingTeacherId(null);
                    setForm(createEmptyForm());
                    setMsg("");
                    setError("");
                  }
                }}
              >
                {showForm ? "Cancel" : "+ Add Teacher"}
              </button>
            </>
          )}
        </div>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {inviteMsg && <div className="alert alert-success">{inviteMsg}</div>}
      {inviteError && <div className="alert alert-error">{inviteError}</div>}
      {inviteLink && (
        <div className="card" style={{ marginBottom: 18 }}>
          {isLocalPublicUrl() && (
            <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "#FFF8E8", border: "1px solid #F5D36A", color: "#8A5A00", fontSize: 12 }}>
              This link currently uses `localhost`, so it may not open properly from WhatsApp on another device. Set `REACT_APP_PUBLIC_APP_URL` to your deployed domain or tunnel URL.
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#185FA5", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Teacher Invite Link
              </div>
              <a
                href={inviteLink}
                target="_blank"
                rel="noreferrer"
                style={{ display: "block", width: "100%", padding: "11px 12px", borderRadius: 10, border: "1px solid #D7E7FF", background: "#F8FBFF", fontSize: 13, color: "#185FA5", textDecoration: "underline", wordBreak: "break-all" }}
              >
                {inviteLink}
              </a>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a href={inviteLink} target="_blank" rel="noreferrer" className="btn-outline" style={{ textDecoration: "none" }}>Open</a>
              <button type="button" className="btn-primary" onClick={handleCopyInvite}>Copy</button>
            </div>
          </div>
        </div>
      )}

      {viewMode === "browse" ? (
        <>
          <div className="card" style={{ marginBottom: 22, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#66758C", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  Browse By Class
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#102542", marginBottom: 6 }}>
                  Class Teacher Map
                </div>
                <div style={{ color: "#66758C", maxWidth: 760 }}>
                  Pick a class card first. The page will show the subject-handling teachers for that class below.
                </div>
              </div>
              <div style={{ minWidth: 200, padding: "12px 14px", borderRadius: 14, background: "linear-gradient(180deg, #F8FBFF 0%, #EEF5FF 100%)", border: "1px solid #DCE8F7" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, color: "#73839A" }}>Current View</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#185FA5", marginTop: 4 }}>Class {activeClass}</div>
                <div style={{ color: "#66758C", marginTop: 2, fontSize: 13 }}>
                  {classCounts[activeClass] || 0} teacher assignment(s)
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
              {CLASSES.map((cls) => {
                const active = activeClass === cls;
                return (
                  <button
                    key={cls}
                    onClick={() => setActiveClass(cls)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: active ? "1.5px solid #185FA5" : "1px solid #DCE5F0",
                      background: active ? "linear-gradient(180deg, #ECF5FF 0%, #E3F0FF 100%)" : "#FFFFFF",
                      color: active ? "#185FA5" : "#1F2E43",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 800 }}>Class {cls}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: active ? "#185FA5" : "#6E7D92", marginTop: 4 }}>
                      {classCounts[cls] || 0} teacher(s)
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: 20, color: "#102542" }}>Class {activeClass} Teachers</h3>
                <div style={{ color: "#66758C", marginTop: 6 }}>
                  Subject teachers handling Class {activeClass}{classTeacherSections.length ? ` and class teacher sections ${classTeacherSections.join(", ")}` : ""}.
                </div>
              </div>
              <span style={{ fontSize: 13, color: "#66758C", fontWeight: 700, padding: "8px 12px", borderRadius: 999, background: "#F7FAFD", border: "1px solid #E4EBF5" }}>
                {filteredRecordCount} record(s)
              </span>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 220 }}>
                <label>Search</label>
                <input placeholder="Search teacher or subject..." value={browseSearch} onChange={(e) => setBrowseSearch(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0, minWidth: 180 }}>
                <label>Filter by subject</label>
                <select value={browseSubjectFilter} onChange={(e) => setBrowseSubjectFilter(e.target.value)}>
                  <option value="">-- All Subjects --</option>
                  {browseSubjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, minWidth: 180 }}>
                <label>Filter by section</label>
                <select value={browseSectionFilter} onChange={(e) => setBrowseSectionFilter(e.target.value)}>
                  <option value="">-- All Sections --</option>
                  {browseSections.map((section) => <option key={section} value={section}>Section {section}</option>)}
                </select>
              </div>
              {(browseSearch || browseSubjectFilter || browseSectionFilter) && (
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    className="btn-outline"
                    onClick={() => {
                      setBrowseSearch("");
                      setBrowseSubjectFilter("");
                      setBrowseSectionFilter("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {filteredClassTeacherAssignments.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#66758C", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  Class Teachers
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 300px))", gap: 10 }}>
                  {filteredClassTeacherAssignments.map((assignment) => (
                    <div key={assignment.id} style={{ border: "1px solid #E4EBF5", borderRadius: 14, padding: 14, background: "#FAFCFF" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#73839A", textTransform: "uppercase", letterSpacing: 0.7 }}>{assignment.type}</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#102542", marginTop: 6 }}>{assignment.teacherName}</div>
                        </div>
                        <span className="badge badge-green">Sec {assignment.section}</span>
                      </div>
                      <div style={{ marginTop: 8, color: "#66758C", fontSize: 12 }}>{assignment.email}</div>
                      <div style={{ marginTop: 4, color: "#66758C", fontSize: 11 }}>ID: {assignment.teacherId}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#66758C", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>
                Subject Handling Teachers
              </div>
              {filteredSubjectTeacherAssignments.length === 0 ? (
                <div style={{ textAlign: "center", color: "#888", padding: 28, border: "1px solid #E4EBF5", borderRadius: 16 }}>
                  No teachers match the current filters for Class {activeClass}.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 300px))", gap: 10 }}>
                  {filteredSubjectTeacherAssignments.map((assignment) => (
                    <div key={assignment.id} style={{ border: "1px solid #E4EBF5", borderRadius: 14, padding: 14, background: "#FFFFFF" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#73839A", textTransform: "uppercase", letterSpacing: 0.7 }}>{assignment.type}</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#102542", marginTop: 6 }}>{assignment.subject}</div>
                        </div>
                        <span className="badge badge-blue">Sec {assignment.section}</span>
                      </div>
                      <div style={{ marginTop: 10, fontWeight: 700, fontSize: 14, color: "#122B4A" }}>{assignment.teacherName}</div>
                      <div style={{ marginTop: 4, color: "#66758C", fontSize: 12 }}>{assignment.email}</div>
                      <div style={{ marginTop: 4, color: "#66758C", fontSize: 11 }}>ID: {assignment.teacherId}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>{editingTeacherId ? "Edit Teacher" : "Add New Teacher"}</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid-3" style={{ marginBottom: 4 }}>
              <div className="form-group">
                <label>Full Name</label>
                <input value={form.name} placeholder="Ms. Priya Kumar" required onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} placeholder="teacher@school.edu" required onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={form.password}
                  placeholder={editingTeacherId ? "Leave blank to keep current password" : "Temp password"}
                  required={!editingTeacherId}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>

            <div style={{ background: "#EAF3DE", border: "1px solid #C0DD97", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#27500A", marginBottom: 10 }}>
                Class Teacher Assignment <span style={{ fontWeight: 400, color: "#3B6D11", fontSize: 11 }}>(optional - a teacher can be class teacher of only one class)</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: "#3B6D11", display: "block", marginBottom: 4 }}>Class Teacher of Standard</label>
                  <select
                    value={form.class_teacher_of}
                    onChange={(e) => setForm({ ...form, class_teacher_of: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 8, border: "1.5px solid #C0DD97", background: "#fff" }}
                  >
                    <option value="">-- Not a class teacher --</option>
                    {CLASSES.map((cls) => <option key={cls} value={cls}>Class {cls}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: "#3B6D11", display: "block", marginBottom: 4 }}>Section</label>
                  <select
                    value={form.class_teacher_section}
                    onChange={(e) => setForm({ ...form, class_teacher_section: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 8, border: "1.5px solid #C0DD97", background: "#fff" }}
                  >
                    <option value="">-- Select Section --</option>
                    {SECTIONS.map((section) => <option key={section} value={section}>Section {section}</option>)}
                  </select>
                </div>
              </div>
              {form.class_teacher_of && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#27500A" }}>
                  This teacher is Class Teacher of: <strong>Class {form.class_teacher_of}{form.class_teacher_section ? " - Section " + form.class_teacher_section : ""}</strong>
                </div>
              )}
            </div>

            <div style={{ background: "#E6F1FB", border: "1px solid #B5D4F4", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#0C447C" }}>Subjects Taught</div>
                  <div style={{ fontSize: 11, color: "#185FA5", marginTop: 2 }}>Add each class + section + subject this teacher handles</div>
                </div>
                <button
                  type="button"
                  onClick={addSubjectRow}
                  style={{ padding: "5px 14px", fontSize: 12, borderRadius: 6, border: "1.5px solid #185FA5", background: "#fff", color: "#185FA5", cursor: "pointer", fontWeight: 500 }}
                >
                  + Add Row
                </button>
              </div>

              <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", border: "1px solid #B5D4F4" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 0, background: "#f0f7ff", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#0C447C" }}>
                  <span>Standard</span>
                  <span>Section</span>
                  <span>Subject</span>
                  <span></span>
                </div>
                {form.subjects.map((row, index) => (
                  <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, padding: "10px 12px", borderTop: "1px solid #E6F1FB", alignItems: "center" }}>
                    <select value={row.class} onChange={(e) => updateSubjectRow(index, "class", e.target.value)} style={{ padding: "7px 8px", fontSize: 12, borderRadius: 6, border: "1px solid #dde1ea", background: "#fff" }}>
                      <option value="">-- Class --</option>
                      {CLASSES.map((cls) => <option key={cls} value={cls}>Class {cls}</option>)}
                    </select>
                    <select value={row.section} onChange={(e) => updateSubjectRow(index, "section", e.target.value)} style={{ padding: "7px 8px", fontSize: 12, borderRadius: 6, border: "1px solid #dde1ea", background: "#fff" }}>
                      <option value="">-- Section --</option>
                      {SECTIONS.map((section) => <option key={section} value={section}>Section {section}</option>)}
                    </select>
                    <select value={row.subject} onChange={(e) => updateSubjectRow(index, "subject", e.target.value)} style={{ padding: "7px 8px", fontSize: 12, borderRadius: 6, border: "1px solid #dde1ea", background: "#fff" }}>
                      <option value="">-- Subject --</option>
                      {SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                    </select>
                    {form.subjects.length > 1 ? (
                      <button type="button" onClick={() => removeSubjectRow(index)} style={{ padding: "5px 10px", fontSize: 11, borderRadius: 5, border: "none", background: "#FCEBEB", color: "#791F1F", cursor: "pointer" }}>Remove</button>
                    ) : (
                      <span></span>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#185FA5", marginTop: 8 }}>
                Example: Class 10 / Sec A / Maths - Class 9 / Sec B / Science - Class 8 / Sec A / Maths
              </div>
            </div>

            <button className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? (editingTeacherId ? "Saving..." : "Adding...") : (editingTeacherId ? "Save Changes" : "Add Teacher")}
            </button>
          </form>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 180 }}>
          <label>Search</label>
          <input placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0, minWidth: 160 }}>
          <label>Filter by subject</label>
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="">-- All Subjects --</option>
            {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, minWidth: 160 }}>
          <label>Filter by type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">-- All Types --</option>
            <option value="class_teacher">Class Teacher</option>
            <option value="subject_teacher">Subject Teacher</option>
          </select>
        </div>
        {(search || subjectFilter || typeFilter) && (
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn-outline" onClick={() => { setSearch(""); setSubjectFilter(""); setTypeFilter(""); }}>Clear</button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Name</th><th>Email</th><th>Class Teacher of</th><th>Subjects & Classes</th><th>Joined</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: "center", color: "#888", padding: 24 }}>No teachers found</td></tr>
                : filtered.map((teacher, index) => {
                    const parsed = parseSection(teacher.section);
                    const parsedSubjects = parsed?.subjects?.filter((subject) => subject.class && subject.subject) || [];
                    return (
                      <tr key={teacher.id}>
                        <td>{index + 1}</td>
                        <td><strong>{teacher.name}</strong></td>
                        <td style={{ fontSize: 12 }}>{teacher.email}</td>
                        <td>
                          {parsed?.class_teacher_of
                            ? <span className="badge badge-green">Class {parsed.class_teacher_of.replace("-", " Sec ")}</span>
                            : <span style={{ color: "#aaa", fontSize: 12 }}>-</span>}
                        </td>
                        <td>
                          {parsedSubjects.length > 0
                            ? parsedSubjects.map((subject, subjectIndex) => (
                                <div key={subjectIndex} style={{ fontSize: 11, marginBottom: 2 }}>
                                  <span className="badge badge-blue" style={{ marginRight: 4 }}>Class {subject.class}{subject.section ? " " + subject.section : ""}</span>
                                  <span style={{ color: "#555" }}>{subject.subject}</span>
                                </div>
                              ))
                            : (teacher.subject ? <span className="badge badge-blue">{teacher.subject}</span> : <span style={{ color: "#aaa" }}>-</span>)}
                        </td>
                        <td>{new Date(teacher.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <button onClick={() => handleEdit(teacher)} style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6, border: "1px solid #B5D4F4", background: "#E6F1FB", color: "#185FA5", cursor: "pointer" }}>Edit</button>
                            <button onClick={() => handleDelete(teacher.id, teacher.name)} style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6, border: "none", background: "#FCEBEB", color: "#791F1F", cursor: "pointer" }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
