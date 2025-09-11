import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOnlineStatus } from '../../contexts/OnlineStatusContext';
import { Role } from '../../types';
import { Coffee, UserCircle, LogOut, Wrench, FileText, Wifi, WifiOff } from 'lucide-react';
import ProfileModal from './ProfileModal';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { isOnline } = useOnlineStatus();
  const navigate = useNavigate();
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === Role.ADMIN;

  return (
    <>
      <header className="bg-brand-primary text-white shadow-lg sticky top-0 z-50 no-print">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          <NavLink to="/" className="flex items-center gap-2 text-xl font-bold hover:text-brand-accent transition-colors">
            <Coffee className="w-7 h-7" />
            <span>Обслуживание КМ</span>
          </NavLink>

          <div className="flex items-center gap-2 sm:gap-4">
             <div title={isOnline ? 'Онлайн' : 'Офлайн'} className="flex items-center gap-1.5 p-2 rounded-md">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-status-ok" />
              ) : (
                <WifiOff className="w-5 h-5 text-status-warning" />
              )}
               <span className="hidden sm:inline text-sm font-medium">
                 {isOnline ? 'Онлайн' : 'Офлайн'}
               </span>
            </div>

            {isAdmin ? (
              <button
                onClick={() => setProfileModalOpen(true)}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-brand-secondary/80 transition-colors"
                aria-label="Редактировать профиль"
              >
                <UserCircle className="w-5 h-5 text-brand-accent" />
                <span className="hidden sm:inline font-medium">{user?.name}</span>
              </button>
            ) : (
              <div
                className="flex items-center gap-2 p-2 rounded-md"
                aria-label="Профиль пользователя"
              >
                <UserCircle className="w-5 h-5 text-brand-accent" />
                <span className="hidden sm:inline font-medium">{user?.name}</span>
              </div>
            )}

            <NavLink
              to="/reports"
              aria-label="Отчёты"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-secondary text-white' : 'hover:bg-brand-secondary/80'
                }`
              }
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Отчёты</span>
            </NavLink>

            {user?.role === Role.ADMIN && (
              <NavLink
                to="/admin"
                aria-label="Админ-панель"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-secondary text-white' : 'hover:bg-brand-secondary/80'
                  }`
                }
              >
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Админ-панель</span>
              </NavLink>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-status-error hover:bg-opacity-80 transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </div>
      </header>
      {isProfileModalOpen && <ProfileModal onClose={() => setProfileModalOpen(false)} />}
    </>
  );
};

export default Header;
