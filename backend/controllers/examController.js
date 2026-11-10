const Exam = require("../models/Exam");
const ExamMark = require("../models/ExamMark");
const Student = require("../models/Student");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { Op } = require("sequelize");

const ACADEMIC_SUBJECTS = ["English", "Mathematics", "Science", "Social Studies", "Tamil"];

const parseTeacherData = (teacher) => {
  try {
    return JSON.parse(teacher?.section || "{}");
  } catch {
    return null;
  }
};

const getTeacherAssignments = (teacher) => {
  const parsed = parseTeacherData(teacher);
  const assignments = [];
  if (parsed?.class_teacher_of) {
    const [className, section] = parsed.class_teacher_of.split("-");
    assignments.push({
      class: className,
      section: section || "",
      subject: teacher?.subject || "",
      is_class_teacher: true,
    });
  }
  (parsed?.subjects || []).forEach((item) => {
    if (!item?.class || !item?.subject) return;
    assignments.push({
      class: item.class,
      section: item.section || "",
      subject: item.subject,
      is_class_teacher: false,
    });
  });
  return assignments;
};

const getClassTeacherOf = (teacher) => {
  const parsed = parseTeacherData(teacher);
  return parsed?.class_teacher_of || null;
};

const getTeacherAssignmentForClass = (teacher, className, section) =>
  getTeacherAssignments(teacher).find(
    (assignment) =>
      assignment.class === className &&
      (assignment.section || "") === (section || "")
  ) || null;

const buildTeacherRoleLabel = (teacher) => {
  const classTeacherOf = getClassTeacherOf(teacher);
  if (!classTeacherOf) return "subject teacher";
  const [cls, section] = classTeacherOf.split("-");
  return `class teacher of Class ${cls}${section ? " Section " + section : ""}`;
};

const getSchoolClassSubjectCoverage = async (schoolId) => {
  const teachers = await User.findAll({
    where: { school_id: schoolId, role: "teacher" },
    attributes: ["id", "name", "email", "subject", "section"],
  });

  const coverage = new Map();

  teachers.forEach((teacher) => {
    getTeacherAssignments(teacher).forEach((assignment) => {
      const classKey = `${assignment.class}-${assignment.section || ""}`;
      if (!coverage.has(classKey)) {
        coverage.set(classKey, new Map());
      }
      const classMap = coverage.get(classKey);
      if (!classMap.has(assignment.subject)) {
        classMap.set(assignment.subject, {
          teacher_id: teacher.id,
          teacher_name: teacher.name,
          teacher_email: teacher.email,
        });
      }
    });
  });

  return coverage;
};

const normalizeExam = (exam) => ({
  ...exam.toJSON(),
  parts: JSON.parse(exam.parts),
  section: exam.section || "",
});

