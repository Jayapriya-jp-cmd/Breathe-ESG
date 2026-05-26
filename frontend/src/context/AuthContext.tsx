import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface AuthContextType {
  token: string | null;
  user: string | null;
  organization: string | null;
  login: (token: string, user: string, organization: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Apply token immediately to prevent race conditions during initial fetch
const initialToken = localStorage.getItem('token');
if (initialToken) {
  axios.defaults.headers.common['Authorization'] = `Token ${initialToken}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<string | null>(localStorage.getItem('username'));
  const [organization, setOrganization] = useState<string | null>(localStorage.getItem('organization'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Token ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = (token: string, user: string, organization: string) => {
    setToken(token);
    setUser(user);
    setOrganization(organization);
    axios.defaults.headers.common['Authorization'] = `Token ${token}`;
    localStorage.setItem('token', token);
    localStorage.setItem('username', user);
    localStorage.setItem('organization', organization);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setOrganization(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('organization');
  };

  return (
    <AuthContext.Provider value={{ token, user, organization, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
