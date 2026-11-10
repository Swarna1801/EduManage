import React from "react";
import { Crown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function PremiumPageHero({ icon, title, subtitle, badge, meta = [] }) {
  const { user } = useAuth();
  const resolvedBadge = badge || (user?.plan === "premium" ? "Premium Workspace" : "Basic Workspace");

  return (
    <div
      style={{
        marginBottom: 22,
        borderRadius: 24,
        padding: "24px 26px",
        background: "radial-gradient(circle at top left, rgba(255,245,219,0.96) 0%, rgba(255,255,255,0.98) 36%, rgba(235,244,255,0.96) 100%)",
        border: "1px solid #E4EBF5",
        boxShadow: "0 20px 45px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 999, background: "#FFFFFFCC", border: "1px solid #E7EDF5", color: "#8A5409", fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
        <Crown size={14} />
        {resolvedBadge}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 520px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            {icon && (
              <div style={{ width: 46, height: 46, borderRadius: 16, background: "#FFFFFFCC", border: "1px solid #E7EDF5", display: "flex", alignItems: "center", justifyContent: "center", color: "#1E63D1", flexShrink: 0 }}>
                {icon}
              </div>
            )}
            <div className="page-title" style={{ margin: 0 }}>{title}</div>
          </div>
          {subtitle && <div className="page-sub" style={{ maxWidth: 760, fontSize: 15, lineHeight: 1.7 }}>{subtitle}</div>}
        </div>

        {meta.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "stretch", flex: "1 1 340px", justifyContent: "flex-end" }}>
            {meta.map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 16, background: "#FFFFFFCC", border: "1px solid #E7EDF5", minWidth: item.minWidth || 150, maxWidth: item.maxWidth || 280 }}>
                {item.icon && <span style={{ color: item.color || "#1E63D1", display: "flex", alignItems: "center" }}>{item.icon}</span>}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "#73839A", textTransform: "uppercase", letterSpacing: 0.7 }}>{item.label}</div>
                  <div style={{ fontWeight: 700, color: "#122B4A", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
