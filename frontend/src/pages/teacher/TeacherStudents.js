import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import PremiumLock from "../../components/PremiumLock";
import PremiumPageHero from "../../components/layout/PremiumPageHero";
import { useAuth } from "../../context/AuthContext";
import { canUseFeature } from "../../lib/planFeatures";
import { buildShareableUrl, isLocalPublicUrl } from "../../lib/publicUrl";
import { GraduationCap, ShieldCheck, Users } from "lucide-react";

const emptyForm = {
  name: "",
  roll_no: "",
  dob: "",
  gender: "",
  blood_group: "",
  address: "",
  parent_name: "",
  parent_email: "",
  parent_phone: "",
  parent_password: "",
};

export default function TeacherStudents() {
  const { user } = useAuth();
  const hasSelfOnboarding = canUseFeature(user?.plan, "selfOnboarding");
  const [dashboard, setDashboard] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingParent, setEditingParent] = useState(false);
  const [editParentForm, setEditParentForm] = useState({ parent_name: "", parent_email: "", parent_phone: "" });
  const [updatingParent, setUpdatingParent] = useState(false);
  const [selectedFeeStudent, setSelectedFeeStudent] = useState(null);
  const [notifyingStudentId, setNotifyingStudentId] = useState(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [feeFilter, setFeeFilter] = useState("");

  const fetchData = () => {
    setLoading(true);
    Promise.all([API.get("/teacher/dashboard"), API.get("/teacher/students"), API.get("/teacher/class-students")])
      .then(([dashboardResponse, studentsResponse, classStudentsResponse]) => {
        setDashboard(dashboardResponse.data);
        setAllStudents(studentsResponse.data || []);
        setClassStudents(classStudentsResponse.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openStudentDetails = (student) => {
    setSelectedStudent(student);
    setEditingParent(false);
    setEditParentForm({
      parent_name: student.parent_name || "",
      parent_email: student.parent_email || "",
      parent_phone: student.parent_phone || "",
    });
  };

  const handleParentEditSave = async () => {
    if (!selectedStudent) return;
    setUpdatingParent(true);
    setMsg("");
    setError("");
    try {
      const response = await API.patch(`/teacher/students/${selectedStudent.id}/parent-details`, editParentForm);
      const updatedStudent = response.data?.student || { ...selectedStudent, ...editParentForm };

      setClassStudents((prev) => prev.map((student) => (student.id === updatedStudent.id ? { ...student, ...updatedStudent } : student)));
      setAllStudents((prev) => prev.map((student) => (student.id === updatedStudent.id ? { ...student, ...updatedStudent } : student)));
      setSelectedStudent(updatedStudent);
      setSelectedFeeStudent((prev) => (prev?.id === updatedStudent.id ? { ...prev, ...updatedStudent } : prev));
      setEditingParent(false);
      setMsg(response.data?.message || "Parent details updated successfully");
      setSelectedStudent(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update parent details");
    } finally {
      setUpdatingParent(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    try {
      await API.post("/teacher/students", form);
      setMsg("Student and parent details saved successfully!");
      setForm(emptyForm);
      setShowAddForm(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add student");
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  const notifyParent = async (student) => {
    setNotifyingStudentId(student.id);
    setMsg("");
    setError("");
    try {
      await API.post("/teacher/notify-fee", { student_id: student.id });
      setMsg(`Fee reminder sent to parent of ${student.name}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to notify parent");
    } finally {
      setNotifyingStudentId(null);
    }
  };

  const handleGenerateInvite = async () => {
    setInviteMsg("");
    setInviteError("");
    setInviteLink("");
    setGeneratingInvite(true);
    try {
      const response = await API.post("/teacher/parent-invite-links");
      const rawLink = response.data?.invite_link || "";
      const fullLink = buildShareableUrl(rawLink);
      await navigator.clipboard.writeText(fullLink);
      setInviteLink(fullLink);
      setInviteMsg("Parent invite link generated and copied.");
    } catch (err) {
      setInviteError(err.response?.data?.message || "Failed to generate parent invite link");
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setInviteMsg("Parent invite link copied again.");
  };

  if (loading) return <div className="loading">Loading...</div>;

  const classTeacherOf = dashboard?.class_teacher_of;
  const classTeacherLabel = classTeacherOf ? classTeacherOf.replace("-", " Section ") : "";
  const studentsToShow = classTeacherOf ? classStudents : [];
  const filteredStudents = studentsToShow.filter((student) => (feeFilter ? student.fee_status === feeFilter : true));
  const getFeeSummary = (student) => {
    const totalFee = Number(student?.total_fee) || 0;
    const paidFee = Number(student?.paid_fee) || 0;
    const remainingFee = Math.max(totalFee - paidFee, 0);
    return { totalFee, paidFee, remainingFee };
  };

  return (
    <div>
      <PremiumPageHero
        icon={<Users size={22} />}
        title="My Students"
        subtitle={classTeacherOf
          ? `You can add full student and parent details for Class ${classTeacherLabel} only.`
          : "Student lists are available only for class teachers."}
        meta={[
          { label: "Class Teacher", value: classTeacherOf ? `Class ${classTeacherLabel}` : "No", icon: <ShieldCheck size={16} />, color: "#0F6E56" },
          { label: "Students", value: String(studentsToShow.length), icon: <GraduationCap size={16} />, color: "#185FA5" },
        ]}
      />

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
                Parent Invite Link
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

      {classTeacherOf ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showAddForm ? 16 : 0 }}>
            <div>
              <h3 style={{ fontWeight: 600, margin: 0 }}>Class {classTeacherLabel} Student Management</h3>
              <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>Add students only when needed. Detailed profile stays inside the view drawer.</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {hasSelfOnboarding ? (
                <button type="button" className="btn-outline" onClick={handleGenerateInvite} disabled={generatingInvite}>
                  {generatingInvite ? "Generating..." : "Generate Link"}
                </button>
              ) : (
                <PremiumLock feature="Parent self-onboarding invite links" compact />
              )}
              <button type="button" className="btn-primary" onClick={() => setShowAddForm((prev) => !prev)}>
                {showAddForm ? "Hide Add Student" : "+ Add Student"}
              </button>
            </div>
          </div>
          {showAddForm && <form onSubmit={handleAddStudent}>
            <div className="grid-3" style={{ marginBottom: 10 }}>
              <div className="form-group">
                <label>Student Name</label>
                <input value={form.name} placeholder="Riya Sharma" required onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Roll Number</label>
                <input value={form.roll_no} placeholder="01" onChange={(e) => setForm({ ...form, roll_no: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Assigned Class</label>
                <input value={`Class ${classTeacherLabel}`} disabled />
              </div>
            </div>

            <div className="grid-3" style={{ marginBottom: 10 }}>
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="">-- Select --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Blood Group</label>
                <select value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })}>
                  <option value="">-- Select --</option>
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((group) => <option key={group} value={group}>{group}</option>)}
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label>Address</label>
                <textarea value={form.address} placeholder="Door no, street, city" onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} />
              </div>
              <div style={{ display: "flex", alignItems: "end", fontSize: 12, color: "#666", paddingBottom: 10 }}>
                Save the profile first. Parents can later see these student details in their portal.
              </div>
            </div>

            <div style={{ background: "#FAF7EC", border: "1px solid #EFD79A", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: "#7A560C", marginBottom: 10 }}>Parent Details</div>
              <div className="grid-3" style={{ marginBottom: 10 }}>
                <div className="form-group">
                  <label>Parent Name</label>
                  <input value={form.parent_name} placeholder="Lakshmi Rajan" onChange={(e) => setForm({ ...form, parent_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Parent Email</label>
                  <input type="email" value={form.parent_email} placeholder="parent@email.com" onChange={(e) => setForm({ ...form, parent_email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Parent Phone</label>
                  <input value={form.parent_phone} placeholder="9876543210" onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Parent Portal Password</label>
                  <input
                    type="password"
                    value={form.parent_password}
                    placeholder="Required if creating new parent account"
                    onChange={(e) => setForm({ ...form, parent_password: e.target.value })}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "end", fontSize: 12, color: "#8A6C31" }}>
                  If the parent email already exists, the student will be linked to that parent account automatically.
                </div>
              </div>
            </div>

            <button className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Student Details"}</button>
          </form>}
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 24, color: "#666" }}>
          Student creation and student lists are available only for class teachers.
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: 600 }}>{classTeacherOf ? `Class ${classTeacherLabel} Students` : "Students"}</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div className="form-group" style={{ margin: 0, minWidth: 180 }}>
              <label>Filter By Fee</label>
              <select value={feeFilter} onChange={(e) => setFeeFilter(e.target.value)}>
                <option value="">-- All Fee Status --</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <span style={{ fontSize: 13, color: "#888" }}>{filteredStudents.length} student(s)</span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Name</th><th>Roll No</th><th>Fee Status</th><th>Fee Action</th><th>Details</th></tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "#888", padding: 24 }}>No students found</td></tr>
              ) : (
                filteredStudents.map((student, index) => (
                  <tr key={student.id}>
                    <td>{index + 1}</td>
                    <td><strong>{student.name}</strong></td>
                    <td>{student.roll_no || "-"}</td>
                    <td>
                      <span className={"badge " + (student.fee_status === "paid" ? "badge-green" : student.fee_status === "partial" ? "badge-amber" : "badge-red")}>
                        {student.fee_status}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="btn-outline" onClick={() => setSelectedFeeStudent(student)}>View Fees</button>
                    </td>
                    <td>
                      <button type="button" className="btn-outline" onClick={() => openStudentDetails(student)}>View Details</button>
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
              width: "min(860px, 100%)",
              maxHeight: "86vh",
              overflowY: "auto",
              background: "#FFFFFF",
              borderRadius: 24,
              padding: 24,
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>{selectedStudent.name} - Personal Details</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {editingParent ? (
                  <>
                    <button type="button" className="btn-outline" onClick={() => {
                      setEditingParent(false);
                      setEditParentForm({
                        parent_name: selectedStudent.parent_name || "",
                        parent_email: selectedStudent.parent_email || "",
                        parent_phone: selectedStudent.parent_phone || "",
                      });
                    }}>
                      Cancel
                    </button>
                    <button type="button" className="btn-primary" onClick={handleParentEditSave} disabled={updatingParent}>
                      {updatingParent ? "Saving..." : "Save Parent Details"}
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn-outline" onClick={() => setSelectedStudent(null)}>Cancel</button>
                    <button type="button" className="btn-outline" onClick={() => setEditingParent(true)}>Edit Parent Details</button>
                  </>
                )}
              </div>
            </div>
            <div className="grid-3">
              {[
                ["Class", selectedStudent.class ? `Class ${selectedStudent.class}` : "-"],
                ["Section", selectedStudent.section ? `Section ${selectedStudent.section}` : "-"],
                ["Roll Number", selectedStudent.roll_no || "-"],
                ["Date of Birth", selectedStudent.dob || "-"],
                ["Gender", selectedStudent.gender || "-"],
                ["Blood Group", selectedStudent.blood_group || "-"],
              ].map(([label, value]) => (
                <div key={label} style={{ background: "#f8f9fc", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 12, color: "#777", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontWeight: 700, color: "#222" }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, background: "#FAF7EC", border: "1px solid #EFD79A", borderRadius: 16, padding: 16 }}>
              <div style={{ fontWeight: 700, color: "#7A560C", marginBottom: 12 }}>Parent Details</div>
              {editingParent ? (
                <div className="grid-3">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Parent Name</label>
                    <input value={editParentForm.parent_name} onChange={(e) => setEditParentForm({ ...editParentForm, parent_name: e.target.value })} placeholder="Parent name" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Parent Email</label>
                    <input type="email" value={editParentForm.parent_email} onChange={(e) => setEditParentForm({ ...editParentForm, parent_email: e.target.value })} placeholder="parent@email.com" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Parent Phone</label>
                    <input value={editParentForm.parent_phone} onChange={(e) => setEditParentForm({ ...editParentForm, parent_phone: e.target.value })} placeholder="9876543210" />
                  </div>
                </div>
              ) : (
                <div className="grid-3">
                  {[
                    ["Parent Name", selectedStudent.parent_name || "-"],
                    ["Parent Email", selectedStudent.parent_email || "-"],
                    ["Parent Phone", selectedStudent.parent_phone || "-"],
                  ].map(([label, value]) => (
                    <div key={label} style={{ background: "#fffdf6", borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 12, color: "#8A6C31", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontWeight: 700, color: "#222" }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: "#fff8e8", color: "#6e5414" }}>
              <strong>Address:</strong> {selectedStudent.address || "-"}
            </div>
          </div>
        </div>
      )}

      {selectedFeeStudent && (
        <div
          onClick={() => setSelectedFeeStudent(null)}
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
              maxHeight: "86vh",
              overflowY: "auto",
              background: "#FFFFFF",
              borderRadius: 24,
              padding: 24,
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700 }}>{selectedFeeStudent.name} - Fee Details</h3>
                <div style={{ color: "#66758C", marginTop: 6 }}>
                  Class {selectedFeeStudent.class}{selectedFeeStudent.section ? ` Section ${selectedFeeStudent.section}` : ""} • Roll {selectedFeeStudent.roll_no || "-"}
                </div>
              </div>
              <button type="button" className="btn-outline" onClick={() => setSelectedFeeStudent(null)}>Close</button>
            </div>

            <div className="grid-3" style={{ marginBottom: 16 }}>
              {[
                ["Fee Status", selectedFeeStudent.fee_status || "-"],
                ["Total Fees", getFeeSummary(selectedFeeStudent).totalFee ? `${getFeeSummary(selectedFeeStudent).totalFee}` : "-"],
                ["Already Paid", getFeeSummary(selectedFeeStudent).paidFee ? `${getFeeSummary(selectedFeeStudent).paidFee}` : "0"],
                ["Remaining", `${getFeeSummary(selectedFeeStudent).remainingFee}`],
                ["Parent Name", selectedFeeStudent.parent_name || "-"],
                ["Parent Email", selectedFeeStudent.parent_email || "-"],
              ].map(([label, value]) => (
                <div key={label} style={{ background: "#f8f9fc", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 12, color: "#777", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontWeight: 700, color: "#222" }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {selectedFeeStudent.fee_status === "paid" ? (
                <span
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "#EAF3DE",
                    color: "#27500A",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  Fee Cleared
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => notifyParent(selectedFeeStudent)}
                  disabled={notifyingStudentId === selectedFeeStudent.id}
                  style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "#FAEEDA", color: "#633806", cursor: "pointer", fontWeight: 700, opacity: notifyingStudentId === selectedFeeStudent.id ? 0.7 : 1 }}
                >
                  {notifyingStudentId === selectedFeeStudent.id ? "Sending..." : "Notify Parent"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
