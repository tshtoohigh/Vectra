import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import LandingPage_F1 from './pages/LandingPage_F1.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AppShell from './pages/AppShell.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import ModulesPage from './pages/ModulesPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import { CognitoAuth } from './services/aws/cognitoAuth.js';

/**
 * Auth gate — redirects unauthenticated users to /login.
 * No demo bypass. You must sign up or log in to access /app.
 */
function RequireAuth({ children }) {
  const location = useLocation();
  CognitoAuth.init();
  if (!CognitoAuth.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

export default function App_F1() {
  return (
    <ThemeProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage_F1 />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />

        {/* Protected — requires authentication */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="modules" element={<ModulesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
