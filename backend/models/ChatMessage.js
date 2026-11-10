const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ChatMessage = sequelize.define("ChatMessage", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  school_id: { type: DataTypes.INTEGER, allowNull: false },
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  parent_id: { type: DataTypes.INTEGER, allowNull: false },
  teacher_id: { type: DataTypes.INTEGER, allowNull: false },
  sender_role: { type: DataTypes.ENUM("parent", "teacher"), allowNull: false },
  sender_id: { type: DataTypes.INTEGER, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
}, {
  freezeTableName: true,
  tableName: "chat_messages",
});

module.exports = ChatMessage;
