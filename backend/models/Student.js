const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Student = sequelize.define("Student", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  student_id: { type: DataTypes.STRING, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  class: { type: DataTypes.STRING, allowNull: false },
  section: { type: DataTypes.STRING, allowNull: true },
  roll_no: { type: DataTypes.STRING, allowNull: true },
  admission_no: { type: DataTypes.STRING, allowNull: true },
  dob: { type: DataTypes.DATEONLY, allowNull: true },
  gender: { type: DataTypes.STRING, allowNull: true },
  blood_group: { type: DataTypes.STRING, allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  parent_name: { type: DataTypes.STRING, allowNull: true },
  parent_email: { type: DataTypes.STRING, allowNull: true },
  parent_phone: { type: DataTypes.STRING, allowNull: true },
  parent_id: { type: DataTypes.INTEGER, allowNull: true },
  teacher_id: { type: DataTypes.INTEGER, allowNull: true },
  school_id: { type: DataTypes.INTEGER, allowNull: false },
  total_fee: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5000 },
  paid_fee: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  fee_payment_history: { type: DataTypes.TEXT, allowNull: true, defaultValue: "[]" },
  fee_status: { type: DataTypes.ENUM("paid","pending","partial"), defaultValue: "pending" },
}, { freezeTableName: true, tableName: "students" });
module.exports = Student;