const buildExamReviewGroups = async ({ schoolId, teacher }) => {
  const classTeacherOf = getClassTeacherOf(teacher);
  if (!classTeacherOf) return [];

  const [className, section = ""] = classTeacherOf.split("-");
  const coverage = await getSchoolClassSubjectCoverage(schoolId);
  const classKey = `${className}-${section}`;
  const classSubjectsMap = coverage.get(classKey) || new Map();
  const students = await Student.findAll({
    where: {
      school_id: schoolId,
      class: className,
      ...(section ? { section } : {}),
    },
    attributes: ["id"],
  });
  const studentIds = students.map((student) => student.id);
  const exams = await Exam.findAll({
    where: {
      school_id: schoolId,
      class: className,
      ...(section ? { section } : { section: { [Op.or]: [null, ""] } }),
    },
    order: [["createdAt", "DESC"]],
  });

  const examIds = exams.map((exam) => exam.id);
  const marks = examIds.length
    ? await ExamMark.findAll({
        where: { school_id: schoolId, exam_id: examIds },
        attributes: ["exam_id", "student_id"],
      })
    : [];

  const markCountByExam = marks.reduce((acc, mark) => {
    acc[mark.exam_id] = (acc[mark.exam_id] || 0) + 1;
    return acc;
  }, {});

  const grouped = new Map();
  exams.forEach((exam) => {
    const key = `${exam.exam_name}__${exam.class}__${exam.section || ""}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        exam_name: exam.exam_name,
        class: exam.class,
        section: exam.section || "",
        total_students: studentIds.length,
        subjects: [],
        createdAt: exam.createdAt,
      });
    }
    const group = grouped.get(key);
    if (new Date(exam.createdAt) > new Date(group.createdAt)) {
      group.createdAt = exam.createdAt;
    }
    group.subjects.push({
      exam_id: exam.id,
      subject: exam.subject,
      uploaded: !!markCountByExam[exam.id],
      uploaded_count: markCountByExam[exam.id] || 0,
      total_students: studentIds.length,
      teacher_id: classSubjectsMap.get(exam.subject)?.teacher_id || null,
      teacher_name: classSubjectsMap.get(exam.subject)?.teacher_name || "",
      teacher_email: classSubjectsMap.get(exam.subject)?.teacher_email || "",
    });
  });

  const groups = Array.from(grouped.values()).map((group) => {
    const presentSubjects = new Set(group.subjects.map((item) => item.subject));
    const expectedSubjects = Array.from(
      new Set([
        ...ACADEMIC_SUBJECTS,
        ...Array.from(classSubjectsMap.keys()),
      ])
    ).filter((subject) => ACADEMIC_SUBJECTS.includes(subject));

    expectedSubjects.forEach((subject) => {
      if (!presentSubjects.has(subject)) {
        const teacherInfo = classSubjectsMap.get(subject);
        group.subjects.push({
          exam_id: null,
          subject,
          uploaded: false,
          uploaded_count: 0,
          total_students: studentIds.length,
          teacher_id: teacherInfo?.teacher_id || null,
          teacher_name: teacherInfo?.teacher_name || "",
          teacher_email: teacherInfo?.teacher_email || "",
        });
      }
    });

    group.subjects = group.subjects.sort((left, right) => left.subject.localeCompare(right.subject));
    group.uploaded_subjects = group.subjects.filter((item) => item.uploaded).length;
    group.total_subjects = group.subjects.length;
    return group;
  });

  return groups.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
};

exports.getMarksWorkspace = async (req, res) => {
  try {
    const teacher = await User.findOne({ where: { id: req.user.id, school_id: req.user.school_id } });
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const assignments = getTeacherAssignments(teacher)
      .filter((assignment) => assignment.class && assignment.subject)
      .map((assignment) => ({
        class: assignment.class,
        section: assignment.section || "",
        subject: assignment.subject,
        is_class_teacher: assignment.is_class_teacher,
      }));

    const myExams = await Exam.findAll({
      where: { school_id: req.user.school_id, created_by: req.user.id },
      order: [["createdAt", "DESC"]],
    });
    const myExamIds = myExams.map((exam) => exam.id);
    const myExamMarks = myExamIds.length
      ? await ExamMark.findAll({
          where: { school_id: req.user.school_id, exam_id: myExamIds },
          attributes: ["exam_id"],
        })
      : [];
    const uploadedExamIds = new Set(myExamMarks.map((mark) => mark.exam_id));

    const reviewGroups = await buildExamReviewGroups({ schoolId: req.user.school_id, teacher });

    res.json({
      assignments,
      class_teacher_of: getClassTeacherOf(teacher),
      my_exams: myExams.map((exam) => ({
        ...normalizeExam(exam),
        has_uploaded_marks: uploadedExamIds.has(exam.id),
      })),
      review_groups: reviewGroups,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Teacher: Create exam structure
exports.createExam = async (req, res) => {
  try {
    const { exam_name, class: cls, section, subject, parts } = req.body;
    if (!parts || !parts.length) return res.status(400).json({ message: "Add at least one part" });
    const teacher = await User.findOne({ where: { id: req.user.id, school_id: req.user.school_id } });
    const assignment = getTeacherAssignmentForClass(teacher, cls, section || "");
    if (!assignment || assignment.subject !== subject) {
      return res.status(403).json({ message: "You can create exams only for your own subject in classes you handle" });
    }
    const total_max_marks = parts.reduce((a, p) => a + Number(p.maxMarks), 0);
    const [exam] = await Exam.findOrCreate({
      where: {
        school_id: req.user.school_id,
        class: cls,
        section: section || null,
        subject,
        exam_name,
        created_by: req.user.id,
      },
      defaults: {
        exam_name, class: cls, section: section || null, subject,
        parts: JSON.stringify(parts), total_max_marks,
        school_id: req.user.school_id, created_by: req.user.id,
      },
    });
    await exam.update({
      exam_name, class: cls, section: section || null, subject,
      parts: JSON.stringify(parts), total_max_marks,
    });
    res.status(201).json({ message: "Exam created!", exam: normalizeExam(exam) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { exam_name, class: cls, section, subject, parts } = req.body;
    if (!parts || !parts.length) return res.status(400).json({ message: "Add at least one part" });

    const exam = await Exam.findOne({
      where: { id, school_id: req.user.school_id, created_by: req.user.id },
    });
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const teacher = await User.findOne({ where: { id: req.user.id, school_id: req.user.school_id } });
    const assignment = getTeacherAssignmentForClass(teacher, cls, section || "");
    if (!assignment || assignment.subject !== subject) {
      return res.status(403).json({ message: "You can update exams only for your own subject in classes you handle" });
    }

    const uploadedCount = await ExamMark.count({
      where: { exam_id: id, school_id: req.user.school_id },
    });

    const currentParts = JSON.parse(exam.parts);
    const currentStructure = JSON.stringify({
      class: exam.class,
      section: exam.section || "",
      subject: exam.subject,
      parts: currentParts,
    });
    const nextStructure = JSON.stringify({
      class: cls,
      section: section || "",
      subject,
      parts,
    });

    if (uploadedCount > 0 && currentStructure !== nextStructure) {
      return res.status(400).json({
        message: "Marks already exist for this exam. You can only rename the exam now.",
      });
    }

    const total_max_marks = parts.reduce((a, p) => a + Number(p.maxMarks), 0);
    await exam.update({
      exam_name,
      class: cls,
      section: section || null,
      subject,
      parts: JSON.stringify(parts),
      total_max_marks,
    });

    res.json({
      message: "Exam updated",
      exam: normalizeExam(exam),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Teacher: Get exams (their classes)
exports.getMyExams = async (req, res) => {
  try {
    const { class: cls, section, subject } = req.query;
    const where = { school_id: req.user.school_id, created_by: req.user.id };
    if (cls) where.class = cls;
    if (section) where.section = section;
    if (subject) where.subject = subject;
    const exams = await Exam.findAll({ where, order: [["createdAt", "DESC"]] });
    res.json(exams.map(normalizeExam));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Teacher: Upload marks for an exam
exports.uploadExamMarks = async (req, res) => {
  try {
    const { exam_id, student_marks } = req.body;
    const exam = await Exam.findOne({ where: { id: exam_id, school_id: req.user.school_id } });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    const teacher = await User.findOne({ where: { id: req.user.id } });
    const assignment = getTeacherAssignmentForClass(teacher, exam.class, exam.section || "");
    if (!assignment || assignment.subject !== exam.subject) {
      return res.status(403).json({ message: "You can upload marks only for your own subject exams" });
    }
    let teacherRoleLabel = "subject teacher";
    try {
      const parsed = JSON.parse(teacher?.section || "{}");
      if (parsed?.class_teacher_of) {
        const [cls, section] = parsed.class_teacher_of.split("-");
        teacherRoleLabel = `class teacher of Class ${cls}${section ? " Section " + section : ""}`;
      }
    } catch {}
    const parts = JSON.parse(exam.parts);
    const students = await Student.findAll({
      where: { id: student_marks.map((item) => item.student_id), school_id: req.user.school_id },
      attributes: ["id", "name", "parent_id", "class", "section"],
    });
    const studentMap = Object.fromEntries(students.map((student) => [student.id, student]));
    const results = [];
    for (const sm of student_marks) {
      const total = sm.part_marks.reduce((a, p) => a + Number(p.obtained), 0);
      const percentage = Math.round((total / exam.total_max_marks) * 100);
      const grade = percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B" : percentage >= 60 ? "C" : percentage >= 50 ? "D" : "F";
      const [mark, created] = await ExamMark.findOrCreate({
        where: { exam_id, student_id: sm.student_id, school_id: req.user.school_id },
        defaults: { part_marks: JSON.stringify(sm.part_marks), total, percentage, grade },
      });
      if (!created) await mark.update({ part_marks: JSON.stringify(sm.part_marks), total, percentage, grade });
      results.push(mark);

      const student = studentMap[sm.student_id];
      if (student?.parent_id) {
        await Notification.create({
          school_id: req.user.school_id,
          user_id: student.parent_id,
          title: `${exam.subject} marks updated`,
          message: `${student.name}'s ${exam.exam_name} marks were uploaded by ${req.user.name}, ${teacherRoleLabel}.`,
          type: "info",
          category: "marks",
        });
      }
    }
    await Notification.create({
      school_id: req.user.school_id,
      user_id: null,
      title: `${exam.exam_name} marks uploaded`,
      message: `${exam.subject} part-wise marks were uploaded by ${req.user.name}, ${teacherRoleLabel}, for Class ${exam.class}${exam.section ? " Section " + exam.section : ""}.`,
      type: "info",
      category: "marks",
    });
    res.json({ message: "Marks uploaded successfully!", count: results.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Teacher: Get exam marks
exports.getExamMarks = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findOne({ where: { id, school_id: req.user.school_id } });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    const marks = await ExamMark.findAll({ where: { exam_id: id, school_id: req.user.school_id }, order: [['total','DESC']] });
    const students = await Student.findAll({ where: { school_id: req.user.school_id } });
    const result = marks.map(m => {
      const student = students.find(s => s.id === m.student_id);
      let pm; try { pm = typeof m.part_marks === 'string' ? JSON.parse(m.part_marks) : m.part_marks; } catch(e) { pm = []; }
      return { ...m.toJSON(), part_marks: pm, student_name: student ? student.name : 'Unknown', roll_no: student ? student.roll_no : '' };
    });
    res.json({ exam: normalizeExam(exam), marks: result });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Teacher: Delete exam
exports.deleteExam = async (req, res) => {
  try {
    await ExamMark.destroy({ where: { exam_id: req.params.id, school_id: req.user.school_id } });
    await Exam.destroy({ where: { id: req.params.id, school_id: req.user.school_id, created_by: req.user.id } });
    res.json({ message: "Exam deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Principal: Get all exams
exports.getAllExams = async (req, res) => {
  try {
    const { class: cls, section, subject } = req.query;
    const where = { school_id: req.user.school_id };
    if (cls) where.class = cls;
    if (section) where.section = section;
    if (subject) where.subject = subject;
    const exams = await Exam.findAll({ where, order: [["createdAt", "DESC"]] });
    res.json(exams.map(normalizeExam));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Principal: Analytics
exports.getExamAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findOne({ where: { id, school_id: req.user.school_id } });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    const parts = JSON.parse(exam.parts);
    const marks = await ExamMark.findAll({ where: { exam_id: id, school_id: req.user.school_id } });
    const students = await Student.findAll({ where: { school_id: req.user.school_id } });
    if (!marks.length) return res.json({ exam: { ...normalizeExam(exam), parts }, marks: [], analytics: null });

    const partStats = parts.map(part => {
      const obtained = marks.map(m => {
        const pm = typeof m.part_marks === 'string' ? JSON.parse(m.part_marks) : m.part_marks;
        const p = pm.find(p => p.partName === part.partName);
        return p ? Number(p.obtained) : 0;
      });
      const avg = Math.round(obtained.reduce((a, b) => a + b, 0) / obtained.length);
      return { partName: part.partName, maxMarks: part.maxMarks, avg, highest: Math.max(...obtained), lowest: Math.min(...obtained), avgPct: Math.round((avg / part.maxMarks) * 100) };
    });

    const totals = marks.map(m => m.total);
    const classAvg = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
    const passCount = marks.filter(m => m.percentage >= 50).length;

    const marksWithStudents = marks.map(m => {
      const student = students.find(s => s.id === m.student_id);
      return { ...m.toJSON(), part_marks: typeof m.part_marks === 'string' ? JSON.parse(m.part_marks) : m.part_marks, student_name: student?.name, roll_no: student?.roll_no };
    }).sort((a, b) => b.total - a.total);

    res.json({
      exam: { ...normalizeExam(exam), parts },
      analytics: { partStats, classAvg, highest: Math.max(...totals), lowest: Math.min(...totals), passCount, failCount: marks.length - passCount, totalStudents: marks.length, classPct: Math.round((classAvg / exam.total_max_marks) * 100) },
      marks: marksWithStudents,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Parent: Get child exam marks
exports.getChildExamMarks = async (req, res) => {
  try {
    const { child_id } = req.query;
    const student = child_id
      ? await Student.findOne({ where: { id: child_id, parent_id: req.user.id } })
      : await Student.findOne({ where: { parent_id: req.user.id, school_id: req.user.school_id } });
    if (!student) return res.json({ exams: [], student: {} });
    const examMarks = await ExamMark.findAll({ where: { student_id: student.id, school_id: req.user.school_id } });
    const examIds = examMarks.map(m => m.exam_id);
    const exams = examIds.length ? await Exam.findAll({ where: { id: examIds } }) : [];
    const result = examMarks.map(m => {
      const exam = exams.find(e => e.id === m.exam_id);
      return {
        ...m.toJSON(), part_marks: JSON.parse(m.part_marks),
        exam_name: exam?.exam_name, subject: exam?.subject, class: exam?.class, section: exam?.section,
        parts: exam ? JSON.parse(exam.parts) : [], total_max_marks: exam?.total_max_marks,
      };
    });
    res.json({ exams: result, student });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.notifyPendingSubjectTeacher = async (req, res) => {
  try {
    const { exam_name, class: className, section, subject } = req.body;
    if (!exam_name || !className || !subject) {
      return res.status(400).json({ message: "Exam name, class, and subject are required" });
    }

    const teacher = await User.findOne({ where: { id: req.user.id, school_id: req.user.school_id } });
    const classTeacherOf = getClassTeacherOf(teacher);
    const expectedClassKey = `${className}-${section || ""}`;
    if (!classTeacherOf || classTeacherOf !== expectedClassKey) {
      return res.status(403).json({ message: "Only the class teacher can notify pending subject teachers for this class" });
    }

    const coverage = await getSchoolClassSubjectCoverage(req.user.school_id);
    const teacherInfo = coverage.get(expectedClassKey)?.get(subject);
    if (!teacherInfo?.teacher_id) {
      return res.status(404).json({ message: "Assigned subject teacher not found for this class" });
    }

    await Notification.create({
      school_id: req.user.school_id,
      user_id: teacherInfo.teacher_id,
      title: "Marks upload reminder",
      message: `${req.user.name} requested you to upload ${subject} marks for ${exam_name} in Class ${className}${section ? ` Section ${section}` : ""}.`,
      type: "reminder",
      category: "marks",
    });

    await Notification.create({
      school_id: req.user.school_id,
      user_id: null,
      title: "Marks reminder sent",
      message: `${req.user.name} sent a reminder to ${teacherInfo.teacher_name || "the assigned teacher"} for ${subject} marks in ${exam_name} for Class ${className}${section ? ` Section ${section}` : ""}.`,
      type: "info",
      category: "marks",
    });

    res.json({ message: "Reminder sent to the subject teacher" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
