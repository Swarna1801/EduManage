import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import DashboardLayout from "./components/layout/DashboardLayout";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Payment from "./pages/Payment";
import SuperLogin from "./pages/SuperLogin";
import TeacherInviteForm from "./pages/TeacherInviteForm";
import ParentInviteForm from "./pages/ParentInviteForm";

import PrincipalDashboard from "./pages/principal/Dashboard";
import ManageStudents from "./pages/principal/ManageStudents";
import ManageTeachers from "./pages/principal/ManageTeachers";
import PrincipalAttendance from "./pages/principal/PrincipalAttendance";
import PrincipalMarks from "./pages/principal/PrincipalMarks";
import PrincipalFees from "./pages/principal/PrincipalFees";
import BoardRoom from "./pages/principal/BoardRoom";
import Analytics from "./pages/principal/Analytics";
import PrincipalNotifications from "./pages/principal/PrincipalNotifications";

import TeacherDashboard from "./pages/teacher/Dashboard";
import MarkAttendance from "./pages/teacher/MarkAttendance";
import UploadMarks from "./pages/teacher/UploadMarks";
import TeacherStudents from "./pages/teacher/TeacherStudents";
import TeacherNotifications from "./pages/teacher/TeacherNotifications";
import TeacherChat from "./pages/teacher/TeacherChat";
import TeacherTimetable from "./pages/teacher/TeacherTimetable";
import TeacherLeaveStatus from "./pages/teacher/TeacherLeaveStatus";

import ParentDashboard from "./pages/parent/Dashboard";
import ParentStudentDetails from "./pages/parent/ParentStudentDetails";
import ParentMarks from "./pages/parent/ParentMarks";
import ParentAttendance from "./pages/parent/ParentAttendance";
import ParentFees from "./pages/parent/ParentFees";
import ParentNotifications from "./pages/parent/ParentNotifications";
import ParentChat from "./pages/parent/ParentChat";
import ParentTimetable from "./pages/parent/ParentTimetable";
import ParentLeaveStatus from "./pages/parent/ParentLeaveStatus";
import SuperDashboard from "./pages/super/SuperDashboard";

function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Loading EduManage...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/login" />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/super-login" element={<SuperLogin />} />
          <Route path="/invite/teacher/:token" element={<TeacherInviteForm />} />
          <Route path="/invite/parent/:token" element={<ParentInviteForm />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/dashboard/principal" element={<PrivateRoute role="principal"><PrincipalDashboard /></PrivateRoute>} />
          <Route path="/dashboard/principal/students" element={<PrivateRoute role="principal"><ManageStudents /></PrivateRoute>} />
          <Route path="/dashboard/principal/teachers" element={<PrivateRoute role="principal"><ManageTeachers /></PrivateRoute>} />
          <Route path="/dashboard/principal/attendance" element={<PrivateRoute role="principal"><PrincipalAttendance /></PrivateRoute>} />
          <Route path="/dashboard/principal/marks" element={<PrivateRoute role="principal"><PrincipalMarks /></PrivateRoute>} />
          <Route path="/dashboard/principal/fees" element={<PrivateRoute role="principal"><PrincipalFees /></PrivateRoute>} />
          <Route path="/dashboard/principal/boardroom" element={<PrivateRoute role="principal"><BoardRoom /></PrivateRoute>} />
          <Route path="/dashboard/principal/analytics" element={<PrivateRoute role="principal"><Analytics /></PrivateRoute>} />
          <Route path="/dashboard/principal/notifications" element={<PrivateRoute role="principal"><PrincipalNotifications /></PrivateRoute>} />
          <Route path="/dashboard/teacher" element={<PrivateRoute role="teacher"><TeacherDashboard /></PrivateRoute>} />
          <Route path="/dashboard/teacher/attendance" element={<PrivateRoute role="teacher"><MarkAttendance /></PrivateRoute>} />
          <Route path="/dashboard/teacher/marks" element={<PrivateRoute role="teacher"><UploadMarks /></PrivateRoute>} />
          <Route path="/dashboard/teacher/students" element={<PrivateRoute role="teacher"><TeacherStudents /></PrivateRoute>} />
          <Route path="/dashboard/teacher/timetable" element={<PrivateRoute role="teacher"><TeacherTimetable /></PrivateRoute>} />
          <Route path="/dashboard/teacher/leave-status" element={<PrivateRoute role="teacher"><TeacherLeaveStatus /></PrivateRoute>} />
          <Route path="/dashboard/teacher/chat" element={<PrivateRoute role="teacher"><TeacherChat /></PrivateRoute>} />
          <Route path="/dashboard/teacher/notifications" element={<PrivateRoute role="teacher"><TeacherNotifications /></PrivateRoute>} />
          <Route path="/dashboard/parent" element={<PrivateRoute role="parent"><ParentDashboard /></PrivateRoute>} />
          <Route path="/dashboard/parent/student-details" element={<PrivateRoute role="parent"><ParentStudentDetails /></PrivateRoute>} />
          <Route path="/dashboard/parent/marks" element={<PrivateRoute role="parent"><ParentMarks /></PrivateRoute>} />
          <Route path="/dashboard/parent/attendance" element={<PrivateRoute role="parent"><ParentAttendance /></PrivateRoute>} />
          <Route path="/dashboard/parent/fees" element={<PrivateRoute role="parent"><ParentFees /></PrivateRoute>} />
          <Route path="/dashboard/parent/timetable" element={<PrivateRoute role="parent"><ParentTimetable /></PrivateRoute>} />
          <Route path="/dashboard/parent/leave-status" element={<PrivateRoute role="parent"><ParentLeaveStatus /></PrivateRoute>} />
          <Route path="/dashboard/parent/chat" element={<PrivateRoute role="parent"><ParentChat /></PrivateRoute>} />
          <Route path="/dashboard/parent/notifications" element={<PrivateRoute role="parent"><ParentNotifications /></PrivateRoute>} />
          <Route path="/dashboard/super" element={<PrivateRoute role="super_user"><SuperDashboard /></PrivateRoute>} />
          <Route path="/dashboard/super/schools" element={<PrivateRoute role="super_user"><SuperDashboard /></PrivateRoute>} />
          <Route path="/dashboard/super/notifications" element={<PrivateRoute role="super_user"><SuperDashboard /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
