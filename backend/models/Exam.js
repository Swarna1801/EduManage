const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Exam = sequelize.define("Exam", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  exam_name: { type: DataTypes.STRING, allowNull: false },
  class: { type: DataTypes.STRING, allowNull: false },
  section: { type: DataTypes.STRING, allowNull: true },
  subject: { type: DataTypes.STRING, allowNull: false },
  parts: { type: DataTypes.TEXT, allowNull: false },
  total_max_marks: { type: DataTypes.INTEGER, allowNull: false },
  school_id: { type: DataTypes.INTEGER, allowNull: false },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { freezeTableName: true, tableName: "exams" });
module.exports = Exam;