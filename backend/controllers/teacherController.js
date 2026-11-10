const Student = require("../models/Student");
const Attendance = require("../models/Attendance");
const Mark = require("../models/Mark");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Exam = require("../models/Exam");
const ExamMark = require("../models/ExamMark");
const TeacherAttendance = require("../models/TeacherAttendance");
const StudentLeave = require("../models/StudentLeave");
const School = require("../models/School");
const ChatMessage = require("../models/ChatMessage");
const ClassTimetable = require("../models/ClassTimetable");
const TeacherTimetable = require("../models/TeacherTimetable");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const generateStudentId = () => "STU-" + Math.floor(1000 + Math.random() * 9000);
const generateUserId = (role) => role.toUpperCase().slice(0, 3) + "-" + Math.floor(1000 + Math.random() * 9000);

const parseTeacherData = (teacher) => {
  try { return JSON.parse(teacher.section); } catch { return null; }
};

const getTeacherClassTeacherAssignment = (teacher) => {
  const parsed = parseTeacherData(teacher);
  if (!parsed?.class_teacher_of) return null;
  const [assignedClass, assignedSection] = parsed.class_teacher_of.split("-");
  return {
    class: assignedClass,
    section: assignedSection || null,
  };
};

const TIMETABLE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIOD_TIME_SLOTS = [
  "09:00 - 09:45",
  "09:45 - 10:30",
  "10:45 - 11:30",
  "11:30 - 12:15",
  "01:00 - 01:45",
  "01:45 - 02:30",
  "02:45 - 03:30",
  "03:30 - 04:15",
];
const STARTER_SUBJECTS = ["Mathematics", "Science", "English", "Social Studies", "Computer", "Language", "Library", "Games"];
const ACTIVE_PERIOD_INDEXES_BY_DAY = {
  Monday: [0, 1, 2, 4, 5],
  Tuesday: [0, 1, 3, 4, 6],
  Wednesday: [0, 2, 3, 5, 6],
  Thursday: [1, 2, 4, 5, 7],
  Friday: [0, 1, 3, 4, 6],
  Saturday: [0, 2, 4],
};

const getDefaultClassTimetable = () =>
  TIMETABLE_DAYS.map((day) => ({
    day,
    periods: Array.from({ length: 8 }, (_, index) => ({
      period: index + 1,
      subject: "",
      time: "",
      room: "",
    })),
  }));

const getDefaultTeacherTimetable = () =>
  TIMETABLE_DAYS.map((day) => ({
    day,
    periods: Array.from({ length: 8 }, (_, index) => ({
      period: index + 1,
      class_name: "",
      section: "",
      subject: "",
      time: "",
    })),
  }));

const parseTimetable = (record, fallbackFactory) => {
  if (!record?.timetable_json) return fallbackFactory();
  try {
    const parsed = JSON.parse(record.timetable_json);
    return Array.isArray(parsed) ? parsed : fallbackFactory();
  } catch {
    return fallbackFactory();
  }
};

const buildTeacherSeedSchedule = (teacher) => {
  const assignments = getTeacherClassAssignments(teacher).filter((assignment) => assignment.class);
  if (!assignments.length) return getDefaultTeacherTimetable();

  return TIMETABLE_DAYS.map((day, dayIndex) => ({
    day,
    periods: Array.from({ length: 8 }, (_, periodIndex) => {
      const activeIndexes = ACTIVE_PERIOD_INDEXES_BY_DAY[day] || [];
      if (!activeIndexes.includes(periodIndex)) {
        return {
          period: periodIndex + 1,
          class_name: "",
          section: "",
          subject: "",
          time: PERIOD_TIME_SLOTS[periodIndex] || "",
        };
      }

      const activePosition = activeIndexes.indexOf(periodIndex);
      const assignment = assignments[(dayIndex * 5 + activePosition) % assignments.length];
      return {
        period: periodIndex + 1,
        class_name: assignment.class || "",
        section: assignment.section || "",
        subject: assignment.subject || (assignment.isClassTeacher ? "Class Teacher Hour" : teacher?.subject || "General Period"),
        time: PERIOD_TIME_SLOTS[periodIndex] || "",
      };
    }),
  }));
};

const countFilledTeacherPeriods = (schedule) =>
  (Array.isArray(schedule) ? schedule : []).reduce(
    (total, day) => total + (Array.isArray(day?.periods) ? day.periods.filter((period) => period.class_name && period.subject).length : 0),
    0
  );

const shouldRefreshTeacherSeedSchedule = (schedule, teacher) => {
  const assignments = getTeacherClassAssignments(teacher).filter((assignment) => assignment.class);
  if (!assignments.length) return false;

  const filledCount = countFilledTeacherPeriods(schedule);
  const expectedMinimum = Math.max(assignments.length * 3, 12);
  return filledCount < expectedMinimum;
};

