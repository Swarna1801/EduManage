const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const ExamMark = sequelize.define("ExamMark", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  exam_id: { type: DataTypes.INTEGER, allowNull: false },
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  school_id: { type: DataTypes.INTEGER, allowNull: false },
  part_marks: { type: DataTypes.TEXT, allowNull: false },
  total: { type: DataTypes.INTEGER, allowNull: false },
  percentage: { type: DataTypes.FLOAT, allowNull: false },
  grade: { type: DataTypes.STRING, allowNull: true },
}, { freezeTableName: true, tableName: "exam_marks" });
module.exports = ExamMark;