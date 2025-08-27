import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types';
import { Coffee, UserCircle, LogOut, Wrench, FileText } from 'lucide-react';
import ProfileModal from './ProfileModal';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="bg-brand-primary text-white shadow-lg sticky top-0 z-50 no-print">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          <NavLink to="/" className="flex items-center gap-2 text-xl font-bold hover:text-brand-accent transition-colors">
            <Coffee className="w-7 h-7" />
            <span>Обслуживание КМ</span>
          </NavLink>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-brand-secondary/80 transition-colors"
              aria-label="Открыть профиль"
            >
              <UserCircle className="w-5 h-5 text-brand-accent" />
              <span className="hidden sm:inline font-medium">{user?.name}</span>
            </button>

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
      {isProfileModalOpen && <ProfileModal onClose={() => setIsProfileModalOpen(false)} />}
    </>
  );
};

export default Header;