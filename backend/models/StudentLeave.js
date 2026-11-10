const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StudentLeave = sequelize.define("StudentLeave", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  school_id: { type: DataTypes.INTEGER, allowNull: false },
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  parent_id: { type: DataTypes.INTEGER, allowNull: false },
  teacher_id: { type: DataTypes.INTEGER, allowNull: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: {
    type: DataTypes.ENUM("pending", "approved", "rejected"),
    allowNull: false,
    defaultValue: "pending",
  },
  reviewed_at: { type: DataTypes.DATE, allowNull: true },
}, {
  indexes: [
    {
      fields: ["school_id", "student_id", "date"],
    },
  ],
});

module.exports = StudentLeave;
