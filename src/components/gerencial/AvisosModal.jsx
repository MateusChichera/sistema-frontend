import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmpresa } from '../../contexts/EmpresaContext';
import api from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Loader2, MessageSquare, Eye, CheckCircle, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

const AvisosModal = () => {
    const { user, token } = useAuth();
    const { empresa } = useEmpresa();
    const [avisos, setAvisos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedAviso, setSelectedAviso] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [hasUnreadAvisos, setHasUnreadAvisos] = useState(false);

    // Função para verificar se há avisos não lidos
    const checkUnreadAvisos = async () => {
        if (!empresa?.slug || !token) return;

        try {
            const response = await api.get(`gerencial/${empresa.slug}/avisos/check/nao-lidos`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHasUnreadAvisos(response.data.tem_avisos_nao_lidos || false);
        } catch (err) {
            console.error("Erro ao verificar avisos não lidos:", err);
        }
    };

    // Função para buscar avisos não lidos
    const fetchUnreadAvisos = async () => {
        if (!empresa?.slug || !token) return;

        setLoading(true);
        try {
            const url = `gerencial/${empresa.slug}/avisos/check/nao-lidos`;
            console.log('AvisosModal - Fazendo requisição para:', url);
            
            const response = await api.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const avisosData = response.data.avisos || [];
            setAvisos(avisosData);
            
            console.log('AvisosModal - Avisos não lidos encontrados:', avisosData.length);
        } catch (err) {
            console.error("AvisosModal - Erro ao buscar avisos:", err);
            console.error("AvisosModal - URL tentada:", url);
            console.error("AvisosModal - Status:", err.response?.status);
            console.error("AvisosModal - Dados do erro:", err.response?.data);
            toast.error('Erro ao carregar avisos.');
        } finally {
            setLoading(false);
        }
    };

    // Função para marcar aviso como lido
    const markAsRead = async (avisoId) => {
        if (!empresa?.slug || !token) return;

        try {
            await api.patch(`gerencial/${empresa.slug}/avisos/${avisoId}/status`, {
                status: 'Lido'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Remove o aviso da lista local
            setAvisos(prev => prev.filter(aviso => aviso.id !== avisoId));
            
            // Se não há mais avisos, fecha o modal
            if (avisos.length <= 1) {
                setIsModalOpen(false);
                setHasUnreadAvisos(false);
            }

            toast.success('Aviso marcado como lido!');
        } catch (err) {
            console.error("Erro ao marcar aviso como lido:", err);
            toast.error('Erro ao marcar aviso como lido.');
        }
    };

    // Função para marcar aviso como "Visualizar Depois"
    const markAsViewLater = async (avisoId) => {
        if (!empresa?.slug || !token) return;

        try {
            await api.patch(`gerencial/${empresa.slug}/avisos/${avisoId}/status`, {
                status: 'Visualizar Depois'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Remove o aviso da lista local
            setAvisos(prev => prev.filter(aviso => aviso.id !== avisoId));
            
            // Se não há mais avisos, fecha o modal
            if (avisos.length <= 1) {
                setIsModalOpen(false);
                setHasUnreadAvisos(false);
            }

            toast.success('Aviso marcado para visualizar depois!');
        } catch (err) {
            console.error("Erro ao marcar aviso para visualizar depois:", err);
            toast.error('Erro ao marcar aviso para visualizar depois.');
        }
    };

    // Função para visualizar detalhes do aviso
    const viewAvisoDetails = async (avisoId) => {
        if (!empresa?.slug || !token) return;

        try {
            const response = await api.get(`gerencial/${empresa.slug}/avisos/${avisoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedAviso(response.data.aviso);
        } catch (err) {
            console.error("Erro ao buscar detalhes do aviso:", err);
            toast.error('Erro ao carregar detalhes do aviso.');
        }
    };

    // Função para formatar data
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('pt-BR');
    };

    // Verificar avisos não lidos quando o componente monta
    useEffect(() => {
        checkUnreadAvisos();
    }, [empresa?.slug, token]);

    // Buscar avisos quando o modal abre
    useEffect(() => {
        if (isModalOpen) {
            fetchUnreadAvisos();
        }
    }, [isModalOpen, empresa?.slug, token]);

    // Se não há empresa ou usuário, não renderiza
    if (!empresa || !user) {
        return null;
    }

    return (
        <>
            {/* Botão de Avisos */}
            <div className="relative">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsModalOpen(true)}
                    className="relative"
                    disabled={loading}
                >
                    <MessageSquare className="h-5 w-5" />
                    {hasUnreadAvisos && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    )}
                </Button>
            </div>

            {/* Modal de Avisos */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Avisos do Sistema
                        </DialogTitle>
                        <DialogDescription>
                            {avisos.length > 0 
                                ? `${avisos.length} aviso(s) não lido(s)`
                                : 'Nenhum aviso não lido'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Carregando avisos...</span>
                            </div>
                        </div>
                    ) : avisos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                                Nenhum aviso não lido
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Você está em dia com todos os avisos do sistema.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {avisos.map((aviso) => (
                                <Card key={aviso.id} className="border-l-4 border-l-blue-500">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="text-lg">{aviso.titulo}</CardTitle>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="secondary" className="text-xs">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        {formatDate(aviso.data_criacao)}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs">
                                                        Não Lido
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                                            {aviso.mensagem}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => viewAvisoDetails(aviso.id)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                Ver Detalhes
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => markAsRead(aviso.id)}
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Marcar como Lido
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => markAsViewLater(aviso.id)}
                                            >
                                                <Clock className="h-4 w-4 mr-1" />
                                                Ver Depois
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Detalhes do Aviso */}
            <Dialog open={!!selectedAviso} onOpenChange={() => setSelectedAviso(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Detalhes do Aviso
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedAviso && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">{selectedAviso.titulo}</h3>
                                <div className="flex items-center gap-2 mb-4">
                                    <Badge variant="secondary" className="text-xs">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {formatDate(selectedAviso.data_criacao)}
                                    </Badge>
                                    <Badge variant={selectedAviso.status === 'Lido' ? 'default' : 'outline'} className="text-xs">
                                        {selectedAviso.status}
                                    </Badge>
                                </div>
                            </div>
                            
                            <div className="bg-muted p-4 rounded-lg">
                                <p className="text-sm whitespace-pre-wrap">{selectedAviso.mensagem}</p>
                            </div>

                            {selectedAviso.status === 'Não Lido' && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="default"
                                        onClick={() => {
                                            markAsRead(selectedAviso.id);
                                            setSelectedAviso(null);
                                        }}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Marcar como Lido
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedAviso(null)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default AvisosModal; 