import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

const menuItems = {
  principal: [
    { path: '/principal', label: 'Overview', icon: '⊞' },
    { path: '/principal/teachers', label: 'Teachers', icon: '👨‍🏫' },
    { path: '/principal/students', label: 'Students', icon: '🎓' },
    { path: '/principal/parents', label: 'Parents', icon: '👨‍👩‍👧' },
    { path: '/principal/attendance', label: 'Attendance', icon: '✅' },
    { path: '/principal/marks', label: 'Marks', icon: '📝' },
    { path: '/principal/fees', label: 'Fee Tracking', icon: '💳' },
    { path: '/principal/analytics', label: 'Analytics', icon: '📊' },
    { path: '/principal/notifications', label: 'Notifications', icon: '🔔' },
    { path: '/principal/class-dashboard', label: 'Class Dashboard', icon: '🏫' },
    { path: '/principal/teacher-analytics', label: 'Teacher Analytics', icon: '📈' },
    { path: '/principal/boardroom', label: 'Board Room', icon: '📢' },
  ],
  teacher: [
    { path: '/teacher', label: 'Overview', icon: '⊞' },
    { path: '/teacher/attendance', label: 'Mark Attendance', icon: '✅' },
    { path: '/teacher/marks', label: 'Upload Marks', icon: '📝' },
    { path: '/teacher/students', label: 'My Students', icon: '🎓' },
    { path: '/teacher/exams', label: 'Exam Manager', icon: '??' },
    { path: '/teacher/notifications', label: 'Notifications', icon: '🔔' },
  ],
  parent: [
    { path: '/parent', label: 'My Child', icon: '🎓' },
    { path: '/parent/attendance', label: 'Attendance', icon: '✅' },
    { path: '/parent/marks', label: 'Marks', icon: '📝' },
    { path: '/parent/fees', label: 'Fee Status', icon: '💳' },
    { path: '/parent/exam-marks', label: 'Exam Results', icon: '??' },
    { path: '/parent/notifications', label: 'Notifications', icon: '🔔' },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const items = menuItems[user?.role] || [];

  const handleLogout = () => { logout(); navigate('/login'); };

  const roleColor = { principal: '#185FA5', teacher: '#0F6E56', parent: '#854F0B' };
  const roleBadgeClass = { principal: 'badge-purple', teacher: 'badge-green', parent: 'badge-amber' };

  return (
    <div className="layout">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-icon" style={{ background: roleColor[user?.role] }}>S</div>
          {!collapsed && <span className="logo-text">SmartSchool</span>}
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>
        {!collapsed && (
          <div className="user-card">
            <div className="user-avatar" style={{ background: roleColor[user?.role] + '22', color: roleColor[user?.role] }}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <div className="user-name">{user?.name}</div>
              <span className={`badge ${roleBadgeClass[user?.role]}`}>{user?.role}</span>
            </div>
          </div>
        )}
        <nav className="sidebar-nav">
          {items.map(item => (
            <NavLink key={item.path} to={item.path} end={item.path === '/principal' || item.path === '/teacher' || item.path === '/parent'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <button className="logout-btn" onClick={handleLogout}>
          <span>⎋</span>{!collapsed && ' Logout'}
        </button>
      </aside>
      <main className="main-content">
        <div className="topbar">
          <div>
            <span className="school-name">{user?.school_name}</span>
            {user?.plan === 'premium' && <span className="badge badge-green" style={{ marginLeft: 10 }}>Premium</span>}
          </div>
          <div className="topbar-right">
            <span className="topbar-user">{user?.name}</span>
          </div>
        </div>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
