import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../utils/api";

const emptyChild = {
  name: "",
  class_name: "",
  section: "",
  roll_no: "",
  admission_no: "",
  dob: "",
  gender: "",
  blood_group: "",
  address: "",
};

export default function ParentInviteForm() {
  const { token } = useParams();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [banner, setBanner] = useState({ type: "", text: "" });
  const [form, setForm] = useState({
    parent_name: "",
    parent_email: "",
    parent_phone: "",
    parent_password: "",
    address: "",
    children: [{ ...emptyChild }],
  });

  useEffect(() => {
    API.get(`/invite/parent/${token}`)
      .then((response) => {
        setMeta(response.data);
        setLoading(false);
      })
      .catch((error) => {
        setBanner({ type: "error", text: error.response?.data?.message || "Invite link not found" });
        setLoading(false);
      });
  }, [token]);

  const updateChild = (index, field, value) => {
    const nextChildren = [...form.children];
    nextChildren[index] = { ...nextChildren[index], [field]: value };
    setForm({ ...form, children: nextChildren });
  };

  const addChild = () => setForm({ ...form, children: [...form.children, { ...emptyChild }] });
  const removeChild = (index) => setForm({ ...form, children: form.children.filter((_, idx) => idx !== index) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setBanner({ type: "", text: "" });
    try {
      await API.post(`/invite/parent/${token}/submit`, form);
      setSubmitted(true);
    } catch (error) {
      setBanner({ type: "error", text: error.response?.data?.message || "Failed to submit parent details" });
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
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4 bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-sm font-medium">
            Parent & Student Onboarding
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ color: "hsl(var(--navy))" }}>
            Complete Your Family Profile
          </h1>
          <p className="text-muted-foreground text-lg">
            Fill your parent details and add one or more children. This invite link works only once.
          </p>
        </div>

        <div className="card">
          {submitted ? (
            <div style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 34, marginBottom: 10 }}>Success</div>
              <div className="page-title" style={{ marginBottom: 10 }}>Profile submitted</div>
              <div className="page-sub" style={{ marginBottom: 18 }}>Your details were saved successfully. The school can now review them in the dashboard.</div>
              <Link to="/" className="btn-primary" style={{ textDecoration: "none", display: "inline-block" }}>Go to Home</Link>
            </div>
          ) : (
            <>
              {banner.text && <div className={banner.type === "error" ? "alert alert-error" : "alert alert-success"}>{banner.text}</div>}
              <form onSubmit={handleSubmit}>
                <div style={{ background: "#FAF7EC", border: "1px solid #EFD79A", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: "#7A560C", marginBottom: 10 }}>Parent Details</div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Parent Name</label>
                      <input value={form.parent_name} required placeholder="Parent full name" onChange={(e) => setForm({ ...form, parent_name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Parent Email</label>
                      <input type="email" value={form.parent_email} required placeholder="parent@email.com" onChange={(e) => setForm({ ...form, parent_email: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid-3">
                    <div className="form-group">
                      <label>Phone</label>
                      <input value={form.parent_phone} placeholder="9876543210" onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Password</label>
                      <input type="password" value={form.parent_password} required placeholder="Create parent portal password" onChange={(e) => setForm({ ...form, parent_password: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Address</label>
                      <input value={form.address} placeholder="Street, area, city" onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div style={{ background: "#E6F1FB", border: "1px solid #B5D4F4", borderRadius: 12, padding: 16, marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0C447C" }}>Children</div>
                      <div style={{ fontSize: 12, color: "#185FA5" }}>Add all children studying in the school.</div>
                    </div>
                    <button type="button" className="btn-outline" onClick={addChild}>+ Add Child</button>
                  </div>

                  {form.children.map((child, index) => (
                    <div key={index} style={{ background: "#fff", borderRadius: 12, border: "1px solid #D7E7FF", padding: 16, marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, color: "#122B4A" }}>Child {index + 1}</div>
                        <button type="button" className="btn-outline" onClick={() => removeChild(index)} disabled={form.children.length === 1}>Remove</button>
                      </div>
                      <div className="grid-3">
                        <div className="form-group">
                          <label>Student Name</label>
                          <input value={child.name} required placeholder="Student name" onChange={(e) => updateChild(index, "name", e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>Class</label>
                          <select value={child.class_name} required onChange={(e) => updateChild(index, "class_name", e.target.value)}>
                            <option value="">-- Class --</option>
                            {meta?.meta?.classes?.map((cls) => <option key={cls} value={cls}>Class {cls}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Section</label>
                          <select value={child.section} onChange={(e) => updateChild(index, "section", e.target.value)}>
                            <option value="">-- Section --</option>
                            {meta?.meta?.sections?.map((section) => <option key={section} value={section}>Section {section}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid-3">
                        <div className="form-group">
                          <label>Roll Number</label>
                          <input value={child.roll_no} placeholder="01" onChange={(e) => updateChild(index, "roll_no", e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>Admission Number</label>
                          <input value={child.admission_no} placeholder="ADM-001" onChange={(e) => updateChild(index, "admission_no", e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>Date of Birth</label>
                          <input type="date" value={child.dob} onChange={(e) => updateChild(index, "dob", e.target.value)} />
                        </div>
                      </div>

                      <div className="grid-3">
                        <div className="form-group">
                          <label>Gender</label>
                          <select value={child.gender} onChange={(e) => updateChild(index, "gender", e.target.value)}>
                            <option value="">-- Select --</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Blood Group</label>
                          <select value={child.blood_group} onChange={(e) => updateChild(index, "blood_group", e.target.value)}>
                            <option value="">-- Select --</option>
                            {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((group) => <option key={group} value={group}>{group}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Address</label>
                          <input value={child.address} placeholder="Optional child-specific address" onChange={(e) => updateChild(index, "address", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="btn-primary" disabled={saving}>
                  {saving ? "Submitting..." : "Submit Parent & Children Details"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
