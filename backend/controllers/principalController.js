const User = require('../models/User');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const Exam = require('../models/Exam');
const ExamMark = require('../models/ExamMark');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const TeacherAttendance = require('../models/TeacherAttendance');
const bcrypt = require('bcryptjs');

const { Op } = require('sequelize');

const getStudentFeeSummary = (student) => {
  const total = Number(student?.total_fee) > 0 ? Number(student.total_fee) : 5000;
  let paid = Number(student?.paid_fee) || 0;

  if (paid <= 0 && student?.fee_status === 'paid') paid = total;
  if (paid <= 0 && student?.fee_status === 'partial') paid = Math.round(total / 2);

  paid = Math.max(0, Math.min(paid, total));
  const remaining = Math.max(total - paid, 0);
  const status = remaining === 0 ? 'paid' : paid > 0 ? 'partial' : 'pending';
  return { total, paid, remaining, status };
};

const NOTIFICATION_PRIORITY_RANK = { critical: 3, high: 2, normal: 1 };
const sortNotifications = (items) => [...items].sort((a, b) => {
  const sourceDiff = (b.source_role === 'super_user' ? 1 : 0) - (a.source_role === 'super_user' ? 1 : 0);
  if (sourceDiff !== 0) return sourceDiff;
  const priorityDiff = (NOTIFICATION_PRIORITY_RANK[b.priority] || 1) - (NOTIFICATION_PRIORITY_RANK[a.priority] || 1);
  if (priorityDiff !== 0) return priorityDiff;
  return new Date(b.createdAt) - new Date(a.createdAt);
});


const generateId = (role) => role.toUpperCase().slice(0,3) + '-' + Math.floor(1000 + Math.random() * 9000);
const parseTeacherSection = (section) => {
  try { return JSON.parse(section); } catch { return null; }
};
const getTeacherClassLabel = (teacher) => {
  const parsed = parseTeacherSection(teacher?.section);
  if (parsed?.class_teacher_of) {
    const [cls, sec] = parsed.class_teacher_of.split('-');
    return `Class ${cls}${sec ? ` Section ${sec}` : ''}`;
  }
  return "No class teacher assignment";
};
const normalizeTeacherAttendanceStatus = (status) => (
  status === 'leave_rejected' ? 'not_marked' : status
);

