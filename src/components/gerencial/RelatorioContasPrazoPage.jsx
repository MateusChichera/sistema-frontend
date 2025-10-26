import React, { useState, useEffect, useCallback } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, Search, Download, Filter, FileText, BarChart3 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const RelatorioContasPrazoPage = () => {
    const { empresa, loading: empresaLoading, isReady } = useEmpresa();
    const { user, token } = useAuth();

    // Estados principais
    const [relatorio, setRelatorio] = useState([]);
    const [resumo, setResumo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Estados para modais de detalhes
    const [tituloDetalhes, setTituloDetalhes] = useState(null);
    const [tituloPagamentos, setTituloPagamentos] = useState(null);

    // Estados dos filtros
    const [filtros, setFiltros] = useState({
        dataInicio: '',
        dataFim: '',
        tipoFiltro: 'emissao', // 'emissao', 'vencimento' ou 'pagamento'
        statusFiltro: 'todos',
        clienteId: null,
        formaPagamentoId: null,
        funcionarioId: null
    });

    // Estados de busca de cliente
    const [searchCliente, setSearchCliente] = useState('');
    const [clientes, setClientes] = useState([]);
    const [loadingClientes, setLoadingClientes] = useState(false);
    const [selectedCliente, setSelectedCliente] = useState(null);
    
    // Estados para formas de pagamento e funcionários
    const [formasPagamento, setFormasPagamento] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const [loadingFormasPagamento, setLoadingFormasPagamento] = useState(false);
    const [loadingFuncionarios, setLoadingFuncionarios] = useState(false);

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
            setClientes([]);
        } finally {
            setLoadingClientes(false);
        }
    }, [empresa, token]);

    // Função para buscar formas de pagamento
    const fetchFormasPagamento = useCallback(async () => {
        if (!isReady || empresaLoading || !empresa?.slug || !user) {
            return;
        }

        setLoadingFormasPagamento(true);
        try {
            const response = await api.get(`/gerencial/${empresa.slug}/formas-pagamento`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormasPagamento(response.data || []);
        } catch (err) {
            console.error("Erro ao buscar formas de pagamento:", err);
            setFormasPagamento([]);
        } finally {
            setLoadingFormasPagamento(false);
        }
    }, [empresa, empresaLoading, isReady, user, token]);

    // Função para buscar funcionários
    const fetchFuncionarios = useCallback(async () => {
        if (!isReady || empresaLoading || !empresa?.slug || !user) {
            return;
        }

        setLoadingFuncionarios(true);
        try {
            const response = await api.get(`/gerencial/${empresa.slug}/funcionarios`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFuncionarios(response.data || []);
        } catch (err) {
            console.error("Erro ao buscar funcionários:", err);
            setFuncionarios([]);
        } finally {
            setLoadingFuncionarios(false);
        }
    }, [empresa, empresaLoading, isReady, user, token]);

    // Debounce para busca de clientes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchCliente) {
                fetchClientes(searchCliente);
            } else {
                setClientes([]);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchCliente, fetchClientes]);

    // Carregar formas de pagamento e funcionários quando o componente montar
    useEffect(() => {
        if (isReady && !empresaLoading && empresa?.slug && user) {
            fetchFormasPagamento();
            fetchFuncionarios();
        }
    }, [isReady, empresaLoading, empresa?.slug, user, fetchFormasPagamento, fetchFuncionarios]);

    // Função para calcular estatísticas quando não vêm da API
    const calcularEstatisticas = (dados) => {
        if (!dados || dados.length === 0) return null;

        const totalTitulos = dados.length;
        let titulosPagos = 0;
        let titulosPendentes = 0;
        let titulosVencidos = 0;
        let valorTotalEmprestado = 0;
        let valorTotalPago = 0;
        let valorTotalRestante = 0;
        let valorTotalJuros = 0;
        let diasTotalAtraso = 0;
        let titulosComAtraso = 0;

        dados.forEach(item => {
            const valorTotal = parseFloat(item.valor_total || 0);
            const valorPago = parseFloat(item.valor_pago || 0);
            const valorRestante = parseFloat(item.valor_restante || 0);
            const valorJuros = parseFloat(item.valor_juros || item.juros_calculado || 0);
            const diasAtraso = parseInt(item.dias_atraso || item.dias_vencimento || 0);

            valorTotalEmprestado += valorTotal;
            valorTotalPago += valorPago;
            valorTotalRestante += valorRestante;
            valorTotalJuros += valorJuros;

            // Contar status
            if (item.status === 'Pago') {
                titulosPagos++;
            } else if (item.status === 'Pendente') {
                titulosPendentes++;
            } else if (item.status === 'Vencido') {
                titulosVencidos++;
            }

            // Calcular dias de atraso
            if (diasAtraso > 0) {
                diasTotalAtraso += diasAtraso;
                titulosComAtraso++;
            }
        });

        // Calcular percentuais e médias
        const percentualPago = valorTotalEmprestado > 0 ? (valorTotalPago / valorTotalEmprestado) * 100 : 0;
        const ticketMedio = totalTitulos > 0 ? valorTotalEmprestado / totalTitulos : 0;
        const diasMedioAtraso = titulosComAtraso > 0 ? diasTotalAtraso / titulosComAtraso : 0;

        return {
            total_titulos: totalTitulos,
            titulos_pagos: titulosPagos,
            titulos_pendentes: titulosPendentes,
            titulos_vencidos: titulosVencidos,
            valor_total_emprestado: valorTotalEmprestado,
            valor_total_pago: valorTotalPago,
            valor_total_restante: valorTotalRestante,
            valor_total_juros: valorTotalJuros,
            percentual_pago: percentualPago,
            ticket_medio: ticketMedio,
            dias_medio_atraso: diasMedioAtraso
        };
    };

    // Função para gerar relatório
    const gerarRelatorio = useCallback(async () => {
        if (!isReady || empresaLoading || !empresa?.slug || !user) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            
            if (filtros.dataInicio) params.append('data_inicio', filtros.dataInicio);
            if (filtros.dataFim) params.append('data_fim', filtros.dataFim);
            if (filtros.tipoFiltro) params.append('tipo_filtro', filtros.tipoFiltro);
            if (filtros.statusFiltro && filtros.statusFiltro !== 'todos') params.append('status', filtros.statusFiltro);
            if (filtros.clienteId) params.append('cliente_id', filtros.clienteId);
            if (filtros.formaPagamentoId) params.append('forma_pagamento_id', filtros.formaPagamentoId);
            if (filtros.funcionarioId) params.append('funcionario_id', filtros.funcionarioId);

            // Buscar relatório
            const relatorioResponse = await api.get(`/gerencial/${empresa.slug}/relatorios/contas-prazo?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Buscar resumo
            const resumoResponse = await api.get(`/gerencial/${empresa.slug}/relatorios/contas-prazo/resumo?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Corrigir estrutura de retorno conforme documentação
            const relatorioData = relatorioResponse.data?.data || relatorioResponse.data || [];
            const estatisticasData = relatorioResponse.data?.estatisticas || null;
            
            // Calcular estatísticas se não vierem da API
            let estatisticasCalculadas = estatisticasData;
            if (!estatisticasData && relatorioData.length > 0) {
                estatisticasCalculadas = calcularEstatisticas(relatorioData);
            } else if (estatisticasData && relatorioData.length > 0) {
                // Mesclar dados da API com cálculos do frontend para garantir campos completos
                const calculadas = calcularEstatisticas(relatorioData);
                estatisticasCalculadas = {
                    ...estatisticasData,
                    // Usar valores calculados se os da API estiverem zerados
                    percentual_pago: estatisticasData.percentual_pago || calculadas.percentual_pago,
                    ticket_medio: estatisticasData.ticket_medio || calculadas.ticket_medio,
                    dias_medio_atraso: estatisticasData.dias_medio_atraso || calculadas.dias_medio_atraso,
                    valor_total_juros: estatisticasData.valor_total_juros || calculadas.valor_total_juros
                };
            }
            
            setRelatorio(relatorioData);
            setResumo(estatisticasCalculadas);

            toast.success('Relatório gerado com sucesso!');
        } catch (err) {
            console.error("Erro ao gerar relatório:", err);
            setError(err.response?.data?.message || 'Erro ao gerar relatório');
            toast.error('Erro ao gerar relatório');
        } finally {
            setLoading(false);
        }
    }, [empresa, empresaLoading, isReady, user, token, filtros]);

    // Função para exportar relatório
    const exportarRelatorio = async () => {
        try {
            const params = new URLSearchParams();
            
            if (filtros.dataInicio) params.append('data_inicio', filtros.dataInicio);
            if (filtros.dataFim) params.append('data_fim', filtros.dataFim);
            if (filtros.tipoFiltro) params.append('tipo_filtro', filtros.tipoFiltro);
            if (filtros.statusFiltro && filtros.statusFiltro !== 'todos') params.append('status', filtros.statusFiltro);
            if (filtros.clienteId) params.append('cliente_id', filtros.clienteId);
            if (filtros.formaPagamentoId) params.append('forma_pagamento_id', filtros.formaPagamentoId);
            if (filtros.funcionarioId) params.append('funcionario_id', filtros.funcionarioId);

            const response = await api.get(`/gerencial/${empresa.slug}/relatorios/contas-prazo/exportar?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            // Criar link de download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatorio-contas-prazo-${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Relatório exportado com sucesso!');
        } catch (err) {
            console.error("Erro ao exportar relatório:", err);
            toast.error('Erro ao exportar relatório');
        }
    };

    // Função para limpar filtros
    const limparFiltros = () => {
        setFiltros({
            dataInicio: '',
            dataFim: '',
            tipoFiltro: 'emissao',
            statusFiltro: 'todos',
            clienteId: null,
            formaPagamentoId: null,
            funcionarioId: null
        });
        setSearchCliente('');
        setSelectedCliente(null);
        setRelatorio([]);
        setResumo(null);
    };

    // Função para selecionar cliente
    const selecionarCliente = (cliente) => {
        setSelectedCliente(cliente);
        setFiltros(prev => ({ ...prev, clienteId: cliente.id }));
        setSearchCliente(cliente.nome);
        setClientes([]);
    };

    // Função para remover cliente selecionado
    const removerCliente = () => {
        setSelectedCliente(null);
        setFiltros(prev => ({ ...prev, clienteId: null }));
        setSearchCliente('');
    };

    // Funções de formatação
    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return '-';
        try {
            return format(parseISO(dateTimeString), 'dd/MM/yyyy HH:mm');
        } catch (e) {
            return dateTimeString;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return format(parseISO(dateString), 'dd/MM/yyyy');
        } catch (e) {
            return dateString;
        }
    };

    const formatCurrency = (value) => {
        return parseFloat(value || 0).toFixed(2).replace('.', ',');
    };

    const getStatusBadge = (status) => {
        let colorClass = '';
        switch (status) {
            case 'Pendente': colorClass = 'bg-yellow-100 text-yellow-800'; break;
            case 'Pago': colorClass = 'bg-green-100 text-green-800'; break;
            case 'Vencido': colorClass = 'bg-red-100 text-red-800'; break;
            default: colorClass = 'bg-gray-100 text-gray-800';
        }
        return <Badge className={`${colorClass}`}>{status}</Badge>;
    };

    if (empresaLoading || loading || !isReady) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin mr-2" /> Carregando relatório...
            </div>
        );
    }

    if (error) {
        return <div className="p-4 text-center text-red-600">{error}</div>;
    }

    return (
        <div className="p-2 sm:p-4 md:p-6 bg-white rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                    Relatório de Contas a Prazo
                </h1>
                <div className="flex gap-2">
                    <Button onClick={exportarRelatorio} variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                    <Button onClick={gerarRelatorio}>
                        <FileText className="mr-2 h-4 w-4" />
                        Gerar Relatório
                    </Button>
                </div>
            </div>

            {/* Filtros */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Filter className="mr-2 h-5 w-5" />
                        Filtros
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {/* Período */}
                        <div>
                            <Label htmlFor="dataInicio">Data Início</Label>
                            <Input
                                id="dataInicio"
                                type="date"
                                value={filtros.dataInicio}
                                onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
                            />
                        </div>

                        <div>
                            <Label htmlFor="dataFim">Data Fim</Label>
                            <Input
                                id="dataFim"
                                type="date"
                                value={filtros.dataFim}
                                onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
                            />
                        </div>

                        {/* Tipo de Filtro */}
                        <div>
                            <Label htmlFor="tipoFiltro">Tipo de Filtro</Label>
                            <Select value={filtros.tipoFiltro} onValueChange={(value) => setFiltros(prev => ({ ...prev, tipoFiltro: value }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="emissao">Data de Emissão</SelectItem>
                                    <SelectItem value="vencimento">Data de Vencimento</SelectItem>
                                    <SelectItem value="pagamento">Data de Pagamento</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status */}
                        <div>
                            <Label htmlFor="statusFiltro">Status</Label>
                            <Select value={filtros.statusFiltro} onValueChange={(value) => setFiltros(prev => ({ ...prev, statusFiltro: value }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos os status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos</SelectItem>
                                    <SelectItem value="Pendente">Pendente</SelectItem>
                                    <SelectItem value="Pago">Pago</SelectItem>
                                    <SelectItem value="Vencido">Vencido</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Cliente */}
                        <div>
                            <Label htmlFor="cliente">Cliente</Label>
                            <div className="relative">
                                <Input
                                    id="cliente"
                                    placeholder="Buscar cliente..."
                                    value={searchCliente}
                                    onChange={(e) => setSearchCliente(e.target.value)}
                                />
                                
                                {selectedCliente && (
                                    <div className="mt-2 p-2 bg-blue-50 rounded border">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">{selectedCliente.nome}</span>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={removerCliente}
                                            >
                                                ✕
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {clientes.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        {clientes.map((cliente) => (
                                            <div
                                                key={cliente.id}
                                                className="p-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={() => selecionarCliente(cliente)}
                                            >
                                                <div className="font-medium">{cliente.nome}</div>
                                                <div className="text-sm text-gray-500">{cliente.telefone}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Forma de Pagamento */}
                        <div>
                            <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                            <Select 
                                value={filtros.formaPagamentoId || 'todos'} 
                                onValueChange={(value) => setFiltros(prev => ({ ...prev, formaPagamentoId: value === 'todos' ? null : value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas as formas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todas as formas</SelectItem>
                                    {formasPagamento.map((forma) => (
                                        <SelectItem key={forma.id} value={forma.id.toString()}>
                                            {forma.descricao || forma.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Funcionário */}
                        <div>
                            <Label htmlFor="funcionario">Funcionário</Label>
                            <Select 
                                value={filtros.funcionarioId || 'todos'} 
                                onValueChange={(value) => setFiltros(prev => ({ ...prev, funcionarioId: value === 'todos' ? null : value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos os funcionários" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos os funcionários</SelectItem>
                                    {funcionarios.map((funcionario) => (
                                        <SelectItem key={funcionario.id} value={funcionario.id.toString()}>
                                            {funcionario.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Botões */}
                        <div className="flex gap-2">
                            <Button onClick={limparFiltros} variant="outline">
                                Limpar Filtros
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Resumo */}
            {resumo && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Resumo Geral</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{resumo.total_titulos}</div>
                                <div className="text-sm text-gray-600">Total de Títulos</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-600">{resumo.titulos_pendentes}</div>
                                <div className="text-sm text-gray-600">Pendentes</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{resumo.titulos_pagos}</div>
                                <div className="text-sm text-gray-600">Pagos</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">{resumo.titulos_vencidos}</div>
                                <div className="text-sm text-gray-600">Vencidos</div>
                            </div>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-lg font-semibold text-gray-800">R$ {formatCurrency(resumo.valor_total_emprestado || resumo.valor_total_titulos)}</div>
                                <div className="text-sm text-gray-600">Valor Total Emprestado</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-semibold text-green-600">R$ {formatCurrency(resumo.valor_total_pago)}</div>
                                <div className="text-sm text-gray-600">Valor Total Pago</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-semibold text-red-600">R$ {formatCurrency(resumo.valor_total_restante)}</div>
                                <div className="text-sm text-gray-600">Valor Restante</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-semibold text-orange-600">R$ {formatCurrency(resumo.valor_total_juros || resumo.total_juros_calculado)}</div>
                                <div className="text-sm text-gray-600">Juros Cobrados</div>
                            </div>
                        </div>

                        {/* Estatísticas adicionais */}
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="text-center">
                                <div className="text-lg font-semibold text-blue-600">{formatCurrency(resumo.percentual_pago || resumo.percentual_pago_geral)}%</div>
                                <div className="text-sm text-gray-600">% Pago</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-semibold text-purple-600">R$ {formatCurrency(resumo.ticket_medio)}</div>
                                <div className="text-sm text-gray-600">Ticket Médio</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-semibold text-indigo-600">{formatCurrency(resumo.dias_medio_atraso)}</div>
                                <div className="text-sm text-gray-600">Dias Médio Atraso</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tabela de Relatório */}
            {relatorio.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Detalhamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Título</TableHead>
                                        <TableHead>Data Emissão</TableHead>
                                        <TableHead>Data Vencimento</TableHead>
                                        <TableHead>Valor Total</TableHead>
                                        <TableHead>Valor Pago</TableHead>
                                        <TableHead>Valor Restante</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Dias Atraso</TableHead>
                                        <TableHead>Juros</TableHead>
                                        <TableHead>Funcionário</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {relatorio.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{item.cliente_nome}</div>
                                                    <div className="text-sm text-gray-500">{item.cliente_telefone}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{item.numero_titulo}</div>
                                                    <div className="text-sm text-gray-500">{item.numero_pedido}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{formatDate(item.data_emissao)}</TableCell>
                                            <TableCell>{formatDate(item.data_vencimento)}</TableCell>
                                            <TableCell>R$ {formatCurrency(item.valor_total)}</TableCell>
                                            <TableCell>R$ {formatCurrency(item.valor_pago)}</TableCell>
                                            <TableCell>R$ {formatCurrency(item.valor_restante)}</TableCell>
                                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                                            <TableCell>
                                                {item.dias_vencimento > 0 ? (
                                                    <span className="text-red-600 font-medium">{item.dias_vencimento} dias</span>
                                                ) : (
                                                    <span className="text-green-600">Em dia</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {item.juros_calculado > 0 ? (
                                                    <span className="text-orange-600 font-medium">R$ {formatCurrency(item.juros_calculado)}</span>
                                                ) : (
                                                    <span className="text-gray-500">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {item.funcionario_nome || 'N/A'}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {relatorio.length === 0 && !loading && (
                <Card>
                    <CardContent className="text-center py-8">
                        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum resultado encontrado</h3>
                        <p className="text-gray-500">Ajuste os filtros e tente novamente.</p>
                    </CardContent>
                </Card>
            )}

            {/* Modal de Detalhes dos Itens */}
            {tituloDetalhes && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Detalhes do Título #{tituloDetalhes.numero_titulo}</h3>
                                <Button variant="outline" onClick={() => setTituloDetalhes(null)}>
                                    ✕
                                </Button>
                            </div>
                            
                            <div className="mb-4">
                                <h4 className="font-medium mb-2">Cliente: {tituloDetalhes.cliente_nome}</h4>
                                <p className="text-sm text-gray-600">Telefone: {tituloDetalhes.cliente_telefone}</p>
                            </div>

                            <div className="mb-4">
                                <h4 className="font-medium mb-2">Itens do Título:</h4>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Produto</TableHead>
                                                <TableHead>Quantidade</TableHead>
                                                <TableHead>Preço Unitário</TableHead>
                                                <TableHead>Subtotal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tituloDetalhes.itens?.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{item.produto_nome}</TableCell>
                                                    <TableCell>{item.quantidade}</TableCell>
                                                    <TableCell>R$ {formatCurrency(item.preco_unitario)}</TableCell>
                                                    <TableCell>R$ {formatCurrency(item.subtotal)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes dos Pagamentos */}
            {tituloPagamentos && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Pagamentos do Título #{tituloPagamentos.numero_titulo}</h3>
                                <Button variant="outline" onClick={() => setTituloPagamentos(null)}>
                                    ✕
                                </Button>
                            </div>
                            
                            <div className="mb-4">
                                <h4 className="font-medium mb-2">Cliente: {tituloPagamentos.cliente_nome}</h4>
                                <p className="text-sm text-gray-600">Telefone: {tituloPagamentos.cliente_telefone}</p>
                            </div>

                            <div className="mb-4">
                                <h4 className="font-medium mb-2">Histórico de Pagamentos:</h4>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data Pagamento</TableHead>
                                                <TableHead>Valor Pago</TableHead>
                                                <TableHead>Forma de Pagamento</TableHead>
                                                <TableHead>Funcionário</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tituloPagamentos.pagamentos?.map((pagamento, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{formatDate(pagamento.data_pagamento)}</TableCell>
                                                    <TableCell>R$ {formatCurrency(pagamento.valor_pago)}</TableCell>
                                                    <TableCell>{pagamento.forma_pagamento_descricao}</TableCell>
                                                    <TableCell>{pagamento.funcionario_nome}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes dos Itens */}
            {tituloDetalhes && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Detalhes do Título #{tituloDetalhes.numero_titulo}</h3>
                                <Button variant="outline" onClick={() => setTituloDetalhes(null)}>
                                    ✕
                                </Button>
                            </div>
                            
                            <div className="mb-4">
                                <h4 className="font-medium mb-2">Cliente: {tituloDetalhes.cliente_nome}</h4>
                                <p className="text-sm text-gray-600">Telefone: {tituloDetalhes.cliente_telefone}</p>
                            </div>

                            <div className="mb-4">
                                <h4 className="font-medium mb-2">Itens do Título:</h4>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Produto</TableHead>
                                                <TableHead>Quantidade</TableHead>
                                                <TableHead>Preço Unitário</TableHead>
                                                <TableHead>Subtotal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tituloDetalhes.itens?.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{item.produto_nome}</TableCell>
                                                    <TableCell>{item.quantidade}</TableCell>
                                                    <TableCell>R$ {formatCurrency(item.preco_unitario)}</TableCell>
                                                    <TableCell>R$ {formatCurrency(item.subtotal)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes dos Pagamentos */}
            {tituloPagamentos && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Pagamentos do Título #{tituloPagamentos.numero_titulo}</h3>
                                <Button variant="outline" onClick={() => setTituloPagamentos(null)}>
                                    ✕
                                </Button>
                            </div>
                            
                            <div className="mb-4">
                                <h4 className="font-medium mb-2">Cliente: {tituloPagamentos.cliente_nome}</h4>
                                <p className="text-sm text-gray-600">Telefone: {tituloPagamentos.cliente_telefone}</p>
                            </div>

                            <div className="mb-4">
                                <h4 className="font-medium mb-2">Histórico de Pagamentos:</h4>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data Pagamento</TableHead>
                                                <TableHead>Valor Pago</TableHead>
                                                <TableHead>Forma de Pagamento</TableHead>
                                                <TableHead>Funcionário</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tituloPagamentos.pagamentos?.map((pagamento, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{formatDate(pagamento.data_pagamento)}</TableCell>
                                                    <TableCell>R$ {formatCurrency(pagamento.valor_pago)}</TableCell>
                                                    <TableCell>{pagamento.forma_pagamento_descricao}</TableCell>
                                                    <TableCell>{pagamento.funcionario_nome}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RelatorioContasPrazoPage;
