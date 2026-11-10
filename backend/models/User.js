const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.STRING, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('principal', 'teacher', 'parent'), allowNull: false },
  school_id: { type: DataTypes.INTEGER, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: true },
  subject: { type: DataTypes.STRING, allowNull: true },
  section: { type: DataTypes.TEXT, allowNull: true },
  teacher_type: { type: DataTypes.ENUM('class_teacher', 'subject_teacher'), allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
});

module.exports = User;
