require("dotenv").config();

const bcrypt = require("bcryptjs");
const sequelize = require("../config/db");
const School = require("../models/School");
const User = require("../models/User");
const Student = require("../models/Student");
const Attendance = require("../models/Attendance");
const Mark = require("../models/Mark");
const Notification = require("../models/Notification");
const Announcement = require("../models/Announcement");
const ClassTimetable = require("../models/ClassTimetable");
const TeacherTimetable = require("../models/TeacherTimetable");

const TARGET_PRINCIPAL_EMAIL = process.env.SEED_PRINCIPAL_EMAIL || process.env.BASIC_SEED_PRINCIPAL_EMAIL || null;
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD;

if (!DEFAULT_PASSWORD) {
  throw new Error("SEED_DEFAULT_PASSWORD must be configured in backend/.env");
}
const EXPECTED_PLAN = process.env.SEED_EXPECTED_PLAN || null;

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
const EXTENDED_SUBJECTS = ["Moral Values", "PET"];
const ALL_SUBJECTS = [...CORE_SUBJECTS, ...EXTENDED_SUBJECTS];
const ROTATION_SUBJECTS = ["Science", "Social Studies", "Tamil", "Moral Values", "PET"];
const EXAM_TYPES = ["Unit Test 1", "Quarterly", "Half-Yearly"];
const STUDENTS_PER_HOMEROOM = 5;

const HOMEROOMS = [
  { className: "1", section: "A", group: 0 },
  { className: "1", section: "B", group: 0 },
  { className: "2", section: "A", group: 0 },
  { className: "2", section: "B", group: 0 },
  { className: "3", section: "A", group: 0 },
  { className: "3", section: "B", group: 1 },
  { className: "4", section: "A", group: 1 },
  { className: "4", section: "B", group: 1 },
  { className: "5", section: "A", group: 1 },
  { className: "5", section: "B", group: 1 },
];

const SUBJECT_PERIOD_COUNTS = {
  English: 6,
  Mathematics: 6,
  Science: 5,
  "Social Studies": 4,
  Tamil: 4,
  "Moral Values": 2,
  PET: 3,
};

const parentNames = [
  "Ramesh", "Lakshmi", "Suresh", "Priya", "Ganesh", "Anitha", "Senthil", "Deepa", "Murali", "Kavya",
  "Prakash", "Geetha", "Saravanan", "Revathi", "Sathish", "Uma", "Dinesh", "Shalini", "Venkatesh", "Radha",
  "Kannan", "Mahalakshmi", "Rajesh", "Sudha", "Bala", "Kala", "Mohan", "Latha", "Ravi", "Mala",
  "Arul", "Jaya", "Kumar", "Bhanu", "Naveen", "Selvi", "Siva", "Thenmozhi", "Ashok", "Ranjani",
  "Sridhar", "Vidhya", "Bharath", "Sowmya", "Elango", "Sujatha", "Mani", "Vasudha", "Kishore", "Nalini",
];

const studentNames = [
  "Aarav", "Diya", "Vihaan", "Anaya", "Advik", "Ishita", "Reyansh", "Saanvi", "Krish", "Myra",
  "Arjun", "Kiara", "Vivaan", "Aadhya", "Sai", "Meera", "Kabir", "Ritika", "Dev", "Anika",
  "Rohan", "Nisha", "Rahul", "Sneha", "Karthik", "Pooja", "Harish", "Lavanya", "Yuvan", "Nandini",
  "Mithun", "Keerthana", "Pranav", "Aishwarya", "Tejas", "Akshaya", "Varun", "Harini", "Nikhil", "Shruti",
  "Manoj", "Bhavya", "Sanjay", "Divya", "Aravind", "Janani", "Lokesh", "Preethi", "Tarun", "Madhumitha",
];

const groupHomeRooms = HOMEROOMS.reduce((acc, homeroom) => {
  const key = String(homeroom.group);
  if (!acc[key]) acc[key] = [];
  acc[key].push(homeroom);
  return acc;
}, {});

const slotKeys = Array.from({ length: 30 }, (_, index) => ({
  index,
  day: DAYS[Math.floor(index / 6)],
  period: (index % 6) + 1,
  time: PERIOD_TIME_SLOTS[index % 6],
}));