const buildClassSeedSchedule = (teacher) => {
  const classTeacherAssignment = getTeacherClassTeacherAssignment(teacher);
  if (!classTeacherAssignment) return getDefaultClassTimetable();

  const assignments = getTeacherClassAssignments(teacher);
  const classSubjects = assignments
    .filter(
      (assignment) =>
        assignment.class === classTeacherAssignment.class &&
        (assignment.section || "") === (classTeacherAssignment.section || "") &&
        assignment.subject
    )
    .map((assignment) => assignment.subject);

  const uniqueSubjects = Array.from(new Set((classSubjects.length ? classSubjects : assignments.map((assignment) => assignment.subject)).filter(Boolean)));
  const subjectPool = uniqueSubjects.length ? uniqueSubjects : STARTER_SUBJECTS;
  const roomLabel = `Class ${classTeacherAssignment.class}${classTeacherAssignment.section ? `-${classTeacherAssignment.section}` : ""}`;

  return TIMETABLE_DAYS.map((day, dayIndex) => ({
    day,
    periods: Array.from({ length: 8 }, (_, periodIndex) => ({
      period: periodIndex + 1,
      subject: subjectPool[(dayIndex + periodIndex) % subjectPool.length],
      time: PERIOD_TIME_SLOTS[periodIndex] || "",
      room: roomLabel,
    })),
  }));
};

const ensureTeacherTimetableRecord = async (teacher, schoolId) => {
  const [record] = await TeacherTimetable.findOrCreate({
    where: { school_id: schoolId, teacher_id: teacher.id },
    defaults: {
      timetable_json: JSON.stringify(buildTeacherSeedSchedule(teacher)),
    },
  });

  const parsedSchedule = parseTimetable(record, getDefaultTeacherTimetable);
  if (shouldRefreshTeacherSeedSchedule(parsedSchedule, teacher)) {
    const seededSchedule = buildTeacherSeedSchedule(teacher);
    await record.update({ timetable_json: JSON.stringify(seededSchedule) });
    return {
      record,
      schedule: seededSchedule,
    };
  }

  return {
    record,
    schedule: parsedSchedule,
  };
};

const ensureClassTimetableRecord = async (teacher, schoolId) => {
  const classTeacherAssignment = getTeacherClassTeacherAssignment(teacher);
  if (!classTeacherAssignment) return null;

  const [record] = await ClassTimetable.findOrCreate({
    where: {
      school_id: schoolId,
      class_name: classTeacherAssignment.class,
      section: classTeacherAssignment.section,
    },
    defaults: {
      teacher_id: teacher.id,
      timetable_json: JSON.stringify(buildClassSeedSchedule(teacher)),
    },
  });

  return {
    record,
    classTeacherAssignment,
    schedule: parseTimetable(record, getDefaultClassTimetable),
  };
};

const getTeacherTimetableOptions = (teacher) => {
  const assignments = getTeacherClassAssignments(teacher);
  return assignments
    .filter((assignment) => assignment.class)
    .map((assignment) => ({
      label: `Class ${assignment.class}${assignment.section ? ` Section ${assignment.section}` : ""}${assignment.subject ? ` - ${assignment.subject}` : ""}`,
      class_name: assignment.class,
      section: assignment.section || "",
      subject: assignment.subject || "",
      is_class_teacher: !!assignment.isClassTeacher,
    }));
};

const getStudentsForTeacher = async (teacher, school_id) => {
  try {
    const parsed = parseTeacherData(teacher);
    if (!parsed || !parsed.subjects) {
      return await Student.findAll({ where: { school_id, teacher_id: teacher.id } });
    }
    const classes = [];
    if (parsed.class_teacher_of) {
      const parts = parsed.class_teacher_of.split("-");
      classes.push({ class: parts[0], section: parts[1] || null });
    }
    parsed.subjects.forEach(s => {
      if (s.class && !classes.find(c => c.class === s.class && c.section === (s.section || null))) {
        classes.push({ class: s.class, section: s.section || null });
      }
    });
    if (!classes.length) return await Student.findAll({ where: { school_id, teacher_id: teacher.id } });
    const conditions = classes.map(c => {
      const cond = { class: c.class, school_id };
      if (c.section) cond.section = c.section;
      return cond;
    });
    return await Student.findAll({ where: { [Op.or]: conditions } });
  } catch (e) {
    return await Student.findAll({ where: { school_id, teacher_id: teacher.id } });
  }
};

const createSchoolNotification = async ({ school_id, title, message, type = "info", category = "general" }) => {
  await Notification.create({ school_id, user_id: null, title, message, type, category });
};

const createUserNotification = async ({ school_id, user_id, title, message, type = "info", category = "general" }) => {
  if (!user_id) return;
  await Notification.create({ school_id, user_id, title, message, type, category });
};

const ensurePremiumSchool = async (schoolId) => {
  const school = await School.findOne({ where: { id: schoolId } });
  return school?.plan === "premium";
};

const getTeacherClassAssignments = (teacher) => {
  const parsed = parseTeacherData(teacher);
  const assignments = [];
  if (parsed?.class_teacher_of) {
    const parts = parsed.class_teacher_of.split("-");
    assignments.push({ class: parts[0], section: parts[1] || null, subject: null, isClassTeacher: true });
  }
  (parsed?.subjects || []).forEach((subjectRow) => {
    if (!subjectRow.class) return;
    assignments.push({
      class: subjectRow.class,
      section: subjectRow.section || null,
      subject: subjectRow.subject || null,
      isClassTeacher: false,
    });
  });
  return assignments;
};

