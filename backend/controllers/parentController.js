const Student = require("../models/Student");
const Attendance = require("../models/Attendance");
const Mark = require("../models/Mark");
const Notification = require("../models/Notification");
const User = require("../models/User");
const StudentLeave = require("../models/StudentLeave");
const School = require("../models/School");
const ChatMessage = require("../models/ChatMessage");
const ClassTimetable = require("../models/ClassTimetable");
const Exam = require("../models/Exam");
const ExamMark = require("../models/ExamMark");

const parseFeeHistory = (student) => {
  try {
    const parsed = JSON.parse(student?.fee_payment_history || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getFeeSummary = (student) => {
  const total = Number(student?.total_fee) > 0 ? Number(student.total_fee) : 5000;
  let paid = Number(student?.paid_fee) || 0;

  if (paid <= 0 && student?.fee_status === "paid") paid = total;
  if (paid <= 0 && student?.fee_status === "partial") paid = Math.round(total / 2);

  paid = Math.max(0, Math.min(paid, total));
  const remaining = Math.max(total - paid, 0);
  const status = remaining === 0 ? "paid" : paid > 0 ? "partial" : "pending";

  return { total, paid, remaining, status };
};

const serializeStudentWithFees = (student) => {
  const data = typeof student?.toJSON === "function" ? student.toJSON() : student;
  const feeSummary = getFeeSummary(data);
  const feePaymentHistory = parseFeeHistory(data);

  return {
    ...data,
    fee_status: feeSummary.status,
    total_fee: feeSummary.total,
    paid_fee: feeSummary.paid,
    remaining_fee: feeSummary.remaining,
    fee_payment_history: feePaymentHistory,
  };
};

const ensurePremiumSchool = async (schoolId) => {
  const school = await School.findOne({ where: { id: schoolId } });
  return school?.plan === "premium";
};

const parseTeacherData = (teacher) => {
  try { return JSON.parse(teacher.section); } catch { return null; }
};

const getTeacherClassKey = (teacher) => {
  const parsed = parseTeacherData(teacher);
  return parsed?.class_teacher_of || null;
};

const TIMETABLE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const getDefaultTimetable = () =>
  TIMETABLE_DAYS.map((day) => ({
    day,
    periods: Array.from({ length: 8 }, (_, index) => ({
      period: index + 1,
      subject: "",
      time: "",
      room: "",
    })),
  }));

const parseTimetable = (record) => {
  if (!record?.timetable_json) return getDefaultTimetable();
  try {
    const parsed = JSON.parse(record.timetable_json);
    return Array.isArray(parsed) ? parsed : getDefaultTimetable();
  } catch {
    return getDefaultTimetable();
  }
};

const getWorkingDaysForStudentClass = async (student, schoolId) => {
  if (!student?.class) return 0;
  const classmates = await Student.findAll({
    where: {
      school_id: schoolId,
      class: student.class,
      ...(student.section ? { section: student.section } : {}),
    },
    attributes: ["id"],
  });
  const studentIds = classmates.map((item) => item.id);
  if (!studentIds.length) return 0;

  const dateRows = await Attendance.findAll({
    where: { school_id: schoolId, student_id: studentIds },
    attributes: ["date"],
    raw: true,
  });
  return new Set(dateRows.map((item) => item.date)).size;
};

const buildParentMarksSummary = async (studentId, schoolId) => {
  const legacyMarks = await Mark.findAll({
    where: { student_id: studentId, school_id: schoolId },
    order: [["createdAt", "ASC"]],
  });

  const examMarks = await ExamMark.findAll({
    where: { student_id: studentId, school_id: schoolId },
    order: [["createdAt", "ASC"]],
  });

  const examIds = [...new Set(examMarks.map((item) => item.exam_id).filter(Boolean))];
  const exams = examIds.length
    ? await Exam.findAll({
        where: { id: examIds, school_id: schoolId },
        attributes: ["id", "exam_name", "subject", "class", "section", "total_max_marks", "createdAt"],
      })
    : [];
  const examMap = new Map(exams.map((exam) => [exam.id, exam]));

  const combinedRecords = [
    ...legacyMarks.map((mark) => ({
      id: `legacy-${mark.id}`,
      subject: mark.subject,
      marks: Number(mark.marks) || 0,
      max_marks: Number(mark.max_marks) || 100,
      exam_name: mark.exam_type,
      source: "legacy",
      createdAt: mark.createdAt,
    })),
    ...examMarks.map((examMark) => {
      const exam = examMap.get(examMark.exam_id);
      return {
        id: `exam-${examMark.id}`,
        subject: exam?.subject || "",
        marks: Number(examMark.total) || 0,
        max_marks: Number(exam?.total_max_marks) || 100,
        exam_name: exam?.exam_name || "Exam",
        source: "exam",
        createdAt: examMark.createdAt,
      };
    }),
  ]
    .filter((record) => record.subject && Number.isFinite(record.marks))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const subjectBuckets = {};
  combinedRecords.forEach((record) => {
    if (!subjectBuckets[record.subject]) subjectBuckets[record.subject] = [];
    subjectBuckets[record.subject].push(record.marks);
  });

  const subjectSummary = Object.entries(subjectBuckets).map(([subject, values]) => ({
    subject,
    avg: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    count: values.length,
  }));

  return {
    records: combinedRecords,
    subject_summary: subjectSummary,
  };
};

exports.getMyChild = async (req, res) => {
  try {
    const children = await Student.findAll({ where: { parent_id: req.user.id, school_id: req.user.school_id } });
    if (!children.length) return res.status(404).json({ message: "No child linked to this account" });
    const child = children[0];
    const teacher = child.teacher_id ? await User.findOne({ where: { id: child.teacher_id }, attributes: ["id", "name", "email", "phone"] }) : null;
    const attendance = await Attendance.findAll({ where: { student_id: child.id }, order: [["date","DESC"]], limit: 30 });
    const marks = await buildParentMarksSummary(child.id, req.user.school_id);
    const notifications = await Notification.findAll({ where: { school_id: req.user.school_id, user_id: req.user.id }, order: [["createdAt","DESC"]], limit: 10 });
    const leaveRequests = await StudentLeave.findAll({
      where: { school_id: req.user.school_id, parent_id: req.user.id },
      order: [["date", "DESC"]],
      limit: 20,
    });
    const total = attendance.length;
    const present = attendance.filter(a => a.status === "present").length;
    const absent = attendance.filter(a => a.status === "absent").length;
    const late = attendance.filter(a => a.status === "late").length;
    const workingDays = await getWorkingDaysForStudentClass(child, req.user.school_id);
    const timetableRecord = await ClassTimetable.findOne({
      where: {
        school_id: req.user.school_id,
        class_name: child.class,
        section: child.section || null,
      },
    });
    res.json({
      child: { ...serializeStudentWithFees(child), class_teacher: teacher },
      children: children.map((item) => serializeStudentWithFees(item)),
      attendance: {
        records: attendance.slice(0,10),
        total,
        present,
        absent,
        late,
        working_days: workingDays,
        pct: workingDays ? Math.round((present/workingDays)*100) : 0,
      },
      marks,
      notifications,
      leave_requests: leaveRequests,
      timetable: {
        class_name: child.class,
        section: child.section || null,
        schedule: parseTimetable(timetableRecord),
      },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.payFees = async (req, res) => {
  try {
    const { student_id, amount } = req.body;
    const paymentAmount = Number(amount);

    if (!student_id || !Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ message: "Student and valid payment amount are required" });
    }

    const student = await Student.findOne({
      where: { id: student_id, parent_id: req.user.id, school_id: req.user.school_id },
    });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const currentSummary = getFeeSummary(student);
    if (currentSummary.remaining <= 0) {
      return res.status(400).json({ message: "All fees are already paid" });
    }

    const appliedAmount = Math.min(Math.round(paymentAmount), currentSummary.remaining);
    const updatedPaid = currentSummary.paid + appliedAmount;
    const updatedRemaining = Math.max(currentSummary.total - updatedPaid, 0);
    const updatedStatus = updatedRemaining === 0 ? "paid" : "partial";
    const updatedHistory = [
      ...parseFeeHistory(student),
      {
        amount: appliedAmount,
        paid_at: new Date().toISOString(),
        note: "Parent portal payment",
      },
    ];

    await student.update({
      total_fee: currentSummary.total,
      paid_fee: updatedPaid,
      fee_status: updatedStatus,
      fee_payment_history: JSON.stringify(updatedHistory),
    });

    await Notification.create({
      school_id: req.user.school_id,
      user_id: null,
      title: "Fee payment received",
      message: `${req.user.name} paid ${appliedAmount} for ${student.name}. Remaining balance is ${updatedRemaining}.`,
      type: "info",
      category: "fees",
    });

    res.json({
      message: updatedRemaining === 0 ? "Fees cleared successfully" : "Payment recorded successfully",
      student: serializeStudentWithFees(student),
      paid_amount: appliedAmount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTimetable = async (req, res) => {
  try {
    const { child_id } = req.query;
    let student;
    if (child_id) {
      student = await Student.findOne({ where: { id: child_id, parent_id: req.user.id, school_id: req.user.school_id } });
    } else {
      student = await Student.findOne({ where: { parent_id: req.user.id, school_id: req.user.school_id } });
    }
    if (!student) return res.status(404).json({ message: "No child linked to this account" });

    const timetableRecord = await ClassTimetable.findOne({
      where: {
        school_id: req.user.school_id,
        class_name: student.class,
        section: student.section || null,
      },
    });

    res.json({
      student_id: student.id,
      student_name: student.name,
      class_name: student.class,
      section: student.section || null,
      schedule: parseTimetable(timetableRecord),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getStudentDetails = async (req, res) => {
  try {
    const { child_id } = req.query;
    const children = await Student.findAll({ where: { parent_id: req.user.id, school_id: req.user.school_id }, order: [["class", "ASC"], ["section", "ASC"], ["roll_no", "ASC"]] });
    let student;
    if (child_id) {
      student = children.find((item) => String(item.id) === String(child_id));
    } else {
      student = children[0];
    }
    if (!student) return res.status(404).json({ message: "No child linked to this account" });

    const teacher = student.teacher_id ? await User.findOne({ where: { id: student.teacher_id }, attributes: ["id", "name", "email", "phone"] }) : null;
    res.json({
      student,
      children,
      class_teacher: teacher,
      parent: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email || null,
      },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.applyStudentLeave = async (req, res) => {
  try {
    const { student_id, date, reason } = req.body;
    if (!student_id || !date || !reason) return res.status(400).json({ message: "Student, date, and reason are required" });

    const student = await Student.findOne({ where: { id: student_id, parent_id: req.user.id, school_id: req.user.school_id } });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const [leaveRequest, created] = await StudentLeave.findOrCreate({
      where: { school_id: req.user.school_id, student_id: student.id, date },
      defaults: {
        parent_id: req.user.id,
        teacher_id: student.teacher_id || null,
        reason,
        status: "pending",
      },
    });

    if (!created) {
      await leaveRequest.update({
        reason,
        status: "pending",
        teacher_id: student.teacher_id || null,
        reviewed_at: null,
      });
    }

    if (student.teacher_id) {
      await Notification.create({
        school_id: req.user.school_id,
        user_id: student.teacher_id,
        title: "Student leave request",
        message: `${req.user.name} requested leave for ${student.name} on ${date}. Reason: ${reason}.`,
        type: "reminder",
        category: "attendance",
      });
    }

    await Notification.create({
      school_id: req.user.school_id,
      user_id: req.user.id,
      title: "Leave request submitted",
      message: `Leave request submitted for ${student.name} on ${date}. Waiting for class teacher approval.`,
      type: "info",
      category: "attendance",
    });

    res.json({ message: "Leave request sent to class teacher" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getMarks = async (req, res) => {
  try {
    const { child_id } = req.query;
    let student;
    if (child_id) {
      student = await Student.findOne({ where: { id: child_id, parent_id: req.user.id, school_id: req.user.school_id } });
    } else {
      student = await Student.findOne({ where: { parent_id: req.user.id, school_id: req.user.school_id } });
    }
    if (!student) return res.json({ marks: [], student: {} });
    const marks = await Mark.findAll({ where: { student_id: student.id, school_id: req.user.school_id }, order: [["createdAt","ASC"]] });
    res.json({ marks, student });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getAttendance = async (req, res) => {
  try {
    const { child_id } = req.query;
    let student;
    if (child_id) {
      student = await Student.findOne({ where: { id: child_id, parent_id: req.user.id, school_id: req.user.school_id } });
    } else {
      student = await Student.findOne({ where: { parent_id: req.user.id, school_id: req.user.school_id } });
    }
    if (!student) return res.json({ records: [], summary: {}, student: {} });
    const records = await Attendance.findAll({ where: { student_id: student.id, school_id: req.user.school_id }, order: [["date","DESC"]] });
    const total = records.length;
    const present = records.filter(a => a.status === "present").length;
    const absent = records.filter(a => a.status === "absent").length;
    const late = records.filter(a => a.status === "late").length;
    const workingDays = await getWorkingDaysForStudentClass(student, req.user.school_id);
    res.json({ records, student, summary: { total, present, absent, late, working_days: workingDays, pct: workingDays ? Math.round((present/workingDays)*100) : 0 } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { school_id: req.user.school_id, user_id: req.user.id },
      order: [["createdAt","DESC"]],
    });
    res.json(notifications);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, school_id: req.user.school_id, user_id: req.user.id },
    });
    if (!notification) return res.status(404).json({ message: "Notification not found" });

    await notification.destroy();
    res.json({ message: "Notification cleared" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.clearNotificationsByCategory = async (req, res) => {
  try {
    const allowedCategories = ["marks", "attendance", "teacher_attendance", "fees", "students", "teachers", "parents", "announcements", "chat", "general"];
    const { category } = req.params;
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid notification category" });
    }

    const where = { school_id: req.user.school_id, user_id: req.user.id };
    if (category === "general") {
      where.category = { [Op.notIn]: allowedCategories.filter((item) => item !== "general") };
    } else {
      where.category = category;
    }

    const deletedCount = await Notification.destroy({ where });
    res.json({ message: `${deletedCount} notification(s) cleared`, deletedCount });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getChatThreads = async (req, res) => {
  try {
    const isPremium = await ensurePremiumSchool(req.user.school_id);
    if (!isPremium) return res.status(403).json({ message: "Chat room is available on the premium plan only" });

    const children = await Student.findAll({
      where: { parent_id: req.user.id, school_id: req.user.school_id },
      order: [["class", "ASC"], ["section", "ASC"], ["roll_no", "ASC"]],
    });

    const teachers = await User.findAll({
      where: { school_id: req.user.school_id, role: "teacher", is_active: true },
      attributes: ["id", "name", "email", "section"],
    });
    const teacherByClassKey = teachers.reduce((acc, teacher) => {
      const classKey = getTeacherClassKey(teacher);
      if (classKey && !acc[classKey]) acc[classKey] = teacher;
      return acc;
    }, {});

    const childIds = children.map((child) => child.id);
    const latestMessages = childIds.length
      ? await ChatMessage.findAll({
        where: { school_id: req.user.school_id, parent_id: req.user.id, student_id: childIds },
          order: [["createdAt", "DESC"]],
        })
      : [];

    const latestByStudent = new Map();
    latestMessages.forEach((message) => {
      if (!latestByStudent.has(message.student_id)) {
        latestByStudent.set(message.student_id, message);
      }
    });

    const threads = children
      .map((child) => {
        const classKey = `${child.class}${child.section ? `-${child.section}` : ""}`;
        const classTeacher = teacherByClassKey[classKey];
        if (!classTeacher) return null;
        const latest = latestByStudent.get(child.id);
        return {
          student_id: child.id,
          student_name: child.name,
          class_label: `Class ${child.class}${child.section ? ` Section ${child.section}` : ""}`,
          teacher_id: classTeacher.id,
          teacher_name: classTeacher.name || "Teacher",
          teacher_email: classTeacher.email || "",
          latest_message: latest?.message || "",
          latest_message_at: latest?.createdAt || null,
          latest_sender_role: latest?.sender_role || null,
        };
      })
      .filter(Boolean);

    res.json(threads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getChatMessages = async (req, res) => {
  try {
    const isPremium = await ensurePremiumSchool(req.user.school_id);
    if (!isPremium) return res.status(403).json({ message: "Chat room is available on the premium plan only" });

    const { student_id } = req.params;
    const student = await Student.findOne({
      where: { id: student_id, parent_id: req.user.id, school_id: req.user.school_id },
    });
    if (!student) return res.status(404).json({ message: "Chat thread not found" });

    const classKey = `${student.class}${student.section ? `-${student.section}` : ""}`;
    const teachers = await User.findAll({
      where: { school_id: req.user.school_id, role: "teacher", is_active: true },
      attributes: ["id", "name", "email", "section"],
    });
    const teacher = teachers.find((item) => getTeacherClassKey(item) === classKey);
    if (!teacher) return res.status(404).json({ message: "Class teacher chat thread not found" });

    const messages = await ChatMessage.findAll({
      where: {
        school_id: req.user.school_id,
        student_id: student.id,
        parent_id: req.user.id,
        teacher_id: teacher.id,
      },
      order: [["createdAt", "ASC"]],
    });

    res.json({
      thread: {
        student_id: student.id,
        student_name: student.name,
        class_label: `Class ${student.class}${student.section ? ` Section ${student.section}` : ""}`,
        teacher_id: teacher.id,
        teacher_name: teacher?.name || "Teacher",
        teacher_email: teacher?.email || "",
      },
      messages,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.sendChatMessage = async (req, res) => {
  try {
    const isPremium = await ensurePremiumSchool(req.user.school_id);
    if (!isPremium) return res.status(403).json({ message: "Chat room is available on the premium plan only" });

    const { student_id, message } = req.body;
    if (!student_id || !message || !String(message).trim()) {
      return res.status(400).json({ message: "Student and message are required" });
    }

    const student = await Student.findOne({
      where: { id: student_id, parent_id: req.user.id, school_id: req.user.school_id },
    });
    if (!student) return res.status(404).json({ message: "Chat thread not found" });

    const classKey = `${student.class}${student.section ? `-${student.section}` : ""}`;
    const teachers = await User.findAll({
      where: { school_id: req.user.school_id, role: "teacher", is_active: true },
      attributes: ["id", "name", "email", "section"],
    });
    const classTeacher = teachers.find((item) => getTeacherClassKey(item) === classKey);
    if (!classTeacher) return res.status(404).json({ message: "Class teacher chat thread not found" });

    const chatMessage = await ChatMessage.create({
      school_id: req.user.school_id,
      student_id: student.id,
      parent_id: req.user.id,
      teacher_id: classTeacher.id,
      sender_role: "parent",
      sender_id: req.user.id,
      message: String(message).trim(),
    });

    await Notification.create({
      school_id: req.user.school_id,
      user_id: classTeacher.id,
      title: "New parent chat message",
      message: `${req.user.name} sent a message about ${student.name}. Open Chat Room to reply.`,
      type: "info",
      category: "chat",
    });

    res.status(201).json(chatMessage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
