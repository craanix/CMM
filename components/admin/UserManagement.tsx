

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../../services/api';
import type { User, Region } from '../../types';
import { Role } from '../../types';
import { PlusCircle, Edit, Trash2, Search, Clipboard, Check, Info, AlertTriangle, KeyRound } from 'lucide-react';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [newCredentials, setNewCredentials] = useState<{login: string, password: string} | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [userData, allData] = await Promise.all([
            api.getAllUsers(),
            api.getAllDataForUser()
        ]);
        setUsers(userData);
        setRegions(allData.regions);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (user: User | null = null) => {
        setCurrentUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentUser(null);
    };
    
    const handleSaveUser = async (userToSave: any) => {
        const payload: any = { ...userToSave };
        if (payload.region) {
            delete payload.region;
        }

        if ('id' in payload) {
            await api.updateEntity('users', payload);
        } else {
            const generatedPassword = Math.random().toString(36).slice(2, 10);
            const newUserPayload = { ...payload, password: generatedPassword };
            const createdUser = await api.addEntity<User>('users', newUserPayload);
            setNewCredentials({ login: createdUser.login, password: generatedPassword });
        }
        fetchData();
        handleCloseModal();
    };
    
    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
    };

    const handleConfirmDelete = async () => {
        if (userToDelete) {
            await api.deleteEntity('users', userToDelete.id);
            fetchData();
            setUserToDelete(null);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        const lowercasedFilter = searchTerm.toLowerCase().trim();
        return users.filter(user =>
            user.name.toLowerCase().includes(lowercasedFilter) ||
            user.login.toLowerCase().includes(lowercasedFilter)
        );
    }, [users, searchTerm]);


    if (loading) return (
      <div className="flex justify-center items-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    );

    return (
        <div className="p-4 sm:p-6 bg-white rounded-lg shadow">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-brand-primary">Управление пользователями</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary font-semibold transition-colors shadow-sm"
                >
                    <PlusCircle className="w-5 h-5" />
                    Добавить пользователя
                </button>
            </div>

            <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Поиск по имени или логину..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-secondary focus:border-brand-secondary bg-white text-brand-primary placeholder-gray-500"
                />
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-brand-accent/60 hidden md:table-header-group">
                        <tr>
                            <th className="py-3 px-4 text-left text-sm font-bold text-brand-primary uppercase tracking-wider">Имя</th>
                            <th className="py-3 px-4 text-left text-sm font-bold text-brand-primary uppercase tracking-wider">Логин</th>
                            <th className="py-3 px-4 text-left text-sm font-bold text-brand-primary uppercase tracking-wider">Роль</th>
                            <th className="py-3 px-4 text-left text-sm font-bold text-brand-primary uppercase tracking-wider">Регион</th>
                            <th className="py-3 px-4 text-center text-sm font-bold text-brand-primary uppercase tracking-wider">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="block md:table-row-group">
                        {filteredUsers.map((user, index) => (
                            <tr key={user.id} className={`block md:table-row border-t border-gray-200 md:border-t-0 mb-4 md:mb-0 rounded-lg md:rounded-none shadow-md md:shadow-none overflow-hidden ${index % 2 !== 0 ? 'md:bg-gray-50/70' : ''}`}>
                                <td className="p-3 flex justify-between items-center border-b md:border-none md:table-cell">
                                    <span className="font-semibold text-brand-primary/90 md:hidden">Имя</span>
                                    <span className="font-medium text-brand-primary">{user.name}</span>
                                </td>
                                <td className="p-3 flex justify-between items-center border-b md:border-none md:table-cell">
                                    <span className="font-semibold text-brand-primary/90 md:hidden">Логин</span>
                                    <span className="text-gray-700">{user.login}</span>
                                </td>
                                <td className="p-3 flex justify-between items-center border-b md:border-none md:table-cell">
                                    <span className="font-semibold text-brand-primary/90 md:hidden">Роль</span>
                                    <span className="text-gray-700">{user.role === Role.ADMIN ? 'Администратор' : 'Техник'}</span>
                                </td>
                                <td className="p-3 flex justify-between items-center border-b md:border-none md:table-cell">
                                    <span className="font-semibold text-brand-primary/90 md:hidden">Регион</span>
                                    <span className="text-gray-700 text-right md:text-left">{user.region?.name || 'N/A'}</span>
                                </td>
                                <td className="p-3 flex justify-end md:justify-center items-center md:table-cell">
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenModal(user)} className="text-blue-600 hover:text-blue-800 p-1 transition-colors" title="Редактировать"><Edit size={18}/></button>
                                        <button onClick={() => handleDeleteClick(user)} className="text-status-error hover:text-red-800 p-1 transition-colors" title="Удалить"><Trash2 size={18}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredUsers.length === 0 && !loading && (
                    <p className="p-4 text-center text-gray-500">Пользователи не найдены.</p>
                )}
            </div>

            {isModalOpen && <UserModal user={currentUser} regions={regions} onSave={handleSaveUser} onClose={handleCloseModal} />}
            {newCredentials && <CredentialsModal credentials={newCredentials} onClose={() => setNewCredentials(null)} />}
            
            {userToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 animate-fade-in">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md m-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                <AlertTriangle className="h-6 w-6 text-status-error" aria-hidden="true" />
                            </div>
                            <div className="ml-4 flex-grow">
                                <h3 className="text-xl font-bold text-brand-primary">Удалить пользователя</h3>
                                <p className="text-gray-600 mt-2">
                                    Вы уверены, что хотите удалить пользователя <span className="font-bold">{userToDelete.name}</span> ({userToDelete.login})? Это действие нельзя отменить.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => setUserToDelete(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 bg-status-error text-white rounded-lg hover:bg-red-700 font-semibold transition-colors"
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface UserModalProps {
    user: User | null;
    regions: Region[];
    onSave: (user: any) => void;
    onClose: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, regions, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        login: user?.login || '',
        role: user?.role || Role.TECHNICIAN,
        regionId: user?.regionId || null,
    });
    const [newPassword, setNewPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleGeneratePassword = () => {
        const generated = Math.random().toString(36).slice(2, 10);
        setNewPassword(generated);
        setCopied(false); // Reset copied state if generating a new one
    };

    const handleCopyPassword = async () => {
        if (!newPassword) return;
        try {
            await navigator.clipboard.writeText(newPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error('Failed to copy password:', err);
        }
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'role' && value === Role.ADMIN) {
             setFormData(prev => ({ ...prev, role: value as Role, regionId: null }));
        } else {
             setFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = user 
            ? { ...user, ...formData, ...(newPassword && { password: newPassword }) } 
            : formData;
        onSave(payload);
    };

    const labelClasses = "block text-sm font-medium text-brand-primary";
    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-brand-primary placeholder-gray-500 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md m-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4 text-brand-primary">{user ? 'Редактировать пользователя' : 'Добавить пользователя'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="userName" className={labelClasses}>Имя</label>
                        <input id="userName" type="text" name="name" value={formData.name} onChange={handleFormChange} className={inputClasses} required/>
                    </div>
                     <div>
                        <label htmlFor="userLogin" className={labelClasses}>Логин</label>
                        <input id="userLogin" type="text" name="login" value={formData.login} onChange={handleFormChange} className={inputClasses} required/>
                    </div>
                    <div>
                        <label htmlFor="userRole" className={labelClasses}>Роль</label>
                        <select id="userRole" name="role" value={formData.role} onChange={handleFormChange} className={inputClasses}>
                            <option value={Role.ADMIN}>Администратор</option>
                            <option value={Role.TECHNICIAN}>Техник</option>
                        </select>
                    </div>
                     {formData.role === Role.TECHNICIAN && (
                        <div>
                            <label htmlFor="userRegion" className={labelClasses}>Регион</label>
                            <select
                                id="userRegion"
                                name="regionId"
                                value={formData.regionId || ''}
                                onChange={handleFormChange}
                                className={inputClasses}
                            >
                                <option value="">Не назначен</option>
                                {regions.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    {user && (
                        <div className="pt-2">
                            <label className={labelClasses}>Сброс пароля</label>
                            <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50/50">
                                {newPassword ? (
                                    <div className="flex flex-col sm:flex-row items-center gap-3">
                                        <code className="text-lg font-bold font-mono bg-gray-200 p-2 rounded flex-grow text-center sm:text-left w-full sm:w-auto">
                                            {newPassword}
                                        </code>
                                        <button
                                            type="button"
                                            onClick={handleCopyPassword}
                                            className="flex items-center justify-center gap-2 w-full sm:w-auto px-3 py-2 bg-brand-secondary text-white rounded-md hover:bg-brand-primary font-semibold transition-colors text-sm"
                                        >
                                            {copied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                                            {copied ? 'Скопировано' : 'Копировать'}
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-600">Нажмите кнопку, чтобы сгенерировать новый пароль для пользователя. Пароль будет показан здесь.</p>
                                )}
                                <button
                                    type="button"
                                    onClick={handleGeneratePassword}
                                    className="mt-3 flex items-center justify-center gap-2 w-full px-4 py-2 bg-white text-brand-primary border border-brand-secondary rounded-lg hover:bg-brand-accent font-semibold transition-colors shadow-sm"
                                >
                                    <KeyRound className="w-4 h-4" />
                                    {newPassword ? 'Сгенерировать другой' : 'Сгенерировать новый пароль'}
                                </button>
                            </div>
                        </div>
                    )}
                     {!user && (
                        <div className="p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-700">
                            <div className="flex">
                                <div className="py-1"><Info className="h-5 w-5 text-blue-400 mr-3"/></div>
                                <div><p className="text-sm">Пароль будет сгенерирован автоматически после сохранения.</p></div>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors">Отмена</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary font-semibold transition-colors">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface CredentialsModalProps {
    credentials: { login: string; password: string };
    onClose: () => void;
}

const CredentialsModal: React.FC<CredentialsModalProps> = ({ credentials, onClose }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = async () => {
        const textToCopy = `Логин: ${credentials.login}\nПароль: ${credentials.password}`;
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.warn('Clipboard API failed, using fallback:', err);
            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;
            textArea.style.position = "absolute";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            } catch (copyErr) {
                console.error('Fallback copy failed', copyErr);
                alert('Не удалось скопировать учетные данные.');
            }
            document.body.removeChild(textArea);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm m-4 text-center">
                <h3 className="text-xl font-bold mb-2 text-brand-primary">Пользователь создан</h3>
                <p className="text-gray-600 mb-4">Пожалуйста, сохраните эти учетные данные. Пароль показан только один раз.</p>
                
                <div className="space-y-2 text-left bg-gray-100 p-4 rounded-md">
                    <div>
                        <span className="font-semibold text-gray-700">Логин:</span>
                        <code className="ml-2 bg-gray-200 p-1 rounded font-mono">{credentials.login}</code>
                    </div>
                    <div>
                        <span className="font-semibold text-gray-700">Пароль:</span>
                        <code className="ml-2 bg-gray-200 p-1 rounded font-mono">{credentials.password}</code>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-3 pt-5">
                    <button
                        onClick={handleCopy}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-secondary text-white rounded-lg hover:bg-brand-primary font-semibold transition-colors"
                    >
                        {copied ? <><Check className="w-5 h-5"/>Скопировано!</> : <><Clipboard className="w-5 h-5"/>Копировать</>}
                    </button>
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors">
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