const createTeacherSectionPayload = ({ classTeacherOf = null, subjects = [] }) =>
  JSON.stringify({
    class_teacher_of: classTeacherOf,
    subjects: subjects.map((item) => ({
      class: item.className,
      section: item.section,
      subject: item.subject,
    })),
  });

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

const cloneCountsTemplate = () =>
  Object.fromEntries(
    Object.entries(SUBJECT_PERIOD_COUNTS).map(([subject, count]) => [subject, count])
  );

const getHomeroomLabel = (homeroom) => `${homeroom.className}-${homeroom.section}`;

const pseudoRandom = (...numbers) => {
  const seed = numbers.join("|");
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1000003;
  }
  return hash;
};

const buildMarkValue = ({ schoolId, studentIndex, examIndex, subjectIndex, classNumber, sectionCode }) => {
  const raw = pseudoRandom(schoolId, studentIndex, examIndex, subjectIndex, classNumber, sectionCode);
  return 52 + (raw % 45);
};

const getFeeStatus = (studentIndex) => {
  if (studentIndex % 5 === 0) return "pending";
  if (studentIndex % 3 === 0) return "partial";
  return "paid";
};

const buildTeacherBlueprints = () => {
  const blueprints = [];
  const groupSubjectAssignments = {
    Mathematics: ["Mathematics"],
    Science: ["Science"],
    Social: ["Social Studies"],
    Tamil: ["Tamil"],
    Moral: ["Moral Values"],
    PET: ["PET"],
  };

  HOMEROOMS.forEach((homeroom) => {
    blueprints.push({
      key: `class-${getHomeroomLabel(homeroom)}`,
      name: `Class ${homeroom.className}${homeroom.section} English Teacher`,
      subject: "English",
      teacherType: "class_teacher",
      classTeacherOf: getHomeroomLabel(homeroom),
      assignments: [{ ...homeroom, subject: "English" }],
    });
  });

  Object.entries(groupHomeRooms).forEach(([groupKey, homerooms]) => {
    Object.entries(groupSubjectAssignments).forEach(([label, subjects]) => {
      blueprints.push({
        key: `group-${groupKey}-${label.toLowerCase()}`,
        name: `Group ${Number(groupKey) + 1} ${label} Teacher`,
        subject: subjects[0],
        teacherType: "subject_teacher",
        classTeacherOf: null,
        assignments: homerooms.flatMap((homeroom) =>
          subjects.map((subject) => ({ ...homeroom, subject }))
        ),
      });
    });
  });

  return blueprints;
};

const TEACHER_BLUEPRINTS = buildTeacherBlueprints();

const getCandidateAssignments = (classes, remaining, subjectOptions) => {
  const availableSubjects = subjectOptions.filter((subject) =>
    classes.some((classIndex) => remaining[classIndex][subject] > 0)
  );
  const candidates = [];

  for (let first = 0; first < availableSubjects.length; first += 1) {
    for (let second = first + 1; second < availableSubjects.length; second += 1) {
      for (let third = second + 1; third < availableSubjects.length; third += 1) {
        const chosenSubjects = [
          availableSubjects[first],
          availableSubjects[second],
          availableSubjects[third],
        ];
        const permutations = [
          [chosenSubjects[0], chosenSubjects[1], chosenSubjects[2]],
          [chosenSubjects[0], chosenSubjects[2], chosenSubjects[1]],
          [chosenSubjects[1], chosenSubjects[0], chosenSubjects[2]],
          [chosenSubjects[1], chosenSubjects[2], chosenSubjects[0]],
          [chosenSubjects[2], chosenSubjects[0], chosenSubjects[1]],
          [chosenSubjects[2], chosenSubjects[1], chosenSubjects[0]],
        ];

        permutations.forEach((permutation) => {
          const isValid = classes.every((classIndex, index) => remaining[classIndex][permutation[index]] > 0);
          if (isValid) {
            const score = permutation.reduce((total, subject) => total + subjectOptions.indexOf(subject), 0);
            candidates.push({
              score,
              pairs: classes.map((classIndex, index) => ({ classIndex, subject: permutation[index] })),
            });
          }
        });
      }
    }
  }

  return candidates.sort((left, right) => left.score - right.score);
};

