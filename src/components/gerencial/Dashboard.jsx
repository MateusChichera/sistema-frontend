// frontend/src/components/gerencial/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';
// Adicione CardDescription aqui
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card'; 
import { Loader2, DollarSign, ListOrdered, Package, TrendingUp, CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format, parseISO } from 'date-fns';

const Dashboard = () => {
  const { empresa, loading: empresaLoading } = useEmpresa();
  const { user, token } = useAuth();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    if (empresaLoading || !empresa || !empresa.slug || !user) {
      setLoadingDashboard(true);
      return;
    }

    if (user.role !== 'Proprietario' && user.role !== 'Gerente') {
      setError('Você não tem permissão para visualizar o dashboard.');
      setLoadingDashboard(false);
      return;
    }

    setLoadingDashboard(true);
    setError(null);
    try {
      const response = await api.get(`/gerencial/${empresa.slug}/dashboard-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
      toast.success("Dados do dashboard carregados!");
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar dados do dashboard.');
      console.error("Erro ao carregar dashboard:", err);
      toast.error(err.response?.data?.message || 'Erro ao carregar dashboard.');
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [empresa, empresaLoading, user, token]);

  if (empresaLoading || !empresa) {
    return <div className="p-4 text-center text-gray-600">Carregando dados da empresa...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-600 text-center">{error}</div>;
  }

  if (loadingDashboard) {
    return <div className="p-4 text-center text-gray-600">Carregando dashboard...</div>;
  }

  if (!dashboardData || (user.role !== 'Proprietario' && user.role !== 'Gerente')) {
    return <div className="p-4 text-center text-gray-600">Nenhum dado disponível para o dashboard ou acesso negado.</div>;
  }

  const totalPedidosAbertos = dashboardData.totalPedidosAtivos;
  const totalPedidosEntregues = dashboardData.pedidosOverview.find(p => p.status === 'Entregue')?.total_pedidos || 0;
  const totalReceitaEntregue = dashboardData.pedidosOverview.find(p => p.status === 'Entregue')?.valor_total_pedidos || 0;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Dashboard - {empresa.nome_fantasia}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Ativos</CardTitle>
            <ListOrdered className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPedidosAbertos}</div>
            <p className="text-xs text-muted-foreground">
              Pedidos aguardando preparo ou entrega
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {dashboardData.receitaTotal.toFixed(2).replace('.', ',')}</div>
            <p className="text-xs text-muted-foreground">
              Receita total registrada
            </p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Finalizados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPedidosEntregues}</div>
            <p className="text-xs text-muted-foreground">
              Pedidos concluídos
            </p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio (Últimos 7 Dias)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                R$ {
                    dashboardData.vendasPorDia.length > 0
                    ? (dashboardData.vendasPorDia.reduce((sum, day) => sum + parseFloat(day.vendas_total), 0) / dashboardData.vendasPorDia.reduce((sum, day) => sum + parseFloat(day.total_pedidos), 0)).toFixed(2).replace('.', ',')
                    : '0,00'
                }
            </div>
            <p className="text-xs text-muted-foreground">
              Baseado nas vendas recentes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas por Dia */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas Diárias (Últimos 7 Dias)</CardTitle>
            <CardDescription>Faturamento e número de pedidos por dia.</CardDescription> {/* <--- CardDescription usado aqui */}
          </CardHeader>
          <CardContent>
            {dashboardData.vendasPorDia.length === 0 ? (
                <p className="text-gray-600">Nenhuma venda registrada nos últimos 7 dias.</p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Pedidos</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Ticket Médio</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dashboardData.vendasPorDia.map(venda => (
                            <TableRow key={venda.data}>
                                <TableCell>{format(parseISO(venda.data), 'dd/MM')}</TableCell>
                                <TableCell>{venda.total_pedidos}</TableCell>
                                <TableCell className="text-right">R$ {parseFloat(venda.vendas_total).toFixed(2).replace('.', ',')}</TableCell>
                                <TableCell className="text-right">R$ {parseFloat(venda.ticket_medio).toFixed(2).replace('.', ',')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>

        {/* Produtos Mais Vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos (Top 5)</CardTitle>
            <CardDescription>Produtos com maior volume de vendas.</CardDescription> {/* <--- CardDescription usado aqui */}
          </CardHeader>
          <CardContent>
            {dashboardData.produtosMaisVendidos.length === 0 ? (
                <p className="text-gray-600">Nenhum produto vendido ainda.</p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Quantidade</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dashboardData.produtosMaisVendidos.map((prod, index) => (
                            <TableRow key={index}>
                                <TableCell>{prod.produto_nome}</TableCell>
                                <TableCell>{prod.quantidade_vendida}</TableCell>
                                <TableCell className="text-right">R$ {parseFloat(prod.valor_total).toFixed(2).replace('.', ',')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visão Geral de Pedidos por Status e Tipo (exemplo de como usar pedidosOverview) */}
      <h3 className="text-xl font-semibold mb-4 mt-8 text-gray-800 border-b pb-2">Pedidos por Status e Tipo</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboardData.pedidosOverview.length === 0 ? (
              <p className="text-gray-600">Nenhum pedido registrado.</p>
          ) : (
              dashboardData.pedidosOverview.map((item, index) => (
                  <Card key={index}>
                      <CardHeader className="pb-2">
                          <CardTitle className="text-base">{item.status} ({item.tipo_entrega})</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <div className="text-xl font-bold">{item.total_pedidos} pedidos</div>
                          <p className="text-sm text-muted-foreground">Total: R$ {parseFloat(item.valor_total_pedidos).toFixed(2).replace('.', ',')}</p>
                      </CardContent>
                  </Card>
              ))
          )}
      </div>

    </div>
  );
};

export default Dashboard;