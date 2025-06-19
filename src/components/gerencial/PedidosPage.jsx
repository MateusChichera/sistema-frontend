// frontend/src/components/gerencial/PedidosPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, Calendar as CalendarIcon, Filter as FilterIcon, Search as SearchIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';


const PedidosPage = () => {
  const { empresa, loading: empresaLoading } = useEmpresa();
  const { user, token } = useAuth();
  
  const [pedidos, setPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [error, setError] = useState(null);

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTipoEntrega, setFilterTipoEntrega] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState({ from: undefined, to: undefined });
  const [searchTerm, setSearchTerm] = useState('');

  const statusOptions = ['Pendente', 'Preparando', 'Pronto', 'Entregue', 'Cancelado'];
  const tipoEntregaOptions = ['Mesa', 'Balcao', 'Delivery'];

  const fetchPedidos = async () => {
    if (empresaLoading || !empresa || !empresa.slug || !user) {
      setLoadingPedidos(true);
      return;
    }

    const canView = ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'].includes(user.role);
    if (!canView) {
      setError('Você não tem permissão para visualizar pedidos.');
      setLoadingPedidos(false);
      return;
    }

    setLoadingPedidos(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filterStatus !== 'all') {
        queryParams.append('status', filterStatus);
      }
      if (filterTipoEntrega !== 'all') {
        queryParams.append('tipo_entrega', filterTipoEntrega);
      }
      if (filterDateRange.from) {
        queryParams.append('data_inicio', format(filterDateRange.from, 'yyyy-MM-dd'));
      }
      if (filterDateRange.to) {
        queryParams.append('data_fim', format(filterDateRange.to, 'yyyy-MM-dd'));
      }
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }

      const response = await api.get(`/gerencial/${empresa.slug}/pedidos?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPedidos(response.data);
      toast.success("Pedidos carregados!");
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar pedidos.');
      console.error("Erro ao carregar pedidos:", err);
      toast.error(err.response?.data?.message || 'Erro ao carregar pedidos.');
    } finally {
      setLoadingPedidos(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, [empresa, empresaLoading, user, filterStatus, filterTipoEntrega, filterDateRange, searchTerm]);

  const handleChangeStatus = async (pedidoId, newStatus) => {
    if (!window.confirm(`Tem certeza que deseja mudar o status do pedido para "${newStatus}"?`)) {
      return;
    }
    setLoadingPedidos(true);
    setError(null);
    try {
      await api.put(`/gerencial/${empresa.slug}/pedidos/${pedidoId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Status do pedido atualizado para "${newStatus}"!`);
      fetchPedidos();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao atualizar status do pedido.');
      toast.error(err.response?.data?.message || 'Erro ao atualizar status do pedido.');
      console.error("Erro ao atualizar status:", err);
    } finally {
      setLoadingPedidos(false);
    }
  };

  const getStatusBadge = (status) => {
    let colorClass = '';
    switch (status) {
      case 'Pendente': colorClass = 'bg-yellow-100 text-yellow-800'; break;
      case 'Preparando': colorClass = 'bg-blue-100 text-blue-800'; break;
      case 'Pronto': colorClass = 'bg-purple-100 text-purple-800'; break;
      case 'Entregue': colorClass = 'bg-green-100 text-green-800'; break;
      case 'Cancelado': colorClass = 'bg-red-100 text-red-800'; break;
      default: colorClass = 'bg-gray-100 text-gray-800';
    }
    return <Badge className={`${colorClass}`}>{status}</Badge>;
  };

  const formatDateTime = (dateTimeString) => {
    return format(parseISO(dateTimeString), 'dd/MM/yyyy HH:mm');
  };

  const pedidosByStatus = useMemo(() => {
    const organized = {
      'Pendente': [],
      'Preparando': [],
      'Pronto': [],
      'Entregue': [],
      'Cancelado': []
    };
    pedidos.forEach(pedido => {
      if (organized[pedido.status]) {
        organized[pedido.status].push(pedido);
      }
    });
    return organized;
  }, [pedidos]);


  const canManage = user?.role === 'Proprietario' || user?.role === 'Gerente';
  const canChangeStatus = ['Proprietario', 'Gerente', 'Caixa', 'Funcionario'].includes(user?.role);


  if (empresaLoading || !empresa) {
    return <div className="p-4 text-center text-gray-600">Carregando dados da empresa...</div>;
  }
  
  if (!canChangeStatus) {
    return <div className="p-4 text-red-600 text-center">Você não tem permissão para visualizar pedidos.</div>;
  }

  if (loadingPedidos) {
    return <div className="p-4 text-center text-gray-600">Carregando pedidos...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 text-center">{error}</div>;
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Gerenciar Pedidos - {empresa.nome_fantasia}</h2>

      <div className="mb-6 p-4 border rounded-lg bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <Label htmlFor="filterStatus">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger id="filterStatus"><SelectValue placeholder="Todos os Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statusOptions.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="filterTipoEntrega">Tipo de Entrega</Label>
          <Select value={filterTipoEntrega} onValueChange={setFilterTipoEntrega}>
            <SelectTrigger id="filterTipoEntrega"><SelectValue placeholder="Todos os Tipos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {tipoEntregaOptions.map(tipo => (
                <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="filterDateRange">Período</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="filterDateRange"
                variant={"outline"}
                className={"w-full justify-start text-left font-normal"}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterDateRange.from ? (
                  filterDateRange.to ? (
                    <>
                      {format(filterDateRange.from, "dd/MM/yyyy")} -{" "}
                      {format(filterDateRange.to, "dd/MM/yyyy")}
                    </>
                  ) : (
                    format(filterDateRange.from, "dd/MM/yyyy")
                  )
                ) : (
                  <span>Selecione uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="range"
                selected={filterDateRange}
                onSelect={setFilterDateRange}
                initialFocus
              />
               <div className="flex justify-end p-2 border-t">
                  <Button onClick={() => setFilterDateRange({ from: undefined, to: undefined })} variant="ghost" size="sm">Limpar</Button>
               </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="searchTerm">Buscar por Pedido/Cliente</Label>
          <Input 
            id="searchTerm"
            placeholder="Número do pedido, nome do cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="md:col-span-1 flex items-end">
             <Button onClick={fetchPedidos} className="w-full">
                <SearchIcon className="mr-2 h-4 w-4" /> Buscar
             </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Object.keys(pedidosByStatus).map(statusKey => (
          <div key={statusKey} className="bg-gray-100 p-4 rounded-lg shadow-sm max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
              {statusKey} ({pedidosByStatus[statusKey].length})
            </h3>
            {pedidosByStatus[statusKey].length === 0 ? (
              <p className="text-gray-600 text-sm">Nenhum pedido neste status.</p>
            ) : (
              <div className="space-y-4">
                {pedidosByStatus[statusKey].map(pedido => (
                  <Card key={pedido.id} className="bg-white border rounded-lg shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex justify-between items-center">
                        Pedido #{pedido.numero_pedido}
                        {getStatusBadge(pedido.status)}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {pedido.tipo_entrega} {pedido.numero_mesa ? `(Mesa ${pedido.numero_mesa})` : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm pt-2">
                      <p>Cliente: {pedido.nome_cliente || pedido.nome_cliente_convidado || 'Convidado'}</p>
                      <p>Valor: R$ {parseFloat(pedido.valor_total).toFixed(2).replace('.', ',')}</p>
                      <p className="text-xs text-gray-500">Criado em: {formatDateTime(pedido.data_pedido)}</p>
                    </CardContent>
                    <CardFooter className="pt-2 flex justify-end gap-2">
                      <Button variant="outline" size="sm">Detalhes</Button>
                      
                      {canChangeStatus && pedido.status !== 'Entregue' && pedido.status !== 'Cancelado' && (
                        <Select onValueChange={(newStatus) => handleChangeStatus(pedido.id, newStatus)}>
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue placeholder="Mudar Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.filter(s => s !== pedido.status && s !== 'Entregue' && s !== 'Cancelado').map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                            {(user?.role === 'Proprietario' || user?.role === 'Gerente' || user?.role === 'Caixa') && pedido.status !== 'Entregue' && (
                                <SelectItem value="Entregue">Entregue</SelectItem>
                            )}
                            {(user?.role === 'Proprietario' || user?.role === 'Gerente' || user?.role === 'Caixa' || user?.role === 'Funcionario') && pedido.status !== 'Cancelado' && (
                                <SelectItem value="Cancelado">Cancelado</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PedidosPage;