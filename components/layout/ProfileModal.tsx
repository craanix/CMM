import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import type { User } from '../../types';
import { UserCircle, Lock, X } from 'lucide-react';

interface ProfileModalProps {
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user, updateAuthUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    
    try {
        if (!user) throw new Error("User not found");

        const payload: Partial<User> & { id: string } = { id: user.id };
        if (name.trim() && name.trim() !== user.name) {
            payload.name = name.trim();
        }
        if (password) {
            payload.password = password;
        }

        if (Object.keys(payload).length > 1) { // only update if there are changes
            const updatedUser = await api.updateEntity('users', payload);
            updateAuthUser(updatedUser);
        }

        onClose();
    } catch (err) {
        setError('Не удалось обновить профиль. Попробуйте снова.');
        console.error(err);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const labelClasses = "block text-sm font-medium text-brand-primary";
  const inputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-brand-primary placeholder-gray-500 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm";


  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 animate-fade-in">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md m-4 relative">
            <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <UserCircle className="w-8 h-8 text-brand-primary"/>
              <h3 className="text-xl font-bold text-brand-primary">Редактировать профиль</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="profileName" className={labelClasses}>Отображаемое имя</label>
                    <input id="profileName" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} required/>
                </div>
                
                <div className="pt-2">
                   <p className="text-sm text-gray-500 mb-2">Чтобы изменить пароль, введите новый пароль ниже. В противном случае, оставьте поля пустыми.</p>
                    <div>
                        <label htmlFor="profilePassword" className={labelClasses}>Новый пароль</label>
                        <input id="profilePassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClasses}/>
                    </div>
                     <div>
                        <label htmlFor="profileConfirmPassword" className={labelClasses}>Подтвердите новый пароль</label>
                        <input id="profileConfirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClasses}/>
                    </div>
                </div>

                {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors">Отмена</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary disabled:bg-gray-400 font-semibold transition-colors">
                      {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default ProfileModal;
