// socket.js
import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_BACKEND_API_URL.replace('/api/v1', '');
const socket = io(URL, {
  autoConnect: false, // melhor controlar manualmente
  withCredentials: true,
});

export default socket;
