import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updated: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// profile_image can be large base64 — never store it in localStorage
function saveToStorage(u: User) {
  const { profile_image: _omit, ...rest } = u;
  localStorage.setItem('unifin_user', JSON.stringify(rest));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore from localStorage, then verify session is still valid
  useEffect(() => {
    const saved = localStorage.getItem('unifin_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('unifin_user');
      }
    }

    api.auth
      .me()
      .then((freshUser) => {
        if (freshUser) {
          setUser(freshUser);
          saveToStorage(freshUser);
        } else {
          setUser(null);
          localStorage.removeItem('unifin_user');
        }
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem('unifin_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    const loggedIn = await api.auth.login(username, password);
    setUser(loggedIn);
    saveToStorage(loggedIn);
  };

  const logout = async (): Promise<void> => {
    await api.auth.logout().catch(() => {});
    setUser(null);
    localStorage.removeItem('unifin_user');
  };

  const updateUser = (updated: User): void => {
    setUser(updated);
    saveToStorage(updated);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
