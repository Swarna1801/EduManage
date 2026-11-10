import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import PremiumPageHero from "../../components/layout/PremiumPageHero";
import { CalendarClock, LayoutGrid, ShieldCheck, Users } from "lucide-react";

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const tableShellStyle = {
  overflow: "auto",
  borderRadius: 22,
  border: "1px solid #E3EAF4",
  background: "linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
};

const headerCellStyle = {
  padding: "16px 14px",
  background: "linear-gradient(180deg, #F8FBFF 0%, #EEF4FB 100%)",
  color: "#5B6B82",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  borderBottom: "1px solid #E3EAF4",
};

const periodCellStyle = {
  padding: "16px 14px",
  background: "#FCFDFE",
  borderBottom: "1px solid #EEF2F7",
  verticalAlign: "top",
  minWidth: 110,
};

const bodyCellStyle = {
  padding: "14px",
  borderBottom: "1px solid #EEF2F7",
  verticalAlign: "top",
  minWidth: 170,
};

const displayCellStyle = {
  minWidth: 140,
  borderRadius: 16,
  padding: "12px 13px",
  background: "linear-gradient(180deg, #FFFFFF 0%, #F7FAFD 100%)",
  border: "1px solid #E6EDF6",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
};

export default function ParentTimetable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [children, setChildren] = useState([]);
  const [timetable, setTimetable] = useState([]);

  useEffect(() => {
    API.get("/parent/dashboard")
      .then((response) => {
        const rawSchedule = response.data?.timetable?.schedule || [];
        setChildren(response.data?.children || (response.data?.child ? [response.data.child] : []));
        setTimetable(DAYS.map((day) => rawSchedule.find((item) => item.day === day) || { day, periods: [] }));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load timetable");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="card" style={{ color: "#888" }}>{error}</div>;

  return (
    <div>
      <PremiumPageHero
        icon={<CalendarClock size={22} />}
        title="Class Timetable"
        subtitle="View the premium weekly timetable shared by your child&apos;s class teacher in a cleaner classroom planner layout."
        badge="Premium Timetable"
        meta={[
          { label: "Mode", value: "View Only", icon: <ShieldCheck size={16} />, color: "#0F6E56", minWidth: 160 },
          { label: "Days", value: String(DAYS.length), icon: <LayoutGrid size={16} />, color: "#185FA5", minWidth: 140 },
          { label: "Periods", value: String(PERIODS.length), icon: <CalendarClock size={16} />, color: "#8A5409", minWidth: 140 },
        ]}
      />

      {children.length > 0 && (
        <div style={{ borderRadius: 22, padding: "18px 20px", marginBottom: 20, background: "linear-gradient(135deg, #F4F9FF 0%, #FFFFFF 100%)", border: "1px solid #DDE9F7", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: "#EAF2FE", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={19} color="#185FA5" />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: "#0C447C", fontSize: 18 }}>{children[0].name}</div>
              <div style={{ fontSize: 13, color: "#5D7895" }}>Class {children[0].class}{children[0].section ? ` - Section ${children[0].section}` : ""}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#66758C" }}>This timetable is maintained by the class teacher and shown here in read-only mode for parents.</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 22 }}>
        <div style={{ borderRadius: 20, padding: "18px 20px", background: "linear-gradient(135deg, #F4F9FF 0%, #FFFFFF 100%)", border: "1px solid #E4EBF5", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#73839A", letterSpacing: 0.8, textTransform: "uppercase" }}>Weekly Format</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#122B4A", marginTop: 8 }}>Mon - Sat</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#66758C" }}>Structured classroom plan for the full week.</div>
        </div>
        <div style={{ borderRadius: 20, padding: "18px 20px", background: "linear-gradient(135deg, #FFF8EE 0%, #FFFFFF 100%)", border: "1px solid #EEE3CA", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#8A6A28", letterSpacing: 0.8, textTransform: "uppercase" }}>Access</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#122B4A", marginTop: 8 }}>Parent View</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#7A6D54" }}>Read-only timetable shared by the teacher.</div>
        </div>
        <div style={{ borderRadius: 20, padding: "18px 20px", background: "linear-gradient(135deg, #F3FBF6 0%, #FFFFFF 100%)", border: "1px solid #DFEEE6", boxShadow: "0 16px 34px rgba(15, 23, 42, 0.04)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6E7E57", letterSpacing: 0.8, textTransform: "uppercase" }}>Coverage</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#122B4A", marginTop: 8 }}>{DAYS.length} Days x {PERIODS.length} Periods</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#66758C" }}>Quick view of all periods in one premium table.</div>
        </div>
      </div>

      <div className="card" style={{ borderRadius: 24, border: "1px solid #E4EBF5", boxShadow: "0 20px 42px rgba(15, 23, 42, 0.05)", padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ padding: "22px 22px 0" }}>
            <h3 style={{ fontWeight: 600, margin: 0 }}>Weekly Timetable</h3>
            <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>Rows are days and columns are periods.</div>
          </div>
          <div style={{ padding: "22px 22px 0" }}>
            <span className="badge badge-blue">View Only</span>
          </div>
        </div>

        <div style={{ padding: 22 }}>
          <div style={tableShellStyle}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={headerCellStyle}>Day</th>
                {PERIODS.map((periodNumber) => <th key={periodNumber} style={headerCellStyle}>Period {periodNumber}</th>)}
              </tr>
            </thead>
            <tbody>
              {timetable.map((day) => (
                <tr key={day.day}>
                  <td style={periodCellStyle}>
                    <div style={{ fontWeight: 800, color: "#122B4A", fontSize: 18, lineHeight: 1.2 }}>{day.day}</div>
                    <div style={{ fontSize: 12, color: "#72839B", marginTop: 6 }}>Weekday</div>
                  </td>
                  {PERIODS.map((periodNumber) => {
                    const period = (day.periods || []).find((item) => item.period === periodNumber);
                    return (
                      <td key={`${day.day}-${periodNumber}`} style={bodyCellStyle}>
                        <div style={displayCellStyle}>
                          <div style={{ fontWeight: 800, color: "#0C447C", fontSize: 14 }}>{period?.subject || "No subject assigned"}</div>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "4px 8px", borderRadius: 999, background: "#EAF2FE", color: "#185FA5", fontSize: 11, fontWeight: 700 }}>
                            <CalendarClock size={12} />
                            {period?.time || "Time not set"}
                          </div>
                          <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>{period?.room || "Room not set"}</div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
