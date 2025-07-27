// frontend/src/services/api.js
import axios from 'axios';
import { notifyGlobalError } from '../lib/errorHandler';

// A URL do seu backend.
// Em desenvolvimento, é localhost:PORTA_DO_BACKEND
// Em produção, será o domínio do seu backend.
const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar o token JWT em cada requisição (se houver)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para lidar com erros de resposta (ex: token expirado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Exemplo: se o token JWT expirar (status 403 ou 401), podemos deslogar o usuário
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Apenas se não for a rota de login, para evitar loop infinito
      if (!error.config.url.includes('/login')) {
         console.log('Token expirado ou inválido. Deslogando...');
         // Importe o `logout` do AuthContext aqui se precisar
         // window.location.href = '/login'; // Redireciona para o login
         // Ou em um contexto, você chamaria a função logout
      }
    }
    // Notifica globalmente
    const msg = error.response?.data?.message || error.message || 'Erro inesperado.';
    notifyGlobalError(msg);
    return Promise.reject(error);
  }
);

export default api;