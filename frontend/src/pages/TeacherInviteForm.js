import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../utils/api";

const emptyAssignment = { class: "", section: "", subject: "" };

export default function TeacherInviteForm() {
  const { token } = useParams();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState({ type: "", text: "" });
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    class_teacher_of: "",
    class_teacher_section: "",
    subjects: [{ ...emptyAssignment }],
  });

  useEffect(() => {
    API.get(`/invite/teacher/${token}`)
      .then((response) => {
        setMeta(response.data);
        setLoading(false);
      })
      .catch((error) => {
        setBanner({ type: "error", text: error.response?.data?.message || "Invite link not found" });
        setLoading(false);
      });
  }, [token]);

  const updateAssignment = (index, field, value) => {
    const next = [...form.subjects];
    next[index] = { ...next[index], [field]: value };
    setForm({ ...form, subjects: next });
  };

  const addAssignment = () => setForm({ ...form, subjects: [...form.subjects, { ...emptyAssignment }] });
  const removeAssignment = (index) => setForm({ ...form, subjects: form.subjects.filter((_, idx) => idx !== index) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setBanner({ type: "", text: "" });
    try {
      await API.post(`/invite/teacher/${token}/submit`, form);
      setSubmitted(true);
    } catch (error) {
      setBanner({ type: "error", text: error.response?.data?.message || "Failed to submit teacher profile" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading invite...</div>;
  if (!meta) {
    return (
      <div className="min-h-screen bg-background px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="alert alert-error">{banner.text || "Invite link is not available"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4 bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-sm font-medium">
            Teacher Onboarding
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ color: "hsl(var(--navy))" }}>
            Join {meta?.school_name || "School"}
          </h1>
          <p className="text-muted-foreground text-lg">
            Fill your teacher profile once. This invite link works for a single submission only.
          </p>
        </div>

        <div className="card">
          {submitted ? (
            <div style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 34, marginBottom: 10 }}>Success</div>
              <div className="page-title" style={{ marginBottom: 10 }}>Teacher profile submitted</div>
              <div className="page-sub" style={{ marginBottom: 18 }}>The school can now review and edit your profile from the dashboard.</div>
              <Link to="/" className="btn-primary" style={{ textDecoration: "none", display: "inline-block" }}>Go to Home</Link>
            </div>
          ) : (
            <>
              {banner.text && <div className={banner.type === "error" ? "alert alert-error" : "alert alert-success"}>{banner.text}</div>}
              <form onSubmit={handleSubmit}>
                <div className="grid-3" style={{ marginBottom: 14 }}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input value={form.name} required placeholder="Teacher name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={form.email} required placeholder="teacher@school.edu" onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" value={form.password} required placeholder="Create password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  </div>
                </div>

                <div style={{ background: "#EAF3DE", border: "1px solid #C0DD97", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: "#27500A", marginBottom: 10 }}>Class Teacher Of</div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Class</label>
                      <select value={form.class_teacher_of} onChange={(e) => setForm({ ...form, class_teacher_of: e.target.value })}>
                        <option value="">-- Not a class teacher --</option>
                        {meta?.meta?.classes?.map((cls) => <option key={cls} value={cls}>Class {cls}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Section</label>
                      <select value={form.class_teacher_section} onChange={(e) => setForm({ ...form, class_teacher_section: e.target.value })}>
                        <option value="">-- Select Section --</option>
                        {meta?.meta?.sections?.map((section) => <option key={section} value={section}>Section {section}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ background: "#E6F1FB", border: "1px solid #B5D4F4", borderRadius: 12, padding: 16, marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0C447C" }}>Handling Classes</div>
                      <div style={{ fontSize: 12, color: "#185FA5" }}>Add every class, section, and subject you handle.</div>
                    </div>
                    <button type="button" className="btn-outline" onClick={addAssignment}>+ Add</button>
                  </div>
                  {form.subjects.map((row, index) => (
                    <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, marginBottom: 10 }}>
                      <select value={row.class} onChange={(e) => updateAssignment(index, "class", e.target.value)} style={{ padding: "9px 10px", borderRadius: 8, border: "1px solid #dde1ea" }}>
                        <option value="">-- Class --</option>
                        {meta?.meta?.classes?.map((cls) => <option key={cls} value={cls}>Class {cls}</option>)}
                      </select>
                      <select value={row.section} onChange={(e) => updateAssignment(index, "section", e.target.value)} style={{ padding: "9px 10px", borderRadius: 8, border: "1px solid #dde1ea" }}>
                        <option value="">-- Section --</option>
                        {meta?.meta?.sections?.map((section) => <option key={section} value={section}>Section {section}</option>)}
                      </select>
                      <select value={row.subject} onChange={(e) => updateAssignment(index, "subject", e.target.value)} style={{ padding: "9px 10px", borderRadius: 8, border: "1px solid #dde1ea" }}>
                        <option value="">-- Subject --</option>
                        {meta?.meta?.subjects?.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                      </select>
                      <button type="button" className="btn-outline" onClick={() => removeAssignment(index)} disabled={form.subjects.length === 1}>Remove</button>
                    </div>
                  ))}
                </div>

                <button className="btn-primary" disabled={saving}>
                  {saving ? "Submitting..." : "Submit Teacher Profile"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
