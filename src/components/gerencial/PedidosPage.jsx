// frontend/src/components/gerencial/PedidosPage.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, Calendar as CalendarIcon, Search as SearchIcon, Printer as PrinterIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Switch } from '../ui/switch';
import socket from '../../services/socket.js';

// --- Funções Auxiliares (fora do componente para evitar re-criação) ---
const getStatusBadge = (status) => {
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

const statusColorMap = {
  Pendente: 'bg-yellow-100 text-yellow-800',
  Preparando: 'bg-blue-100 text-blue-800',
  Pronto: 'bg-purple-100 text-purple-800',
  Entregue: 'bg-green-100 text-green-800',
  Cancelado: 'bg-red-100 text-red-800',
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

const PedidosPage = () => {
    const { empresa, loading: empresaLoading, isReady } = useEmpresa();
    const { user, token } = useAuth();

    const [pedidos, setPedidos] = useState([]);
    const [loadingPedidos, setLoadingPedidos] = useState(true);
    const [error, setError] = useState(null);
    const [updatingStatusPedidoId, setUpdatingStatusPedidoId] = useState(null);

    const [filterTipoEntrega, setFilterTipoEntrega] = useState('Delivery'); // Padrão: Delivery
    const [filterDateRange, setFilterDateRange] = useState({ from: undefined, to: undefined });
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedPedido, setSelectedPedido] = useState(null); // Estado para o modal de detalhes

    const statusOptions = ['Pendente', 'Preparando', 'Pronto', 'Entregue', 'Cancelado'];
    const tipoEntregaOptions = ['Mesa', 'Balcao', 'Delivery'];

    // Estado para os filtros de status visíveis (por padrão, todos os status estão ativos)
    const [activeStatuses, setActiveStatuses] = useState(() => {
        const initialStates = {};
        statusOptions.forEach(status => {
            initialStates[status] = true; // Todos os status ativos por padrão
        });
        return initialStates;
    });

    const allowedRoles = useMemo(() => ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'], []);

    // Ref para manter a instância de áudio entre renders
    const deliveryAudioRef = useRef(null);

    // Carrega o áudio uma única vez quando o componente monta
    useEffect(() => {
        deliveryAudioRef.current = new Audio('/sounds/delivery.mp3');
    }, []);

    // Função para tocar o som de notificação de Delivery (respeita configuração da empresa)
    const playDeliverySound = useCallback(() => {
        if (!empresa?.som_notificacao_delivery) return;

        if (!deliveryAudioRef.current) return;

        deliveryAudioRef.current.currentTime = 0; // Garante que comece do início

        deliveryAudioRef.current.play().catch(err => {
            if (err.name === 'NotAllowedError') {
                // O navegador bloqueou o autoplay: pede uma interação do usuário
                const resumeAudio = () => {
                    deliveryAudioRef.current.play().catch(e => console.error('Erro ao tentar reproduzir após interação:', e));
                    document.removeEventListener('click', resumeAudio);
                };
                document.addEventListener('click', resumeAudio);
                toast.info('Clique em qualquer lugar da página para ativar o som de notificação.');
            } else {
                console.error('Erro ao reproduzir som de notificação de delivery:', err);
            }
        });
    }, [empresa]);

    // Função para abrir o modal de detalhes do pedido
    const handleViewDetails = useCallback((pedido) => {
        setSelectedPedido(pedido);
    }, []);

    // Função para gerar o conteúdo do cupom para impressão
    const generatePrintContent = useCallback((pedido) => {
        const headerStyle = `font-family: 'monospace', 'Courier New', monospace; font-size: 10px; line-height: 1.2; width: 80mm; margin: 0 auto;`;
        const itemStyle = `font-family: 'monospace', 'Courier New', monospace; font-size: 10px; line-height: 1.2;`;
        const totalStyle = `font-family: 'monospace', 'Courier New', monospace; font-size: 12px; line-height: 1.2; font-weight: bold;`;
        const hrStyle = `border-top: 1px dashed black; margin: 5px 0;`;
        const pStyle = `margin: 0; padding: 2px 0;`;

        let content = `
            <html>
            <head>
                <title>Cupom do Pedido #${pedido.numero_pedido}</title>
                <style>
                    @page { size: 80mm auto; margin: 0; }
                    body { ${headerStyle} padding: 10px; box-sizing: border-box; }
                    h3, p, table { margin: 0; padding: 0; }
                    hr { ${hrStyle} }
                    .item-row td { ${itemStyle} padding: 2px 0; }
                    .obs-item { font-size: 8px; font-style: italic; padding-left: 10px; }
                    .total { ${totalStyle} text-align: right; }
                </style>
            </head>
            <body>
                <div style="width: 100%;">
                    <h3 style="text-align: center; margin-bottom: 5px;">${empresa.nome_fantasia || 'Nome da Empresa'}</h3>
                    <p style="text-align: center; ${pStyle}">${empresa.endereco || ''}, ${empresa.cidade || ''}</p>
                    <p style="text-align: center; ${pStyle}">Tel: ${empresa.telefone_contato || ''}</p>
                    <hr>
                    
                    <p style="${pStyle}"><strong>PEDIDO: #${pedido.numero_pedido}</strong></p>
                    <p style="${pStyle}"><strong>Data/Hora:</strong> ${formatDateTime(pedido.data_pedido)}</p>
                    <p style="${pStyle}"><strong>Tipo:</strong> ${pedido.tipo_entrega}${pedido.numero_mesa ? ` (Mesa ${pedido.numero_mesa})` : ''}</p>
                    <p style="${pStyle}"><strong>Status:</strong> ${pedido.status}</p>
                    <hr>
        `;

        // Detalhes do Cliente
        content += `
            <p style="${pStyle}"><strong>CLIENTE:</strong> ${pedido.nome_cliente || pedido.nome_cliente_convidado || 'Convidado'}</p>
            ${pedido.telefone_cliente ? `<p style="${pStyle}"><strong>Telefone:</strong> ${pedido.telefone_cliente}</p>` : ''}
        `;

        // Endereço de Entrega (somente para Delivery)
        if (pedido.tipo_entrega === 'Delivery') {
            content += `
                <hr>
                <p style="${pStyle}"><strong>ENDEREÇO DE ENTREGA:</strong></p>
                <p style="${pStyle}">${pedido.endereco_entrega || ''}</p>
                ${pedido.complemento_entrega ? `<p style="${pStyle}">Complemento: ${pedido.complemento_entrega}</p>` : ''}
            `;
        }
        
        if (pedido.observacoes && pedido.observacoes.trim() !== '') {
            content += `
                <hr>
                <p style="${pStyle}"><strong>OBSERVAÇÕES DO PEDIDO:</strong></p>
                <p style="${pStyle}">${pedido.observacoes}</p>
            `;
        }
        content += `<hr>`;

        // Itens do Pedido
        content += `
            <p style="${pStyle}"><strong>ITENS DO PEDIDO:</strong></p>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="text-align: left; ${itemStyle}">Qtd</th>
                        <th style="text-align: left; ${itemStyle}">Item</th>
                        <th style="text-align: right; ${itemStyle}">Vl Unit</th>
                        <th style="text-align: right; ${itemStyle}">Vl Total</th>
                    </tr>
                </thead>
                <tbody>
        `;

        (pedido.itens || []).forEach(item => {
            content += `
                    <tr class="item-row">
                        <td>${item.quantidade}x</td>
                        <td>${item.nome_produto}</td>
                        <td style="text-align: right;">${parseFloat(item.preco_unitario || 0).toFixed(2).replace('.', ',')}</td>
                        <td style="text-align: right;">R$ ${(parseFloat(item.quantidade || 0) * parseFloat(item.preco_unitario || 0)).toFixed(2).replace('.', ',')}</td>
                    </tr>
            `;
            if (item.observacoes && item.observacoes.trim() !== '') {
                content += `
                    <tr>
                        <td colspan="4" class="obs-item">Obs: ${item.observacoes}</td>
                    </tr>
                `;
            }
            // Exibir adicionais do item
            if (item.adicionais && item.adicionais.length > 0) {
                item.adicionais.forEach(adicional => {
                    content += `
                        <tr class="item-row" style="font-size: 8px; color: #0066cc;">
                            <td>${adicional.quantidade}x</td>
                            <td>+ ${adicional.nome}</td>
                            <td style="text-align: right;">${parseFloat(adicional.preco_unitario_adicional || 0).toFixed(2).replace('.', ',')}</td>
                            <td style="text-align: right;">R$ ${(parseFloat(adicional.quantidade || 0) * parseFloat(adicional.preco_unitario_adicional || 0)).toFixed(2).replace('.', ',')}</td>
                        </tr>
                    `;
                });
            }
        });

        content += `
                </tbody>
            </table>
            <hr>
            <p ${pStyle}"><strong>DETALHES DO PAGAMENTO:</strong></p>
            <p class="total">TAXA DE ENTREGA: R$ ${parseFloat(pedido.taxa_entrega || 0).toFixed(2).replace('.', ',')}</p>
            <p class="total">VALOR TOTAL: R$ ${parseFloat(pedido.valor_total || 0).toFixed(2).replace('.', ',')}</p>
            <p class="total">TROCO: R$ ${parseFloat(pedido.troco || 0).toFixed(2).replace('.', ',')}</p>
            <p class="total">FORMA DE PAGAMENTO: ${pedido.formapagamento || 'N/A'}</p>
            <hr>
            <p style="text-align: center; font-size: 8px; margin-top: 10px;">Agrdecemos pela preferência ${pedido.nome_cliente || pedido.nome_cliente_convidado}!</p>
            </div>
            </body>
            </html>
        `;
        return content;
    }, [empresa]);

    // Função para imprimir o cupom
    const handlePrint = useCallback((pedido) => {
        const printContent = generatePrintContent(pedido);
        const printWindow = window.open('', '_blank', 'height=600,width=400');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        } else {
            toast.error("Não foi possível abrir a janela de impressão. Verifique se pop-ups estão bloqueados.");
        }
    }, [generatePrintContent]);

    // Função para buscar pedidos (memoizada para estabilidade no useEffect)
    const fetchPedidosData = useCallback(async (searchQuery = '') => {
        if (!isReady || empresaLoading || !empresa?.slug || !user) {
            setLoadingPedidos(true);
            return;
        }

        if (!allowedRoles.includes(user.role)) {
            setError('Você não tem permissão para visualizar pedidos.');
            setLoadingPedidos(false);
            return;
        }

        setLoadingPedidos(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (filterTipoEntrega !== 'all') {
                queryParams.append('tipo_entrega', filterTipoEntrega);
            }
            if (filterDateRange.from) {
                queryParams.append('data_inicio', format(filterDateRange.from, 'yyyy-MM-dd'));
            }
            if (filterDateRange.to) {
                queryParams.append('data_fim', format(filterDateRange.to, 'yyyy-MM-dd'));
            }
            if (searchQuery) {
                queryParams.append('search', searchQuery);
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
                observacoes: pedido.observacoes || '',
                endereco_entrega: pedido.endereco_entrega || '',
                complemento_entrega: pedido.complemento_entrega || '',
                numero_entrega: pedido.numero_entrega || '',
                bairro_entrega: pedido.bairro_entrega || '',
                cidade_entrega: pedido.cidade_entrega || '',
                estado_entrega: pedido.estado_entrega || '',
                cep_entrega: pedido.cep_entrega || '',
            }));

            const sortedPedidos = processedPedidos.sort((a, b) => {
                const statusOrder = { 'Pendente': 1, 'Preparando': 2, 'Pronto': 3, 'Entregue': 4, 'Cancelado': 5 };
                if (statusOrder[a.status] !== statusOrder[b.status]) {
                    return statusOrder[a.status] - statusOrder[b.status];
                }
                return new Date(a.data_pedido).getTime() - new Date(b.data_pedido).getTime();
            });

            setPedidos(sortedPedidos);
        } catch (err) {
            //setError(err.response?.data?.message || 'Erro ao carregar pedidos.');
            console.error("Erro ao carregar pedidos:", err);
            toast.error(err.response?.data?.message || 'Erro ao carregar pedidos.');
        } finally {
            setLoadingPedidos(false);
        }
    }, [empresa, empresaLoading, isReady, user, token, allowedRoles, filterTipoEntrega, filterDateRange]);

    // Função para buscar com o termo de pesquisa atual
    const handleSearch = useCallback(() => {
        fetchPedidosData(searchTerm);
    }, [fetchPedidosData, searchTerm]);

    // Função para lidar com a tecla Enter no campo de busca
    const handleSearchKeyPress = useCallback((e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    }, [handleSearch]);

    // Efeito para carregar pedidos e integrar Socket.IO
    useEffect(() => {
        if (!empresa?.id || !token) return;

        // Carrega pedidos iniciais sem o termo de busca
        fetchPedidosData();

        if (!socket.connected) {
            socket.connect();
        }

        const handleConnect = () => {
            console.log('Socket.IO: Conectado ao servidor de PedidosPage.');
        };

        const handleDisconnect = () => {
            console.log('Socket.IO: Desconectado do servidor (PedidosPage).');
        };

        const handleNewOrder = (newOrder) => {
            console.log('Socket.IO: Novo pedido recebido:', newOrder);
            toast.info(`Novo pedido recebido: #${newOrder.numero_pedido} (${newOrder.tipo_entrega})`);
            playDeliverySound();
            setPedidos(prevPedidos => {
                if (prevPedidos.some(p => p.id === newOrder.id) ||
                    (filterTipoEntrega !== 'all' && newOrder.tipo_entrega !== filterTipoEntrega)) {
                    return prevPedidos;
                }
                const processedNewOrder = {
                    ...newOrder,
                    itens: (newOrder.itens || []).map(item => ({ ...item, observacoes: item.observacoes || '' })),
                    observacoes: newOrder.observacoes || '',
                    endereco_entrega: newOrder.endereco_entrega || '',
                    complemento_entrega: newOrder.complemento_entrega || '',
                    numero_entrega: newOrder.numero_entrega || '',
                    bairro_entrega: newOrder.bairro_entrega || '',
                    cidade_entrega: newOrder.cidade_entrega || '',
                    estado_entrega: newOrder.estado_entrega || '',
                    cep_entrega: newOrder.cep_entrega || '',
                };

                const updatedList = [...prevPedidos, processedNewOrder];
                return updatedList.sort((a, b) => new Date(a.data_pedido).getTime() - new Date(b.data_pedido).getTime());
            });
        };

        const handleOrderUpdated = (updatedOrder) => {
            console.log('Socket.IO: Pedido atualizado:', updatedOrder);
            toast.info(`Pedido #${updatedOrder.numero_pedido} atualizado para ${updatedOrder.status}!`);
            setPedidos(prevPedidos => {
                const processedUpdatedOrder = {
                    ...updatedOrder,
                    itens: (updatedOrder.itens || []).map(item => ({ ...item, observacoes: item.observacoes || '' })),
                    observacoes: updatedOrder.observacoes || '',
                    endereco_entrega: updatedOrder.endereco_entrega || '',
                    complemento_entrega: updatedOrder.complemento_entrega || '',
                    numero_entrega: updatedOrder.numero_entrega || '',
                    bairro_entrega: updatedOrder.bairro_entrega || '',
                    cidade_entrega: updatedOrder.cidade_entrega || '',
                    estado_entrega: updatedOrder.estado_entrega || '',
                    cep_entrega: updatedOrder.cep_entrega || '',
                };

                const updatedList = prevPedidos.map(p =>
                    p.id === processedUpdatedOrder.id ? processedUpdatedOrder : p
                ).filter(p => {
                    return (filterTipoEntrega === 'all' || p.tipo_entrega === filterTipoEntrega);
                });

                if (!prevPedidos.some(p => p.id === processedUpdatedOrder.id) &&
                    (filterTipoEntrega === 'all' || processedUpdatedOrder.tipo_entrega === filterTipoEntrega)) {
                        updatedList.push(processedUpdatedOrder);
                }

                if (selectedPedido && selectedPedido.id === processedUpdatedOrder.id) {
                    setSelectedPedido(processedUpdatedOrder);
                }
                return updatedList.sort((a, b) => new Date(a.data_pedido).getTime() - new Date(b.data_pedido).getTime());
            });
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('newOrder', handleNewOrder);
        socket.on('orderUpdated', handleOrderUpdated);
        socket.on('orderDeleted', (deletedOrder) => {
            console.log('Socket.IO: Pedido excluído:', deletedOrder);
            toast.warning(`Pedido #${deletedOrder.numero_pedido} foi excluído.`);
            setPedidos(prevPedidos => prevPedidos.filter(p => p.id !== deletedOrder.id));
            if (selectedPedido && selectedPedido.id === deletedOrder.id) {
                setSelectedPedido(null);
            }
        });

        socket.emit('join_company_room', empresa.id);

        return () => {
            if (empresa?.id) {
                socket.emit('leave_company_room', empresa.id);
            }
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('newOrder', handleNewOrder);
            socket.off('orderUpdated', handleOrderUpdated);
            socket.off('orderDeleted');
            console.log('Socket.IO: Componente PedidosPage desmontado, listeners removidos.');
        };
    }, [fetchPedidosData, empresa, selectedPedido, filterTipoEntrega, playDeliverySound, token]);

    // Lógica para mudar o status do pedido via API (PUT)
    const handleChangeStatus = async (pedidoId, newStatus) => {
        setUpdatingStatusPedidoId(pedidoId);
        setError(null);
        try {
            await api.put(`/gerencial/${empresa.slug}/pedidos/${pedidoId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Status do pedido atualizado para "${newStatus}"!`);
        } catch (err) {
            //setError(err.response?.data?.message || 'Erro ao atualizar status do pedido.');
            toast.error(err.response?.data?.message || 'Erro ao atualizar status do pedido.');
            console.error("Erro ao atualizar status:", err);
        } finally {
            setUpdatingStatusPedidoId(null);
        }
    };

    const groupedPedidos = useMemo(() => {
        const groups = {};

        // Filtra por tipo de entrega
        const filteredByDeliveryType = filterTipoEntrega !== 'all'
            ? pedidos.filter(p => p.tipo_entrega === filterTipoEntrega)
            : pedidos;

        // Filtra por status usando activeStatuses
        const filteredByStatus = filteredByDeliveryType.filter(p => activeStatuses[p.status]);

        // Agrupa por status apenas os que estão ativos
        statusOptions.forEach(status => {
            if (activeStatuses[status]) {
                groups[status] = filteredByStatus.filter(pedido => pedido.status === status);
            }
        });

        return groups;
    }, [pedidos, filterTipoEntrega, activeStatuses]);

    if (empresaLoading || loadingPedidos || !isReady) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin mr-2" /> Carregando pedidos...
            </div>
        );
    }

    if (error) {
        return <div className="p-4 text-center text-red-600">{error}</div>;
    }

    return (
        <div className="p-2 sm:p-4 md:p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-800 text-center">Pedidos - {empresa.nome_fantasia}</h1>
            <p className="text-center text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">Gerencie e acompanhe todos os pedidos da empresa.</p>

            {/* Filtros de Status (Switches) */}
            <div className="mb-6 sm:mb-8 p-3 sm:p-4 border rounded-lg bg-gray-50 flex flex-wrap gap-3 sm:gap-4 justify-center">
                {statusOptions.map(status => (
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
            {Object.keys(groupedPedidos).length === 0 && !loadingPedidos ? (
                 <p className="w-full text-center text-gray-600 text-base sm:text-lg p-4">
                    {pedidos.length === 0 ? "Nenhum pedido ativo para exibir." : "Nenhum pedido para exibir com os filtros selecionados."}
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
                                            const isUpdatingThisPedido = updatingStatusPedidoId === pedido.id;
                                            
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
                                                            {getStatusBadge(pedido.status)}
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
                                                            <div><strong>Valor:</strong> R$ {parseFloat(pedido.valor_total).toFixed(2).replace('.', ',')}</div>
                                                            <div><strong>Pagamento:</strong> {pedido.formapagamento || 'N/A'}</div>
                                                            {pedido.troco > 0 && (
                                                                <div><strong>Troco:</strong> R$ {parseFloat(pedido.troco || 0).toFixed(2).replace('.', ',')}</div>
                                                            )}
                                                        </div>
                                                        <div className="mt-2">
                                                            <p className="font-semibold">Itens:</p>
                                                            {(pedido.itens && pedido.itens.length > 0) ? (
                                                                <ul className="list-disc list-inside ml-2 text-gray-700 space-y-1">
                                                                    {pedido.itens.map((item, idx) => ( 
                                                                        <li key={item.id || idx} className="text-xs">
                                                                            <div>
                                                                                {item.quantidade}x {item.nome_produto}
                                                                                {item.observacoes && item.observacoes.trim() !== '' ? <span className="italic text-gray-500"> ({item.observacoes})</span> : ''}
                                                                            </div>
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
                                                        {pedido.tipo_entrega === 'Delivery' && pedido.endereco_entrega && (
                                                            <div className="mt-2 text-gray-700">
                                                                <strong>Endereço:</strong> {pedido.endereco_entrega}
                                                            </div>
                                                        )}
                                                        <div className="mt-2 text-gray-700">
                                                            <strong>Obs. Pedido:</strong> {pedido.observacoes && pedido.observacoes.trim() !== '' ? pedido.observacoes : 'Nenhuma observação'}
                                                        </div>
                                                    </CardContent>
                                                    <CardFooter className="pt-3 sm:pt-4 px-3 sm:px-4 pb-3 flex flex-wrap gap-2 justify-center">
                                                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(pedido)} className="text-xs h-8 px-2">
                                                            Detalhes
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handlePrint(pedido)}
                                                            title="Imprimir Cupom"
                                                            className="text-xs h-8 px-2"
                                                        >
                                                            <PrinterIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                                                        </Button>

                                                        {/* Select para mudança de status no padrão da OrderStatusPage */}
                                                        {
                                                            (['Proprietario', 'Gerente', 'Caixa', 'Funcionario'].includes(user?.role)) && (
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
                                                                        {statusOptions.map(status => (
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
                                                            )
                                                        }
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

            {/* Modal de Detalhes do Pedido */}
            {selectedPedido && (
                <Dialog open={!!selectedPedido} onOpenChange={() => setSelectedPedido(null)}>
                    <DialogContent className="sm:max-w-[425px] md:max-w-[600px] lg:max-w-[700px] max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto">
                        <DialogHeader>
                            <DialogTitle className="text-lg sm:text-xl">Detalhes do Pedido #{selectedPedido.numero_pedido}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-2 sm:space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                <div><strong>Cliente:</strong> {selectedPedido.nome_cliente || selectedPedido.nome_cliente_convidado || 'Convidado'}</div>
                                {selectedPedido.telefone_cliente && <div><strong>Telefone:</strong> {selectedPedido.telefone_cliente}</div>}
                                <div><strong>Tipo de Entrega:</strong> {selectedPedido.tipo_entrega}{selectedPedido.numero_mesa ? ` (Mesa ${selectedPedido.numero_mesa})` : ''}</div>
                                <div><strong>Status:</strong> {selectedPedido.status}</div>
                                <div><strong>Valor Total:</strong> R$ {parseFloat(selectedPedido.valor_total).toFixed(2).replace('.', ',')}</div>
                                <div><strong>Forma de Pagamento:</strong> {selectedPedido.formapagamento || 'N/A'}</div>
                                {selectedPedido.troco > 0 && (
                                    <div><strong>Troco:</strong> R$ {parseFloat(selectedPedido.troco).toFixed(2).replace('.', ',')}</div>
                                )}
                            </div>

                            <p><strong>Criado em:</strong> {formatDateTime(selectedPedido.data_pedido)}</p>

                            {selectedPedido.tipo_entrega === 'Delivery' && (
                                <div className="mt-4 p-3 bg-gray-50 border rounded-md">
                                    <h4 className="font-semibold mb-2 text-sm sm:text-base">Endereço de Entrega:</h4>
                                    <div className="space-y-1 text-xs sm:text-sm">
                                        <p>{selectedPedido.endereco_entrega}</p>
                                        {selectedPedido.complemento_entrega && <p>Complemento: {selectedPedido.complemento_entrega}</p>}
                                        {selectedPedido.numero_entrega && <p>Número: {selectedPedido.numero_entrega}</p>}
                                        {selectedPedido.bairro_entrega && <p>Bairro: {selectedPedido.bairro_entrega}</p>}
                                        {selectedPedido.cidade_entrega && <p>Cidade: {selectedPedido.cidade_entrega}</p>}
                                        {selectedPedido.estado_entrega && <p>Estado: {selectedPedido.estado_entrega}</p>}
                                        {selectedPedido.cep_entrega && <p>CEP: {selectedPedido.cep_entrega}</p>}
                                    </div>
                                </div>
                            )}

                            {selectedPedido.observacoes && selectedPedido.observacoes.trim() !== '' && (
                                <div className="mt-4 p-3 bg-gray-50 border rounded-md">
                                    <h4 className="font-semibold mb-2 text-sm sm:text-base">Observações do Pedido:</h4>
                                    <p className="text-xs sm:text-sm">{selectedPedido.observacoes}</p>
                                </div>
                            )}

                            <div className="mt-4">
                                <h4 className="font-semibold mb-2 text-sm sm:text-base">Itens do Pedido:</h4>
                                <ul className="list-disc pl-5 space-y-1">
                                    {selectedPedido.itens && selectedPedido.itens.length > 0 ? selectedPedido.itens.map(item => (
                                        <li key={item.id} className="text-xs sm:text-sm">
                                            <div>
                                                {item.quantidade}x {item.nome_produto} (R$ {parseFloat(item.preco_unitario).toFixed(2).replace('.', ',')}) - Total: R$ {(parseFloat(item.quantidade) * parseFloat(item.preco_unitario)).toFixed(2).replace('.', ',')}
                                                {item.observacoes && item.observacoes.trim() !== '' && <span className="text-xs italic text-gray-600"> (Obs: {item.observacoes})</span>}
                                            </div>
                                            {/* Exibir adicionais do item */}
                                            {item.adicionais && item.adicionais.length > 0 && (
                                                <div className="ml-4 mt-1">
                                                    {item.adicionais.map((adicional, adicIdx) => (
                                                        <div key={adicIdx} className="text-xs text-blue-600">
                                                            + {adicional.quantidade}x {adicional.nome} (R$ {parseFloat(adicional.preco_unitario_adicional).toFixed(2).replace('.', ',')})
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </li>
                                    )) : <p className="text-xs sm:text-sm">Nenhum item listado para este pedido.</p>}
                                </ul>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
                             <Button variant="outline" onClick={() => handlePrint(selectedPedido)} title="Imprimir Cupom" className="text-xs sm:text-sm h-9 sm:h-10">
                                <PrinterIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Imprimir Cupom
                            </Button>
                            <Button onClick={() => setSelectedPedido(null)} className="text-xs sm:text-sm h-9 sm:h-10">Fechar</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default PedidosPage;