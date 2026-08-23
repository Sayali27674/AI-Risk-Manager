import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (!token) {
      setLoading(false);
      return;
    }

    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('authToken');
        setUser(null);
      })
      .finally(() => setLoading(false));

    const handleExpired = () => setUser(null);
    window.addEventListener('auth-expired', handleExpired);

    return () => window.removeEventListener('auth-expired', handleExpired);
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('authToken', data.token);
    setUser(data.user);
  }

  async function register(values) {
    const { data } = await api.post('/auth/register', values);
    localStorage.setItem('authToken', data.token);
    setUser(data.user);
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}