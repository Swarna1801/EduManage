import React, { useEffect, useMemo, useState } from "react";
import API from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import PremiumLock from "../../components/PremiumLock";
import PremiumPageHero from "../../components/layout/PremiumPageHero";
import { canUseFeature } from "../../lib/planFeatures";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { ChartColumnBig, Filter, School } from "lucide-react";

const COLORS = ["#185FA5", "#1D9E75", "#E24B4A", "#EF9F27"];

export default function Analytics() {
  const { user } = useAuth();
  const plan = user?.plan || "basic";
  const hasAdvancedAnalytics = canUseFeature(plan, "advancedAnalytics");
  const [data, setData] = useState(null);
  const [classDetail, setClassDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");

  useEffect(() => {
    API.get("/principal/analytics")
      .then((response) => {
        setData(response.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!hasAdvancedAnalytics || !filterClass) {
      setClassDetail(null);
      return;
    }

    const params = new URLSearchParams();
    params.set("class", filterClass);
    if (filterSection) params.set("section", filterSection);

    API.get(`/principal/class-dashboard?${params.toString()}`)
      .then((response) => setClassDetail(response.data))
      .catch(() => setClassDetail(null));
  }, [hasAdvancedAnalytics, filterClass, filterSection]);

  const availableClasses = [...new Set((data?.class_stats || []).map((item) => String(item.class).split("-")[0]).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const availableSections = [...new Set((data?.class_stats || [])
    .filter((item) => !filterClass || String(item.class).split("-")[0] === filterClass)
    .map((item) => String(item.class).split("-")[1])
    .filter(Boolean))].sort();

  const subjectStats = data?.subject_stats || [];
  const attendanceStatusData = data?.attendance_status_counts
    ? [
        { name: "Present", value: data.attendance_status_counts.present || 0 },
        { name: "Absent", value: data.attendance_status_counts.absent || 0 },
        { name: "Late", value: data.attendance_status_counts.late || 0 },
      ]
    : [];
  const teacherWorkload = data?.teacher_workload || [];
  const classMarks = data?.class_stats || [];

  const activeData = hasAdvancedAnalytics && filterClass && classDetail ? classDetail : null;
  const activeFeeSummary = activeData?.fee_summary || data?.fee_summary;
  const activeSubjectStats = activeData?.subject_stats || subjectStats;
  const activeClassMarks = activeData
    ? [{
        class: `${filterClass}${filterSection ? `-${filterSection}` : ""}`,
        students: activeData.total_students || 0,
        avg_marks: activeData.avg_marks || 0,
      }]
    : classMarks;
  const activeClassesWithMarks = activeClassMarks.filter((item) => item.avg_marks > 0);
  const isFilteredView = Boolean(hasAdvancedAnalytics && filterClass);

  const feeData = activeFeeSummary
    ? [
        { name: "Paid", value: activeFeeSummary.paid || 0 },
        { name: "Pending", value: activeFeeSummary.pending || 0 },
        { name: "Partial", value: activeFeeSummary.partial || 0 },
      ]
    : [];
  const classesWithMarks = activeClassesWithMarks;

  const basicSummary = useMemo(() => {
    const trackedClasses = activeClassMarks.length;
    const avgAcrossClasses = classesWithMarks.length
      ? Math.round(classesWithMarks.reduce((acc, item) => acc + item.avg_marks, 0) / classesWithMarks.length)
      : 0;
    const topClass = classesWithMarks.length
      ? [...classesWithMarks].sort((a, b) => b.avg_marks - a.avg_marks)[0]
      : null;
    const pendingFees = (activeFeeSummary?.pending || 0) + (activeFeeSummary?.partial || 0);

    return {
      trackedClasses,
      avgAcrossClasses,
      topClass,
      pendingFees,
    };
  }, [activeClassMarks, classesWithMarks, activeFeeSummary]);

  const attendanceTrend = [
    { month: "Oct", pct: 82 },
    { month: "Nov", pct: 85 },
    { month: "Dec", pct: 78 },
    { month: "Jan", pct: 88 },
    { month: "Feb", pct: 91 },
    { month: "Mar", pct: 87 },
  ];

  const topClasses = [...classesWithMarks].sort((a, b) => b.avg_marks - a.avg_marks).slice(0, 5);

  if (loading) return <div className="loading">Loading analytics...</div>;

  return (
    <div>
      <PremiumPageHero
        icon={<ChartColumnBig size={22} />}
        title="Analytics Dashboard"
        subtitle={hasAdvancedAnalytics ? (isFilteredView ? `Premium class-wise insights for Class ${filterClass}${filterSection ? ` Section ${filterSection}` : ""}` : "School-wide performance insights") : "Basic school performance summary with premium analytics locked"}
        meta={[
          { label: "Mode", value: isFilteredView ? "Class View" : "Overall", icon: <Filter size={16} />, color: "#185FA5" },
          { label: "Plan", value: hasAdvancedAnalytics ? "Advanced" : "Basic", icon: <School size={16} />, color: "#0F6E56" },
        ]}
      />

      {hasAdvancedAnalytics && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 600 }}>Premium Filters</h3>
              <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Switch between overall school analytics and a selected class view.</div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
              <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
                <label>Class</label>
                <select value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterSection(""); }}>
                  <option value="">Overall School</option>
                  {availableClasses.map((item) => <option key={item} value={item}>Class {item}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
                <label>Section</label>
                <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)} disabled={!filterClass}>
                  <option value="">All Sections</option>
                  {availableSections.map((item) => <option key={item} value={item}>Section {item}</option>)}
                </select>
              </div>
              {(filterClass || filterSection) && <button className="btn-outline" onClick={() => { setFilterClass(""); setFilterSection(""); }}>Clear</button>}
            </div>
          </div>
        </div>
      )}

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="metric-card">
          <div className="label">Marks Entries</div>
          <div className="value" style={{ color: "#185FA5" }}>{activeData?.students?.length ? activeData.students.length : data?.total_marks_entries || 0}</div>
        </div>
        <div className="metric-card">
          <div className="label">Classes Tracked</div>
          <div className="value" style={{ color: "#0F6E56" }}>{basicSummary.trackedClasses}</div>
        </div>
        <div className="metric-card">
          <div className="label">{isFilteredView ? "Class Avg" : "School Avg"}</div>
          <div className="value" style={{ color: "#854F0B" }}>{basicSummary.avgAcrossClasses}</div>
        </div>
        <div className="metric-card">
          <div className="label">Fees To Follow Up</div>
          <div className="value" style={{ color: "#A32D2D" }}>{basicSummary.pendingFees}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>{isFilteredView ? "Selected Class Average Marks" : "Class-wise Average Marks"}</h3>
          {activeClassMarks.length === 0 ? (
            <p style={{ color: "#888", fontSize: 13 }}>No marks data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={activeClassMarks}>
                <XAxis dataKey="class" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="avg_marks" fill="#185FA5" radius={[4, 4, 0, 0]} name="Avg Marks" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Fee Collection Status</h3>
          {feeData.length === 0 ? (
            <p style={{ color: "#888", fontSize: 13 }}>No fee data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={feeData} cx="50%" cy="50%" outerRadius={82} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {feeData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Best Performing Classes</h3>
          {topClasses.length === 0 ? (
            <p style={{ color: "#888", fontSize: 13 }}>No class performance data yet</p>
          ) : (
            topClasses.map((item, index) => (
              <div key={item.class} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: index === topClasses.length - 1 ? "none" : "1px solid #f0f2f7" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.class}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>{item.students} students</div>
                </div>
                <span className="badge badge-green">{item.avg_marks}% avg</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>{isFilteredView ? "Selected Class Insights" : "Basic Insights"}</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 12, background: "#E6F1FB", color: "#0C447C" }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{isFilteredView ? "Selected View" : "Top Class"}</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {basicSummary.topClass ? `${basicSummary.topClass.class} with ${basicSummary.topClass.avg_marks}% average` : "No class data yet"}
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 12, background: "#EAF3DE", color: "#27500A" }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Fee Snapshot</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {activeFeeSummary?.paid || 0} paid, {basicSummary.pendingFees} need follow-up
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 12, background: "#FAEEDA", color: "#633806" }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Coverage</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {basicSummary.trackedClasses} classes tracked in marks analytics
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Subject-wise Average Marks</h3>
          {activeSubjectStats.length === 0 ? (
            <p style={{ color: "#888", fontSize: 13 }}>No subject analytics yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={activeSubjectStats.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="avg_marks" fill="#1D9E75" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Attendance Status Mix</h3>
          {attendanceStatusData.length === 0 ? (
            <p style={{ color: "#888", fontSize: 13 }}>No attendance mix available</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={attendanceStatusData} cx="50%" cy="50%" outerRadius={82} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {attendanceStatusData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Teacher Workload</h3>
          {teacherWorkload.length === 0 ? (
            <p style={{ color: "#888", fontSize: 13 }}>No teacher workload data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={teacherWorkload.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
                <XAxis dataKey="teacher_name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="assigned_subjects" fill="#EF9F27" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {hasAdvancedAnalytics ? (
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>{isFilteredView ? "Overall Monthly Attendance Trend" : "Monthly Attendance Trend"}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Line type="monotone" dataKey="pct" stroke="#185FA5" strokeWidth={2} dot={{ r: 4 }} name="Attendance %" />
            </LineChart>
          </ResponsiveContainer>
          {isFilteredView && classDetail && (
            <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#F8FBFF", color: "#0C447C" }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Selected Class Snapshot</div>
              <div style={{ fontWeight: 700 }}>
                Attendance {classDetail.attendance_pct || 0}% • {classDetail.total_students || 0} students • {classDetail.teachers?.length || 0} assigned teacher(s)
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontWeight: 600 }}>Premium Analytics</h3>
            <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Advanced trends, deeper comparisons, and richer school-wide analytics</div>
          </div>
          <PremiumLock feature="Advanced attendance trends, deeper analytics comparisons, and premium school insights" />
        </div>
      )}
    </div>
  );
}
