require("dotenv").config();

const bcrypt = require("bcryptjs");
const sequelize = require("../config/db");
const School = require("../models/School");
const Student = require("../models/Student");
const User = require("../models/User");
const ClassTimetable = require("../models/ClassTimetable");
const TeacherTimetable = require("../models/TeacherTimetable");

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD;

if (!DEFAULT_PASSWORD) {
  throw new Error("SEED_DEFAULT_PASSWORD must be configured in backend/.env");
}
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIOD_TIME_SLOTS = [
  "09:00 - 09:45",
  "09:45 - 10:30",
  "10:45 - 11:30",
  "11:30 - 12:15",
  "01:00 - 01:45",
  "01:45 - 02:30",
  "02:45 - 03:30",
  "03:30 - 04:15",
];
const CORE_SUBJECTS = ["English", "Mathematics", "Science", "Social Studies", "Tamil"];
const EXTRA_SUBJECTS = ["Moral Values", "PET"];
const ALL_SUBJECTS = [...CORE_SUBJECTS, ...EXTRA_SUBJECTS];
const SUBJECT_PERIOD_COUNTS = {
  English: 6,
  Mathematics: 6,
  Science: 5,
  "Social Studies": 4,
  Tamil: 4,
  "Moral Values": 2,
  PET: 3,
};

const parseTeacherData = (teacher) => {
  try {
    return JSON.parse(teacher.section);
  } catch {
    return null;
  }
};

const buildSectionPayload = (subjects, classTeacherOf = null) =>
  JSON.stringify({
    class_teacher_of: classTeacherOf,
    subjects: subjects.map((item) => ({
      class: item.className,
      section: item.section,
      subject: item.subject,
    })),
  });

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const createEmptyClassSchedule = () =>
  DAYS.map((day) => ({
    day,
    periods: Array.from({ length: 8 }, (_, index) => ({
      period: index + 1,
      subject: "",
      time: PERIOD_TIME_SLOTS[index] || "",
      room: "",
    })),
  }));

const createEmptyTeacherSchedule = () =>
  DAYS.map((day) => ({
    day,
    periods: Array.from({ length: 8 }, (_, index) => ({
      period: index + 1,
      class_name: "",
      section: "",
      subject: "",
      time: PERIOD_TIME_SLOTS[index] || "",
    })),
  }));

const buildBaseSequence = () => {
  const remaining = { ...SUBJECT_PERIOD_COUNTS };
  const result = [];
  let previous = "";

  while (result.length < 30) {
    const nextSubject = ALL_SUBJECTS
      .filter((subject) => remaining[subject] > 0)
      .sort((left, right) => {
        if (right === previous && left !== previous) return -1;
        if (left === previous && right !== previous) return 1;
        if (remaining[right] !== remaining[left]) return remaining[right] - remaining[left];
        return ALL_SUBJECTS.indexOf(left) - ALL_SUBJECTS.indexOf(right);
      })
      .find((subject) => subject !== previous) || ALL_SUBJECTS.find((subject) => remaining[subject] > 0);

    result.push(nextSubject);
    remaining[nextSubject] -= 1;
    previous = nextSubject;
  }

  return result;
};

const BASE_SEQUENCE = buildBaseSequence();

const rotateSequence = (offset) => {
  const shift = offset % BASE_SEQUENCE.length;
  return BASE_SEQUENCE.slice(shift).concat(BASE_SEQUENCE.slice(0, shift));
};

const buildClassSchedule = (className, section, sequence) => {
  const schedule = createEmptyClassSchedule();
  const room = `Class ${className}-${section}`;

  for (let index = 0; index < 30; index += 1) {
    const dayIndex = Math.floor(index / 5);
    const activeIndex = index % 5;
    const periodIndex = activeIndex < 2 ? activeIndex : activeIndex + 1;
    schedule[dayIndex].periods[periodIndex] = {
      period: periodIndex + 1,
      subject: sequence[index],
      time: PERIOD_TIME_SLOTS[periodIndex] || "",
      room,
    };
  }

  return schedule;
};

const getClassSortKey = (entry) => {
  const numeric = Number(entry.className);
  return `${Number.isFinite(numeric) ? String(numeric).padStart(3, "0") : entry.className}-${entry.section}`;
};

const collectTeacherAssignments = (teachers) => {
  const coverage = new Map();
  const classTeacherMap = new Map();

  teachers.forEach((teacher) => {
    const parsed = parseTeacherData(teacher);
    if (!parsed) return;

    if (parsed.class_teacher_of) {
      classTeacherMap.set(parsed.class_teacher_of, teacher);
      if (teacher.subject) {
        const key = `${parsed.class_teacher_of}|${teacher.subject}`;
        if (!coverage.has(key)) {
          coverage.set(key, teacher);
        }
      }
    }

    (parsed.subjects || []).forEach((row) => {
      if (!row?.class || !row?.subject) return;
      const classKey = `${row.class}-${row.section || ""}`;
      const key = `${classKey}|${row.subject}`;
      if (!coverage.has(key)) {
        coverage.set(key, teacher);
      }
    });
  });

  return { coverage, classTeacherMap };
};

