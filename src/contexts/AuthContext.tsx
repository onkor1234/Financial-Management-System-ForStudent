import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, db } from '../lib/mockDb';

interface AuthContextType {
  user: User | null;
  login: (username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Try to load user from localStorage for persistence
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('unifin_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (username: string) => {
    const foundUser = db.users.find(u => u.username === username);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('unifin_user', JSON.stringify(foundUser));
    } else {
      alert("User not found: try 'admin' or 'op1'");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('unifin_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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
