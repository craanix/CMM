import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Users, Map, Building, Coffee, Package } from 'lucide-react';
import UserManagement from './UserManagement';
import RegionManagement from './RegionManagement';
import PointManagement from './PointManagement';
import MachineManagement from './MachineManagement';
import PartManagement from './PartManagement';


const AdminPanelScreen: React.FC = () => {
    
    const navLinks = [
        { to: '/admin/users', icon: Users, label: 'Пользователи' },
        { to: '/admin/regions', icon: Map, label: 'Регионы' },
        { to: '/admin/points', icon: Building, label: 'Точки' },
        { to: '/admin/machines', icon: Coffee, label: 'Аппараты' },
        { to: '/admin/parts', icon: Package, label: 'Запчасти' },
    ];
    
    return (
        <div className="container mx-auto max-w-6xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-primary mb-4 sm:mb-6">Панель администратора</h1>
            <div className="flex flex-col md:flex-row gap-6">
                <aside className="md:w-1/4">
                    <nav className="flex flex-row md:flex-col gap-2 p-2 bg-white rounded-lg shadow-md overflow-x-auto">
                        {navLinks.map(({ to, icon: Icon, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 p-3 rounded-md font-medium transition-colors flex-shrink-0 ${
                                    isActive ? 'bg-brand-secondary text-white shadow' : 'hover:bg-brand-accent'
                                    }`
                                }
                            >
                                <Icon className="w-5 h-5" />
                                <span className="hidden md:inline">{label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </aside>
                <main className="flex-1">
                    <Routes>
                        <Route path="users" element={<UserManagement />} />
                        <Route path="regions" element={<RegionManagement />} />
                        <Route path="points" element={<PointManagement />} />
                        <Route path="machines" element={<MachineManagement />} />
                        <Route path="parts" element={<PartManagement />} />
                        <Route index element={
                          <div className="p-4 sm:p-6 bg-white rounded-lg shadow">
                            <h2 className="text-xl sm:text-2xl font-bold">Добро пожаловать в панель администратора</h2>
                            <p className="mt-4 text-gray-600">Пожалуйста, выберите категорию слева для управления данными системы.</p>
                          </div>
                        } />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

export default AdminPanelScreen;