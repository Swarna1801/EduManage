const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const InviteLink = require("../models/InviteLink");
const Notification = require("../models/Notification");
const School = require("../models/School");
const Student = require("../models/Student");
const User = require("../models/User");

const generateToken = () => crypto.randomBytes(24).toString("hex");
const generateUserId = (role) => role.toUpperCase().slice(0, 3) + "-" + Math.floor(1000 + Math.random() * 9000);
const generateStudentId = () => "STU-" + Math.floor(1000 + Math.random() * 9000);

const SUBJECTS = ["Mathematics", "Science", "English", "Social Studies", "Tamil", "Hindi", "Physics", "Chemistry", "Biology", "History", "Geography", "Computer Science"];
const CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const SECTIONS = ["A", "B", "C", "D", "E"];

const ensurePremiumSchool = async (schoolId) => {
  const school = await School.findOne({ where: { id: schoolId } });
  return school?.plan === "premium" ? school : null;
};

const createSchoolNotification = async ({ school_id, title, message, type = "info", category = "general" }) => {
  await Notification.create({ school_id, user_id: null, title, message, type, category });
};

const getActiveInvite = async (token, inviteType) => {
  const invite = await InviteLink.findOne({ where: { token, invite_type: inviteType } });
  if (!invite) return { error: "Invite link not found" };
  if (invite.status !== "active") return { error: "This invite link is no longer active" };
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    await invite.update({ status: "expired" });
    return { error: "This invite link has expired" };
  }
  return { invite };
};

const buildTeacherSectionPayload = ({ class_teacher_of, class_teacher_section, subjects }) =>
  JSON.stringify({
    class_teacher_of: class_teacher_of ? `${class_teacher_of}${class_teacher_section ? `-${class_teacher_section}` : ""}` : "",
    subjects: (Array.isArray(subjects) ? subjects : []).filter((row) => row?.class && row?.subject),
  });

