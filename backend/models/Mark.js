const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Mark = sequelize.define('Mark', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  school_id: { type: DataTypes.INTEGER, allowNull: false },
  subject: { type: DataTypes.STRING, allowNull: false },
  exam_type: { type: DataTypes.STRING, allowNull: false },
  marks: { type: DataTypes.FLOAT, allowNull: false },
  max_marks: { type: DataTypes.FLOAT, defaultValue: 100 },
  uploaded_by: { type: DataTypes.INTEGER },
});

module.exports = Mark;