const ensureSupportTeacher = async ({
  school,
  transaction,
  hashedPassword,
  className,
  section,
  subject,
}) => {
  const prefix = `${school.plan.slice(0, 3).toUpperCase()}${String(school.id).padStart(2, "0")}`;
  const email = `${prefix.toLowerCase()}.${className}${section}.${slugify(subject)}@school.demo`;
  const payload = {
    user_id: `TEA-${prefix}-${className}${section}-${slugify(subject)}`.slice(0, 50),
    name: `Class ${className}${section} ${subject} Teacher`,
    email,
    password: hashedPassword,
    role: "teacher",
    school_id: school.id,
    subject,
    teacher_type: subject === "English" ? "class_teacher" : "subject_teacher",
    section: buildSectionPayload([{ className, section, subject }], subject === "English" ? `${className}-${section}` : null),
  };

  const [teacher] = await User.findOrCreate({
    where: { email },
    defaults: payload,
    transaction,
  });

  await teacher.update(payload, { transaction });
  return teacher;
};

const buildTeacherScheduleFromAssignments = (teacher, classScheduleMap) => {
  const parsed = parseTeacherData(teacher);
  const assignments = [];

  if (parsed?.class_teacher_of && teacher.subject) {
    const [className, section] = parsed.class_teacher_of.split("-");
    assignments.push({ className, section: section || "", subject: teacher.subject });
  }

  (parsed?.subjects || []).forEach((row) => {
    if (!row?.class || !row?.subject) return;
    assignments.push({
      className: row.class,
      section: row.section || "",
      subject: row.subject,
    });
  });

  const schedule = createEmptyTeacherSchedule();

  DAYS.forEach((day) => {
    const dayRow = schedule.find((item) => item.day === day);
    for (let period = 1; period <= 8; period += 1) {
      const match = assignments.find((assignment) => {
        const classKey = `${assignment.className}-${assignment.section}`;
        const classSchedule = classScheduleMap.get(classKey);
        const cell = classSchedule?.find((item) => item.day === day)?.periods?.find((slot) => slot.period === period);
        return cell?.subject === assignment.subject;
      });

      if (match) {
        dayRow.periods[period - 1] = {
          period,
          class_name: match.className,
          section: match.section,
          subject: match.subject,
          time: PERIOD_TIME_SLOTS[period - 1] || "",
        };
      }
    }
  });

  return schedule;
};

async function syncSchool(school) {
  const transaction = await sequelize.transaction();

  try {
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const students = await Student.findAll({
      where: { school_id: school.id },
      attributes: ["class", "section", "teacher_id"],
      raw: true,
      transaction,
    });

    const classes = [...new Set(
      students
        .filter((student) => student.class && student.section)
        .map((student) => `${student.class}-${student.section}`)
    )]
      .map((value) => {
        const [className, section] = value.split("-");
        return { className, section: section || "" };
      })
      .sort((left, right) => getClassSortKey(left).localeCompare(getClassSortKey(right)));

    const teachers = await User.findAll({
      where: { school_id: school.id, role: "teacher" },
      order: [["id", "ASC"]],
      transaction,
    });

    const { coverage, classTeacherMap } = collectTeacherAssignments(teachers);
    const classScheduleMap = new Map();
    const supportTeachers = [];

    for (let index = 0; index < classes.length; index += 1) {
      const { className, section } = classes[index];
      const classKey = `${className}-${section}`;

      for (const subject of ALL_SUBJECTS) {
        if (!coverage.has(`${classKey}|${subject}`)) {
          const teacher = await ensureSupportTeacher({
            school,
            transaction,
            hashedPassword,
            className,
            section,
            subject,
          });
          coverage.set(`${classKey}|${subject}`, teacher);
          supportTeachers.push(teacher);
          if (!classTeacherMap.has(classKey) && subject === "English") {
            classTeacherMap.set(classKey, teacher);
          }
        }
      }

      const sequence = rotateSequence(index * 3);
      const schedule = buildClassSchedule(className, section, sequence);
      classScheduleMap.set(classKey, schedule);

      const recordTeacher = classTeacherMap.get(classKey) || coverage.get(`${classKey}|English`) || coverage.get(`${classKey}|Mathematics`);
      const [record] = await ClassTimetable.findOrCreate({
        where: {
          school_id: school.id,
          class_name: className,
          section,
        },
        defaults: {
          school_id: school.id,
          teacher_id: recordTeacher.id,
          class_name: className,
          section,
          timetable_json: JSON.stringify(schedule),
        },
        transaction,
      });

      await record.update(
        {
          teacher_id: recordTeacher.id,
          timetable_json: JSON.stringify(schedule),
        },
        { transaction }
      );
    }

    const refreshedTeachers = await User.findAll({
      where: { school_id: school.id, role: "teacher" },
      order: [["id", "ASC"]],
      transaction,
    });

    for (const teacher of refreshedTeachers) {
      const schedule = buildTeacherScheduleFromAssignments(teacher, classScheduleMap);
      const [record] = await TeacherTimetable.findOrCreate({
        where: {
          school_id: school.id,
          teacher_id: teacher.id,
        },
        defaults: {
          school_id: school.id,
          teacher_id: teacher.id,
          timetable_json: JSON.stringify(schedule),
        },
        transaction,
      });

      await record.update(
        { timetable_json: JSON.stringify(schedule) },
        { transaction }
      );
    }

    await transaction.commit();

    return {
      school: school.name,
      plan: school.plan,
      classCount: classes.length,
      supportTeachersCreated: [...new Set(supportTeachers.map((teacher) => teacher.email))].length,
      teacherTimetableCount: refreshedTeachers.length,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function main() {
  await sequelize.authenticate();

  try {
    const schools = await School.findAll({
      where: { is_active: true },
      order: [["id", "ASC"]],
    });

    const results = [];
    for (const school of schools) {
      results.push(await syncSchool(school));
    }

    console.log(JSON.stringify({ synced: results }, null, 2));
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
