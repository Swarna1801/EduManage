import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PlanBadge from "../PlanBadge";
import API from "../../utils/api";
import { countUnreadChatThreads } from "../../lib/utils";
import {
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ChartColumnBig,
  CheckSquare,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  School,
  Shield,
  UserSquare2,
  Users,
} from "lucide-react";

const principalNav = [
  { path: "/dashboard/principal", label: "Overview", icon: "Overview", exact: true },
  { path: "/dashboard/principal/students", label: "Students", icon: "Students" },
  { path: "/dashboard/principal/teachers", label: "Teachers", icon: "Teachers" },
  { path: "/dashboard/principal/attendance", label: "Attendance & Leave Request", icon: "Attendance" },
  { path: "/dashboard/principal/marks", label: "Marks Overview", icon: "Marks" },
  { path: "/dashboard/principal/fees", label: "Fee Tracking", icon: "Fees" },
  { path: "/dashboard/principal/boardroom", label: "Board Room", icon: "Board" },
  { path: "/dashboard/principal/analytics", label: "Analytics", icon: "Analytics" },
  { path: "/dashboard/principal/notifications", label: "Notifications", icon: "Alerts" },
];

const teacherNav = [
  { path: "/dashboard/teacher", label: "Overview", icon: "Overview", exact: true },
  { path: "/dashboard/teacher/attendance", label: "Mark Attendance", icon: "Attendance" },
  { path: "/dashboard/teacher/marks", label: "Upload and View Marks", icon: "Marks" },
  { path: "/dashboard/teacher/students", label: "My Students", icon: "Students" },
  { path: "/dashboard/teacher/timetable", label: "Timetable", icon: "Timetable" },
  { path: "/dashboard/teacher/leave-status", label: "Leave Status", icon: "Leave" },
  { path: "/dashboard/teacher/chat", label: "Chat Room", icon: "Chat" },
  { path: "/dashboard/teacher/notifications", label: "Notifications", icon: "Alerts" },
];

const parentNav = [
  { path: "/dashboard/parent", label: "Overview", icon: "Overview", exact: true },
  { path: "/dashboard/parent/student-details", label: "Children Details", icon: "Profile" },
  { path: "/dashboard/parent/marks", label: "Marks Report", icon: "Marks" },
  { path: "/dashboard/parent/attendance", label: "Attendance", icon: "Attendance" },
  { path: "/dashboard/parent/fees", label: "Fee Status", icon: "Fees" },
  { path: "/dashboard/parent/timetable", label: "Timetable", icon: "Timetable" },
  { path: "/dashboard/parent/leave-status", label: "Leave Status", icon: "Leave" },
  { path: "/dashboard/parent/chat", label: "Chat Room", icon: "Chat" },
  { path: "/dashboard/parent/notifications", label: "Notifications", icon: "Alerts" },
];

const superNav = [
  { path: "/dashboard/super", label: "Control Center", icon: "Board", exact: true },
  { path: "/dashboard/super/schools", label: "Schools", icon: "Students" },
  { path: "/dashboard/super/notifications", label: "Priority Notices", icon: "Alerts" },
];

