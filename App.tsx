
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './components/auth/LoginScreen';
import DashboardScreen from './components/dashboard/DashboardScreen';
import MachineDetailScreen from './components/machine/MachineDetailScreen';
import AdminPanelScreen from './components/admin/AdminPanelScreen';
import ReportsScreen from './components/reports/ReportsScreen';
import { Role } from './types';
import Header from './components/layout/Header';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  );
};

const Main: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-brand-light font-sans text-brand-primary">
      {isAuthenticated && <Header />}
      <main className="p-4 sm:p-6">
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <LoginScreen /> : <Navigate to="/" />} />
          <Route
            path="/"
            element={isAuthenticated ? <DashboardScreen /> : <Navigate to="/login" />}
          />
          <Route
            path="/machine/:id"
            element={isAuthenticated ? <MachineDetailScreen /> : <Navigate to="/login" />}
          />
          <Route
            path="/reports"
            element={isAuthenticated ? <ReportsScreen /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/*"
            element={
              isAuthenticated && user?.role === Role.ADMIN ? (
                <AdminPanelScreen />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
