const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const TeacherTimetable = sequelize.define("TeacherTimetable", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  school_id: { type: DataTypes.INTEGER, allowNull: false },
  teacher_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  timetable_json: { type: DataTypes.TEXT("long"), allowNull: false },
}, {
  freezeTableName: true,
  tableName: "teacher_timetables",
});

module.exports = TeacherTimetable;
