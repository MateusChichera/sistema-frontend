import React, { useState, useEffect } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import api from '../../services/api';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Checkbox } from '../ui/checkbox';
import { Loader2, Search, Filter, Calendar, Package, Download, Printer, Eye, HelpCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

const RelPedidos = () => {
    const { empresa, loading: empresaLoading } = useEmpresa();

    // Estados para os filtros
    const [dataInicio, setDataInicio] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [dataFim, setDataFim] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [statusPedido, setStatusPedido] = useState({
        pendente: false,
        preparando: false,
        pronto: false,
        entregue: false,
        cancelado: false
    });
    const [tipoEntrega, setTipoEntrega] = useState({
        mesa: false,
        delivery: false,
        balcao: false,
        retirada: false
    });

    // Estados para os dados do relatório
    const [relatorioData, setRelatorioData] = useState([]);
    const [loadingRelatorio, setLoadingRelatorio] = useState(false);
    const [relatorioGerado, setRelatorioGerado] = useState(false);

    // Estados para o modal de detalhes
    const [selectedPedido, setSelectedPedido] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // Função para obter o badge de status
    const getStatusBadge = (status) => {
        let variant = 'secondary';
        switch (status) {
            case 'Pendente':
                variant = 'default';
                break;
            case 'Preparando':
                variant = 'secondary';
                break;
            case 'Pronto':
                variant = 'outline';
                break;
            case 'Entregue':
                variant = 'default';
                break;
            case 'Cancelado':
                variant = 'destructive';
                break;
            default:
                variant = 'secondary';
        }
        return <Badge variant={variant}>{status}</Badge>;
    };

    // Função para formatar valores monetários
    const formatCurrency = (value) => {
        return `R$ ${parseFloat(value || 0).toFixed(2)}`;
    };

    // Função para formatar data/hora
    const formatDateTime = (dateTime) => {
        if (!dateTime) return '-';
        return new Date(dateTime).toLocaleString('pt-BR');
    };

    // Função para formatar apenas hora
    const formatTime = (dateTime) => {
        if (!dateTime) return '-';
        return new Date(dateTime).toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    // Função para abrir modal de detalhes
    const openDetailsModal = (pedido) => {
        setSelectedPedido(pedido);
        setIsDetailsModalOpen(true);
    };

    // Função para obter status selecionados
    const getSelectedStatus = () => {
        const selected = [];
        if (statusPedido.pendente) selected.push('Pendente');
        if (statusPedido.preparando) selected.push('Preparando');
        if (statusPedido.pronto) selected.push('Pronto');
        if (statusPedido.entregue) selected.push('Entregue');
        if (statusPedido.cancelado) selected.push('Cancelado');
        return selected;
    };

    // Função para obter tipos de entrega selecionados
    const getSelectedTiposEntrega = () => {
        const selected = [];
        if (tipoEntrega.mesa) selected.push('Mesa');
        if (tipoEntrega.delivery) selected.push('Delivery');
        if (tipoEntrega.balcao) selected.push('Balcão');
        if (tipoEntrega.retirada) selected.push('Retirada');
        return selected;
    };

    // Função para calcular totais
    const calcularTotais = () => {
        if (!relatorioData.length) return { custoTotal: 0, lucroTotal: 0, margemTotal: 0 };
        
        const totais = relatorioData.reduce((acc, item) => {
            acc.custoTotal += parseFloat(item.custo_total_pedido || 0);
            acc.lucroTotal += parseFloat(item.lucro_bruto || 0);
            return acc;
        }, { custoTotal: 0, lucroTotal: 0 });
        
        // Recalcular margem com base no custo total e lucro total
        const receitaTotal = totais.custoTotal + totais.lucroTotal;
        const margemTotal = receitaTotal > 0 ? (totais.lucroTotal / receitaTotal) * 100 : 0;
        
        return {
            custoTotal: totais.custoTotal,
            lucroTotal: totais.lucroTotal,
            margemTotal: margemTotal
        };
    };

    // Função para agrupar por horário
    const agruparPorHorario = () => {
        if (!relatorioData.length) return [];
        
        const grupos = {};
        relatorioData.forEach(pedido => {
            const hora = new Date(pedido.data_pedido).getHours();
            const horaInicio = `${hora.toString().padStart(2, '0')}:00`;
            const horaFim = `${(hora + 1).toString().padStart(2, '0')}:00`;
            const chave = `${horaInicio}-${horaFim}`;
            
            if (!grupos[chave]) {
                grupos[chave] = {
                    horario: chave,
                    totalPedidos: 0,
                    valorTotal: 0,
                    ticketMedio: 0
                };
            }
            
            grupos[chave].totalPedidos += 1;
            grupos[chave].valorTotal += parseFloat(pedido.valor_total || 0);
        });

        // Calcular ticket médio
        Object.values(grupos).forEach(grupo => {
            grupo.ticketMedio = grupo.totalPedidos > 0 ? grupo.valorTotal / grupo.totalPedidos : 0;
        });

        return Object.values(grupos).sort((a, b) => a.horario.localeCompare(b.horario));
    };

    // Função para agrupar por dia
    const agruparPorDia = () => {
        if (!relatorioData.length) return [];
        
        const grupos = {};
        relatorioData.forEach(pedido => {
            const data = new Date(pedido.data_pedido);
            const dataFormatada = data.toLocaleDateString('pt-BR');
            const chave = dataFormatada;
            
            if (!grupos[chave]) {
                grupos[chave] = {
                    data: chave,
                    dataOriginal: data,
                    totalPedidos: 0,
                    valorTotal: 0,
                    ticketMedio: 0
                };
            }
            
            grupos[chave].totalPedidos += 1;
            grupos[chave].valorTotal += parseFloat(pedido.valor_total || 0);
        });

        // Calcular ticket médio
        Object.values(grupos).forEach(grupo => {
            grupo.ticketMedio = grupo.totalPedidos > 0 ? grupo.valorTotal / grupo.totalPedidos : 0;
        });

        return Object.values(grupos).sort((a, b) => a.dataOriginal - b.dataOriginal);
    };

    // Função para processar itens do pedido
    const processarItens = (itensString) => {
        if (!itensString) return [];
        
        const itens = itensString.split(';').filter(item => item.trim());
        const itensProcessados = [];
        
        itens.forEach(item => {
            const match = item.match(/(\d+)x\s+(.+)/);
            if (match) {
                itensProcessados.push({
                    quantidade: parseInt(match[1]),
                    nome: match[2].trim()
                });
            } else {
                itensProcessados.push({
                    quantidade: 1,
                    nome: item.trim()
                });
            }
        });
        
        return itensProcessados;
    };

    // Função para exportar para Excel
    const exportToExcel = () => {
        if (!relatorioData.length) {
            toast.error('Não há dados para exportar');
            return;
        }

        const totais = calcularTotais();
        const gruposHorario = agruparPorHorario();
        const gruposDia = agruparPorDia();

        // Cria o conteúdo CSV
        const headers = [
            'ID Pedido', 'Nº Pedido', 'Data Pedido', 'Status', 'Tipo Entrega',
            'Valor Total', 'Taxa Entrega', 'Nome Cliente', 'Nome Funcionário',
            'Número Mesa', 'Itens do Pedido', 'Adicionais', 'Formas Pagamento',
            'Observações', 'Custo Total', 'Lucro Bruto', 'Margem Lucro %'
        ];

        const csvContent = [
            headers.join(','),
            ...relatorioData.map(item => [
                item.pedido_id,
                item.numero_pedido,
                formatDateTime(item.data_pedido),
                item.status_pedido,
                item.tipo_entrega,
                formatCurrency(item.valor_total),
                formatCurrency(item.taxa_entrega),
                item.nome_cliente || '-',
                item.nome_funcionario || '-',
                item.numero_mesa || '-',
                item.itens_do_pedido || '-',
                item.adicionais_do_pedido || '-',
                item.formas_pagamento || '-',
                item.observacoes_pedido || '-',
                formatCurrency(item.custo_total_pedido),
                formatCurrency(item.lucro_bruto),
                `${parseFloat(item.margem_lucro_percentual || 0).toFixed(2)}%`
            ].join(','))
        ];

        // Adiciona resumo por dia
        if (gruposDia.length > 0) {
            csvContent.push(''); // Linha em branco
            csvContent.push('RESUMO POR DIA');
            csvContent.push('Data,Total Pedidos,Valor Total,Ticket Médio');
            csvContent.push(...gruposDia.map(grupo => [
                grupo.data,
                grupo.totalPedidos,
                formatCurrency(grupo.valorTotal),
                formatCurrency(grupo.ticketMedio)
            ].join(',')).join('\n'));
        }

        // Adiciona resumo por horário
        if (gruposHorario.length > 0) {
            csvContent.push(''); // Linha em branco
            csvContent.push('RESUMO POR HORÁRIO');
            csvContent.push('Horário,Total Pedidos,Valor Total,Ticket Médio');
            csvContent.push(...gruposHorario.map(grupo => [
                grupo.horario,
                grupo.totalPedidos,
                formatCurrency(grupo.valorTotal),
                formatCurrency(grupo.ticketMedio)
            ].join(',')).join('\n'));
        }

        // Adiciona totais gerais
        csvContent.push(''); // Linha em branco
        csvContent.push('TOTAIS GERAIS');
        csvContent.push(`Total Pedidos,${relatorioData.length}`);
        csvContent.push(`Custo Total,${formatCurrency(totais.custoTotal)}`);
        csvContent.push(`Lucro Total,${formatCurrency(totais.lucroTotal)}`);
        csvContent.push(`Margem de Lucro,${totais.margemTotal.toFixed(2)}%`);

        // Cria e baixa o arquivo
        const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_pedidos_${empresa.nome_fantasia}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Relatório exportado com sucesso!');
    };

    // Função para exportar para PDF
    const exportToPDF = () => {
        if (!relatorioData.length) {
            toast.error('Não há dados para exportar');
            return;
        }

        const totais = calcularTotais();
        const gruposHorario = agruparPorHorario();
        const gruposDia = agruparPorDia();

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Relatório de Pedidos - ${empresa.nome_fantasia}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .status { padding: 4px 8px; border-radius: 4px; font-size: 11px; }
                        .status-pendente { background-color: #fef3c7; color: #92400e; }
                        .status-preparando { background-color: #dbeafe; color: #1e40af; }
                        .status-pronto { background-color: #d1fae5; color: #065f46; }
                        .status-entregue { background-color: #dbeafe; color: #1e40af; }
                        .status-cancelado { background-color: #fee2e2; color: #991b1b; }
                        .totals { background-color: #f8f9fa; font-weight: bold; }
                        .summary { margin-top: 30px; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Relatório de Pedidos</h1>
                        <h2>${empresa.nome_fantasia}</h2>
                        <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                    </div>
                    
                    <div class="summary">
                        <h3>Resumo Geral</h3>
                        <p><strong>Total de Pedidos:</strong> ${relatorioData.length}</p>
                        <p><strong>Custo Total:</strong> ${formatCurrency(totais.custoTotal)}</p>
                        <p><strong>Lucro Total:</strong> ${formatCurrency(totais.lucroTotal)}</p>
                        <p><strong>Margem de Lucro:</strong> ${totais.margemTotal.toFixed(2)}%</p>
                    </div>

                    <div class="summary">
                        <h3>Resumo por Dia</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Total Pedidos</th>
                                    <th>Valor Total</th>
                                    <th>Ticket Médio</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${gruposDia.map(grupo => `
                                    <tr>
                                        <td>${grupo.data}</td>
                                        <td>${grupo.totalPedidos}</td>
                                        <td>${formatCurrency(grupo.valorTotal)}</td>
                                        <td>${formatCurrency(grupo.ticketMedio)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="summary">
                        <h3>Resumo por Horário</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Horário</th>
                                    <th>Total Pedidos</th>
                                    <th>Valor Total</th>
                                    <th>Ticket Médio</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${gruposHorario.map(grupo => `
                                    <tr>
                                        <td>${grupo.horario}</td>
                                        <td>${grupo.totalPedidos}</td>
                                        <td>${formatCurrency(grupo.valorTotal)}</td>
                                        <td>${formatCurrency(grupo.ticketMedio)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nº Pedido</th>
                                <th>Data</th>
                                <th>Status</th>
                                <th>Tipo</th>
                                <th>Cliente</th>
                                <th>Valor Total</th>
                                <th>Custo</th>
                                <th>Lucro</th>
                                <th>Margem</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${relatorioData.map(item => `
                                <tr>
                                    <td>${item.pedido_id}</td>
                                    <td>${item.numero_pedido}</td>
                                    <td>${formatDateTime(item.data_pedido)}</td>
                                    <td><span class="status status-${item.status_pedido.toLowerCase()}">${item.status_pedido}</span></td>
                                    <td>${item.tipo_entrega}</td>
                                    <td>${item.nome_cliente || '-'}</td>
                                    <td>${formatCurrency(item.valor_total)}</td>
                                    <td>${formatCurrency(item.custo_total_pedido)}</td>
                                    <td>${formatCurrency(item.lucro_bruto)}</td>
                                    <td>${parseFloat(item.margem_lucro_percentual || 0).toFixed(2)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    // Função para imprimir
    const printReport = () => {
        if (!relatorioData.length) {
            toast.error('Não há dados para imprimir');
            return;
        }

        const totais = calcularTotais();
        const gruposHorario = agruparPorHorario();

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Relatório de Pedidos - ${empresa.nome_fantasia}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .status { padding: 4px 8px; border-radius: 4px; font-size: 11px; }
                        .status-pendente { background-color: #fef3c7; }
                        .status-preparando { background-color: #dbeafe; }
                        .status-pronto { background-color: #d1fae5; }
                        .status-entregue { background-color: #dbeafe; }
                        .status-cancelado { background-color: #fee2e2; }
                        .totais { margin-top: 20px; padding: 10px; background-color: #f9fafb; border-radius: 4px; }
                        .grupos { margin-top: 20px; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Relatório de Pedidos</h1>
                        <h2>${empresa.nome_fantasia}</h2>
                        <p>Período: ${dataInicio} a ${dataFim}</p>
                        <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                    </div>
                    
                    <div class="grupos">
                        <h3>Resumo por Horário</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Horário</th>
                                    <th>Total Pedidos</th>
                                    <th>Valor Total</th>
                                    <th>Ticket Médio</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${gruposHorario.map(grupo => `
                                    <tr>
                                        <td>${grupo.horario}</td>
                                        <td>${grupo.totalPedidos}</td>
                                        <td>${formatCurrency(grupo.valorTotal)}</td>
                                        <td>${formatCurrency(grupo.ticketMedio)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nº Pedido</th>
                                <th>Data/Hora</th>
                                <th>Status</th>
                                <th>Tipo</th>
                                <th>Cliente</th>
                                <th>Valor Total</th>
                                <th>Custo</th>
                                <th>Lucro</th>
                                <th>Margem %</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${relatorioData.map(item => `
                                <tr>
                                    <td>${item.pedido_id}</td>
                                    <td>${item.numero_pedido}</td>
                                    <td>${formatDateTime(item.data_pedido)}</td>
                                    <td><span class="status status-${item.status_pedido.toLowerCase()}">${item.status_pedido}</span></td>
                                    <td>${item.tipo_entrega}</td>
                                    <td>${item.nome_cliente || '-'}</td>
                                    <td>${formatCurrency(item.valor_total)}</td>
                                    <td>${formatCurrency(item.custo_total_pedido)}</td>
                                    <td>${formatCurrency(item.lucro_bruto)}</td>
                                    <td>${parseFloat(item.margem_lucro_percentual || 0).toFixed(2)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="totais">
                        <h3>Totais Gerais</h3>
                        <p><strong>Custo Total:</strong> ${formatCurrency(totais.custoTotal)}</p>
                        <p><strong>Lucro Total:</strong> ${formatCurrency(totais.lucroTotal)}</p>
                        <p><strong>Margem Total:</strong> ${parseFloat(totais.margemTotal).toFixed(2)}%</p>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    // Função para buscar o relatório
    const handleSearch = async () => {
        if (!empresa || !empresa.slug) {
            toast.error('Dados da empresa não carregados. Não é possível gerar o relatório.');
            return;
        }

        setLoadingRelatorio(true);
        setRelatorioData([]);
        setRelatorioGerado(false);

        try {
            const params = new URLSearchParams();
            params.append('empresa_id', empresa.id);
            if (dataInicio) params.append('data_inicio', dataInicio);
            if (dataFim) params.append('data_fim', dataFim);
            
            const selectedStatus = getSelectedStatus();
            if (selectedStatus.length > 0) {
                params.append('status_pedido', selectedStatus.join(','));
            }
            
            const selectedTipos = getSelectedTiposEntrega();
            if (selectedTipos.length > 0) {
                params.append('tipo_entrega', selectedTipos.join(','));
            }

            const response = await api.get(`gerencial/${empresa.slug}/relatorios/pedidos`, { params });
            
            setRelatorioData(response.data || []);
            setRelatorioGerado(true);
            
            if (response.data && response.data.length === 0) {
                toast.info("Nenhum resultado encontrado para os filtros selecionados.");
            } else {
                toast.success(`Relatório gerado com ${response.data?.length || 0} resultados.`);
            }

        } catch (err) {
            const msg = err.response?.data?.message || 'Erro ao gerar o relatório de pedidos.';
            toast.error(msg);
            console.error("Erro ao buscar relatório:", err);
            setRelatorioGerado(false);
        } finally {
            setLoadingRelatorio(false);
        }
    };

    if (empresaLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Carregando dados da empresa...</span>
                </div>
            </div>
        );
    }

    if (!empresa) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground">Nenhuma empresa selecionada</h3>
                    <p className="text-sm text-muted-foreground">Selecione uma empresa para visualizar o relatório de pedidos.</p>
                </div>
            </div>
        );
    }

    const totais = calcularTotais();
    const gruposHorario = agruparPorHorario();
    const gruposDia = agruparPorDia();
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Relatório de Pedidos</h1>
                <p className="text-muted-foreground">
                    Visualize e analise os dados de pedidos da empresa {empresa.nome_fantasia}
                </p>
            </div>

            {/* Seção de Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtros do Relatório
                    </CardTitle>
                    <CardDescription>
                        Configure os filtros para gerar o relatório de acordo com suas necessidades. 
                        <span className="text-blue-600 font-medium"> Se nenhum filtro for selecionado, o relatório completo será exibido.</span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        <div className="space-y-2">
                            <Label htmlFor="data_inicio" className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Data Início
                            </Label>
                            <Input 
                                id="data_inicio" 
                                type="date" 
                                value={dataInicio} 
                                onChange={(e) => setDataInicio(e.target.value)} 
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="data_fim" className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Data Fim
                            </Label>
                            <Input 
                                id="data_fim" 
                                type="date" 
                                value={dataFim} 
                                onChange={(e) => setDataFim(e.target.value)} 
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Status do Pedido
                            </Label>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="status_pendente" 
                                        checked={statusPedido.pendente}
                                        onCheckedChange={(checked) => setStatusPedido(prev => ({ ...prev, pendente: checked }))}
                                    />
                                    <Label htmlFor="status_pendente" className="text-sm">Pendente</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="status_preparando" 
                                        checked={statusPedido.preparando}
                                        onCheckedChange={(checked) => setStatusPedido(prev => ({ ...prev, preparando: checked }))}
                                    />
                                    <Label htmlFor="status_preparando" className="text-sm">Preparando</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="status_pronto" 
                                        checked={statusPedido.pronto}
                                        onCheckedChange={(checked) => setStatusPedido(prev => ({ ...prev, pronto: checked }))}
                                    />
                                    <Label htmlFor="status_pronto" className="text-sm">Pronto</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="status_entregue" 
                                        checked={statusPedido.entregue}
                                        onCheckedChange={(checked) => setStatusPedido(prev => ({ ...prev, entregue: checked }))}
                                    />
                                    <Label htmlFor="status_entregue" className="text-sm">Entregue</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="status_cancelado" 
                                        checked={statusPedido.cancelado}
                                        onCheckedChange={(checked) => setStatusPedido(prev => ({ ...prev, cancelado: checked }))}
                                    />
                                    <Label htmlFor="status_cancelado" className="text-sm">Cancelado</Label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Tipo de Entrega
                            </Label>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="tipo_mesa" 
                                        checked={tipoEntrega.mesa}
                                        onCheckedChange={(checked) => setTipoEntrega(prev => ({ ...prev, mesa: checked }))}
                                    />
                                    <Label htmlFor="tipo_mesa" className="text-sm">Mesa</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="tipo_delivery" 
                                        checked={tipoEntrega.delivery}
                                        onCheckedChange={(checked) => setTipoEntrega(prev => ({ ...prev, delivery: checked }))}
                                    />
                                    <Label htmlFor="tipo_delivery" className="text-sm">Delivery</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="tipo_balcao" 
                                        checked={tipoEntrega.balcao}
                                        onCheckedChange={(checked) => setTipoEntrega(prev => ({ ...prev, balcao: checked }))}
                                    />
                                    <Label htmlFor="tipo_balcao" className="text-sm">Balcão</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="tipo_retirada" 
                                        checked={tipoEntrega.retirada}
                                        onCheckedChange={(checked) => setTipoEntrega(prev => ({ ...prev, retirada: checked }))}
                                    />
                                    <Label htmlFor="tipo_retirada" className="text-sm">Retirada</Label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end mt-6">
                        <Button onClick={handleSearch} disabled={loadingRelatorio}>
                            {loadingRelatorio ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Gerando...
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />
                                    Gerar Relatório
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Botões de Exportação - Movidos para baixo dos filtros */}
            {relatorioGerado && relatorioData.length > 0 && (
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={exportToExcel}>
                                <Download className="mr-2 h-4 w-4" />
                                Exportar Excel
                            </Button>
                            <Button variant="outline" onClick={exportToPDF}>
                                <FileText className="mr-2 h-4 w-4" />
                                Exportar PDF
                            </Button>
                            <Button variant="outline" onClick={printReport}>
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimir
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Resumo por Dia */}
            {relatorioGerado && relatorioData.length > 0 && gruposDia.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Resumo por Dia
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                            <HelpCircle className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm">
                                        <div className="space-y-2">
                                            <p className="font-semibold">Resumo por Dia:</p>
                                            <div className="space-y-1 text-sm">
                                                <p><strong>Data:</strong> Data do pedido no formato brasileiro.</p>
                                                <p><strong>Total Pedidos:</strong> Quantidade de pedidos naquele dia.</p>
                                                <p><strong>Valor Total:</strong> Soma dos valores dos pedidos do dia.</p>
                                                <p><strong>Ticket Médio:</strong> Valor médio por pedido = Valor Total ÷ Total Pedidos.</p>
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="text-center">Total Pedidos</TableHead>
                                        <TableHead className="text-right">Valor Total</TableHead>
                                        <TableHead className="text-right">Ticket Médio</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {gruposDia.map((grupo, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">
                                                {grupo.data}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {grupo.totalPedidos}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(grupo.valorTotal)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(grupo.ticketMedio)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Resumo por Horário */}
            {relatorioGerado && relatorioData.length > 0 && gruposHorario.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Resumo por Horário
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                            <HelpCircle className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-md">
                                        <div className="space-y-2">
                                            <p className="font-semibold">Resumo por Horário:</p>
                                            <div className="space-y-1 text-sm">
                                                <p><strong>Horário:</strong> Faixa de 1 hora (ex: 08:00-09:00).</p>
                                                <p><strong>Total Pedidos:</strong> Quantidade de pedidos naquele horário.</p>
                                                <p><strong>Valor Total:</strong> Soma dos valores dos pedidos.</p>
                                                <p><strong>Ticket Médio:</strong> Valor médio por pedido = Valor Total ÷ Total Pedidos.</p>
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Horário</TableHead>
                                        <TableHead className="text-center">Total Pedidos</TableHead>
                                        <TableHead className="text-right">Valor Total</TableHead>
                                        <TableHead className="text-right">Ticket Médio</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {gruposHorario.map((grupo, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">
                                                {grupo.horario}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {grupo.totalPedidos}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(grupo.valorTotal)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(grupo.ticketMedio)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Seção da Tabela de Resultados */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                Resultados do Relatório
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                <HelpCircle className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-md">
                                            <div className="space-y-2">
                                                <p className="font-semibold">Como funciona o Relatório de Pedidos:</p>
                                                <div className="space-y-1 text-sm">
                                                    <p><strong>Filtros:</strong> Selecione período, status e tipo de entrega para filtrar os resultados.</p>
                                                    <p><strong>Custo Total:</strong> Soma de todos os custos dos produtos vendidos.</p>
                                                    <p><strong>Lucro Bruto:</strong> Diferença entre valor total e custo total.</p>
                                                    <p><strong>Margem de Lucro:</strong> Percentual calculado como (Lucro / Receita Total) × 100.</p>
                                                    <p><strong>Resumo por Horário:</strong> Agrupa pedidos por faixa de 1 hora (ex: 08:00-09:00).</p>
                                                    <p><strong>Ticket Médio:</strong> Valor médio por pedido em cada horário.</p>
                                                    <p><strong>Itens Processados:</strong> Quantidade e nome dos itens separados por "x".</p>
                                                </div>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </CardTitle>
                            <CardDescription>
                                {relatorioGerado 
                                    ? (relatorioData.length > 0 
                                        ? `${relatorioData.length} resultado(s) encontrado(s)`
                                        : 'Nenhum resultado encontrado para os filtros selecionados'
                                      )
                                    : 'Clique em "Gerar Relatório" para visualizar os dados'
                                }
                            </CardDescription>
                        </div>
                        
                        
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingRelatorio ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Gerando relatório...</span>
                            </div>
                        </div>
                    ) : !relatorioGerado ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                            <Package className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                                Relatório não gerado
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                Configure os filtros acima e clique em "Gerar Relatório" para visualizar os dados dos pedidos.
                            </p>
                        </div>
                    ) : relatorioData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                            <Package className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                                Nenhum resultado encontrado
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                Nenhum pedido encontrado para os filtros selecionados.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID Pedido</TableHead>
                                        <TableHead>Nº Pedido</TableHead>
                                        <TableHead>Data/Hora</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Tipo Entrega</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead className="text-right">Valor Total</TableHead>
                                        <TableHead className="text-right">Taxa Entrega</TableHead>
                                        <TableHead className="text-right">Custo</TableHead>
                                        <TableHead className="text-right">Lucro</TableHead>
                                        <TableHead className="text-right">Margem %</TableHead>
                                        <TableHead className="text-center">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {relatorioData.map((item, index) => (
                                        <TableRow key={item.pedido_id || index}>
                                            <TableCell className="font-medium">
                                                #{item.pedido_id}
                                            </TableCell>
                                            <TableCell>
                                                {item.numero_pedido}
                                            </TableCell>
                                            <TableCell>
                                                {formatDateTime(item.data_pedido)}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(item.status_pedido)}
                                            </TableCell>
                                            <TableCell>
                                                {item.tipo_entrega}
                                            </TableCell>
                                            <TableCell>
                                                {item.nome_cliente || '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(item.valor_total)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(item.taxa_entrega)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(item.custo_total_pedido)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-green-600">
                                                {formatCurrency(item.lucro_bruto)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-blue-600">
                                                {parseFloat(item.margem_lucro_percentual || 0).toFixed(2)}%
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openDetailsModal(item)}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    Detalhes
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Totais no Rodapé */}
            {relatorioGerado && relatorioData.length > 0 && (
                <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center">
                                <Label className="text-sm font-medium text-muted-foreground">Custo Total</Label>
                                <p className="text-2xl font-bold text-red-600">{formatCurrency(totais.custoTotal)}</p>
                            </div>
                            <div className="text-center">
                                <Label className="text-sm font-medium text-muted-foreground">Lucro Total</Label>
                                <p className="text-2xl font-bold text-green-600">{formatCurrency(totais.lucroTotal)}</p>
                            </div>
                            <div className="text-center">
                                <Label className="text-sm font-medium text-muted-foreground">Margem Total</Label>
                                <p className="text-2xl font-bold text-blue-600">{parseFloat(totais.margemTotal).toFixed(2)}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Modal de Detalhes */}
            <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Detalhes do Pedido #{selectedPedido?.pedido_id}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedPedido && (
                        <div className="space-y-6">
                            {/* Informações Básicas */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Informações Básicas</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">ID do Pedido</Label>
                                            <p className="text-lg font-semibold">#{selectedPedido.pedido_id}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Nº do Pedido</Label>
                                            <p className="text-lg font-semibold">{selectedPedido.numero_pedido}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                                            <div className="mt-1">{getStatusBadge(selectedPedido.status_pedido)}</div>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Data/Hora</Label>
                                            <p className="text-sm">{formatDateTime(selectedPedido.data_pedido)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Tipo de Entrega</Label>
                                            <p className="text-sm">{selectedPedido.tipo_entrega}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                                            <p className="text-sm">{selectedPedido.nome_cliente || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Funcionário</Label>
                                            <p className="text-sm">{selectedPedido.nome_funcionario || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Mesa</Label>
                                            <p className="text-sm">{selectedPedido.numero_mesa || '-'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Valores */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Valores</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Valor Total</Label>
                                            <p className="text-lg font-semibold">{formatCurrency(selectedPedido.valor_total)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Taxa de Entrega</Label>
                                            <p className="text-lg font-semibold">{formatCurrency(selectedPedido.taxa_entrega)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Custo Total</Label>
                                            <p className="text-lg font-semibold text-red-600">{formatCurrency(selectedPedido.custo_total_pedido)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Lucro Bruto</Label>
                                            <p className="text-lg font-semibold text-green-600">{formatCurrency(selectedPedido.lucro_bruto)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Margem de Lucro</Label>
                                            <p className="text-lg font-semibold text-blue-600">{parseFloat(selectedPedido.margem_lucro_percentual || 0).toFixed(2)}%</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Itens do Pedido */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Itens do Pedido</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {selectedPedido.itens_do_pedido ? (
                                        <div className="space-y-2">
                                            {processarItens(selectedPedido.itens_do_pedido).map((item, index) => (
                                                <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                                                    <span className="font-medium">{item.quantidade}x {item.nome}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">Nenhum item registrado</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Adicionais */}
                            {selectedPedido.adicionais_do_pedido && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Adicionais</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm bg-muted p-3 rounded-md">
                                            {selectedPedido.adicionais_do_pedido}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Formas de Pagamento */}
                            {selectedPedido.formas_pagamento && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Formas de Pagamento</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm bg-muted p-3 rounded-md">
                                            {selectedPedido.formas_pagamento}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Observações */}
                            {selectedPedido.observacoes_pedido && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Observações</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm bg-muted p-3 rounded-md">
                                            {selectedPedido.observacoes_pedido}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RelPedidos; 