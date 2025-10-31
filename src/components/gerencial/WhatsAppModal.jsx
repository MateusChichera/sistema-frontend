import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmpresa } from '../../contexts/EmpresaContext';
import api from '../../services/api';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Loader2, MessageCircle, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

const WhatsAppModal = () => {
    const { user, token } = useAuth();
    const { empresa } = useEmpresa();
    const [status, setStatus] = useState(null);
    const [qrCode, setQrCode] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pollingInterval, setPollingInterval] = useState(null);

    // Função para normalizar QR Code (backend agora retorna data:image/png;base64,... diretamente)
    const normalizeQRCode = (qr) => {
        if (!qr) return null;
        
        // Backend agora retorna diretamente como data:image/png;base64,...
        if (typeof qr === 'string' && qr.startsWith('data:image')) {
            return qr; // Já está no formato correto
        }
        
        // Fallback: se vier como array, junta
        if (Array.isArray(qr)) {
            return qr.join('');
        }
        
        // Se vier como string sem prefixo, adiciona (para compatibilidade)
        if (typeof qr === 'string') {
            return `data:image/png;base64,${qr}`;
        }
        
        return null;
    };

    // Função para verificar status do WhatsApp
    const checkStatus = async () => {
        if (!empresa?.slug || !token) return;

        try {
            const response = await api.get(`/gerencial/${empresa.slug}/whatsapp/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus(response.data);
            
            if (response.data.qr) {
                const normalized = normalizeQRCode(response.data.qr);
                if (normalized) {
                    setQrCode(normalized);
                } else {
                    setQrCode(null);
                }
            } else {
                setQrCode(null);
            }
        } catch (err) {
            console.error("Erro ao verificar status WhatsApp:", err);
            toast.error('Erro ao verificar status do WhatsApp.');
        }
    };

    // Função para conectar WhatsApp
    const connectWhatsApp = async () => {
        if (!empresa?.slug || !token) return;

        setLoading(true);
        try {
            const response = await api.post(`/gerencial/${empresa.slug}/whatsapp/connect`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data.qr) {
                setQrCode(normalizeQRCode(response.data.qr));
                setStatus({ ...response.data, connected: false });
                // Iniciar polling para verificar conexão
                startPolling();
            } else if (response.data.connected) {
                setStatus({ ...response.data, connected: true });
                setQrCode(null);
                toast.success('WhatsApp já está conectado!');
            }
        } catch (err) {
            console.error("Erro ao conectar WhatsApp:", err);
            toast.error(err.response?.data?.message || 'Erro ao conectar WhatsApp.');
        } finally {
            setLoading(false);
        }
    };

    // Função para desconectar WhatsApp
    const disconnectWhatsApp = async () => {
        if (!empresa?.slug || !token) return;

        if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp?')) {
            return;
        }

        setLoading(true);
        try {
            await api.post(`/gerencial/${empresa.slug}/whatsapp/disconnect`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus({ connected: false, message: 'Desconectado' });
            setQrCode(null);
            stopPolling();
            toast.success('WhatsApp desconectado com sucesso!');
        } catch (err) {
            console.error("Erro ao desconectar WhatsApp:", err);
            toast.error(err.response?.data?.message || 'Erro ao desconectar WhatsApp.');
        } finally {
            setLoading(false);
        }
    };

    // Função para obter QR Code
    const getQRCode = async () => {
        if (!empresa?.slug || !token) return;

        setLoading(true);
        try {
            const response = await api.get(`/gerencial/${empresa.slug}/whatsapp/qrcode`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data.qr) {
                setQrCode(normalizeQRCode(response.data.qr));
            } else {
                setQrCode(null);
            }
            
            setStatus(response.data);
        } catch (err) {
            console.error("Erro ao obter QR Code:", err);
            toast.error('Erro ao obter QR Code.');
        } finally {
            setLoading(false);
        }
    };

    // Polling para verificar status quando aguardando conexão
    const startPolling = () => {
        // Limpar intervalo anterior se existir
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        const interval = setInterval(async () => {
            try {
                const response = await api.get(`/gerencial/${empresa.slug}/whatsapp/status`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (response.data.connected) {
                    clearInterval(interval);
                    setStatus(response.data);
                    setQrCode(null);
                    stopPolling();
                    toast.success('WhatsApp conectado com sucesso!');
                } else if (response.data.qr && response.data.qr !== qrCode) {
                    setQrCode(normalizeQRCode(response.data.qr)); // QR Code renovado
                }
            } catch (err) {
                console.error("Erro ao fazer polling:", err);
            }
        }, 3000); // Verificar a cada 3 segundos

        setPollingInterval(interval);

        // Parar polling após 5 minutos
        setTimeout(() => {
            clearInterval(interval);
            setPollingInterval(null);
        }, 5 * 60 * 1000);
    };

    const stopPolling = () => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
        }
    };

    // Verificar status quando o modal abre
    useEffect(() => {
        if (isModalOpen && empresa?.slug && token) {
            checkStatus();
        } else {
            stopPolling();
        }
    }, [isModalOpen, empresa?.slug, token]);

    // Limpar polling quando componente desmonta
    useEffect(() => {
        return () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [pollingInterval]);

    // Se não há empresa ou usuário, não renderiza
    if (!empresa || !user) {
        return null;
    }

    return (
        <>
            {/* Botão do WhatsApp */}
            <div className="relative">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsModalOpen(true)}
                    className="relative"
                    disabled={loading}
                >
                    <MessageCircle className="h-5 w-5 text-green-500" />
                    {status?.connected && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                </Button>
            </div>

            {/* Modal do WhatsApp */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-green-500" />
                            WhatsApp
                        </DialogTitle>
                        <DialogDescription>
                            {status?.connected 
                                ? 'Conectado e pronto para enviar mensagens'
                                : 'Conecte seu WhatsApp para enviar mensagens automáticas'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {loading && !status ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Carregando status...</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Status da Conexão */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    {status?.connected ? (
                                        <>
                                            <Wifi className="h-5 w-5 text-green-500" />
                                            <span className="font-semibold text-green-600">Conectado</span>
                                        </>
                                    ) : (
                                        <>
                                            <WifiOff className="h-5 w-5 text-red-500" />
                                            <span className="font-semibold text-red-600">Desconectado</span>
                                        </>
                                    )}
                                </div>
                                {status?.jid && (
                                    <span className="text-sm text-gray-600">{status.jid}</span>
                                )}
                            </div>

                            {status?.message && (
                                <p className="text-sm text-gray-600 text-center">{status.message}</p>
                            )}

                            {/* QR Code */}
                            {qrCode && !status?.connected && (
                                <div className="flex flex-col items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm font-semibold text-center">
                                        Escaneie o QR Code com seu WhatsApp:
                                    </p>
                                    <div className="bg-white p-4 rounded-lg flex items-center justify-center min-h-[200px]">
                                        {qrCode ? (
                                            <img 
                                                src={qrCode} 
                                                alt="QR Code WhatsApp" 
                                                className="max-w-full h-auto max-w-[300px]"
                                                onError={(e) => {
                                                    console.error('Erro ao carregar QR Code');
                                                    e.target.style.display = 'none';
                                                    toast.error('Erro ao exibir QR Code. Tente renovar.');
                                                }}
                                            />
                                        ) : (
                                            <p className="text-sm text-gray-500">Carregando QR Code...</p>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={getQRCode}
                                        disabled={loading}
                                    >
                                        Renovar QR Code
                                    </Button>
                                </div>
                            )}

                            {/* Ações */}
                            <div className="flex flex-col gap-2">
                                {!status?.connected ? (
                                    <Button
                                        onClick={connectWhatsApp}
                                        disabled={loading}
                                        className="w-full"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Conectando...
                                            </>
                                        ) : (
                                            'Conectar WhatsApp'
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="destructive"
                                        onClick={disconnectWhatsApp}
                                        disabled={loading}
                                        className="w-full"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Desconectando...
                                            </>
                                        ) : (
                                            'Desconectar WhatsApp'
                                        )}
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={checkStatus}
                                    disabled={loading}
                                    className="w-full"
                                >
                                    Atualizar Status
                                </Button>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default WhatsAppModal;

