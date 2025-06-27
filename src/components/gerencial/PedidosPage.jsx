// frontend/src/components/gerencial/PedidosPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import io from 'socket.io-client'; // Importar o socket.io-client

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

    const [filterStatus, setFilterStatus] = useState('all');
    const [filterTipoEntrega, setFilterTipoEntrega] = useState('Delivery'); // Padrão: Delivery
    const [filterDateRange, setFilterDateRange] = useState({ from: undefined, to: undefined });
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedPedido, setSelectedPedido] = useState(null); // Estado para o modal de detalhes

    const statusOptions = ['Pendente', 'Preparando', 'Pronto', 'Entregue', 'Cancelado'];
    const tipoEntregaOptions = ['Mesa', 'Balcao', 'Delivery'];

    const allowedRoles = useMemo(() => ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'], []);

    // Função para abrir o modal de detalhes do pedido
    // Definida AQUI para garantir que esteja no escopo correto
    const handleViewDetails = useCallback((pedido) => {
        setSelectedPedido(pedido);
    }, []);

    // Função para gerar o conteúdo do cupom para impressão
    // Definida AQUI para garantir que esteja no escopo correto
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

        (pedido.itens || []).forEach(item => { // Garante que itens é um array
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
    }, [empresa]); // Dependência da empresa para dados do cupom

    // Função para imprimir o cupom
    // Definida AQUI para garantir que esteja no escopo correto
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
    }, [generatePrintContent]); // Dependência de generatePrintContent

    // Função para buscar pedidos (memoizada para estabilidade no useEffect)
    const fetchPedidosData = useCallback(async () => {
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
            if (filterStatus !== 'all') {
                queryParams.append('status', filterStatus);
            }
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
                // Garante que 'itens' é um array e seus 'observacoes' são strings
                itens: (pedido.itens || []).map(item => ({
                    ...item,
                    observacoes: item.observacoes || ''
                })),
                // Garante que 'observacoes' do pedido é uma string
                observacoes: pedido.observacoes || '',
                // Garantir campos de endereço para impressão, se não existirem
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
            setError(err.response?.data?.message || 'Erro ao carregar pedidos.');
            console.error("Erro ao carregar pedidos:", err);
            toast.error(err.response?.data?.message || 'Erro ao carregar pedidos.');
        } finally {
            setLoadingPedidos(false);
        }
    }, [empresa, empresaLoading, isReady, user, token, allowedRoles, filterStatus, filterTipoEntrega, filterDateRange, searchTerm]);

    // Efeito para carregar pedidos e integrar Socket.IO (estrutura replicada da OrderStatusPage)
    useEffect(() => {
        fetchPedidosData(); // Primeira carga dos pedidos

        const socketUrl = import.meta.env.VITE_BACKEND_API_URL;
        // Ajuste a URL para a raiz do Socket.IO se sua API estiver em /api/v1
        const baseUrl = socketUrl.endsWith('/api/v1') ? socketUrl.replace('/api/v1', '') : socketUrl;

        const socket = io(baseUrl); // Conecta ao Socket.IO na URL base

        socket.on('newOrder', (newOrder) => {
    console.log('Socket.IO: Novo pedido recebido:', newOrder);
    toast.info(`Novo pedido recebido: #${newOrder.numero_pedido} (${newOrder.tipo_entrega})`);
    setPedidos(prevPedidos => {
        // Verifica se já existe ou se não corresponde ao filtro de tipo de entrega
        if (prevPedidos.some(p => p.id === newOrder.id) ||
            (filterTipoEntrega !== 'all' && newOrder.tipo_entrega !== filterTipoEntrega)) {
            return prevPedidos;
        }
        // Processa o novo pedido para garantir a consistência dos dados
        const processedNewOrder = {
            ...newOrder,
            itens: (newOrder.itens || []).map(item => ({ ...item, observacoes: item.observacoes || '' })),
            observacoes: newOrder.observacoes || '',
            // Garante campos de endereço (mesmo que vazios) para evitar erros
            endereco_entrega: newOrder.endereco_entrega || '',
            complemento_entrega: newOrder.complemento_entrega || '',
            numero_entrega: newOrder.numero_entrega || '',
            bairro_entrega: newOrder.bairro_entrega || '',
            cidade_entrega: newOrder.cidade_entrega || '',
            estado_entrega: newOrder.estado_entrega || '',
            cep_entrega: newOrder.cep_entrega || '',
        };

        // Adiciona o novo pedido e filtra por status se o filtro de status estiver ativo
        const updatedList = [...prevPedidos, processedNewOrder].filter(p => 
            filterStatus === 'all' || p.status === filterStatus
        );
        
        // Mantenha a ordenação após adicionar o novo pedido
        return updatedList.sort((a, b) => new Date(a.data_pedido).getTime() - new Date(b.data_pedido).getTime());
    });
});

socket.on('orderUpdated', (updatedOrder) => {
    console.log('Socket.IO: Pedido atualizado:', updatedOrder);
    toast.info(`Pedido #${updatedOrder.numero_pedido} atualizado para ${updatedOrder.status}!`);
    setPedidos(prevPedidos => {
        // Processa o pedido atualizado para garantir a consistência dos dados
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
            // Remove da lista se não corresponder mais ao filtro de tipo de entrega E filtro de status
            return (filterTipoEntrega === 'all' || p.tipo_entrega === filterTipoEntrega) &&
                   (filterStatus === 'all' || p.status === filterStatus);
        });

        // Se o pedido atualizado não estava na lista e agora corresponde aos filtros, adicione-o
        if (!prevPedidos.some(p => p.id === processedUpdatedOrder.id) &&
            (filterTipoEntrega === 'all' || processedUpdatedOrder.tipo_entrega === filterTipoEntrega) &&
            (filterStatus === 'all' || processedUpdatedOrder.status === filterStatus)) {
                updatedList.push(processedUpdatedOrder);
        }

        // Atualiza o pedido selecionado no modal, se for o caso
        if (selectedPedido && selectedPedido.id === processedUpdatedOrder.id) {
            setSelectedPedido(processedUpdatedOrder);
        }
        // Mantenha a ordenação após a atualização
        return updatedList.sort((a, b) => new Date(a.data_pedido).getTime() - new Date(b.data_pedido).getTime());
    });
});

        socket.on('orderDeleted', (deletedOrder) => {
            console.log('Socket.IO: Pedido excluído:', deletedOrder);
            toast.warning(`Pedido #${deletedOrder.numero_pedido} foi excluído.`);
            setPedidos(prevPedidos => prevPedidos.filter(p => p.id !== deletedOrder.id));
            if (selectedPedido && selectedPedido.id === deletedOrder.id) {
                setSelectedPedido(null);
            }
        });

        return () => {
            if (empresa?.id) {
                 socket.emit('leaveCompanyRoom', empresa.id); // Nome do evento igual ao backend
            }
            socket.off('connect');
            socket.off('disconnect');
            socket.off('error');
            socket.off('newOrder');
            socket.off('orderUpdated');
            socket.off('orderDeleted');
            socket.disconnect();
            console.log('Socket.IO: Componente PedidosPage desmontado, desconectando.');
        };
    }, [fetchPedidosData, empresa, selectedPedido, filterTipoEntrega]); // Dependências do useEffect

    // Lógica para mudar o status do pedido via API (PUT)
    const handleChangeStatus = async (pedidoId, newStatus) => {
        if (!window.confirm(`Tem certeza que deseja mudar o status do pedido para "${newStatus}"?`)) {
            return;
        }
        setUpdatingStatusPedidoId(pedidoId);
        setError(null);
        try {
            await api.put(`/gerencial/${empresa.slug}/pedidos/${pedidoId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Status do pedido atualizado para "${newStatus}"!`);
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao atualizar status do pedido.');
            toast.error(err.response?.data?.message || 'Erro ao atualizar status do pedido.');
            console.error("Erro ao atualizar status:", err);
        } finally {
            setUpdatingStatusPedidoId(null);
        }
    };

    const groupedPedidos = useMemo(() => {
        const groups = {
            'Pendente': [],
            'Preparando': [],
            'Pronto': [],
            'Entregue': [],
            'Cancelado': []
        };

        const filteredByDeliveryType = filterTipoEntrega !== 'all'
            ? pedidos.filter(p => p.tipo_entrega === filterTipoEntrega)
            : pedidos;

        // Filtra por status também, se selecionado
        const filteredByStatus = filterStatus !== 'all'
            ? filteredByDeliveryType.filter(p => p.status === filterStatus)
            : filteredByDeliveryType;

        filteredByStatus.forEach(pedido => {
            if (groups[pedido.status]) {
                groups[pedido.status].push(pedido);
            }
        });

        // Retorna apenas os grupos que contêm pedidos (para não renderizar colunas vazias desnecessárias)
        return Object.fromEntries(
            Object.entries(groups).filter(([status, list]) => list.length > 0 || status === filterStatus || filterStatus === 'all')
        );
    }, [pedidos, filterTipoEntrega, filterStatus]); // Adicionado filterStatus nas dependências

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
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Pedidos - {empresa.nome_fantasia}</h2>

            {/* Filtros */}
            <div className="mb-6 p-4 border rounded-lg bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <Label htmlFor="filterStatus">Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger id="filterStatus"><SelectValue placeholder="Todos os Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {statusOptions.map(status => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="filterTipoEntrega">Tipo de Entrega</Label>
                    <Select value={filterTipoEntrega} onValueChange={setFilterTipoEntrega}>
                        <SelectTrigger id="filterTipoEntrega"><SelectValue placeholder="Todos os Tipos" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {tipoEntregaOptions.map(tipo => (
                                <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="filterDateRange">Período</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="filterDateRange"
                                variant={"outline"}
                                className={"w-full justify-start text-left font-normal"}
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
                <div className="md:col-span-2">
                    <Label htmlFor="searchTerm">Buscar por Pedido/Cliente</Label>
                    <Input
                        id="searchTerm"
                        placeholder="Número do pedido, nome do cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                    />
                </div>
                <div className="md:col-span-1 flex items-end">
                    <Button onClick={fetchPedidosData} className="w-full">
                        <SearchIcon className="mr-2 h-4 w-4" /> Buscar
                    </Button>
                </div>
            </div>

            {/* Colunas de Pedidos por Status */}
            {Object.keys(groupedPedidos).length === 0 && !loadingPedidos ? (
                 <p className="w-full text-center text-gray-600 text-lg">
                    {pedidos.length === 0 ? "Nenhum pedido ativo para exibir." : "Nenhum pedido para exibir com os filtros selecionados."}
                 </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Object.keys(groupedPedidos).sort((a,b) => statusOptions.indexOf(a) - statusOptions.indexOf(b)).map(statusKey => (
                        <div key={statusKey} className="bg-gray-100 p-4 rounded-lg shadow-sm max-h-[80vh] overflow-y-auto">
                            <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
                                {statusKey} ({groupedPedidos[statusKey].length})
                            </h3>
                            {groupedPedidos[statusKey].length === 0 ? (
                                <p className="text-gray-600 text-sm">Nenhum pedido neste status.</p>
                            ) : (
                                <div className="space-y-4">
                                    {groupedPedidos[statusKey].map(pedido => (
                                        <Card key={pedido.id} className="bg-white border rounded-lg shadow-md">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-lg flex justify-between items-center">
                                                    Pedido #{pedido.numero_pedido}
                                                    {getStatusBadge(pedido.status)}
                                                </CardTitle>
                                                <CardDescription className="text-sm">
                                                    Cliente: **{pedido.nome_cliente || pedido.nome_cliente_convidado || 'Convidado'}**
                                                    <br />
                                                    Tipo: **{pedido.tipo_entrega}** {pedido.numero_mesa ? `(Mesa ${pedido.numero_mesa})` : ''}
                                                    <br />
                                                    Valor: R$ {parseFloat(pedido.valor_total).toFixed(2).replace('.', ',')}
                                                    <br />
                                                    Forma de Pagamento: {pedido.formapagamento || 'N/A'}
                                                    <br />
                                                    {pedido.troco > 0 && (
                                                        <>
                                                            Troco: R$ {parseFloat(pedido.troco || 0).toFixed(2).replace('.', ',')}
                                                            <br />
                                                        </>
                                                        )}

                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="text-sm pt-2">
                                                {pedido.tipo_entrega === 'Delivery' && pedido.endereco_entrega && (
                                                    <p className="font-semibold text-gray-700">Endereço: {pedido.endereco_entrega}</p>
                                                )}
                                                {pedido.observacoes && (
                                                    <p className="text-xs text-gray-600 mt-1">Obs: {pedido.observacoes}</p>
                                                )}
                                                <p className="text-xs text-gray-500 mt-2">Criado em: {formatDateTime(pedido.data_pedido)}</p>
                                            </CardContent>
                                            <CardFooter className="pt-2 flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleViewDetails(pedido)}>Detalhes</Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePrint(pedido)}
                                                    title="Imprimir Cupom"
                                                >
                                                    <PrinterIcon className="h-4 w-4" />
                                                </Button>

                                                {/* Lógica de mudança de status (mantida via Select) */}
                                                {
                                                    (['Proprietario', 'Gerente', 'Caixa', 'Funcionario'].includes(user?.role)) &&
                                                    pedido.status !== 'Entregue' && pedido.status !== 'Cancelado' && (
                                                        <Select
                                                            value={pedido.status}
                                                            onValueChange={(newStatus) => handleChangeStatus(pedido.id, newStatus)}
                                                            disabled={updatingStatusPedidoId === pedido.id}
                                                        >
                                                            <SelectTrigger className="w-[120px] h-8">
                                                                <SelectValue placeholder="Mudar Status" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {statusOptions.filter(s => s !== pedido.status).map(s => (
                                                                    <SelectItem key={s} value={s}>
                                                                        {s} {updatingStatusPedidoId === pedido.id && s === pedido.status ? ' (Atualizando...)' : ''}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )
                                                }
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}


            {/* Modal de Detalhes do Pedido */}
            {selectedPedido && (
                <Dialog open={!!selectedPedido} onOpenChange={() => setSelectedPedido(null)}>
                    <DialogContent className="sm:max-w-[425px] md:max-w-[600px] lg:max-w-[700px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Detalhes do Pedido #{selectedPedido.numero_pedido}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <p><strong>Cliente:</strong> {selectedPedido.nome_cliente || selectedPedido.nome_cliente_convidado || 'Convidado'}</p>
                            {selectedPedido.telefone_cliente && <p><strong>Telefone:</strong> {selectedPedido.telefone_cliente}</p>}
                            <p><strong>Tipo de Entrega:</strong> {selectedPedido.tipo_entrega}{selectedPedido.numero_mesa ? ` (Mesa ${selectedPedido.numero_mesa})` : ''}</p>
                            <p><strong>Status:</strong> {selectedPedido.status}</p>
                            <p><strong>Valor Total:</strong> R$ {parseFloat(selectedPedido.valor_total).toFixed(2).replace('.', ',')}</p>
                            <p><strong>Forma de Pagamento:</strong> {selectedPedido.formapagamento || 'N/A'}</p>
                            {selectedPedido.troco > 0 && (
                                <p><strong>Troco:</strong> R$ {parseFloat(selectedPedido.troco).toFixed(2).replace('.', ',')}</p>
                            )}
                            
                            <p><strong>Criado em:</strong> {formatDateTime(selectedPedido.data_pedido)}</p>

                            {selectedPedido.tipo_entrega === 'Delivery' && (
                                <div className="mt-4 p-3 bg-gray-50 border rounded-md">
                                    <h4 className="font-semibold mb-2">Endereço de Entrega:</h4>
                                    <p>{selectedPedido.endereco_entrega}</p>
                                    {selectedPedido.complemento_entrega && <p>Complemento: {selectedPedido.complemento_entrega}</p>}
                                    {selectedPedido.numero_entrega && <p>Número: {selectedPedido.numero_entrega}</p>}
                                    {selectedPedido.bairro_entrega && <p>Bairro: {selectedPedido.bairro_entrega}</p>}
                                    {selectedPedido.cidade_entrega && <p>Cidade: {selectedPedido.cidade_entrega}</p>}
                                    {selectedPedido.estado_entrega && <p>Estado: {selectedPedido.estado_entrega}</p>}
                                    {selectedPedido.cep_entrega && <p>CEP: {selectedPedido.cep_entrega}</p>}
                                </div>
                            )}

                            {selectedPedido.observacoes && selectedPedido.observacoes.trim() !== '' && (
                                <div className="mt-4 p-3 bg-gray-50 border rounded-md">
                                    <h4 className="font-semibold mb-2">Observações do Pedido:</h4>
                                    <p>{selectedPedido.observacoes}</p>
                                </div>
                            )}

                            <div className="mt-4">
                                <h4 className="font-semibold mb-2">Itens do Pedido:</h4>
                                <ul className="list-disc pl-5 space-y-1">
                                    {selectedPedido.itens && selectedPedido.itens.length > 0 ? selectedPedido.itens.map(item => (
                                        <li key={item.id}>
                                            {item.quantidade}x {item.nome_produto} (R$ {parseFloat(item.preco_unitario).toFixed(2).replace('.', ',')}) - Total: R$ {(parseFloat(item.quantidade) * parseFloat(item.preco_unitario)).toFixed(2).replace('.', ',')}
                                            {item.observacoes && item.observacoes.trim() !== '' && <span className="text-sm italic text-gray-600"> (Obs: {item.observacoes})</span>}
                                        </li>
                                    )) : <p>Nenhum item listado para este pedido.</p>}
                                </ul>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                             <Button variant="outline" onClick={() => handlePrint(selectedPedido)} title="Imprimir Cupom">
                                <PrinterIcon className="mr-2 h-4 w-4" /> Imprimir Cupom
                            </Button>
                            <Button onClick={() => setSelectedPedido(null)}>Fechar</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default PedidosPage;