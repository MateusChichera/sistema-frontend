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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import io from 'socket.io-client';


const CaixaPage = () => {
    const { empresa, loading: empresaLoading } = useEmpresa();
    const { user, token } = useAuth();

    const [pedidos, setPedidos] = useState([]); // Estado principal que guarda todos os pedidos
    const [loadingPedidos, setLoadingPedidos] = useState(true);
    const [error, setError] = useState(null);

    // Estados para os modais
    const [isPedidoDetailModalOpen, setIsPedidoDetailModalOpen] = useState(false); // Modal de finalização
    const [isItemDetailModalOpen, setIsItemDetailModalOpen] = useState(false); // Modal de detalhes dos itens

    // selectedPedido guarda o pedido COMPLETO que está sendo visualizado/finalizado
    const [selectedPedido, setSelectedPedido] = useState(null);

    // Estados para finalização do pagamento
    const [formasPagamento, setFormasPagamento] = useState([]);
    // valorCobrancaManual: Valor que o caixa quer cobrar (inicializa com o restante a pagar, mas é editável)
    const [valorCobrancaManual, setValorCobrancaManual] = useState('');
    // valorRecebidoInput: Valor que o cliente entregou (inicializa com valor de cobrança, editável para dinheiro)
    const [valorRecebidoInput, setValorRecebidoInput] = useState('');
    const [selectedFormaPagamentoId, setSelectedFormaPagamentoId] = useState('');
    const [observacoesPagamento, setObservacoesPagamento] = useState('');
    const [dividirContaAtivo, setDividirContaAtivo] = useState(false);
    const [numPessoasDividir, setNumPessoasDividir] = useState('');
    const [loadingFinalizacao, setLoadingFinalizacao] = useState(false);

    // Ref para o conteúdo a ser impresso
    const printContentRef = useRef(null);

    // Filtros
    const [filterStatus, setFilterStatus] = useState('Pendente,Preparando,Pronto');
    const [filterTipoEntrega, setFilterTipoEntrega] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

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

    // --- SOCKET.IO INTEGRATION ---
    useEffect(() => {
        if (!empresa?.id || !user?.token) return;

        const socket = io(import.meta.env.VITE_BACKEND_API_URL.replace('/api/v1', ''));

        socket.on('connect', () => {
            console.log('Socket.IO: Conectado ao servidor.');
            socket.emit('join_company_room', empresa.id);
        });

        socket.on('disconnect', () => {
            console.log('Socket.IO: Desconectado do servidor.');
        });

        socket.on('newOrder', (newOrder) => {
            console.log('Socket.IO: Novo pedido recebido:', newOrder);
            setPedidos(prevPedidos => {
                // Adiciona o novo pedido processado se não existir na lista
                if (prevPedidos.some(p => p.id === newOrder.id)) return prevPedidos;
                const updatedList = [processPedidoData(newOrder), ...prevPedidos];
                return updatedList.sort((a, b) => new Date(b.data_pedido).getTime() - new Date(a.data_pedido).getTime()); // Ordena por data (mais recente primeiro)
            });
            toast.info(`Novo Pedido: #${newOrder.numero_pedido} (${newOrder.tipo_entrega})`);
        });

        socket.on('orderUpdated', (updatedOrder) => {
            console.log('Socket.IO: Pedido atualizado:', updatedOrder);
            setPedidos(prevPedidos => {
                const processed = processPedidoData(updatedOrder); // Processa o pedido atualizado

                // Verifica se o pedido atualizado ainda deve estar visível com os filtros atuais
                const currentFilterStatuses = filterStatus.split(',');
                const isRelevantToFilter = currentFilterStatuses.includes('all') || currentFilterStatuses.includes(processed.status);
                
                const existsInList = prevPedidos.some(p => p.id === processed.id);

                let updatedList;
                if (isRelevantToFilter) {
                    if (existsInList) {
                        // Atualiza o pedido existente na lista
                        updatedList = prevPedidos.map(p => p.id === processed.id ? processed : p);
                    } else {
                        // Adiciona o pedido se ele se tornou relevante para o filtro e não estava na lista
                        updatedList = [processed, ...prevPedidos];
                    }
                } else {
                    // Remove o pedido se ele não é mais relevante para o filtro
                    updatedList = prevPedidos.filter(p => p.id !== processed.id);
                    if (existsInList) { // Notifica apenas se ele de fato foi removido por filtro
                         toast.info(`Pedido #${processed.numero_pedido} foi removido da visualização por filtro.`);
                    }
                }
                
                // Mantém a ordem: mais recente para o mais antigo
                updatedList.sort((a,b) => new Date(b.data_pedido).getTime() - new Date(a.data_pedido).getTime());
                
                return updatedList;
            });

            // Se o pedido atualizado for o que está aberto no modal, atualiza-o também
            if (selectedPedido && selectedPedido.id === updatedOrder.id) {
                setSelectedPedido(processPedidoData(updatedOrder));
            }
            toast.info(`Pedido #${updatedOrder.numero_pedido || updatedOrder.id} atualizado para ${updatedOrder.status || 'novo status'}.`);
        });

        socket.on('orderFinalized', (finalizedOrder) => {
            console.log('Socket.IO: Pedido finalizado:', finalizedOrder);
            setPedidos(prevPedidos => prevPedidos.filter(p => p.id !== finalizedOrder.id)); // Remove da lista de pedidos ativos
            toast.success(`Pedido #${finalizedOrder.numero_pedido || finalizedOrder.id} foi finalizado!`);
            // Se o pedido finalizado era o que estava aberto, fecha os modais
            if (selectedPedido && selectedPedido.id === finalizedOrder.id) {
                closePedidoDetailModal();
                closeItemDetailModal();
            }
        });

        socket.on('orderDeleted', (deletedOrder) => {
            console.log('Socket.IO: Pedido excluído:', deletedOrder);
            setPedidos(prevPedidos => prevPedidos.filter(p => p.id !== deletedOrder.id));
            toast.warning(`Pedido #${deletedOrder.numero_pedido || deletedOrder.id} foi excluído.`);
            if (selectedPedido && selectedPedido.id === deletedOrder.id) {
                closePedidoDetailModal();
                closeItemDetailModal();
            }
        });

        socket.on('mesaUpdated', (updatedMesa) => {
            console.log('Socket.IO: Mesa atualizada:', updatedMesa);
        });

        return () => {
            socket.emit('leave_company_room', empresa.id);
            socket.disconnect();
            console.log('Socket.IO: Componente CaixaPage desmontado, desconectando.');
        };
    }, [empresa?.id, user?.token, selectedPedido, filterStatus, processPedidoData]);


    const fetchPedidos = async () => {
        if (empresaLoading || !empresa || !empresa.slug || !user) {
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
            if (searchTerm) {
                queryParams.append('search', searchTerm);
            }

            const response = await api.get(`/gerencial/${empresa.slug}/pedidos?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Processa os pedidos carregados inicialmente para garantir a consistência
            const processedInitialPedidos = (response.data || []).map(processPedidoData);
            // Ordena os pedidos: mais recente para o mais antigo
            processedInitialPedidos.sort((a,b) => new Date(b.data_pedido).getTime() - new Date(a.data_pedido).getTime());
            setPedidos(processedInitialPedidos);
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao carregar pedidos para o Caixa.');
            console.error("Erro ao carregar pedidos:", err);
            toast.error(err.response?.data?.message || 'Erro ao carregar pedidos para o Caixa.');
        } finally {
            setLoadingPedidos(false);
        }
    };

    const fetchFormasPagamento = async () => {
        if (empresaLoading || !empresa || !empresa.slug) return;
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
        fetchPedidos();
        fetchFormasPagamento();
    }, [empresa, empresaLoading, user, filterStatus, filterTipoEntrega, searchTerm]);


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
            setValorRecebidoInput(restanteParaPagarInicial.toFixed(2)); 

            setDividirContaAtivo(false);
            setNumPessoasDividir('');
            setObservacoesPagamento('');
            setSelectedFormaPagamentoId(formasPagamento.length > 0 ? formasPagamento[0].id.toString() : '');


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
    };

    // FUNÇÃO QUE ATUALIZA O STATUS DO PEDIDO (APENAS CANCELAR A PARTIR DAQUI)
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


    // VALOR TOTAL DO PEDIDO (COM TAXA DE ENTREGA)
    const totalGeralPedidoOriginal = useMemo(() => {
        if (!selectedPedido) return 0;
        let total = parseFloat(selectedPedido.valor_total || 0);
        if (selectedPedido.tipo_entrega === 'Delivery' && empresa?.taxa_entrega) {
            total += parseFloat(empresa.taxa_entrega);
        }
        return total;
    }, [selectedPedido, empresa?.taxa_entrega]);

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
            if (valorRecebidoInput === '' || parseFloat(valorRecebidoInput) === 0 || Math.abs(parseFloat(valorRecebidoInput) - valorComDesconto) > 0.01) {
                setValorRecebidoInput(valorComDesconto.toFixed(2));
            }
        }
    }, [valorComDesconto, selectedFormaPagamentoId, formasPagamento]);


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
        if (!selectedPedido) {
            toast.error('Nenhum pedido selecionado para finalizar.');
            return;
        }
        if (!selectedFormaPagamentoId) {
            toast.error('Selecione uma forma de pagamento.');
            return;
        }
        const valorRecebido = parseFloat(valorRecebidoInput) || 0;
        if (valorRecebido <= 0) {
            toast.error('Informe o valor recebido.');
            return;
        }

        // Validação adicional: garante que o valor recebido não seja menor que o valor final a cobrar
        if (valorRecebido < valorAPagarNestaParcelaFinal) {
            toast.error('O valor recebido é menor que o valor a ser cobrado para esta operação.');
            return;
        }

        setLoadingFinalizacao(true);
        try {
            await api.post(`/gerencial/${empresa.slug}/pedidos/${selectedPedido.id}/finalizar`, {
                valor_pago: parseFloat(valorRecebidoInput), // Valor real recebido (para troco)
                forma_pagamento_id: parseInt(selectedFormaPagamentoId),
                itens_cobrados_ids: selectedPedido.itens.map(item => item.id), // Envia todos os IDs dos itens
                dividir_conta_qtd_pessoas: dividirContaAtivo ? parseInt(numPessoasDividir) || 1 : null,
                observacoes_pagamento: observacoesPagamento
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(`Pagamento de R$ ${parseFloat(valorRecebidoInput).toFixed(2).replace('.', ',')} registrado para o Pedido #${selectedPedido.numero_pedido}!`);
            closePedidoDetailModal();
            // A atualização da lista virá via Socket.IO (orderUpdated / orderFinalized)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao finalizar pagamento.');
            console.error("Erro ao finalizar pagamento:", err);
        } finally {
            setLoadingFinalizacao(false);
        }
    };

    // Lógica para imprimir cupom
    const handlePrintCupom = useCallback((pedidoToPrint) => { // Tornar useCallback para evitar re-criação
        if (!pedidoToPrint || !empresa) {
            toast.error("Nenhum pedido ou dados da empresa disponíveis para impressão.");
            return;
        }

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) {
            toast.error("Não foi possível abrir a janela de impressão. Verifique pop-ups.");
            return;
        }

        const totalGeralPedidoCupom = parseFloat(pedidoToPrint.valor_total || 0) +
                                     (pedidoToPrint.tipo_entrega === 'Delivery' ? parseFloat(empresa?.taxa_entrega || 0) : 0);
        
        const valorRestanteAPagarCupom = Math.max(0, totalGeralPedidoCupom - parseFloat(pedidoToPrint.valor_recebido_parcial || 0));

        const lastPaymentFormaDesc = (pedidoToPrint.pagamentos_recebidos && pedidoToPrint.pagamentos_recebidos.length > 0)
            ? pedidoToPrint.pagamentos_recebidos[pedidoToPrint.pagamentos_recebidos.length - 1].forma_pagamento_descricao
            : 'N/A';

        const cupomContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cupom Pedido #${pedidoToPrint.numero_pedido}</title>
                <style>
                    body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .container { width: 80mm; max-width: 80mm; margin: 0 auto; padding: 0; }
                    .header, .footer { text-align: center; margin-bottom: 10px; }
                    .header h2 { margin: 0; font-size: 14px; color: #000; }
                    .header p { margin: 1px 0; font-size: 9px; color: #000; }
                    .section-title { font-weight: bold; margin-top: 10px; margin-bottom: 5px; border-bottom: 1px dashed #000; padding-bottom: 3px; color: #000; }
                    .item { display: flex; justify-content: space-between; margin-bottom: 2px; }
                    .item-name { flex-grow: 1; text-align: left; }
                    .item-qty { width: 25px; text-align: center; }
                    /* CORRIGIDO: Alinhamento de R$ */
                    .item-price { display: inline-block; width: 45px; text-align: right; white-space: nowrap; padding-left: 2px; } /* Adicionado padding-left */
                    .item-total { display: inline-block; width: 50px; text-align: right; white-space: nowrap; }
                    .total-row { display: flex; justify-content: space-between; margin-top: 8px; padding-top: 4px; border-top: 1px dashed #000; font-size: 12px; font-weight: bold; color: #000; }
                    .footer-message { font-size: 9px; margin-top: 10px; color: #000; }
                    
                    /* Forçar preto e branco */
                    * { color: #000 !important; background-color: #FFF !important; }
                    hr { border-color: #000 !important; }
                    .total-row { border-color: #000 !important; }
                    .section-title { border-color: #000 !important; }
                    img { filter: grayscale(100%) brightness(0%); } /* Tenta deixar logo preto e branco */

                    @media print {
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                        .container { width: 80mm; margin: 0; padding: 0; }
                        button { display: none; }
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
                    <div class="total-row">
                        <span>TOTAL GERAL DO PEDIDO:</span>
                        <span>R$ ${totalGeralPedidoCupom.toFixed(2).replace('.', ',')}</span>
                    </div>

                    <div class="section-title">PAGAMENTOS</div>
                    ${(pedidoToPrint.pagamentos_recebidos && pedidoToPrint.pagamentos_recebidos.length > 0) ? pedidoToPrint.pagamentos_recebidos.map(pag => `
                        <p style="margin: 2px 0;">${format(parseISO(pag.data_pagamento), 'dd/MM HH:mm')} - ${pag.forma_pagamento_descricao}: R$ ${parseFloat(pag.valor_pago || 0).toFixed(2).replace('.', ',')}</p>
                    `).join('') : `<p>Nenhum pagamento registrado.</p>`}
                    <div class="total-row">
                        <span>RECEBIDO ATÉ AGORA:</span>
                        <span>R$ ${parseFloat(pedidoToPrint.valor_recebido_parcial || 0).toFixed(2).replace('.', ',')}</span>
                    </div>
                    ${valorRestanteAPagarCupom > 0 ? `
                    <div class="total-row" style="color: red;">
                        <span>FALTA PAGAR:</span>
                        <span>R$ ${valorRestanteAPagarCupom.toFixed(2).replace('.', ',')}</span>
                    </div>` : ''}

                    <div class="footer">
                        <p class="footer-message">Última Forma de Pagamento: ${lastPaymentFormaDesc}</p>
                        <p class="footer-message">Obrigado pela preferência!</p>
                        <p class="footer-message">${empresa?.mensagem_confirmacao_pedido || ''}</p>
                        <p class="footer-message">Emitido em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
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
    }, [empresa]);


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
            const matchesSearch = searchTerm === '' || 
                                  p.numero_pedido.includes(searchTerm) || 
                                  (p.nome_cliente && p.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                  (p.nome_cliente_convidado && p.nome_cliente_convidado.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesTipoEntrega && matchesSearch;
        });

        if (filterStatus === 'all') {
            return currentPedidos;
        } else {
            const statusesToShow = filterStatus.split(',');
            return currentPedidos.filter(p => statusesToShow.includes(p.status));
        }
    }, [pedidos, filterStatus, filterTipoEntrega, searchTerm]);


    const pedidosAbertos = useMemo(() => {
        // Pedidos "ativos" são aqueles que a cozinha ainda está trabalhando ou que o caixa ainda não finalizou
        return pedidosFiltrados.filter(p => !['Entregue', 'Cancelado'].includes(p.status));
    }, [pedidosFiltrados]);

    const pedidosFinalizados = useMemo(() => {
        // Pedidos "finalizados" são Entregues ou Cancelados
        return pedidosFiltrados.filter(p => ['Entregue', 'Cancelado'].includes(p.status));
    }, [pedidosFiltrados]);


    const canFinalizeOrder = user?.role && ['Proprietario', 'Caixa', 'Gerente'].includes(user.role);


    if (empresaLoading || !empresa) {
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
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Caixa - {empresa.nome_fantasia}</h2>

            <div className="mb-6 p-4 border rounded-lg bg-gray-50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
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
            </div>

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
                                    <span>Cliente: {pedido.nome_cliente || pedido.nome_cliente_convidado || 'Convidado'}</span>
                                    {getStatusBadge(pedido.status)}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm pt-2">
                                <p>Valor Total: R$ {parseFloat(pedido.valor_total || 0).toFixed(2).replace('.', ',')}</p>
                                <p className="text-xs text-gray-500">Criado em: {formatDateTime(pedido.data_pedido)}</p>
                                <p className="text-xs text-gray-500">Recebido Parcial: R$ {parseFloat(pedido.valor_recebido_parcial || 0).toFixed(2).replace('.', ',')}</p>
                                <p className="font-semibold text-red-600">Falta Receber: R$ {Math.max(0, parseFloat(pedido.valor_total || 0) + (pedido.tipo_entrega === 'Delivery' ? parseFloat(empresa?.taxa_entrega || 0) : 0) - parseFloat(pedido.valor_recebido_parcial || 0)).toFixed(2).replace('.', ',')}</p>
                                <div className="mt-2 flex justify-end">
                                    {getPagamentoStatusBadge(pedido)}
                                </div>
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
                                            <span>Cliente: {pedido.nome_cliente || pedido.nome_cliente_convidado || 'Convidado'}</span>
                                            {getStatusBadge(pedido.status)}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="text-sm pt-2">
                                        <p>Valor Total: R$ {parseFloat(pedido.valor_total || 0).toFixed(2).replace('.', ',')}</p>
                                        <p className="text-xs text-gray-500">Criado em: {formatDateTime(pedido.data_pedido)}</p>
                                        <p className="text-xs text-gray-500">Recebido Parcial: R$ {parseFloat(pedido.valor_recebido_parcial || 0).toFixed(2).replace('.', ',')}</p>
                                        <div className="mt-2 flex justify-end">
                                            {getPagamentoStatusBadge(pedido)}
                                        </div>
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
                                                <TableCell>{item.nome_produto} {item.observacoes && `(${item.observacoes})`}</TableCell>
                                                <TableCell className="text-right">{item.quantidade}</TableCell>
                                                <TableCell className="text-right">R$ {parseFloat(item.preco_unitario || 0).toFixed(2).replace('.', ',')}</TableCell>
                                                <TableCell className="text-right">R$ ${(parseFloat(item.quantidade || 0) * parseFloat(item.preco_unitario || 0)).toFixed(2).replace('.', ',')}</TableCell>
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
                                            disabled={selectedPedido.status === 'Entregue' || selectedPedido.status === 'Cancelado' || (formasPagamento.find(fp => fp.id.toString() === selectedFormaPagamentoId)?.descricao.toLowerCase() !== 'dinheiro')}
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

                                    {/* Botão Finalizar Pagamento - Único botão de ação principal */}
                                    {selectedPedido.status !== 'Entregue' && selectedPedido.status !== 'Cancelado' && (
                                        <Button onClick={handleFinalizarPagamento} className="mt-4 w-full flex items-center" disabled={loadingFinalizacao}>
                                            {loadingFinalizacao ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <CheckCircle className="h-5 w-5 mr-2" />}
                                            Finalizar Pagamento
                                        </Button>
                                    )}

                                    {/* MANTIDO PARA EXIBIR STATUS APÓS FINALIZAÇÃO/CANCELAMENTO (apenas visual) */}
                                    {selectedPedido.status === 'Entregue' && (
                                        <Badge className="bg-green-500 text-white text-center py-2 w-full mt-4">Pedido Finalizado</Badge>
                                    )}
                                    {selectedPedido.status === 'Cancelado' && (
                                        <Badge className="bg-red-500 text-white text-center py-2 w-full mt-4">Pedido Cancelado</Badge>
                                    )}
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
        </div>
    );
};

export default CaixaPage;