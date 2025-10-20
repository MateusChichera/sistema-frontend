// socket.js
import { io } from 'socket.io-client';

const getSocketURL = () => {
  if (import.meta.env.VITE_BACKEND_API_URL) {
    return import.meta.env.VITE_BACKEND_API_URL.replace('/api/v1', '');
  }
  
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '212.85.23.251') {
    return 'http://localhost:3001';
  }
  
  return ''; // Em produção, usa o mesmo domínio
};

const socket = io(getSocketURL(), {
  autoConnect: false, // melhor controlar manualmente
  withCredentials: true,
});

export default socket;
