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
import { Loader2, Search, Filter, Calendar, Package, Download, Printer, Eye, HelpCircle, FileText, Box } from 'lucide-react';
import { toast } from 'sonner';

const RelEstoque = () => {
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
    const [resultado, setResultado] = useState({
        positivo: false,
        negativo: false,
        zerado: false
    });
    const [curva, setCurva] = useState({
        a: false,
        b: false,
        c: false
    });

    // Estados para os dados do relatório
    const [relatorioData, setRelatorioData] = useState([]);
    const [loadingRelatorio, setLoadingRelatorio] = useState(false);
    const [relatorioGerado, setRelatorioGerado] = useState(false);

    // Estados para o modal de detalhes
    const [selectedProduto, setSelectedProduto] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // Função para obter o badge de resultado
    const getResultadoBadge = (resultado) => {
        let variant = 'secondary';
        switch (resultado) {
            case 'Positivo':
                variant = 'default';
                break;
            case 'Negativo':
                variant = 'destructive';
                break;
            case 'Zerado':
                variant = 'outline';
                break;
            default:
                variant = 'secondary';
        }
        return <Badge variant={variant}>{resultado}</Badge>;
    };

    // Função para obter o badge de curva
    const getCurvaBadge = (curva) => {
        let variant = 'secondary';
        switch (curva) {
            case 'A':
                variant = 'default';
                break;
            case 'B':
                variant = 'secondary';
                break;
            case 'C':
                variant = 'outline';
                break;
            default:
                variant = 'secondary';
        }
        return <Badge variant={variant}>Curva {curva}</Badge>;
    };

    // Função para formatar valores monetários
    const formatCurrency = (value) => {
        return `R$ ${parseFloat(value || 0).toFixed(2)}`;
    };

    // Função para formatar data
    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR');
    };

    // Função para abrir modal de detalhes
    const openDetailsModal = (produto) => {
        setSelectedProduto(produto);
        setIsDetailsModalOpen(true);
    };

    // Função para obter resultados selecionados
    const getSelectedResultados = () => {
        const selected = [];
        if (resultado.positivo) selected.push('Positivo');
        if (resultado.negativo) selected.push('Negativo');
        if (resultado.zerado) selected.push('Zerado');
        return selected;
    };

    // Função para obter curvas selecionadas
    const getSelectedCurvas = () => {
        const selected = [];
        if (curva.a) selected.push('A');
        if (curva.b) selected.push('B');
        if (curva.c) selected.push('C');
        return selected;
    };

    // Função para calcular totais
    const calcularTotais = () => {
        if (!relatorioData.length) return { 
            custoTotal: 0, 
            valorTotalCusto: 0,
            quantidadeVendida: 0,
            faturamentoTotal: 0,
            lucroBruto: 0,
            margemTotal: 0,
            quantidadeTotal: 0
        };
        
        const totais = relatorioData.reduce((acc, item) => {
            acc.custoTotal += parseFloat(item.custo_unitario || 0);
            acc.valorTotalCusto += parseFloat(item.valor_total_custo_estoque || 0);
            acc.quantidadeVendida += parseFloat(item.quantidade_vendida_periodo || 0);
            acc.faturamentoTotal += parseFloat(item.faturamento_total_periodo || 0);
            acc.lucroBruto += parseFloat(item.lucro_bruto_periodo || 0);
            acc.quantidadeTotal += parseFloat(item.estoque_atual || 0);
            return acc;
        }, { custoTotal: 0, valorTotalCusto: 0, quantidadeVendida: 0, faturamentoTotal: 0, lucroBruto: 0, quantidadeTotal: 0 });
        
        // Recalcular margem com base no faturamento total e lucro bruto
        const margemTotal = totais.faturamentoTotal > 0 ? (totais.lucroBruto / totais.faturamentoTotal) * 100 : 0;
        
        return {
            custoTotal: totais.custoTotal,
            valorTotalCusto: totais.valorTotalCusto,
            quantidadeVendida: totais.quantidadeVendida,
            faturamentoTotal: totais.faturamentoTotal,
            lucroBruto: totais.lucroBruto,
            margemTotal: margemTotal,
            quantidadeTotal: totais.quantidadeTotal
        };
    };

    // Função para exportar para Excel
    const exportToExcel = () => {
        if (!relatorioData.length) {
            toast.error('Não há dados para exportar');
            return;
        }

        const totais = calcularTotais();

        // Cria o conteúdo CSV
        const headers = [
            'ID Produto', 'Nome Produto', 'Categoria', 'Estoque Atual', 'Custo Unitário',
            'Valor Total Custo Estoque', 'Status Estoque', 'Quantidade Vendida Período',
            'Faturamento Total Período', 'Lucro Bruto Período', 'Margem Lucro %', 'Curva ABC'
        ];

        const csvContent = [
            headers.join(','),
            ...relatorioData.map(item => [
                item.produto_id,
                item.nome_produto,
                item.categoria || '-',
                item.estoque_atual,
                formatCurrency(item.custo_unitario),
                formatCurrency(item.valor_total_custo_estoque),
                item.status_estoque,
                item.quantidade_vendida_periodo,
                formatCurrency(item.faturamento_total_periodo),
                formatCurrency(item.lucro_bruto_periodo),
                `${parseFloat(item.margem_lucro_percentual || 0).toFixed(2)}%`,
                item.curva_abc_periodo
            ].join(','))
        ];

        // Adiciona totais gerais
        csvContent.push(''); // Linha em branco
        csvContent.push('TOTAIS GERAIS');
        csvContent.push(`Total Produtos,${relatorioData.length}`);
        csvContent.push(`Quantidade Total em Estoque,${totais.quantidadeTotal}`);
        csvContent.push(`Custo Total Unitário,${formatCurrency(totais.custoTotal)}`);
        csvContent.push(`Valor Total Custo Estoque,${formatCurrency(totais.valorTotalCusto)}`);
        csvContent.push(`Quantidade Vendida Período,${totais.quantidadeVendida}`);
        csvContent.push(`Faturamento Total Período,${formatCurrency(totais.faturamentoTotal)}`);
        csvContent.push(`Lucro Bruto Período,${formatCurrency(totais.lucroBruto)}`);
        csvContent.push(`Margem de Lucro,${totais.margemTotal.toFixed(2)}%`);

        // Cria e baixa o arquivo
        const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_estoque_${empresa.nome_fantasia}_${new Date().toISOString().split('T')[0]}.csv`);
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

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Relatório de Estoque - ${empresa.nome_fantasia}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .status { padding: 4px 8px; border-radius: 4px; font-size: 11px; }
                        .status-positivo { background-color: #d1fae5; color: #065f46; }
                        .status-negativo { background-color: #fee2e2; color: #991b1b; }
                        .status-zerado { background-color: #e5e7eb; color: #374151; }
                        .curva-a { background-color: #dbeafe; color: #1e40af; }
                        .curva-b { background-color: #fef3c7; color: #92400e; }
                        .curva-c { background-color: #e5e7eb; color: #374151; }
                        .summary { margin-top: 30px; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Relatório de Estoque</h1>
                        <h2>${empresa.nome_fantasia}</h2>
                        <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                    </div>
                    
                    <div class="summary">
                        <h3>Resumo Geral</h3>
                        <p><strong>Total de Produtos:</strong> ${relatorioData.length}</p>
                        <p><strong>Quantidade Total em Estoque:</strong> ${totais.quantidadeTotal}</p>
                        <p><strong>Valor Total Custo Estoque:</strong> ${formatCurrency(totais.valorTotalCusto)}</p>
                        <p><strong>Quantidade Vendida Período:</strong> ${totais.quantidadeVendida}</p>
                        <p><strong>Faturamento Total Período:</strong> ${formatCurrency(totais.faturamentoTotal)}</p>
                        <p><strong>Lucro Bruto Período:</strong> ${formatCurrency(totais.lucroBruto)}</p>
                        <p><strong>Margem de Lucro:</strong> ${totais.margemTotal.toFixed(2)}%</p>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Produto</th>
                                <th>Categoria</th>
                                <th>Estoque</th>
                                <th>Custo Unit.</th>
                                <th>Valor Custo Estoque</th>
                                <th>Status</th>
                                <th>Qtd Vendida</th>
                                <th>Faturamento</th>
                                <th>Lucro Bruto</th>
                                <th>Margem</th>
                                <th>Curva</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${relatorioData.map(item => `
                                <tr>
                                    <td>${item.produto_id}</td>
                                    <td>${item.nome_produto}</td>
                                    <td>${item.categoria || '-'}</td>
                                    <td>${item.estoque_atual}</td>
                                    <td>${formatCurrency(item.custo_unitario)}</td>
                                    <td>${formatCurrency(item.valor_total_custo_estoque)}</td>
                                    <td><span class="status status-${item.status_estoque.toLowerCase()}">${item.status_estoque}</span></td>
                                    <td>${item.quantidade_vendida_periodo}</td>
                                    <td>${formatCurrency(item.faturamento_total_periodo)}</td>
                                    <td>${formatCurrency(item.lucro_bruto_periodo)}</td>
                                    <td>${parseFloat(item.margem_lucro_percentual || 0).toFixed(2)}%</td>
                                    <td><span class="curva-${item.curva_abc_periodo.toLowerCase()}">Curva ${item.curva_abc_periodo}</span></td>
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

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Relatório de Estoque - ${empresa.nome_fantasia}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .status { padding: 4px 8px; border-radius: 4px; font-size: 11px; }
                        .status-positivo { background-color: #d1fae5; color: #065f46; }
                        .status-negativo { background-color: #fee2e2; color: #991b1b; }
                        .status-zerado { background-color: #e5e7eb; color: #374151; }
                        .curva-a { background-color: #dbeafe; color: #1e40af; }
                        .curva-b { background-color: #fef3c7; color: #92400e; }
                        .curva-c { background-color: #e5e7eb; color: #374151; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Relatório de Estoque</h1>
                        <h2>${empresa.nome_fantasia}</h2>
                        <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Produto</th>
                                <th>Categoria</th>
                                <th>Estoque</th>
                                <th>Custo Unit.</th>
                                <th>Valor Custo Estoque</th>
                                <th>Status</th>
                                <th>Qtd Vendida</th>
                                <th>Faturamento</th>
                                <th>Lucro Bruto</th>
                                <th>Margem</th>
                                <th>Curva</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${relatorioData.map(item => `
                                <tr>
                                    <td>${item.produto_id}</td>
                                    <td>${item.nome_produto}</td>
                                    <td>${item.categoria || '-'}</td>
                                    <td>${item.estoque_atual}</td>
                                    <td>${formatCurrency(item.custo_unitario)}</td>
                                    <td>${formatCurrency(item.valor_total_custo_estoque)}</td>
                                    <td><span class="status status-${item.status_estoque.toLowerCase()}">${item.status_estoque}</span></td>
                                    <td>${item.quantidade_vendida_periodo}</td>
                                    <td>${formatCurrency(item.faturamento_total_periodo)}</td>
                                    <td>${formatCurrency(item.lucro_bruto_periodo)}</td>
                                    <td>${parseFloat(item.margem_lucro_percentual || 0).toFixed(2)}%</td>
                                    <td><span class="curva-${item.curva_abc_periodo.toLowerCase()}">Curva ${item.curva_abc_periodo}</span></td>
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
            const params = new URLSearchParams();
            params.append('empresa_id', empresa.id);
            if (dataInicio) params.append('data_inicio', dataInicio);
            if (dataFim) params.append('data_fim', dataFim);
            
            const selectedResultados = getSelectedResultados();
            if (selectedResultados.length > 0) {
                params.append('resultado', selectedResultados.join(','));
            }
            
            const selectedCurvas = getSelectedCurvas();
            if (selectedCurvas.length > 0) {
                params.append('curva', selectedCurvas.join(','));
            }

            const response = await api.get(`gerencial/${empresa.slug}/relatorios/estoque`, { params });
            
            setRelatorioData(response.data || []);
            setRelatorioGerado(true);
            
            if (response.data && response.data.length === 0) {
                toast.info("Nenhum resultado encontrado para os filtros selecionados.");
            } else {
                toast.success(`Relatório gerado com ${response.data?.length || 0} resultados.`);
            }

        } catch (err) {
            const msg = err.response?.data?.message || 'Erro ao gerar o relatório de estoque.';
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
                    <Box className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground">Nenhuma empresa selecionada</h3>
                    <p className="text-sm text-muted-foreground">Selecione uma empresa para visualizar o relatório de estoque.</p>
                </div>
            </div>
        );
    }

    const totais = calcularTotais();
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Relatório de Estoque</h1>
                <p className="text-muted-foreground">
                    Visualize e analise os dados de estoque da empresa {empresa.nome_fantasia}
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
                                Resultado
                            </Label>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="resultado_positivo" 
                                        checked={resultado.positivo}
                                        onCheckedChange={(checked) => setResultado(prev => ({ ...prev, positivo: checked }))}
                                    />
                                    <Label htmlFor="resultado_positivo" className="text-sm">Positivo</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="resultado_negativo" 
                                        checked={resultado.negativo}
                                        onCheckedChange={(checked) => setResultado(prev => ({ ...prev, negativo: checked }))}
                                    />
                                    <Label htmlFor="resultado_negativo" className="text-sm">Negativo</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="resultado_zerado" 
                                        checked={resultado.zerado}
                                        onCheckedChange={(checked) => setResultado(prev => ({ ...prev, zerado: checked }))}
                                    />
                                    <Label htmlFor="resultado_zerado" className="text-sm">Zerado</Label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Curva
                            </Label>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="curva_a" 
                                        checked={curva.a}
                                        onCheckedChange={(checked) => setCurva(prev => ({ ...prev, a: checked }))}
                                    />
                                    <Label htmlFor="curva_a" className="text-sm">A</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="curva_b" 
                                        checked={curva.b}
                                        onCheckedChange={(checked) => setCurva(prev => ({ ...prev, b: checked }))}
                                    />
                                    <Label htmlFor="curva_b" className="text-sm">B</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="curva_c" 
                                        checked={curva.c}
                                        onCheckedChange={(checked) => setCurva(prev => ({ ...prev, c: checked }))}
                                    />
                                    <Label htmlFor="curva_c" className="text-sm">C</Label>
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
                                        <TooltipContent className="max-w-md">
                                            <div className="space-y-2">
                                                <p className="font-semibold">Como funciona o Relatório de Estoque:</p>
                                                <div className="space-y-1 text-sm">
                                                    <p><strong>Filtros:</strong> Selecione período, resultado e curva para filtrar os produtos.</p>
                                                    <p><strong>Estoque Atual:</strong> Quantidade disponível em estoque.</p>
                                                    <p><strong>Custo Unitário:</strong> Custo de cada unidade do produto.</p>
                                                    <p><strong>Valor Total Custo Estoque:</strong> Custo unitário x estoque atual.</p>
                                                    <p><strong>Status Estoque:</strong> Positivo (estoque &gt; 0), Negativo (estoque &lt; 0), Zerado (estoque = 0).</p>
                                                    <p><strong>Quantidade Vendida Período:</strong> Quantidade vendida no período filtrado.</p>
                                                    <p><strong>Faturamento Total Período:</strong> Valor total vendido no período.</p>
                                                    <p><strong>Lucro Bruto Período:</strong> Faturamento - custos do período.</p>
                                                    <p><strong>Margem de Lucro:</strong> Percentual calculado como (Lucro / Faturamento) x 100.</p>
                                                    <p><strong>Curva ABC:</strong> Classificação do produto (A = alta importância, C = baixa importância).</p>
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
                            <Box className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                                Relatório não gerado
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                Configure os filtros acima e clique em "Gerar Relatório" para visualizar os dados de estoque.
                            </p>
                        </div>
                    ) : relatorioData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                            <Box className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                                Nenhum resultado encontrado
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                Nenhum produto encontrado para os filtros selecionados.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID Produto</TableHead>
                                        <TableHead>Nome Produto</TableHead>
                                        <TableHead>Categoria</TableHead>
                                        <TableHead className="text-center">Estoque Atual</TableHead>
                                        <TableHead className="text-right">Custo Unitário</TableHead>
                                        <TableHead className="text-right">Valor Custo Estoque</TableHead>
                                        <TableHead>Status Estoque</TableHead>
                                        <TableHead className="text-center">Qtd Vendida Período</TableHead>
                                        <TableHead className="text-right">Faturamento Período</TableHead>
                                        <TableHead className="text-right">Lucro Bruto Período</TableHead>
                                        <TableHead className="text-right">Margem</TableHead>
                                        <TableHead>Curva ABC</TableHead>
                                        <TableHead className="text-center">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {relatorioData.map((item, index) => (
                                        <TableRow key={item.produto_id || index}>
                                            <TableCell className="font-medium">
                                                #{item.produto_id}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {item.nome_produto}
                                            </TableCell>
                                            <TableCell>
                                                {item.categoria || '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.estoque_atual}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(item.custo_unitario)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(item.valor_total_custo_estoque)}
                                            </TableCell>
                                            <TableCell>
                                                {getResultadoBadge(item.status_estoque)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.quantidade_vendida_periodo}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(item.faturamento_total_periodo)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(item.lucro_bruto_periodo)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {parseFloat(item.margem_lucro_percentual || 0).toFixed(2)}%
                                            </TableCell>
                                            <TableCell>
                                                {getCurvaBadge(item.curva_abc_periodo)}
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

            {/* Totais */}
            {relatorioGerado && relatorioData.length > 0 && (
                <Card className="bg-muted/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Totais do Relatório</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Total Produtos</Label>
                                <p className="text-2xl font-bold">{relatorioData.length}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Quantidade Total em Estoque</Label>
                                <p className="text-2xl font-bold text-blue-600">{totais.quantidadeTotal}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Valor Total Custo Estoque</Label>
                                <p className="text-2xl font-bold text-red-600">{formatCurrency(totais.valorTotalCusto)}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Quantidade Vendida Período</Label>
                                <p className="text-2xl font-bold text-green-600">{totais.quantidadeVendida}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Faturamento Total Período</Label>
                                <p className="text-2xl font-bold text-green-600">{formatCurrency(totais.faturamentoTotal)}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Lucro Bruto Período</Label>
                                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totais.lucroBruto)}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Margem de Lucro</Label>
                                <p className="text-2xl font-bold text-purple-600">{totais.margemTotal.toFixed(2)}%</p>
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
                            <Box className="h-5 w-5" />
                            Detalhes do Produto #{selectedProduto?.produto_id}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedProduto && (
                        <div className="space-y-6">
                            {/* Informações Básicas */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Informações Básicas</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">ID do Produto</Label>
                                            <p className="text-lg font-semibold">#{selectedProduto.produto_id}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Nome do Produto</Label>
                                            <p className="text-lg font-semibold">{selectedProduto.nome_produto}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Categoria</Label>
                                            <p className="text-lg font-semibold">{selectedProduto.categoria || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Estoque Atual</Label>
                                            <p className="text-2xl font-bold text-blue-600">{selectedProduto.estoque_atual}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Status Estoque</Label>
                                            <div className="mt-1">{getResultadoBadge(selectedProduto.status_estoque)}</div>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Curva ABC</Label>
                                            <div className="mt-1">{getCurvaBadge(selectedProduto.curva_abc_periodo)}</div>
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Custo Unitário</Label>
                                            <p className="text-lg font-semibold text-red-600">{formatCurrency(selectedProduto.custo_unitario)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Valor Total Custo Estoque</Label>
                                            <p className="text-lg font-semibold text-red-600">{formatCurrency(selectedProduto.valor_total_custo_estoque)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Quantidade Vendida Período</Label>
                                            <p className="text-lg font-semibold text-green-600">{selectedProduto.quantidade_vendida_periodo}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Faturamento Total Período</Label>
                                            <p className="text-lg font-semibold text-green-600">{formatCurrency(selectedProduto.faturamento_total_periodo)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Lucro Bruto Período</Label>
                                            <p className="text-lg font-semibold text-purple-600">{formatCurrency(selectedProduto.lucro_bruto_periodo)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Margem de Lucro</Label>
                                            <p className="text-lg font-semibold text-purple-600">{parseFloat(selectedProduto.margem_lucro_percentual || 0).toFixed(2)}%</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RelEstoque; 