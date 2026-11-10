# EduManage – School Management System

EduManage is a full-stack school management platform designed to make school activities easier to manage in one place.

It helps principals, teachers, parents, and super admins manage students, attendance, marks, fees, timetables, notifications, and communication.

## Main Features

- **Student Management:** Manage student details, classes, and sections.
- **Attendance:** Record and monitor student attendance.
- **Marks Management:** Add marks and track academic performance.
- **Fee Management:** Manage and monitor student fee records.
- **Timetable:** Organize class schedules.
- **Notifications:** Share important school updates.
- **Communication:** Support communication between school users.
- **Dashboard & Analytics:** View important school information and reports.
- **School Onboarding:** Register and manage schools through the Super Admin panel.

## User Roles

| Role | Main Responsibilities |
|---|---|
| Super Admin | Manage schools, subscription plans, and platform activities |
| Principal | Manage school operations, students, and teachers |
| Teacher | Manage attendance, marks, and assigned classes |
| Parent | View their child's attendance, marks, and fee details |

## Subscription Plans

EduManage supports two subscription plans for schools.

### Basic Plan
- Supports up to **500 students**
- Core school dashboard and management
- Attendance management
- Marks management
- Fee management
- Notifications
- Basic timetable management

### Premium Plan
- Supports up to **1,500 students**
- Everything included in the Basic Plan
- Advanced analytics
- Part-wise marks management
- Chat and communication features
- Self-onboarding through invitation links
- Additional premium workflows

## Technology Stack

| Part | Technologies |
|---|---|
| Frontend | React.js, JavaScript, HTML, CSS |
| Backend | Node.js, Express.js |
| Database | MySQL |
| ORM | Sequelize |
| Authentication | JWT |

## Project Structure

```text
EduManage/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── scripts/
│
├── frontend/
│   ├── public/
│   └── src/
│
├── docs/
├── README.md
└── .gitignore
```

## How to Run the Project

### Requirements
- Node.js and npm
- MySQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Swarna1801/EduManage.git
cd EduManage
```

### 2. Start the Backend

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder:

```env
DB_HOST=localhost
DB_NAME=your_database_name
DB_USER=your_database_username
DB_PASSWORD=your_database_password

SUPER_USER_EMAIL=your_admin_email
SUPER_USER_PASSWORD=your_strong_password
SUPER_USER_NAME=Platform Owner

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=your_expiry_value

SEED_DEFAULT_PASSWORD=your_secure_seed_password
```

Create your MySQL database and enter your own configuration values.

Start the backend:

```bash
npm run dev
```

Backend URL: `http://localhost:5000`

### 3. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm start
```

The application will open in your browser through the React development server.

## Super Admin Login

There are no default Super Admin credentials.

Configure your own `SUPER_USER_EMAIL` and `SUPER_USER_PASSWORD` in the backend `.env` file to access the Super Admin panel.

## Documentation

For more information about the project and its modules, check:

[`EDUMANAGE_PROJECT_DOCUMENTATION.md`](docs/EDUMANAGE_PROJECT_DOCUMENTATION.md)

## Security

- Do not upload `.env` files or database backups to GitHub.
- Use your own database credentials and secure passwords.
- Never publish private login credentials.

## Author

**Swarna Lakshmi GM**

- **GitHub:** [Swarna1801](https://github.com/Swarna1801)
- **LinkedIn:** [Swarna Lakshmi](https://www.linkedin.com/in/swarna1801/)

---

*EduManage – Making school management simple and organized.*