import React, { useState, useEffect } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingBag, 
  DollarSign, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const Dashboard = () => {
  const { empresa } = useEmpresa();
  const [stats, setStats] = useState({
    pedidosHoje: 0,
    vendaHoje: 0,
    clientesAtivos: 0,
    mesasOcupadas: 0
  });
  const [pedidosRecentes, setPedidosRecentes] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // Dados mock para demonstração
    setStats({
      pedidosHoje: 23,
      vendaHoje: 1250.80,
      clientesAtivos: 45,
      mesasOcupadas: 8
    });

    setPedidosRecentes([
      {
        id: 1,
        mesa: '5',
        status: 'Em Preparo',
        valor: 89.90,
        tempo: '15 min',
        cliente: 'João Silva'
      },
      {
        id: 2,
        mesa: '3',
        status: 'Pronto',
        valor: 45.50,
        tempo: '25 min',
        cliente: 'Maria Santos'
      },
      {
        id: 3,
        mesa: null,
        status: 'Pendente',
        valor: 32.90,
        tempo: '5 min',
        cliente: 'Pedro Costa',
        tipo: 'Delivery'
      }
    ]);
  };

  const formatarPreco = (preco) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(preco);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'Em Preparo':
        return 'bg-blue-100 text-blue-800';
      case 'Pronto':
        return 'bg-green-100 text-green-800';
      case 'Entregue':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Visão geral do {empresa?.nome_fantasia}</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pedidos Hoje</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pedidosHoje}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vendas Hoje</p>
                <p className="text-2xl font-bold text-gray-900">{formatarPreco(stats.vendaHoje)}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes Ativos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.clientesAtivos}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Mesas Ocupadas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.mesasOcupadas}/15</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pedidos Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pedidosRecentes.map((pedido) => (
                <div key={pedido.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      {pedido.mesa ? (
                        <span className="font-medium text-gray-900">M{pedido.mesa}</span>
                      ) : (
                        <ShoppingBag className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{pedido.cliente}</p>
                      <p className="text-sm text-gray-600">
                        {pedido.mesa ? `Mesa ${pedido.mesa}` : pedido.tipo} • {formatarPreco(pedido.valor)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(pedido.status)}>
                      {pedido.status}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-1 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {pedido.tempo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status das Mesas */}
        <Card>
          <CardHeader>
            <CardTitle>Status das Mesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 15 }, (_, i) => i + 1).map((mesa) => {
                const ocupada = mesa <= stats.mesasOcupadas;
                return (
                  <div
                    key={mesa}
                    className={`aspect-square rounded-lg border-2 flex items-center justify-center font-medium ${
                      ocupada
                        ? 'bg-red-100 border-red-300 text-red-800'
                        : 'bg-green-100 border-green-300 text-green-800'
                    }`}
                  >
                    {mesa}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                <span className="text-gray-600">Livre</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                <span className="text-gray-600">Ocupada</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