const getTeacherRoleLabel = (teacher) => {
  const parsed = parseTeacherData(teacher);
  if (parsed?.class_teacher_of) {
    const [cls, section] = parsed.class_teacher_of.split("-");
    return `class teacher of Class ${cls}${section ? " Section " + section : ""}`;
  }
  return "subject teacher";
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

exports.getDashboard = async (req, res) => {
  try {
    const teacher = await User.findOne({ where: { id: req.user.id } });
    const students = await getStudentsForTeacher(teacher, req.user.school_id);
    const studentIds = students.map(s => s.id);
    const today = new Date().toISOString().split("T")[0];
    const todayAtt = studentIds.length ? await Attendance.findAll({ where: { student_id: studentIds, date: today } }) : [];
    const present = todayAtt.filter(a => a.status === "present").length;
    const [legacyMarks, examMarks] = studentIds.length
      ? await Promise.all([
          Mark.findAll({ where: { student_id: studentIds } }),
          ExamMark.findAll({ where: { student_id: studentIds, school_id: req.user.school_id } }),
        ])
      : [[], []];
    const examIds = [...new Set(examMarks.map((item) => item.exam_id).filter(Boolean))];
    const exams = examIds.length
      ? await Exam.findAll({
          where: { id: examIds, school_id: req.user.school_id },
          attributes: ["id", "exam_name", "subject", "total_max_marks"],
        })
      : [];
    const examMap = new Map(exams.map((exam) => [exam.id, exam]));
    const marks = [
      ...legacyMarks.map((mark) => ({ ...mark.toJSON(), source: "legacy" })),
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
            source: "exam",
          };
        })
        .filter(Boolean),
    ];
    const avgMarks = marks.length ? Math.round(marks.reduce((a,m) => a+m.marks,0)/marks.length) : 0;
    const notifications = await Notification.findAll({ where: { school_id: req.user.school_id, [Op.or]: [{ user_id: req.user.id }, { user_id: null }] }, order: [["createdAt","DESC"]], limit: 5 });
    const parsed = parseTeacherData(teacher);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const classTeacherParts = parsed?.class_teacher_of ? parsed.class_teacher_of.split("-") : null;
    const classTeacherStudents = classTeacherParts
      ? await Student.findAll({
          where: {
            school_id: req.user.school_id,
            class: classTeacherParts[0],
            ...(classTeacherParts[1] ? { section: classTeacherParts[1] } : {}),
          },
          attributes: ["id"],
        })
      : [];
    const classTeacherStudentIds = classTeacherStudents.map((student) => student.id);
    const attendanceDoneToday = classTeacherStudentIds.length
      ? await Attendance.count({
          where: {
            school_id: req.user.school_id,
            student_id: classTeacherStudentIds,
            date: today,
          },
        })
      : 0;
    const marksDoneToday = await Notification.count({
      where: {
        school_id: req.user.school_id,
        category: "marks",
        createdAt: { [Op.between]: [todayStart, todayEnd] },
        message: { [Op.like]: `%${req.user.name}%` },
      },
    });
    const attendanceNotifiedToday = await Notification.count({
      where: {
        school_id: req.user.school_id,
        category: "attendance",
        createdAt: { [Op.between]: [todayStart, todayEnd] },
        message: { [Op.like]: `%${req.user.name}%` },
      },
    });
    const todayTeacherAttendance = await TeacherAttendance.findOne({
      where: { school_id: req.user.school_id, teacher_id: req.user.id, date: today },
    });
    const teacherLeaveRequests = await TeacherAttendance.findAll({
      where: {
        school_id: req.user.school_id,
        teacher_id: req.user.id,
        status: { [Op.in]: ["leave_pending", "leave_approved", "leave_rejected"] },
      },
      order: [["date", "ASC"]],
      limit: 10,
    });
    const parentLeaveRequests = await StudentLeave.findAll({
      where: {
        school_id: req.user.school_id,
        teacher_id: req.user.id,
        status: "pending",
      },
      order: [["date", "ASC"]],
      limit: 10,
    });
    const parentLeaveStudentIds = parentLeaveRequests.map((item) => item.student_id);
    const parentLeaveStudents = parentLeaveStudentIds.length
      ? await Student.findAll({ where: { id: parentLeaveStudentIds, school_id: req.user.school_id }, attributes: ["id", "name", "class", "section"] })
      : [];
    const parentLeaveStudentMap = Object.fromEntries(parentLeaveStudents.map((student) => [student.id, student]));
    const subjectBuckets = {};
    marks.forEach((mark) => {
      if (!mark.subject) return;
      if (!subjectBuckets[mark.subject]) subjectBuckets[mark.subject] = [];
      subjectBuckets[mark.subject].push(mark.marks);
    });
    const marksBySubject = Object.entries(subjectBuckets)
      .map(([subject, values]) => ({
        subject,
        avg: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
        entries: values.length,
      }))
      .sort((a, b) => b.avg - a.avg);
    const attendanceByStatus = {
      present: todayAtt.filter((item) => item.status === "present").length,
      absent: todayAtt.filter((item) => item.status === "absent").length,
      late: todayAtt.filter((item) => item.status === "late").length,
    };
    const classStrengthMap = {};
    students.forEach((student) => {
      const key = `${student.class}${student.section ? `-${student.section}` : ""}`;
      classStrengthMap[key] = (classStrengthMap[key] || 0) + 1;
    });
    const classStrength = Object.entries(classStrengthMap).map(([label, total]) => ({ label, total }));
    const classTeacherAssignment = getTeacherClassTeacherAssignment(teacher);
    const teacherTimetableState = await ensureTeacherTimetableRecord(teacher, req.user.school_id);
    const classTimetableState = await ensureClassTimetableRecord(teacher, req.user.school_id);
    let classTimetable = null;
    if (classTeacherAssignment && classTimetableState) {
      classTimetable = {
        class_name: classTeacherAssignment.class,
        section: classTeacherAssignment.section,
        schedule: classTimetableState.schedule,
      };
    }

    res.json({
      total_students: students.length,
      class_teacher_students: classTeacherStudents.length,
      present_today: present,
      attendance_pct: todayAtt.length ? Math.round((present/todayAtt.length)*100) : 0,
      avg_marks: avgMarks,
      students,
      notifications,
      class_teacher_of: parsed && parsed.class_teacher_of ? parsed.class_teacher_of : null,
      subjects_taught: parsed && parsed.subjects ? parsed.subjects : [],
      class_assignments: getTeacherClassAssignments(teacher),
      daily_status: {
        attendance_done: classTeacherStudentIds.length > 0 && attendanceDoneToday > 0,
        attendance_notified: attendanceNotifiedToday > 0,
        marks_done: marksDoneToday > 0,
      },
      teacher_attendance_today: todayTeacherAttendance
        ? {
            status: todayTeacherAttendance.status,
            date: todayTeacherAttendance.date,
            marked_at: todayTeacherAttendance.marked_at,
            leave_reason: todayTeacherAttendance.leave_reason,
            approved_at: todayTeacherAttendance.approved_at,
          }
        : null,
      teacher_leave_requests: teacherLeaveRequests,
      student_leave_requests: parentLeaveRequests.map((request) => ({
        id: request.id,
        date: request.date,
        reason: request.reason,
        status: request.status,
        student_id: request.student_id,
        student_name: parentLeaveStudentMap[request.student_id]?.name || "Student",
        class_label: parentLeaveStudentMap[request.student_id]
          ? `Class ${parentLeaveStudentMap[request.student_id].class}${parentLeaveStudentMap[request.student_id].section ? ` Section ${parentLeaveStudentMap[request.student_id].section}` : ""}`
          : "-",
      })),
      analytics: {
        marks_by_subject: marksBySubject,
        attendance_by_status: attendanceByStatus,
        class_strength: classStrength,
        total_pending_parent_replies: parentLeaveRequests.length,
      },
      teacher_timetable: {
        schedule: teacherTimetableState.schedule,
        options: getTeacherTimetableOptions(teacher),
      },
      class_timetable: classTimetable,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getTimetable = async (req, res) => {
  try {
    const teacher = await User.findOne({ where: { id: req.user.id, school_id: req.user.school_id } });
    const timetableState = await ensureTeacherTimetableRecord(teacher, req.user.school_id);

    res.json({ schedule: timetableState.schedule, options: getTeacherTimetableOptions(teacher) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.saveTimetable = async (req, res) => {
  try {
    const schedule = Array.isArray(req.body?.schedule) ? req.body.schedule : null;
    if (!schedule) return res.status(400).json({ message: "Timetable schedule is required" });

    const [timetable] = await TeacherTimetable.findOrCreate({
      where: {
        school_id: req.user.school_id,
        teacher_id: req.user.id,
      },
      defaults: {
        timetable_json: JSON.stringify(schedule),
      },
    });

    await timetable.update({
      timetable_json: JSON.stringify(schedule),
    });

    res.json({
      message: "Teacher timetable saved successfully",
      schedule,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getClassTimetable = async (req, res) => {
  try {
    const teacher = await User.findOne({ where: { id: req.user.id, school_id: req.user.school_id } });
    const classTimetableState = await ensureClassTimetableRecord(teacher, req.user.school_id);
    if (!classTimetableState) return res.status(403).json({ message: "Only class teachers can manage student timetable" });

    res.json({
      class_name: classTimetableState.classTeacherAssignment.class,
      section: classTimetableState.classTeacherAssignment.section,
      schedule: classTimetableState.schedule,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.saveClassTimetable = async (req, res) => {
  try {
    const teacher = await User.findOne({ where: { id: req.user.id, school_id: req.user.school_id } });
    const classTeacherAssignment = getTeacherClassTeacherAssignment(teacher);
    if (!classTeacherAssignment) return res.status(403).json({ message: "Only class teachers can edit student timetable" });

    const schedule = Array.isArray(req.body?.schedule) ? req.body.schedule : null;
    if (!schedule) return res.status(400).json({ message: "Timetable schedule is required" });

    const [timetable] = await ClassTimetable.findOrCreate({
      where: {
        school_id: req.user.school_id,
        class_name: classTeacherAssignment.class,
        section: classTeacherAssignment.section,
      },
      defaults: {
        teacher_id: req.user.id,
        timetable_json: JSON.stringify(schedule),
      },
    });

    await timetable.update({
      teacher_id: req.user.id,
      timetable_json: JSON.stringify(schedule),
    });

    res.json({
      message: "Student timetable saved successfully",
      class_name: classTeacherAssignment.class,
      section: classTeacherAssignment.section,
      schedule,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyStudents = async (req, res) => {
  try {
    const { class: cls, section } = req.query;
    const teacher = await User.findOne({ where: { id: req.user.id } });
    let students = await getStudentsForTeacher(teacher, req.user.school_id);
    if (cls) students = students.filter(s => s.class === cls);
    if (section) students = students.filter(s => s.section === section);
    res.json(students);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getClassTeacherStudents = async (req, res) => {
  try {
    const teacher = await User.findOne({ where: { id: req.user.id } });
    const parsed = parseTeacherData(teacher);
    if (!parsed || !parsed.class_teacher_of) return res.json([]);
    const parts = parsed.class_teacher_of.split("-");
    const where = { class: parts[0], school_id: req.user.school_id };
    if (parts[1]) where.section = parts[1];
    const students = await Student.findAll({ where });
    res.json(students);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.addClassStudent = async (req, res) => {
  try {
    const teacher = await User.findOne({ where: { id: req.user.id } });
    const parsed = parseTeacherData(teacher);
    if (!parsed || !parsed.class_teacher_of) {
      return res.status(403).json({ message: "Only class teachers can add students" });
    }

    const parts = parsed.class_teacher_of.split("-");
    const assignedClass = parts[0];
    const assignedSection = parts[1] || null;
    const {
      name,
      roll_no,
      dob,
      gender,
      blood_group,
      address,
      parent_name,
      parent_email,
      parent_phone,
      parent_password,
    } = req.body;

    let linkedParentId = null;

    if (parent_email) {
      const existingUser = await User.findOne({ where: { email: parent_email } });
      if (existingUser && existingUser.role !== "parent") {
        return res.status(400).json({ message: "This email is already used by a non-parent account" });
      }

      if (existingUser && existingUser.role === "parent") {
        linkedParentId = existingUser.id;
        await existingUser.update({
          name: parent_name || existingUser.name,
          phone: parent_phone || existingUser.phone || null,
        });
      } else {
        if (!parent_password) {
          return res.status(400).json({ message: "Parent password is required when creating a new parent account" });
        }

        const hashedPassword = await bcrypt.hash(parent_password, 10);
        const parentUser = await User.create({
          user_id: generateUserId("parent"),
          name: parent_name || `${name} Parent`,
          email: parent_email,
          password: hashedPassword,
          role: "parent",
          school_id: req.user.school_id,
          phone: parent_phone || null,
        });
        linkedParentId = parentUser.id;
      }
    }

    const student = await Student.create({
      student_id: generateStudentId(),
      name,
      class: assignedClass,
      section: assignedSection,
      roll_no: roll_no || null,
      dob: dob || null,
      gender: gender || null,
      blood_group: blood_group || null,
      address: address || null,
      parent_name: parent_name || null,
      parent_email: parent_email || null,
      parent_phone: parent_phone || null,
      parent_id: linkedParentId,
      teacher_id: req.user.id,
      school_id: req.user.school_id,
    });

    await createSchoolNotification({
      school_id: req.user.school_id,
      title: "New student added",
      message: `${student.name} was added to Class ${assignedClass}${assignedSection ? " Section " + assignedSection : ""} by ${req.user.name}.`,
      type: "info",
      category: "students",
    });

    if (linkedParentId) {
      await createUserNotification({
        school_id: req.user.school_id,
        user_id: linkedParentId,
        title: "Student profile created",
        message: `${student.name} has been linked to your parent account in the school portal.`,
        type: "info",
        category: "students",
      });
    }

    res.status(201).json({ message: "Student added successfully", student });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateClassStudentParentDetails = async (req, res) => {
  try {
    const teacher = await User.findOne({ where: { id: req.user.id } });
    const parsed = parseTeacherData(teacher);
    if (!parsed || !parsed.class_teacher_of) {
      return res.status(403).json({ message: "Only class teachers can edit parent details" });
    }

    const parts = parsed.class_teacher_of.split("-");
    const assignedClass = parts[0];
    const assignedSection = parts[1] || null;

    const student = await Student.findOne({
      where: {
        id: req.params.id,
        class: assignedClass,
        section: assignedSection,
        school_id: req.user.school_id,
      },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found in your assigned class" });
    }

    const parent_name = (req.body.parent_name || "").trim();
    const parent_email = (req.body.parent_email || "").trim().toLowerCase();
    const parent_phone = (req.body.parent_phone || "").trim();

    let linkedParentId = student.parent_id || null;

    if (parent_email) {
      const existingUser = await User.findOne({ where: { email: parent_email } });
      if (existingUser && existingUser.role !== "parent") {
        return res.status(400).json({ message: "This email is already used by a non-parent account" });
      }

      if (existingUser && existingUser.role === "parent") {
        linkedParentId = existingUser.id;
        await existingUser.update({
          name: parent_name || existingUser.name,
          email: parent_email,
          phone: parent_phone || existingUser.phone || null,
        });
      } else if (student.parent_id) {
        const currentParent = await User.findOne({ where: { id: student.parent_id, role: "parent" } });
        if (currentParent) {
          await currentParent.update({
            name: parent_name || currentParent.name,
            email: parent_email,
            phone: parent_phone || currentParent.phone || null,
          });
          linkedParentId = currentParent.id;
        }
      }
    } else if (student.parent_id) {
      const currentParent = await User.findOne({ where: { id: student.parent_id, role: "parent" } });
      if (currentParent) {
        await currentParent.update({
          name: parent_name || currentParent.name,
          phone: parent_phone || currentParent.phone || null,
        });
      }
    }

    await student.update({
      parent_name: parent_name || null,
      parent_email: parent_email || null,
      parent_phone: parent_phone || null,
      parent_id: linkedParentId,
    });

    res.json({ message: "Parent details updated successfully", student });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.markSelfPresent = async (req, res) => {
  try {
    const date = new Date().toISOString().split("T")[0];
    const [entry, created] = await TeacherAttendance.findOrCreate({
      where: { school_id: req.user.school_id, teacher_id: req.user.id, date },
      defaults: { status: "present", marked_at: new Date() },
    });

    if (!created) {
      await entry.update({
        status: "present",
        marked_at: new Date(),
        leave_reason: null,
        approved_by: null,
        approved_at: null,
      });
    }

    await createSchoolNotification({
      school_id: req.user.school_id,
      title: "Teacher marked present",
      message: `${req.user.name} marked present on ${date}.`,
      type: "info",
      category: "teacher_attendance",
    });

    res.json({ message: "Your attendance has been marked for today" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.applyLeave = async (req, res) => {
  try {
    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ message: "Leave date is required" });
    if (!reason) return res.status(400).json({ message: "Leave reason is required" });

    const [entry, created] = await TeacherAttendance.findOrCreate({
      where: { school_id: req.user.school_id, teacher_id: req.user.id, date },
      defaults: { status: "leave_pending", leave_reason: reason },
    });

    if (!created && entry.status === "present") {
      return res.status(400).json({ message: "Present has already been marked for this date" });
    }

    if (!created) {
      await entry.update({
        status: "leave_pending",
        leave_reason: reason,
        marked_at: null,
        approved_by: null,
        approved_at: null,
      });
    }

    await createSchoolNotification({
      school_id: req.user.school_id,
      title: "Teacher leave request",
      message: `${req.user.name} requested leave for ${date}. Reason: ${reason}.`,
      type: "reminder",
      category: "teacher_attendance",
    });

    res.json({ message: "Leave request submitted to principal" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.reviewStudentLeave = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) return res.status(400).json({ message: "Invalid review status" });

    const leaveRequest = await StudentLeave.findOne({
      where: { id: req.params.id, school_id: req.user.school_id, teacher_id: req.user.id, status: "pending" },
    });
    if (!leaveRequest) return res.status(404).json({ message: "Leave request not found" });

    const student = await Student.findOne({ where: { id: leaveRequest.student_id, school_id: req.user.school_id } });
    await leaveRequest.update({ status, reviewed_at: new Date() });

    await createUserNotification({
      school_id: req.user.school_id,
      user_id: leaveRequest.parent_id,
      title: `Student leave ${status}`,
      message: `${student?.name || "Your child"}'s leave for ${leaveRequest.date} was ${status} by ${req.user.name}.`,
      type: status === "approved" ? "info" : "alert",
      category: "attendance",
    });

    await createSchoolNotification({
      school_id: req.user.school_id,
      title: `Student leave ${status}`,
      message: `${req.user.name} ${status} leave for ${student?.name || "a student"} on ${leaveRequest.date}.`,
      type: status === "approved" ? "info" : "alert",
      category: "attendance",
    });

    res.json({ message: `Student leave ${status}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.markAttendance = async (req, res) => {
  try {
    const { records, date } = req.body;
    const sid = req.user.school_id;
    const attDate = date || new Date().toISOString().split("T")[0];
    const teacher = await User.findOne({ where: { id: req.user.id } });
    const teacherRoleLabel = getTeacherRoleLabel(teacher);
    const studentIds = records.map((record) => record.student_id);
    const students = studentIds.length ? await Student.findAll({ where: { id: studentIds, school_id: sid } }) : [];
    const studentMap = Object.fromEntries(students.map((student) => [student.id, student]));

    for (const r of records) {
      const [att, created] = await Attendance.findOrCreate({
        where: { student_id: r.student_id, date: attDate, school_id: sid },
        defaults: { status: r.status, marked_by: req.user.id },
      });
      if (!created) await att.update({ status: r.status });

      const student = studentMap[r.student_id];
      if (student?.parent_id) {
        await createUserNotification({
          school_id: sid,
          user_id: student.parent_id,
          title: "Attendance updated",
          message: `${student.name} was marked ${r.status} on ${attDate} by ${req.user.name}, ${teacherRoleLabel}.`,
          type: r.status === "absent" || r.status === "late" ? "alert" : "info",
          category: "attendance",
        });
      }
    }

    if (students.length) {
      const sampleStudent = students[0];
      await createSchoolNotification({
        school_id: sid,
        title: "Attendance marked",
        message: `${req.user.name}, ${teacherRoleLabel}, updated attendance for Class ${sampleStudent.class}${sampleStudent.section ? " Section " + sampleStudent.section : ""} on ${attDate}.`,
        type: "info",
        category: "attendance",
      });
    }

    res.json({ message: "Attendance saved successfully" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.uploadMarks = async (req, res) => {
  try {
    const { records, exam_type, subject } = req.body;
    const sid = req.user.school_id;
    const teacher = await User.findOne({ where: { id: req.user.id } });
    const teacherRoleLabel = getTeacherRoleLabel(teacher);
    const studentIds = records.map((record) => record.student_id);
    const students = studentIds.length ? await Student.findAll({ where: { id: studentIds, school_id: sid } }) : [];
    const studentMap = Object.fromEntries(students.map((student) => [student.id, student]));

    for (const r of records) {
      const [mark, created] = await Mark.findOrCreate({
        where: { student_id: r.student_id, school_id: sid, exam_type, subject },
        defaults: { marks: r.marks, max_marks: r.max_marks || 100, uploaded_by: req.user.id },
      });
      if (!created) await mark.update({ marks: r.marks });

      const student = studentMap[r.student_id];
      if (student?.parent_id) {
        await createUserNotification({
          school_id: sid,
          user_id: student.parent_id,
          title: `${subject} marks updated`,
          message: `${student.name}'s ${exam_type} marks in ${subject} were uploaded by ${req.user.name}, ${teacherRoleLabel}.`,
          type: "info",
          category: "marks",
        });
      }
    }

    const sampleStudent = students[0];

    await createSchoolNotification({
      school_id: sid,
      title: exam_type + " marks uploaded",
      message: `${subject} marks were uploaded by ${req.user.name}, ${teacherRoleLabel}${sampleStudent ? `, for Class ${sampleStudent.class}${sampleStudent.section ? " Section " + sampleStudent.section : ""}` : ""}.`,
      type: "info",
      category: "marks",
    });
    res.json({ message: "Marks uploaded successfully" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getStudentAttendance = async (req, res) => {
  try {
    const { student_id } = req.params;
    const student = await Student.findOne({ where: { id: student_id, school_id: req.user.school_id } });
    if (!student) return res.status(404).json({ message: "Student not found" });
    const records = await Attendance.findAll({ where: { student_id, school_id: req.user.school_id }, order: [["date","DESC"]] });
    const total = records.length;
    const present = records.filter(r => r.status === "present").length;
    const workingDays = await getWorkingDaysForStudentClass(student, req.user.school_id);
    res.json({ records, summary: { total, present, working_days: workingDays, pct: workingDays ? Math.round((present/workingDays)*100) : 0 } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({ where: { school_id: req.user.school_id, [Op.or]: [{ user_id: req.user.id }, { user_id: null }] }, order: [["createdAt","DESC"]] });
    res.json(notifications);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        school_id: req.user.school_id,
        [Op.or]: [{ user_id: req.user.id }, { user_id: null }],
      },
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

    const where = {
      school_id: req.user.school_id,
      [Op.or]: [{ user_id: req.user.id }, { user_id: null }],
    };

    if (category === "general") {
      where.category = { [Op.notIn]: allowedCategories.filter((item) => item !== "general") };
    } else {
      where.category = category;
    }

    const deletedCount = await Notification.destroy({ where });
    res.json({ message: `${deletedCount} notification(s) cleared`, deletedCount });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getStudentMarks = async (req, res) => {
  try {
    const marks = await Mark.findAll({ where: { student_id: req.params.student_id, school_id: req.user.school_id }, order: [["createdAt","DESC"]] });
    res.json(marks);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.notifyFee = async (req, res) => {
  try {
    const { student_id } = req.body;
    const teacher = await User.findOne({ where: { id: req.user.id } });
    const allowedStudents = await getStudentsForTeacher(teacher, req.user.school_id);
    const student = allowedStudents.find((item) => item.id === student_id);
    if (!student) return res.status(404).json({ message: "Student not found in your classes" });
    if (!student.parent_id) return res.status(404).json({ message: "Parent not linked for this student" });

    await createUserNotification({
      school_id: req.user.school_id,
      user_id: student.parent_id,
      title: "Fee Payment Reminder",
      message: `Dear parent, fee payment for ${student.name} is currently ${student.fee_status}. Please clear dues at the earliest.`,
      type: "alert",
      category: "fees",
    });

    await createSchoolNotification({
      school_id: req.user.school_id,
      title: "Fee reminder sent",
      message: `${req.user.name} sent a fee reminder for ${student.name}.`,
      type: "reminder",
      category: "fees",
    });

    res.json({ message: "Fee reminder sent to parent" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getChatThreads = async (req, res) => {
  try {
    const isPremium = await ensurePremiumSchool(req.user.school_id);
    if (!isPremium) return res.status(403).json({ message: "Chat room is available on the premium plan only" });

    const teacher = await User.findOne({ where: { id: req.user.id, school_id: req.user.school_id } });
    const classTeacherAssignment = getTeacherClassTeacherAssignment(teacher);
    if (!classTeacherAssignment) return res.json([]);

    const students = await Student.findAll({
      where: {
        school_id: req.user.school_id,
        class: classTeacherAssignment.class,
        ...(classTeacherAssignment.section ? { section: classTeacherAssignment.section } : {}),
        parent_id: { [Op.ne]: null },
      },
      order: [["class", "ASC"], ["section", "ASC"], ["roll_no", "ASC"]],
    });

    const parentIds = [...new Set(students.map((student) => student.parent_id).filter(Boolean))];
    const parents = parentIds.length
      ? await User.findAll({ where: { id: { [Op.in]: parentIds } }, attributes: ["id", "name", "email"] })
      : [];
    const parentMap = Object.fromEntries(parents.map((parent) => [parent.id, parent]));

    const studentIds = students.map((student) => student.id);
    const latestMessages = studentIds.length
      ? await ChatMessage.findAll({
          where: { school_id: req.user.school_id, teacher_id: req.user.id, student_id: { [Op.in]: studentIds } },
          order: [["createdAt", "DESC"]],
        })
      : [];

    const latestByStudent = new Map();
    latestMessages.forEach((message) => {
      if (!latestByStudent.has(message.student_id)) {
        latestByStudent.set(message.student_id, message);
      }
    });

    const threads = students.map((student) => {
      const latest = latestByStudent.get(student.id);
      const parent = parentMap[student.parent_id];
      return {
        student_id: student.id,
        student_name: student.name,
        class_label: `Class ${student.class}${student.section ? ` Section ${student.section}` : ""}`,
        parent_id: student.parent_id,
        parent_name: parent?.name || student.parent_name || "Parent",
        parent_email: parent?.email || student.parent_email || "",
        latest_message: latest?.message || "",
        latest_message_at: latest?.createdAt || null,
        latest_sender_role: latest?.sender_role || null,
      };
    });

    res.json(threads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getChatMessages = async (req, res) => {
  try {
    const isPremium = await ensurePremiumSchool(req.user.school_id);
    if (!isPremium) return res.status(403).json({ message: "Chat room is available on the premium plan only" });

    const teacher = await User.findOne({ where: { id: req.user.id, school_id: req.user.school_id } });
    const classTeacherAssignment = getTeacherClassTeacherAssignment(teacher);
    if (!classTeacherAssignment) return res.status(403).json({ message: "Only class teachers can access the chat room" });

    const { student_id } = req.params;
    const student = await Student.findOne({
      where: {
        id: student_id,
        school_id: req.user.school_id,
        class: classTeacherAssignment.class,
        ...(classTeacherAssignment.section ? { section: classTeacherAssignment.section } : {}),
        parent_id: { [Op.ne]: null },
      },
    });
    if (!student) return res.status(404).json({ message: "Chat thread not found" });

    const parent = await User.findOne({ where: { id: student.parent_id }, attributes: ["id", "name", "email"] });
    const messages = await ChatMessage.findAll({
      where: {
        school_id: req.user.school_id,
        student_id: student.id,
        parent_id: student.parent_id,
        teacher_id: req.user.id,
      },
      order: [["createdAt", "ASC"]],
    });

    res.json({
      thread: {
        student_id: student.id,
        student_name: student.name,
        class_label: `Class ${student.class}${student.section ? ` Section ${student.section}` : ""}`,
        parent_id: student.parent_id,
        parent_name: parent?.name || student.parent_name || "Parent",
        parent_email: parent?.email || student.parent_email || "",
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

    const teacher = await User.findOne({ where: { id: req.user.id, school_id: req.user.school_id } });
    const classTeacherAssignment = getTeacherClassTeacherAssignment(teacher);
    if (!classTeacherAssignment) return res.status(403).json({ message: "Only class teachers can send chat messages" });

    const { student_id, message } = req.body;
    if (!student_id || !message || !String(message).trim()) {
      return res.status(400).json({ message: "Student and message are required" });
    }

    const student = await Student.findOne({
      where: {
        id: student_id,
        school_id: req.user.school_id,
        class: classTeacherAssignment.class,
        ...(classTeacherAssignment.section ? { section: classTeacherAssignment.section } : {}),
        parent_id: { [Op.ne]: null },
      },
    });
    if (!student) return res.status(404).json({ message: "Chat thread not found" });

    const chatMessage = await ChatMessage.create({
      school_id: req.user.school_id,
      student_id: student.id,
      parent_id: student.parent_id,
      teacher_id: req.user.id,
      sender_role: "teacher",
      sender_id: req.user.id,
      message: String(message).trim(),
    });

    await createUserNotification({
      school_id: req.user.school_id,
      user_id: student.parent_id,
      title: "New teacher reply",
      message: `${req.user.name} replied in chat about ${student.name}. Open Chat Room to read it.`,
      type: "info",
      category: "chat",
    });

    res.status(201).json(chatMessage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
