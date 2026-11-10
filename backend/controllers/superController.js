const { Op } = require("sequelize");
const School = require("../models/School");
const User = require("../models/User");
const Student = require("../models/Student");
const Notification = require("../models/Notification");
const Attendance = require("../models/Attendance");
const Mark = require("../models/Mark");
const Announcement = require("../models/Announcement");

const PRIORITY_RANK = { critical: 3, high: 2, normal: 1 };
const EXPIRY_ALERT_DAYS = 7;

const getExpiryState = (school) => {
  if (!school?.plan_expires_at) return "no_expiry";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(school.plan_expires_at);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= EXPIRY_ALERT_DAYS) return "expiring";
  return "active";
};

const getDaysToExpiry = (school) => {
  if (!school?.plan_expires_at) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(school.plan_expires_at);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const sortNotifications = (items) =>
  [...items].sort((a, b) => {
    const priorityDiff = (PRIORITY_RANK[b.priority] || 1) - (PRIORITY_RANK[a.priority] || 1);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

exports.getDashboard = async (req, res) => {
  try {
    const schools = await School.findAll({ order: [["createdAt", "DESC"]] });
    const principals = await User.findAll({
      where: { role: "principal" },
      attributes: ["id", "school_id", "name", "email", "phone", "createdAt"],
    });
    const students = await Student.findAll({ attributes: ["id", "school_id"] });
    const teachers = await User.findAll({ where: { role: "teacher" }, attributes: ["id", "school_id"] });
    const parents = await User.findAll({ where: { role: "parent" }, attributes: ["id", "school_id"] });
    const marks = await Mark.findAll({ attributes: ["id", "school_id"] });
    const attendance = await Attendance.findAll({ attributes: ["id", "school_id"] });
    const schoolNotifications = await Notification.findAll({ attributes: ["id", "school_id"] });
    const announcements = await Announcement.findAll({ attributes: ["id", "school_id"] });
    const notifications = await Notification.findAll({
      where: { source_role: "super_user" },
      order: [["createdAt", "DESC"]],
      limit: 20,
    });

    const principalBySchool = new Map(principals.map((item) => [item.school_id, item]));
    const studentCountBySchool = students.reduce((acc, item) => {
      acc[item.school_id] = (acc[item.school_id] || 0) + 1;
      return acc;
    }, {});
    const teacherCountBySchool = teachers.reduce((acc, item) => {
      acc[item.school_id] = (acc[item.school_id] || 0) + 1;
      return acc;
    }, {});
    const parentCountBySchool = parents.reduce((acc, item) => {
      acc[item.school_id] = (acc[item.school_id] || 0) + 1;
      return acc;
    }, {});
    const markCountBySchool = marks.reduce((acc, item) => {
      acc[item.school_id] = (acc[item.school_id] || 0) + 1;
      return acc;
    }, {});
    const attendanceCountBySchool = attendance.reduce((acc, item) => {
      acc[item.school_id] = (acc[item.school_id] || 0) + 1;
      return acc;
    }, {});
    const notificationCountBySchool = schoolNotifications.reduce((acc, item) => {
      acc[item.school_id] = (acc[item.school_id] || 0) + 1;
      return acc;
    }, {});
    const announcementCountBySchool = announcements.reduce((acc, item) => {
      acc[item.school_id] = (acc[item.school_id] || 0) + 1;
      return acc;
    }, {});

    const schoolRows = schools.map((school) => {
      const principal = principalBySchool.get(school.id);
      const expiry_state = getExpiryState(school);
      const days_to_expiry = getDaysToExpiry(school);
      return {
        id: school.id,
        school_id: school.school_id,
        school_name: school.name,
        plan: school.plan,
        payment_status: school.payment_status,
        is_active: school.is_active,
        plan_expires_at: school.plan_expires_at,
        subscription_status: school.subscription_status,
        expiry_state,
        days_to_expiry,
        principal_name: principal?.name || "Principal not found",
        principal_email: principal?.email || "-",
        principal_phone: principal?.phone || "-",
        total_students: studentCountBySchool[school.id] || 0,
        total_teachers: teacherCountBySchool[school.id] || 0,
        total_parents: parentCountBySchool[school.id] || 0,
        total_marks: markCountBySchool[school.id] || 0,
        total_attendance_records: attendanceCountBySchool[school.id] || 0,
        total_notifications: notificationCountBySchool[school.id] || 0,
        total_announcements: announcementCountBySchool[school.id] || 0,
        joined_on: school.createdAt,
      };
    });

    const summary = {
      total_schools: schoolRows.length,
      premium_schools: schoolRows.filter((item) => item.plan === "premium").length,
      basic_schools: schoolRows.filter((item) => item.plan === "basic").length,
      active_schools: schoolRows.filter((item) => item.is_active).length,
      expiring_soon: schoolRows.filter((item) => item.expiry_state === "expiring").length,
      expired: schoolRows.filter((item) => item.expiry_state === "expired").length,
    };

    res.json({
      summary,
      schools: schoolRows,
      recent_notifications: sortNotifications(notifications).slice(0, 8),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateSchoolPlan = async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id);
    if (!school) return res.status(404).json({ message: "School not found" });

    const nextPlan = req.body.plan || school.plan;
    const nextExpiry = req.body.plan_expires_at || school.plan_expires_at || null;
    const nextPaymentStatus = req.body.payment_status || school.payment_status;
    const nextActive = typeof req.body.is_active === "boolean" ? req.body.is_active : school.is_active;
    const nextSubscriptionStatus = req.body.subscription_status || (nextExpiry ? getExpiryState({ plan_expires_at: nextExpiry }) : school.subscription_status);

    await school.update({
      plan: nextPlan,
      plan_expires_at: nextExpiry,
      payment_status: nextPaymentStatus,
      is_active: nextActive,
      subscription_status: nextSubscriptionStatus === "no_expiry" ? "active" : nextSubscriptionStatus,
    });

    const principals = await User.findAll({ where: { school_id: school.id, role: "principal" }, attributes: ["id", "name", "email"] });
    await Promise.all(principals.map((principal) =>
      Notification.create({
        school_id: school.id,
        user_id: principal.id,
        title: "Subscription plan updated",
        message: `Your school plan is now ${nextPlan.toUpperCase()}${nextExpiry ? ` and expires on ${nextExpiry}` : ""}. This update was applied by the platform owner.`,
        type: "alert",
        category: "subscription",
        priority: "critical",
        source_role: "super_user",
      })
    ));

    res.json({ message: "School subscription updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.sendSchoolNotification = async (req, res) => {
  try {
    const { school_id, title, message, priority = "critical" } = req.body;
    if (!school_id || !title || !message) {
      return res.status(400).json({ message: "School, title, and message are required" });
    }

    const school = await School.findByPk(school_id);
    if (!school) return res.status(404).json({ message: "School not found" });

    const principals = await User.findAll({ where: { school_id, role: "principal" }, attributes: ["id"] });
    if (!principals.length) {
      return res.status(404).json({ message: "No principal account found for this school" });
    }

    await Promise.all(principals.map((principal) =>
      Notification.create({
        school_id,
        user_id: principal.id,
        title,
        message,
        type: priority === "critical" ? "alert" : priority === "high" ? "reminder" : "info",
        category: "subscription",
        priority,
        source_role: "super_user",
      })
    ));

    res.json({ message: "Priority notification sent to principal" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
