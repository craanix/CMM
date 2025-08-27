import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { User } from '../types';
import * as api from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (login: string, password_unused: string) => Promise<boolean>;
  logout: () => void;
  updateAuthUser: (updatedData: Partial<User>) => void;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start loading until we verify token
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('cmm_token');
      if (token) {
        try {
          const currentUser = await api.getMe();
          setUser(currentUser);
        } catch (e) {
          // Token is invalid or expired
          localStorage.removeItem('cmm_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, []);


  const login = useCallback(async (loginStr: string, password_unused: string) => {
    setLoading(true);
    setError(null);
    try {
      const { token, user: loggedInUser } = await api.login(loginStr, password_unused);
      localStorage.setItem('cmm_token', token);
      setUser(loggedInUser);
      return true;
    } catch (e: any) {
      setError(e.message || 'Произошла непредвиденная ошибка.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('cmm_token');
  }, []);
  
  const updateAuthUser = useCallback((updatedData: Partial<User>) => {
    setUser(prevUser => {
        if (!prevUser) return null;
        const newUser = { ...prevUser, ...updatedData };
        return newUser;
    });
  }, []);
  
  const isAuthenticated = !!user;

  // Show a loader while verifying token
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-light">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-primary"></div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateAuthUser, loading, error, isAuthenticated }}>
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
