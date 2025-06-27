// frontend/src/contexts/SocketContext.jsx
import React, { createContext, useContext, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useEmpresa } from './EmpresaContext'; // Certifique-se de que o caminho está correto
import { useAuth } from './AuthContext'; // Certifique-se de que o caminho está correto

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { empresa, loading: empresaLoading } = useEmpresa();
    const { user, token } = useAuth();
    const socket = useRef(null);

    useEffect(() => {
        if (empresaLoading || !empresa?.id || !user?.token) {
            // Espera que os dados essenciais sejam carregados
            if (socket.current) {
                console.log('SocketContext: Desconectando devido a dados essenciais ausentes.');
                socket.current.disconnect();
                socket.current = null;
            }
            return;
        }

        if (!socket.current) {
            console.log('SocketContext: Inicializando nova conexão de socket.');
            // Garante que a URL seja derivada corretamente da sua variável de ambiente
            const backendUrl = import.meta.env.VITE_BACKEND_API_URL.replace('/api/v1', '');
            socket.current = io(backendUrl, {
                // Você pode precisar passar o token de autenticação aqui se o seu servidor socket o exigir para a conexão inicial
                // extraHeaders: {
                //     Authorization: `Bearer ${token}`
                // }
            });

            socket.current.on('connect', () => {
                console.log('SocketContext: Conectado ao servidor.');
                socket.current.emit('join_company_room', empresa.id);
            });

            socket.current.on('disconnect', () => {
                console.log('SocketContext: Desconectado do servidor.');
            });

            socket.current.on('connect_error', (err) => {
                console.error('SocketContext: Erro de conexão:', err);
            });
        } else {
            // Se o socket já existe, garante que está na sala correta (ex: se a empresa mudar)
            console.log('SocketContext: Socket já existe, garantindo entrada na sala.');
            socket.current.emit('join_company_room', empresa.id);
        }

        // Função de limpeza
        return () => {
            if (socket.current) {
                console.log('SocketContext: Limpando conexão do socket.');
                socket.current.emit('leave_company_room', empresa.id);
                socket.current.disconnect();
                socket.current = null;
            }
        };
    }, [empresa?.id, user?.token, empresaLoading]); // Reconecta se a empresa ou o token do usuário mudar

    return (
        <SocketContext.Provider value={socket.current}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const socket = useContext(SocketContext);
    if (socket === undefined) {
        throw new Error('useSocket deve ser usado dentro de um SocketProvider');
    }
    return socket;
};