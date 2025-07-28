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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
                <p className="text-muted-foreground">
                    Selecione um relatório para visualizar e analisar os dados da empresa {empresa?.nome_fantasia}
                </p>
            </div>

            {/* Campo de Busca */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Buscar Relatórios
                    </CardTitle>
                    <CardDescription>
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
                            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                            onClick={() => handleRelatorioClick(relatorio.path)}
                        >
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-lg ${relatorio.color} text-white`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{relatorio.title}</CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <CardDescription className="text-sm leading-relaxed">
                                    {relatorio.description}
                                </CardDescription>
                                
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-muted-foreground">Funcionalidades:</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {relatorio.features.map((feature, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"
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
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                                Nenhum relatório encontrado
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Tente ajustar os termos de busca para encontrar o relatório desejado.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Informações Adicionais */}
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Sobre os Relatórios
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <h4 className="font-medium mb-2">Exportação de Dados</h4>
                            <p className="text-muted-foreground">
                                Todos os relatórios podem ser exportados em Excel (CSV), PDF e impressos diretamente.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2">Filtros Avançados</h4>
                            <p className="text-muted-foreground">
                                Utilize filtros por período, status e categorias para obter dados mais específicos.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2">Análise Detalhada</h4>
                            <p className="text-muted-foreground">
                                Acesse detalhes completos de cada registro através dos modais de informações.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2">Totais e Resumos</h4>
                            <p className="text-muted-foreground">
                                Visualize totais calculados automaticamente e resumos organizados por período.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default RelatoriosPage; 