exports.generateTeacherInvite = async (req, res) => {
  try {
    const school = await ensurePremiumSchool(req.user.school_id);
    if (!school) return res.status(403).json({ message: "Teacher onboarding links are available on the premium plan only" });

    const invite = await InviteLink.create({
      token: generateToken(),
      school_id: req.user.school_id,
      created_by_user_id: req.user.id,
      created_by_role: "principal",
      invite_type: "teacher_onboarding",
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    });

    res.status(201).json({
      message: "Teacher invite link generated",
      invite_link: `/invite/teacher/${invite.token}`,
      token: invite.token,
      expires_at: invite.expires_at,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.generateParentInvite = async (req, res) => {
  try {
    const school = await ensurePremiumSchool(req.user.school_id);
    if (!school) return res.status(403).json({ message: "Parent onboarding links are available on the premium plan only" });

    const teacher = await User.findOne({ where: { id: req.user.id, school_id: req.user.school_id, role: "teacher" } });
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const invite = await InviteLink.create({
      token: generateToken(),
      school_id: req.user.school_id,
      created_by_user_id: req.user.id,
      created_by_role: "teacher",
      invite_type: "parent_onboarding",
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    });

    res.status(201).json({
      message: "Parent invite link generated",
      invite_link: `/invite/parent/${invite.token}`,
      token: invite.token,
      expires_at: invite.expires_at,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTeacherInviteMeta = async (req, res) => {
  try {
    const { token } = req.params;
    const { invite, error } = await getActiveInvite(token, "teacher_onboarding");
    if (error) return res.status(404).json({ message: error });

    const school = await School.findOne({ where: { id: invite.school_id }, attributes: ["name"] });
    res.json({
      invite_type: "teacher_onboarding",
      school_name: school?.name || "School",
      meta: { subjects: SUBJECTS, classes: CLASSES, sections: SECTIONS },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getParentInviteMeta = async (req, res) => {
  try {
    const { token } = req.params;
    const { invite, error } = await getActiveInvite(token, "parent_onboarding");
    if (error) return res.status(404).json({ message: error });

    const school = await School.findOne({ where: { id: invite.school_id }, attributes: ["name"] });
    res.json({
      invite_type: "parent_onboarding",
      school_name: school?.name || "School",
      meta: { classes: CLASSES, sections: SECTIONS },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.submitTeacherInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const { invite, error } = await getActiveInvite(token, "teacher_onboarding");
    if (error) return res.status(400).json({ message: error });

    const {
      name,
      email,
      password,
      class_teacher_of,
      class_teacher_section,
      subjects,
    } = req.body;

    if (!name || !email || !password) return res.status(400).json({ message: "Name, email, and password are required" });

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "This email is already registered" });

    const validSubjects = (Array.isArray(subjects) ? subjects : []).filter((row) => row?.class && row?.subject);
    if (!validSubjects.length && !class_teacher_of) {
      return res.status(400).json({ message: "Add at least one handling class or class teacher assignment" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const teacher = await User.create({
      user_id: generateUserId("teacher"),
      name,
      email,
      password: hashed,
      role: "teacher",
      school_id: invite.school_id,
      subject: validSubjects[0]?.subject || "",
      section: buildTeacherSectionPayload({ class_teacher_of, class_teacher_section, subjects: validSubjects }),
      teacher_type: class_teacher_of ? "class_teacher" : "subject_teacher",
    });

    await invite.update({ status: "used", used_at: new Date() });

    await createSchoolNotification({
      school_id: invite.school_id,
      title: "Teacher onboarded by invite",
      message: `${name} completed self-onboarding through a premium invite link.`,
      type: "info",
      category: "teachers",
    });

    res.status(201).json({ message: "Teacher profile submitted successfully", teacher_id: teacher.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.submitParentInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const { invite, error } = await getActiveInvite(token, "parent_onboarding");
    if (error) return res.status(400).json({ message: error });

    const {
      parent_name,
      parent_email,
      parent_phone,
      parent_password,
      address,
      children,
    } = req.body;

    if (!parent_name || !parent_email || !parent_password) {
      return res.status(400).json({ message: "Parent name, email, and password are required" });
    }
    if (!Array.isArray(children) || !children.length) {
      return res.status(400).json({ message: "Add at least one child" });
    }

    const creatorTeacher = await User.findOne({
      where: { id: invite.created_by_user_id, school_id: invite.school_id, role: "teacher" },
    });
    if (!creatorTeacher) return res.status(404).json({ message: "Invite owner not found" });

    const existingUser = await User.findOne({ where: { email: parent_email } });
    if (existingUser && existingUser.role !== "parent") {
      return res.status(400).json({ message: "This email is already used by another account type" });
    }

    let parentUser = existingUser;
    if (parentUser) {
      await parentUser.update({
        name: parent_name,
        phone: parent_phone || parentUser.phone || null,
      });
    } else {
      const hashed = await bcrypt.hash(parent_password, 10);
      parentUser = await User.create({
        user_id: generateUserId("parent"),
        name: parent_name,
        email: parent_email,
        password: hashed,
        role: "parent",
        school_id: invite.school_id,
        phone: parent_phone || null,
      });
    }

    const createdStudents = [];
    for (const child of children) {
      if (!child?.name || !child?.class_name) {
        return res.status(400).json({ message: "Each child must have a name and class" });
      }
      const student = await Student.create({
        student_id: generateStudentId(),
        name: child.name,
        class: child.class_name,
        section: child.section || null,
        roll_no: child.roll_no || null,
        admission_no: child.admission_no || null,
        dob: child.dob || null,
        gender: child.gender || null,
        blood_group: child.blood_group || null,
        address: child.address || address || null,
        parent_name,
        parent_email,
        parent_phone: parent_phone || null,
        parent_id: parentUser.id,
        teacher_id: creatorTeacher.id,
        school_id: invite.school_id,
      });
      createdStudents.push(student);
    }

    await invite.update({ status: "used", used_at: new Date() });

    await createSchoolNotification({
      school_id: invite.school_id,
      title: "Parent onboarding completed",
      message: `${parent_name} submitted ${createdStudents.length} child profile${createdStudents.length > 1 ? "s" : ""} through an invite link.`,
      type: "info",
      category: "parents",
    });

    res.status(201).json({
      message: "Parent and children details submitted successfully",
      student_count: createdStudents.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