exports.getDashboard = async (req, res) => {
  try {
    const sid = req.user.school_id;
    const students = await Student.count({ where: { school_id: sid } });
    const teacherUsers = await User.findAll({ where: { school_id: sid, role: 'teacher' }, attributes: ['id', 'name', 'section'] });
    const teacherMap = new Map(teacherUsers.map((teacher) => [teacher.id, teacher]));
    const teachers = teacherUsers.length;
    const notifications = sortNotifications(await Notification.findAll({ where: { school_id: sid } })).slice(0, 5);
    const feePending = await Student.count({ where: { school_id: sid, fee_status: 'pending' } });
    const today = new Date().toISOString().split('T')[0];
    const teacherAttendanceEntries = await TeacherAttendance.findAll({
      where: {
        school_id: sid,
        [Op.or]: [
          { date: today },
          { date: { [Op.gte]: today }, status: { [Op.in]: ['leave_pending', 'leave_approved'] } },
        ],
      },
      order: [['date', 'ASC'], ['createdAt', 'DESC']],
    });
    const teacherAttendanceHistoryEntries = await TeacherAttendance.findAll({
      where: { school_id: sid },
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: 60,
    });

    const todayAttendanceMap = new Map(
      teacherAttendanceEntries
        .filter((entry) => entry.date === today)
        .map((entry) => [entry.teacher_id, entry])
    );

    const teachers_attendance = teacherUsers.map((teacher) => {
      const entry = todayAttendanceMap.get(teacher.id);
      return {
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        class_teacher_of: getTeacherClassLabel(teacher),
        status: normalizeTeacherAttendanceStatus(entry?.status || 'not_marked'),
        marked_at: entry?.marked_at || null,
        date: today,
        leave_reason: entry?.leave_reason || null,
      };
    });

    const leave_requests = teacherAttendanceEntries
      .filter((entry) => entry.status === 'leave_pending' || (entry.status === 'leave_approved' && entry.date >= today))
      .map((entry) => {
        const teacher = teacherMap.get(entry.teacher_id);
        return {
          id: entry.id,
          teacher_id: entry.teacher_id,
          teacher_name: teacher?.name || 'Teacher',
          class_teacher_of: getTeacherClassLabel(teacher),
          date: entry.date,
          status: entry.status,
          leave_reason: entry.leave_reason,
          approved_at: entry.approved_at,
        };
      });

    const teacher_attendance_history = teacherAttendanceHistoryEntries.map((entry) => {
      const teacher = teacherMap.get(entry.teacher_id);
      return {
        id: entry.id,
        teacher_id: entry.teacher_id,
        teacher_name: teacher?.name || 'Teacher',
        class_teacher_of: getTeacherClassLabel(teacher),
        date: entry.date,
        status: normalizeTeacherAttendanceStatus(entry.status),
        marked_at: entry.marked_at,
        leave_reason: entry.leave_reason,
        approved_at: entry.approved_at,
      };
    });

    res.json({
      students,
      teachers,
      attendance_today: 0,
      fee_pending: feePending,
      notifications,
      teachers_attendance,
      teacher_attendance_history,
      teacher_leave_requests: leave_requests,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.approveTeacherLeave = async (req, res) => {
  try {
    const leave = await TeacherAttendance.findOne({
      where: { id: req.params.id, school_id: req.user.school_id, status: 'leave_pending' },
    });
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    await leave.update({
      status: 'leave_approved',
      approved_by: req.user.id,
      approved_at: new Date(),
    });

    const teacher = await User.findOne({ where: { id: leave.teacher_id, school_id: req.user.school_id } });
    if (teacher) {
      await Notification.create({
        school_id: req.user.school_id,
        user_id: teacher.id,
        title: 'Leave approved',
        message: `Your leave for ${leave.date} has been approved by ${req.user.name}.`,
        type: 'info',
        category: 'teacher_attendance',
      });
    }

    await Notification.create({
      school_id: req.user.school_id,
      user_id: null,
      title: 'Teacher leave approved',
      message: `${teacher?.name || 'A teacher'}'s leave for ${leave.date} was approved by ${req.user.name}.`,
      type: 'info',
      category: 'teacher_attendance',
    });

    res.json({ message: 'Teacher leave approved' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.rejectTeacherLeave = async (req, res) => {
  try {
    const leave = await TeacherAttendance.findOne({
      where: { id: req.params.id, school_id: req.user.school_id, status: 'leave_pending' },
    });
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    await leave.update({
      status: 'leave_rejected',
      approved_by: req.user.id,
      approved_at: new Date(),
    });

    const teacher = await User.findOne({ where: { id: leave.teacher_id, school_id: req.user.school_id } });
    if (teacher) {
      await Notification.create({
        school_id: req.user.school_id,
        user_id: teacher.id,
        title: 'Leave request updated',
        message: `Your leave request for ${leave.date} was rejected by ${req.user.name}.`,
        type: 'alert',
        category: 'teacher_attendance',
      });
    }

    res.json({ message: 'Teacher leave rejected' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.addTeacher = async (req, res) => {
  try {
    const { name, email, password, subject, section } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const teacher = await User.create({ user_id: generateId('teacher'), name, email, password: hashed, role: 'teacher', school_id: req.user.school_id, subject: subject || null, section: section || null });
    await Notification.create({
      school_id: req.user.school_id,
      user_id: null,
      title: 'Teacher added',
      message: `${name} was added to the school staff by ${req.user.name}.`,
      type: 'info',
      category: 'teachers',
    });
    res.status(201).json({ message: 'Teacher added', teacher: { id: teacher.id, name, email, user_id: teacher.user_id } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getTeachers = async (req, res) => {
  try {
    const { search, subject } = req.query;
    const where = { school_id: req.user.school_id, role: 'teacher' };
    if (search) where.name = { [Op.like]: '%' + search + '%' };
    if (subject) where.subject = subject;
    const teachers = await User.findAll({ where, attributes: ['id','user_id','name','email','subject','section','teacher_type','createdAt'] });
    res.json(teachers);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, subject, section, teacher_type } = req.body;
    const teacher = await User.findOne({ where: { id, school_id: req.user.school_id, role: 'teacher' } });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const updates = {
      name,
      email,
      subject: subject || null,
      section: section || null,
      teacher_type: teacher_type || null,
    };

    if (password) updates.password = await bcrypt.hash(password, 10);

    await teacher.update(updates);
    res.json({ message: 'Teacher updated successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.addStudent = async (req, res) => {
  try {
    const { name, class: cls, roll_no, parent_id, teacher_id, section } = req.body;
    const pid = (parent_id && parent_id !== '') ? parseInt(parent_id) : null;
    const tid = (teacher_id && teacher_id !== '') ? parseInt(teacher_id) : null;
    const student = await Student.create({ student_id: generateId('student'), name, class: cls, roll_no: roll_no || null, section: section || null, parent_id: pid, teacher_id: tid, school_id: req.user.school_id });
    await Notification.create({
      school_id: req.user.school_id,
      user_id: null,
      title: 'Student added',
      message: `${name} was added to Class ${cls}${section ? ' Section ' + section : ''}.`,
      type: 'info',
      category: 'students',
    });
    res.status(201).json({ message: 'Student added', student });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getStudents = async (req, res) => {
  try {
    const { class: cls, section } = req.query;
    const where = { school_id: req.user.school_id };
    if (cls) where.class = cls;
    if (section) where.section = section;
    const students = await Student.findAll({ where });
    res.json(students);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.addParent = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const parent = await User.create({ user_id: generateId('parent'), name, email, password: hashed, role: 'parent', school_id: req.user.school_id, phone: phone || null });
    await Notification.create({
      school_id: req.user.school_id,
      user_id: null,
      title: 'Parent account added',
      message: `${name} was added as a parent account.`,
      type: 'info',
      category: 'parents',
    });
    res.status(201).json({ message: 'Parent added', parent: { id: parent.id, name, email, user_id: parent.user_id } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getClassDashboard = async (req, res) => {
  try {
    const { class: cls, section } = req.query;
    const sid = req.user.school_id;
    const where = { school_id: sid };
    if (cls) where.class = cls;
    if (section) where.section = section;
    const students = await Student.findAll({ where });
    const studentIds = students.map(s => s.id);
    const teacherIds = [...new Set(students.map(s => s.teacher_id).filter(Boolean))];
    const teachers = teacherIds.length ? await User.findAll({ where: { id: teacherIds }, attributes: ['id','name','email','subject','section'] }) : [];
    const allAttendance = studentIds.length ? await Attendance.findAll({ where: { student_id: studentIds } }) : [];
    const present = allAttendance.filter(a => a.status === 'present').length;
    const attPct = allAttendance.length ? Math.round((present / allAttendance.length) * 100) : 0;
    const marks = studentIds.length ? await Mark.findAll({ where: { student_id: studentIds } }) : [];
    const avgMarks = marks.length ? Math.round(marks.reduce((a,m) => a + m.marks, 0) / marks.length) : 0;
    const subjectMap = {};
    marks.forEach(m => { if (!subjectMap[m.subject]) subjectMap[m.subject] = []; subjectMap[m.subject].push(m.marks); });
    const subjectStats = Object.entries(subjectMap).map(([subj, arr]) => ({ subject: subj, avg: Math.round(arr.reduce((a,b) => a+b,0) / arr.length) }));
    const feeCounts = { paid: 0, pending: 0, partial: 0 };
    students.forEach(s => { if (feeCounts[s.fee_status] !== undefined) feeCounts[s.fee_status]++; });
    res.json({ total_students: students.length, attendance_pct: attPct, avg_marks: avgMarks, teachers, students, subject_stats: subjectStats, fee_summary: feeCounts });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getTeacherAnalytics = async (req, res) => {
  try {
    const sid = req.user.school_id;
    const { search, subject } = req.query;
    const where = { school_id: sid, role: 'teacher' };
    if (search) where.name = { [Op.like]: '%' + search + '%' };
    if (subject) where.subject = subject;
    const teachers = await User.findAll({ where, attributes: ['id','user_id','name','email','subject','section'] });
    const result = await Promise.all(teachers.map(async (t) => {
      const students = await Student.findAll({ where: { teacher_id: t.id, school_id: sid } });
      const studentIds = students.map(s => s.id);
      const marks = studentIds.length ? await Mark.findAll({ where: { student_id: studentIds } }) : [];
      const avgMarks = marks.length ? Math.round(marks.reduce((a,m) => a+m.marks,0)/marks.length) : 0;
      const classes = [...new Set(students.map(s => s.class).filter(Boolean))];
      return { id: t.id, user_id: t.user_id, name: t.name, email: t.email, subject: t.subject, section: t.section, total_students: students.length, classes_handled: classes, avg_student_marks: avgMarks, attendance_pct: Math.floor(Math.random() * 20) + 80, rating: avgMarks >= 80 ? 'Excellent' : avgMarks >= 65 ? 'Good' : avgMarks > 0 ? 'Average' : 'No data' };
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getTeacherDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const sid = req.user.school_id;
    const teacher = await User.findOne({ where: { id, school_id: sid }, attributes: ['id','user_id','name','email','subject','section','createdAt'] });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    const students = await Student.findAll({ where: { teacher_id: id, school_id: sid } });
    const studentIds = students.map(s => s.id);
    const marks = studentIds.length ? await Mark.findAll({ where: { student_id: studentIds } }) : [];
    const attendance = studentIds.length ? await Attendance.findAll({ where: { student_id: studentIds } }) : [];
    const subjectMap = {};
    marks.forEach(m => { if (!subjectMap[m.subject]) subjectMap[m.subject] = []; subjectMap[m.subject].push(m.marks); });
    const subjectStats = Object.entries(subjectMap).map(([subj, arr]) => ({ subject: subj, avg: Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) }));
    const present = attendance.filter(a => a.status === 'present').length;
    const attPct = attendance.length ? Math.round((present/attendance.length)*100) : 0;
    const monthlyTrend = ['Jan','Feb','Mar','Apr','May','Jun'].map(month => ({ month, avg: Math.floor(Math.random() * 30) + 60 }));
    res.json({ teacher, total_students: students.length, students, subject_stats: subjectStats, attendance_pct: attPct, avg_marks: marks.length ? Math.round(marks.reduce((a,m)=>a+m.marks,0)/marks.length) : 0, monthly_trend: monthlyTrend });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getAnalytics = async (req, res) => {
  try {
    const sid = req.user.school_id;
    const students = await Student.findAll({ where: { school_id: sid } });
    const [legacyMarks, examMarks] = await Promise.all([
      Mark.findAll({ where: { school_id: sid } }),
      ExamMark.findAll({ where: { school_id: sid } }),
    ]);
    const attendance = await Attendance.findAll({ where: { school_id: sid } });
    const teachers = await User.findAll({ where: { school_id: sid, role: "teacher" }, attributes: ["id", "name", "section"] });
    const examIds = [...new Set(examMarks.map((item) => item.exam_id).filter(Boolean))];
    const exams = examIds.length
      ? await Exam.findAll({
          where: { id: examIds, school_id: sid },
          attributes: ['id', 'exam_name', 'subject', 'total_max_marks'],
        })
      : [];
    const examMap = new Map(exams.map((exam) => [exam.id, exam]));
    const marks = [
      ...legacyMarks.map((mark) => ({ ...mark.toJSON(), source: 'legacy' })),
      ...examMarks
        .map((mark) => {
          const exam = examMap.get(mark.exam_id);
          if (!exam) return null;
          return {
            id: `exam-${mark.id}`,
            student_id: mark.student_id,
            school_id: mark.school_id,
            subject: exam.subject,
            exam_type: exam.exam_name,
            marks: Number(mark.total) || 0,
            max_marks: Number(exam.total_max_marks) || 100,
            source: 'exam',
          };
        })
        .filter(Boolean),
    ];
    const byClass = {};
    students.forEach(s => { const key = s.section ? s.class+'-'+s.section : s.class; if (!byClass[key]) byClass[key] = { count: 0, marks: [] }; byClass[key].count++; });
    marks.forEach(m => { const st = students.find(s => s.id === m.student_id); if (st) { const key = st.section ? st.class+'-'+st.section : st.class; if (byClass[key]) byClass[key].marks.push(m.marks); } });
    const classStats = Object.entries(byClass).map(([cls, d]) => ({ class: cls, students: d.count, avg_marks: d.marks.length ? Math.round(d.marks.reduce((a,b)=>a+b,0)/d.marks.length) : 0 }));
    const feeCounts = { paid: 0, pending: 0, partial: 0 };
    students.forEach(s => { if (feeCounts[s.fee_status] !== undefined) feeCounts[s.fee_status]++; });
    const subjectMap = {};
    marks.forEach((mark) => {
      if (!mark.subject) return;
      if (!subjectMap[mark.subject]) subjectMap[mark.subject] = [];
      subjectMap[mark.subject].push(mark.marks);
    });
    const subjectStats = Object.entries(subjectMap)
      .map(([subject, values]) => ({
        subject,
        avg_marks: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
        entries: values.length,
      }))
      .sort((a, b) => b.avg_marks - a.avg_marks);
    const attendanceStatusCounts = {
      present: attendance.filter((item) => item.status === "present").length,
      absent: attendance.filter((item) => item.status === "absent").length,
      late: attendance.filter((item) => item.status === "late").length,
    };
    const monthlyAttendanceMap = {};
    attendance.forEach((record) => {
      const monthLabel = new Date(record.date).toLocaleDateString("en-IN", { month: "short" });
      if (!monthlyAttendanceMap[monthLabel]) monthlyAttendanceMap[monthLabel] = { month: monthLabel, total: 0, present: 0 };
      monthlyAttendanceMap[monthLabel].total += 1;
      if (record.status === "present") monthlyAttendanceMap[monthLabel].present += 1;
    });
    const monthlyAttendanceTrend = Object.values(monthlyAttendanceMap).map((item) => ({
      month: item.month,
      attendance_pct: item.total ? Math.round((item.present / item.total) * 100) : 0,
    }));
    const teacherWorkload = teachers.map((teacher) => {
      const parsed = parseTeacherSection(teacher.section);
      const assignments = parsed?.subjects || [];
      return {
        teacher_name: teacher.name,
        assigned_subjects: assignments.length || (parsed?.class_teacher_of ? 1 : 0),
        class_teacher_of: parsed?.class_teacher_of || null,
      };
    });
    res.json({
      class_stats: classStats,
      fee_summary: feeCounts,
      total_marks_entries: marks.length,
      subject_stats: subjectStats,
      attendance_status_counts: attendanceStatusCounts,
      monthly_attendance_trend: monthlyAttendanceTrend,
      teacher_workload: teacherWorkload,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const { title, description, target } = req.body;
    const ann = await Announcement.create({ title, description, target, school_id: req.user.school_id, created_by: req.user.id });
    const roles = target === 'teachers' ? ['teacher'] : target === 'parents' ? ['parent'] : ['teacher','parent'];
    const users = await User.findAll({ where: { school_id: req.user.school_id, role: roles } });
    for (const u of users) { await Notification.create({ school_id: req.user.school_id, user_id: u.id, title, message: description, type: 'info', category: 'announcements' }); }
    await Notification.create({ school_id: req.user.school_id, user_id: null, title, message: description, type: 'info', category: 'announcements' });
    res.status(201).json({ message: 'Announcement created!', announcement: ann });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.findAll({ where: { school_id: req.user.school_id }, order: [['createdAt','DESC']] });
    res.json(announcements);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = sortNotifications(await Notification.findAll({
      where: { school_id: req.user.school_id },
    }));
    res.json(notifications);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, school_id: req.user.school_id },
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    await notification.destroy();
    res.json({ message: 'Notification cleared' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.clearNotificationsByCategory = async (req, res) => {
  try {
    const allowedCategories = [
      'marks',
      'attendance',
      'teacher_attendance',
      'fees',
      'students',
      'teachers',
      'parents',
      'announcements',
      'general',
    ];
    const { category } = req.params;
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid notification category' });
    }

    const where = category === 'general'
      ? {
          school_id: req.user.school_id,
          category: { [Op.notIn]: allowedCategories.filter((item) => item !== 'general') },
        }
      : { school_id: req.user.school_id, category };

    const deletedCount = await Notification.destroy({ where });
    res.json({ message: `${deletedCount} notification(s) cleared`, deletedCount });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateFeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { fee_status } = req.body;
    const student = await Student.findOne({ where: { id, school_id: req.user.school_id } });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const currentSummary = getStudentFeeSummary(student);
    let paid_fee = currentSummary.paid;
    if (fee_status === 'paid') paid_fee = currentSummary.total;
    if (fee_status === 'pending') paid_fee = 0;
    if (fee_status === 'partial') paid_fee = Math.min(Math.max(currentSummary.paid, Math.round(currentSummary.total / 2)), currentSummary.total - 1);

    await student.update({ fee_status, total_fee: currentSummary.total, paid_fee });
    res.json({ message: 'Fee status updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteTeacher = async (req, res) => {
  try {
    await User.destroy({ where: { id: req.params.id, school_id: req.user.school_id, role: 'teacher' } });
    res.json({ message: 'Teacher deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteStudent = async (req, res) => {
  try {
    await Student.destroy({ where: { id: req.params.id, school_id: req.user.school_id } });
    res.json({ message: 'Student deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};


exports.notifyFee = async (req, res) => {
  try {
    const { student_id, student_name } = req.body;
    const student = await Student.findOne({ where: { id: student_id, school_id: req.user.school_id } });
    if (!student || !student.parent_id) return res.status(404).json({ message: 'Parent not found' });
    await Notification.create({ school_id: req.user.school_id, user_id: student.parent_id, title: 'Fee Payment Reminder', message: 'Dear parent, fee payment for ' + student_name + ' is ' + student.fee_status + '. Please clear dues at the earliest.', type: 'alert', category: 'fees' });
    await Notification.create({ school_id: req.user.school_id, user_id: null, title: 'Fee reminder sent', message: `Fee reminder sent for ${student_name}.`, type: 'reminder', category: 'fees' });
    res.json({ message: 'Notification sent' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.notifyAttendance = async (req, res) => {
  try {
    const { student_id, student_name, reason } = req.body;
    const student = await Student.findOne({ where: { id: student_id, school_id: req.user.school_id } });
    if (!student || !student.parent_id) return res.status(404).json({ message: 'Parent not found' });

    const title = reason === 'late'
      ? 'Late Arrival Alert'
      : 'Low Attendance Alert';
    const message = reason === 'late'
      ? 'Dear parent, ' + student_name + ' has been arriving late repeatedly. Please help improve punctuality.'
      : 'Dear parent, ' + student_name + ' has low attendance. Please review and support regular attendance.';

    await Notification.create({
      school_id: req.user.school_id,
      user_id: student.parent_id,
      title,
      message,
      type: 'alert',
      category: 'attendance'
    });

    await Notification.create({
      school_id: req.user.school_id,
      user_id: null,
      title,
      message: `${student_name} was flagged for ${reason === 'late' ? 'repeated late arrival' : 'low attendance'}.`,
      type: 'alert',
      category: 'attendance'
    });

    res.json({ message: 'Attendance notification sent' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.notifyMarks = async (req, res) => {
  try {
    const { student_id, student_name, average, subject } = req.body;
    const student = await Student.findOne({ where: { id: student_id, school_id: req.user.school_id } });
    if (!student || !student.parent_id) return res.status(404).json({ message: 'Parent not found' });

    const title = subject ? `${subject} Performance Alert` : 'Academic Performance Alert';
    const message = subject
      ? `Dear parent, ${student_name} is currently scoring low in ${subject}. Current average is ${average}. Please review and support improvement.`
      : `Dear parent, ${student_name} is currently showing low academic performance. Current average is ${average}. Please review and support improvement.`;

    await Notification.create({
      school_id: req.user.school_id,
      user_id: student.parent_id,
      title,
      message,
      type: 'alert',
      category: 'marks'
    });

    await Notification.create({
      school_id: req.user.school_id,
      user_id: null,
      title,
      message: `${student_name} was flagged for low marks${subject ? ` in ${subject}` : ''}.`,
      type: 'alert',
      category: 'marks'
    });

    res.json({ message: 'Marks notification sent' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getAttendanceOverview = async (req, res) => {
  try {
    const records = await Attendance.findAll({ where: { school_id: req.user.school_id }, order: [['date','DESC']] });
    res.json(records);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getMarksOverview = async (req, res) => {
  try {
    const school_id = req.user.school_id;
    const [legacyMarks, examMarks] = await Promise.all([
      Mark.findAll({ where: { school_id }, order: [['createdAt', 'DESC']] }),
      ExamMark.findAll({ where: { school_id }, order: [['createdAt', 'DESC']] }),
    ]);

    const examIds = [...new Set(examMarks.map((item) => item.exam_id).filter(Boolean))];
    const exams = examIds.length
      ? await Exam.findAll({
          where: { id: examIds, school_id },
          attributes: ['id', 'exam_name', 'subject', 'total_max_marks'],
        })
      : [];
    const examMap = new Map(exams.map((exam) => [exam.id, exam]));

    const normalizedExamMarks = examMarks
      .map((mark) => {
        const exam = examMap.get(mark.exam_id);
        if (!exam) return null;
        return {
          id: `exam-${mark.id}`,
          student_id: mark.student_id,
          school_id: mark.school_id,
          subject: exam.subject,
          exam_type: exam.exam_name,
          marks: Number(mark.total) || 0,
          max_marks: Number(exam.total_max_marks) || 100,
          uploaded_by: null,
          createdAt: mark.createdAt,
          updatedAt: mark.updatedAt,
          source: 'exam',
        };
      })
      .filter(Boolean);

    res.json([
      ...legacyMarks.map((mark) => ({ ...mark.toJSON(), source: 'legacy' })),
      ...normalizedExamMarks,
    ]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
