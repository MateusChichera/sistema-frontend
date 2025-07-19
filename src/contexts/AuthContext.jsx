// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { useEmpresa } from './EmpresaContext';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const loadUserFromStorage = () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);
        } catch (error) {
          console.error("Erro ao parsear usuário do localStorage", error);
          logout();
        }
      }
      setLoading(false);
    };
    loadUserFromStorage();
  }, []);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      response => response,
      error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          setSessionExpired(true);
        }
        return Promise.reject(error);
      }
    );
    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (credentials, loginType, slug = null) => {
    try {
      let endpoint;
      if (loginType === 'admin') {
        endpoint = `/admin/login`;
      } else if (loginType === 'funcionario') {
        if (!slug) throw new Error('Slug da empresa é obrigatório para login de funcionário.');
        endpoint = `/${slug}/funcionario/login`;
      } else if (loginType === 'cliente') {
        if (!slug) throw new Error('Slug da empresa é obrigatório para login de cliente.');
        endpoint = `/${slug}/cliente/login`;
      } else {
        throw new Error('Tipo de login inválido.');
      }
      const response = await api.post(endpoint, credentials);
      const { token: receivedToken, user: userData } = response.data;
      setUser(userData);
      setToken(receivedToken);
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erro ao realizar login. Verifique suas credenciais.';
      console.error("Erro no login:", error);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const handleSessionExpiredClose = () => {
    setSessionExpired(false);
    logout();
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token,
    sessionExpired,
    handleSessionExpiredClose
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};