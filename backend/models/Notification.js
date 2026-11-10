const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  school_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT },
  category: { type: DataTypes.STRING, allowNull: false, defaultValue: 'general' },
  type: { type: DataTypes.ENUM('info', 'alert', 'reminder'), defaultValue: 'info' },
  priority: { type: DataTypes.ENUM('normal', 'high', 'critical'), defaultValue: 'normal' },
  source_role: { type: DataTypes.STRING, allowNull: true },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
});

module.exports = Notification;
