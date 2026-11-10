const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const TeacherAttendance = sequelize.define("TeacherAttendance", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  school_id: { type: DataTypes.INTEGER, allowNull: false },
  teacher_id: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: {
    type: DataTypes.ENUM("present", "leave_pending", "leave_approved", "leave_rejected"),
    allowNull: false,
    defaultValue: "present",
  },
  marked_at: { type: DataTypes.DATE, allowNull: true },
  leave_reason: { type: DataTypes.TEXT, allowNull: true },
  approved_by: { type: DataTypes.INTEGER, allowNull: true },
  approved_at: { type: DataTypes.DATE, allowNull: true },
}, {
  indexes: [
    {
      unique: true,
      fields: ["school_id", "teacher_id", "date"],
    },
  ],
});

module.exports = TeacherAttendance;
