const express = require('express');
const cors = require('cors');
const { DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = require('./config/db');
const routes = require('./routes/index');

// --- NEW: Import WhatsApp Route ---
const whatsappRoutes = require('./routes/whatsappRoutes');

// Import models so Sequelize registers them
require('./models/School');
require('./models/User');
require('./models/Student');
require('./models/Attendance');
require('./models/Mark');
require('./models/Notification');
require('./models/Announcement');
require('./models/Exam');
require('./models/ExamMark');
require('./models/TeacherAttendance');
require('./models/StudentLeave');
require('./models/ChatMessage');
require('./models/ClassTimetable');
require('./models/TeacherTimetable');
require('./models/InviteLink');

const app = express();
app.use(cors());

// --- CRITICAL: Add this for Twilio Support ---
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Existing API routes
app.use('/api', routes);

// --- NEW: WhatsApp Webhook Route ---
app.use('/api/whatsapp', whatsappRoutes);

app.get('/', (req, res) => res.json({ message: 'School Management API running' }));

const PORT = process.env.PORT || 5000;

// Schema consistency logic
const ensureColumn = async (queryInterface, tableName, columnName, definition) => {
  const table = await queryInterface.describeTable(tableName);
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
};

const ensureSchema = async () => {
  const queryInterface = sequelize.getQueryInterface();

  // Ensure WhatsApp number exists in User table
  await ensureColumn(queryInterface, 'Users', 'whatsapp_number', {
    type: DataTypes.STRING,
    allowNull: true
  });

  await ensureColumn(queryInterface, 'Schools', 'plan_expires_at', { type: DataTypes.DATEONLY, allowNull: true });
  await ensureColumn(queryInterface, 'Schools', 'subscription_status', {
    type: DataTypes.ENUM('trial', 'active', 'expiring', 'expired'),
    allowNull: false,
    defaultValue: 'trial',
  });
  await ensureColumn(queryInterface, 'Notifications', 'priority', {
    type: DataTypes.ENUM('normal', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'normal',
  });
  await ensureColumn(queryInterface, 'students', 'total_fee', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5000,
  });
  await ensureColumn(queryInterface, 'students', 'paid_fee', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });
};

sequelize.sync({ alter: false })
  .then(() => {
    ensureSchema()
      .then(() => {
        console.log('MySQL connected and tables synced');
        app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
      })
      .catch(err => console.error('Schema update failed:', err.message));
  })
  .catch(err => console.error('DB connection failed:', err.message));
