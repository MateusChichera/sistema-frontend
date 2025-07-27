// frontend/src/components/gerencial/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';
import { useErrorDialog } from '../../hooks/use-error-dialog';
// Adicione CardDescription aqui
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card'; 
import { Loader2, DollarSign, ListOrdered, Package, TrendingUp, CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format, parseISO, subDays } from 'date-fns';
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const Dashboard = () => {
  const { empresa, loading: empresaLoading } = useEmpresa();
  const { user, token } = useAuth();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [error, setError] = useState(null);
  const { showError, ErrorDialogElement } = useErrorDialog();

  // Acessos x Pedidos
  const [acessosPedidosData, setAcessosPedidosData] = useState([]);
  const [loadingAcessosPedidos, setLoadingAcessosPedidos] = useState(true);

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
      const msg = err.response?.data?.message || 'Erro ao carregar dados do dashboard.';
      toast.error(msg);
      showError(msg);
      setError(null);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Função para buscar acessos x pedidos (últimos 7 dias)
  const fetchAcessosPedidos = async () => {
    if (empresaLoading || !empresa || !empresa.slug || !user) {
      return;
    }

    setLoadingAcessosPedidos(true);
    try {
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), 6), 'yyyy-MM-dd');

      const response = await api.get(`/gerencial/${empresa.slug}/relatorio-acessos-pedidos`, {
        params: { startDate, endDate },
        headers: { Authorization: `Bearer ${token}` },
      });

      // Espera array de objetos ou tuplas, normaliza
      const rawData = response.data || [];
      const normalized = rawData.map((item) => {
        if (Array.isArray(item)) {
          const [dateStr, acessos, pedidos /* taxa */] = item;
          return {
            data: dateStr,
            acessos: Number(acessos),
            pedidos: Number(pedidos),
          };
        }

        // Nos objetos, tentamos extrair campos padronizados ou alternativas
        const dateStr = item.data || item.data_relatorio || item.dataRelatorio;
        const acessos =
          item.acessos ?? item.total_acessos ?? item.totalAcessos ?? 0;
        const pedidos =
          item.pedidos ?? item.total_pedidos ?? item.totalPedidos ?? 0;

        return {
          data: dateStr,
          acessos: Number(acessos),
          pedidos: Number(pedidos),
        };
      });

      setAcessosPedidosData(normalized);
    } catch (err) {
      console.error('Erro ao buscar relatório de acessos/pedidos:', err);
    } finally {
      setLoadingAcessosPedidos(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [empresa, empresaLoading, user, token]);

  useEffect(() => {
    fetchAcessosPedidos();
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

  // Dados resumidos de conversão geral
  const totalAcessos = acessosPedidosData.reduce((sum, d) => sum + d.acessos, 0);
  const totalPedidos = acessosPedidosData.reduce((sum, d) => sum + d.pedidos, 0);
  const taxaConversaoGeral = totalAcessos > 0 ? ((totalPedidos / totalAcessos) * 100).toFixed(2) : 0;

  const totalPedidosAbertos = dashboardData.totalPedidosAtivos;
  const totalPedidosEntregues = dashboardData.pedidosOverview.find(p => p.status === 'Entregue')?.total_pedidos || 0;
  const totalReceitaEntregue = dashboardData.pedidosOverview.find(p => p.status === 'Entregue')?.valor_total_pedidos || 0;

  return (
    <div className="p-2 sm:p-4 md:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Dashboard - {empresa.nome_fantasia}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        <Card className="bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-4 py-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Pedidos Ativos</CardTitle>
            <ListOrdered className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{totalPedidosAbertos}</div>
            <p className="text-xs text-muted-foreground">
              Pedidos aguardando preparo ou entrega
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-4 py-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">R$ {dashboardData.receitaTotal.toFixed(2).replace('.', ',')}</div>
            <p className="text-xs text-muted-foreground">
              Receita total registrada
            </p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-4 py-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Pedidos Finalizados</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{totalPedidosEntregues}</div>
            <p className="text-xs text-muted-foreground">
              Pedidos concluídos
            </p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-4 py-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Ticket Médio (Últimos 7 Dias)</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Vendas por Dia */}
        <Card>
          <CardHeader className="px-3 sm:px-4 py-3">
            <CardTitle className="text-base sm:text-lg">Vendas Diárias (Últimos 7 Dias)</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Faturamento e número de pedidos por dia.</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            {dashboardData.vendasPorDia.length === 0 ? (
                <p className="text-gray-600 text-sm sm:text-base">Nenhuma venda registrada nos últimos 7 dias.</p>
            ) : (
                <div className="overflow-x-auto">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead className="text-xs sm:text-sm">Data</TableHead>
                              <TableHead className="text-xs sm:text-sm">Pedidos</TableHead>
                              <TableHead className="text-right text-xs sm:text-sm">Total</TableHead>
                              <TableHead className="text-right text-xs sm:text-sm">Ticket Médio</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {dashboardData.vendasPorDia.map(venda => (
                              <TableRow key={venda.data}>
                                  <TableCell className="text-xs sm:text-sm">{format(parseISO(venda.data), 'dd/MM')}</TableCell>
                                  <TableCell className="text-xs sm:text-sm">{venda.total_pedidos}</TableCell>
                                  <TableCell className="text-right text-xs sm:text-sm">R$ {parseFloat(venda.vendas_total).toFixed(2).replace('.', ',')}</TableCell>
                                  <TableCell className="text-right text-xs sm:text-sm">R$ {parseFloat(venda.ticket_medio).toFixed(2).replace('.', ',')}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
                </div>
            )}
          </CardContent>
        </Card>

        {/* Produtos Mais Vendidos */}
        <Card>
          <CardHeader className="px-3 sm:px-4 py-3">
            <CardTitle className="text-base sm:text-lg">Produtos Mais Vendidos (Top 5)</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Produtos com maior volume de vendas.</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            {dashboardData.produtosMaisVendidos.length === 0 ? (
                <p className="text-gray-600 text-sm sm:text-base">Nenhum produto vendido ainda.</p>
            ) : (
                <div className="overflow-x-auto">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead className="text-xs sm:text-sm">Produto</TableHead>
                              <TableHead className="text-xs sm:text-sm">Quantidade</TableHead>
                              <TableHead className="text-right text-xs sm:text-sm">Valor Total</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {dashboardData.produtosMaisVendidos.map((prod, index) => (
                              <TableRow key={index}>
                                  <TableCell className="text-xs sm:text-sm">{prod.produto_nome}</TableCell>
                                  <TableCell className="text-xs sm:text-sm">{prod.quantidade_vendida}</TableCell>
                                  <TableCell className="text-right text-xs sm:text-sm">R$ {parseFloat(prod.valor_total).toFixed(2).replace('.', ',')}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visão Geral de Pedidos por Status e Tipo */}
      <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 mt-6 sm:mt-8 text-gray-800 border-b pb-2">Pedidos por Status e Tipo</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {dashboardData.pedidosOverview.length === 0 ? (
              <p className="text-gray-600 text-sm sm:text-base">Nenhum pedido registrado.</p>
          ) : (
              dashboardData.pedidosOverview.map((item, index) => (
                  <Card key={index}>
                      <CardHeader className="pb-2 px-3 sm:px-4 py-3">
                          <CardTitle className="text-sm sm:text-base">{item.status} ({item.tipo_entrega})</CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 sm:px-4 pb-3">
                          <div className="text-lg sm:text-xl font-bold">{item.total_pedidos} pedidos</div>
                          <p className="text-xs sm:text-sm text-muted-foreground">Total: R$ {parseFloat(item.valor_total_pedidos).toFixed(2).replace('.', ',')}</p>
                      </CardContent>
                  </Card>
              ))
          )}
      </div>

      {/* Acessos x Pedidos */}
      <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 mt-6 sm:mt-8 text-gray-800 border-b pb-2">Acessos x Pedidos (Últimos 7 Dias)</h3>
      {loadingAcessosPedidos ? (
        <p className="text-gray-600 text-sm sm:text-base">Carregando relatório de acessos...</p>
      ) : acessosPedidosData.length === 0 ? (
        <p className="text-gray-600 text-sm sm:text-base">Nenhum dado de acesso encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="px-3 sm:px-4 py-3">
              <CardTitle className="text-base sm:text-lg">Conversão Delivery/Retirada</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Acessos vs. Pedidos Online</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3" style={{ width: '100%', height: 250, minHeight: 250 }}>
              <ResponsiveContainer>
                <BarChart data={acessosPedidosData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" tickFormatter={(d) => format(parseISO(d), 'dd/MM')} />
                  <YAxis />
                  <Tooltip formatter={(value) => Number(value)} labelFormatter={(label) => format(parseISO(label), 'dd/MM/yyyy')} />
                  <Legend />
                  <Bar dataKey="acessos" fill="#8884d8" name="Acessos" />
                  <Bar dataKey="pedidos" fill="#82ca9d" name="Pedidos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-3 sm:px-4 py-3">
              <CardTitle className="text-base sm:text-lg">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3">
              <p className="text-sm sm:text-lg">Total de Acessos: <span className="font-semibold">{totalAcessos}</span></p>
              <p className="text-sm sm:text-lg">Total de Pedidos: <span className="font-semibold">{totalPedidos}</span></p>
              <p className="text-sm sm:text-lg">Taxa de Conversão: <span className="font-semibold">{taxaConversaoGeral}%</span></p>
              <div className="overflow-x-auto mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Data</TableHead>
                      <TableHead className="text-xs sm:text-sm">Acessos</TableHead>
                      <TableHead className="text-xs sm:text-sm">Pedidos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acessosPedidosData.map((item) => (
                      <TableRow key={item.data}>
                        <TableCell className="text-xs sm:text-sm">{format(parseISO(item.data), 'dd/MM')}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{item.acessos}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{item.pedidos}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
};

export default Dashboard;