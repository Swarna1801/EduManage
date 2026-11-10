const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ClassTimetable = sequelize.define("ClassTimetable", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  school_id: { type: DataTypes.INTEGER, allowNull: false },
  teacher_id: { type: DataTypes.INTEGER, allowNull: false },
  class_name: { type: DataTypes.STRING, allowNull: false },
  section: { type: DataTypes.STRING, allowNull: true },
  timetable_json: { type: DataTypes.TEXT("long"), allowNull: false },
}, {
  freezeTableName: true,
  tableName: "class_timetables",
  indexes: [
    { unique: true, fields: ["school_id", "class_name", "section"] },
  ],
});

module.exports = ClassTimetable;
