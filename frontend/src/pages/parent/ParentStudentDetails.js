import React, { useEffect, useState } from "react";
import API from "../../utils/api";

export default function ParentStudentDetails() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");

  const loadDetails = (childId = "") => {
    setLoading(true);
    API.get(`/parent/student-details${childId ? `?child_id=${childId}` : ""}`)
      .then((response) => {
        setData(response.data);
        setSelectedChildId(String(response.data?.student?.id || ""));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load child details");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDetails();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  const student = data?.student || {};
  const children = data?.children || [];
  const classTeacher = data?.class_teacher;

  const infoRows = [
    { label: "Student ID", value: student.student_id || "-" },
    { label: "Admission No", value: student.admission_no || "-" },
    { label: "Class", value: student.class ? `Class ${student.class}` : "-" },
    { label: "Section", value: student.section ? `Section ${student.section}` : "-" },
    { label: "Roll Number", value: student.roll_no || "-" },
    { label: "Date of Birth", value: student.dob || "-" },
    { label: "Gender", value: student.gender || "-" },
    { label: "Blood Group", value: student.blood_group || "-" },
    { label: "Address", value: student.address || "-" },
    { label: "Parent Name", value: student.parent_name || "-" },
    { label: "Parent Email", value: student.parent_email || "-" },
    { label: "Parent Phone", value: student.parent_phone || "-" },
  ];

  return (
    <div>
      <div className="page-title">Children Details</div>
      <div className="page-sub">Complete child profile shared by the class teacher</div>

      {children.length > 1 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Choose Child</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {children.map((childItem) => (
              <button
                key={childItem.id}
                type="button"
                onClick={() => loadDetails(childItem.id)}
                style={{
                  border: "1px solid #B5D4F4",
                  background: String(childItem.id) === String(selectedChildId) ? "#E6F1FB" : "#fff",
                  color: "#0C447C",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {childItem.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="metric-card">
          <div className="label">Child Name</div>
          <div className="value" style={{ fontSize: 26, color: "#185FA5" }}>{student.name || "-"}</div>
        </div>
        <div className="metric-card">
          <div className="label">Fee Status</div>
          <div className="value" style={{ fontSize: 26, color: student.fee_status === "paid" ? "#0F6E56" : student.fee_status === "partial" ? "#854F0B" : "#A32D2D" }}>
            {student.fee_status || "-"}
          </div>
        </div>
        <div className="metric-card">
          <div className="label">Class Teacher</div>
          <div className="value" style={{ fontSize: 24, color: "#3C3489" }}>{classTeacher?.name || "Not assigned"}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Child Profile</h3>
          {infoRows.slice(0, 8).map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: "10px 0", borderBottom: "1px solid #f0f2f7" }}>
              <span style={{ color: "#777", fontSize: 13 }}>{row.label}</span>
              <strong style={{ textAlign: "right", fontSize: 13 }}>{row.value}</strong>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Parent & Teacher Contact</h3>
          {infoRows.slice(8).map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: "10px 0", borderBottom: "1px solid #f0f2f7" }}>
              <span style={{ color: "#777", fontSize: 13 }}>{row.label}</span>
              <strong style={{ textAlign: "right", fontSize: 13 }}>{row.value}</strong>
            </div>
          ))}

          <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: "#E6F1FB" }}>
            <div style={{ fontSize: 12, color: "#5D7895", marginBottom: 4 }}>Class Teacher Contact</div>
            <div style={{ fontWeight: 700, color: "#0C447C" }}>{classTeacher?.name || "Not assigned"}</div>
            <div style={{ fontSize: 13, color: "#5D7895", marginTop: 4 }}>{classTeacher?.email || "-"}</div>
            <div style={{ fontSize: 13, color: "#5D7895" }}>{classTeacher?.phone || "-"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
