// frontend/src/components/cardapio/OrderStatusPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react'; 
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'sonner';
import { Loader2, ArrowRight, ChevronDown, Search as SearchIcon, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import socket from '../../services/socket.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';


// --- Funções Auxiliares (mantidas globais pois não dependem do estado do componente) ---

// Mapeamento de status para cores de badge (para exibição do status ATUAL)
const getStatusBadgeGlobal = (status) => {
    let colorClass = '';
    switch (status) {
        case 'Pendente': colorClass = 'bg-yellow-100 text-yellow-800'; break;
        case 'Preparando': colorClass = 'bg-blue-100 text-blue-800'; break;
        case 'Pronto': colorClass = 'bg-purple-100 text-purple-800'; break;
        case 'Entregue': colorClass = 'bg-green-100 text-green-800'; break;
        case 'Cancelado': colorClass = 'bg-red-100 text-red-800'; break;
        default: colorClass = 'bg-gray-100 text-gray-800';
    }
    return <Badge className={`${colorClass}`}>{status}</Badge>;
};

// Mapeamento de status para o PRÓXIMO status
const statusTransitionGlobal = {
    'Pendente': 'Preparando',
    'Preparando': 'Pronto',
};

// Mapeamento de status para CORES DE BOTÃO (cor do PRÓXIMO status)
const getButtonColorClassGlobal = (status) => {
    switch (status) {
        case 'Preparando': return 'bg-blue-600 hover:bg-blue-700';
        case 'Pronto': return 'bg-purple-600 hover:bg-purple-700';
        case 'Entregue': return 'bg-green-600 hover:bg-green-700';
        default: return 'bg-gray-600 hover:bg-gray-700';
    }
};

// Lista de todos os status que podem ser exibidos/gerenciados
const allKitchenStatuses = ['Pendente', 'Preparando', 'Pronto', 'Entregue', 'Cancelado'];

const statusColorMap = {
  Pendente: 'bg-yellow-100 text-yellow-800',
  Preparando: 'bg-blue-100 text-blue-800',
  Pronto: 'bg-purple-100 text-purple-800',
  Entregue: 'bg-green-100 text-green-800',
  Cancelado: 'bg-red-100 text-red-800',
};

const OrderStatusPage = () => {
    const { slug } = useParams();
    const { empresa, loading: empresaLoading, isReady } = useEmpresa();
    const { user, token } = useAuth();

    const [pedidos, setPedidos] = useState([]);
    const [loadingPedidos, setLoadingPedidos] = useState(true);
    const [error, setError] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState(null); 

    // Estados para os filtros
    const [filterTipoEntrega, setFilterTipoEntrega] = useState('all');
    const [filterDateRange, setFilterDateRange] = useState({ from: undefined, to: undefined });
    const [searchTerm, setSearchTerm] = useState('');

    // Estado para os filtros de status visíveis (por padrão, tudo menos 'Entregue' e 'Cancelado' estão ativos)
    const [activeStatuses, setActiveStatuses] = useState(() => {
        const initialStates = {};
        allKitchenStatuses.forEach(status => {
            initialStates[status] = (status !== 'Entregue' && status !== 'Cancelado');
        });
        return initialStates;
    });

    const tipoEntregaOptions = ['Mesa', 'Balcao', 'Delivery'];

    const allowedRoles = useMemo(() => ['Funcionario', 'Caixa', 'Gerente', 'Proprietario'], []);

    // Função para tocar o som de notificação da cozinha (respeitando configuração da empresa)
    const playKitchenSound = useCallback(() => {
        if (empresa?.som_notificacao_cozinha) {
            const audio = new Audio('/sounds/cozinha.mp3');
            audio.play().catch((err) => {
                console.error('Erro ao reproduzir som de notificação da cozinha:', err);
            });
        }
    }, [empresa]);

    // Efeito para carregar pedidos e integrar Socket.IO
    useEffect(() => {
        const fetchAndSetupSocket = async () => { // Função combinada para gerenciar o setup inicial e o socket
            if (!isReady || empresaLoading) {
                setLoadingPedidos(true);
                return;
            }

            if (!user || !token || !allowedRoles.includes(user.role)) {
                setError('Acesso negado. Você não tem permissão para acessar esta página.');
                setLoadingPedidos(false);
                return;
            }

            if (!empresa?.id) { 
                setError('Dados da empresa não carregados.');
                setLoadingPedidos(false);
                return;
            }

            setLoadingPedidos(true);
            setError(null);
            try {
                const statusQuery = allKitchenStatuses.join(','); 
                const queryParams = new URLSearchParams();
                queryParams.append('status', statusQuery);
                
                if (filterTipoEntrega !== 'all') {
                    queryParams.append('tipo_entrega', filterTipoEntrega);
                }
                if (filterDateRange.from) {
                    queryParams.append('data_inicio', format(filterDateRange.from, 'yyyy-MM-dd'));
                }
                if (filterDateRange.to) {
                    queryParams.append('data_fim', format(filterDateRange.to, 'yyyy-MM-dd'));
                }
                if (searchTerm) {
                    queryParams.append('search', searchTerm);
                }

                const response = await api.get(`/gerencial/${empresa.slug}/pedidos?${queryParams.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                // CRUCIAL: Mapear os itens para garantir que 'observacoes' seja sempre uma string
                // e outras propriedades esperadas estejam presentes.
                const processedPedidos = (response.data || []).map(pedido => ({
                    ...pedido,
                    itens: (pedido.itens || []).map(item => ({
                        ...item,
                        observacoes: item.observacoes || '' // Garante que observacoes é uma string vazia se null
                    })),
                    observacoes: pedido.observacoes || '' // Garante que observacoes do pedido é uma string vazia
                }));

                const sortedPedidos = processedPedidos.sort((a, b) => {
                    return new Date(a.data_pedido).getTime() - new Date(b.data_pedido).getTime();
                });
                
                setPedidos(sortedPedidos);
                toast.success("Pedidos da cozinha carregados!");
            } catch (err) {
                setError(err.response?.data?.message || 'Erro ao carregar pedidos para a cozinha.');
                console.error("Erro ao carregar pedidos:", err);
                toast.error(err.response?.data?.message || 'Erro ao carregar pedidos para a cozinha.');
            } finally {
                setLoadingPedidos(false);
            }

            // --- Integração com Socket.IO (instância global) ---
            if (!socket.connected) {
                socket.connect();
            }

            socket.emit('join_company_room', empresa.id);

            socket.on('connect', () => {
                console.log('Socket.IO: Conectado ao servidor para cozinha.');
            });

            socket.on('disconnect', () => {
                console.log('Socket.IO: Desconectado do servidor da cozinha.');
            });

            // Ouve por novos pedidos
            socket.on('newOrder', (newOrder) => {
                console.log('Socket.IO: Novo pedido recebido para cozinha:', newOrder);
                setPedidos(prevPedidos => {
                    if (!prevPedidos.some(p => p.id === newOrder.id) && allKitchenStatuses.includes(newOrder.status)) {
                        // Processa o novo pedido para garantir a consistência dos dados (itens/observações)
                        const processedNewOrder = {
                            ...newOrder,
                            itens: (newOrder.itens || []).map(item => ({
                                ...item,
                                observacoes: item.observacoes || ''
                            })),
                            observacoes: newOrder.observacoes || ''
                        };
                        const updatedList = [...prevPedidos, processedNewOrder];
                        return updatedList.sort((a, b) => new Date(a.data_pedido).getTime() - new Date(b.data_pedido).getTime());
                    }
                    return prevPedidos; 
                });
                if (allKitchenStatuses.includes(newOrder.status)) {
                    toast.info(`Novo Pedido para Cozinha: #${newOrder.numero_pedido} (${newOrder.tipo_entrega})`);
                    // Toca som de notificação, caso configurado
                    playKitchenSound();
                }
            });

            // Ouve por pedidos atualizados
            socket.on('orderUpdated', (updatedOrder) => {
                console.log('Socket.IO: Pedido atualizado para cozinha:', updatedOrder);
                setPedidos(prevPedidos => {
                    // Processa o pedido atualizado para garantir a consistência dos dados
                    const processedUpdatedOrder = {
                        ...updatedOrder,
                        itens: (updatedOrder.itens || []).map(item => ({
                            ...item,
                            observacoes: item.observacoes || ''
                        })),
                        observacoes: updatedOrder.observacoes || ''
                    };

                    const updatedList = prevPedidos.map(p =>
                        p.id === processedUpdatedOrder.id ? processedUpdatedOrder : p // Substitui pelo objeto processado
                    );
                    // Se o pedido não está mais em um status gerenciável pela cozinha, remove-o
                    if (!allKitchenStatuses.includes(processedUpdatedOrder.status) && processedUpdatedOrder.status !== 'Entregue' && processedUpdatedOrder.status !== 'Cancelado') {
                         return updatedList.filter(p => p.id !== processedUpdatedOrder.id);
                    }
                    return updatedList.sort((a, b) => new Date(a.data_pedido).getTime() - new Date(b.data_pedido).getTime());
                });
                if (statusTransitionGlobal[updatedOrder.status] || updatedOrder.status === 'Entregue' || updatedOrder.status === 'Cancelado') {
                    toast.info(`Pedido #${updatedOrder.numero_pedido || updatedOrder.id} atualizado para ${updatedOrder.status || 'novo status'}.`);
                }
            });

            // Ouve por pedidos finalizados (removidos da lista)
            socket.on('orderFinalized', (finalizedOrder) => {
                console.log('Socket.IO: Pedido finalizado para cozinha:', finalizedOrder);
                setPedidos(prevPedidos => prevPedidos.filter(p => p.id !== finalizedOrder.id));
                toast.success(`Pedido #${finalizedOrder.numero_pedido} foi finalizado!`);
            });

            // Ouve por pedidos excluídos
            socket.on('orderDeleted', (deletedOrder) => {
                console.log('Socket.IO: Pedido excluído para cozinha:', deletedOrder);
                setPedidos(prevPedidos => prevPedidos.filter(p => p.id !== deletedOrder.id));
                toast.warning(`Pedido #${deletedOrder.numero_pedido} foi excluído.`);
            });

            // Limpeza dos listeners ao desmontar o componente ou mudar dependências
            return () => {
                socket.emit('leave_company_room', empresa.id);
                socket.off('newOrder');
                socket.off('orderUpdated');
                socket.off('orderFinalized');
                socket.off('orderDeleted');
                socket.off('connect');
                socket.off('disconnect');
                console.log('Socket.IO: Componente OrderStatusPage desmontado, listeners removidos.');
            };
        };

        fetchAndSetupSocket();

    }, [empresa?.id, empresa?.slug, isReady, user, token, allowedRoles, empresaLoading, playKitchenSound, filterTipoEntrega, filterDateRange]);


    // Função para mudar o status do pedido (avançar ou voltar)
    const handleChangeStatus = async (pedidoId, newStatus) => {
        if (!user || !token || !allowedRoles.includes(user.role)) {
            toast.error('Você não tem permissão para alterar o status do pedido.');
            return;
        }

        setUpdatingStatus(pedidoId);
        try {
            await api.put(`/gerencial/${empresa.slug}/pedidos/${pedidoId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            toast.error(err.response?.data?.message || `Erro ao atualizar status do pedido.`);
            console.error(`Erro ao atualizar status:`, err);
        } finally {
            setUpdatingStatus(null);
        }
    };

    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return '-';
        try {
            return format(parseISO(dateTimeString), 'dd/MM/yyyy HH:mm');
        } catch (e) {
            console.error("Erro ao formatar data:", e);
            return dateTimeString;
        }
    };

    // Função para obter as propriedades do botão de "Avançar Status"
    const getButtonPropsForStatus = useCallback((currentPedidoStatus) => {
        const nextStatus = statusTransitionGlobal[currentPedidoStatus];
        if (!nextStatus) {
            // Se não há próximo status (ex: já está 'Entregue' ou 'Cancelado' e não avança mais)
            return { text: `Status Final`, color: 'bg-gray-200 text-purple-800', disabled: true };
        }
        
        const buttonColorClass = getButtonColorClassGlobal(nextStatus);

        return { text: `Avançar para ${nextStatus}`, color: buttonColorClass, disabled: false };
    }, []); 

    // Função para buscar com os filtros atuais
    const handleSearch = useCallback(async () => {
        if (!isReady || empresaLoading || !empresa?.slug || !user) {
            return;
        }

        if (!allowedRoles.includes(user.role)) {
            return;
        }

        setLoadingPedidos(true);
        setError(null);
        try {
            const statusQuery = allKitchenStatuses.join(','); 
            const queryParams = new URLSearchParams();
            queryParams.append('status', statusQuery);
            
            if (filterTipoEntrega !== 'all') {
                queryParams.append('tipo_entrega', filterTipoEntrega);
            }
            if (filterDateRange.from) {
                queryParams.append('data_inicio', format(filterDateRange.from, 'yyyy-MM-dd'));
            }
            if (filterDateRange.to) {
                queryParams.append('data_fim', format(filterDateRange.to, 'yyyy-MM-dd'));
            }
            if (searchTerm) {
                queryParams.append('search', searchTerm);
            }

            const response = await api.get(`/gerencial/${empresa.slug}/pedidos?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const processedPedidos = (response.data || []).map(pedido => ({
                ...pedido,
                itens: (pedido.itens || []).map(item => ({
                    ...item,
                    observacoes: item.observacoes || ''
                })),
                observacoes: pedido.observacoes || ''
            }));

            const sortedPedidos = processedPedidos.sort((a, b) => {
                return new Date(a.data_pedido).getTime() - new Date(b.data_pedido).getTime();
            });
            
            setPedidos(sortedPedidos);
            toast.success("Pedidos filtrados carregados!");
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao carregar pedidos filtrados.');
            console.error("Erro ao carregar pedidos filtrados:", err);
            toast.error(err.response?.data?.message || 'Erro ao carregar pedidos filtrados.');
        } finally {
            setLoadingPedidos(false);
        }
    }, [empresa, empresaLoading, isReady, user, token, allowedRoles, filterTipoEntrega, filterDateRange, searchTerm]);

    // Função para lidar com a tecla Enter no campo de busca
    const handleSearchKeyPress = useCallback((e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    }, [handleSearch]);

    // Agrupa os pedidos por status para as colunas visíveis
    const groupedPedidos = useMemo(() => {
        const groups = {};
        allKitchenStatuses.forEach(status => {
            if (activeStatuses[status]) { 
                groups[status] = pedidos.filter(pedido => pedido.status === status);
            }
        });
        return groups;
    }, [pedidos, activeStatuses]);

    // Renderiza mensagens de carregamento/erro
    if (empresaLoading || loadingPedidos || !isReady) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin mr-2" /> Carregando pedidos para a cozinha...
            </div>
        );
    }

    if (error) {
        return <div className="p-4 text-center text-red-600">{error}</div>;
    }


    return (
        <div className="container mx-auto p-2 sm:p-4">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-800 text-center">Painel da Cozinha</h1>
            <p className="text-center text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">Gerencie o status dos pedidos e avance-os na produção.</p>

            {/* Filtros de Status (Switches) */}
            <div className="mb-6 sm:mb-8 p-3 sm:p-4 border rounded-lg bg-gray-50 flex flex-wrap gap-3 sm:gap-4 justify-center">
                {allKitchenStatuses.map(status => (
                    <div key={status} className="flex items-center space-x-2">
                        <Switch
                            id={`switch-${status}`}
                            checked={activeStatuses[status]}
                            onCheckedChange={() => setActiveStatuses(prev => ({ ...prev, [status]: !prev[status] }))}
                        />
                        <Label htmlFor={`switch-${status}`} className="text-sm">{status}</Label>
                    </div>
                ))}
            </div>

            {/* Filtros Adicionais */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 border rounded-lg bg-gray-50 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                    <Label htmlFor="filterTipoEntrega" className="text-sm">Tipo de Entrega</Label>
                    <Select value={filterTipoEntrega} onValueChange={setFilterTipoEntrega}>
                        <SelectTrigger id="filterTipoEntrega" className="h-9 sm:h-10">
                            <SelectValue placeholder="Todos os Tipos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {tipoEntregaOptions.map(tipo => (
                                <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="filterDateRange" className="text-sm">Período</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="filterDateRange"
                                variant={"outline"}
                                className={"w-full h-9 sm:h-10 justify-start text-left font-normal text-sm"}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filterDateRange.from ? (
                                    filterDateRange.to ? (
                                        <>
                                            {format(filterDateRange.from, "dd/MM/yyyy")} -{" "}
                                            {format(filterDateRange.to, "dd/MM/yyyy")}
                                        </>
                                    ) : (
                                        format(filterDateRange.from, "dd/MM/yyyy")
                                    )
                                ) : (
                                    <span>Selecione uma data</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="range"
                                selected={filterDateRange}
                                onSelect={setFilterDateRange}
                                initialFocus
                            />
                            <div className="flex justify-end p-2 border-t">
                                <Button onClick={() => setFilterDateRange({ from: undefined, to: undefined })} variant="ghost" size="sm">Limpar</Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                    <Label htmlFor="searchTerm" className="text-sm">Buscar por Pedido/Cliente</Label>
                    <Input
                        id="searchTerm"
                        placeholder="Número do pedido, nome do cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={handleSearchKeyPress}
                        className="w-full h-9 sm:h-10 text-sm"
                    />
                </div>
                <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                    <Button onClick={handleSearch} className="w-full h-9 sm:h-10 text-sm">
                        <SearchIcon className="mr-2 h-4 w-4" /> Buscar
                    </Button>
                </div>
            </div>

            {/* Colunas de Pedidos por Status */}
            {Object.keys(groupedPedidos).length === 0 ? (
                <p className="w-full text-center text-gray-600 text-base sm:text-lg p-4">
                    {pedidos.length === 0 ? "Nenhum pedido ativo para a cozinha." : "Nenhum pedido para exibir com os filtros selecionados."}
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {/* Renderiza as colunas na ordem lógica de status */}
                    {['Pendente', 'Preparando', 'Pronto', 'Entregue', 'Cancelado'].map(status => {
                        if (!activeStatuses[status]) return null;

                        const pedidosInColumn = groupedPedidos[status] || [];
                        
                        return (
                            <div 
                                key={status} 
                                className="bg-gray-100 rounded-lg shadow-inner p-3 sm:p-4 flex flex-col min-h-[60vh] sm:min-h-[70vh]" 
                            >
                                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-700 border-b pb-2 text-center">
                                    {status} ({pedidosInColumn.length})
                                </h2>
                                <div className="space-y-3 sm:space-y-4 flex-grow overflow-y-auto pr-1 sm:pr-2">
                                    {pedidosInColumn.length === 0 ? (
                                        <p className="text-gray-500 text-sm text-center">Nenhum pedido neste status.</p>
                                    ) : (
                                        pedidosInColumn.map(pedido => {
                                            const buttonProps = getButtonPropsForStatus(pedido.status);
                                            const isUpdatingThisPedido = updatingStatus === pedido.id;
                                            
                                            return (
                                                <Card key={pedido.id} className="relative overflow-hidden bg-white shadow-md">
                                                    {isUpdatingThisPedido && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                                                            <Loader2 className="animate-spin text-primary h-6 w-6 sm:h-8 sm:w-8" />
                                                        </div>
                                                    )}
                                                    <CardHeader className="pb-2 px-3 sm:px-4 py-3">
                                                        <CardTitle className="flex justify-between items-center text-base sm:text-lg">
                                                            <span className="truncate">#{pedido.numero_pedido}</span>
                                                            {getStatusBadgeGlobal(pedido.status)}
                                                        </CardTitle>
                                                        <CardDescription className="text-xs sm:text-sm">
                                                            {pedido.tipo_entrega === 'Mesa' ? `Mesa: ${pedido.numero_mesa || 'N/A'}` : `Tipo: ${pedido.tipo_entrega}`}
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="space-y-2 text-xs sm:text-sm pt-2 px-3 sm:px-4">
                                                        <div className="space-y-1">
                                                            <div><strong>Cliente:</strong> {pedido.nome_cliente || pedido.nome_cliente_convidado || 'Convidado'}</div>
                                                            <div><strong>Criado:</strong> {formatDateTime(pedido.data_pedido)}</div>
                                                            <div><strong>Atualizado:</strong> {formatDateTime(pedido.data_atualizacao)}</div>
                                                        </div>
                                                        <div className="mt-2">
                                                            <p className="font-semibold">Itens:</p>
                                                            {(pedido.itens && pedido.itens.length > 0) ? (
                                                                <ul className="list-disc list-inside ml-2 text-gray-700 space-y-1">
                                                                    {/* Garante que item.id existe para a key, usa fallback idx para segurança */}
                                                                    {pedido.itens.map((item, idx) => ( 
                                                                        <li key={item.id || idx} className="text-xs">
                                                                            <div>
                                                                                {item.quantidade}x {item.nome_produto}
                                                                                {/* CORRIGIDO: Exibição de observações do item (garantido string vazia se null) */}
                                                                                {item.observacoes && item.observacoes.trim() !== '' ? <span className="italic text-gray-500"> ({item.observacoes})</span> : ''}
                                                                            </div>
                                                                            {/* Exibir adicionais do item */}
                                                                            {item.adicionais && item.adicionais.length > 0 && (
                                                                                <div className="ml-4 mt-1">
                                                                                    {item.adicionais.map((adicional, adicIdx) => (
                                                                                        <div key={adicIdx} className="text-xs text-blue-600">
                                                                                            + {adicional.quantidade}x {adicional.nome}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p className="text-gray-500 text-xs">Nenhum item listado.</p>
                                                            )}
                                                        </div>
                                                        <div className="mt-2 text-gray-700">
                                                            {/* CORRIGIDO: Exibição de observações do pedido (garantido string vazia se null) */}
                                                            <strong>Obs. Pedido:</strong> {pedido.observacoes && pedido.observacoes.trim() !== '' ? pedido.observacoes : 'Nenhuma observação'}
                                                        </div>
                                                    </CardContent>
                                                    <CardFooter className="pt-3 sm:pt-4 px-3 sm:px-4 pb-3 flex justify-center">
                                                        <Select
                                                            value={pedido.status}
                                                            onValueChange={(newStatus) => handleChangeStatus(pedido.id, newStatus)}
                                                            disabled={isUpdatingThisPedido}
                                                        >
                                                            <SelectTrigger
                                                                className={`w-full border-blue-500 focus:border-blue-600 focus:ring-blue-500 flex items-center text-xs sm:text-sm h-8 sm:h-9 ${statusColorMap[pedido.status]}`}
                                                            >
                                                                <SelectValue placeholder="Mudar Status" />
                                                               
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {allKitchenStatuses.map(status => (
                                                                    <SelectItem
                                                                        key={status}
                                                                        value={status}
                                                                        className="data-[state=checked]:bg-blue-500 data-[state=checked]:text-white focus:bg-blue-100 focus:text-blue-900 text-xs sm:text-sm"
                                                                    >
                                                                        {status} {status === pedido.status ? ' (Atual)' : ''}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </CardFooter>
                                                </Card>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default OrderStatusPage;