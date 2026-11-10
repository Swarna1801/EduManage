
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const School = require('../models/School');
const User = require('../models/User');

const generateSchoolId = () =>
  'SSAS-' + Math.floor(1000 + Math.random() * 9000);

const generateUserId = (role) =>
  role.toUpperCase().slice(0, 3) + '-' + Math.floor(1000 + Math.random() * 9000);

// Super admin credentials must be configured in the backend .env file.
const getSuperCredentials = () => ({
  email: process.env.SUPER_USER_EMAIL,
  password: process.env.SUPER_USER_PASSWORD,
  name: process.env.SUPER_USER_NAME || 'Platform Owner',
});

// Register a new school and principal
exports.register = async (req, res) => {
  try {
    const { school_name, admin_name, email, password, plan } = req.body;

    const existing = await User.findOne({ where: { email } });

    if (existing) {
      return res.status(400).json({
        message: 'Email already registered',
      });
    }

    const school = await School.create({
      school_id: generateSchoolId(),
      name: school_name,
      plan: plan || 'basic',
      payment_status: 'pending',
      is_active: false,
    });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      user_id: generateUserId('principal'),
      name: admin_name,
      email,
      password: hashed,
      role: 'principal',
      school_id: school.id,
    });

    res.status(201).json({
      message: 'Registration successful',
      school_id: school.school_id,
      admin_id: user.user_id,
      plan: school.plan,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Complete school payment
exports.completePayment = async (req, res) => {
  try {
    const { school_id } = req.body;

    const school = await School.findOne({ where: { school_id } });

    if (!school) {
      return res.status(404).json({
        message: 'School not found',
      });
    }

    await school.update({
      payment_status: 'paid',
      is_active: true,
    });

    res.json({
      message: 'Payment successful. Account activated.',
      school_id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Super admin login
    if (role === 'super_user') {
      const superUser = getSuperCredentials();

      if (!superUser.email || !superUser.password) {
        return res.status(500).json({
          message: 'Super admin login is not configured',
        });
      }

      if (
        email !== superUser.email ||
        password !== superUser.password
      ) {
        return res.status(401).json({
          message: 'Invalid super user credentials',
        });
      }

      const token = jwt.sign(
        {
          id: 0,
          role: 'super_user',
          school_id: null,
          name: superUser.name,
          plan: 'premium',
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      return res.json({
        token,
        role: 'super_user',
        name: superUser.name,
        email: superUser.email,
        plan: 'premium',
        school_name: 'EduManage Control Center',
      });
    }

    // Regular user login
    const user = await User.findOne({
      where: { email, role },
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials or role',
      });
    }

    const school = await School.findOne({
      where: { id: user.school_id },
    });

    if (!school?.is_active) {
      return res.status(403).json({
        message: 'Account not activated. Complete payment first.',
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        message: 'Wrong password',
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        school_id: user.school_id,
        name: user.name,
        plan: school.plan,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      role: user.role,
      name: user.name,
      plan: school.plan,
      school_name: school.name,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
