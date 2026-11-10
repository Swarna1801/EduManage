const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");
const principal = require("../controllers/principalController");
const teacher = require("../controllers/teacherController");
const parent = require("../controllers/parentController");
const exam = require("../controllers/examController");
const superUser = require("../controllers/superController");
const invite = require("../controllers/inviteController");
const { protect, authorize } = require("../middleware/auth");

// Auth
router.post("/auth/register", auth.register);
router.post("/auth/payment", auth.completePayment);
router.post("/auth/login", auth.login);
router.get("/invite/teacher/:token", invite.getTeacherInviteMeta);
router.post("/invite/teacher/:token/submit", invite.submitTeacherInvite);
router.get("/invite/parent/:token", invite.getParentInviteMeta);
router.post("/invite/parent/:token/submit", invite.submitParentInvite);

// Super User
router.get("/super/dashboard", protect, authorize("super_user"), superUser.getDashboard);
router.patch("/super/schools/:id/plan", protect, authorize("super_user"), superUser.updateSchoolPlan);
router.post("/super/notifications", protect, authorize("super_user"), superUser.sendSchoolNotification);

// Principal - Core
router.get("/principal/dashboard", protect, authorize("principal"), principal.getDashboard);
router.get("/principal/teachers", protect, authorize("principal"), principal.getTeachers);
router.post("/principal/teachers", protect, authorize("principal"), principal.addTeacher);
router.patch("/principal/teachers/:id", protect, authorize("principal"), principal.updateTeacher);
router.delete("/principal/teachers/:id", protect, authorize("principal"), principal.deleteTeacher);
router.post("/principal/teacher-invite-links", protect, authorize("principal"), invite.generateTeacherInvite);
router.get("/principal/students", protect, authorize("principal"), principal.getStudents);
router.post("/principal/students", protect, authorize("principal"), principal.addStudent);
router.delete("/principal/students/:id", protect, authorize("principal"), principal.deleteStudent);
router.patch("/principal/students/:id/fee", protect, authorize("principal"), principal.updateFeeStatus);
router.post("/principal/parents", protect, authorize("principal"), principal.addParent);
router.post("/principal/notify-fee", protect, authorize("principal"), principal.notifyFee);
router.post("/principal/notify-attendance", protect, authorize("principal"), principal.notifyAttendance);
router.post("/principal/notify-marks", protect, authorize("principal"), principal.notifyMarks);

// Principal - Advanced
router.get("/principal/analytics", protect, authorize("principal"), principal.getAnalytics);
router.get("/principal/attendance-overview", protect, authorize("principal"), principal.getAttendanceOverview);
router.get("/principal/marks-overview", protect, authorize("principal"), principal.getMarksOverview);
router.get("/principal/class-dashboard", protect, authorize("principal"), principal.getClassDashboard);
router.get("/principal/teacher-analytics", protect, authorize("principal"), principal.getTeacherAnalytics);
router.get("/principal/teacher-analytics/:id", protect, authorize("principal"), principal.getTeacherDetail);
router.post("/principal/announcements", protect, authorize("principal"), principal.createAnnouncement);
router.get("/principal/announcements", protect, authorize("principal"), principal.getAnnouncements);
router.get("/principal/notifications", protect, authorize("principal"), principal.getNotifications);
router.delete("/principal/notifications/:id", protect, authorize("principal"), principal.deleteNotification);
router.delete("/principal/notifications/category/:category", protect, authorize("principal"), principal.clearNotificationsByCategory);
router.post("/principal/teacher-leave/:id/approve", protect, authorize("principal"), principal.approveTeacherLeave);
router.post("/principal/teacher-leave/:id/reject", protect, authorize("principal"), principal.rejectTeacherLeave);

