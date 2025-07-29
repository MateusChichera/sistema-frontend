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

const AvisosToast = () => {
    const { user, token } = useAuth();
    const { empresa } = useEmpresa();
    const [avisos, setAvisos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedAviso, setSelectedAviso] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [hasUnreadAvisos, setHasUnreadAvisos] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [currentAvisoIndex, setCurrentAvisoIndex] = useState(0);

    // Função para verificar se há avisos não lidos
    const checkUnreadAvisos = async () => {
        if (!empresa?.slug || !token) return;

        try {
            console.log('Verificando avisos para empresa:', empresa.slug);
            const response = await api.get(`gerencial/${empresa.slug}/avisos/check/nao-lidos`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Resposta da API check:', response.data);
            
            // Corrigindo o campo da API
            const hasUnread = response.data.tem_avisos_nao_lidos || false;
            setHasUnreadAvisos(hasUnread);
            
            // Se há avisos não lidos, usa os dados já retornados
            if (hasUnread && response.data.avisos) {
                console.log('Avisos retornados diretamente:', response.data.avisos.length);
                setAvisos(response.data.avisos);
                setShowToast(true);
                setCurrentAvisoIndex(0);
            }
        } catch (err) {
            console.error("Erro ao verificar avisos não lidos:", err);
        }
    };

    // Função para buscar avisos não lidos (mantida para compatibilidade)
    const fetchUnreadAvisos = async () => {
        if (!empresa?.slug || !token) return;

        setLoading(true);
        try {
            const url = `gerencial/${empresa.slug}/avisos/check/nao-lidos`;
            console.log('Fazendo requisição para:', url);
            
            const response = await api.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const avisosData = response.data.avisos || [];
            setAvisos(avisosData);
            
            console.log('Avisos não lidos encontrados:', avisosData.length);
            console.log('Dados dos avisos:', avisosData);
            
            // Se há avisos, mostra o toast
            if (avisosData.length > 0) {
                console.log('Mostrando toast de avisos');
                setShowToast(true);
                setCurrentAvisoIndex(0);
            }
        } catch (err) {
            console.error("Erro ao buscar avisos:", err);
            console.error("URL tentada:", `gerencial/${empresa.slug}/avisos/check/nao-lidos`);
            console.error("Status:", err.response?.status);
            console.error("Dados do erro:", err.response?.data);
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
            
            // Se não há mais avisos, fecha o toast
            if (avisos.length <= 1) {
                setShowToast(false);
                setHasUnreadAvisos(false);
            } else {
                // Move para o próximo aviso
                setCurrentAvisoIndex(prev => Math.min(prev + 1, avisos.length - 2));
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
            
            // Se não há mais avisos, fecha o toast
            if (avisos.length <= 1) {
                setShowToast(false);
                setHasUnreadAvisos(false);
            } else {
                // Move para o próximo aviso
                setCurrentAvisoIndex(prev => Math.min(prev + 1, avisos.length - 2));
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
            setIsModalOpen(true);
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

    // Função para fechar o toast
    const closeToast = () => {
        console.log('Fechando toast...');
        setShowToast(false);
        setCurrentAvisoIndex(0);
        setAvisos([]);
    };

    // Função para ver próximo aviso
    const nextAviso = () => {
        if (currentAvisoIndex < avisos.length - 1) {
            setCurrentAvisoIndex(prev => prev + 1);
        } else {
            setShowToast(false);
        }
    };

    // Função para ver aviso anterior
    const prevAviso = () => {
        if (currentAvisoIndex > 0) {
            setCurrentAvisoIndex(prev => prev - 1);
        }
    };

    // Verificar avisos não lidos quando o componente monta
    useEffect(() => {
        const checkAndShowAvisos = async () => {
            if (!empresa?.slug || !token) return;

            try {
                console.log('Verificando avisos para empresa:', empresa.slug);
                const response = await api.get(`gerencial/${empresa.slug}/avisos/check/nao-lidos`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('Resposta da API check:', response.data);
                const hasUnread = response.data.tem_avisos_nao_lidos || false;
                setHasUnreadAvisos(hasUnread);
                
                console.log('Verificando avisos não lidos:', hasUnread);
                
                // Se há avisos não lidos, busca e mostra automaticamente
                if (hasUnread) {
                    console.log('Há avisos não lidos, buscando...');
                    await fetchUnreadAvisos();
                } else {
                    console.log('Não há avisos não lidos');
                }
            } catch (err) {
                console.error("Erro ao verificar avisos não lidos:", err);
            }
        };

        // Aguarda um pouco para garantir que a página carregou
        const timer = setTimeout(() => {
            console.log('Iniciando verificação de avisos...');
            checkAndShowAvisos();
        }, 2000); // 2 segundos de delay
        
        // Verificar a cada 5 minutos
        const interval = setInterval(() => {
            console.log('Verificação periódica de avisos...');
            checkAndShowAvisos();
        }, 5 * 60 * 1000);
        
        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, [empresa?.slug, token]);

    // Mostrar toast quando avisos são carregados
    useEffect(() => {
        if (avisos.length > 0 && !showToast) {
            console.log('Avisos carregados, mostrando toast');
            setShowToast(true);
            setCurrentAvisoIndex(0);
        }
    }, [avisos, showToast]);

    // Se não há empresa ou usuário, não renderiza
    if (!empresa || !user) {
        return null;
    }

    // Se não há avisos ou não está mostrando toast, não renderiza
    if (avisos.length === 0 || !showToast) {
        return null;
    }

    const currentAviso = avisos[currentAvisoIndex];

    return (
        <>
            {/* Toast de Aviso */}
            <div className="fixed top-4 right-4 z-50 w-80 sm:w-96 max-w-sm">
                <Card className="border-l-4 border-l-blue-500 shadow-lg">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-blue-500" />
                                    {currentAviso.titulo}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="secondary" className="text-xs">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {formatDate(currentAviso.data_criacao)}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                        Não Lido
                                    </Badge>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={closeToast}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                            {currentAviso.mensagem}
                        </p>
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => viewAvisoDetails(currentAviso.id)}
                                >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Ver Detalhes
                                </Button>
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => markAsRead(currentAviso.id)}
                                >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Marcar como Lido
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => markAsViewLater(currentAviso.id)}
                                >
                                    <Clock className="h-4 w-4 mr-1" />
                                    Ver Depois
                                </Button>
                            </div>
                            {avisos.length > 1 && (
                                <div className="flex items-center justify-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={prevAviso}
                                        disabled={currentAvisoIndex === 0}
                                    >
                                        ←
                                    </Button>
                                    <span className="text-xs text-muted-foreground">
                                        {currentAvisoIndex + 1} de {avisos.length}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={nextAviso}
                                        disabled={currentAvisoIndex === avisos.length - 1}
                                    >
                                        →
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Modal de Detalhes do Aviso */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
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
                                            setIsModalOpen(false);
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
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default AvisosToast; 