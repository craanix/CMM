import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OnlineStatusProvider } from './contexts/OnlineStatusContext';
import LoginScreen from './components/auth/LoginScreen';
import DashboardScreen from './components/dashboard/DashboardScreen';
import MachineDetailScreen from './components/machine/MachineDetailScreen';
import AdminPanelScreen from './components/admin/AdminPanelScreen';
import ReportsScreen from './components/reports/ReportsScreen';
import { Role } from './types';
import Header from './components/layout/Header';
import { CheckCircle } from 'lucide-react';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <OnlineStatusProvider>
        <Main />
      </OnlineStatusProvider>
    </AuthProvider>
  );
};

const Main: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [showSyncNotification, setShowSyncNotification] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'SYNC_COMPLETE') {
                setShowSyncNotification(true);
                setTimeout(() => setShowSyncNotification(false), 5000);
            }
        };
        navigator.serviceWorker.addEventListener('message', handleMessage);
        
        return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }
  }, []);

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

      {showSyncNotification && (
          <div className="fixed bottom-4 right-4 bg-status-ok text-white p-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in no-print z-50">
              <CheckCircle className="w-6 h-6"/>
              <div>
                  <p className="font-bold">Синхронизация завершена</p>
                  <p className="text-sm">Все офлайн-изменения сохранены на сервере.</p>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