const buildGroupSchedule = () => {
  const classCount = 5;
  const remaining = Array.from({ length: classCount }, () => cloneCountsTemplate());
  const slots = Array.from({ length: 30 }, () => Array.from({ length: classCount }, () => ""));
  const memo = new Set();

  const recurse = (slotIndex) => {
    if (slotIndex === slotKeys.length) {
      const hasRemaining = remaining.some((counts) =>
        Object.values(counts).some((value) => value !== 0)
      );
      return !hasRemaining;
    }

    const slotsLeft = slotKeys.length - slotIndex;
    const subjectCapacityChecks = [
      "Science",
      "Social Studies",
      "Tamil",
      "Moral Values",
      "PET",
    ];

    for (const subject of ["English", "Mathematics", ...subjectCapacityChecks]) {
      const totalRemaining = remaining.reduce((sum, counts) => sum + counts[subject], 0);
      if (subject === "English" || subject === "Mathematics") {
        if (totalRemaining !== slotsLeft) return false;
      } else if (totalRemaining > slotsLeft) {
        return false;
      }
    }

    const memoKey = `${slotIndex}|${remaining
      .map((counts) => ALL_SUBJECTS.map((subject) => counts[subject]).join(","))
      .join("|")}`;
    if (memo.has(memoKey)) return false;

    const englishCandidates = Array.from({ length: classCount }, (_, index) => index)
      .filter((index) => remaining[index].English > 0)
      .sort((left, right) => remaining[right].English - remaining[left].English);

    for (const englishClass of englishCandidates) {
      const mathCandidates = Array.from({ length: classCount }, (_, index) => index)
        .filter((index) => index !== englishClass && remaining[index].Mathematics > 0)
        .sort((left, right) => remaining[right].Mathematics - remaining[left].Mathematics);

      for (const mathClass of mathCandidates) {
        const openClasses = Array.from({ length: classCount }, (_, index) => index).filter(
          (index) => index !== englishClass && index !== mathClass
        );
        const rotationCandidates = getCandidateAssignments(openClasses, remaining, ROTATION_SUBJECTS);

        for (const candidate of rotationCandidates) {
          slots[slotIndex][englishClass] = "English";
          slots[slotIndex][mathClass] = "Mathematics";
          remaining[englishClass].English -= 1;
          remaining[mathClass].Mathematics -= 1;

          candidate.pairs.forEach(({ classIndex, subject }) => {
            slots[slotIndex][classIndex] = subject;
            remaining[classIndex][subject] -= 1;
          });

          if (recurse(slotIndex + 1)) {
            return true;
          }

          remaining[englishClass].English += 1;
          remaining[mathClass].Mathematics += 1;
          candidate.pairs.forEach(({ classIndex, subject }) => {
            remaining[classIndex][subject] += 1;
            slots[slotIndex][classIndex] = "";
          });
          slots[slotIndex][englishClass] = "";
          slots[slotIndex][mathClass] = "";
        }
      }
    }

    memo.add(memoKey);
    return false;
  };

  if (!recurse(0)) {
    throw new Error("Unable to generate a clash-free timetable for the demo classes");
  }

  return slots;
};

const GROUP_SCHEDULE_TEMPLATE = buildGroupSchedule();

const getTeacherBlueprintForSubject = (homeroom, subject) => {
  if (subject === "English") {
    return `class-${homeroom.className}-${homeroom.section}`;
  }

  const groupKey = homeroom.group;
  if (subject === "Mathematics") return `group-${groupKey}-mathematics`;
  if (subject === "Science") return `group-${groupKey}-science`;
  if (subject === "Social Studies") return `group-${groupKey}-social`;
  if (subject === "Tamil") return `group-${groupKey}-tamil`;
  if (subject === "Moral Values") return `group-${groupKey}-moral`;
  return `group-${groupKey}-pet`;
};

