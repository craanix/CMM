import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { User } from '../types';
import * as api from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (login: string, password_unused: string) => Promise<boolean>;
  logout: () => void;
  updateAuthUser: (updatedData: Partial<User>) => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = sessionStorage.getItem('cmm_user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (loginStr: string, password_unused: string) => {
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await api.login(loginStr, password_unused);
      if (loggedInUser) {
        setUser(loggedInUser);
        sessionStorage.setItem('cmm_user', JSON.stringify(loggedInUser));
        return true;
      } else {
        setError('Неверный логин или пароль.');
        return false;
      }
    } catch (e) {
      setError('Произошла непредвиденная ошибка.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('cmm_user');
    // Clear the cached DB on logout to ensure fresh data on next login
    sessionStorage.removeItem('cmm_db_session');
  }, []);
  
  const updateAuthUser = useCallback((updatedData: Partial<User>) => {
    setUser(prevUser => {
        if (!prevUser) return null;
        const newUser = { ...prevUser, ...updatedData };
        sessionStorage.setItem('cmm_user', JSON.stringify(newUser));
        return newUser;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateAuthUser, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};