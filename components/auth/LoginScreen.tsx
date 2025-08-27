import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Coffee, KeyRound, LogIn } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const { login: authLogin, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await authLogin(login, password);
    if (success) {
      navigate('/');
    }
  };
  
  const inputBaseClasses = "appearance-none relative block w-full px-3 py-2 border border-gray-300 bg-white placeholder-gray-500 text-brand-primary focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary focus:z-10 sm:text-sm";

  return (
    <div className="flex items-center justify-center min-h-screen -m-6 bg-brand-accent">
      <div className="w-full max-w-sm p-6 sm:p-8 space-y-8 bg-white rounded-xl shadow-2xl">
        <div className="text-center">
            <Coffee className="mx-auto h-12 w-auto text-brand-primary" />
            <h2 className="mt-6 text-3xl font-extrabold text-brand-primary">
                Обслуживание кофемашин
            </h2>
            <p className="mt-2 text-sm text-gray-600">
                Войдите в свою учетную запись
            </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="login-address" className="sr-only">Логин</label>
              <input
                id="login-address"
                name="login"
                type="text"
                autoComplete="username"
                required
                className={`${inputBaseClasses} rounded-t-md`}
                placeholder="Логин (например, 'admin' или 'tech1')"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Пароль</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`${inputBaseClasses} rounded-b-md`}
                placeholder="Пароль (любой пароль)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <LogIn className="h-5 w-5 text-brand-accent group-hover:text-white" aria-hidden="true" />
              </span>
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;