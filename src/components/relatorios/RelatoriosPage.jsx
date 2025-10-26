import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Search, BarChart3, CreditCard, Package, Box, DollarSign, TrendingUp, FileText } from 'lucide-react';

const RelatoriosPage = () => {
    const { empresa } = useEmpresa();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const relatorios = [
        {
            id: 'caixa',
            title: 'Relatório de Caixa',
            description: 'Visualize dados de abertura e fechamento de caixas, valores de vendas, suprimentos, sangrias e diferenças. Inclui informações detalhadas sobre formas de pagamento e vendas por tipo de entrega.',
            icon: CreditCard,
            path: `/gerencial/${empresa?.slug}/relatorios/caixa`,
            color: 'bg-blue-500',
            features: ['Abertura e Fechamento', 'Suprimentos e Sangrias', 'Formas de Pagamento', 'Vendas por Tipo']
        },
        {
            id: 'pedidos',
            title: 'Relatório de Pedidos',
            description: 'Analise pedidos por período, status e tipo de entrega. Inclui custos, lucros, margens de lucro, agrupamento por horário e processamento detalhado de itens dos pedidos.',
            icon: Package,
            path: `/gerencial/${empresa?.slug}/relatorios/pedidos`,
            color: 'bg-green-500',
            features: ['Custos e Lucros', 'Agrupamento por Horário', 'Processamento de Itens', 'Margens de Lucro']
        },
        {
            id: 'estoque',
            title: 'Relatório de Estoque',
            description: 'Controle de estoque com análise de produtos, custos unitários, valores em estoque, vendas por período, faturamento e classificação ABC. Inclui status de estoque e margens de lucro.',
            icon: Box,
            path: `/gerencial/${empresa?.slug}/relatorios/estoque`,
            color: 'bg-purple-500',
            features: ['Controle de Estoque', 'Classificação ABC', 'Custos e Valores', 'Análise de Vendas']
        },
        {
            id: 'contas-prazo',
            title: 'Relatório de Contas a Prazo',
            description: 'Análise completa de títulos a prazo com filtros por período, status e cliente. Inclui cálculo de juros, histórico de pagamentos, resumo estatístico e exportação de dados.',
            icon: TrendingUp,
            path: `/gerencial/${empresa?.slug}/relatorios/contas-prazo`,
            color: 'bg-orange-500',
            features: ['Filtros Avançados', 'Cálculo de Juros', 'Histórico de Pagamentos', 'Resumo Estatístico']
        }
    ];

    const filteredRelatorios = relatorios.filter(relatorio => 
        relatorio.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        relatorio.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        relatorio.features.some(feature => 
            feature.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const handleRelatorioClick = (path) => {
        navigate(path);
    };

    return (
        <div className="min-h-screen bg-blue-50 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-800">Relatórios</h1>
                    <p className="text-gray-600">
                        Selecione um relatório para visualizar e analisar os dados da empresa {empresa?.nome_fantasia}
                    </p>
                </div>

            {/* Campo de Busca */}
            <Card className="bg-white shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-800">
                        <Search className="h-5 w-5" />
                        Buscar Relatórios
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                        Digite para filtrar relatórios por título, descrição ou funcionalidades
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Buscar relatórios..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Grid de Relatórios */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRelatorios.map((relatorio) => {
                    const Icon = relatorio.icon;
                    return (
                        <Card 
                            key={relatorio.id}
                            className="bg-white shadow-md cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                            onClick={() => handleRelatorioClick(relatorio.path)}
                        >
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-lg ${relatorio.color} text-white`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg text-gray-800">{relatorio.title}</CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <CardDescription className="text-sm leading-relaxed text-gray-600">
                                    {relatorio.description}
                                </CardDescription>
                                
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-gray-700">Funcionalidades:</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {relatorio.features.map((feature, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                            >
                                                {feature}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <Button 
                                    className="w-full mt-4" 
                                    variant="outline"
                                >
                                    Acessar Relatório
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Mensagem quando não há resultados */}
            {filteredRelatorios.length === 0 && searchTerm && (
                <Card className="bg-white shadow-md">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-600 mb-2">
                                Nenhum relatório encontrado
                            </h3>
                            <p className="text-sm text-gray-500">
                                Tente ajustar os termos de busca para encontrar o relatório desejado.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Informações Adicionais */}
            <Card className="bg-white shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-800">
                        <FileText className="h-5 w-5" />
                        Sobre os Relatórios
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <h4 className="font-medium mb-2 text-gray-800">Exportação de Dados</h4>
                            <p className="text-gray-600">
                                Todos os relatórios podem ser exportados em Excel (CSV), PDF e impressos diretamente.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2 text-gray-800">Filtros Avançados</h4>
                            <p className="text-gray-600">
                                Utilize filtros por período, status e categorias para obter dados mais específicos.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2 text-gray-800">Análise Detalhada</h4>
                            <p className="text-gray-600">
                                Acesse detalhes completos de cada registro através dos modais de informações.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2 text-gray-800">Totais e Resumos</h4>
                            <p className="text-gray-600">
                                Visualize totais calculados automaticamente e resumos organizados por período.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            </div>
        </div>
    );
};

export default RelatoriosPage; 