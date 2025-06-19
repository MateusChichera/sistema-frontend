// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api'; // Importa a instância do axios

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
          logout(); // Limpa dados inválidos
        }
      }
      setLoading(false);
    };

    loadUserFromStorage();
  }, []);

  // `credentials` deve conter { email, senha }
  // `loginType` pode ser 'admin', 'funcionario', 'cliente'
  // `slug` é opcional, usado para funcionario/cliente
  const login = async (credentials, loginType, slug = null) => {
    try {
      let response;
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

      response = await api.post(endpoint, credentials);

      const { token, user: userData } = response.data;

      setUser(userData);
      setToken(token);

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      return { success: true };
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
    // Você pode redirecionar aqui se quiser um logout global
    // window.location.href = '/'; 
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token // Converte token para booleano
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};