// Teacher
router.get("/teacher/dashboard", protect, authorize("teacher"), teacher.getDashboard);
router.get("/teacher/students", protect, authorize("teacher"), teacher.getMyStudents);
router.get("/teacher/class-students", protect, authorize("teacher"), teacher.getClassTeacherStudents);
router.post("/teacher/students", protect, authorize("teacher"), teacher.addClassStudent);
router.patch("/teacher/students/:id/parent-details", protect, authorize("teacher"), teacher.updateClassStudentParentDetails);
router.post("/teacher/parent-invite-links", protect, authorize("teacher"), invite.generateParentInvite);
router.post("/teacher/notify-fee", protect, authorize("teacher"), teacher.notifyFee);
router.post("/teacher/present", protect, authorize("teacher"), teacher.markSelfPresent);
router.post("/teacher/leave", protect, authorize("teacher"), teacher.applyLeave);
router.post("/teacher/attendance", protect, authorize("teacher"), teacher.markAttendance);
router.post("/teacher/marks", protect, authorize("teacher"), teacher.uploadMarks);
router.get("/teacher/student-marks/:student_id", protect, authorize("teacher"), teacher.getStudentMarks);
router.get("/teacher/attendance/:student_id", protect, authorize("teacher"), teacher.getStudentAttendance);
router.get("/teacher/notifications", protect, authorize("teacher"), teacher.getNotifications);
router.delete("/teacher/notifications/:id", protect, authorize("teacher"), teacher.deleteNotification);
router.delete("/teacher/notifications/category/:category", protect, authorize("teacher"), teacher.clearNotificationsByCategory);
router.get("/teacher/timetable", protect, authorize("teacher"), teacher.getTimetable);
router.post("/teacher/timetable", protect, authorize("teacher"), teacher.saveTimetable);
router.get("/teacher/class-timetable", protect, authorize("teacher"), teacher.getClassTimetable);
router.post("/teacher/class-timetable", protect, authorize("teacher"), teacher.saveClassTimetable);
router.post("/teacher/student-leave/:id/review", protect, authorize("teacher"), teacher.reviewStudentLeave);
router.get("/teacher/chat/threads", protect, authorize("teacher"), teacher.getChatThreads);
router.get("/teacher/chat/messages/:student_id", protect, authorize("teacher"), teacher.getChatMessages);
router.post("/teacher/chat/messages", protect, authorize("teacher"), teacher.sendChatMessage);

// Parent
router.get("/parent/dashboard", protect, authorize("parent"), parent.getMyChild);
router.get("/parent/student-details", protect, authorize("parent"), parent.getStudentDetails);
router.post("/parent/fees/pay", protect, authorize("parent"), parent.payFees);
router.post("/parent/student-leave", protect, authorize("parent"), parent.applyStudentLeave);
router.get("/parent/marks", protect, authorize("parent"), parent.getMarks);
router.get("/parent/attendance", protect, authorize("parent"), parent.getAttendance);
router.get("/parent/notifications", protect, authorize("parent"), parent.getNotifications);
router.delete("/parent/notifications/:id", protect, authorize("parent"), parent.deleteNotification);
router.delete("/parent/notifications/category/:category", protect, authorize("parent"), parent.clearNotificationsByCategory);
router.get("/parent/timetable", protect, authorize("parent"), parent.getTimetable);
router.get("/parent/chat/threads", protect, authorize("parent"), parent.getChatThreads);
router.get("/parent/chat/messages/:student_id", protect, authorize("parent"), parent.getChatMessages);
router.post("/parent/chat/messages", protect, authorize("parent"), parent.sendChatMessage);

// Exams - Teacher
router.post('/exams', protect, authorize('teacher'), exam.createExam);
router.patch('/exams/:id', protect, authorize('teacher'), exam.updateExam);
router.get('/exams/workspace', protect, authorize('teacher'), exam.getMarksWorkspace);
router.get('/exams/my', protect, authorize('teacher'), exam.getMyExams);
router.post('/exams/marks', protect, authorize('teacher'), exam.uploadExamMarks);
router.post('/exams/notify-pending', protect, authorize('teacher'), exam.notifyPendingSubjectTeacher);
router.get('/exams/:id/marks', protect, authorize('teacher'), exam.getExamMarks);
router.delete('/exams/:id', protect, authorize('teacher'), exam.deleteExam);

// Exams - Principal
router.get('/exams', protect, authorize('principal'), exam.getAllExams);
router.get('/exams/:id/analytics', protect, authorize('principal'), exam.getExamAnalytics);

// Exams - Parent
router.get('/parent/exam-marks', protect, authorize('parent'), exam.getChildExamMarks);

module.exports = router;
