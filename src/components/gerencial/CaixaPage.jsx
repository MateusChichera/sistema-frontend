// frontend/src/components/gerencial/CaixaPage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
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

    const [pedidos, setPedidos] = useState([]);
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
                // Evita duplicatas ao adicionar um novo pedido
                if (prevPedidos.some(p => p.id === newOrder.id)) return prevPedidos;
                return [newOrder, ...prevPedidos];
            });
            toast.info(`Novo Pedido: #${newOrder.numero_pedido} (${newOrder.tipo_entrega})`);
        });

        socket.on('orderUpdated', (updatedOrder) => {
            console.log('Socket.IO: Pedido atualizado:', updatedOrder);
            setPedidos(prevPedidos => prevPedidos.map(p =>
                p.id === updatedOrder.id ? { ...p, ...updatedOrder } : p
            ));
            // Se o pedido atualizado for o que está aberto em qualquer modal, atualiza-o também
            if (selectedPedido && selectedPedido.id === updatedOrder.id) {
                setSelectedPedido(prev => ({ ...prev, ...updatedOrder }));
            }
            toast.info(`Pedido #${updatedOrder.numero_pedido || updatedOrder.id} atualizado para ${updatedOrder.status || 'novo status'}.`);
        });

        socket.on('orderFinalized', (finalizedOrder) => {
            console.log('Socket.IO: Pedido finalizado:', finalizedOrder);
            setPedidos(prevPedidos => prevPedidos.filter(p => p.id !== finalizedOrder.id));
            toast.success(`Pedido #${finalizedOrder.id} foi finalizado!`);
            // Se o pedido finalizado era o que estava aberto, fecha os modais
            if (selectedPedido && selectedPedido.id === finalizedOrder.id) {
                closePedidoDetailModal();
                closeItemDetailModal();
            }
        });

        socket.on('orderDeleted', (deletedOrder) => {
            console.log('Socket.IO: Pedido excluído:', deletedOrder);
            setPedidos(prevPedidos => prevPedidos.filter(p => p.id !== deletedOrder.id));
            toast.warning(`Pedido #${deletedOrder.id} foi excluído.`);
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
    }, [empresa?.id, user?.token, selectedPedido]);


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
            setPedidos(response.data);
            // toast.success("Pedidos do Caixa carregados!"); // Remover para evitar spam
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
            // Define uma forma de pagamento padrão se houver
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
        // Não reseta selectedPedido aqui para que o outro modal (finalização) ainda possa usá-lo se estiver aberto
        // setSelectedPedido(null); // Isso causaria o erro de undefined no outro modal
    };


    // Funções para o modal de finalização de pedido
    const openPedidoDetailModal = async (pedidoId) => {
        setLoadingFinalizacao(true);
        try {
            const response = await api.get(`/gerencial/${empresa.slug}/pedidos/${pedidoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const pedidoCompleto = response.data;
            setSelectedPedido(pedidoCompleto); // Define o pedido para o modal de finalização

            // Calcula o valor total do pedido incluindo taxa de entrega
            let totalGeral = parseFloat(pedidoCompleto.valor_total || 0);
            if (pedidoCompleto.tipo_entrega === 'Delivery' && empresa?.taxa_entrega) {
                totalGeral += parseFloat(empresa.taxa_entrega);
            }

            // Preenche o valor a ser cobrado manualmente com o restante a pagar
            const valorJaRecebido = parseFloat(pedidoCompleto.valor_recebido_parcial || 0);
            const restanteParaPagarInicial = Math.max(0, totalGeral - valorJaRecebido);

            setValorCobrancaManual(restanteParaPagarInicial.toFixed(2));
            // O valorRecebidoInput será preenchido pelo useEffect baseado no valorComDesconto
            setValorRecebidoInput(restanteParaPagarInicial.toFixed(2)); // Inicializa para não ficar vazio

            setDividirContaAtivo(false);
            setNumPessoasDividir('');
            setObservacoesPagamento('');
            // Reinicia a forma de pagamento selecionada para a primeira ativa, ou vazio
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

    // FUNÇÃO QUE ATUALIZA O STATUS DO PEDIDO (CANCELADO, ENTREGUE)
    const updatePedidoStatus = async (pedidoId, newStatus) => {
        setLoadingFinalizacao(true);
        try {
            await api.patch(`/gerencial/${empresa.slug}/pedidos/${pedidoId}`, {
                status: newStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(`Pedido ${newStatus === 'Entregue' ? 'finalizado' : 'cancelado'} com sucesso!`);
            // Se o pedido finalizado era o que estava aberto, fecha os modais
            if (selectedPedido && selectedPedido.id === pedidoId) {
                closePedidoDetailModal();
                closeItemDetailModal();
            }
            // O Socket.IO atualizará automaticamente a lista de pedidos no componente pai
        } catch (err) {
            toast.error(err.response?.data?.message || `Erro ao ${newStatus === 'Entregue' ? 'finalizar' : 'cancelar'} pedido.`);
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
        return Math.max(0, totalGeralPedidoOriginal - parseFloat(selectedPedido.valor_recebido_parcial || 0));
    }, [selectedPedido, totalGeralPedidoOriginal]);

    // VALOR BASE PARA CÁLCULO (O QUE O CAIXA DESEJA COBRAR)
    const valorBaseParaCalculo = useMemo(() => {
        const val = parseFloat(valorCobrancaManual) || 0;
        // Se o valor digitado for 0 (vazio) ou maior que o restante total, usa o restante total.
        // Isso impede que o "valor a cobrar" no campo seja mais do que o devido se o caixa não digitou nada ou digitou um valor excessivo.
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
        // Se a forma de pagamento NÃO for dinheiro, o valor recebido é o valor com desconto
        if (formaPagamento && formaPagamento.descricao.toLowerCase() !== 'dinheiro') {
            setValorRecebidoInput(valorComDesconto.toFixed(2));
        } else {
            // Se for dinheiro, o caixa pode precisar digitar o valor, então só preenche
            // automaticamente se o campo estiver vazio ou se o valorComDesconto for diferente
            // do que já está lá (evita sobrescrever o que o caixa digitou para troco).
            if (valorRecebidoInput === '' || parseFloat(valorRecebidoInput) === 0 || parseFloat(valorRecebidoInput).toFixed(2) !== valorComDesconto.toFixed(2)) {
                setValorRecebidoInput(valorComDesconto.toFixed(2));
            }
        }
    }, [valorComDesconto, selectedFormaPagamentoId, formasPagamento, valorCobrancaManual]); // Adicionado valorCobrancaManual na dependência


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
                // Revertido para o original: enviando TODOS os IDs dos itens
                // O backend deve usar o valor_pago para dar baixa no valor total do pedido.
                itens_cobrados_ids: selectedPedido.itens.map(item => item.id),
                dividir_conta_qtd_pessoas: dividirContaAtivo ? parseInt(numPessoasDividir) || 1 : null,
                observacoes_pagamento: observacoesPagamento
                // Removido 'valor_a_cobrar_nesta_operacao' para manter o payload original
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(`Pagamento de R$ ${parseFloat(valorRecebidoInput).toFixed(2).replace('.', ',')} registrado para o Pedido #${selectedPedido.numero_pedido}!`);
            closePedidoDetailModal();
            // A atualização do pedido na lista principal virá via Socket.IO ou no próximo fetch
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao finalizar pagamento.');
            console.error("Erro ao finalizar pagamento:", err);
        } finally {
            setLoadingFinalizacao(false);
        }
    };

    // Lógica para imprimir cupom
    // AGORA USA selectedPedido do estado, como antes
    const handlePrintCupom = () => {
        // Usa selectedPedido diretamente. O modal de detalhes de itens e de finalizar devem garantir que selectedPedido esteja preenchido.
        const pedidoToPrint = selectedPedido; 

        if (!pedidoToPrint || !empresa) {
            toast.error("Nenhum pedido ou dados da empresa disponíveis para impressão.");
            return;
        }

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) {
            toast.error("Não foi possível abrir a janela de impressão. Verifique pop-ups.");
            return;
        }

        // Calcule o total geral do pedido para o cupom (itens + taxa de entrega)
        const totalGeralPedidoCupom = parseFloat(pedidoToPrint.valor_total || 0) +
                                     (pedidoToPrint.tipo_entrega === 'Delivery' ? parseFloat(empresa?.taxa_entrega || 0) : 0);
        
        const valorRestanteAPagarCupom = Math.max(0, totalGeralPedidoCupom - parseFloat(pedidoToPrint.valor_recebido_parcial || 0));

        // Pega a descrição da última forma de pagamento registrada, se houver
        const lastPaymentFormaDesc = (pedidoToPrint.pagamentos_recebidos && pedidoToPrint.pagamentos_recebidos.length > 0)
            ? pedidoToPrint.pagamentos_recebidos[pedidoToPrint.pagamentos_recebidos.length - 1].forma_pagamento_descricao
            : 'Não informado'; // Ou use a forma de pagamento padrão se não houver pagamentos anteriores

        const cupomContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cupom Pedido #${pedidoToPrint.numero_pedido}</title>
                <style>
                    body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; color: #000; }
                    .container { width: 100%; max-width: 380px; margin: 0 auto; border: 0px solid #eee; padding: 10px; }
                    .header, .footer { text-align: center; margin-bottom: 15px; }
                    .header h2 { margin: 0; font-size: 16px; color: #333; }
                    .header p { margin: 2px 0; font-size: 10px; }
                    .section-title { font-weight: bold; margin-top: 10px; margin-bottom: 5px; border-bottom: 1px dashed #ccc; padding-bottom: 5px; }
                    .item { display: flex; justify-content: space-between; margin-bottom: 3px; }
                    .item-name { flex-grow: 1; text-align: left; }
                    .item-qty { width: 30px; text-align: center; }
                    .item-price, .item-total { width: 60px; text-align: right; }
                    .total-row { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 5px; border-top: 1px dashed #ccc; font-size: 14px; font-weight: bold; }
                    .footer-message { font-size: 10px; margin-top: 15px; }
                    .qr-code { text-align: center; margin-top: 20px; }

                    @media print {
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                        .container { width: 100%; margin: 0; padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        ${empresa.logo_full_url ? `<img src="${empresa.logo_full_url}" alt="Logo" style="max-width: 80px; margin-bottom: 10px;">` : ''}
                        <h2>${empresa.nome_fantasia || 'Seu Restaurante'}</h2>
                        <p>${empresa.razao_social || ''}</p>
                        <p>CNPJ: ${empresa.cnpj || 'Não informado'}</p>
                        <p>${pedidoToPrint.tipo_entrega === 'Delivery' && pedidoToPrint.endereco_entrega ? `Endereço: ${pedidoToPrint.endereco_entrega}` : empresa.endereco || ''}</p>
                        <p>Tel: ${empresa.telefone_contato || ''}</p>
                        <p>Email: ${empresa.email_contato || ''}</p>
                        <hr style="border: none; border-top: 1px dashed #ccc; margin: 15px 0;">
                    </div>

                    <div class="section-title">DETALHES DO PEDIDO</div>
                    <p><strong>Pedido #:</strong> ${pedidoToPrint.numero_pedido}</p>
                    <p><strong>Data:</strong> ${formatDateTime(pedidoToPrint.data_pedido)}</p>
                    <p><strong>Cliente:</strong> ${pedidoToPrint.nome_cliente || pedidoToPrint.nome_cliente_convidado || 'Convidado'}</p>
                    ${pedidoToPrint.tipo_entrega === 'Mesa' ? `<p><strong>Mesa:</strong> ${pedidoToPrint.numero_mesa || 'N/A'}</p>` : ''}
                    ${pedidoToPrint.tipo_entrega === 'Delivery' && pedidoToPrint.endereco_entrega ? `<p><strong>Endereço de Entrega:</strong> ${pedidoToPrint.endereco_entrega}</p>` : ''}
                    <p><strong>Tipo:</strong> ${pedidoToPrint.tipo_entrega}</p>
                    <p><strong>Obs:</strong> ${pedidoToPrint.observacoes || 'Nenhuma'}</p>
                    ${pedidoToPrint.nome_funcionario ? `<p><strong>Atendente:</strong> ${pedidoToPrint.nome_funcionario}</p>` : ''}

                    <div class="section-title">ITENS DO PEDIDO</div>
                    <div style="font-weight: bold; display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span class="item-name">Descrição</span>
                        <span class="item-qty">Qtd</span>
                        <span class="item-price">V. Unit</span>
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
    };


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
            return dateTimeString; // Retorna string original se houver erro
        }
    };

    const pedidosAbertos = useMemo(() => {
        return pedidos.filter(p => !['Entregue', 'Cancelado'].includes(p.status));
    }, [pedidos]);

    const pedidosFinalizados = useMemo(() => {
        return pedidos.filter(p => ['Entregue', 'Cancelado'].includes(p.status));
    }, [pedidos]);


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
                                {/* CORREÇÃO: Badge agora exibe Tipo de Entrega */}
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
                                {/* CORREÇÃO: CardDescription agora exibe o Cliente */}
                                <CardDescription className="text-sm flex justify-between items-center">
                                    <span>Cliente: {pedido.nome_cliente || pedido.nome_cliente_convidado || 'Convidado'}</span>
                                    {getStatusBadge(pedido.status)} {/* Status do pedido como badge ao lado do cliente */}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm pt-2">
                                <p>Valor Total: R$ {parseFloat(pedido.valor_total || 0).toFixed(2).replace('.', ',')}</p>
                                <p className="text-xs text-gray-500">Criado em: {formatDateTime(pedido.data_pedido)}</p>
                                <p className="text-xs text-gray-500">Recebido Parcial: R$ {parseFloat(pedido.valor_recebido_parcial || 0).toFixed(2).replace('.', ',')}</p>
                                <p className="font-semibold text-red-600">Falta Receber: R$ {Math.max(0, parseFloat(pedido.valor_total || 0) + (pedido.tipo_entrega === 'Delivery' ? parseFloat(empresa?.taxa_entrega || 0) : 0) - parseFloat(pedido.valor_recebido_parcial || 0)).toFixed(2).replace('.', ',')}</p>
                            </CardContent>
                            <CardFooter className="pt-2 flex justify-end gap-2">
                                {/* REMOVIDO: Botão "Ver Itens" da listagem principal */}
                                <Button onClick={() => openPedidoDetailModal(pedido.id)} size="sm">Finalizar</Button>
                                {/* REMOVIDO: Botão "Imprimir" da listagem principal */}
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
                                        {/* CORREÇÃO: Badge agora exibe Tipo de Entrega */}
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
                                        {/* CORREÇÃO: CardDescription agora exibe o Cliente */}
                                        <CardDescription className="text-sm flex justify-between items-center">
                                            <span>Cliente: {pedido.nome_cliente || pedido.nome_cliente_convidado || 'Convidado'}</span>
                                            {getStatusBadge(pedido.status)}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="text-sm pt-2">
                                        <p>Valor Total: R$ {parseFloat(pedido.valor_total || 0).toFixed(2).replace('.', ',')}</p>
                                        <p className="text-xs text-gray-500">Criado em: {formatDateTime(pedido.data_pedido)}</p>
                                        <p className="text-xs text-gray-500">Recebido Parcial: R$ {parseFloat(pedido.valor_recebido_parcial || 0).toFixed(2).replace('.', ',')}</p>
                                    </CardContent>
                                    <CardFooter className="pt-2 flex justify-end gap-2">
                                        {/* REMOVIDO: Botão "Ver Itens" da listagem principal */}
                                        {/* REMOVIDO: Botão "Imprimir" da listagem principal */}
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
                    {/* Renderiza o conteúdo APENAS se selectedPedido existir */}
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
                                        {/* Garante que selectedPedido.itens é um array, mesmo que vazio */}
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
                                {/* Botão Imprimir DENTRO DO MODAL DE ITENS */}
                                <Button onClick={handlePrintCupom} size="sm" variant="ghost" className="flex items-center">
                                    <Printer className="h-4 w-4 mr-1"/> Imprimir Cupom
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="animate-spin h-8 w-8 mr-2" /> Carregando itens do pedido...
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
                                                // O valorRecebidoInput será atualizado via useEffect, considerando o desconto
                                            }}
                                            placeholder="0.00"
                                            disabled={selectedPedido.status === 'Entregue' || selectedPedido.status === 'Cancelado'}
                                        />
                                        {/* Exibe o valor com desconto se o desconto for aplicado E o valorComDesconto for diferente do valorCobrancaManual */}
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
                                            // Habilita edição apenas se a forma de pagamento for "Dinheiro"
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
                                {/* Botão Imprimir DENTRO DO MODAL DE FINALIZAÇÃO */}
                                <Button onClick={handlePrintCupom} size="sm" variant="ghost" className="flex items-center">
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