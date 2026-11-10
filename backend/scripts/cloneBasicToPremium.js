require("dotenv").config();

const sequelize = require("../config/db");
require("../models/School");
require("../models/User");
require("../models/Student");
require("../models/Attendance");
require("../models/Mark");
require("../models/Notification");
require("../models/Announcement");
require("../models/Exam");
require("../models/ExamMark");
require("../models/TeacherAttendance");
require("../models/StudentLeave");
require("../models/ChatMessage");
require("../models/ClassTimetable");
require("../models/TeacherTimetable");
require("../models/InviteLink");

const {
  School,
  User,
  Student,
  Attendance,
  Mark,
  Notification,
  Announcement,
  Exam,
  ExamMark,
  TeacherAttendance,
  StudentLeave,
  ChatMessage,
  ClassTimetable,
  TeacherTimetable,
  InviteLink,
} = sequelize.models;

const addOrgToEmail = (email) => {
  if (!email) return email;
  const atIndex = email.indexOf("@");
  if (atIndex === -1) return `${email}org`;
  return `${email.slice(0, atIndex)}org${email.slice(atIndex)}`;
};

const buildUserId = (userId, fallbackPrefix, index) => {
  if (userId) return `${userId}-ORG`;
  return `${fallbackPrefix}-ORG-${index}`;
};

const buildStudentId = (studentId, index) => {
  if (studentId) return `${studentId}-ORG`;
  return `STU-ORG-${index}`;
};

