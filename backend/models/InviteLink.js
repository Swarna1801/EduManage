const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const InviteLink = sequelize.define("InviteLink", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  token: { type: DataTypes.STRING, allowNull: false, unique: true },
  school_id: { type: DataTypes.INTEGER, allowNull: false },
  created_by_user_id: { type: DataTypes.INTEGER, allowNull: false },
  created_by_role: { type: DataTypes.ENUM("principal", "teacher"), allowNull: false },
  invite_type: { type: DataTypes.ENUM("teacher_onboarding", "parent_onboarding"), allowNull: false },
  status: { type: DataTypes.ENUM("active", "used", "expired"), allowNull: false, defaultValue: "active" },
  expires_at: { type: DataTypes.DATE, allowNull: true },
  used_at: { type: DataTypes.DATE, allowNull: true },
}, { freezeTableName: true, tableName: "invite_links" });

module.exports = InviteLink;
