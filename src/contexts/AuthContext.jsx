// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

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
  const [loading, setLoading] = useState(true); // Indica se a verificação inicial de autenticação terminou

  useEffect(() => {
    const loadUserFromStorage = () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);
          // Adiciona o token ao header padrão do axios para todas as requisições futuras
          // (se o interceptor já faz isso, pode ser redundante, mas garante)
          // api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        } catch (error) {
          console.error("Erro ao parsear usuário do localStorage", error);
          logout(); // Limpa dados inválidos
        }
      }
      setLoading(false); // Marca como carregado após a verificação inicial
    };

    loadUserFromStorage();
  }, []); // Executa apenas uma vez na montagem


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
    // api.defaults.headers.common['Authorization'] = undefined; // Remove token do header padrão do axios
  };

  const value = {
    user,
    token,
    loading, // Exporta o estado de carregamento da autenticação
    login,
    logout,
    isAuthenticated: !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};