async function main() {
  const transaction = await sequelize.transaction();
  try {
    const basicSchool = await School.findOne({
      where: { plan: "basic" },
      order: [["id", "ASC"]],
      transaction,
    });
    const premiumSchool = await School.findOne({
      where: { plan: "premium" },
      order: [["id", "ASC"]],
      transaction,
    });

    if (!basicSchool || !premiumSchool) {
      throw new Error("Basic or premium school not found");
    }

    const premiumPrincipal = await User.findOne({
      where: { school_id: premiumSchool.id, role: "principal" },
      order: [["id", "ASC"]],
      transaction,
    });

    if (!premiumPrincipal) {
      throw new Error("Premium school principal not found");
    }

    // Clear target school data except the premium principal.
    await InviteLink.destroy({ where: { school_id: premiumSchool.id }, transaction });
    await ChatMessage.destroy({ where: { school_id: premiumSchool.id }, transaction });
    await StudentLeave.destroy({ where: { school_id: premiumSchool.id }, transaction });
    await TeacherAttendance.destroy({ where: { school_id: premiumSchool.id }, transaction });
    await ExamMark.destroy({ where: { school_id: premiumSchool.id }, transaction });
    await Exam.destroy({ where: { school_id: premiumSchool.id }, transaction });
    await Mark.destroy({ where: { school_id: premiumSchool.id }, transaction });
    await Attendance.destroy({ where: { school_id: premiumSchool.id }, transaction });
    await ClassTimetable.destroy({ where: { school_id: premiumSchool.id }, transaction });
    await TeacherTimetable.destroy({ where: { school_id: premiumSchool.id }, transaction });
    await Notification.destroy({ where: { school_id: premiumSchool.id }, transaction });
    await Announcement.destroy({ where: { school_id: premiumSchool.id }, transaction });
    await Student.destroy({ where: { school_id: premiumSchool.id }, transaction });
    await User.destroy({
      where: { school_id: premiumSchool.id, role: ["teacher", "parent"] },
      transaction,
    });

    const sourceUsers = await User.findAll({
      where: { school_id: basicSchool.id },
      order: [["id", "ASC"]],
      transaction,
    });
    const sourceStudents = await Student.findAll({
      where: { school_id: basicSchool.id },
      order: [["id", "ASC"]],
      transaction,
    });
    const sourceAttendance = await Attendance.findAll({ where: { school_id: basicSchool.id }, transaction });
    const sourceMarks = await Mark.findAll({ where: { school_id: basicSchool.id }, transaction });
    const sourceExams = await Exam.findAll({ where: { school_id: basicSchool.id }, transaction });
    const sourceExamMarks = await ExamMark.findAll({ where: { school_id: basicSchool.id }, transaction });
    const sourceTeacherAttendance = await TeacherAttendance.findAll({ where: { school_id: basicSchool.id }, transaction });
    const sourceStudentLeaves = await StudentLeave.findAll({ where: { school_id: basicSchool.id }, transaction });
    const sourceChatMessages = await ChatMessage.findAll({ where: { school_id: basicSchool.id }, transaction });
    const sourceClassTimetables = await ClassTimetable.findAll({ where: { school_id: basicSchool.id }, transaction });
    const sourceTeacherTimetables = await TeacherTimetable.findAll({ where: { school_id: basicSchool.id }, transaction });
    const sourceAnnouncements = await Announcement.findAll({ where: { school_id: basicSchool.id }, transaction });
    const sourceNotifications = await Notification.findAll({ where: { school_id: basicSchool.id }, transaction });

    const sourcePrincipal = sourceUsers.find((user) => user.role === "principal");
    const userIdMap = new Map();
    if (sourcePrincipal) userIdMap.set(sourcePrincipal.id, premiumPrincipal.id);

    let createdTeachers = 0;
    let createdParents = 0;

    for (const [index, user] of sourceUsers.filter((item) => item.role !== "principal").entries()) {
      const created = await User.create(
        {
          user_id: buildUserId(user.user_id, user.role.toUpperCase().slice(0, 3), index + 1),
          name: user.name,
          email: addOrgToEmail(user.email),
          password: user.password,
          role: user.role,
          school_id: premiumSchool.id,
          phone: user.phone,
          subject: user.subject,
          section: user.section,
          teacher_type: user.teacher_type,
          is_active: user.is_active,
        },
        { transaction }
      );
      userIdMap.set(user.id, created.id);
      if (user.role === "teacher") createdTeachers += 1;
      if (user.role === "parent") createdParents += 1;
    }

    const studentIdMap = new Map();
    let createdStudents = 0;
    for (const [index, student] of sourceStudents.entries()) {
      const created = await Student.create(
        {
          student_id: buildStudentId(student.student_id, index + 1),
          name: student.name,
          class: student.class,
          section: student.section,
          roll_no: student.roll_no,
          admission_no: student.admission_no,
          dob: student.dob,
          gender: student.gender,
          blood_group: student.blood_group,
          address: student.address,
          parent_name: student.parent_name,
          parent_email: student.parent_email ? addOrgToEmail(student.parent_email) : student.parent_email,
          parent_phone: student.parent_phone,
          parent_id: student.parent_id ? userIdMap.get(student.parent_id) || null : null,
          teacher_id: student.teacher_id ? userIdMap.get(student.teacher_id) || null : null,
          school_id: premiumSchool.id,
          total_fee: student.total_fee,
          paid_fee: student.paid_fee,
          fee_payment_history: student.fee_payment_history,
          fee_status: student.fee_status,
          createdAt: student.createdAt,
          updatedAt: student.updatedAt,
        },
        { transaction }
      );
      studentIdMap.set(student.id, created.id);
      createdStudents += 1;
    }

    for (const record of sourceAttendance) {
      await Attendance.create(
        {
          student_id: studentIdMap.get(record.student_id),
          school_id: premiumSchool.id,
          date: record.date,
          status: record.status,
          marked_by: record.marked_by ? userIdMap.get(record.marked_by) || null : null,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
        { transaction }
      );
    }

    for (const record of sourceMarks) {
      await Mark.create(
        {
          student_id: studentIdMap.get(record.student_id),
          school_id: premiumSchool.id,
          subject: record.subject,
          exam_type: record.exam_type,
          marks: record.marks,
          max_marks: record.max_marks,
          uploaded_by: record.uploaded_by ? userIdMap.get(record.uploaded_by) || null : null,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
        { transaction }
      );
    }

    const examIdMap = new Map();
    for (const exam of sourceExams) {
      const created = await Exam.create(
        {
          exam_name: exam.exam_name,
          class: exam.class,
          section: exam.section,
          subject: exam.subject,
          parts: exam.parts,
          total_max_marks: exam.total_max_marks,
          school_id: premiumSchool.id,
          created_by: exam.created_by ? userIdMap.get(exam.created_by) || premiumPrincipal.id : premiumPrincipal.id,
          createdAt: exam.createdAt,
          updatedAt: exam.updatedAt,
        },
        { transaction }
      );
      examIdMap.set(exam.id, created.id);
    }

    for (const mark of sourceExamMarks) {
      await ExamMark.create(
        {
          exam_id: examIdMap.get(mark.exam_id),
          student_id: studentIdMap.get(mark.student_id),
          school_id: premiumSchool.id,
          part_marks: mark.part_marks,
          total: mark.total,
          percentage: mark.percentage,
          grade: mark.grade,
          createdAt: mark.createdAt,
          updatedAt: mark.updatedAt,
        },
        { transaction }
      );
    }

    for (const record of sourceTeacherAttendance) {
      const mappedTeacherId = userIdMap.get(record.teacher_id);
      if (!mappedTeacherId) continue;
      await TeacherAttendance.create(
        {
          school_id: premiumSchool.id,
          teacher_id: mappedTeacherId,
          date: record.date,
          status: record.status,
          marked_at: record.marked_at,
          leave_reason: record.leave_reason,
          approved_by: record.approved_by ? userIdMap.get(record.approved_by) || premiumPrincipal.id : null,
          approved_at: record.approved_at,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
        { transaction }
      );
    }

    for (const record of sourceStudentLeaves) {
      const mappedStudentId = studentIdMap.get(record.student_id);
      const mappedParentId = userIdMap.get(record.parent_id);
      if (!mappedStudentId || !mappedParentId) continue;
      await StudentLeave.create(
        {
          school_id: premiumSchool.id,
          student_id: mappedStudentId,
          parent_id: mappedParentId,
          teacher_id: record.teacher_id ? userIdMap.get(record.teacher_id) || null : null,
          date: record.date,
          reason: record.reason,
          status: record.status,
          reviewed_at: record.reviewed_at,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
        { transaction }
      );
    }

    for (const record of sourceChatMessages) {
      const mappedStudentId = studentIdMap.get(record.student_id);
      const mappedParentId = userIdMap.get(record.parent_id);
      const mappedTeacherId = userIdMap.get(record.teacher_id);
      const mappedSenderId = userIdMap.get(record.sender_id);
      if (!mappedStudentId || !mappedParentId || !mappedTeacherId || !mappedSenderId) continue;
      await ChatMessage.create(
        {
          school_id: premiumSchool.id,
          student_id: mappedStudentId,
          parent_id: mappedParentId,
          teacher_id: mappedTeacherId,
          sender_role: record.sender_role,
          sender_id: mappedSenderId,
          message: record.message,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
        { transaction }
      );
    }

    for (const record of sourceClassTimetables) {
      const mappedTeacherId = userIdMap.get(record.teacher_id);
      if (!mappedTeacherId) continue;
      await ClassTimetable.create(
        {
          school_id: premiumSchool.id,
          teacher_id: mappedTeacherId,
          class_name: record.class_name,
          section: record.section,
          timetable_json: record.timetable_json,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
        { transaction }
      );
    }

    for (const record of sourceTeacherTimetables) {
      const mappedTeacherId = userIdMap.get(record.teacher_id);
      if (!mappedTeacherId) continue;
      await TeacherTimetable.create(
        {
          school_id: premiumSchool.id,
          teacher_id: mappedTeacherId,
          timetable_json: record.timetable_json,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
        { transaction }
      );
    }

    for (const record of sourceAnnouncements) {
      await Announcement.create(
        {
          title: record.title,
          description: record.description,
          target: record.target,
          school_id: premiumSchool.id,
          created_by: record.created_by ? userIdMap.get(record.created_by) || premiumPrincipal.id : premiumPrincipal.id,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
        { transaction }
      );
    }

    for (const record of sourceNotifications) {
      await Notification.create(
        {
          school_id: premiumSchool.id,
          user_id: record.user_id ? userIdMap.get(record.user_id) || null : null,
          title: record.title,
          message: record.message,
          category: record.category,
          type: record.type,
          priority: record.priority,
          source_role: record.source_role,
          is_read: record.is_read,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
        { transaction }
      );
    }

    await transaction.commit();

    console.log(
      JSON.stringify(
        {
          source_school: { id: basicSchool.id, name: basicSchool.name },
          target_school: { id: premiumSchool.id, name: premiumSchool.name },
          created_teachers: createdTeachers,
          created_parents: createdParents,
          created_students: createdStudents,
          cloned_attendance: sourceAttendance.length,
          cloned_marks: sourceMarks.length,
          cloned_exams: sourceExams.length,
          cloned_exam_marks: sourceExamMarks.length,
          cloned_teacher_timetables: sourceTeacherTimetables.length,
          cloned_class_timetables: sourceClassTimetables.length,
        },
        null,
        2
      )
    );
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
