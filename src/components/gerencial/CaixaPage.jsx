// frontend/src/components/gerencial/CaixaPage.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { Loader2, Printer, CheckCircle, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'; // talvez já usado em outros lugares
import { PlusCircle, MinusCircle, DollarSign, HelpCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import socket from '../../services/socket.js';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';



const CaixaPage = () => {
     const { empresa, loading: empresaLoading } = useEmpresa();
    const { user, token } = useAuth();

    const [pedidos, setPedidos] = useState([]);
    const [loadingPedidos, setLoadingPedidos] = useState(true);
    const [error, setError] = useState(null);

    const [isPedidoDetailModalOpen, setIsPedidoDetailModalOpen] = useState(false);
    const [isItemDetailModalOpen, setIsItemDetailModalOpen] = useState(false);

    const [selectedPedido, setSelectedPedido] = useState(null);

    const [formasPagamento, setFormasPagamento] = useState([]);
    const [valorCobrancaManual, setValorCobrancaManual] = useState('');
    const [valorRecebidoInput, setValorRecebidoInput] = useState('');
    const [selectedFormaPagamentoId, setSelectedFormaPagamentoId] = useState('');
    const [observacoesPagamento, setObservacoesPagamento] = useState('');
    const [dividirContaAtivo, setDividirContaAtivo] = useState(false);
    const [numPessoasDividir, setNumPessoasDividir] = useState('');
    const [loadingFinalizacao, setLoadingFinalizacao] = useState(false);
    
    // Estado para controlar a cobrança de porcentagem do garçom
    const [cobrarPorcentagemGarcom, setCobrarPorcentagemGarcom] = useState(false);

    // FIRST_EDIT: estados para controle de caixa
    const [caixaInfo, setCaixaInfo] = useState(null);
    const [loadingCaixa, setLoadingCaixa] = useState(true);
    const [isAberturaModalOpen, setIsAberturaModalOpen] = useState(false);
    const [isFechamentoModalOpen, setIsFechamentoModalOpen] = useState(false);
    const [isSuprimentoModalOpen, setIsSuprimentoModalOpen] = useState(false);

    const [valorAberturaInput, setValorAberturaInput] = useState('');
    const [valorFechamentoInput, setValorFechamentoInput] = useState('');
    const [observacoesFechamento, setObservacoesFechamento] = useState('');
    const [detalhesFechamento, setDetalhesFechamento] = useState([]);
    const [resumoCaixa, setResumoCaixa] = useState(null);
    const [totalizadoresFP, setTotalizadoresFP] = useState([]);
    const [faturamentoFP, setFaturamentoFP] = useState({ total: 0, formas: [] });

    const [tipoMovimentacao, setTipoMovimentacao] = useState('Suprimento');
    const [valorMovimentacao, setValorMovimentacao] = useState('');
    const [formaPagamentoMovId, setFormaPagamentoMovId] = useState('');
    const [observacoesMovimentacao, setObservacoesMovimentacao] = useState('');

    // Estados para confirmação de impressão de cupons
    const [isPrintAberturaModalOpen, setIsPrintAberturaModalOpen] = useState(false);
    const [aberturaPrintData, setAberturaPrintData] = useState(null);

    const [isPrintFechamentoModalOpen, setIsPrintFechamentoModalOpen] = useState(false);
    const [fechamentoPrintData, setFechamentoPrintData] = useState(null); // {resp, detalhes}

    const [isPrintMovModalOpen, setIsPrintMovModalOpen] = useState(false);
    const [movPrintData, setMovPrintData] = useState(null);

    // Estados para confirmação de troco
    const [isTrocoModalOpen, setIsTrocoModalOpen] = useState(false);
    const [trocoData, setTrocoData] = useState(null);
    const [trocoConfirmado, setTrocoConfirmado] = useState(false);

    // Estados para confirmação de impressão de cupom
    const [isPrintCupomModalOpen, setIsPrintCupomModalOpen] = useState(false);
    const [pedidoParaImprimir, setPedidoParaImprimir] = useState(null);

    const printContentRef = useRef(null);

    const [filterStatus, setFilterStatus] = useState('Pendente,Preparando,Pronto');
    const [filterTipoEntrega, setFilterTipoEntrega] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const debounceTimerRef = useRef(null);

    // Refs para os valores dos filtros para uso no socket sem re-conectar
    const filterStatusRef = useRef(filterStatus);
    const filterTipoEntregaRef = useRef(filterTipoEntrega);
    const debouncedSearchTermRef = useRef(debouncedSearchTerm);
    const filterDateRef = useRef(filterDate);

    // Adicione os estados:
    const [valorPagoUltimaOperacao, setValorPagoUltimaOperacao] = useState(null);
    const [formaPagamentoUltimaOperacao, setFormaPagamentoUltimaOperacao] = useState('');
    const [valorRecebidoAntes, setValorRecebidoAntes] = useState(0);

    // Atualiza os refs dos filtros sempre que o estado correspondente muda
    useEffect(() => { filterStatusRef.current = filterStatus; }, [filterStatus]);
    useEffect(() => { filterTipoEntregaRef.current = filterTipoEntrega; }, [filterTipoEntrega]);
    useEffect(() => { debouncedSearchTermRef.current = debouncedSearchTerm; }, [debouncedSearchTerm]);
    useEffect(() => { filterDateRef.current = filterDate; }, [filterDate]);

    const statusOptions = ['Pendente', 'Preparando', 'Pronto', 'Entregue', 'Cancelado'];
    const tipoEntregaOptions = ['Mesa', 'Balcao', 'Delivery'];

    // Processa os dados do pedido (garante itens e observações)
    const processPedidoData = useCallback((pedido) => {
        if (!pedido) return null;
        return {
            ...pedido,
            itens: (pedido.itens || []).map(item => ({ ...item, observacoes: item.observacoes || '' })),
            observacoes: pedido.observacoes || '',
        };
    }, []);

    // Função auxiliar para aplicar os filtros ATUAIS (do ref) a um pedido
    const isPedidoRelevantToCurrentFilters = useCallback((pedido) => {
        console.log('isPedidoRelevantToCurrentFilters: checking pedido', pedido.numero_pedido);
        console.log('  filterStatusRef.current:', filterStatusRef.current);
        console.log('  filterTipoEntregaRef.current:', filterTipoEntregaRef.current);
        console.log('  debouncedSearchTermRef.current:', debouncedSearchTermRef.current);
        console.log('  filterDateRef.current:', filterDateRef.current);

        const currentFilterStatuses = filterStatusRef.current.split(',');
        const matchesStatus = currentFilterStatuses.includes('all') || currentFilterStatuses.includes(pedido.status);
        const matchesTipoEntrega = filterTipoEntregaRef.current === 'all' || pedido.tipo_entrega === filterTipoEntregaRef.current;
        const matchesSearch = debouncedSearchTermRef.current === '' ||
                              String(pedido.numero_pedido).includes(debouncedSearchTermRef.current) ||
                              (pedido.nome_cliente && pedido.nome_cliente.toLowerCase().includes(debouncedSearchTermRef.current.toLowerCase())) ||
                              (pedido.nome_cliente_convidado && pedido.nome_cliente_convidado.toLowerCase().includes(debouncedSearchTermRef.current.toLowerCase()));

        let matchesDate = true;
        if (filterDateRef.current) {
            try {
                matchesDate = format(parseISO(pedido.data_pedido), 'yyyy-MM-dd') === filterDateRef.current;
            } catch (e) {
                console.error('Erro ao formatar data do pedido para filtro:', pedido.data_pedido, e);
                matchesDate = false;
            }
        }

        const isRelevant = matchesStatus && matchesTipoEntrega && matchesSearch && matchesDate;
        console.log('  isRelevant:', isRelevant);
        return isRelevant;
    }, []); // Dependências vazias pois usa refs, que são estáveis

    // --- SOCKET.IO INTEGRATION ---
    useEffect(() => {
        // Garante que o socket só seja configurado quando a empresa e o token estiverem disponíveis
        if (!empresa?.id || !token) return;

        // Conecta o socket se ainda não estiver conectado
        if (!socket.connected) {
            socket.connect();
        }

        // Emite o evento de junção à sala da empresa
        socket.emit('join_company_room', empresa.id);

        // Configura os listeners
        const handleConnect = () => {
            console.log('Socket.IO: Conectado ao servidor.');
            // Não é necessário emitir 'join_company_room' novamente aqui, já foi feito acima.
        };

        const handleDisconnect = () => {
            console.log('Socket.IO: Desconectado do servidor.');
        };

        const handleNewOrder = (newOrder) => {
            console.log('Socket.IO: Novo pedido recebido:', newOrder);
            setPedidos(prevPedidos => {
                if (prevPedidos.some(p => p.id === newOrder.id)) {
                    console.log(`Socket.IO: Pedido #${newOrder.numero_pedido} já existe na lista, ignorando newOrder.`);
                    return prevPedidos;
                }

                const processedNewOrder = processPedidoData(newOrder);

                if (isPedidoRelevantToCurrentFilters(processedNewOrder)) {
                    const updatedList = [processedNewOrder, ...prevPedidos];
                    const sortedList = updatedList.sort((a, b) => new Date(b.data_pedido).getTime() - new Date(a.data_pedido).getTime());
                    console.log('Socket.IO: Lista de pedidos após newOrder (adicionado):', sortedList.map(p => p.numero_pedido));
                    toast.info(`Novo Pedido: #${newOrder.numero_pedido} (${newOrder.tipo_entrega})`);
                    return sortedList;
                } else {
                    console.log(`Socket.IO: Pedido #${newOrder.numero_pedido} ignorado devido aos filtros atuais.`);
                    return prevPedidos;
                }
            });
        };

        const handleOrderUpdated = (updatedOrder) => {
            console.log('Socket.IO: Pedido atualizado:', updatedOrder);
            setPedidos(prevPedidos => {
                const processed = processPedidoData(updatedOrder);
                const shouldBeInList = isPedidoRelevantToCurrentFilters(processed);
                const existsInList = prevPedidos.some(p => p.id === processed.id);

                let updatedList;
                if (shouldBeInList) {
                    if (existsInList) {
                        updatedList = prevPedidos.map(p => p.id === processed.id ? processed : p);
                        console.log(`Socket.IO: Pedido #${processed.numero_pedido} atualizado na lista.`);
                    } else {
                        updatedList = [processed, ...prevPedidos];
                        console.log(`Socket.IO: Pedido #${processed.numero_pedido} adicionado à lista (agora relevante).`);
                    }
                } else {
                    updatedList = prevPedidos.filter(p => p.id !== processed.id);
                    if (existsInList) {
                        toast.info(`Pedido #${processed.numero_pedido} foi removido da visualização por filtro.`);
                        console.log(`Socket.IO: Pedido #${processed.numero_pedido} removido da lista (não mais relevante).`);
                    } else {
                        console.log(`Socket.IO: Pedido #${processed.numero_pedido} não era relevante e continua fora da lista.`);
                    }
                }

                const sortedList = updatedList.sort((a,b) => new Date(b.data_pedido).getTime() - new Date(a.data_pedido).getTime());
                console.log('Socket.IO: Lista de pedidos após orderUpdated:', sortedList.map(p => p.numero_pedido));
                toast.info(`Pedido #${updatedOrder.numero_pedido || updatedOrder.id} atualizado para ${updatedOrder.status || 'novo status'}.`);
                return sortedList;
            });

            if (selectedPedido && selectedPedido.id === updatedOrder.id) {
                setSelectedPedido(processPedidoData(updatedOrder));
            }
        };

        const handleOrderFinalized = (finalizedOrder) => {
            console.log('Socket.IO: Pedido finalizado:', finalizedOrder);
            setPedidos(prevPedidos => {
                const filteredList = prevPedidos.filter(p => p.id !== finalizedOrder.id);
                console.log('Socket.IO: Lista de pedidos após orderFinalized:', filteredList.map(p => p.numero_pedido));
                toast.success(`Pedido #${finalizedOrder.numero_pedido || finalizedOrder.id} foi finalizado!`);
                return filteredList;
            });
            if (selectedPedido && selectedPedido.id === finalizedOrder.id) {
                closePedidoDetailModal();
                closeItemDetailModal();
            }
        };

        const handleOrderDeleted = (deletedOrder) => {
            console.log('Socket.IO: Pedido excluído:', deletedOrder);
            setPedidos(prevPedidos => {
                const filteredList = prevPedidos.filter(p => p.id !== deletedOrder.id);
                console.log('Socket.IO: Lista de pedidos após orderDeleted:', filteredList.map(p => p.numero_pedido));
                toast.warning(`Pedido #${deletedOrder.numero_pedido || deletedOrder.id} foi excluído.`);
                return filteredList;
            });
            if (selectedPedido && selectedPedido.id === deletedOrder.id) {
                closePedidoDetailModal();
                closeItemDetailModal();
            }
        };

        const handleMesaUpdated = (updatedMesa) => {
            console.log('Socket.IO: Mesa atualizada:', updatedMesa);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('newOrder', handleNewOrder);
        socket.on('orderUpdated', handleOrderUpdated);
        socket.on('orderFinalized', handleOrderFinalized);
        socket.on('orderDeleted', handleOrderDeleted);
        socket.on('mesaUpdated', handleMesaUpdated);

        // Função de limpeza
        return () => {
            if (!empresa?.id || !token) return;
            console.log('Socket.IO: Componente CaixaPage desmontado ou dependências alteradas, desconectando.');
            socket.emit('leave_company_room', empresa.id);
            // Remove os listeners específicos para evitar vazamento de memória
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('newOrder', handleNewOrder);
            socket.off('orderUpdated', handleOrderUpdated);
            socket.off('orderFinalized', handleOrderFinalized);
            socket.off('orderDeleted', handleOrderDeleted);
            socket.off('mesaUpdated', handleMesaUpdated);
            // Se você quiser que o socket se desconecte quando este componente for desmontado
            // e não houver outros componentes usando-o, descomente a linha abaixo.
            // socket.disconnect();
        };
    }, [empresa?.id, token]); // Dependências simplificadas


    const fetchPedidos = async () => {
        if (empresaLoading || !empresa || !empresa.slug || !user || !token) {
            setLoadingPedidos(true);
            return;
        }

        const canViewCaixa = user?.role && ['Proprietario', 'Caixa', 'Gerente'].includes(user.role);
        if (!canViewCaixa) {
            setError('Você não tem permissão para acessar o painel do Caixa.');
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
            // Usa o termo de busca "debounced" para a requisição API
            if (debouncedSearchTerm) {
                queryParams.append('search', debouncedSearchTerm);
            }
            // Adiciona o filtro de data como data_inicio e data_fim para cobrir o dia todo
            if (filterDate) {
                queryParams.append('data_inicio', filterDate);
                queryParams.append('data_fim', filterDate);
            }

            const response = await api.get(`/gerencial/${empresa.slug}/pedidos?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Processa os pedidos carregados inicialmente para garantir a consistência
            const processedInitialPedidos = (response.data || []).map(processPedidoData);
            // Ordena os pedidos: mais recente para o mais antigo
            processedInitialPedidos.sort((a,b) => new Date(b.data_pedido).getTime() - new Date(a.data_pedido).getTime());
            setPedidos(processedInitialPedidos);
            console.log("Pedidos carregados via fetch:", processedInitialPedidos.map(p => p.numero_pedido));
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao carregar pedidos para o Caixa.');
            console.error("Erro ao carregar pedidos:", err);
            toast.error(err.response?.data?.message || 'Erro ao carregar pedidos para o Caixa.');
        } finally {
            setLoadingPedidos(false);
        }
    };

    const fetchFormasPagamento = async () => {
        if (empresaLoading || !empresa || !empresa.slug || !token) return;
        try {
            const response = await api.get(`/gerencial/${empresa.slug}/formas-pagamento`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormasPagamento(response.data.filter(fp => fp.ativo));
            if (response.data.length > 0) {
                setSelectedFormaPagamentoId(response.data[0].id.toString());
            }
        } catch (err) {
            toast.error("Erro ao carregar formas de pagamento.");
            console.error("Erro ao carregar formas de pagamento:", err);
        }
    };


    useEffect(() => {
        // fetchPedidos agora depende de debouncedSearchTerm e filterDate
        fetchPedidos();
        fetchFormasPagamento();
    }, [empresa, empresaLoading, user, filterStatus, filterTipoEntrega, debouncedSearchTerm, filterDate]);


    // Efeito para debounce do termo de busca
    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500); // 500ms de atraso após a última digitação

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [searchTerm]);


    // Funções para o modal de detalhes dos itens
    const openItemDetailModal = (pedido) => {
        setSelectedPedido(pedido); // Define o pedido para o modal de itens
        setIsItemDetailModalOpen(true);
    };

    const closeItemDetailModal = () => {
        setIsItemDetailModalOpen(false);
    };


    // Funções para o modal de finalização de pedido
    const openPedidoDetailModal = async (pedidoId) => {
        setLoadingFinalizacao(true);
        try {
            const response = await api.get(`/gerencial/${empresa.slug}/pedidos/${pedidoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const pedidoCompleto = response.data;
            // Processa o pedido para garantir a consistência dos dados (itens/observações)
            const processedPedidoCompleto = processPedidoData(pedidoCompleto);
            setSelectedPedido(processedPedidoCompleto); // Define o pedido para o modal de finalização

            // Calcula o valor total do pedido incluindo taxa de entrega
            let totalGeral = parseFloat(processedPedidoCompleto.valor_total || 0);
            if (processedPedidoCompleto.tipo_entrega === 'Delivery' && empresa?.taxa_entrega) {
                totalGeral += parseFloat(empresa.taxa_entrega);
            }

            // Preenche o valor a ser cobrado manualmente com o restante a pagar
            const valorJaRecebido = parseFloat(processedPedidoCompleto.valor_recebido_parcial || 0);
            const restanteParaPagarInicial = Math.max(0, totalGeral - valorJaRecebido);

            setValorCobrancaManual(restanteParaPagarInicial.toFixed(2));
            // Não preenche automaticamente o valor recebido, deixa o usuário digitar
            setValorRecebidoInput(''); 

            setDividirContaAtivo(false);
            setNumPessoasDividir('');
            setObservacoesPagamento('');
            setSelectedFormaPagamentoId(formasPagamento.length > 0 ? formasPagamento[0].id.toString() : '');
            setCobrarPorcentagemGarcom(false); // Reset da cobrança de porcentagem do garçom


            setIsPedidoDetailModalOpen(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao carregar detalhes do pedido.');
            console.error("Erro ao carregar detalhes do pedido:", err);
        } finally {
            setLoadingFinalizacao(false);
        }
    };

    const closePedidoDetailModal = () => {
        setIsPedidoDetailModalOpen(false);
        setSelectedPedido(null); // Limpa o pedido ao fechar este modal
        setValorRecebidoInput('');
        setValorCobrancaManual('');
        setSelectedFormaPagamentoId(formasPagamento.length > 0 ? formasPagamento[0].id.toString() : '');
        setObservacoesPagamento('');
        setDividirContaAtivo(false);
        setNumPessoasDividir('');
        setCobrarPorcentagemGarcom(false); // Reset da cobrança de porcentagem do garçom
    };

    // FUNÇÃO QUE ATUALIZA O STATUS DO PEDIDO (APENAS CANCELAR A PARTIR daqui)
    const updatePedidoStatus = async (pedidoId, newStatus) => {
        setLoadingFinalizacao(true);
        try {
            await api.patch(`/gerencial/${empresa.slug}/pedidos/${pedidoId}`, {
                status: newStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(`Pedido ${newStatus === 'Cancelado' ? 'cancelado' : 'status atualizado'} com sucesso!`);
            // A atualização da lista virá via Socket.IO
        } catch (err) {
            toast.error(err.response?.data?.message || `Erro ao ${newStatus === 'Cancelado' ? 'cancelar' : 'atualizar status'} pedido.`);
            console.error(`Erro ao atualizar status:`, err);
        } finally {
            setLoadingFinalizacao(false);
        }
    };


    // VALOR TOTAL DO PEDIDO (COM TAXA DE ENTREGA E PORCENTAGEM DO GARÇOM)
    const totalGeralPedidoOriginal = useMemo(() => {
        if (!selectedPedido) return 0;
        let total = parseFloat(selectedPedido.valor_total || 0);
        
        // Adiciona taxa de entrega para delivery
        if (selectedPedido.tipo_entrega === 'Delivery' && empresa?.taxa_entrega) {
            total += parseFloat(empresa.taxa_entrega);
        }
        
        // Adiciona 10% do garçom se habilitado e for pedido de mesa
        if (cobrarPorcentagemGarcom && selectedPedido.tipo_entrega === 'Mesa' && empresa?.porcentagem_garcom) {
            const valorOriginal = parseFloat(selectedPedido.valor_total || 0);
            total += valorOriginal * 0.10; // 10% do valor original do pedido
        }
        
        return total;
    }, [selectedPedido, empresa?.taxa_entrega, empresa?.porcentagem_garcom, cobrarPorcentagemGarcom]);

    // VALOR QUE AINDA FALTA PAGAR (DO TOTAL GERAL DO PEDIDO)
    const valorRestanteTotalDoPedido = useMemo(() => {
        if (!selectedPedido) return 0;
        if (selectedPedido.status === 'Entregue') return 0; 
        return Math.max(0, totalGeralPedidoOriginal - parseFloat(selectedPedido.valor_recebido_parcial || 0));
    }, [selectedPedido, totalGeralPedidoOriginal]);

    // VALOR BASE PARA CÁLCULO (O QUE O CAIXA DESEJA COBRAR)
    const valorBaseParaCalculo = useMemo(() => {
        const val = parseFloat(valorCobrancaManual) || 0;
        if (val === 0 || val > valorRestanteTotalDoPedido) {
            return valorRestanteTotalDoPedido;
        }
        return val;
    }, [valorCobrancaManual, valorRestanteTotalDoPedido]);


    // VALOR A COBRAR COM DESCONTO (APLICADO PELA FORMA DE PAGAMENTO)
    const valorComDesconto = useMemo(() => {
        let valor = valorBaseParaCalculo;
        const formaPagamento = formasPagamento.find(fp => fp.id.toString() === selectedFormaPagamentoId);

        if (formaPagamento && formaPagamento.porcentagem_desconto_geral > 0) {
            valor *= (1 - (parseFloat(formaPagamento.porcentagem_desconto_geral) / 100));
        }
        return valor;
    }, [valorBaseParaCalculo, selectedFormaPagamentoId, formasPagamento]);

    // ATUALIZAÇÃO DO VALOR RECEBIDO INPUT COM DESCONTO (AO MUDAR FORMA DE PAGAMENTO/VALOR A COBRAR)
    useEffect(() => {
        const formaPagamento = formasPagamento.find(fp => fp.id.toString() === selectedFormaPagamentoId);
        if (formaPagamento && formaPagamento.descricao.toLowerCase() !== 'dinheiro') {
            setValorRecebidoInput(valorComDesconto.toFixed(2));
        } else {
            // Para dinheiro, só preenche automaticamente se o campo estiver vazio
            if (valorRecebidoInput === '' || parseFloat(valorRecebidoInput) === 0) {
                setValorRecebidoInput(valorComDesconto.toFixed(2));
            }
            // Se o usuário já digitou um valor, mantém o valor digitado
        }
    }, [valorComDesconto, selectedFormaPagamentoId, formasPagamento]);

    // ATUALIZAÇÃO DO VALOR A COBRAR QUANDO O PEDIDO É ATUALIZADO OU COBRANÇA DE GARÇOM MUDAR
    useEffect(() => {
        if (selectedPedido) {
            // Calcula o valor total do pedido incluindo taxa de entrega e porcentagem do garçom
            let totalGeral = parseFloat(selectedPedido.valor_total || 0);
            
            // Adiciona taxa de entrega para delivery
            if (selectedPedido.tipo_entrega === 'Delivery' && empresa?.taxa_entrega) {
                totalGeral += parseFloat(empresa.taxa_entrega);
            }
            
            // Adiciona 10% do garçom se habilitado e for pedido de mesa
            if (cobrarPorcentagemGarcom && selectedPedido.tipo_entrega === 'Mesa' && empresa?.porcentagem_garcom) {
                const valorOriginal = parseFloat(selectedPedido.valor_total || 0);
                totalGeral += valorOriginal * 0.10; // 10% do valor original do pedido
            }

            // Calcula o valor restante a pagar
            const valorJaRecebido = parseFloat(selectedPedido.valor_recebido_parcial || 0);
            const restanteParaPagar = Math.max(0, totalGeral - valorJaRecebido);

            // Atualiza o valor a cobrar se estiver vazio, for zero, ou se o valor atual for maior que o restante
            const valorAtual = parseFloat(valorCobrancaManual) || 0;
            if (valorCobrancaManual === '' || valorCobrancaManual === '0.00' || valorAtual > restanteParaPagar) {
                setValorCobrancaManual(restanteParaPagar.toFixed(2));
            }
        }
    }, [selectedPedido, empresa?.taxa_entrega, empresa?.porcentagem_garcom, cobrarPorcentagemGarcom, valorCobrancaManual]);

    // ATUALIZAÇÃO ESPECÍFICA DO VALOR A COBRAR QUANDO A COBRANÇA DE GARÇOM MUDAR
    useEffect(() => {
        if (selectedPedido && selectedPedido.tipo_entrega === 'Mesa') {
            // Calcula o valor total incluindo a porcentagem do garçom se habilitada
            let totalGeral = parseFloat(selectedPedido.valor_total || 0);
            
            if (cobrarPorcentagemGarcom && empresa?.porcentagem_garcom) {
                totalGeral += totalGeral * 0.10; // 10% do valor original
            }
            
            // Calcula o valor restante a pagar
            const valorJaRecebido = parseFloat(selectedPedido.valor_recebido_parcial || 0);
            const restanteParaPagar = Math.max(0, totalGeral - valorJaRecebido);
            
            // Atualiza o valor a cobrar
            setValorCobrancaManual(restanteParaPagar.toFixed(2));
        }
    }, [cobrarPorcentagemGarcom, selectedPedido, empresa?.porcentagem_garcom]);


    // VALOR A PAGAR NESTA OPERAÇÃO (COM DIVISÃO DE CONTA APLICADA)
    const valorAPagarNestaParcelaFinal = useMemo(() => {
        let valor = valorComDesconto;
        if (dividirContaAtivo && numPessoasDividir && parseInt(numPessoasDividir) > 1) {
            valor = valor / parseInt(numPessoasDividir);
        }
        return valor;
    }, [valorComDesconto, dividirContaAtivo, numPessoasDividir]);


    // CÁLCULO DO TROCO
    const troco = useMemo(() => {
        const valorRecebido = parseFloat(valorRecebidoInput) || 0;
        return Math.max(0, valorRecebido - valorAPagarNestaParcelaFinal);
    }, [valorRecebidoInput, valorAPagarNestaParcelaFinal]);


    // Lógica para finalizar o pagamento
    const handleFinalizarPagamento = async () => {
        console.log("-----------------------------------------");
        console.log("Iniciando handleFinalizarPagamento...");
        console.log("selectedPedido:", selectedPedido);
        console.log("selectedFormaPagamentoId:", selectedFormaPagamentoId);
        console.log("valorCobrancaManual (raw):", valorCobrancaManual);
        console.log("valorRecebidoInput (raw):", valorRecebidoInput);
        console.log("valorComDesconto (calculado):", valorComDesconto);
        console.log("valorAPagarNestaParcelaFinal (calculado):", valorAPagarNestaParcelaFinal);
        console.log("troco (calculado):", troco);

        if (!selectedPedido) {
            toast.error('Nenhum pedido selecionado para finalizar.');
            console.log("Validação falhou: Nenhum pedido selecionado.");
            return;
        }
        if (!selectedFormaPagamentoId) {
            toast.error('Selecione uma forma de pagamento.');
            console.log("Validação falhou: Nenhuma forma de pagamento selecionada.");
            return;
        }

        const valorRecebido = parseFloat(valorRecebidoInput);
        console.log("valorRecebido (parsed):", valorRecebido);
        console.log("isNaN(valorRecebido):", isNaN(valorRecebido)); // Verifica se é NaN

        // A validação de valorRecebido <= 0 agora inclui um check para NaN
        if (isNaN(valorRecebido) || valorRecebido <= 0) {
            toast.error('Informe um valor recebido válido e maior que zero.');
            console.log("Validação falhou: Valor recebido inválido ou <= 0.");
            return;
        }

        // --- VALIDAÇÃO PARA RECEBIMENTO PARCIAL E TROCO ---
        // Para recebimento, o valor recebido deve ser:
        // 1. Maior que zero
        // 2. Pode ser maior que o valor restante (para troco)
        const formattedValorRecebido = parseFloat(valorRecebido.toFixed(2));
        const formattedValorRestanteTotal = parseFloat(valorRestanteTotalDoPedido.toFixed(2));

        console.log("Comparando formatado - Valor Recebido:", formattedValorRecebido);
        console.log("Comparando formatado - Valor Restante Total:", formattedValorRestanteTotal);

        // Validação: valor recebido deve ser maior que zero
        if (formattedValorRecebido <= 0) {
            toast.error('O valor recebido deve ser maior que zero.');
            console.log("Validação falhou: Valor recebido menor ou igual a zero.");
            return;
        }
        console.log("Todas as validações iniciais passaram.");

        // Verifica se há troco
        const valorTroco = Math.max(0, formattedValorRecebido - formattedValorRestanteTotal);
        
        if (valorTroco > 0) {
            // Se há troco, abre o modal de confirmação
            setTrocoData({
                valorRecebido: formattedValorRecebido,
                valorConta: formattedValorRestanteTotal,
                valorTroco: valorTroco,
                pedidoId: selectedPedido.id,
                formaPagamentoId: selectedFormaPagamentoId,
                dividirConta: dividirContaAtivo ? parseInt(numPessoasDividir) || 1 : null,
                observacoes: observacoesPagamento
            });
            setIsTrocoModalOpen(true);
            setLoadingFinalizacao(false);
            return;
        }

        // Se não há troco, finaliza diretamente
        await finalizarPagamentoCompleto(valorRecebido, selectedFormaPagamentoId, dividirContaAtivo ? parseInt(numPessoasDividir) || 1 : null, observacoesPagamento);
        setValorRecebidoAntes(selectedPedido.valor_recebido_parcial || 0);
    };

    // Função para finalizar o pagamento (usada tanto para pagamentos sem troco quanto após confirmação do troco)
    const finalizarPagamentoCompleto = async (valorRecebido, formaPagamentoId, dividirConta, observacoes) => {
        setLoadingFinalizacao(true);
        try {
            // Realiza a chamada API para finalizar o pagamento
            const response = await api.post(`/gerencial/${empresa.slug}/pedidos/${selectedPedido.id}/finalizar`, {
                valor_pago: valorRecebido,
                forma_pagamento_id: parseInt(formaPagamentoId),
                itens_cobrados_ids: selectedPedido.itens.map(item => item.id),
                dividir_conta_qtd_pessoas: dividirConta,
                observacoes_pagamento: observacoes,
                cobrar_porcentagem_garcom: cobrarPorcentagemGarcom // Inclui informação sobre cobrança de garçom
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const mensagemBase = `Pagamento de R$ ${valorRecebido.toFixed(2).replace('.', ',')} registrado para o Pedido #${selectedPedido.numero_pedido}!`;
            const mensagemGarcom = cobrarPorcentagemGarcom ? ' (Incluindo 10% do garçom)' : '';
            toast.success(mensagemBase + mensagemGarcom);
            
            // Re-busca o pedido atualizado para garantir que todos os dados (incluindo pagamentos) estejam presentes
            const updatedPedidoData = await api.get(`/gerencial/${empresa.slug}/pedidos/${selectedPedido.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const pedidoAtualizado = processPedidoData(updatedPedidoData.data);
            setSelectedPedido(pedidoAtualizado);

            // Salva o valor pago e a forma de pagamento da operação
            setValorPagoUltimaOperacao(valorRecebido);
            const forma = formasPagamento.find(fp => fp.id.toString() === formaPagamentoId?.toString());
            setFormaPagamentoUltimaOperacao(forma ? forma.descricao : '');

            // Calcula o novo valor restante a pagar após o pagamento
            let novoTotalGeral = parseFloat(pedidoAtualizado.valor_total || 0);
            
            // Adiciona taxa de entrega para delivery
            if (pedidoAtualizado.tipo_entrega === 'Delivery' && empresa?.taxa_entrega) {
                novoTotalGeral += parseFloat(empresa.taxa_entrega);
            }
            
            // Adiciona 10% do garçom se ainda estiver habilitado e for pedido de mesa
            if (cobrarPorcentagemGarcom && pedidoAtualizado.tipo_entrega === 'Mesa' && empresa?.porcentagem_garcom) {
                const valorOriginal = parseFloat(pedidoAtualizado.valor_total || 0);
                novoTotalGeral += valorOriginal * 0.10; // 10% do valor original do pedido
            }
            
            const novoValorRestante = Math.max(0, novoTotalGeral - parseFloat(pedidoAtualizado.valor_recebido_parcial || 0));

            // Limpa os campos do formulário para o próximo pagamento
            setValorRecebidoInput('');
            setValorCobrancaManual(novoValorRestante.toFixed(2));
            setObservacoesPagamento('');
            setDividirContaAtivo(false);
            setNumPessoasDividir('');
            
            // Abre o modal de confirmação de impressão
            setPedidoParaImprimir(pedidoAtualizado);
            setIsPrintCupomModalOpen(true);
            
            // A atualização da lista de pedidos na tela principal virá via Socket.IO (orderUpdated / orderFinalized)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao finalizar pagamento.');
            console.error("Erro ao finalizar pagamento:", err);
        } finally {
            setLoadingFinalizacao(false);
            console.log("Finalizando handleFinalizarPagamento.");
            console.log("-----------------------------------------");
        }
    };

    // Lógica para imprimir cupom
    const handlePrintCupom = useCallback((pedidoToPrint, valorPagoUltimaOperacao = 0) => { // Tornar useCallback para evitar re-criação
        if (!pedidoToPrint || !empresa) {
            toast.error("Nenhum pedido ou dados da empresa disponíveis para impressão.");
            return;
        }

        // Abrir janela de impressão com largura inicial próxima de 80mm
        // Note: 'width' e 'height' aqui são sugestões. O controle final é do navegador/SO.
        const printWindow = window.open('', '_blank', 'width=300,height=600'); 
        if (!printWindow) {
            toast.error("Não foi possível abrir a janela de impressão. Verifique pop-ups.");
            return;
        }

        // Calcula o total geral do pedido (itens + taxa de entrega)
        const totalBaseItensETaxa = parseFloat(pedidoToPrint.valor_total || 0) +
                                     (pedidoToPrint.tipo_entrega === 'Delivery' ? parseFloat(empresa?.taxa_entrega || 0) : 0);
        
        // Pega a última forma de pagamento do array de pagamentos recebidos
        const lastPayment = (pedidoToPrint.pagamentos_recebidos && pedidoToPrint.pagamentos_recebidos.length > 0)
            ? pedidoToPrint.pagamentos_recebidos[pedidoToPrint.pagamentos_recebidos.length - 1]
            : null;
        
        let descontoAplicadoNoCupom = null;
        let valorTotalComDescontoNoCupom = totalBaseItensETaxa; // Inicializa com o total sem desconto

        if (lastPayment) {
            // Encontra a forma de pagamento real com base na descrição (nome) da forma do último pagamento
            const formaPagamentoDetalhe = formasPagamento.find(fp => fp.descricao === lastPayment.forma_pagamento_descricao);
            
            if (formaPagamentoDetalhe && formaPagamentoDetalhe.porcentagem_desconto_geral > 0) {
                // Calcula o valor do desconto sobre o total base (itens + taxa)
                const percentualDesconto = parseFloat(formaPagamentoDetalhe.porcentagem_desconto_geral) / 100;
                descontoAplicadoNoCupom = (totalBaseItensETaxa * percentualDesconto).toFixed(2);
                valorTotalComDescontoNoCupom = (totalBaseItensETaxa * (1 - percentualDesconto));
            }
        }
        
        // Arredonda o valor total final (já com desconto, se aplicável)
        const totalGeralParaExibirNoCupom = valorTotalComDescontoNoCupom.toFixed(2);

        // Recalcula o "Falta Pagar" usando o valorTotalComDescontoNoCupom
        const valorRestanteAPagarCupom = Math.max(0, parseFloat(totalGeralParaExibirNoCupom) - parseFloat(pedidoToPrint.valor_recebido_parcial || 0));

        // Dentro da função handlePrintCupom, antes de gerar o cupomContent:
        // Calcule o valor recebido considerando o valorPagoUltimaOperacao
        let valorRecebidoCupom = parseFloat(pedidoToPrint.valor_recebido_parcial || 0);
        if (valorRecebidoCupom === parseFloat(valorRecebidoAntes)) {
            valorRecebidoCupom += parseFloat(valorPagoUltimaOperacao || 0);
        }
        const totalPedidoCupom = parseFloat(totalGeralParaExibirNoCupom);
        let faltaPagarCupom = Math.max(0, totalPedidoCupom - valorRecebidoCupom);
        if (valorRecebidoCupom >= totalPedidoCupom) {
            valorRecebidoCupom = totalPedidoCupom;
            faltaPagarCupom = 0;
        }

        const cupomContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cupom Pedido #${pedidoToPrint.numero_pedido}</title>
                <style>
                    /* Tamanho da fonte geral para 10px para 80mm, ajustável conforme teste */
                    body { font-family: 'Courier New', monospace; font-size: 10px; margin: 0; padding: 10px; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .container { width: 80mm; max-width: 80mm; margin: 0 auto; padding: 0; }
                    .header, .footer { text-align: center; margin-bottom: 10px; }
                    .header h2 { margin: 0; font-size: 12px; color: #000; } /* Ajustado h2 */
                    .header p { margin: 1px 0; font-size: 8px; color: #000; } /* Ajustado p do header */
                    .section-title { font-weight: bold; margin-top: 10px; margin-bottom: 5px; border-bottom: 1px dashed #000; padding-bottom: 3px; color: #000; }
                    .item { display: flex; justify-content: space-between; margin-bottom: 2px; }
                    .item-name { flex-grow: 1; text-align: left; }
                    .item-qty { width: 25px; text-align: center; }
                    .item-price { display: inline-block; width: 45px; text-align: right; white-space: nowrap; padding-left: 2px; }
                    .item-total { display: inline-block; width: 50px; text-align: right; white-space: nowrap; }
                    .total-row { display: flex; justify-content: space-between; margin-top: 8px; padding-top: 4px; border-top: 1px dashed #000; font-size: 11px; font-weight: bold; color: #000; } /* Ajustado font-size */
                    .footer-message { font-size: 8px; margin-top: 10px; color: #000; } /* Ajustado font-size */
                    
                    /* Forçar preto e branco */
                    * { color: #000 !important; background-color: #FFF !important; }
                    hr { border-color: #000 !important; }
                    .total-row { border-color: #000 !important; }
                    .section-title { border-color: #000 !important; }
                    img { filter: grayscale(100%) brightness(0%); } /* Tenta deixar logo preto e branco */

                    @media print {
                        body { print-color-adjust: exact; -webkit-print-adjust: exact; }
                        .container { width: 80mm; margin: 0; padding: 0; }
                        button { display: none; }
                        /* Sugestão para impressora térmica: */
                        @page {
                            size: 80mm auto; /* Define a largura para 80mm e altura automática */
                            margin: 0; /* Remove margens padrão da página */
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        ${empresa.logo_full_url ? `<img src="${empresa.logo_full_url}" alt="Logo" style="max-width: 60px; margin-bottom: 5px;">` : ''}
                        <h2>${empresa.nome_fantasia || 'Seu Restaurante'}</h2>
                        <p>${empresa.razao_social || ''}</p>
                        <p>CNPJ: ${empresa.cnpj || 'Não informado'}</p>
                        <p>${pedidoToPrint.tipo_entrega === 'Delivery' && pedidoToPrint.endereco_entrega ? `Endereço: ${pedidoToPrint.endereco_entrega}, ${pedidoToPrint.numero_entrega || ''} - ${pedidoToPrint.bairro_entrega || ''}, ${pedidoToPrint.cidade_entrega || ''} - ${pedidoToPrint.estado_entrega || ''} ${pedidoToPrint.cep_entrega || ''}` : empresa.endereco || ''}</p>
                        <p>Tel: ${empresa.telefone_contato || ''}</p>
                        <p>Email: ${empresa.email_contato || ''}</p>
                        <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;">
                    </div>

                    <div class="section-title">DETALHES DO PEDIDO</div>
                    <p><strong>Pedido #:</strong> ${pedidoToPrint.numero_pedido}</p>
                    <p><strong>Data:</strong> ${formatDateTime(pedidoToPrint.data_pedido)}</p>
                    <p><strong>Cliente:</strong> ${pedidoToPrint.nome_cliente || pedidoToPrint.nome_cliente_convidado || 'Convidado'}</p>
                    ${pedidoToPrint.tipo_entrega === 'Mesa' ? `<p><strong>Mesa:</strong> ${pedidoToPrint.numero_mesa || 'N/A'}</p>` : ''}
                    ${pedidoToPrint.tipo_entrega === 'Delivery' && pedidoToPrint.endereco_entrega ? `
                        <p><strong>Endereço de Entrega:</strong> ${pedidoToPrint.endereco_entrega}, ${pedidoToPrint.numero_entrega || ''} - ${pedidoToPrint.bairro_entrega || ''}</p>
                        <p>${pedidoToPrint.cidade_entrega || ''} - ${pedidoToPrint.estado_entrega || ''} ${pedidoToPrint.cep_entrega || ''}</p>
                    ` : ''}
                    <p><strong>Tipo:</strong> ${pedidoToPrint.tipo_entrega}</p>
                    <p><strong>Obs:</strong> ${pedidoToPrint.observacoes || 'Nenhuma'}</p>
                    ${pedidoToPrint.nome_funcionario ? `<p><strong>Atendente:</strong> ${pedidoToPrint.nome_funcionario}</p>` : ''}

                    <div class="section-title">ITENS DO PEDIDO</div>
                    <div style="font-weight: bold; display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span class="item-name">Desc.</span>
                        <span class="item-qty">Qtd</span>
                        <span class="item-price">Unit.</span>
                        <span class="item-total">Total</span>
                    </div>
                    ${(pedidoToPrint.itens && pedidoToPrint.itens.length > 0) ? pedidoToPrint.itens.map(item => `
                        <div class="item">
                            <span class="item-name">${item.nome_produto} ${item.observacoes ? `(${item.observacoes})` : ''}</span>
                            <span class="item-qty">${item.quantidade}</span>
                            <span class="item-price">R$ ${parseFloat(item.preco_unitario || 0).toFixed(2).replace('.', ',')}</span>
                            <span class="item-total">R$ ${(parseFloat(item.quantidade || 0) * parseFloat(item.preco_unitario || 0)).toFixed(2).replace('.', ',')}</span>
                        </div>
                        ${item.adicionais && item.adicionais.length > 0 ? item.adicionais.map(adicional => `
                            <div class="item" style="margin-left: 10px; font-size: 10px; color: #0066cc;">
                                <span class="item-name">+ ${adicional.quantidade}x ${adicional.nome}</span>
                                <span class="item-qty"></span>
                                <span class="item-price">R$ ${parseFloat(adicional.preco_unitario_adicional || 0).toFixed(2).replace('.', ',')}</span>
                                <span class="item-total">R$ ${(parseFloat(adicional.quantidade || 0) * parseFloat(adicional.preco_unitario_adicional || 0)).toFixed(2).replace('.', ',')}</span>
                            </div>
                        `).join('') : ''}
                    `).join('') : '<p>Nenhum item.</p>'}

                    <div class="total-row">
                        <span>SUBTOTAL DOS ITENS:</span>
                        <span>R$ ${parseFloat(pedidoToPrint.valor_total || 0).toFixed(2).replace('.', ',')}</span>
                    </div>
                    ${pedidoToPrint.tipo_entrega === 'Delivery' && parseFloat(empresa?.taxa_entrega || 0) > 0 ? `
                    <div class="total-row" style="font-size: 11px; font-weight: normal;">
                        <span>TAXA DE ENTREGA:</span>
                        <span>R$ ${parseFloat(empresa.taxa_entrega).toFixed(2).replace('.', ',')}</span>
                    </div>` : ''}
                    
                    ${descontoAplicadoNoCupom !== null && parseFloat(descontoAplicadoNoCupom) > 0 ? `
                    <div class="total-row" style="color: green;">
                        <span>DESCONTO:</span>
                        <span>-R$ ${descontoAplicadoNoCupom.replace('.', ',')}</span>
                    </div>` : ''}

                    <div class="total-row">
                        <span>TOTAL GERAL DO PEDIDO:</span>
                        <span>R$ ${totalGeralParaExibirNoCupom.replace('.', ',')}</span>
                    </div>

                    <div class="section-title">PAGAMENTOS</div>
                    ${(pedidoToPrint.pagamentos_recebidos && pedidoToPrint.pagamentos_recebidos.length > 0) ? pedidoToPrint.pagamentos_recebidos.map(pag => `
                        <p style="margin: 2px 0;">${format(parseISO(pag.data_pagamento), 'dd/MM HH:mm')} - ${pag.forma_pagamento_descricao}: R$ ${parseFloat(pag.valor_pago || 0).toFixed(2).replace('.', ',')}</p>
                    `).join('') : `<p>Nenhum pagamento registrado.</p>`}
                    <div class="total-row">
                        <span>RECEBIDO ATÉ AGORA:</span>
                        <span>R$ ${valorRecebidoCupom.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div class="total-row" style="color: red;">
                        <span>FALTA PAGAR:</span>
                        <span>R$ ${faltaPagarCupom.toFixed(2).replace('.', ',')}</span>
                    </div>

                    <div class="footer">
                        ${(pedidoToPrint.pagamentos_recebidos && pedidoToPrint.pagamentos_recebidos.length > 0) ? `
                        <p class="footer-message">Última Forma de Pagamento: ${lastPayment.forma_pagamento_descricao}</p>
                        ` : ''}
                        <p class="footer-message">Obrigado pela preferência!</p>
                        <p class="footer-message">${empresa?.mensagem_confirmacao_pedido || ''}</p>
                        <p class="footer-message">Emitido em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                        <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;">
                    </div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(cupomContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
    }, [empresa, formasPagamento, valorRecebidoAntes]);


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
        if (!dateTimeString) return 'N/A';
        try {
            return format(parseISO(dateTimeString), 'dd/MM/yyyy HH:mm');
        } catch (e) {
            console.error("Erro ao formatar data:", e);
            return dateTimeString;
        }
    };

    // Função para determinar o status de pagamento para exibição no card
    const getPagamentoStatusBadge = useCallback((pedido) => {
        // Calcula o valor total do pedido incluindo taxa de entrega
        const totalComTaxa = parseFloat(pedido.valor_total || 0) + (pedido.tipo_entrega === 'Delivery' ? parseFloat(empresa?.taxa_entrega || 0) : 0);
        const valorRecebido = parseFloat(pedido.valor_recebido_parcial || 0);

        // O backend já deve ter a lógica do desconto ao definir o status 'Entregue'
        // Portanto, se o status do pedido é 'Entregue', consideramos que está pago totalmente.
        if (pedido.status === 'Entregue') { 
            return <Badge className="bg-green-500 text-white">Finalizado</Badge>; // Verde para finalizado
        }
        if (pedido.status === 'Cancelado') {
            return <Badge className="bg-red-500 text-white">Cancelado</Badge>;
        }
        
        // Se o valor recebido cobre ou excede o total geral (original, sem desconto explícito aqui), é Pago Total
        // O backend deve ter atualizado o status para 'Entregue' se o valor com desconto foi suficiente.
        if (valorRecebido >= totalComTaxa && totalComTaxa > 0) { 
            return <Badge className="bg-green-500 text-white">Pago Total</Badge>; 
        }
        
        // Se há algum valor recebido, mas não o suficiente para o total
        if (valorRecebido > 0 && valorRecebido < totalComTaxa) {
            return <Badge className="bg-yellow-500 text-white">Parcial</Badge>;
        }
        
        // Se nada foi recebido
        return <Badge className="bg-red-500 text-white">Aberto</Badge>; 
    }, [empresa?.taxa_entrega]);


    // Filtra os pedidos a serem exibidos com base nos filtros selecionados
    const pedidosFiltrados = useMemo(() => {
        let currentPedidos = pedidos.filter(p => {
            const matchesTipoEntrega = filterTipoEntrega === 'all' || p.tipo_entrega === filterTipoEntrega;
            // Usa o debouncedSearchTerm para o filtro local
            const matchesSearch = debouncedSearchTerm === '' || 
                                  String(p.numero_pedido).includes(debouncedSearchTerm) || // Convertendo para string para includes
                                  (p.nome_cliente && p.nome_cliente.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
                                  (p.nome_cliente_convidado && p.nome_cliente_convidado.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
            
            // Filtra pela data do pedido
            const matchesDate = filterDate === '' || format(parseISO(p.data_pedido), 'yyyy-MM-dd') === filterDate;

            return matchesTipoEntrega && matchesSearch && matchesDate;
        });

        if (filterStatus === 'all') {
            return currentPedidos;
        } else {
            const statusesToShow = filterStatus.split(',');
            return currentPedidos.filter(p => statusesToShow.includes(p.status));
        }
    }, [pedidos, filterStatus, filterTipoEntrega, debouncedSearchTerm, filterDate]);


    const pedidosAbertos = useMemo(() => {
        // Pedidos "ativos" são aqueles que a cozinha ainda está trabalhando ou que o caixa ainda não finalizou
        return pedidosFiltrados.filter(p => !['Entregue', 'Cancelado'].includes(p.status));
    }, [pedidosFiltrados]);

    const pedidosFinalizados = useMemo(() => {
        // Pedidos "finalizados" são Entregues ou Cancelados
        return pedidosFiltrados.filter(p => ['Entregue', 'Cancelado'].includes(p.status));
    }, [pedidosFiltrados]);


    const canFinalizeOrder = user?.role && ['Proprietario', 'Caixa', 'Gerente'].includes(user.role);


    // SECOND_EDIT: efeito para checar caixa aberto
    useEffect(() => {
        const checkCaixaAberto = async () => {
            if (!empresa || !token) return;
            if (!empresa.usa_controle_caixa) { setLoadingCaixa(false); return; }
            try {
                const resp = await api.get(`/gerencial/${empresa.slug}/caixas/aberto`, { headers: { Authorization: `Bearer ${token}` }});
                if (resp.data && resp.data.aberto && resp.data.caixa) {
                    const caixaData = resp.data.caixa;
                    // Se o caixa aberto for de data anterior ao dia atual, força fechamento
                    const dataAberturaStr = caixaData.data_abertura || caixaData.created_at || caixaData.data_inicio;
                    if (dataAberturaStr) {
                        const dataAbertura = parseISO(dataAberturaStr);
                        const hojeStr = format(new Date(), 'yyyy-MM-dd');
                        const aberturaStr = format(dataAbertura, 'yyyy-MM-dd');
                        if (aberturaStr !== hojeStr) {
                            // Caixa de dia anterior
                            setCaixaInfo(caixaData);
                            toast.warning('Existe um caixa aberto do dia anterior. Favor realizar o fechamento.');
                            openFechamentoModal();
                            setLoadingCaixa(false);
                            return;
                        }
                    }
                    setCaixaInfo(caixaData);
                } else {
                    setCaixaInfo(null);
                    setIsAberturaModalOpen(true);
                }
            } catch (e) {
                setCaixaInfo(null);
                setIsAberturaModalOpen(true);
            } finally {
                setLoadingCaixa(false);
            }
        };
        checkCaixaAberto();
    }, [empresa, token]);

    // THIRD_EDIT: funções de impressão simples (abertura/fechamento)
    const printCaixaAbertura = useCallback((data) => {
        if (!data || !user) return;
        const win = window.open('', '_blank', 'width=300,height=400');
        if (!win) return;
        const content = `<html><head><title>Abertura de Caixa</title><style>
            body{font-family:'Courier New',monospace;margin:0;padding:0;}
            .container{width:76mm;margin:0 auto;padding:0 2mm;}
            h3{text-align:center;margin:4px 0;}
            p{margin:2px 0;}
            @media print{@page{size:80mm auto;margin:0;}}
        </style></head><body><div class="container">
             <h3>ABERTURA DE CAIXA</h3>
             <p>Data/Hora: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
             <p>Funcionário: ${user.nome}</p>
             <p>Valor Inicial: R$ ${parseFloat(data.valor_abertura || 0).toFixed(2).replace('.', ',')}</p>
        </div></body></html>`;
        win.document.write(content);
        win.document.close();
        win.focus();
        win.print();
        win.onafterprint = () => win.close();
    }, [user]);

    const printCaixaFechamento = useCallback((fechamentoResp, resumo, totFP, fatObj) => {
        if (!fechamentoResp || !user) return;
        const win = window.open('', '_blank', 'width=300,height=500');
        if (!win) return;
        const content = `<html><head><title>Fechamento de Caixa</title><style>
            body{font-family:'Courier New',monospace;margin:0;padding:0;}
            .container{width:76mm;margin:0 auto;padding:0 2mm;}
            h3{text-align:center;margin:4px 0;}
            p{margin:2px 0;}
            table{width:100%;font-size:10px;border-collapse:collapse;margin-top:4px;}
            th,td{text-align:left;padding:2px;}
            th{border-bottom:1px solid #000;}
            @media print{@page{size:80mm auto;margin:0;}}
        </style></head><body><div class="container">
             <h3>FECHAMENTO DE CAIXA</h3>
             <p>Data/Hora: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
             <p>Funcionário: ${user.nome}</p>
             ${resumo ? `<p>Valor Abertura: R$ ${parseFloat(resumo.valor_abertura||0).toFixed(2).replace('.', ',')}</p>
             <p>Total Pagamentos: R$ ${parseFloat(resumo.total_pagamentos_sistema||0).toFixed(2).replace('.', ',')}</p>
             <p>Total Suprimentos: R$ ${parseFloat(resumo.total_suprimentos||0).toFixed(2).replace('.', ',')}</p>
             <p>Total Sangrias: R$ ${parseFloat(resumo.total_sangrias||0).toFixed(2).replace('.', ',')}</p>`:''}
             <p>Valor no Sistema: R$ ${parseFloat(fechamentoResp.valor_sistema || 0).toFixed(2).replace('.', ',')}</p>
             <p>Valor Informado: R$ ${parseFloat(fechamentoResp.valor_informado || 0).toFixed(2).replace('.', ',')}</p>
             <p>Diferença: R$ ${parseFloat(fechamentoResp.diferenca || 0).toFixed(2).replace('.', ',')}</p>
             ${totFP && totFP.length>0 ? `<table><thead><tr><th>Forma</th><th align="right">Valor</th></tr></thead><tbody>${totFP.map(fp=>`<tr><td>${fp.forma_pagamento_descricao}</td><td align="right">R$ ${parseFloat(fp.valor_sistema_calculado_por_forma||0).toFixed(2).replace('.', ',')}</td></tr>`).join('')}</tbody></table>`:''}
             ${fatObj && fatObj.formas && fatObj.formas.length>0 ? `<table><thead><tr><th>Forma</th><th align="right">Faturamento</th></tr></thead><tbody>${fatObj.formas.map(fp=>`<tr><td>${fp.forma_pagamento_descricao}</td><td align="right">R$ ${parseFloat(fp.total_faturamento_por_forma||0).toFixed(2).replace('.', ',')}</td></tr>`).join('')}<tr><td><strong>Total</strong></td><td align="right"><strong>R$ ${parseFloat(fatObj.total||0).toFixed(2).replace('.', ',')}</strong></td></tr></tbody></table>`:''}
        </div></body></html>`;
        win.document.write(content);
        win.document.close();
        win.focus();
        win.print();
        win.onafterprint = () => win.close();
    }, [user]);

    // Impressão de Suprimento / Sangria
    const printMovimentacaoCupom = useCallback(({ tipo, valor, formaPagamentoDesc, obs }) => {
        const win = window.open('', '_blank', 'width=300,height=400');
        if (!win) return;
        const content = `<html><head><title>${tipo}</title><style>
            body{font-family:'Courier New',monospace;margin:0;padding:0;}
            .container{width:76mm;margin:0 auto;padding:0 2mm;}
            h3{text-align:center;margin:4px 0;}
            p{margin:2px 0;}
            @media print{@page{size:80mm auto;margin:0;}}
        </style></head><body><div class="container">
            <h3>${tipo.toUpperCase()}</h3>
            <p>Data/Hora: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            <p>Funcionário: ${user?.nome}</p>
            <p>Valor: R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}</p>
            <p>Forma de Pagamento: ${formaPagamentoDesc}</p>
            ${obs ? `<p>Obs: ${obs}</p>` : ''}
        </div></body></html>`;
        win.document.write(content);
        win.document.close();
        win.focus();
        win.print();
        win.onafterprint = () => win.close();
    }, [user]);

    // FOURTH_EDIT: handlers para abertura/fechamento/movimentacao
    const handleAbrirCaixa = async () => {
        if (!empresa || !token) return;
        try {
            const body = {};
            if (valorAberturaInput !== '') body.valor_abertura = parseFloat(valorAberturaInput);
            const resp = await api.post(`/gerencial/${empresa.slug}/caixas/abrir`, body, { headers: { Authorization: `Bearer ${token}` }});
            toast.success(resp.data.message || 'Caixa aberto!');
            setCaixaInfo(resp.data);
            setIsAberturaModalOpen(false);
            setAberturaPrintData(resp.data);
            setIsPrintAberturaModalOpen(true);
        } catch (e) {
            toast.error(e.response?.data?.message || 'Erro ao abrir caixa');
        }
    };

    const fetchDetalhesFechamento = async () => {
        if (!empresa || !token || !caixaInfo) return;
        try {
            const resp = await api.get(`/gerencial/${empresa.slug}/caixas/${caixaInfo.id}/detalhes-fechamento`, { headers: { Authorization: `Bearer ${token}` }});
            if(Array.isArray(resp.data)) {
               setDetalhesFechamento(resp.data);
               setResumoCaixa(resp.data[0] || null);
               setTotalizadoresFP([]);
            } else {
               setResumoCaixa(resp.data.resumo_caixa || null);
               setTotalizadoresFP(resp.data.totalizadores_formas_pagamento || []);
            }

            // carrega faturamento bruto por forma
            try {
               const fatResp = await api.get(`/gerencial/${empresa.slug}/caixas/${caixaInfo.id}/faturamento-formas`, { headers: { Authorization: `Bearer ${token}` }});
               if(fatResp.data && fatResp.data.detalhado_por_forma){
                  setFaturamentoFP({ total: fatResp.data.total_faturamento || 0, formas: fatResp.data.detalhado_por_forma });
               } else {
                  setFaturamentoFP({ total:0, formas: fatResp.data || []});
               }
            } catch(_) { setFaturamentoFP({ total:0, formas: []}); }
        } catch (e) {
            toast.error('Erro ao buscar detalhes de fechamento');
        }
    };

    const openFechamentoModal = () => {
        setIsFechamentoModalOpen(true);
        setValorFechamentoInput('');
        setObservacoesFechamento('');
        setDetalhesFechamento([]);
        fetchDetalhesFechamento();
    };

    const handleFecharCaixa = async () => {
        if (!empresa || !token || !caixaInfo) return;
        try {
            const body = { valor_fechamento_informado: parseFloat(valorFechamentoInput) || 0, observacoes_fechamento: observacoesFechamento };
            const resp = await api.put(`/gerencial/${empresa.slug}/caixas/${caixaInfo.id}/fechar`, body, { headers: { Authorization: `Bearer ${token}` }});
            toast.success(resp.data.message || 'Caixa fechado com sucesso');
            setIsFechamentoModalOpen(false);
            setCaixaInfo(null);
            setFechamentoPrintData({resp: resp.data, resumo: resumoCaixa, totalizadores: totalizadoresFP, faturamento: faturamentoFP});
            setIsPrintFechamentoModalOpen(true);
            // Após fechar, força abertura novamente se controle ativo
            if (empresa.usa_controle_caixa) setIsAberturaModalOpen(true);
        } catch (e) {
            toast.error(e.response?.data?.message || 'Erro ao fechar caixa');
        }
    };

    const handleRegistrarMovimentacao = async () => {
        if (!empresa || !token || !caixaInfo) return;
        if (!valorMovimentacao || parseFloat(valorMovimentacao) <= 0) { toast.error('Informe um valor válido'); return; }
        if (!formaPagamentoMovId) { toast.error('Selecione a forma de pagamento'); return; }
        try {
            const body = { valor: parseFloat(valorMovimentacao), id_forma_pagamento: parseInt(formaPagamentoMovId), observacoes: observacoesMovimentacao };
            const endpoint = tipoMovimentacao === 'Suprimento' ? 'suprimento' : 'sangria';
            const resp = await api.post(`/gerencial/${empresa.slug}/caixas/${caixaInfo.id}/${endpoint}`, body, { headers: { Authorization: `Bearer ${token}` }});
            toast.success(resp.data.message || 'Movimentação registrada');
            setIsSuprimentoModalOpen(false);
            const fpDesc = formasPagamento.find(fp=>fp.id.toString()===formaPagamentoMovId)?.descricao || '';
            setMovPrintData({tipo: tipoMovimentacao, valor: valorMovimentacao, formaPagamentoDesc: fpDesc, obs: observacoesMovimentacao});
            setIsPrintMovModalOpen(true);
            // Limpa campos
            setValorMovimentacao('');
            setObservacoesMovimentacao('');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Erro ao registrar movimentação');
        }
    };

    // Funções para lidar com a confirmação de troco
    const handleConfirmarTroco = async () => {
        if (!trocoData) return;
        
        setTrocoConfirmado(true);
        toast.success(`Troco de R$ ${trocoData.valorTroco.toFixed(2).replace('.', ',')} confirmado!`);
        
        // Finaliza o pagamento após confirmar o troco
        await finalizarPagamentoCompleto(
            trocoData.valorRecebido,
            trocoData.formaPagamentoId,
            trocoData.dividirConta,
            trocoData.observacoes
        );
        
        // Fecha o modal e limpa os dados
        setIsTrocoModalOpen(false);
        setTrocoData(null);
        setTrocoConfirmado(false);
    };

    const handleCancelarTroco = () => {
        setIsTrocoModalOpen(false);
        setTrocoData(null);
        setTrocoConfirmado(false);
        toast.info('Operação cancelada');
    };

    // Funções para lidar com a impressão de cupom
    const handleImprimirCupom = () => {
        if (pedidoParaImprimir) {
            handlePrintCupom(pedidoParaImprimir, valorPagoUltimaOperacao);
        }
        setIsPrintCupomModalOpen(false);
        setPedidoParaImprimir(null);
    };

    const handleNaoImprimirCupom = () => {
        setIsPrintCupomModalOpen(false);
        setPedidoParaImprimir(null);
    };


    // Substituir condição inicial de carregamento
    if (empresaLoading || !empresa || (empresa.usa_controle_caixa && loadingCaixa)) {
        return <div className="p-4 text-center text-gray-600">Carregando dados da empresa...</div>;
    }

    if (!canFinalizeOrder) {
        return <div className="p-4 text-red-600 text-center">Você não tem permissão para acessar o painel do Caixa.</div>;
    }

    if (loadingPedidos) {
        return <div className="p-4 text-center text-gray-600">Carregando pedidos...</div>;
    }

    if (error) {
        return <div className="p-4 text-red-600 text-center">{error}</div>;
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Caixa - {empresa.nome_fantasia}</h2>
              {empresa.usa_controle_caixa && caixaInfo && (
                 <div className="flex gap-2">
                     <Button variant="outline" onClick={() => setIsSuprimentoModalOpen(true)} className="flex items-center"><PlusCircle className="h-4 w-4 mr-1"/> Suprimento/Sangria</Button>
                     <Button onClick={openFechamentoModal} className="bg-red-600 hover:bg-red-700 text-white flex items-center"><DollarSign className="h-4 w-4 mr-1"/> Fechar Caixa</Button>
                 </div>
              )}
            </div>

            <div className="mb-6 p-4 border rounded-lg bg-gray-50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end"> {/* Ajustado para 4 colunas para incluir a data */}
                <div>
                    <Label htmlFor="filterStatus">Visualizar Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger id="filterStatus"><SelectValue placeholder="Status Ativos" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Pendente,Preparando,Pronto">Ativos (Pendente, Preparando, Pronto)</SelectItem>
                            <SelectItem value="Entregue,Cancelado">Finalizados (Entregue, Cancelado)</SelectItem>
                            <SelectItem value="all">Todos os Status</SelectItem>
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
                    <Label htmlFor="searchTerm">Buscar por Pedido/Cliente</Label>
                    <Input
                        id="searchTerm"
                        placeholder="Número do pedido, nome do cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                    />
                </div>
                {/* Novo filtro de data */}
                <div>
                    <Label htmlFor="filterDate">Filtrar por Data</Label>
                    <Input
                        id="filterDate"
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full"
                    />
                </div>
            </div>

            {/* Pedidos Ativos - Agora sempre em uma única lista, sem separação por tipo */}
            <h3 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Pedidos Ativos ({pedidosAbertos.length})</h3>
            {pedidosAbertos.length === 0 ? (
                <p className="text-gray-600">Nenhum pedido ativo encontrado para os filtros selecionados.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pedidosAbertos.map(pedido => (
                        <Card key={pedido.id} className="hover:shadow-lg transition-shadow duration-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex justify-between items-center">
                                    Pedido #{pedido.numero_pedido}
                                    <Badge className={`${
                                        pedido.tipo_entrega === 'Mesa' ? 'bg-blue-100 text-blue-800' :
                                        pedido.tipo_entrega === 'Balcao' ? 'bg-purple-100 text-purple-800' :
                                        'bg-orange-100 text-orange-800'
                                    }`}>
                                        {pedido.tipo_entrega}
                                        {pedido.tipo_entrega === 'Mesa' && pedido.numero_mesa ? ` (${pedido.numero_mesa})` : ''}
                                    </Badge>
                                </CardTitle>
                                <CardDescription className="text-sm flex justify-between items-center">
                                    {/* Nome do cliente agora maior e em negrito */}
                                    <span className="text-base font-bold">Cliente: {pedido.nome_cliente || pedido.nome_cliente_convidado || 'Convidado'}</span>
                                    {getStatusBadge(pedido.status)}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-2">
                                {(() => {
                                    const baseTotal = parseFloat(pedido.valor_total || 0);
                                    const deliveryTax = (pedido.tipo_entrega === 'Delivery' && empresa?.taxa_entrega) ? parseFloat(empresa.taxa_entrega) : 0;
                                    const displayTotal = (baseTotal + deliveryTax).toFixed(2);
                                    const receivedPartial = parseFloat(pedido.valor_recebido_parcial || 0);
                                    const missingAmount = Math.max(0, parseFloat(displayTotal) - receivedPartial).toFixed(2);
                                    
                                    // console.log(`Pedido #${pedido.numero_pedido}:`);
                                    // console.log("  pedido.valor_total:", pedido.valor_total);
                                    // console.log("  empresa?.taxa_entrega:", empresa?.taxa_entrega);
                                    // console.log("  pedido.tipo_entrega:", pedido.tipo_entrega);
                                    // console.log("  displayTotal (calculado):", displayTotal);
                                    // console.log("  receivedPartial:", receivedPartial);
                                    // console.log("  missingAmount:", missingAmount);

                                    return (
                                        <>
                                            <p className="text-base font-semibold">Valor Total: R$ {displayTotal.replace('.', ',')}</p>
                                            
                                            {/* Forma de pagamento aparece somente para Delivery ou Retirada */}
                                            {['Delivery', 'Retirada'].includes(pedido.tipo_entrega) && (
                                                <p className="text-base">Forma de pagamento: {pedido.formapagamento || 'N/A'}</p>
                                            )} 
                                            
                                            <p className="text-sm text-gray-500">Criado em: {formatDateTime(pedido.data_pedido)}</p>
                                            <p className="text-sm text-gray-500">Recebido Parcial: R$ {receivedPartial.toFixed(2).replace('.', ',')}</p>
                                            
                                            {/* Falta Receber aparece somente se tiver um valor parcial recebido maior que zero */}
                                            {receivedPartial > 0 && parseFloat(missingAmount) > 0 && (
                                                <p className="font-bold text-lg text-red-600">Falta Receber: R$ {missingAmount.replace('.', ',')}</p>
                                            )}
                                            <div className="mt-2 flex justify-end">
                                                {getPagamentoStatusBadge(pedido)}
                                            </div>
                                        </>
                                    );
                                })()}
                            </CardContent>
                            <CardFooter className="pt-2 flex justify-end gap-2">
                                <Button onClick={() => openPedidoDetailModal(pedido.id)} size="sm">Finalizar</Button>
                                {/* Botão Imprimir adicionado em cada card */}
                                <Button onClick={() => handlePrintCupom(pedido)} size="sm" variant="ghost" className="flex items-center">
                                    <Printer className="h-4 w-4 mr-1"/> Imprimir
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {(filterStatus === 'Entregue,Cancelado' || filterStatus === 'all') && (
                <>
                    <h3 className="text-xl font-semibold mb-4 mt-8 text-gray-700 border-b pb-2">Pedidos Finalizados ({pedidosFinalizados.length})</h3>
                    {pedidosFinalizados.length === 0 ? (
                        <p className="text-gray-600">Nenhum pedido finalizado encontrado para os filtros selecionados.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pedidosFinalizados.map(pedido => (
                                <Card key={pedido.id} className="hover:shadow-lg transition-shadow duration-200 opacity-70">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg flex justify-between items-center">
                                            Pedido #{pedido.numero_pedido}
                                            <Badge className={`${
                                                pedido.tipo_entrega === 'Mesa' ? 'bg-blue-100 text-blue-800' :
                                                pedido.tipo_entrega === 'Balcao' ? 'bg-purple-100 text-purple-800' :
                                                'bg-orange-100 text-orange-800'
                                            }`}>
                                                {pedido.tipo_entrega}
                                                {pedido.tipo_entrega === 'Mesa' && pedido.numero_mesa ? ` (${pedido.numero_mesa})` : ''}
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription className="text-sm flex justify-between items-center">
                                            {/* Nome do cliente agora maior e em negrito */}
                                            <span className="text-base font-bold">Cliente: {pedido.nome_cliente || pedido.nome_cliente_convidado || 'Convidado'}</span>
                                            {getStatusBadge(pedido.status)}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-2">
                                        {(() => {
                                            const baseTotal = parseFloat(pedido.valor_total || 0);
                                            const deliveryTax = (pedido.tipo_entrega === 'Delivery' && empresa?.taxa_entrega) ? parseFloat(empresa.taxa_entrega) : 0;
                                            const displayTotal = (baseTotal + deliveryTax).toFixed(2);
                                            const receivedPartial = parseFloat(pedido.valor_recebido_parcial || 0);
                                            const missingAmount = Math.max(0, parseFloat(displayTotal) - receivedPartial).toFixed(2);

                                            return (
                                                <>
                                                    <p className="text-base font-semibold">Valor Total: R$ {displayTotal.replace('.', ',')}</p>
                                                    {['Delivery', 'Retirada'].includes(pedido.tipo_entrega) && (
                                                        <p className="text-base">Forma de pagamento: {pedido.formapagamento || 'N/A'}</p>
                                                    )}
                                                    <p className="text-sm text-gray-500">Criado em: {formatDateTime(pedido.data_pedido)}</p>
                                                    <p className="text-sm text-gray-500">Recebido Parcial: R$ {receivedPartial.toFixed(2).replace('.', ',')}</p>
                                                    {receivedPartial > 0 && parseFloat(missingAmount) > 0 && (
                                                        <p className="font-bold text-lg text-red-600">Falta Receber: R$ {missingAmount.replace('.', ',')}</p>
                                                    )}
                                                    <div className="mt-2 flex justify-end">
                                                        {getPagamentoStatusBadge(pedido)}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </CardContent>
                                    <CardFooter className="pt-2 flex justify-end gap-2">
                                        <Button onClick={() => openPedidoDetailModal(pedido.id)} size="sm" variant="outline">Ver Detalhes</Button>
                                        <Button onClick={() => handlePrintCupom(pedido)} size="sm" variant="ghost" className="flex items-center">
                                            <Printer className="h-4 w-4 mr-1"/> Imprimir
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            )}


            {/* Modal de Detalhes dos Itens */}
            <Dialog open={isItemDetailModalOpen} onOpenChange={closeItemDetailModal}>
                <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
                    {selectedPedido ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>Itens do Pedido #{selectedPedido.numero_pedido}</DialogTitle>
                                <DialogDescription>
                                    Lista completa dos produtos incluídos neste pedido.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Produto</TableHead>
                                            <TableHead className="text-right">Qtd</TableHead>
                                            <TableHead className="text-right">V. Unit</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(selectedPedido.itens || []).map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div>
                                                        <div>{item.nome_produto} {item.observacoes && `(${item.observacoes})`}</div>
                                                        {/* Exibir adicionais do item */}
                                                        {item.adicionais && item.adicionais.length > 0 && (
                                                            <div className="mt-1">
                                                                {item.adicionais.map((adicional, adicIdx) => (
                                                                    <div key={adicIdx} className="text-xs text-blue-600">
                                                                        + {adicional.quantidade}x {adicional.nome} (R$ {parseFloat(adicional.preco_unitario_adicional).toFixed(2).replace('.', ',')})
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">{item.quantidade}</TableCell>
                                                <TableCell className="text-right">R$ {parseFloat(item.preco_unitario || 0).toFixed(2).replace('.', ',')}</TableCell>
                                                <TableCell className="text-right">R$ {(parseFloat(item.quantidade || 0) * parseFloat(item.preco_unitario || 0)).toFixed(2).replace('.', ',')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <p className="text-right font-bold mt-4">
                                    Subtotal dos Itens: R$ {parseFloat(selectedPedido.valor_total || 0).toFixed(2).replace('.', ',')}
                                </p>
                                {selectedPedido.tipo_entrega === 'Delivery' && parseFloat(empresa?.taxa_entrega || 0) > 0 && (
                                    <p className="text-right text-sm text-gray-600">
                                        Taxa de Entrega: R$ {parseFloat(empresa.taxa_entrega).toFixed(2).replace('.', ',')}
                                    </p>
                                )}
                                <p className="text-right font-bold text-lg mt-2">
                                    Total Geral do Pedido: R$ {totalGeralPedidoOriginal.toFixed(2).replace('.', ',')}
                                    {cobrarPorcentagemGarcom && selectedPedido.tipo_entrega === 'Mesa' && (
                                        <span className="text-sm text-orange-600 ml-2">(inclui 10% garçom)</span>
                                    )}
                                </p>
                            </div>
                            <DialogFooter>
                                <Button onClick={closeItemDetailModal} variant="outline">Fechar</Button>
                                <Button onClick={() => handlePrintCupom(selectedPedido)} size="sm" variant="ghost" className="flex items-center">
                                    <Printer className="h-4 w-4 mr-1"/> Imprimir Cupom
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="animate-spin h-8 w-8 mr-2" /> Carregando detalhes do pedido...
                        </div>
                    )}
                </DialogContent>
            </Dialog>


            {/* Modal de Finalização de Pagamento (Principal) */}
            <Dialog open={isPedidoDetailModalOpen} onOpenChange={closePedidoDetailModal}>
                <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
                    {selectedPedido ? (
                        <div className="flex flex-col h-full">
                            <DialogHeader>
                                <DialogTitle>Finalizar Pagamento do Pedido #{selectedPedido.numero_pedido}</DialogTitle>
                                <DialogDescription>
                                    Cliente: {selectedPedido.nome_cliente || selectedPedido.nome_cliente_convidado || 'Convidado'} | Tipo: {selectedPedido.tipo_entrega} {selectedPedido.numero_mesa ? `(Mesa ${selectedPedido.numero_mesa})` : ''}
                                    {selectedPedido.nome_funcionario && ` | Atendente: ${selectedPedido.nome_funcionario}`}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-grow overflow-y-auto py-4">
                                {loadingFinalizacao && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50 rounded-lg">
                                        <Loader2 className="animate-spin text-primary h-8 w-8" />
                                        <span className="ml-2 text-primary">Processando...</span>
                                    </div>
                                )}
                                <div className="grid gap-4">
                                    {/* Resumo do Pedido - Visão geral */}
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                                        <h5 className="font-bold text-xl text-blue-800">Total Geral do Pedido: R$ {totalGeralPedidoOriginal.toFixed(2).replace('.', ',')}</h5>
                                        <p className="text-blue-700 text-sm">Recebido até agora: R$ {parseFloat(selectedPedido.valor_recebido_parcial || 0).toFixed(2).replace('.', ',')}</p>
                                        <p className="text-blue-800 font-semibold mt-1">
                                            Falta Pagar: <span className="font-bold text-red-600">R$ {valorRestanteTotalDoPedido.toFixed(2).replace('.', ',')}</span>
                                        </p>
                                    </div>

                                    {/* Botão para DETALHAR ITENS DENTRO DO MODAL DE FINALIZAÇÃO */}
                                    <Button onClick={() => openItemDetailModal(selectedPedido)} size="sm" variant="secondary" className="w-full">
                                        Ver Detalhes dos Itens
                                    </Button>

                                    {/* Forma de Pagamento */}
                                    <div>
                                        <Label htmlFor="formaPagamentoCaixa">Forma de Pagamento</Label>
                                        <Select value={selectedFormaPagamentoId} onValueChange={setSelectedFormaPagamentoId} disabled={selectedPedido.status === 'Entregue' || selectedPedido.status === 'Cancelado'}>
                                            <SelectTrigger id="formaPagamentoCaixa"><SelectValue placeholder="Selecione a forma" /></SelectTrigger>
                                            <SelectContent>
                                                {formasPagamento.length === 0 && <SelectItem disabled value="">Nenhuma forma disponível</SelectItem>}
                                                {formasPagamento.map(fp => (
                                                    <SelectItem key={fp.id} value={fp.id.toString()}>
                                                        {fp.descricao} {fp.porcentagem_desconto_geral > 0 && `(${parseFloat(fp.porcentagem_desconto_geral).toFixed(0)}% desconto)`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Cobrança de Porcentagem do Garçom - Apenas para pedidos de Mesa */}
                                    {selectedPedido.tipo_entrega === 'Mesa' && empresa?.porcentagem_garcom && (
                                        <div className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                                            <Switch
                                                id="cobrarPorcentagemGarcom"
                                                checked={cobrarPorcentagemGarcom}
                                                onCheckedChange={setCobrarPorcentagemGarcom}
                                                disabled={selectedPedido.status === 'Entregue' || selectedPedido.status === 'Cancelado'}
                                            />
                                            <Label htmlFor="cobrarPorcentagemGarcom" className="text-orange-800 font-medium">
                                                Cobrar 10% (Garçom)
                                            </Label>
                                            {cobrarPorcentagemGarcom && (
                                                <span className="text-sm text-orange-700 ml-2">
                                                    + R$ {(parseFloat(selectedPedido.valor_total || 0) * 0.10).toFixed(2).replace('.', ',')}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Valor a Cobrar */}
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                        <Label htmlFor="valorCobrancaManual" className="text-yellow-800">Valor a Cobrar (R$)</Label>
                                        <Input
                                            id="valorCobrancaManual"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={valorCobrancaManual}
                                            onChange={(e) => {
                                                const newValue = e.target.value;
                                                setValorCobrancaManual(newValue);
                                            }}
                                            placeholder="0.00"
                                            disabled={selectedPedido.status === 'Entregue' || selectedPedido.status === 'Cancelado'}
                                        />
                                        {valorComDesconto.toFixed(2) !== parseFloat(valorCobrancaManual || '0').toFixed(2) && (
                                            <p className="text-sm text-yellow-700 mt-1">
                                                Valor com Desconto: <span className="font-bold">R$ {valorComDesconto.toFixed(2).replace('.', ',')}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Valor Recebido */}
                                    <div>
                                        <Label htmlFor="valorRecebidoInput">Valor Recebido (R$)</Label>
                                        <Input
                                            id="valorRecebidoInput"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={valorRecebidoInput}
                                            onChange={(e) => setValorRecebidoInput(e.target.value)}
                                            placeholder="0.00"
                                            disabled={selectedPedido.status === 'Entregue' || selectedPedido.status === 'Cancelado'}
                                        />
                                    </div>

                                    {/* Troco */}
                                    {selectedFormaPagamentoId && formasPagamento.find(fp => fp.id.toString() === selectedFormaPagamentoId)?.descricao.toLowerCase() === 'dinheiro' && (
                                        <div className="bg-green-50 border border-green-200 rounded-md p-3">
                                            <p className="text-lg font-semibold text-green-800">Troco: <span className="text-blue-600">R$ {troco.toFixed(2).replace('.', ',')}</span></p>
                                        </div>
                                    )}

                                    {/* Dividir Conta */}
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="dividirConta"
                                            checked={dividirContaAtivo}
                                            onCheckedChange={setDividirContaAtivo}
                                            disabled={selectedPedido.status === 'Entregue' || selectedPedido.status === 'Cancelado'}
                                        />
                                        <Label htmlFor="dividirConta">Dividir Conta</Label>
                                    </div>

                                    {dividirContaAtivo && (
                                        <div>
                                            <Label htmlFor="numPessoasDividir">Dividir por (Pessoas)</Label>
                                            <Input
                                                id="numPessoasDividir"
                                                type="number"
                                                min="1"
                                                value={numPessoasDividir}
                                                onChange={(e) => setNumPessoasDividir(parseInt(e.target.value) || '')}
                                                placeholder="Ex: 2"
                                                disabled={selectedPedido.status === 'Entregue' || selectedPedido.status === 'Cancelado'}
                                            />
                                            {numPessoasDividir && parseInt(numPessoasDividir) > 1 && (
                                                <p className="text-sm text-gray-600 mt-1">Valor por pessoa: <span className="font-bold">R$ {valorAPagarNestaParcelaFinal.toFixed(2).replace('.', ',')}</span></p>
                                            )}
                                        </div>
                                    )}

                                    {/* Observações do Pagamento */}
                                    <div>
                                        <Label htmlFor="obsPagamento">Observações do Pagamento</Label>
                                        <Textarea id="obsPagamento" value={observacoesPagamento} onChange={(e) => setObservacoesPagamento(e.target.value)} rows={2} disabled={selectedPedido.status === 'Entregue' || selectedPedido.status === 'Cancelado'} />
                                    </div>

                                    {/* Título mostrando quanto falta receber */}
                                    {valorRestanteTotalDoPedido > 0 && (
                                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                            <h4 className="text-lg font-bold text-red-800 text-center">
                                                Falta Receber: R$ {valorRestanteTotalDoPedido.toFixed(2).replace('.', ',')}
                                            </h4>
                                            {(() => {
                                                const valorRecebido = parseFloat(valorRecebidoInput) || 0;
                                                const valorRestante = parseFloat(valorRestanteTotalDoPedido);
                                                
                                                if (valorRecebido >= valorRestante && valorRecebido > 0) {
                                                    const troco = valorRecebido - valorRestante;
                                                    if (troco > 0) {
                                                        return (
                                                            <p className="text-sm text-green-700 text-center mt-1 font-semibold">
                                                                ✅ Pagamento total + Troco de R$ {troco.toFixed(2).replace('.', ',')}
                                                            </p>
                                                        );
                                                    } else {
                                                        return (
                                                            <p className="text-sm text-green-700 text-center mt-1 font-semibold">
                                                                ✅ Pagamento total será realizado
                                                            </p>
                                                        );
                                                    }
                                                } else if (valorRecebido > 0 && valorRecebido < valorRestante) {
                                                    return (
                                                        <p className="text-sm text-orange-700 text-center mt-1">
                                                            💰 Recebimento parcial - ainda faltará R$ {(valorRestante - valorRecebido).toFixed(2).replace('.', ',')}
                                                        </p>
                                                    );
                                                } else {
                                                    return (
                                                        <p className="text-sm text-red-700 text-center mt-1">
                                                            Você pode receber qualquer valor (incluindo troco)
                                                        </p>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    )}

                                    {/* Botão Receber Parcial */}
                                    {selectedPedido.status !== 'Entregue' && selectedPedido.status !== 'Cancelado' && (
                                        <Button onClick={handleFinalizarPagamento} className="mt-4 w-full flex items-center" disabled={loadingFinalizacao}>
                                            {loadingFinalizacao ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <CheckCircle className="h-5 w-5 mr-2" />}
                                            {(() => {
                                                const valorRecebido = parseFloat(valorRecebidoInput) || 0;
                                                const valorRestante = parseFloat(valorRestanteTotalDoPedido);
                                                
                                                // Se vai receber o valor total restante ou mais (incluindo troco), mostra "Finalizar Pagamento"
                                                if (valorRecebido >= valorRestante && valorRestante > 0) {
                                                    return 'Finalizar Pagamento';
                                                }
                                                // Se vai receber um valor parcial, mostra "Receber Parcial"
                                                else if (valorRecebido > 0 && valorRecebido < valorRestante) {
                                                    return 'Receber Parcial';
                                                }
                                                // Se não há valor restante, mostra "Finalizar Pagamento"
                                                else if (valorRestante <= 0) {
                                                    return 'Finalizar Pagamento';
                                                }
                                                // Padrão
                                                else {
                                                    return 'Receber Parcial';
                                                }
                                            })()}
                                        </Button>
                                    )}

                                    {/* MANTIDO PARA EXIBIR STATUS APÓS FINALIZAÇÃO/CANCELAMENTO (apenas visual) */}
                                    {selectedPedido.status === 'Entregue' && (
                                        <Badge className="bg-green-500 text-white text-center py-2 w-full mt-4">Pedido Finalizado</Badge>
                                    )}
                                    {selectedPedido.status === 'Cancelado' && (
                                        <Badge className="bg-red-500 text-white text-center py-2 w-full mt-4">Pedido Cancelado</Badge>
                                    )}

                                    {/* Seção de Pagamentos - Histórico dos pagamentos realizados */}
                                    <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
                                        <h4 className="font-semibold text-lg mb-3 text-gray-800">Pagamentos Realizados</h4>
                                        
                                        {(selectedPedido.pagamentos_recebidos && selectedPedido.pagamentos_recebidos.length > 0) ? (
                                            <div className="space-y-2">
                                                {selectedPedido.pagamentos_recebidos.map((pagamento, index) => (
                                                    <div key={index} className="flex justify-between items-center p-2 bg-white border border-gray-200 rounded">
                                                        <div>
                                                            <span className="font-medium">{pagamento.forma_pagamento_descricao}</span>
                                                            <span className="text-sm text-gray-500 ml-2">
                                                                {format(parseISO(pagamento.data_pagamento), 'dd/MM HH:mm')}
                                                            </span>
                                                        </div>
                                                        <span className="font-bold text-green-600">
                                                            R$ {parseFloat(pagamento.valor_pago || 0).toFixed(2).replace('.', ',')}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500">Nenhum pagamento registrado ainda.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={closePedidoDetailModal} variant="outline">Fechar</Button>
                                <Button onClick={() => handlePrintCupom(selectedPedido)} size="sm" variant="ghost" className="flex items-center">
                                    <Printer className="h-4 w-4 mr-1"/> Imprimir Cupom
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="animate-spin h-8 w-8 mr-2" /> Carregando detalhes do pedido...
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de ABERTURA DE CAIXA */}
            <Dialog open={isAberturaModalOpen} onOpenChange={setIsAberturaModalOpen}>
                <DialogContent style={{ width: '90vw', maxWidth: '1280px' }}>
                    <DialogHeader>
                        <DialogTitle>Abertura de Caixa</DialogTitle>
                        <DialogDescription>Informe o valor inicial do caixa.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p>Funcionário: <strong>{user?.nome}</strong></p>
                        <div>
                            <Label htmlFor="valorAbertura">Valor Inicial (R$)</Label>
                            <Input id="valorAbertura" type="number" step="0.01" min="0" value={valorAberturaInput} onWheel={(e)=>e.target.blur()} onChange={(e)=>setValorAberturaInput(e.target.value)} placeholder={(empresa.valor_inicial_caixa_padrao || 0).toFixed ? (parseFloat(empresa.valor_inicial_caixa_padrao).toFixed(2)) : '0.00'} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAbrirCaixa}>Abrir Caixa</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de FECHAMENTO DE CAIXA */}
            <Dialog open={isFechamentoModalOpen} onOpenChange={setIsFechamentoModalOpen}>
                <DialogContent style={{ width: '90vw', maxWidth: '1280px' }}>
                    <DialogHeader>
                        <DialogTitle>Fechamento de Caixa</DialogTitle>
                        <DialogDescription>Informe o valor contado para fechar o caixa.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p>Funcionário: <strong>{user?.nome}</strong></p>
                        <div>
                            <Label htmlFor="valorFechamento">Valor Contado (R$)</Label>
                            <Input id="valorFechamento" type="number" step="0.01" min="0" value={valorFechamentoInput} onWheel={(e)=>e.target.blur()} onChange={(e)=>setValorFechamentoInput(e.target.value)} placeholder="0.00" />
                        </div>
                        <div>
                            <Label htmlFor="observacoesFechamento">Observações</Label>
                            <Textarea id="observacoesFechamento" value={observacoesFechamento} onChange={(e)=>setObservacoesFechamento(e.target.value)} rows={2} />
                        </div>
                        {/* Detalhes de fechamento (lista simples) */}
                        {empresa.exibir_valores_fechamento_caixa && resumoCaixa && (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto">
                                {/* Card Resumo Caixa */}
                                <Card>
                                    <CardHeader className="flex items-center justify-between">
                                        <CardTitle>Valores do Caixa</CardTitle>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <HelpCircle className="w-4 h-4 text-gray-500 cursor-pointer" />
                                            </PopoverTrigger>
                                            <PopoverContent className="w-72 text-xs">
                                                <p><strong>Valor Inicial:</strong> Valor informado na abertura do caixa (troco).</p>
                                                <p className="mt-1"><strong>Total Pagamentos:</strong> Valores recebidos em dinheiro neste caixa.</p>
                                                <p className="mt-1"><strong>Suprimento:</strong> Quantias de dinheiro adicionadas após abertura.</p>
                                                <p className="mt-1"><strong>Sangria:</strong> Quantias retiradas do caixa.</p>
                                                <p className="mt-1"><strong>Valor (Sistema):</strong> Calculado: inicial + pagamentos + suprimento - sangria.</p>
                                            </PopoverContent>
                                        </Popover>
                                     </CardHeader>
                                     <CardContent className="text-sm space-y-1">
                                        <p>Valor Abertura: <strong>R$ {parseFloat(resumoCaixa.valor_abertura||0).toFixed(2).replace('.', ',')}</strong></p>
                                        <p>Total Pagamentos: <strong>R$ {parseFloat(resumoCaixa.total_pagamentos_sistema||0).toFixed(2).replace('.', ',')}</strong></p>
                                        <p>Total Suprimentos: <strong>R$ {parseFloat(resumoCaixa.total_suprimentos||0).toFixed(2).replace('.', ',')}</strong></p>
                                        <p>Total Sangrias: <strong>R$ {parseFloat(resumoCaixa.total_sangrias||0).toFixed(2).replace('.', ',')}</strong></p>
                                        <p className="font-bold text-base">Valor (Sistema): R$ {parseFloat(resumoCaixa.valor_fechamento_sistema_calculado||0).toFixed(2).replace('.', ',')}</p>
                                    </CardContent>
                                </Card>

                                {/* Card Totalizadores (valor atual) */}
                                {totalizadoresFP.length > 0 && (
                                    <Card>
                                        <CardHeader className="flex items-center justify-between">
                                            <CardTitle>Totalizadores (valor atual)</CardTitle>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <HelpCircle className="w-4 h-4 text-gray-500 cursor-pointer" />
                                                </PopoverTrigger>
                                                <PopoverContent className="w-72 text-xs">
                                                    <p>Mostra o saldo atual por forma de pagamento, já considerando suprimentos e sangrias.</p>
                                                    <p className="mt-1 text-[10px] italic">Obs: para Dinheiro não é contabilizado o valor inicial; considera-se apenas vendas, suprimentos e sangrias.</p>
                                                </PopoverContent>
                                            </Popover>
                                        </CardHeader>
                                        <CardContent className="text-sm space-y-1">
                                            {totalizadoresFP.map(fp => (
                                                <p key={fp.forma_pagamento_id}>{fp.forma_pagamento_descricao}: <strong>R$ {parseFloat(fp.valor_sistema_calculado_por_forma||0).toFixed(2).replace('.', ',')}</strong></p>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Card Faturamento bruto */}
                                {totalizadoresFP.length > 0 && (
                                    <Card>
                                        <CardHeader className="flex items-center justify-between">
                                            <CardTitle>Faturamento</CardTitle>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <HelpCircle className="w-4 h-4 text-gray-500 cursor-pointer" />
                                                </PopoverTrigger>
                                                <PopoverContent className="w-72 text-xs">
                                                    <p>Valores totais de faturamento por forma de pagamento, sem descontar suprimentos nem sangrias.</p>
                                                </PopoverContent>
                                            </Popover>
                                        </CardHeader>
                                        <CardContent className="text-sm space-y-1">
                                            {(faturamentoFP.formas.length>0 ? faturamentoFP.formas : totalizadoresFP).map(fp => (
                                                <p key={fp.forma_pagamento_id}>{fp.forma_pagamento_descricao}: <strong>R$ {parseFloat(fp.total_faturamento_por_forma || fp.total_pagamentos_sistema || 0).toFixed(2).replace('.', ',')}</strong></p>
                                            ))}
                                            {faturamentoFP.formas.length>0 && (
                                                <p className="mt-2 font-bold text-base">Total: R$ {parseFloat(faturamentoFP.total||0).toFixed(2).replace('.', ',')}</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter className="flex flex-wrap gap-2 justify-end">
                        <Button variant="secondary" onClick={()=>{setIsSuprimentoModalOpen(true);}}>Suprimento/Sangria</Button>
                        <Button variant="outline" onClick={()=>setIsFechamentoModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleFecharCaixa} className="bg-red-600 hover:bg-red-700 text-white">Fechar Caixa</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de SUPRIMENTO / SANGRIA */}
            <Dialog open={isSuprimentoModalOpen} onOpenChange={setIsSuprimentoModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Suprimento / Sangria</DialogTitle>
                        <DialogDescription>Registre uma movimentação de caixa.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p>Funcionário: <strong>{user?.nome}</strong></p>
                        <div>
                            <Label htmlFor="tipoMov">Tipo</Label>
                            <Select value={tipoMovimentacao} onValueChange={setTipoMovimentacao}>
                                <SelectTrigger id="tipoMov"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Suprimento">Suprimento</SelectItem>
                                    <SelectItem value="Sangria">Sangria</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="valorMov">Valor (R$)</Label>
                            <Input id="valorMov" type="number" step="0.01" min="0" value={valorMovimentacao} onWheel={(e)=>e.target.blur()} onChange={(e)=>setValorMovimentacao(e.target.value)} placeholder="0.00" />
                        </div>
                        <div>
                            <Label htmlFor="formaPagMov">Forma de Pagamento</Label>
                            <Select value={formaPagamentoMovId} onValueChange={setFormaPagamentoMovId}>
                                <SelectTrigger id="formaPagMov"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                    {formasPagamento.map(fp => (
                                        <SelectItem key={fp.id} value={fp.id.toString()}>{fp.descricao}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="obsMov">Observações</Label>
                            <Textarea id="obsMov" rows={2} value={observacoesMovimentacao} onChange={(e)=>setObservacoesMovimentacao(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={()=>setIsSuprimentoModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleRegistrarMovimentacao}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Confirmação Impressão Abertura */}
            <Dialog open={isPrintAberturaModalOpen} onOpenChange={setIsPrintAberturaModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Imprimir Comprovante?</DialogTitle>
                        <DialogDescription>Deseja imprimir o comprovante de abertura do caixa?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={()=>setIsPrintAberturaModalOpen(false)}>Não Imprimir</Button>
                        <Button onClick={()=>{ printCaixaAbertura(aberturaPrintData); setIsPrintAberturaModalOpen(false);} }>Sim, Imprimir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Confirmação Impressão Fechamento */}
            <Dialog open={isPrintFechamentoModalOpen} onOpenChange={setIsPrintFechamentoModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Imprimir Comprovante?</DialogTitle>
                        <DialogDescription>Deseja imprimir o comprovante de fechamento do caixa?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={()=>setIsPrintFechamentoModalOpen(false)}>Não Imprimir</Button>
                        <Button onClick={()=>{ if(fechamentoPrintData){ printCaixaFechamento(fechamentoPrintData.resp, fechamentoPrintData.resumo, fechamentoPrintData.totalizadores, fechamentoPrintData.faturamento);} setIsPrintFechamentoModalOpen(false);} }>Sim, Imprimir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Confirmação Impressão Movimentação */}
            <Dialog open={isPrintMovModalOpen} onOpenChange={setIsPrintMovModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Imprimir Comprovante?</DialogTitle>
                        <DialogDescription>Deseja imprimir o comprovante da movimentação de caixa?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={()=>setIsPrintMovModalOpen(false)}>Não Imprimir</Button>
                        <Button onClick={()=>{ if(movPrintData) { printMovimentacaoCupom(movPrintData);} setIsPrintMovModalOpen(false);} }>Sim, Imprimir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmação de Troco */}
            <Dialog open={isTrocoModalOpen} onOpenChange={setIsTrocoModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl font-bold text-green-600">
                            💰 Confirmação de Troco
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            Confirme que o troco foi entregue ao cliente
                        </DialogDescription>
                    </DialogHeader>
                    
                    {trocoData && (
                        <div className="py-4 space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-green-800 mb-2">
                                    R$ {trocoData.valorTroco.toFixed(2).replace('.', ',')}
                                </div>
                                <p className="text-green-700 font-semibold">Valor do Troco</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-gray-50 p-3 rounded">
                                    <p className="font-semibold text-gray-700">Valor da Conta:</p>
                                    <p className="text-lg">R$ {trocoData.valorConta.toFixed(2).replace('.', ',')}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded">
                                    <p className="font-semibold text-gray-700">Valor Recebido:</p>
                                    <p className="text-lg">R$ {trocoData.valorRecebido.toFixed(2).replace('.', ',')}</p>
                                </div>
                            </div>
                            
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p className="text-yellow-800 text-center font-semibold">
                                    ⚠️ Confirme que entregou R$ {trocoData.valorTroco.toFixed(2).replace('.', ',')} de troco ao cliente
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <DialogFooter className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={handleCancelarTroco}
                            disabled={trocoConfirmado}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleConfirmarTroco}
                            disabled={trocoConfirmado}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {trocoConfirmado ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Confirmando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Confirmar Troco
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmação de Impressão de Cupom */}
            <Dialog open={isPrintCupomModalOpen} onOpenChange={setIsPrintCupomModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl font-bold text-blue-600">
                            🖨️ Imprimir Cupom?
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            Deseja imprimir o cupom do pedido?
                        </DialogDescription>
                    </DialogHeader>
                    
                    {pedidoParaImprimir && (
                        <div className="py-4 space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                <div className="text-lg font-bold text-blue-800 mb-2">
                                    Pedido #{pedidoParaImprimir.numero_pedido}
                                </div>
                                <p className="text-blue-700 font-semibold text-base">
                                    Cliente: {pedidoParaImprimir.nome_cliente || pedidoParaImprimir.nome_cliente_convidado || 'Convidado'}
                                </p>
                                <div className="flex flex-col items-center mt-2 gap-1">
                                    <span className="text-gray-700 text-sm">Valor total:</span>
                                    <span className="text-2xl font-bold text-blue-900">R$ {(() => {
                                        const baseTotal = parseFloat(pedidoParaImprimir.valor_total || 0);
                                        const deliveryTax = (pedidoParaImprimir.tipo_entrega === 'Delivery' && empresa?.taxa_entrega) ? parseFloat(empresa.taxa_entrega) : 0;
                                        return (baseTotal + deliveryTax).toFixed(2).replace('.', ',');
                                    })()}</span>
                                </div>
                                {valorPagoUltimaOperacao !== null && (
                                    <div className="flex flex-col items-center mt-2 gap-1">
                                        <span className="text-gray-700 text-sm">Valor pago nesta operação:</span>
                                        <span className="text-xl font-bold text-green-700">R$ {parseFloat(valorPagoUltimaOperacao).toFixed(2).replace('.', ',')}</span>
                                    </div>
                                )}
                                {formaPagamentoUltimaOperacao && (
                                    <div className="flex flex-col items-center mt-2 gap-1">
                                        <span className="text-gray-700 text-sm">Forma de pagamento:</span>
                                        <span className="text-base font-semibold text-gray-800">{formaPagamentoUltimaOperacao}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <p className="text-gray-700 text-center">
                                    O cupom será impresso com todos os detalhes do pedido e pagamentos realizados.
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <DialogFooter className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={handleNaoImprimirCupom}
                        >
                            Não Imprimir
                        </Button>
                        <Button 
                            onClick={handleImprimirCupom}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Sim, Imprimir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CaixaPage;
