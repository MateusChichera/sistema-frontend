import React, { useState, useEffect, useCallback } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Loader2, Search as SearchIcon, Plus as PlusIcon, DollarSign as DollarIcon, User as UserIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

const RecebimentoContasPage = () => {
    const { empresa, loading: empresaLoading, isReady } = useEmpresa();
    const { user, token } = useAuth();

    const [titulos, setTitulos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [clientes, setClientes] = useState([]);
    const [loadingClientes, setLoadingClientes] = useState(false);
    const [selectedTitulo, setSelectedTitulo] = useState(null);
    const [showPagamentoModal, setShowPagamentoModal] = useState(false);
    const [valorPagamento, setValorPagamento] = useState('');
    const [observacoesPagamento, setObservacoesPagamento] = useState('');
    const [tipoPagamento, setTipoPagamento] = useState('total'); // 'total' ou 'parcial'
    const [formasPagamento, setFormasPagamento] = useState([]);
    const [formaPagamentoId, setFormaPagamentoId] = useState('');
    const [showComprovanteModal, setShowComprovanteModal] = useState(false);
    const [comprovanteData, setComprovanteData] = useState(null);
    const [saldoCliente, setSaldoCliente] = useState(null);
    
    // Estados para confirmação de impressão de comprovante
    const [isPrintComprovanteModalOpen, setIsPrintComprovanteModalOpen] = useState(false);
    const [comprovantePrintData, setComprovantePrintData] = useState(null);
    
    // Estados para pagamento múltiplo
    const [showPagamentoMultiploModal, setShowPagamentoMultiploModal] = useState(false);
    const [valorTotalPagamentoMultiplo, setValorTotalPagamentoMultiplo] = useState('');
    const [observacoesPagamentoMultiplo, setObservacoesPagamentoMultiplo] = useState('');
    const [formaPagamentoIdMultiplo, setFormaPagamentoIdMultiplo] = useState('');
    
    // Estados para histórico do cliente
    const [showHistoricoModal, setShowHistoricoModal] = useState(false);
    const [historicoCliente, setHistoricoCliente] = useState(null);
    const [loadingHistorico, setLoadingHistorico] = useState(false);
    const [filtroDataInicio, setFiltroDataInicio] = useState('');
    const [filtroDataFim, setFiltroDataFim] = useState('');
    
    // Novos estados para seleção múltipla
    const [titulosSelecionados, setTitulosSelecionados] = useState([]);
    const [cobrarJuros, setCobrarJuros] = useState(true);
    const [showDetalhesModal, setShowDetalhesModal] = useState(false);
    const [detalhesTitulos, setDetalhesTitulos] = useState([]);

    // Funções para seleção múltipla
    const toggleTituloSelecionado = (tituloId) => {
        setTitulosSelecionados(prev => {
            if (prev.includes(tituloId)) {
                return prev.filter(id => id !== tituloId);
            } else {
                return [...prev, tituloId];
            }
        });
    };

    const selecionarTodos = () => {
        const todosIds = titulos.map(t => t.id);
        setTitulosSelecionados(todosIds);
    };

    const deselecionarTodos = () => {
        setTitulosSelecionados([]);
    };

    // Função para calcular o valor total com juros dos títulos selecionados (nova lógica)
    const calcularValorTotalComJuros = () => {
        const titulosSelecionadosData = titulos.filter(t => titulosSelecionados.includes(t.id));
        
        let valorTotal = 0;
        let jurosTotal = 0;
        
        titulosSelecionadosData.forEach(titulo => {
            const valorRestante = parseFloat(titulo.valor_restante || 0);
            let jurosCalculado = 0;
            
            // Calcular juros se cobrarJuros estiver ativo e título estiver vencido
            if (cobrarJuros && new Date(titulo.data_vencimento) < new Date()) {
                const diasAtraso = Math.ceil((new Date() - new Date(titulo.data_vencimento)) / (1000 * 60 * 60 * 24));
                const taxaJuros = parseFloat(empresa?.juros_titulos || 0);
                jurosCalculado = (valorRestante * (taxaJuros / 100) * diasAtraso) / 30;
            }
            
            valorTotal += valorRestante;
            jurosTotal += jurosCalculado;
        });
        
        return {
            valorTotal: Number(valorTotal.toFixed(2)),
            jurosTotal: Number(jurosTotal.toFixed(2)),
            totalComJuros: Number((valorTotal + jurosTotal).toFixed(2))
        };
    };

    // Calcular totais dos títulos selecionados
    const calcularTotaisSelecionados = () => {
        const titulosSelecionadosData = titulos.filter(t => titulosSelecionados.includes(t.id));
        
        let valorTotal = 0;
        let valorJuros = 0;
        let valorTotalComJuros = 0;
        let titulosVencidos = 0;

        titulosSelecionadosData.forEach(titulo => {
            const valorRestante = parseFloat(titulo.valor_restante) || 0;
            valorTotal += valorRestante;
            
            if (cobrarJuros && titulo.juros_calculado) {
                const juros = parseFloat(titulo.juros_calculado) || 0;
                valorJuros += juros;
            }
            
            if (titulo.situacao_titulo === 'Vencido') {
                titulosVencidos++;
            }
        });

        valorTotalComJuros = valorTotal + valorJuros;

        return {
            valorTotal: Number(valorTotal) || 0,
            valorJuros: Number(valorJuros) || 0,
            valorTotalComJuros: Number(valorTotalComJuros) || 0,
            titulosVencidos: Number(titulosVencidos) || 0,
            quantidade: Number(titulosSelecionadosData.length) || 0
        };
    };

    const totais = calcularTotaisSelecionados();

    // Função para realizar pagamento múltiplo
    const handlePagamentoMultiplo = async () => {
        if (titulosSelecionados.length === 0) {
            toast.error('Selecione pelo menos um título');
            return;
        }

        if (!formaPagamentoIdMultiplo) {
            toast.error('Selecione uma forma de pagamento');
            return;
        }

        const valorTotalPago = parseFloat(valorTotalPagamentoMultiplo);
        if (!valorTotalPago || valorTotalPago <= 0) {
            toast.error('Digite um valor válido para o pagamento');
            return;
        }

        const totaisCalculados = calcularValorTotalComJuros();
        const valorMaximo = totaisCalculados.totalComJuros;
        
        if (valorTotalPago > valorMaximo) {
            toast.error(`Valor não pode ser maior que R$ ${valorMaximo.toFixed(2).replace('.', ',')}`);
            return;
        }

        try {
            const response = await api.post(
                `/gerencial/${empresa.slug}/contas-prazo/titulos/pagamento-multiplo`,
                {
                    titulos_ids: titulosSelecionados,
                    valor_total_pago: valorTotalPago,
                    forma_pagamento_id: formaPagamentoIdMultiplo,
                    observacoes: observacoesPagamentoMultiplo,
                    cobrar_juros: cobrarJuros
                }
            );

            if (response.data.success) {
                toast.success(`Pagamento distribuído em ${response.data.pagamentos_criados} título(s)!`);
                
                // Limpar seleção e modais
                setTitulosSelecionados([]);
                setObservacoesPagamentoMultiplo('');
                setValorTotalPagamentoMultiplo('');
                setFormaPagamentoIdMultiplo('');
                setCobrarJuros(false);
                setShowPagamentoMultiploModal(false);
                
                // Recarregar títulos
                await fetchTitulos(selectedCliente.id);
                
                // Mostrar confirmação de impressão
                setTimeout(() => {
                    setComprovantePrintData({
                        dadosPagamento: response.data,
                        tipoComprovante: 'multiplo',
                        tipoPagamento: 'parcial'
                    });
                    setIsPrintComprovanteModalOpen(true);
                }, 1000);
            }
        } catch (error) {
            console.error('Erro ao realizar pagamento múltiplo:', error);
            toast.error('Erro ao realizar pagamento: ' + (error.response?.data?.message || error.message));
        }
    };

    // Função para receber pagamento total
    const handleReceberTotal = async () => {
        console.log('handleReceberTotal - formaPagamentoId:', formaPagamentoId);
        console.log('handleReceberTotal - titulosSelecionados:', titulosSelecionados);
        
        if (titulosSelecionados.length === 0) {
            toast.error('Selecione pelo menos um título');
            return;
        }

        if (!formaPagamentoId) {
            console.log('Forma de pagamento não selecionada:', formaPagamentoId);
            toast.error('Selecione uma forma de pagamento');
            return;
        }

        try {
            const totais = calcularTotaisSelecionados();
            const valorTotal = cobrarJuros ? totais.valorTotalComJuros : totais.valorTotal;

            const response = await api.post(
                `/gerencial/${empresa.slug}/contas-prazo/titulos/pagamento-multiplo`,
                {
                    titulos_ids: titulosSelecionados,
                    valor_total_pago: valorTotal,
                    forma_pagamento_id: formaPagamentoId,
                    observacoes: observacoesPagamento || `Pagamento total${cobrarJuros ? ' com juros' : ' sem juros'}`,
                    cobrar_juros: cobrarJuros
                }
            );

            if (response.data.success) {
                toast.success('Pagamento realizado com sucesso!');
                
                // Limpar seleção
                setTitulosSelecionados([]);
                setObservacoesPagamento('');
                setFormaPagamentoId('');
                setCobrarJuros(false);
                
                // Recarregar títulos
                await fetchTitulos(selectedCliente.id);
                
                // Mostrar confirmação de impressão
                setTimeout(() => {
                    setComprovantePrintData({
                        dadosPagamento: response.data,
                        tipoComprovante: 'multiplo',
                        tipoPagamento: 'total'
                    });
                    setIsPrintComprovanteModalOpen(true);
                }, 1000);
            }
        } catch (error) {
            console.error('Erro ao realizar pagamento:', error);
            toast.error('Erro ao realizar pagamento: ' + (error.response?.data?.message || error.message));
        }
    };

    // Função para receber pagamento parcial
    const handleReceberParcial = async () => {
        if (titulosSelecionados.length === 0) {
            toast.error('Selecione pelo menos um título');
            return;
        }

        if (!formaPagamentoId) {
            toast.error('Selecione uma forma de pagamento');
            return;
        }

        // Para pagamento parcial, vamos processar o primeiro título selecionado
        const primeiroTitulo = titulos.find(t => t.id === titulosSelecionados[0]);
        if (!primeiroTitulo) {
            toast.error('Título não encontrado');
            return;
        }

        // Carregar formas de pagamento antes de abrir o modal
        await fetchFormasPagamento();

        // Abrir modal para definir valor parcial
        setSelectedTitulo(primeiroTitulo);
        setShowPagamentoModal(true);
        setTipoPagamento('parcial');
        setValorPagamento(totais.valorTotalComJuros.toFixed(2));
    };

    // Função para mostrar detalhes dos títulos selecionados
    const handleMostrarDetalhes = async () => {
        if (titulosSelecionados.length === 0) {
            toast.error('Selecione pelo menos um título');
            return;
        }

        try {
            setLoading(true);
            
            // Buscar detalhes de cada título selecionado
            const detalhesPromises = titulosSelecionados.map(async (tituloId) => {
                const response = await api.get(`/gerencial/${empresa.slug}/contas-prazo/titulos/${tituloId}/detalhes`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                return response.data.data;
            });

            const detalhes = await Promise.all(detalhesPromises);
            setDetalhesTitulos(detalhes);
            setShowDetalhesModal(true);
            
        } catch (err) {
            console.error('Erro ao buscar detalhes:', err);
            toast.error('Erro ao carregar detalhes dos títulos');
        } finally {
            setLoading(false);
        }
    };

    // Função para buscar clientes
    const fetchClientes = useCallback(async (termo) => {
        if (!termo || termo.length < 2) {
            setClientes([]);
            return;
        }

        setLoadingClientes(true);
        try {
            const response = await api.get(`/gerencial/${empresa.slug}/contas-prazo/clientes/buscar?search=${encodeURIComponent(termo)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClientes(response.data || []);
        } catch (err) {
            console.error("Erro ao buscar clientes:", err);
            toast.error('Erro ao buscar clientes');
        } finally {
            setLoadingClientes(false);
        }
    }, [empresa, token]);

    // Função para buscar formas de pagamento
    const fetchFormasPagamento = useCallback(async () => {
        if (!isReady || empresaLoading || !empresa?.slug || !user) {
            return;
        }

        try {
            const response = await api.get(`/gerencial/${empresa.slug}/formas-pagamento`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormasPagamento(response.data || []);
        } catch (err) {
            console.error("Erro ao carregar formas de pagamento:", err);
            toast.error('Erro ao carregar formas de pagamento');
        }
    }, [empresa, empresaLoading, isReady, user, token]);

    // Função para buscar dados do comprovante
    const fetchComprovanteData = useCallback(async (tituloId) => {
        try {
            const response = await api.get(`/gerencial/${empresa.slug}/comprovantes/titulos/${tituloId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setComprovanteData(response.data);
        } catch (err) {
            console.error("Erro ao carregar dados do comprovante:", err);
            toast.error('Erro ao carregar dados do comprovante');
        }
    }, [empresa, token]);

    // Função para buscar saldo do cliente
    const fetchSaldoCliente = useCallback(async (clienteId) => {
        try {
            const response = await api.get(`/gerencial/${empresa.slug}/comprovantes/clientes/${clienteId}/titulos-abertos`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSaldoCliente(response.data);
        } catch (err) {
            console.error("Erro ao carregar saldo do cliente:", err);
            toast.error('Erro ao carregar saldo do cliente');
        }
    }, [empresa, token]);

    // Função para gerar comprovante simples no frontend
    // Funções para lidar com a impressão de comprovante
    const handleImprimirComprovante = () => {
        if (comprovantePrintData?.tipoComprovante === 'multiplo') {
            gerarComprovanteMultiplo(comprovantePrintData.dadosPagamento);
        } else if (comprovantePrintData?.titulo) {
            gerarComprovanteSimples(
                comprovantePrintData.titulo, 
                comprovantePrintData.valorPago, 
                comprovantePrintData.tipoPagamento
            );
        }
        setIsPrintComprovanteModalOpen(false);
        setComprovantePrintData(null);
    };

    const handleNaoImprimirComprovante = () => {
        setIsPrintComprovanteModalOpen(false);
        setComprovantePrintData(null);
    };

    // Função para buscar histórico completo do cliente
    const buscarHistoricoCliente = async (clienteId) => {
        try {
            setLoadingHistorico(true);
            const response = await api.get(
                `/gerencial/${empresa.slug}/contas-prazo/clientes/${clienteId}/historico`
            );

            if (response.data.success) {
                setHistoricoCliente(response.data.data);
                setShowHistoricoModal(true);
            }
        } catch (error) {
            console.error('Erro ao buscar histórico do cliente:', error);
            toast.error('Erro ao carregar histórico do cliente: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoadingHistorico(false);
        }
    };

    // Função para filtrar títulos por data de emissão
    const filtrarTitulosPorData = (titulos) => {
        if (!filtroDataInicio && !filtroDataFim) {
            return titulos;
        }

        return titulos.filter(titulo => {
            const dataEmissao = new Date(titulo.data_emissao);
            
            if (filtroDataInicio && filtroDataFim) {
                const dataInicio = new Date(filtroDataInicio);
                const dataFim = new Date(filtroDataFim);
                return dataEmissao >= dataInicio && dataEmissao <= dataFim;
            } else if (filtroDataInicio) {
                const dataInicio = new Date(filtroDataInicio);
                return dataEmissao >= dataInicio;
            } else if (filtroDataFim) {
                const dataFim = new Date(filtroDataFim);
                return dataEmissao <= dataFim;
            }
            
            return true;
        });
    };

    // Função para reimprimir comprovante
    const reimprimirComprovante = (pagamento) => {
        // Buscar o título completo do histórico
        const tituloCompleto = historicoCliente.titulos.find(t => t.id === pagamento.titulo_id);
        
        // Criar dados do comprovante baseado no pagamento
        const comprovanteData = {
            titulo: {
                ...tituloCompleto,
                cliente_nome: tituloCompleto?.cliente_nome || historicoCliente.cliente.nome,
                cliente_telefone: tituloCompleto?.cliente_telefone || historicoCliente.cliente.telefone,
                numero_titulo: tituloCompleto?.numero_titulo,
                valor_total: tituloCompleto?.valor_total,
                valor_pago: pagamento.valor_pago,
                valor_restante: parseFloat(tituloCompleto?.valor_total || 0) - parseFloat(pagamento.valor_pago || 0)
            },
            valorPago: pagamento.valor_pago,
            tipoPagamento: parseFloat(tituloCompleto?.valor_total || 0) === parseFloat(pagamento.valor_pago || 0) ? 'total' : 'parcial',
            tipoComprovante: 'simples'
        };
        
        setComprovantePrintData(comprovanteData);
        setIsPrintComprovanteModalOpen(true);
    };

     // Função para gerar comprovante múltiplo
     const gerarComprovanteMultiplo = (dadosPagamento) => {
         const { titulos_atualizados, valor_total_distribuido, resumo_distribuicao } = dadosPagamento;
         
         const primeiroTitulo = titulos_atualizados[0];
         const clienteNome = primeiroTitulo?.cliente_nome || 'Cliente não informado';
         const clienteTelefone = primeiroTitulo?.cliente_telefone || 'Telefone não informado';
         
         // Buscar forma de pagamento correta baseada no tipo de pagamento
         let formaPagamento;
         if (comprovantePrintData?.tipoPagamento === 'total') {
             formaPagamento = formasPagamento.find(fp => fp.id === parseInt(formaPagamentoId));
         } else {
             // Para pagamento parcial, usar formaPagamentoId se formaPagamentoIdMultiplo estiver vazio
             const idParaBuscar = formaPagamentoIdMultiplo || formaPagamentoId;
             formaPagamento = formasPagamento.find(fp => fp.id === parseInt(idParaBuscar));
         }
         const formaPagamentoNome = formaPagamento?.descricao || formaPagamento?.nome || 'Forma de pagamento não informada';
         
         // Calcular valor em aberto (saldo total do cliente após o pagamento)
         // Primeiro, vamos recalcular o saldo total considerando os títulos atualizados
         const saldoTotalCliente = titulos.reduce((total, t) => {
             return total + parseFloat(t.valor_restante || 0);
         }, 0);
         
         // O valor em aberto é o saldo total menos o valor pago
         // Mas se der negativo, significa que pagou mais que o saldo, então deve ser 0
         const valorEmAberto = Math.max(0, saldoTotalCliente - valor_total_distribuido);
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Comprovante de Pagamento</title>
                <style>
                    @media print {
                        @page { margin: 0; size: 80mm auto; }
                        body { margin: 0; padding: 0; }
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 11px;
                        line-height: 1.2;
                        width: 80mm;
                        margin: 0;
                        padding: 8px;
                        background: white;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 1px solid #000;
                        padding-bottom: 8px;
                        margin-bottom: 8px;
                    }
                    .empresa-nome {
                        font-weight: bold;
                        font-size: 14px;
                        margin-bottom: 4px;
                    }
                    .empresa-info {
                        font-size: 10px;
                        margin-bottom: 2px;
                    }
                    .titulo {
                        text-align: center;
                        font-weight: bold;
                        font-size: 13px;
                        margin: 8px 0;
                        text-decoration: underline;
                    }
                    .cliente-section {
                        margin-bottom: 8px;
                        padding: 4px;
                        background: #f5f5f5;
                        border-radius: 3px;
                    }
                    .cliente-info {
                        margin-bottom: 2px;
                    }
                    .pagamento-section {
                        margin-bottom: 8px;
                    }
                    .pagamento-item {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 2px;
                        padding: 2px 0;
                        border-bottom: 1px dotted #ccc;
                    }
                    .valor {
                        font-weight: bold;
                    }
                    .footer {
                        border-top: 1px solid #000;
                        padding-top: 8px;
                        margin-top: 8px;
                        text-align: center;
                    }
                    .total-section {
                        margin: 8px 0;
                        padding: 4px;
                        background: #e8f4fd;
                        border-radius: 3px;
                    }
                    .total-item {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 2px;
                    }
                    .total-final {
                        font-weight: bold;
                        font-size: 12px;
                        border-top: 1px solid #000;
                        padding-top: 4px;
                        margin-top: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="empresa-nome">${empresa?.nome_fantasia || empresa?.razao_social || 'Empresa'}</div>
                    <div class="empresa-info">CNPJ: ${empresa?.cnpj || 'Não informado'}</div>
                    <div class="empresa-info">${empresa?.endereco || 'Endereço não informado'}</div>
                    <div class="empresa-info">Tel: ${empresa?.telefone_contato || 'Não informado'}</div>
                </div>
                
                 <div class="titulo">COMPROVANTE DE PAGAMENTO</div>
                
                <div class="cliente-section">
                    <div class="cliente-info"><strong>Cliente:</strong> ${clienteNome}</div>
                    <div class="cliente-info"><strong>Telefone:</strong> ${clienteTelefone}</div>
                    <div class="cliente-info"><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                
                <div class="pagamento-section">
                    <div style="font-weight: bold; margin-bottom: 4px;">DISTRIBUIÇÃO DO PAGAMENTO:</div>
                    ${resumo_distribuicao.map(pagamento => `
                        <div class="pagamento-item">
                            <span>Título #${pagamento.titulo_id}:</span>
                            <span class="valor">R$ ${pagamento.valor_pago.toFixed(2).replace('.', ',')}</span>
                        </div>
                        ${pagamento.juros_incluido > 0 ? `
                            <div class="pagamento-item" style="margin-left: 10px; font-size: 10px; color: #666;">
                                <span>Juros:</span>
                                <span>R$ ${pagamento.juros_incluido.toFixed(2).replace('.', ',')}</span>
                            </div>
                        ` : ''}
                    `).join('')}
                </div>
                
                 <div class="total-section">
                     <div class="total-item">
                         <span>Valor Total Pago:</span>
                         <span class="valor">R$ ${valor_total_distribuido.toFixed(2).replace('.', ',')}</span>
                     </div>
                     <div class="total-item">
                         <span>Forma de Pagamento:</span>
                         <span>${formaPagamentoNome}</span>
                     </div>
                     <div class="total-item">
                         <span>Valor em Aberto:</span>
                         <span class="valor">R$ ${Math.max(0, valorEmAberto).toFixed(2).replace('.', ',')}</span>
                     </div>
                 </div>
                
                <div class="footer">
                    <div style="font-size: 10px; margin-top: 8px;">
                        ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style="font-size: 9px; margin-top: 4px; color: #666;">
                        Comprovante gerado automaticamente
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    const gerarComprovanteSimples = (titulo, valorPago, tipoPagamento) => {
        const valorRestante = tipoPagamento === 'total' ? 0 : parseFloat(titulo.valor_total || 0) - parseFloat(valorPago);
        const formaPagamento = formasPagamento.find(f => f.id.toString() === formaPagamentoId);
        const formaPagamentoNome = formaPagamento?.descricao || formaPagamento?.nome || 'Forma de pagamento não informada';
        
        // Buscar saldo total do cliente (todos os títulos em aberto)
        const saldoTotalCliente = titulos.reduce((total, t) => {
            return total + parseFloat(t.valor_restante || 0);
        }, 0);
        
        // Calcular valores corretos para reimpressão
        // Para reimpressão, usar apenas o valor do pagamento específico
        const totalPagoCliente = parseFloat(valorPago);
        // Para pagamento total, valor restante é 0. Para parcial, é valor total - valor pago
        const valorRestanteCorreto = tipoPagamento === 'total' ? 0 : parseFloat(titulo.valor_total || 0) - parseFloat(valorPago);
        // Para reimpressão, não usar saldo total do cliente, apenas do título específico
        const totalEmAbertoCliente = Math.max(0, valorRestanteCorreto);
        
        
        const printWindow = window.open('', '_blank');
        const printContent = `
            <html>
                <head>
                    <title>Comprovante de Pagamento</title>
                    <style>
                        @media print {
                            @page { 
                                margin: 0; 
                                size: 80mm auto; 
                            }
                            body { 
                                margin: 0; 
                                padding: 0; 
                                font-family: Arial, sans-serif; 
                                font-size: 11px; 
                                width: 80mm;
                                max-width: 80mm;
                            }
                        }
                        body { 
                            font-family: Arial, sans-serif; 
                            font-size: 11px; 
                            margin: 0; 
                            padding: 8px; 
                            width: 80mm;
                            max-width: 80mm;
                        }
                        .header { text-align: center; margin-bottom: 12px; }
                        .empresa { font-weight: bold; font-size: 13px; }
                        .endereco { font-size: 9px; color: #666; }
                        .comprovante { text-align: center; font-weight: bold; font-size: 14px; margin: 12px 0; }
                        .cliente { margin: 8px 0; font-size: 10px; }
                        .valor { font-size: 10px; font-weight: bold; margin: 8px 0; }
                        .footer { margin-top: 15px; font-size: 9px; text-align: center; }
                        .linha { border-bottom: 1px solid #ccc; margin: 4px 0; }
                        .resumo { font-size: 10px; font-weight: bold; margin-top: 8px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="empresa">${empresa.nome_fantasia}</div>
                        <div class="endereco">${empresa.endereco || 'Endereço não informado'}</div>
                        <div class="endereco">${empresa.telefone_contato || 'Telefone não informado'}</div>
                    </div>
                    
                    <div class="comprovante">COMPROVANTE DE PAGAMENTO</div>
                    
                    <div class="linha"></div>
                    
                    <div class="cliente">
                        <strong>Cliente:</strong> ${titulo.cliente_nome || titulo.cliente?.nome || 'Cliente não informado'}<br>
                        <strong>Telefone:</strong> ${titulo.cliente_telefone || titulo.cliente?.telefone || 'Telefone não informado'}<br>
                        <strong>Título:</strong> #${titulo.numero_titulo || titulo.id}
                    </div>
                    
                    <div class="linha"></div>
                    
                    <div class="valor">
                        <strong>Valor Total:</strong> R$ ${(parseFloat(titulo.valor_total) || 0).toFixed(2).replace('.', ',')}<br>
                        <strong>Valor Pago:</strong> R$ ${(parseFloat(valorPago) || 0).toFixed(2).replace('.', ',')}<br>
                        <strong>Valor Restante:</strong> R$ ${valorRestante.toFixed(2).replace('.', ',')}<br>
                        <strong>Forma de Pagamento:</strong> ${formaPagamentoNome}<br>
                        <strong>Tipo:</strong> ${tipoPagamento === 'total' ? 'Pagamento Total' : 'Pagamento Parcial'}<br>
                        <strong>Data:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}
                    </div>
                    
                    <div class="linha"></div>
                    
                    <div class="footer">
                        <div class="resumo">
                            <div>Valor Total Pago: R$ ${totalPagoCliente.toFixed(2).replace('.', ',')}</div>
                            <div>Valor em Aberto: R$ ${Math.max(0, totalEmAbertoCliente).toFixed(2).replace('.', ',')}</div>
                        </div>
                        <div style="margin-top: 8px;">Obrigado pela preferência!</div>
                    </div>
                </body>
            </html>
        `;
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    };

    // Debounce para busca de clientes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm) {
                fetchClientes(searchTerm);
            } else {
                setClientes([]);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, fetchClientes]);

    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return '-';
        try {
            return format(parseISO(dateTimeString), 'dd/MM/yyyy HH:mm');
        } catch (e) {
            console.error("Erro ao formatar data:", e);
            return dateTimeString;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return format(parseISO(dateString), 'dd/MM/yyyy');
        } catch (e) {
            console.error("Erro ao formatar data:", e);
            return dateString;
        }
    };

    const getStatusBadge = (status) => {
        let colorClass = '';
        switch (status) {
            case 'Pendente': colorClass = 'bg-yellow-100 text-yellow-800'; break;
            case 'Pago': colorClass = 'bg-green-100 text-green-800'; break;
            case 'Vencido': colorClass = 'bg-red-100 text-red-800'; break;
            case 'Cancelado': colorClass = 'bg-gray-100 text-gray-800'; break;
            default: colorClass = 'bg-gray-100 text-gray-800';
        }
        return <Badge className={`${colorClass}`}>{status}</Badge>;
    };

    const fetchTitulos = useCallback(async (clienteId) => {
        if (!isReady || empresaLoading || !empresa?.slug || !user || !clienteId) {
            setLoading(true);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/gerencial/${empresa.slug}/contas-prazo/clientes/${clienteId}/titulos`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Filtrar apenas títulos em aberto (Pendente)
            const titulosEmAberto = (response.data || []).filter(titulo => titulo.status === 'Pendente');
            setTitulos(titulosEmAberto);
            console.log("Títulos carregados:", titulosEmAberto);
        } catch (err) {
            console.error("Erro ao carregar títulos:", err);
            toast.error(err.response?.data?.message || 'Erro ao carregar títulos.');
        } finally {
            setLoading(false);
        }
    }, [empresa, empresaLoading, isReady, user, token]);

    const handleSelectCliente = (cliente) => {
        setSelectedCliente(cliente);
        setSearchTerm(cliente.nome);
        setClientes([]);
        fetchTitulos(cliente.id);
    };

    const handleClearCliente = () => {
        setSelectedCliente(null);
        setSearchTerm('');
        setTitulos([]);
    };

    const handleRegistrarPagamento = async () => {
        console.log("handleRegistrarPagamento: Iniciando...");
        console.log("selectedTitulo:", selectedTitulo);
        console.log("valorPagamento:", valorPagamento);
        console.log("formaPagamentoId:", formaPagamentoId);
        console.log("tipoPagamento:", tipoPagamento);
        
        // Validações básicas
        if (!selectedTitulo) {
            toast.error('Título não selecionado');
            return;
        }

        if (!valorPagamento || valorPagamento.trim() === '') {
            toast.error('Valor do pagamento é obrigatório');
            return;
        }

        if (!formaPagamentoId) {
            toast.error('Selecione uma forma de pagamento');
            return;
        }

        const valor = parseFloat(valorPagamento);
        if (isNaN(valor) || valor <= 0) {
            toast.error('Valor deve ser um número maior que zero');
            return;
        }

        if (valor > selectedTitulo.valor_restante) {
            toast.error(`Valor não pode ser maior que R$ ${parseFloat(selectedTitulo.valor_restante).toFixed(2).replace('.', ',')}`);
            return;
        }

        try {
            console.log("Enviando pagamento para API...");
            const response = await api.post(`/gerencial/${empresa.slug}/contas-prazo/titulos/${selectedTitulo.id}/pagamento`, {
                valor_pago: valor,
                forma_pagamento_id: parseInt(formaPagamentoId),
                observacoes: observacoesPagamento,
                tipo_pagamento: tipoPagamento
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("Resposta da API:", response);
            toast.success('Pagamento registrado com sucesso!');
            
            // Preparar dados para impressão e abrir modal
            setComprovantePrintData({
                titulo: selectedTitulo,
                valorPago: valor,
                tipoPagamento: tipoPagamento
            });
            setIsPrintComprovanteModalOpen(true);
            
            // Limpar estados
            setShowPagamentoModal(false);
            setValorPagamento('');
            setObservacoesPagamento('');
            setTipoPagamento('total');
            setFormaPagamentoId('');
            setSelectedTitulo(null);
            
            // Recarregar títulos do cliente
            if (selectedCliente) {
                console.log("Recarregando títulos do cliente:", selectedCliente.id);
                fetchTitulos(selectedCliente.id);
            }
        } catch (err) {
            console.error("Erro ao registrar pagamento:", err);
            toast.error(err.response?.data?.message || 'Erro ao registrar pagamento.');
        }
    };

    const handleOpenPagamentoModal = (titulo) => {
        console.log("handleOpenPagamentoModal: Abrindo modal para título:", titulo);
        if (titulo.status === 'Pago') {
            toast.info('Este título já está pago');
            return;
        }
        setSelectedTitulo(titulo);
        setValorPagamento(titulo.valor_restante.toString());
        setObservacoesPagamento('');
        setTipoPagamento('total');
        setFormaPagamentoId('');
        setShowPagamentoModal(true);
        console.log("handleOpenPagamentoModal: Modal aberto, showPagamentoModal:", true);
    };

    // Carregar formas de pagamento ao inicializar
    useEffect(() => {
        fetchFormasPagamento();
    }, [fetchFormasPagamento]);


    // Debug para verificar estados
    useEffect(() => {
        console.log("RecebimentoContasPage: Estados atualizados - showPagamentoModal:", showPagamentoModal, "selectedTitulo:", selectedTitulo);
    }, [showPagamentoModal, selectedTitulo]);

    // Não carregar títulos automaticamente - só quando cliente for selecionado

    if (empresaLoading || !isReady) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin mr-2" /> Carregando...
            </div>
        );
    }

    if (error) {
        return <div className="p-4 text-center text-red-600">{error}</div>;
    }

    return (
        <div className="p-2 sm:p-4 md:p-6 bg-white rounded-lg shadow-md pb-20 lg:pb-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-800 text-center">
                Recebimento de Contas - {empresa.nome_fantasia}
            </h1>
            <p className="text-center text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">
                Busque um cliente para visualizar e receber suas contas a prazo.
            </p>

            {/* Busca de Cliente */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 border rounded-lg bg-gray-50">
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="searchCliente" className="text-sm font-medium">Buscar Cliente</Label>
                        <div className="relative">
                            <Input
                                id="searchCliente"
                                placeholder="Digite o nome do cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-9 sm:h-10 text-sm pr-10"
                            />
                            <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                        
                        {/* Dropdown de resultados */}
                        {searchTerm && clientes.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {clientes.map(cliente => (
                                    <div
                                        key={cliente.id}
                                        onClick={() => handleSelectCliente(cliente)}
                                        className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    >
                                        <div className="flex items-center">
                                            <UserIcon className="h-4 w-4 mr-2 text-gray-500" />
                                            <div>
                                                <div className="font-medium">{cliente.nome}</div>
                                                {cliente.telefone && (
                                                    <div className="text-sm text-gray-500">{cliente.telefone}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {loadingClientes && (
                            <div className="text-center py-2">
                                <Loader2 className="animate-spin h-4 w-4 mx-auto" />
                            </div>
                        )}
                    </div>
                    
                    {selectedCliente && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                                    <div>
                                        <div className="font-medium text-blue-900">{selectedCliente.nome}</div>
                                        {selectedCliente.telefone && (
                                            <div className="text-sm text-blue-700">{selectedCliente.telefone}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => buscarHistoricoCliente(selectedCliente.id)}
                                        disabled={loadingHistorico}
                                        className="text-green-600 border-green-300 hover:bg-green-100"
                                    >
                                        {loadingHistorico ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                        ) : (
                                            <SearchIcon className="h-4 w-4 mr-1" />
                                        )}
                                        Histórico
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearCliente}
                                        className="text-blue-600 border-blue-300 hover:bg-blue-100"
                                    >
                                        Limpar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Controles de Seleção - só aparece quando há cliente selecionado */}
            {selectedCliente && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 border rounded-lg bg-gray-50">
                    {/* Mobile Layout */}
                    <div className="lg:hidden space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={selecionarTodos}
                                disabled={titulos.length === 0}
                                className="h-10"
                            >
                                Selecionar Todos
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={deselecionarTodos}
                                disabled={titulosSelecionados.length === 0}
                                className="h-10"
                            >
                                Deselecionar Todos
                            </Button>
                        </div>
                        
                        <div className="flex items-center justify-center gap-2">
                            <input
                                type="checkbox"
                                id="cobrarJuros"
                                checked={cobrarJuros}
                                onChange={(e) => setCobrarJuros(e.target.checked)}
                                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <Label htmlFor="cobrarJuros" className="text-sm font-medium">
                                Cobrar Juros
                            </Label>
                        </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden lg:flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={selecionarTodos}
                                disabled={titulos.length === 0}
                            >
                                Selecionar Todos
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={deselecionarTodos}
                                disabled={titulosSelecionados.length === 0}
                            >
                                Deselecionar Todos
                            </Button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="cobrarJurosDesktop"
                                checked={cobrarJuros}
                                onChange={(e) => setCobrarJuros(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <Label htmlFor="cobrarJurosDesktop" className="text-sm font-medium">
                                Cobrar Juros
                            </Label>
                        </div>
                    </div>
                </div>
            )}

            {/* Lista de Títulos */}
            {!selectedCliente ? (
                <div className="text-center py-8">
                    <UserIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 text-lg">Selecione um cliente para visualizar suas contas a prazo</p>
                </div>
            ) : loading ? (
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="animate-spin mr-2" /> Carregando títulos...
                </div>
            ) : titulos.length === 0 ? (
                <div className="text-center py-8">
                    <DollarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 text-lg">Nenhuma conta em aberto encontrada para este cliente</p>
                </div>
            ) : (
                <>
                    {/* Desktop - Tabela */}
                    <div className="hidden lg:block bg-white rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead className="w-12 text-center">
                                        <input
                                            type="checkbox"
                                            checked={titulosSelecionados.length === titulos.length && titulos.length > 0}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    selecionarTodos();
                                                } else {
                                                    deselecionarTodos();
                                                }
                                            }}
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold">ID</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="font-semibold">Valor Total</TableHead>
                                    <TableHead className="font-semibold">Valor Pago</TableHead>
                                    <TableHead className="font-semibold">Valor Restante</TableHead>
                                    <TableHead className="font-semibold">Data Emissão</TableHead>
                                    <TableHead className="font-semibold">Data Vencimento</TableHead>
                                    <TableHead className="font-semibold">Pedido</TableHead>
                                    <TableHead className="font-semibold">Juros</TableHead>
                                    <TableHead className="font-semibold text-center">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {titulos.map((titulo, index) => (
                                    <TableRow 
                                        key={titulo.id}
                                        className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                                            titulosSelecionados.includes(titulo.id) 
                                                ? 'bg-blue-50 border-blue-200' 
                                                : index % 2 === 0 
                                                    ? 'bg-white' 
                                                    : 'bg-gray-25'
                                        } ${
                                            titulo.situacao_titulo === 'Vencido' 
                                                ? 'border-l-4 border-red-500' 
                                                : ''
                                        }`}
                                        onClick={() => toggleTituloSelecionado(titulo.id)}
                                    >
                                        <TableCell className="text-center">
                                            <input
                                                type="checkbox"
                                                checked={titulosSelecionados.includes(titulo.id)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleTituloSelecionado(titulo.id);
                                                }}
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            #{titulo.numero_titulo}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(titulo.status)}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            R$ {parseFloat(titulo.valor_total || 0).toFixed(2).replace('.', ',')}
                                        </TableCell>
                                        <TableCell>
                                            R$ {parseFloat(titulo.valor_pago || 0).toFixed(2).replace('.', ',')}
                                        </TableCell>
                                        <TableCell className={`font-medium ${
                                            titulo.situacao_titulo === 'Vencido' ? 'text-red-600' : ''
                                        }`}>
                                            R$ {parseFloat(titulo.valor_restante || 0).toFixed(2).replace('.', ',')}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(titulo.data_emissao || titulo.created_at)}
                                        </TableCell>
                                        <TableCell className={`${
                                            titulo.situacao_titulo === 'Vencido' 
                                                ? 'text-red-600 font-semibold' 
                                                : ''
                                        }`}>
                                            {formatDate(titulo.data_vencimento)}
                                            {titulo.situacao_titulo === 'Vencido' && (
                                                <span className="ml-1 text-xs">(VENCIDO)</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            #{titulo.numero_pedido}
                                        </TableCell>
                                        <TableCell>
                                            {titulo.juros_calculado > 0 ? (
                                                <Badge className="bg-red-100 text-red-800">
                                                    R$ {parseFloat(titulo.juros_calculado || 0).toFixed(2).replace('.', ',')}
                                                </Badge>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTitulosSelecionados([titulo.id]);
                                                    handleMostrarDetalhes();
                                                }}
                                                className="flex items-center gap-1"
                                            >
                                                <SearchIcon className="h-3 w-3" />
                                                Detalhes
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile - Cards */}
                    <div className="lg:hidden space-y-3">
                        {/* Checkbox para selecionar todos */}
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                            <input
                                type="checkbox"
                                checked={titulosSelecionados.length === titulos.length && titulos.length > 0}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        selecionarTodos();
                                    } else {
                                        deselecionarTodos();
                                    }
                                }}
                                className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <Label className="text-sm font-medium">
                                Selecionar todos os títulos
                            </Label>
                        </div>

                        {/* Cards dos títulos */}
                        {titulos.map((titulo, index) => (
                            <Card 
                                key={titulo.id}
                                className={`cursor-pointer transition-all duration-200 ${
                                    titulosSelecionados.includes(titulo.id) 
                                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                                        : 'hover:shadow-md'
                                } ${
                                    titulo.situacao_titulo === 'Vencido' 
                                        ? 'border-l-4 border-red-500' 
                                        : ''
                                }`}
                                onClick={() => toggleTituloSelecionado(titulo.id)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={titulosSelecionados.includes(titulo.id)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleTituloSelecionado(titulo.id);
                                                }}
                                                className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <div>
                                                <h3 className="font-bold text-lg">#{titulo.numero_titulo}</h3>
                                                <p className="text-sm text-gray-600">Pedido #{titulo.numero_pedido}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {getStatusBadge(titulo.status)}
                                            {titulo.situacao_titulo === 'Vencido' && (
                                                <p className="text-xs text-red-600 font-semibold mt-1">VENCIDO</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Valores */}
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="bg-gray-50 p-2 rounded">
                                            <p className="text-xs text-gray-600">Valor Total</p>
                                            <p className="font-bold">R$ {parseFloat(titulo.valor_total || 0).toFixed(2).replace('.', ',')}</p>
                                        </div>
                                        <div className="bg-gray-50 p-2 rounded">
                                            <p className="text-xs text-gray-600">Valor Pago</p>
                                            <p className="font-bold text-green-600">R$ {parseFloat(titulo.valor_pago || 0).toFixed(2).replace('.', ',')}</p>
                                        </div>
                                        <div className="bg-gray-50 p-2 rounded">
                                            <p className="text-xs text-gray-600">Valor Restante</p>
                                            <p className={`font-bold ${titulo.situacao_titulo === 'Vencido' ? 'text-red-600' : 'text-blue-600'}`}>
                                                R$ {parseFloat(titulo.valor_restante || 0).toFixed(2).replace('.', ',')}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 p-2 rounded">
                                            <p className="text-xs text-gray-600">Juros</p>
                                            <p className="font-bold text-orange-600">
                                                {titulo.juros_calculado > 0 
                                                    ? `R$ ${parseFloat(titulo.juros_calculado || 0).toFixed(2).replace('.', ',')}`
                                                    : '-'
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    {/* Datas */}
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <p className="text-xs text-gray-600">Data Emissão</p>
                                            <p className="text-sm font-medium">{formatDate(titulo.data_emissao || titulo.created_at)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">Data Vencimento</p>
                                            <p className={`text-sm font-medium ${
                                                titulo.situacao_titulo === 'Vencido' ? 'text-red-600' : ''
                                            }`}>
                                                {formatDate(titulo.data_vencimento)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Botão de detalhes */}
                                    <div className="flex justify-end">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTitulosSelecionados([titulo.id]);
                                                handleMostrarDetalhes();
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <SearchIcon className="h-4 w-4" />
                                            Ver Detalhes
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            {/* Rodapé com Totais e Ações */}
            {titulosSelecionados.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-3 sm:p-4 z-50">
                    <div className="max-w-7xl mx-auto">
                        {/* Mobile Layout */}
                        <div className="lg:hidden space-y-3">
                            {/* Totais em grid para mobile */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-gray-50 p-2 rounded text-center">
                                    <p className="text-gray-600">Títulos</p>
                                    <p className="font-bold text-lg">{totais.quantidade}</p>
                                </div>
                                <div className="bg-gray-50 p-2 rounded text-center">
                                    <p className="text-gray-600">Total</p>
                                    <p className="font-bold text-lg text-blue-600">
                                        R$ {totais.valorTotal.toFixed(2).replace('.', ',')}
                                    </p>
                                </div>
                                {totais.valorJuros > 0 && (
                                    <div className="bg-gray-50 p-2 rounded text-center">
                                        <p className="text-gray-600">Juros</p>
                                        <p className="font-bold text-lg text-orange-600">
                                            R$ {totais.valorJuros.toFixed(2).replace('.', ',')}
                                        </p>
                                    </div>
                                )}
                                <div className="bg-gray-50 p-2 rounded text-center">
                                    <p className="text-gray-600">Total Final</p>
                                    <p className="font-bold text-lg text-green-600">
                                        R$ {totais.valorTotalComJuros.toFixed(2).replace('.', ',')}
                                    </p>
                                </div>
                            </div>

                             {/* Forma de pagamento para mobile */}
                             <div className="space-y-2">
                                 <Label htmlFor="formaPagamentoMobile" className="text-sm font-medium">
                                     Forma de Pagamento:
                                 </Label>
                                 <Select value={formaPagamentoId} onValueChange={setFormaPagamentoId}>
                                     <SelectTrigger id="formaPagamentoMobile" className="w-full bg-white border-gray-300 text-gray-900">
                                         <SelectValue placeholder="Selecione" />
                                     </SelectTrigger>
                                     <SelectContent className="bg-white border border-gray-300 shadow-lg">
                                         {formasPagamento.map(forma => (
                                             <SelectItem 
                                                 key={forma.id} 
                                                 value={forma.id.toString()}
                                                 className="text-gray-900 hover:bg-gray-100 cursor-pointer"
                                             >
                                                 {forma.descricao}
                                             </SelectItem>
                                         ))}
                                     </SelectContent>
                                 </Select>
                             </div>

                            {/* Botões para mobile */}
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    onClick={() => {
                                        const totaisCalculados = calcularValorTotalComJuros();
                                        setValorTotalPagamentoMultiplo(totaisCalculados.totalComJuros.toString());
                                        setShowPagamentoMultiploModal(true);
                                    }}
                                    variant="outline"
                                    className="bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100 h-12"
                                >
                                    Receber Parcial
                                </Button>
                                
                                 <Button
                                     onClick={handleReceberTotal}
                                     className="bg-blue-600 hover:bg-blue-700 text-white h-12"
                                 >
                                     Receber Total
                                 </Button>
                            </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden lg:flex flex-wrap items-center justify-between gap-4">
                            {/* Totais */}
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="text-sm">
                                    <span className="text-gray-600">Títulos Selecionados:</span>
                                    <span className="font-bold ml-1">{totais.quantidade}</span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-600">Valor Total:</span>
                                    <span className="font-bold ml-1 text-blue-600">
                                        R$ {totais.valorTotal.toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                                {totais.valorJuros > 0 && (
                                    <div className="text-sm">
                                        <span className="text-gray-600">Juros:</span>
                                        <span className="font-bold ml-1 text-orange-600">
                                            R$ {totais.valorJuros.toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>
                                )}
                                <div className="text-sm">
                                    <span className="text-gray-600">Total com Juros:</span>
                                    <span className="font-bold ml-1 text-green-600">
                                        R$ {totais.valorTotalComJuros.toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                                {totais.titulosVencidos > 0 && (
                                    <div className="text-sm">
                                        <span className="text-red-600">Títulos Vencidos:</span>
                                        <span className="font-bold ml-1 text-red-600">
                                            {totais.titulosVencidos}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Ações */}
                            <div className="flex items-center gap-3">
                                 <div className="flex items-center gap-2">
                                     <Label htmlFor="formaPagamentoRodape" className="text-sm font-medium">
                                         Forma de Pagamento:
                                     </Label>
                                     <Select value={formaPagamentoId} onValueChange={setFormaPagamentoId}>
                                         <SelectTrigger id="formaPagamentoRodape" className="w-48 bg-white border-gray-300 text-gray-900">
                                             <SelectValue placeholder="Selecione" />
                                         </SelectTrigger>
                                         <SelectContent className="bg-white border border-gray-300 shadow-lg">
                                             {formasPagamento.map(forma => (
                                                 <SelectItem 
                                                     key={forma.id} 
                                                     value={forma.id.toString()}
                                                     className="text-gray-900 hover:bg-gray-100 cursor-pointer"
                                                 >
                                                     {forma.descricao}
                                                 </SelectItem>
                                             ))}
                                         </SelectContent>
                                     </Select>
                                 </div>

                                <Button
                                    onClick={() => {
                                        const totaisCalculados = calcularValorTotalComJuros();
                                        setValorTotalPagamentoMultiplo(totaisCalculados.totalComJuros.toString());
                                        setShowPagamentoMultiploModal(true);
                                    }}
                                    variant="outline"
                                    className="bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                                >
                                    Receber Parcial
                                </Button>
                                
                                 <Button
                                     onClick={handleReceberTotal}
                                     className="bg-blue-600 hover:bg-blue-700 text-white"
                                 >
                                     Receber Total
                                 </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Pagamento */}
            {showPagamentoModal && (
                <Dialog open={showPagamentoModal} onOpenChange={setShowPagamentoModal}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Registrar Pagamento</DialogTitle>
                            <DialogDescription>
                                {selectedTitulo ? `Registrar pagamento para ${selectedTitulo.cliente_nome}` : 'Registrar pagamento'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            {selectedTitulo ? (
                                <>
                                    <div>
                                        <Label htmlFor="cliente">Cliente</Label>
                                        <Input
                                            id="cliente"
                                            value={selectedTitulo.cliente_nome}
                                            disabled
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="valorTotal">Valor Total</Label>
                                        <Input
                                            id="valorTotal"
                                            value={`R$ ${(parseFloat(selectedTitulo.valor_total) || 0).toFixed(2).replace('.', ',')}`}
                                            disabled
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="valorRestante">Valor Restante</Label>
                                        <Input
                                            id="valorRestante"
                                            value={`R$ ${(parseFloat(selectedTitulo.valor_restante) || 0).toFixed(2).replace('.', ',')}`}
                                            disabled
                                            className="w-full"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-gray-500">
                                    <p>Nenhum título selecionado</p>
                                </div>
                            )}
                             <div>
                                 <Label htmlFor="formaPagamento">Forma de Pagamento *</Label>
                                 <Select value={formaPagamentoId} onValueChange={setFormaPagamentoId}>
                                     <SelectTrigger id="formaPagamento" className="w-full bg-white border-gray-300 text-gray-900">
                                         <SelectValue placeholder="Selecione a forma de pagamento" />
                                     </SelectTrigger>
                                     <SelectContent className="bg-white border border-gray-300 shadow-lg">
                                         {formasPagamento.map(forma => (
                                             <SelectItem 
                                                 key={forma.id} 
                                                 value={forma.id.toString()}
                                                 className="text-gray-900 hover:bg-gray-100 cursor-pointer"
                                             >
                                                 {forma.descricao}
                                             </SelectItem>
                                         ))}
                                     </SelectContent>
                                 </Select>
                             </div>
                             <div>
                                 <Label htmlFor="tipoPagamento">Tipo de Pagamento</Label>
                                 <Select value={tipoPagamento} onValueChange={(value) => {
                                     setTipoPagamento(value);
                                     if (value === 'total' && selectedTitulo) {
                                         setValorPagamento(selectedTitulo.valor_restante.toString());
                                     } else {
                                         setValorPagamento('');
                                     }
                                 }}>
                                     <SelectTrigger id="tipoPagamento" className="w-full bg-white border-gray-300 text-gray-900">
                                         <SelectValue placeholder="Selecione o tipo" />
                                     </SelectTrigger>
                                     <SelectContent className="bg-white border border-gray-300 shadow-lg">
                                         <SelectItem 
                                             value="total"
                                             className="text-gray-900 hover:bg-gray-100 cursor-pointer"
                                         >
                                             Pagamento Total
                                         </SelectItem>
                                         <SelectItem 
                                             value="parcial"
                                             className="text-gray-900 hover:bg-gray-100 cursor-pointer"
                                         >
                                             Pagamento Parcial
                                         </SelectItem>
                                     </SelectContent>
                                 </Select>
                             </div>
                            <div>
                                <Label htmlFor="valorPagamento">Valor do Pagamento *</Label>
                                <Input
                                    id="valorPagamento"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={selectedTitulo?.valor_restante || 0}
                                    value={valorPagamento}
                                    onChange={(e) => setValorPagamento(e.target.value)}
                                    placeholder={tipoPagamento === 'total' ? 'Valor total' : 'Digite o valor do pagamento'}
                                    className="w-full"
                                    disabled={tipoPagamento === 'total'}
                                />
                                {tipoPagamento === 'total' && selectedTitulo && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        Valor total: R$ {(parseFloat(selectedTitulo.valor_restante) || 0).toFixed(2).replace('.', ',')}
                                    </p>
                                )}
                                {tipoPagamento === 'parcial' && selectedTitulo && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        Valor restante: R$ {(parseFloat(selectedTitulo.valor_restante) || 0).toFixed(2).replace('.', ',')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="observacoes">Observações</Label>
                                <Textarea
                                    id="observacoes"
                                    value={observacoesPagamento}
                                    onChange={(e) => setObservacoesPagamento(e.target.value)}
                                    placeholder="Observações sobre o pagamento (opcional)"
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowPagamentoModal(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleRegistrarPagamento}>
                                Registrar Pagamento
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Modal do Comprovante */}
            {/* Modal de Detalhes dos Títulos Selecionados */}
            <Dialog open={showDetalhesModal} onOpenChange={setShowDetalhesModal}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detalhes dos Títulos Selecionados</DialogTitle>
                        <DialogDescription>
                            Visualize informações detalhadas dos títulos selecionados
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                        {detalhesTitulos.map((titulo, index) => (
                            <div key={titulo.id} className="border rounded-lg p-4 bg-gray-50">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-semibold">#{titulo.numero_titulo}</h3>
                                    <Badge className={titulo.situacao_titulo === 'Vencido' ? 'bg-red-500' : 'bg-green-500'}>
                                        {titulo.situacao_titulo}
                                    </Badge>
                                </div>
                                
                                {/* Informações do Cliente */}
                                <div className="mb-4">
                                    <h4 className="font-medium text-gray-700 mb-2">Cliente</h4>
                                    <p><strong>Nome:</strong> {titulo.cliente_nome}</p>
                                    <p><strong>Telefone:</strong> {titulo.cliente_telefone}</p>
                                    {titulo.cliente_email && <p><strong>Email:</strong> {titulo.cliente_email}</p>}
                                </div>
                                
                                {/* Valores */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div className="text-center p-2 bg-white rounded">
                                        <p className="text-sm text-gray-600">Valor Total</p>
                                        <p className="font-bold">R$ {(parseFloat(titulo.valor_total) || 0).toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded">
                                        <p className="text-sm text-gray-600">Valor Pago</p>
                                        <p className="font-bold text-green-600">R$ {(parseFloat(titulo.valor_pago) || 0).toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded">
                                        <p className="text-sm text-gray-600">Valor Restante</p>
                                        <p className="font-bold text-blue-600">R$ {(parseFloat(titulo.valor_restante) || 0).toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded">
                                        <p className="text-sm text-gray-600">Juros</p>
                                        <p className="font-bold text-orange-600">R$ {(parseFloat(titulo.juros_calculado) || 0).toFixed(2).replace('.', ',')}</p>
                                    </div>
                                </div>
                                
                                {/* Itens */}
                                <div className="mb-4">
                                    <h4 className="font-medium text-gray-700 mb-2">Itens</h4>
                                    <div className="space-y-2">
                                        {titulo.itens.map((item, itemIndex) => (
                                            <div key={itemIndex} className="flex justify-between items-center p-2 bg-white rounded">
                                                <div>
                                                    <p className="font-medium">{item.produto_nome}</p>
                                                    <p className="text-sm text-gray-600">{item.categoria_nome}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p>{item.quantidade}x R$ {(parseFloat(item.preco_unitario) || 0).toFixed(2).replace('.', ',')}</p>
                                                    <p className="font-bold">R$ {(parseFloat(item.subtotal) || 0).toFixed(2).replace('.', ',')}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Histórico de Pagamentos */}
                                {titulo.pagamentos && titulo.pagamentos.length > 0 && (
                                    <div>
                                        <h4 className="font-medium text-gray-700 mb-2">Histórico de Pagamentos</h4>
                                        <div className="space-y-2">
                                            {titulo.pagamentos.map((pagamento, pagIndex) => (
                                                <div key={pagIndex} className="flex justify-between items-center p-2 bg-white rounded">
                                                    <div>
                                                        <p className="font-medium">R$ {(parseFloat(pagamento.valor_pago) || 0).toFixed(2).replace('.', ',')}</p>
                                                        <p className="text-sm text-gray-600">{pagamento.forma_pagamento_descricao}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm">{formatDateTime(pagamento.data_pagamento)}</p>
                                                        <p className="text-sm text-gray-600">{pagamento.funcionario_nome}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    <DialogFooter>
                        <Button onClick={() => setShowDetalhesModal(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {showComprovanteModal && comprovanteData && (
                <Dialog open={showComprovanteModal} onOpenChange={setShowComprovanteModal}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Comprovante de Recebimento</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                            {/* Dados da Empresa */}
                            {comprovanteData.empresa && (
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-blue-800 mb-2">Empresa</h3>
                                    <p><strong>Nome:</strong> {comprovanteData.empresa.nome}</p>
                                    <p><strong>Endereço:</strong> {comprovanteData.empresa.endereco}</p>
                                    <p><strong>Telefone:</strong> {comprovanteData.empresa.telefone}</p>
                                    <p><strong>CNPJ:</strong> {comprovanteData.empresa.cnpj}</p>
                                </div>
                            )}

                            {/* Dados do Cliente */}
                            {comprovanteData.cliente && (
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-green-800 mb-2">Cliente</h3>
                                    <p><strong>Nome:</strong> {comprovanteData.cliente.nome}</p>
                                    <p><strong>Telefone:</strong> {comprovanteData.cliente.telefone}</p>
                                    <p><strong>Email:</strong> {comprovanteData.cliente.email}</p>
                                </div>
                            )}

                            {/* Dados do Título */}
                            {comprovanteData.titulo && (
                                <div className="bg-yellow-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-yellow-800 mb-2">Título</h3>
                                    <p><strong>Número:</strong> {comprovanteData.titulo.numero}</p>
                                    <p><strong>Descrição:</strong> {comprovanteData.titulo.descricao}</p>
                                    <p><strong>Valor Total:</strong> R$ {parseFloat(comprovanteData.titulo.valor_total).toFixed(2).replace('.', ',')}</p>
                                    <p><strong>Valor Pago:</strong> R$ {parseFloat(comprovanteData.titulo.valor_pago).toFixed(2).replace('.', ',')}</p>
                                    <p><strong>Valor Restante:</strong> R$ {parseFloat(comprovanteData.titulo.valor_restante).toFixed(2).replace('.', ',')}</p>
                                    <p><strong>Status:</strong> {comprovanteData.titulo.status}</p>
                                </div>
                            )}

                            {/* Dados do Pagamento */}
                            {comprovanteData.pagamento && (
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-purple-800 mb-2">Último Pagamento</h3>
                                    <p><strong>Valor:</strong> R$ {parseFloat(comprovanteData.pagamento.valor).toFixed(2).replace('.', ',')}</p>
                                    <p><strong>Data:</strong> {formatDateTime(comprovanteData.pagamento.data)}</p>
                                    <p><strong>Forma de Pagamento:</strong> {comprovanteData.pagamento.forma_pagamento}</p>
                                    <p><strong>Funcionário:</strong> {comprovanteData.pagamento.funcionario}</p>
                                    {comprovanteData.pagamento.observacoes && (
                                        <p><strong>Observações:</strong> {comprovanteData.pagamento.observacoes}</p>
                                    )}
                                </div>
                            )}

                            {/* Saldo do Cliente */}
                            {saldoCliente && (
                                <div className="bg-red-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-red-800 mb-2">Saldo em Aberto</h3>
                                    <p><strong>Total em Aberto:</strong> R$ {parseFloat(saldoCliente.saldo_total).toFixed(2).replace('.', ',')}</p>
                                    <p><strong>Títulos em Aberto:</strong> {saldoCliente.titulos.length}</p>
                                    
                                    {saldoCliente.titulos.length > 0 && (
                                        <div className="mt-3">
                                            <h4 className="font-medium text-red-700 mb-2">Títulos Pendentes:</h4>
                                            <div className="space-y-2">
                                                {saldoCliente.titulos.map((titulo, index) => (
                                                    <div key={index} className="bg-white p-2 rounded border">
                                                        <p><strong>{titulo.numero}</strong> - {titulo.descricao}</p>
                                                        <p>Restante: R$ {parseFloat(titulo.valor_restante).toFixed(2).replace('.', ',')}</p>
                                                        <p>Vencimento: {formatDate(titulo.data_vencimento)}</p>
                                                        <p className={`text-sm ${titulo.situacao_vencimento === 'Vencido' ? 'text-red-600' : 'text-green-600'}`}>
                                                            {titulo.situacao_vencimento}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="flex gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => setShowComprovanteModal(false)}
                            >
                                Fechar
                            </Button>
                            <Button 
                                onClick={() => imprimirComprovante(comprovanteData.titulo.id)}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                🖨️ Imprimir Comprovante
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Modal de Confirmação de Impressão de Comprovante */}
            <Dialog open={isPrintComprovanteModalOpen} onOpenChange={setIsPrintComprovanteModalOpen}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl font-bold text-blue-600">
                            🖨️ Imprimir Comprovante?
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            Deseja imprimir o comprovante de recebimento?
                        </DialogDescription>
                    </DialogHeader>
                    
                    {comprovantePrintData && (
                        <div className="py-4 space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                {comprovantePrintData.tipoComprovante === 'multiplo' ? (
                                    <>
                                        <div className="text-lg font-bold text-blue-800 mb-2">
                                            Pagamento Múltiplo
                                        </div>
                                        <p className="text-blue-700 font-semibold text-base">
                                            Cliente: {comprovantePrintData.dadosPagamento.titulos_atualizados[0]?.cliente_nome || 'Não informado'}
                                        </p>
                                        <div className="flex flex-col items-center mt-2 gap-1">
                                            <span className="text-gray-700 text-sm">Valor total dos títulos:</span>
                                            <span className="text-2xl font-bold text-blue-900">R$ {comprovantePrintData.dadosPagamento.titulos_atualizados.reduce((total, titulo) => total + parseFloat(titulo.valor_total || 0), 0).toFixed(2).replace('.', ',')}</span>
                                        </div>
                                        <div className="flex flex-col items-center mt-2 gap-1">
                                            <span className="text-gray-700 text-sm">Valor pago:</span>
                                            <span className="text-xl font-bold text-green-700">R$ {(parseFloat(comprovantePrintData.dadosPagamento.valor_total_distribuido) || 0).toFixed(2).replace('.', ',')}</span>
                                        </div>
                                        <div className="flex flex-col items-center mt-2 gap-1">
                                            <span className="text-gray-700 text-sm">Tipo:</span>
                                            <span className="text-lg font-bold text-blue-700">
                                                {comprovantePrintData.tipoPagamento === 'total' ? 'Pagamento Total' : 'Pagamento Parcial'}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-lg font-bold text-blue-800 mb-2">
                                            Título #{comprovantePrintData.titulo?.numero_titulo || 'N/A'}
                                        </div>
                                        <p className="text-blue-700 font-semibold text-base">
                                            Cliente: {comprovantePrintData.titulo?.cliente_nome || comprovantePrintData.titulo?.cliente?.nome || 'Não informado'}
                                        </p>
                                        <div className="flex flex-col items-center mt-2 gap-1">
                                            <span className="text-gray-700 text-sm">Valor total do título:</span>
                                            <span className="text-2xl font-bold text-blue-900">R$ {(parseFloat(comprovantePrintData.titulo?.valor_total) || 0).toFixed(2).replace('.', ',')}</span>
                                        </div>
                                        <div className="flex flex-col items-center mt-2 gap-1">
                                            <span className="text-gray-700 text-sm">Valor pago:</span>
                                            <span className="text-xl font-bold text-green-700">R$ {(parseFloat(comprovantePrintData.valorPago) || 0).toFixed(2).replace('.', ',')}</span>
                                        </div>
                                        <div className="flex flex-col items-center mt-2 gap-1">
                                            <span className="text-gray-700 text-sm">Tipo:</span>
                                            <span className="text-base font-semibold text-gray-800">
                                                {comprovantePrintData.tipoPagamento === 'total' ? 'Pagamento Total' : 'Pagamento Parcial'}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <p className="text-gray-700 text-center">
                                    O comprovante será impresso com todos os detalhes do recebimento.
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <DialogFooter className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={handleNaoImprimirComprovante}
                        >
                            Não Imprimir
                        </Button>
                        <Button 
                            onClick={handleImprimirComprovante}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <DollarIcon className="h-4 w-4 mr-2" />
                            Sim, Imprimir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Pagamento Múltiplo */}
            <Dialog open={showPagamentoMultiploModal} onOpenChange={(open) => {
                setShowPagamentoMultiploModal(open);
                if (!open) {
                    // Limpar estados quando fechar o modal
                    setValorTotalPagamentoMultiplo('');
                    setObservacoesPagamentoMultiplo('');
                    setFormaPagamentoIdMultiplo('');
                }
            }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Pagamento Múltiplo</DialogTitle>
                        <DialogDescription>
                            Distribuir pagamento entre {titulosSelecionados.length} título(s) selecionado(s)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {/* Preview dos títulos selecionados */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <h4 className="font-semibold mb-2">Títulos Selecionados:</h4>
                            <div className="space-y-1 text-sm">
                                {titulos.filter(t => titulosSelecionados.includes(t.id)).map(titulo => (
                                    <div key={titulo.id} className="flex justify-between">
                                        <span>Título #{titulo.numero_titulo}</span>
                                        <span className="font-medium">
                                            R$ {parseFloat(titulo.valor_restante || 0).toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Cálculo de totais */}
                        <div className="bg-blue-50 p-3 rounded-lg">
                            <h4 className="font-semibold mb-2">Resumo:</h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span>Valor Total:</span>
                                    <span>R$ {calcularValorTotalComJuros().valorTotal.toFixed(2).replace('.', ',')}</span>
                                </div>
                                {cobrarJuros && calcularValorTotalComJuros().jurosTotal > 0 && (
                                    <div className="flex justify-between text-orange-600">
                                        <span>Juros:</span>
                                        <span>R$ {calcularValorTotalComJuros().jurosTotal.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-semibold border-t pt-1">
                                    <span>Total com Juros:</span>
                                    <span>R$ {calcularValorTotalComJuros().totalComJuros.toFixed(2).replace('.', ',')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Campo de valor total */}
                        <div className="space-y-2">
                            <Label htmlFor="valorTotalMultiplo">Valor Total a Pagar</Label>
                            <Input
                                id="valorTotalMultiplo"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={calcularValorTotalComJuros().totalComJuros}
                                value={valorTotalPagamentoMultiplo}
                                onChange={(e) => setValorTotalPagamentoMultiplo(e.target.value)}
                                placeholder="Digite o valor total"
                            />
                            <p className="text-xs text-gray-500">
                                Máximo: R$ {calcularValorTotalComJuros().totalComJuros.toFixed(2).replace('.', ',')}
                            </p>
                        </div>

                         {/* Forma de pagamento */}
                         <div className="space-y-2">
                             <Label htmlFor="formaPagamentoMultiplo">Forma de Pagamento</Label>
                             <Select value={formaPagamentoIdMultiplo} onValueChange={setFormaPagamentoIdMultiplo}>
                                 <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                                     <SelectValue placeholder="Selecione a forma de pagamento" />
                                 </SelectTrigger>
                                 <SelectContent className="bg-white border border-gray-300 shadow-lg">
                                     {formasPagamento.map((forma) => (
                                         <SelectItem 
                                             key={forma.id} 
                                             value={forma.id.toString()}
                                             className="text-gray-900 hover:bg-gray-100 cursor-pointer"
                                         >
                                             {forma.descricao}
                                         </SelectItem>
                                     ))}
                                 </SelectContent>
                             </Select>
                         </div>

                        {/* Observações */}
                        <div className="space-y-2">
                            <Label htmlFor="observacoesMultiplo">Observações</Label>
                            <Input
                                id="observacoesMultiplo"
                                value={observacoesPagamentoMultiplo}
                                onChange={(e) => setObservacoesPagamentoMultiplo(e.target.value)}
                                placeholder="Observações do pagamento (opcional)"
                            />
                        </div>

                        {/* Toggle para cobrar juros */}
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="cobrarJurosMultiplo"
                                checked={cobrarJuros}
                                onChange={(e) => setCobrarJuros(e.target.checked)}
                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <Label htmlFor="cobrarJurosMultiplo" className="text-sm">
                                Incluir juros nos títulos vencidos
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowPagamentoMultiploModal(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handlePagamentoMultiplo}
                            disabled={!valorTotalPagamentoMultiplo || !formaPagamentoIdMultiplo}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Confirmar Pagamento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Histórico do Cliente */}
            <Dialog open={showHistoricoModal} onOpenChange={setShowHistoricoModal}>
                <DialogContent className="w-[95vw] max-w-[95vw] lg:w-[90vw] lg:max-w-[90vw] xl:w-[85vw] xl:max-w-[85vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl font-bold text-blue-600">
                            📊 Histórico Completo do Cliente
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            Visualização completa de todos os dados e transações do cliente
                        </DialogDescription>
                    </DialogHeader>
                    
                    {historicoCliente && (
                        <div className="py-4 space-y-6">
                            {/* Dados do Cliente */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-blue-800 mb-3">👤 Dados do Cliente</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p><strong>Nome:</strong> {historicoCliente.cliente.nome}</p>
                                        <p><strong>Telefone:</strong> {historicoCliente.cliente.telefone || 'Não informado'}</p>
                                        <p><strong>Email:</strong> {historicoCliente.cliente.email || 'Não informado'}</p>
                                    </div>
                                    <div>
                                        <p><strong>Endereço:</strong> {historicoCliente.cliente.endereco || 'Não informado'}</p>
                                        <p><strong>Cliente desde:</strong> {new Date(historicoCliente.cliente.data_cadastro).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Estatísticas Gerais */}
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">📊 Resumo Geral</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-gray-50 p-3 rounded text-center">
                                        <div className="text-2xl font-bold text-blue-600">{historicoCliente.estatisticas_gerais.total_titulos}</div>
                                        <div className="text-sm text-gray-600">Total de Títulos</div>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded text-center">
                                        <div className="text-2xl font-bold text-green-600">{historicoCliente.estatisticas_gerais.titulos_pagos}</div>
                                        <div className="text-sm text-gray-600">Títulos Pagos</div>
                                    </div>
                                    <div className="bg-yellow-50 p-3 rounded text-center">
                                        <div className="text-2xl font-bold text-yellow-600">{historicoCliente.estatisticas_gerais.titulos_pendentes}</div>
                                        <div className="text-sm text-gray-600">Títulos Pendentes</div>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded text-center">
                                        <div className="text-2xl font-bold text-red-600">{historicoCliente.estatisticas_gerais.titulos_vencidos}</div>
                                        <div className="text-sm text-gray-600">Títulos Vencidos</div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span>Valor Total Emprestado:</span>
                                            <span className="font-semibold">R$ {parseFloat(historicoCliente.estatisticas_gerais.valor_total_emprestado || 0).toFixed(2).replace('.', ',')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Valor Total Pago:</span>
                                            <span className="font-semibold text-green-600">R$ {parseFloat(historicoCliente.estatisticas_gerais.valor_total_pago || 0).toFixed(2).replace('.', ',')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Valor Restante:</span>
                                            <span className="font-semibold text-yellow-600">R$ {parseFloat(historicoCliente.estatisticas_gerais.valor_total_restante || 0).toFixed(2).replace('.', ',')}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span>Juros Cobrados:</span>
                                            <span className="font-semibold">R$ {parseFloat(historicoCliente.estatisticas_gerais.valor_total_juros || 0).toFixed(2).replace('.', ',')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>% Pago:</span>
                                            <span className="font-semibold text-blue-600">{parseFloat(historicoCliente.estatisticas_gerais.percentual_pago_geral || 0).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resumo por Período */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">📅 Atividade por Período</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-blue-600">{historicoCliente.resumo_por_periodo.ultimos_30_dias}</div>
                                        <div className="text-sm text-gray-600">Últimos 30 dias</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-blue-600">{historicoCliente.resumo_por_periodo.ultimos_90_dias}</div>
                                        <div className="text-sm text-gray-600">Últimos 90 dias</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-blue-600">{historicoCliente.resumo_por_periodo.ultimo_ano}</div>
                                        <div className="text-sm text-gray-600">Último ano</div>
                                    </div>
                                </div>
                            </div>

                            {/* Lista de Títulos */}
                            <div className="space-y-4">
                                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                                    <h3 className="text-lg font-semibold text-gray-800">📋 Histórico de Títulos</h3>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Input
                                            type="date"
                                            value={filtroDataInicio}
                                            onChange={(e) => setFiltroDataInicio(e.target.value)}
                                            placeholder="Data início"
                                            className="w-full sm:w-40"
                                        />
                                        <Input
                                            type="date"
                                            value={filtroDataFim}
                                            onChange={(e) => setFiltroDataFim(e.target.value)}
                                            placeholder="Data fim"
                                            className="w-full sm:w-40"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setFiltroDataInicio('');
                                                setFiltroDataFim('');
                                            }}
                                            className="w-full sm:w-auto"
                                        >
                                            Limpar
                                        </Button>
                                    </div>
                                </div>
                                {filtrarTitulosPorData(historicoCliente.titulos).map(titulo => (
                                    <div key={titulo.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                        <div className="flex justify-between items-center mb-3 pb-2 border-b">
                                            <h4 className="text-lg font-semibold">Título #{titulo.numero_titulo}</h4>
                                            <Badge className={`${
                                                titulo.status === 'Pago' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : titulo.status === 'Pendente'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                            }`}>
                                                {titulo.situacao_titulo}
                                            </Badge>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-1">
                                                <p><strong>Descrição:</strong> {titulo.descricao}</p>
                                                <p><strong>Valor Total:</strong> R$ {parseFloat(titulo.valor_total || 0).toFixed(2).replace('.', ',')}</p>
                                                <p><strong>Valor Pago:</strong> R$ {parseFloat(titulo.totais?.valor_pago || 0).toFixed(2).replace('.', ',')}</p>
                                                <p><strong>Valor Restante:</strong> R$ {parseFloat(titulo.valor_restante || 0).toFixed(2).replace('.', ',')}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p><strong>Data Emissão:</strong> {new Date(titulo.data_emissao).toLocaleDateString('pt-BR')}</p>
                                                <p><strong>Data Vencimento:</strong> {new Date(titulo.data_vencimento).toLocaleDateString('pt-BR')}</p>
                                                {titulo.data_pagamento && (
                                                    <p><strong>Data Pagamento:</strong> {new Date(titulo.data_pagamento).toLocaleDateString('pt-BR')}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Itens do Título */}
                                        {titulo.itens && titulo.itens.length > 0 && (
                                            <div className="mb-4">
                                                <h5 className="font-semibold text-gray-700 mb-2">🛒 Itens:</h5>
                                                <div className="space-y-1">
                                                    {titulo.itens.map(item => (
                                                        <div key={item.id} className="flex justify-between bg-gray-50 p-2 rounded">
                                                            <span>{item.quantidade}x {item.produto_nome}</span>
                                                            <span className="font-semibold">R$ {parseFloat(item.subtotal || 0).toFixed(2).replace('.', ',')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Pagamentos do Título */}
                                        {titulo.pagamentos && titulo.pagamentos.length > 0 && (
                                            <div className="mb-4">
                                                <h5 className="font-semibold text-gray-700 mb-2">💳 Pagamentos:</h5>
                                                <div className="space-y-1">
                                                    {titulo.pagamentos.map(pagamento => (
                                                        <div key={pagamento.id} className="flex justify-between items-center bg-green-50 p-2 rounded">
                                                            <div>
                                                                <span className="font-semibold">R$ {parseFloat(pagamento.valor_pago || 0).toFixed(2).replace('.', ',')}</span>
                                                                <span className="ml-2 text-sm text-gray-600">{pagamento.forma_pagamento_descricao}</span>
                                                                <span className="ml-2 text-sm text-gray-500">{new Date(pagamento.data_pagamento).toLocaleDateString('pt-BR')}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {pagamento.observacoes && (
                                                                    <span className="text-sm text-gray-500 italic">({pagamento.observacoes})</span>
                                                                )}
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => reimprimirComprovante(pagamento)}
                                                                    className="text-blue-600 hover:text-blue-800"
                                                                >
                                                                    🖨️ Reimprimir
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Juros (se houver) */}
                                        {titulo.historico_juros && titulo.historico_juros.length > 0 && (
                                            <div>
                                                <h5 className="font-semibold text-gray-700 mb-2">💰 Juros:</h5>
                                                <div className="space-y-1">
                                                    {titulo.historico_juros.map(juro => (
                                                        <div key={juro.id} className="flex justify-between bg-red-50 p-2 rounded">
                                                            <span>R$ {parseFloat(juro.valor_juros || 0).toFixed(2).replace('.', ',')}</span>
                                                            <span className="text-sm text-gray-600">{juro.dias_atraso} dias de atraso</span>
                                                            <span className="text-sm text-gray-500">{new Date(juro.data_calculo).toLocaleDateString('pt-BR')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowHistoricoModal(false)}
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RecebimentoContasPage;
