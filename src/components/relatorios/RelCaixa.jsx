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
import { Loader2, Search, Filter, Calendar, DollarSign, Package, Download, Printer, Eye, HelpCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

const RelCaixa = () => {
    const { empresa, loading: empresaLoading } = useEmpresa();

    // Estados para os filtros
    const [dataAbertura, setDataAbertura] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [statusCaixa, setStatusCaixa] = useState({
        aberto: false,
        fechado: false
    });

    // Estados para os dados do relatório
    const [relatorioData, setRelatorioData] = useState([]);
    const [loadingRelatorio, setLoadingRelatorio] = useState(false);
    const [relatorioGerado, setRelatorioGerado] = useState(false);

    // Estados para o modal de detalhes
    const [selectedCaixa, setSelectedCaixa] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // Função para obter o badge de status
    const getStatusBadge = (status) => {
        let variant = 'secondary';
        switch (status) {
            case 'Aberto':
                variant = 'default';
                break;
            case 'Fechado':
                variant = 'outline';
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

    // Função para abrir modal de detalhes
    const openDetailsModal = (caixa) => {
        setSelectedCaixa(caixa);
        setIsDetailsModalOpen(true);
    };

    // Função para obter status selecionados
    const getSelectedStatus = () => {
        const selected = [];
        if (statusCaixa.aberto) selected.push('Aberto');
        if (statusCaixa.fechado) selected.push('Fechado');
        return selected;
    };

    // Função para exportar para Excel
    const exportToExcel = () => {
        if (!relatorioData.length) {
            toast.error('Não há dados para exportar');
            return;
        }

        // Cria o conteúdo CSV
        const headers = [
            'ID Caixa', 'Nº Caixa/Dia', 'Data Abertura', 'Data Fechamento', 'Status',
            'Valor Abertura', 'Total Pagamentos', 'Total Suprimentos', 'Total Sangrias',
            'Total Dinheiro', 'Total Cartão Crédito', 'Total Cartão Débito', 'Total PIX',
            'Total Outros', 'Total Vendas Mesa', 'Total Vendas Delivery', 'Total Vendas Balcão',
            'Total Vendas Retirada', 'Valor Fechamento Calculado', 'Valor Fechamento Informado',
            'Diferença', 'Funcionário Abertura', 'Funcionário Fechamento', 'Quantidade Pedidos',
            'Ticket Médio', 'Observações'
        ];

        const csvContent = [
            headers.join(','),
            ...relatorioData.map(item => [
                item.caixa_id,
                item.numero_caixa_dia,
                formatDateTime(item.data_abertura),
                formatDateTime(item.data_fechamento),
                item.status,
                formatCurrency(item.valor_abertura),
                formatCurrency(item.total_pagamentos_sistema),
                formatCurrency(item.total_suprimentos),
                formatCurrency(item.total_sangrias),
                formatCurrency(item.total_dinheiro),
                formatCurrency(item.total_cartao_credito),
                formatCurrency(item.total_cartao_debito),
                formatCurrency(item.total_pix),
                formatCurrency(item.total_outros),
                formatCurrency(item.total_vendas_mesa),
                formatCurrency(item.total_vendas_delivery),
                formatCurrency(item.total_vendas_balcao),
                formatCurrency(item.total_vendas_retirada),
                formatCurrency(item.valor_fechamento_sistema),
                formatCurrency(item.valor_fechamento_informado),
                formatCurrency(item.diferenca),
                item.funcionario_abertura_nome || '-',
                item.funcionario_fechamento_nome || '-',
                item.quantidade_pedidos || 0,
                formatCurrency(item.ticket_medio),
                item.observacoes_fechamento || '-'
            ].join(','))
        ].join('\n');

        // Cria e baixa o arquivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_caixa_${empresa.nome_fantasia}_${new Date().toISOString().split('T')[0]}.csv`);
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

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Relatório de Caixa - ${empresa.nome_fantasia}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .status { padding: 4px 8px; border-radius: 4px; font-size: 11px; }
                        .status-fechado { background-color: #e5e7eb; }
                        .status-aberto { background-color: #dbeafe; }
                        .summary { margin-top: 30px; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Relatório de Caixa</h1>
                        <h2>${empresa.nome_fantasia}</h2>
                        <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                    </div>
                    
                    <div class="summary">
                        <h3>Resumo Geral</h3>
                        <p><strong>Total de Caixas:</strong> ${relatorioData.length}</p>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nº/Dia</th>
                                <th>Abertura</th>
                                <th>Fechamento</th>
                                <th>Status</th>
                                <th>Valor Abertura</th>
                                <th>Total Vendas Dinheiro</th>
                                <th>Suprimentos</th>
                                <th>Sangrias</th>
                                <th>Fechamento Sistema</th>
                                <th>Fechamento Informado</th>
                                <th>Diferença</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${relatorioData.map(item => `
                                <tr>
                                    <td>${item.caixa_id}</td>
                                    <td>${item.numero_caixa_dia}</td>
                                    <td>${formatDateTime(item.data_abertura)}</td>
                                    <td>${formatDateTime(item.data_fechamento)}</td>
                                    <td><span class="status status-${item.status.toLowerCase()}">${item.status}</span></td>
                                    <td>${formatCurrency(item.valor_abertura)}</td>
                                    <td>${formatCurrency(item.total_dinheiro)}</td>
                                    <td>${formatCurrency(item.total_suprimentos)}</td>
                                    <td>${formatCurrency(item.total_sangrias)}</td>
                                    <td>${formatCurrency(item.valor_fechamento_sistema)}</td>
                                    <td>${formatCurrency(item.valor_fechamento_informado)}</td>
                                    <td style="color: ${parseFloat(item.diferenca || 0) < 0 ? 'red' : 'green'}">${formatCurrency(item.diferenca)}</td>
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

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Relatório de Caixa - ${empresa.nome_fantasia}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .status { padding: 4px 8px; border-radius: 4px; font-size: 11px; }
                        .status-fechado { background-color: #e5e7eb; }
                        .status-aberto { background-color: #dbeafe; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Relatório de Caixa</h1>
                        <h2>${empresa.nome_fantasia}</h2>
                        <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nº/Dia</th>
                                <th>Abertura</th>
                                <th>Fechamento</th>
                                <th>Status</th>
                                <th>Valor Abertura</th>
                                <th>Total Vendas Dinheiro</th>
                                <th>Suprimentos</th>
                                <th>Sangrias</th>
                                <th>Fechamento Sistema</th>
                                <th>Fechamento Informado</th>
                                <th>Diferença</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${relatorioData.map(item => `
                                <tr>
                                    <td>${item.caixa_id}</td>
                                    <td>${item.numero_caixa_dia}</td>
                                    <td>${formatDateTime(item.data_abertura)}</td>
                                    <td>${formatDateTime(item.data_fechamento)}</td>
                                    <td><span class="status status-${item.status.toLowerCase()}">${item.status}</span></td>
                                    <td>${formatCurrency(item.valor_abertura)}</td>
                                    <td>${formatCurrency(item.total_dinheiro)}</td>
                                    <td>${formatCurrency(item.total_suprimentos)}</td>
                                    <td>${formatCurrency(item.total_sangrias)}</td>
                                    <td>${formatCurrency(item.valor_fechamento_sistema)}</td>
                                    <td>${formatCurrency(item.valor_fechamento_informado)}</td>
                                    <td style="color: ${parseFloat(item.diferenca || 0) < 0 ? 'red' : 'green'}">${formatCurrency(item.diferenca)}</td>
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
            // Monta os parâmetros da query
            const params = new URLSearchParams();
            params.append('empresa_id', empresa.id); // Sempre envia o empresa_id
            if (dataAbertura) params.append('data_abertura', dataAbertura);
            
            const selectedStatus = getSelectedStatus();
            if (selectedStatus.length > 0) {
                params.append('status_caixa', selectedStatus.join(','));
            }

            const response = await api.get(`gerencial/${empresa.slug}/relatorios/caixa`, { params });
            
            setRelatorioData(response.data || []);
            setRelatorioGerado(true);
            
            if (response.data && response.data.length === 0) {
                toast.info("Nenhum resultado encontrado para os filtros selecionados.");
            } else {
                toast.success(`Relatório gerado com ${response.data?.length || 0} resultados.`);
            }

        } catch (err) {
            const msg = err.response?.data?.message || 'Erro ao gerar o relatório de caixa.';
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
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground">Nenhuma empresa selecionada</h3>
                    <p className="text-sm text-muted-foreground">Selecione uma empresa para visualizar o relatório de caixa.</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Relatório de Caixa</h1>
                <p className="text-muted-foreground">
                    Visualize e analise os dados de caixa da empresa {empresa.nome_fantasia}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <div className="space-y-2">
                            <Label htmlFor="data_abertura" className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Data Abertura
                            </Label>
                            <Input 
                                id="data_abertura" 
                                type="date" 
                                value={dataAbertura} 
                                onChange={(e) => setDataAbertura(e.target.value)} 
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Status do Caixa
                            </Label>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="status_aberto" 
                                        checked={statusCaixa.aberto}
                                        onCheckedChange={(checked) => setStatusCaixa(prev => ({ ...prev, aberto: checked }))}
                                    />
                                    <Label htmlFor="status_aberto" className="text-sm">Aberto</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="status_fechado" 
                                        checked={statusCaixa.fechado}
                                        onCheckedChange={(checked) => setStatusCaixa(prev => ({ ...prev, fechado: checked }))}
                                    />
                                    <Label htmlFor="status_fechado" className="text-sm">Fechado</Label>
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
                                        <TooltipContent className="max-w-sm">
                                            <div className="space-y-2">
                                                <p className="font-semibold">Explicação do Fechamento:</p>
                                                <div className="space-y-1 text-sm">
                                                    <p><strong>Valor Inicial:</strong> Valor informado na abertura do caixa (troco).</p>
                                                    <p><strong>Total Pagamentos:</strong> Valores recebidos em dinheiro neste caixa.</p>
                                                    <p><strong>Suprimento:</strong> Quantias de dinheiro adicionadas após abertura.</p>
                                                    <p><strong>Sangria:</strong> Quantias retiradas do caixa.</p>
                                                    <p><strong>Valor (Sistema):</strong> Calculado: inicial + pagamentos + suprimento - sangria.</p>
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
                                Configure os filtros acima e clique em "Gerar Relatório" para visualizar os dados do caixa.
                            </p>
                        </div>
                    ) : relatorioData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                            <Package className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                                Nenhum resultado encontrado
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                Nenhum registro de caixa encontrado para os filtros selecionados.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID Caixa</TableHead>
                                        <TableHead>Nº Caixa/Dia</TableHead>
                                        <TableHead>Abertura</TableHead>
                                        <TableHead>Fechamento</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Valor Abertura</TableHead>
                                        <TableHead className="text-right">Total Vendas Dinheiro</TableHead>
                                        <TableHead className="text-right">Suprimentos</TableHead>
                                        <TableHead className="text-right">Sangrias</TableHead>
                                        <TableHead className="text-right">Fechamento Sistema</TableHead>
                                        <TableHead className="text-right">Fechamento Informado</TableHead>
                                        <TableHead className="text-right">Diferença</TableHead>
                                        <TableHead className="text-center">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {relatorioData.map((item, index) => (
                                        <TableRow key={item.caixa_id || index}>
                                            <TableCell className="font-medium">
                                                #{item.caixa_id}
                                            </TableCell>
                                            <TableCell>
                                                {item.numero_caixa_dia}
                                            </TableCell>
                                            <TableCell>
                                                {formatDateTime(item.data_abertura)}
                                            </TableCell>
                                            <TableCell>
                                                {formatDateTime(item.data_fechamento)}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(item.status)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(item.valor_abertura)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-green-600">
                                                {formatCurrency(item.total_dinheiro)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-green-600">
                                                {formatCurrency(item.total_suprimentos)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-red-600">
                                                {formatCurrency(item.total_sangrias)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(item.valor_fechamento_sistema)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(item.valor_fechamento_informado)}
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${
                                                parseFloat(item.diferenca || 0) < 0 ? 'text-red-600' : 'text-green-600'
                                            }`}>
                                                {formatCurrency(item.diferenca)}
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

            {/* Descrição das Cores */}
            {relatorioGerado && relatorioData.length > 0 && (
                <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                                <span className="text-green-600 font-medium">Verde: Soma no caixa</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                                <span className="text-red-600 font-medium">Vermelho: Subtrai do caixa</span>
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
                            <DollarSign className="h-5 w-5" />
                            Detalhes do Caixa #{selectedCaixa?.caixa_id}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedCaixa && (
                        <div className="space-y-6">
                            {/* Informações Básicas */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Informações Básicas</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">ID do Caixa</Label>
                                            <p className="text-lg font-semibold">#{selectedCaixa.caixa_id}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Nº Caixa/Dia</Label>
                                            <p className="text-lg font-semibold">{selectedCaixa.numero_caixa_dia}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                                            <div className="mt-1">{getStatusBadge(selectedCaixa.status)}</div>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Data de Abertura</Label>
                                            <p className="text-sm">{formatDateTime(selectedCaixa.data_abertura)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Data de Fechamento</Label>
                                            <p className="text-sm">{formatDateTime(selectedCaixa.data_fechamento)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Funcionário Abertura</Label>
                                            <p className="text-sm">{selectedCaixa.funcionario_abertura_nome || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Funcionário Fechamento</Label>
                                            <p className="text-sm">{selectedCaixa.funcionario_fechamento_nome || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Quantidade de Pedidos</Label>
                                            <p className="text-lg font-semibold">{selectedCaixa.quantidade_pedidos || 0}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Ticket Médio</Label>
                                            <p className="text-lg font-semibold">{formatCurrency(selectedCaixa.ticket_medio)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Suprimentos e Sangrias */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Suprimentos e Sangrias</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Total Suprimentos</Label>
                                            <p className="text-lg font-semibold text-green-600">{formatCurrency(selectedCaixa.total_suprimentos)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Total Sangrias</Label>
                                            <p className="text-lg font-semibold text-red-600">{formatCurrency(selectedCaixa.total_sangrias)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Formas de Pagamento */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Formas de Pagamento</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Dinheiro</Label>
                                            <p className="text-lg font-semibold">{formatCurrency(selectedCaixa.total_dinheiro)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Cartão de Crédito</Label>
                                            <p className="text-lg font-semibold">{formatCurrency(selectedCaixa.total_cartao_credito)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Cartão de Débito</Label>
                                            <p className="text-lg font-semibold">{formatCurrency(selectedCaixa.total_cartao_debito)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">PIX</Label>
                                            <p className="text-lg font-semibold">{formatCurrency(selectedCaixa.total_pix)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Outros</Label>
                                            <p className="text-lg font-semibold">{formatCurrency(selectedCaixa.total_outros)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Vendas por Tipo */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Vendas por Tipo</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Mesa</Label>
                                            <p className="text-lg font-semibold">{formatCurrency(selectedCaixa.total_vendas_mesa)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Delivery</Label>
                                            <p className="text-lg font-semibold">{formatCurrency(selectedCaixa.total_vendas_delivery)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Balcão</Label>
                                            <p className="text-lg font-semibold">{formatCurrency(selectedCaixa.total_vendas_balcao)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Retirada</Label>
                                            <p className="text-lg font-semibold">{formatCurrency(selectedCaixa.total_vendas_retirada)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Observações */}
                            {selectedCaixa.observacoes_fechamento && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Observações de Fechamento</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm bg-muted p-3 rounded-md">
                                            {selectedCaixa.observacoes_fechamento}
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

export default RelCaixa;
