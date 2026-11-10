import React, { useEffect, useState } from "react";
import API from "../../utils/api";

export default function ParentFees() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingStudentId, setPayingStudentId] = useState(null);
  const [payAmounts, setPayAmounts] = useState({});
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    API.get("/parent/dashboard")
      .then((response) => {
        const kids = response.data.children || (response.data.child ? [response.data.child] : []);
        const normalizedKids = kids.filter(Boolean);
        setChildren(normalizedKids);
        setPayAmounts(
          normalizedKids.reduce((acc, child) => {
            acc[child.id] = child.remaining_fee > 0 ? String(child.remaining_fee) : "";
            return acc;
          }, {})
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const feeColor = { paid: "#EAF3DE", pending: "#FCEBEB", partial: "#FAEEDA" };
  const feeText = { paid: "#27500A", pending: "#791F1F", partial: "#633806" };
  const feeIcon = { paid: "Rs", pending: "Rs", partial: "Rs" };

  const refreshPaymentInput = (student) => {
    setPayAmounts((prev) => ({
      ...prev,
      [student.id]: student.remaining_fee > 0 ? String(student.remaining_fee) : "",
    }));
  };

  const handlePay = async (student) => {
    const amount = Number(payAmounts[student.id]);
    setMsg("");
    setError("");

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    setPayingStudentId(student.id);
    try {
      const response = await API.post("/parent/fees/pay", {
        student_id: student.id,
        amount,
      });
      const updatedStudent = response.data.student;
      setChildren((prev) => prev.map((item) => (item.id === updatedStudent.id ? updatedStudent : item)));
      refreshPaymentInput(updatedStudent);
      setMsg(response.data.message || "Payment recorded successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record payment");
    } finally {
      setPayingStudentId(null);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="page-title">Fee Status</div>
      <div className="page-sub">Track total fees, paid amounts, remaining balance, and payment history.</div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {children.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#888" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>Rs</div>
          <div>No children linked to your account.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 16 }}>
          {children.map((child) => (
            <div key={child.id} className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{child.name}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                    Class {child.class}
                    {child.section ? ` - Section ${child.section}` : ""}
                    {" "}
                    · Roll {child.roll_no || "-"}
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>ID: {child.student_id}</div>
                </div>
                <div style={{ fontSize: 32 }}>{feeIcon[child.fee_status] || "Rs"}</div>
              </div>

              <div style={{ background: feeColor[child.fee_status] || "#F5F6FA", borderRadius: 10, padding: "16px 20px", marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: feeText[child.fee_status] || "#888", marginBottom: 4 }}>Current Fee Status</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: feeText[child.fee_status] || "#333", textTransform: "capitalize" }}>
                  {child.fee_status}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, marginBottom: 12 }}>
                <div style={{ background: "#F8FBFF", border: "1px solid #DCE9FA", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#6E7F99", marginBottom: 4 }}>Total Fees</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>Rs {child.total_fee || 0}</div>
                </div>
                <div style={{ background: "#F4FBF3", border: "1px solid #D7EFD2", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#5F7A55", marginBottom: 4 }}>Already Paid</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#27500A" }}>Rs {child.paid_fee || 0}</div>
                </div>
                <div style={{ background: "#FFF8EE", border: "1px solid #F3DFC0", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#8A6C31", marginBottom: 4 }}>Remaining</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#633806" }}>Rs {child.remaining_fee || 0}</div>
                </div>
              </div>

              <div style={{ marginBottom: 12, border: "1px solid #EEF1F5", borderRadius: 10, padding: 14, background: "#fff" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#66758C", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  Payment History
                </div>
                {Array.isArray(child.fee_payment_history) && child.fee_payment_history.length > 0 ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {child.fee_payment_history.slice().reverse().map((payment, index) => (
                      <div
                        key={`${child.id}-${index}`}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FBFF", borderRadius: 8, padding: "10px 12px", gap: 12 }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>Rs {payment.amount}</div>
                          <div style={{ fontSize: 11, color: "#78879C" }}>{payment.note || "Payment recorded"}</div>
                        </div>
                        <div style={{ fontSize: 11, color: "#78879C", textAlign: "right" }}>
                          {payment.paid_at ? new Date(payment.paid_at).toLocaleString() : "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#888" }}>No payments recorded yet.</div>
                )}
              </div>

              {child.fee_status === "paid" && (
                <div style={{ fontSize: 13, color: "#0F6E56", padding: "10px 14px", background: "#EAF3DE", borderRadius: 8 }}>
                  All fees are paid. Thank you!
                </div>
              )}
              {child.fee_status === "pending" && (
                <div style={{ fontSize: 13, color: "#791F1F", padding: "10px 14px", background: "#FCEBEB", borderRadius: 8 }}>
                  Fee payment is pending. Please clear the dues below.
                </div>
              )}
              {child.fee_status === "partial" && (
                <div style={{ fontSize: 13, color: "#633806", padding: "10px 14px", background: "#FAEEDA", borderRadius: 8 }}>
                  Partial payment received. Please clear the remaining dues.
                </div>
              )}

              {Number(child.remaining_fee) > 0 && (
                <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 170px" }}>
                    <div style={{ fontSize: 12, color: "#66758C", marginBottom: 6 }}>Pay Amount</div>
                    <input
                      type="number"
                      min="1"
                      max={child.remaining_fee}
                      value={payAmounts[child.id] || ""}
                      onChange={(e) => setPayAmounts((prev) => ({ ...prev, [child.id]: e.target.value }))}
                      style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: "1px solid #D7E7FF", background: "#F8FBFF" }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={payingStudentId === child.id}
                    onClick={() => handlePay(child)}
                  >
                    {payingStudentId === child.id ? "Paying..." : "Pay"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