const navByRole = { principal: principalNav, teacher: teacherNav, parent: parentNav, super_user: superNav };
const roleColors = { principal: "bg-amber-100 text-amber-700", teacher: "bg-blue-100 text-blue-700", parent: "bg-green-100 text-green-700", super_user: "bg-violet-100 text-violet-700" };
const roleLabels = { principal: "Principal", teacher: "Teacher", parent: "Parent", super_user: "Super User" };
const notificationPaths = {
  principal: "/dashboard/principal/notifications",
  teacher: "/dashboard/teacher/notifications",
  parent: "/dashboard/parent/notifications",
};
const notificationApis = {
  principal: "/principal/notifications",
  teacher: "/teacher/notifications",
  parent: "/parent/notifications",
};
const chatPaths = {
  teacher: "/dashboard/teacher/chat",
  parent: "/dashboard/parent/chat",
};
const chatApis = {
  teacher: "/teacher/chat/threads",
  parent: "/parent/chat/threads",
};
const iconByName = {
  Overview: LayoutDashboard,
  Students: GraduationCap,
  Teachers: Users,
  Attendance: CheckSquare,
  Marks: BookOpen,
  Fees: CreditCard,
  Board: Building2,
  Analytics: ChartColumnBig,
  Alerts: Bell,
  Chat: MessageSquare,
  Timetable: CalendarDays,
  Leave: CalendarDays,
  Profile: UserSquare2,
};
const roleAccent = {
  principal: { tint: "rgba(241, 175, 27, 0.18)", color: "#C17A00", glow: "rgba(241,175,27,0.22)" },
  teacher: { tint: "rgba(39, 122, 255, 0.18)", color: "#1E63D1", glow: "rgba(39,122,255,0.18)" },
  parent: { tint: "rgba(25, 157, 104, 0.18)", color: "#157A54", glow: "rgba(25,157,104,0.18)" },
  super_user: { tint: "rgba(123, 82, 214, 0.18)", color: "#6B4CE6", glow: "rgba(107,76,230,0.18)" },
};

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [principalAttendanceCount, setPrincipalAttendanceCount] = useState(0);
  const [teacherLeaveStatusCount, setTeacherLeaveStatusCount] = useState(0);
  const [parentLeaveStatusCount, setParentLeaveStatusCount] = useState(0);
  const [priorityPopup, setPriorityPopup] = useState(null);
  const role = user?.role || "principal";
  const plan = user?.plan || "basic";
  const navItems = navByRole[role] || principalNav;
  const notificationPath = notificationPaths[role];
  const notificationApi = notificationApis[role];
  const chatPath = chatPaths[role];
  const chatApi = chatApis[role];
  const accent = roleAccent[role] || roleAccent.principal;
  const notificationSeenKey = useMemo(() => {
    const userId = user?.id || "guest";
    const schoolId = user?.school_id || "school";
    return `notifications_seen_${role}_${schoolId}_${userId}`;
  }, [role, user?.id, user?.school_id]);
  const priorityPopupSeenKey = useMemo(() => {
    const userId = user?.id || "guest";
    const schoolId = user?.school_id || "school";
    return `priority_popup_seen_${role}_${schoolId}_${userId}`;
  }, [role, user?.id, user?.school_id]);

  const isActive = (item) => item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    if (!user || !notificationApi) return undefined;

    let cancelled = false;

    const updateNotificationBadge = async () => {
      try {
        const response = await API.get(notificationApi);
        const notifications = Array.isArray(response.data) ? response.data : [];
        const latestTimestamp = notifications.reduce((latest, notification) => {
          const createdAt = notification?.createdAt ? new Date(notification.createdAt).getTime() : 0;
          return createdAt > latest ? createdAt : latest;
        }, 0);

        if (location.pathname.startsWith(notificationPath)) {
          if (latestTimestamp) {
            localStorage.setItem(notificationSeenKey, String(latestTimestamp));
            if (role === "principal") {
              localStorage.setItem(priorityPopupSeenKey, String(latestTimestamp));
            }
          }
          if (!cancelled) {
            setNotificationCount(0);
            setPriorityPopup(null);
          }
          return;
        }

        const lastSeen = Number(localStorage.getItem(notificationSeenKey) || 0);
        const unseenCount = notifications.filter((notification) => {
          const createdAt = notification?.createdAt ? new Date(notification.createdAt).getTime() : 0;
          return createdAt > lastSeen;
        }).length;

        if (!cancelled) {
          setNotificationCount(unseenCount);
          if (role === "principal") {
            const lastPrioritySeen = Number(localStorage.getItem(priorityPopupSeenKey) || 0);
            const latestPriority = notifications.find((notification) => {
              const createdAt = notification?.createdAt ? new Date(notification.createdAt).getTime() : 0;
              return notification?.source_role === "super_user" && createdAt > lastPrioritySeen;
            });
            setPriorityPopup(latestPriority || null);
          }
        }
      } catch {
        if (!cancelled) {
          setNotificationCount(0);
          setPriorityPopup(null);
        }
      }
    };

    updateNotificationBadge();
    const intervalId = window.setInterval(updateNotificationBadge, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [user, notificationApi, notificationPath, notificationSeenKey, priorityPopupSeenKey, location.pathname, role]);

  useEffect(() => {
    if (!user || !chatApi || plan !== "premium") {
      setChatCount(0);
      return undefined;
    }

    let cancelled = false;

    const updateChatBadge = async () => {
      try {
        const response = await API.get(chatApi);
        const threads = Array.isArray(response.data) ? response.data : [];

        if (location.pathname.startsWith(chatPath)) {
          if (!cancelled) {
            setChatCount(0);
          }
          return;
        }

        const unreadCount = countUnreadChatThreads(threads, role, user?.school_id, user?.id);
        if (!cancelled) {
          setChatCount(unreadCount);
        }
      } catch {
        if (!cancelled) {
          setChatCount(0);
        }
      }
    };

    updateChatBadge();
    const intervalId = window.setInterval(updateChatBadge, 5000);

    const handleStorage = () => updateChatBadge();
    window.addEventListener("storage", handleStorage);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("storage", handleStorage);
    };
  }, [user, role, plan, chatApi, chatPath, location.pathname]);

  useEffect(() => {
    if (!user || role !== "principal") {
      setPrincipalAttendanceCount(0);
      return undefined;
    }

    let cancelled = false;

    const updatePrincipalAttendanceBadge = async () => {
      try {
        const response = await API.get("/principal/dashboard");
        const leaveRequests = Array.isArray(response.data?.teacher_leave_requests) ? response.data.teacher_leave_requests : [];
        if (!cancelled) {
          setPrincipalAttendanceCount(leaveRequests.length);
        }
      } catch {
        if (!cancelled) {
          setPrincipalAttendanceCount(0);
        }
      }
    };

    updatePrincipalAttendanceBadge();
    const intervalId = window.setInterval(updatePrincipalAttendanceBadge, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [user, role]);

  useEffect(() => {
    if (!user || role !== "parent") {
      setParentLeaveStatusCount(0);
      return undefined;
    }

    let cancelled = false;
    const seenKey = `parent_leave_status_seen_${user?.school_id || "school"}_${user?.id || "default"}`;

    const updateParentLeaveBadge = async () => {
      try {
        const response = await API.get("/parent/dashboard");
        const leaveRequests = Array.isArray(response.data?.leave_requests) ? response.data.leave_requests : [];
        const latestDecisionTime = leaveRequests.reduce((latest, request) => {
          if (!["approved", "rejected"].includes(request?.status)) return latest;
          const updatedAt = request?.updatedAt ? new Date(request.updatedAt).getTime() : 0;
          return updatedAt > latest ? updatedAt : latest;
        }, 0);

        if (location.pathname.startsWith("/dashboard/parent/leave-status")) {
          if (latestDecisionTime) {
            localStorage.setItem(seenKey, String(latestDecisionTime));
          }
          if (!cancelled) {
            setParentLeaveStatusCount(0);
          }
          return;
        }

        const lastSeen = Number(localStorage.getItem(seenKey) || 0);
        const unseenCount = leaveRequests.filter((request) => {
          if (!["approved", "rejected"].includes(request?.status)) return false;
          const updatedAt = request?.updatedAt ? new Date(request.updatedAt).getTime() : 0;
          return updatedAt > lastSeen;
        }).length;

        if (!cancelled) {
          setParentLeaveStatusCount(unseenCount);
        }
      } catch {
        if (!cancelled) {
          setParentLeaveStatusCount(0);
        }
      }
    };

    updateParentLeaveBadge();
    const intervalId = window.setInterval(updateParentLeaveBadge, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [user, role, location.pathname]);

  useEffect(() => {
    if (!user || role !== "teacher") {
      setTeacherLeaveStatusCount(0);
      return undefined;
    }

    let cancelled = false;

    const updateTeacherLeaveBadge = async () => {
      try {
        const response = await API.get("/teacher/dashboard");
        const teacherLeaveRequests = Array.isArray(response.data?.teacher_leave_requests) ? response.data.teacher_leave_requests : [];
        const parentLeaveRequests = Array.isArray(response.data?.student_leave_requests) ? response.data.student_leave_requests : [];
        const pendingTeacherRequests = teacherLeaveRequests.filter((item) => !["leave_approved", "leave_rejected"].includes(item.status)).length;
        if (!cancelled) {
          setTeacherLeaveStatusCount(pendingTeacherRequests + parentLeaveRequests.length);
        }
      } catch {
        if (!cancelled) {
          setTeacherLeaveStatusCount(0);
        }
      }
    };

    updateTeacherLeaveBadge();
    const intervalId = window.setInterval(updateTeacherLeaveBadge, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [user, role]);

  return (
    <div className="min-h-screen flex font-inter" style={{ background: "linear-gradient(180deg, #F6F9FC 0%, #EFF4FA 100%)" }}>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed top-0 left-0 h-full w-64 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto lg:h-screen ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`} style={{ background: "linear-gradient(180deg, #0F1728 0%, #121B31 50%, #0E1628 100%)", boxShadow: "18px 0 40px rgba(15, 23, 42, 0.25)" }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ background: "linear-gradient(135deg, #F7C948 0%, #F59E0B 100%)", color: "#14213D", boxShadow: "0 10px 24px rgba(245, 158, 11, 0.28)" }}>
            <School size={17} />
          </div>
          <span className="font-bold text-white text-[1.05rem]">EduManage</span>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-white/50 hover:text-white lg:hidden">x</button>
        </div>

        <div className="px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-base flex-shrink-0" style={{ background: `linear-gradient(135deg, ${accent.color} 0%, rgba(255,255,255,0.16) 180%)`, boxShadow: `0 12px 24px ${accent.glow}` }}>
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-semibold text-sm truncate">{user?.name || "User"}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-full font-semibold leading-none ${roleColors[role]}`}
                  style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)" }}
                >
                  {roleLabels[role]}
                </span>
                <span
                  className="text-[11px] px-2.5 py-1 rounded-full font-semibold leading-none"
                  style={{
                    background: plan === "premium" ? "linear-gradient(135deg, #FFF3C7 0%, #FFE187 100%)" : "linear-gradient(135deg, #E7F0FF 0%, #D7E7FF 100%)",
                    color: plan === "premium" ? "#9A5B00" : "#185FA5",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                    border: `1px solid ${plan === "premium" ? "#F5D36A" : "#BFD3F4"}`,
                  }}
                >
                  {plan === "premium" ? "Premium" : "Basic"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-hidden px-3 py-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-2xl text-[0.95rem] font-medium transition-all ${isActive(item) ? "text-white shadow-lg" : "text-white/70 hover:text-white hover:bg-white/10"}`}
              style={isActive(item) ? { background: `linear-gradient(135deg, ${accent.color} 0%, rgba(255,255,255,0.12) 220%)`, boxShadow: `0 14px 28px ${accent.glow}` } : undefined}
            >
              {(() => {
                const Icon = iconByName[item.icon] || Shield;
                return (
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isActive(item) ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)" }}>
                    <Icon size={15} />
                  </span>
                );
              })()}
              <span
                className="min-w-0 flex-1 truncate"
                style={item.path === "/dashboard/principal/attendance" ? { fontSize: "0.82rem" } : undefined}
              >
                {item.label}
              </span>
              {item.path === chatPath && chatCount > 0 && (
                <span className={`min-w-[1.4rem] h-6 px-2 rounded-full text-xs font-semibold flex items-center justify-center ${isActive(item) ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>
                  {chatCount > 99 ? "99+" : chatCount}
                </span>
              )}
              {item.path === notificationPath && notificationCount > 0 && (
                <span className={`min-w-[1.4rem] h-6 px-2 rounded-full text-xs font-semibold flex items-center justify-center ${isActive(item) ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
              {item.path === "/dashboard/principal/attendance" && principalAttendanceCount > 0 && (
                <span className={`min-w-[1.4rem] h-6 px-2 rounded-full text-xs font-semibold flex items-center justify-center ${isActive(item) ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>
                  {principalAttendanceCount > 99 ? "99+" : principalAttendanceCount}
                </span>
              )}
              {item.path === "/dashboard/teacher/leave-status" && teacherLeaveStatusCount > 0 && (
                <span className={`min-w-[1.4rem] h-6 px-2 rounded-full text-xs font-semibold flex items-center justify-center ${isActive(item) ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>
                  {teacherLeaveStatusCount > 99 ? "99+" : teacherLeaveStatusCount}
                </span>
              )}
              {item.path === "/dashboard/parent/leave-status" && parentLeaveStatusCount > 0 && (
                <span className={`min-w-[1.4rem] h-6 px-2 rounded-full text-xs font-semibold flex items-center justify-center ${isActive(item) ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>
                  {parentLeaveStatusCount > 99 ? "99+" : parentLeaveStatusCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/90 backdrop-blur border-b border-border px-6 py-4 flex items-center gap-4 sticky top-0 z-30" style={{ boxShadow: "0 10px 26px rgba(15, 23, 42, 0.04)" }}>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground text-xl">=</button>
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 bg-white">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: accent.tint, color: accent.color }}>
                {(() => {
                  const RoleIcon = role === "principal" ? Building2 : role === "teacher" ? GraduationCap : role === "super_user" ? Shield : UserSquare2;
                  return <RoleIcon size={16} />;
                })()}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Portal</div>
                <div className="text-sm font-semibold truncate" style={{ color: "hsl(var(--navy))" }}>{roleLabels[role]} Workspace</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PlanBadge plan={plan} />
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: accent.tint, color: accent.color }}>
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <span className="text-sm font-medium hidden sm:block" style={{ color: "hsl(var(--navy))" }}>{user?.name}</span>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <div style={{ maxWidth: 1500, margin: "0 auto" }}>
            {priorityPopup && role === "principal" && (
              <div style={{ marginBottom: 18, padding: "14px 16px", borderRadius: 16, border: "1px solid #F0D39B", background: "linear-gradient(135deg, #FFF8E8 0%, #FFFFFF 100%)", boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#8A5409", letterSpacing: 0.8, textTransform: "uppercase" }}>Platform Priority Notice</div>
                    <div style={{ fontWeight: 800, color: "#122B4A", fontSize: 18, marginTop: 6 }}>{priorityPopup.title}</div>
                    <div style={{ fontSize: 13, color: "#66758C", marginTop: 6 }}>{priorityPopup.message}</div>
                  </div>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => {
                      const createdAt = priorityPopup?.createdAt ? new Date(priorityPopup.createdAt).getTime() : Date.now();
                      localStorage.setItem(priorityPopupSeenKey, String(createdAt));
                      setPriorityPopup(null);
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
