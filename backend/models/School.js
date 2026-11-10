const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const School = sequelize.define('School', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  school_id: { type: DataTypes.STRING, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  plan: { type: DataTypes.ENUM('basic', 'premium'), defaultValue: 'basic' },
  payment_status: { type: DataTypes.ENUM('pending', 'paid'), defaultValue: 'pending' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: false },
  plan_expires_at: { type: DataTypes.DATEONLY, allowNull: true },
  subscription_status: { type: DataTypes.ENUM('trial', 'active', 'expiring', 'expired'), defaultValue: 'trial' },
});

module.exports = School;
