'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/types';
import { api } from './api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
  isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('opensense_token');
      const savedUser = localStorage.getItem('opensense_user');
      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Validate with server
          const profile = await api.getProfile();
          setUser(profile);
          localStorage.setItem('opensense_user', JSON.stringify(profile));
        } catch {
          // Token expired or invalid
          localStorage.removeItem('opensense_token');
          localStorage.removeItem('opensense_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('opensense_token', token);
    localStorage.setItem('opensense_user', JSON.stringify(userData));
    setUser(userData);
    router.push('/');
  };

  const logout = () => {
    localStorage.removeItem('opensense_token');
    localStorage.removeItem('opensense_user');
    setUser(null);
    router.push('/login');
  };

  const refreshUser = async () => {
    try {
      const profile = await api.getProfile();
      setUser(profile);
      localStorage.setItem('opensense_user', JSON.stringify(profile));
    } catch {
      logout();
    }
  };

  // Route protection: allow Guest users on '/' to enjoy 5 free trial chats
  useEffect(() => {
    if (!loading && pathname) {
      const isAuthPage = pathname === '/login' || pathname === '/register';
      const isGuestAllowedPage = pathname === '/' || pathname === '';
      if (!user && !isAuthPage && !isGuestAllowedPage) {
        router.push('/login');
      } else if (user && isAuthPage) {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