const buildSchoolSeedData = (schoolId) => {
  const classSchedules = new Map();
  const teacherSchedules = new Map();

  HOMEROOMS.forEach((homeroom) => {
    classSchedules.set(getHomeroomLabel(homeroom), createEmptyClassSchedule());
  });

  TEACHER_BLUEPRINTS.forEach((teacher) => {
    teacherSchedules.set(teacher.key, createEmptyTeacherSchedule());
  });

  Object.entries(groupHomeRooms).forEach(([groupKey, homerooms]) => {
    GROUP_SCHEDULE_TEMPLATE.forEach((slotSubjects, slotIndex) => {
      const slotMeta = slotKeys[slotIndex];
      homerooms.forEach((homeroom, classIndex) => {
        const subject = slotSubjects[classIndex];
        const roomLabel = `Class ${homeroom.className}-${homeroom.section}`;
        const classSchedule = classSchedules.get(getHomeroomLabel(homeroom));
        classSchedule.find((item) => item.day === slotMeta.day).periods[slotMeta.period - 1] = {
          period: slotMeta.period,
          subject,
          time: slotMeta.time,
          room: roomLabel,
        };

        const teacherKey = getTeacherBlueprintForSubject(homeroom, subject);
        const teacherSchedule = teacherSchedules.get(teacherKey);
        teacherSchedule.find((item) => item.day === slotMeta.day).periods[slotMeta.period - 1] = {
          period: slotMeta.period,
          class_name: homeroom.className,
          section: homeroom.section,
          subject,
          time: slotMeta.time,
        };
      });
    });
  });

  return {
    schoolId,
    classSchedules,
    teacherSchedules,
  };
};

const ensureTeacher = async ({ transaction, school, hashedPassword, blueprint, teacherIndex }) => {
  const schoolPrefix = `${school.plan.slice(0, 3).toUpperCase()}${String(school.id).padStart(2, "0")}`;
  const sectionPayload = createTeacherSectionPayload({
    classTeacherOf: blueprint.classTeacherOf,
    subjects: blueprint.assignments,
  });

  const payload = {
    user_id: `TEA-${schoolPrefix}-${String(teacherIndex + 1).padStart(3, "0")}`,
    name: blueprint.name,
    email: `${schoolPrefix.toLowerCase()}.teacher${String(teacherIndex + 1).padStart(2, "0")}@school.demo`,
    password: hashedPassword,
    role: "teacher",
    school_id: school.id,
    subject: blueprint.subject,
    section: sectionPayload,
    teacher_type: blueprint.teacherType,
  };

  const [teacher] = await User.findOrCreate({
    where: { email: payload.email },
    defaults: payload,
    transaction,
  });

  await teacher.update(payload, { transaction });

  return teacher;
};

const ensureParent = async ({ transaction, school, hashedPassword, parentIndex }) => {
  const schoolPrefix = `${school.plan.slice(0, 3).toUpperCase()}${String(school.id).padStart(2, "0")}`;
  const payload = {
    user_id: `PAR-${schoolPrefix}-${String(parentIndex + 1).padStart(3, "0")}`,
    name: `${parentNames[parentIndex % parentNames.length]} Parent`,
    email: `${schoolPrefix.toLowerCase()}.parent${String(parentIndex + 1).padStart(2, "0")}@school.demo`,
    password: hashedPassword,
    role: "parent",
    school_id: school.id,
  };

  const [parent] = await User.findOrCreate({
    where: { email: payload.email },
    defaults: payload,
    transaction,
  });

  await parent.update(payload, { transaction });
  return parent;
};

const ensureStudent = async ({ transaction, school, homeroom, homeroomIndex, studentOffset, parent, classTeacher }) => {
  const schoolPrefix = `${school.plan.slice(0, 3).toUpperCase()}${String(school.id).padStart(2, "0")}`;
  const globalStudentIndex = homeroomIndex * STUDENTS_PER_HOMEROOM + studentOffset + 1;
  const rollSuffix = String(studentOffset + 1).padStart(2, "0");
  const payload = {
    student_id: `STU-${schoolPrefix}-${String(globalStudentIndex).padStart(3, "0")}`,
    name: `${studentNames[(globalStudentIndex - 1) % studentNames.length]} Student`,
    class: homeroom.className,
    section: homeroom.section,
    roll_no: `${homeroom.className}${homeroom.section}${rollSuffix}`,
    parent_id: parent.id,
    parent_name: parent.name,
    parent_email: parent.email,
    teacher_id: classTeacher.id,
    school_id: school.id,
    fee_status: getFeeStatus(globalStudentIndex),
  };

  const [student] = await Student.findOrCreate({
    where: { student_id: payload.student_id },
    defaults: payload,
    transaction,
  });

  await student.update(payload, { transaction });
  return { student, globalStudentIndex };
};

const seedSchool = async ({ school, principal }) => {
  const transaction = await sequelize.transaction();

  try {
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const schoolSeedData = buildSchoolSeedData(school.id);
    const teacherByKey = new Map();

    for (let index = 0; index < TEACHER_BLUEPRINTS.length; index += 1) {
      const teacher = await ensureTeacher({
        transaction,
        school,
        hashedPassword,
        blueprint: TEACHER_BLUEPRINTS[index],
        teacherIndex: index,
      });
      teacherByKey.set(TEACHER_BLUEPRINTS[index].key, teacher);
    }

    const parents = [];
    for (let index = 0; index < HOMEROOMS.length * STUDENTS_PER_HOMEROOM; index += 1) {
      parents.push(
        await ensureParent({
          transaction,
          school,
          hashedPassword,
          parentIndex: index,
        })
      );
    }

    const students = [];
    for (let homeroomIndex = 0; homeroomIndex < HOMEROOMS.length; homeroomIndex += 1) {
      const homeroom = HOMEROOMS[homeroomIndex];
      const classTeacher = teacherByKey.get(`class-${getHomeroomLabel(homeroom)}`);

      for (let studentOffset = 0; studentOffset < STUDENTS_PER_HOMEROOM; studentOffset += 1) {
        const parent = parents[homeroomIndex * STUDENTS_PER_HOMEROOM + studentOffset];
        students.push(
          await ensureStudent({
            transaction,
            school,
            homeroom,
            homeroomIndex,
            studentOffset,
            parent,
            classTeacher,
          })
        );
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    for (const { student, globalStudentIndex } of students) {
      const homeroom = HOMEROOMS.find(
        (item) => item.className === student.class && item.section === student.section
      );
      const classTeacher = teacherByKey.get(`class-${getHomeroomLabel(homeroom)}`);
      const attendanceStatus =
        globalStudentIndex % 11 === 0
          ? "absent"
          : globalStudentIndex % 6 === 0
            ? "late"
            : "present";

      const [attendance] = await Attendance.findOrCreate({
        where: {
          student_id: student.id,
          school_id: school.id,
          date: today,
        },
        defaults: {
          student_id: student.id,
          school_id: school.id,
          date: today,
          status: attendanceStatus,
          marked_by: classTeacher.id,
        },
        transaction,
      });

      await attendance.update(
        {
          status: attendanceStatus,
          marked_by: classTeacher.id,
        },
        { transaction }
      );

      for (let examIndex = 0; examIndex < EXAM_TYPES.length; examIndex += 1) {
        for (let subjectIndex = 0; subjectIndex < CORE_SUBJECTS.length; subjectIndex += 1) {
          const subject = CORE_SUBJECTS[subjectIndex];
          const teacherKey = getTeacherBlueprintForSubject(homeroom, subject);
          const subjectTeacher = teacherByKey.get(teacherKey);
          const [mark] = await Mark.findOrCreate({
            where: {
              student_id: student.id,
              school_id: school.id,
              subject,
              exam_type: EXAM_TYPES[examIndex],
            },
            defaults: {
              student_id: student.id,
              school_id: school.id,
              subject,
              exam_type: EXAM_TYPES[examIndex],
              marks: buildMarkValue({
                schoolId: school.id,
                studentIndex: globalStudentIndex,
                examIndex,
                subjectIndex,
                classNumber: Number(student.class),
                sectionCode: student.section.charCodeAt(0),
              }),
              max_marks: 100,
              uploaded_by: subjectTeacher.id,
            },
            transaction,
          });

          await mark.update(
            {
              marks: buildMarkValue({
                schoolId: school.id,
                studentIndex: globalStudentIndex,
                examIndex,
                subjectIndex,
                classNumber: Number(student.class),
                sectionCode: student.section.charCodeAt(0),
              }),
              max_marks: 100,
              uploaded_by: subjectTeacher.id,
            },
            { transaction }
          );
        }
      }
    }

    for (const homeroom of HOMEROOMS) {
      const classTeacher = teacherByKey.get(`class-${getHomeroomLabel(homeroom)}`);
      const [record] = await ClassTimetable.findOrCreate({
        where: {
          school_id: school.id,
          class_name: homeroom.className,
          section: homeroom.section,
        },
        defaults: {
          school_id: school.id,
          teacher_id: classTeacher.id,
          class_name: homeroom.className,
          section: homeroom.section,
          timetable_json: JSON.stringify(schoolSeedData.classSchedules.get(getHomeroomLabel(homeroom))),
        },
        transaction,
      });

      await record.update(
        {
          teacher_id: classTeacher.id,
          timetable_json: JSON.stringify(schoolSeedData.classSchedules.get(getHomeroomLabel(homeroom))),
        },
        { transaction }
      );
    }

    for (const blueprint of TEACHER_BLUEPRINTS) {
      const teacher = teacherByKey.get(blueprint.key);
      const [record] = await TeacherTimetable.findOrCreate({
        where: {
          school_id: school.id,
          teacher_id: teacher.id,
        },
        defaults: {
          school_id: school.id,
          teacher_id: teacher.id,
          timetable_json: JSON.stringify(schoolSeedData.teacherSchedules.get(blueprint.key)),
        },
        transaction,
      });

      await record.update(
        {
          timetable_json: JSON.stringify(schoolSeedData.teacherSchedules.get(blueprint.key)),
        },
        { transaction }
      );
    }

    const [announcement] = await Announcement.findOrCreate({
      where: {
        school_id: school.id,
        title: `${school.plan[0].toUpperCase() + school.plan.slice(1)} Demo Data Ready`,
      },
      defaults: {
        school_id: school.id,
        title: `${school.plan[0].toUpperCase() + school.plan.slice(1)} Demo Data Ready`,
        description: `Structured demo teachers, students, marks, attendance, and timetables are ready for ${school.name}.`,
        target: "both",
        created_by: principal.id,
      },
      transaction,
    });

    await announcement.update(
      {
        description: `Structured demo teachers, students, marks, attendance, and timetables are ready for ${school.name}.`,
        target: "both",
      },
      { transaction }
    );

    const principalMessage = {
      school_id: school.id,
      user_id: principal.id,
      title: "Demo school seeded",
     message: `${school.name} now has 5 core subjects plus Moral Values and PET mapped for all demo classes. Generated teacher and parent accounts are ready to use.`,
      type: "info",
      category: "general",
    };

    const [notification] = await Notification.findOrCreate({
      where: {
        school_id: school.id,
        user_id: principal.id,
        title: principalMessage.title,
      },
      defaults: principalMessage,
      transaction,
    });

    await notification.update(principalMessage, { transaction });

    await transaction.commit();

    return {
      school: school.name,
      plan: school.plan,
      principal: principal.email,
      teacherCount: TEACHER_BLUEPRINTS.length,
      parentCount: parents.length,
      studentCount: students.length,
      markCount: students.length * CORE_SUBJECTS.length * EXAM_TYPES.length,
      timetableCount: HOMEROOMS.length + TEACHER_BLUEPRINTS.length,

    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getTargetPrincipals = async () => {
  const where = { role: "principal" };
  if (TARGET_PRINCIPAL_EMAIL) {
    where.email = TARGET_PRINCIPAL_EMAIL;
  }

  const principals = await User.findAll({
    where,
    order: [["id", "ASC"]],
  });

  if (!principals.length) {
    throw new Error(
      TARGET_PRINCIPAL_EMAIL
        ? `Principal account not found for ${TARGET_PRINCIPAL_EMAIL}`
        : "No principal accounts found to seed"
    );
  }

  return principals;
};

async function seed() {
  await sequelize.authenticate();

  try {
    const principals = await getTargetPrincipals();
    const results = [];

    for (const principal of principals) {
      const school = await School.findOne({ where: { id: principal.school_id } });
      if (!school) continue;
      if (!school.is_active) continue;
      if (EXPECTED_PLAN && school.plan !== EXPECTED_PLAN) continue;

      results.push(await seedSchool({ school, principal }));
    }

    if (!results.length) {
      throw new Error("No matching active schools were seeded");
    }

    console.log(JSON.stringify({ seeded_schools: results }, null, 2));
  } finally {
    await sequelize.close();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
