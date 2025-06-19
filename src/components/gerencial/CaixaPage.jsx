// frontend/src/components/gerencial/CaixaPage.jsx
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
import { Loader2, Printer, CheckCircle, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Switch } from '../ui/switch'; // Para o checkbox de dividir conta / marcar itens
import { IMaskInput } from 'react-imask'; // Para CPF/Telefone se usar na busca de cliente

const CaixaPage = () => {
  const { empresa, loading: empresaLoading } = useEmpresa();
  const { user, token } = useAuth();
  
  const [pedidos, setPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [error, setError] = useState(null);

  // Estados para o modal de detalhes/finalização de pedido
  const [isPedidoDetailModalOpen, setIsPedidoDetailModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null); // Pedido completo com itens
  const [formasPagamento, setFormasPagamento] = useState([]);

  // Estados para finalização do pagamento
  const [valorPago, setValorPago] = useState('');
  const [selectedFormaPagamentoId, setSelectedFormaPagamentoId] = useState('');
  const [observacoesPagamento, setObservacoesPagamento] = useState('');
  const [itensParaCobrar, setItensParaCobrar] = useState({}); // { itemId: true/false }
  const [dividirContaAtivo, setDividirContaAtivo] = useState(false);
  const [numPessoasDividir, setNumPessoasDividir] = useState('');
  const [loadingFinalizacao, setLoadingFinalizacao] = useState(false);

  // Filtros (similar à PedidosPage, mas aqui focamos em "abertos")
  const [filterStatus, setFilterStatus] = useState('Pendente,Preparando,Pronto'); // Padrão: só abertos
  const [filterTipoEntrega, setFilterTipoEntrega] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const statusOptions = ['Pendente', 'Preparando', 'Pronto', 'Entregue', 'Cancelado'];
  const tipoEntregaOptions = ['Mesa', 'Balcao', 'Delivery'];

  // Função para buscar pedidos
  const fetchPedidos = async () => {
    if (empresaLoading || !empresa || !empresa.slug || !user) {
      setLoadingPedidos(true);
      return;
    }

    const canViewCaixa = user?.role && ['Proprietario', 'Caixa', 'Gerente'].includes(user.role);
    if (!canViewCaixa) {
      setError('Você não tem permissão para acessar o painel do Caixa.');
      setLoadingPedidos(false);
      return;
    }

    setLoadingPedidos(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      // Sempre filtra por status, se 'all' não estiver ativo
      if (filterStatus !== 'all') {
        queryParams.append('status', filterStatus);
      }
      if (filterTipoEntrega !== 'all') {
        queryParams.append('tipo_entrega', filterTipoEntrega);
      }
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }

      const response = await api.get(`/gerencial/${empresa.slug}/pedidos?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPedidos(response.data);
      toast.success("Pedidos do Caixa carregados!");
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar pedidos para o Caixa.');
      console.error("Erro ao carregar pedidos:", err);
      toast.error(err.response?.data?.message || 'Erro ao carregar pedidos para o Caixa.');
    } finally {
      setLoadingPedidos(false);
    }
  };

  // Função para buscar formas de pagamento
  const fetchFormasPagamento = async () => {
    if (empresaLoading || !empresa || !empresa.slug) return;
    try {
      const response = await api.get(`/gerencial/${empresa.slug}/formas-pagamento`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormasPagamento(response.data.filter(fp => fp.ativo));
      if (response.data.length > 0) {
        setSelectedFormaPagamentoId(response.data[0].id.toString());
      }
    } catch (err) {
      toast.error("Erro ao carregar formas de pagamento.");
      console.error("Erro ao carregar formas de pagamento:", err);
    }
  };


  useEffect(() => {
    fetchPedidos();
    fetchFormasPagamento();
  }, [empresa, empresaLoading, user, filterStatus, filterTipoEntrega, searchTerm]);


  // Lógica para abrir modal de detalhes do pedido
  const openPedidoDetailModal = async (pedidoId) => {
    setLoadingFinalizacao(true); // Usa loading do modal
    try {
      const response = await api.get(`/gerencial/${empresa.slug}/pedidos/${pedidoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const pedidoCompleto = response.data;
      setSelectedPedido(pedidoCompleto);

      // Inicializa todos os itens para serem cobrados por padrão
      const initialItemsToBill = {};
      let calculatedTotal = 0;
      pedidoCompleto.itens.forEach(item => {
        initialItemsToBill[item.id] = true;
        calculatedTotal += item.quantidade * parseFloat(item.preco_unitario);
      });
      setItensParaCobrar(initialItemsToBill);
      setValorPago(calculatedTotal.toFixed(2)); // Preenche o valor pago com o total padrão
      setDividirContaAtivo(false);
      setNumPessoasDividir('');

      setIsPedidoDetailModalOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao carregar detalhes do pedido.');
      console.error("Erro ao carregar detalhes do pedido:", err);
    } finally {
      setLoadingFinalizacao(false);
    }
  };

  const closePedidoDetailModal = () => {
    setIsPedidoDetailModalOpen(false);
    setSelectedPedido(null);
    setValorPago('');
    setSelectedFormaPagamentoId(formasPagamento.length > 0 ? formasPagamento[0].id.toString() : '');
    setObservacoesPagamento('');
    setItensParaCobrar({});
    setDividirContaAtivo(false);
    setNumPessoasDividir('');
  };

  // Lógica para marcar/desmarcar itens a cobrar
  const handleItemToBillChange = (itemId, checked) => {
    setItensParaCobrar(prev => ({ ...prev, [itemId]: checked }));
  };

  // Lógica para marcar/desmarcar todos os itens
  const handleMarkAllItems = (checked) => {
    const allItemsToBill = {};
    selectedPedido.itens.forEach(item => {
      allItemsToBill[item.id] = checked;
    });
    setItensParaCobrar(allItemsToBill);
  };

  // Cálculo do subtotal dos itens selecionados para cobrar
  const subtotalItensSelecionados = useMemo(() => {
    if (!selectedPedido) return 0;
    return selectedPedido.itens.reduce((acc, item) => {
      return itensParaCobrar[item.id] ? acc + (item.quantidade * parseFloat(item.preco_unitario)) : acc;
    }, 0);
  }, [selectedPedido, itensParaCobrar]);

  // Cálculo do valor final com divisão de conta
  const valorAPagar = useMemo(() => {
    let valor = subtotalItensSelecionados;
    if (dividirContaAtivo && numPessoasDividir && parseInt(numPessoasDividir) > 1) {
      valor = valor / parseInt(numPessoasDividir);
    }
    return valor;
  }, [subtotalItensSelecionados, dividirContaAtivo, numPessoasDividir]);


  // Lógica para finalizar o pagamento
  const handleFinalizarPagamento = async () => {
    if (!selectedPedido) return;
    if (!selectedFormaPagamentoId) {
      toast.error('Selecione uma forma de pagamento.');
      return;
    }
    if (valorAPagar <= 0) {
      toast.error('O valor a pagar deve ser maior que zero.');
      return;
    }

    setLoadingFinalizacao(true);
    try {
      await api.post(`/gerencial/${empresa.slug}/pedidos/${selectedPedido.id}/finalizar`, {
        valor_pago: valorAPagar,
        forma_pagamento_id: parseInt(selectedFormaPagamentoId),
        itens_cobrados_ids: Object.keys(itensParaCobrar).filter(id => itensParaCobrar[id]).map(Number),
        dividir_conta_qtd_pessoas: dividirContaAtivo ? parseInt(numPessoasDividir) || 1 : null,
        observacoes_pagamento: observacoesPagamento
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Pedido #${selectedPedido.numero_pedido} finalizado e pagamento registrado!`);
      closePedidoDetailModal();
      fetchPedidos(); // Recarrega a lista de pedidos

    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao finalizar pagamento.');
      console.error("Erro ao finalizar pagamento:", err);
    } finally {
      setLoadingFinalizacao(false);
    }
  };


  // Funcao para renderizar o badge de status com cores (reutilizada de PedidosPage)
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

  const pedidosAbertos = useMemo(() => {
    return pedidos.filter(p => !['Entregue', 'Cancelado'].includes(p.status));
  }, [pedidos]);

  const pedidosFinalizados = useMemo(() => {
    return pedidos.filter(p => ['Entregue', 'Cancelado'].includes(p.status));
  }, [pedidos]);


  // Permissões do usuário logado
  const canFinalizeOrder = user?.role && ['Proprietario', 'Caixa', 'Gerente'].includes(user.role);


  if (empresaLoading || !empresa) {
    return <div className="p-4 text-center text-gray-600">Carregando dados da empresa...</div>;
  }
  
  if (!canFinalizeOrder) { // Apenas Proprietario, Gerente, Caixa podem acessar esta página
    return <div className="p-4 text-red-600 text-center">Você não tem permissão para acessar o painel do Caixa.</div>;
  }

  if (loadingPedidos) {
    return <div className="p-4 text-center text-gray-600">Carregando pedidos...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 text-center">{error}</div>;
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Caixa - {empresa.nome_fantasia}</h2>

      {/* Área de Filtros (simplificada para o Caixa) */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        <div>
          <Label htmlFor="filterStatus">Visualizar Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger id="filterStatus"><SelectValue placeholder="Status Ativos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Pendente,Preparando,Pronto">Ativos (Pendente, Preparando, Pronto)</SelectItem>
              <SelectItem value="Entregue,Cancelado">Finalizados (Entregue, Cancelado)</SelectItem>
              <SelectItem value="all">Todos os Status</SelectItem>
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
          <Label htmlFor="searchTerm">Buscar por Pedido/Cliente</Label>
          <Input 
            id="searchTerm"
            placeholder="Número do pedido, nome do cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Seção de Pedidos Abertos */}
      <h3 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Pedidos Ativos ({pedidosAbertos.length})</h3>
      {pedidosAbertos.length === 0 ? (
        <p className="text-gray-600">Nenhum pedido ativo encontrado para os filtros selecionados.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pedidosAbertos.map(pedido => (
            <Card key={pedido.id} className="hover:shadow-lg transition-shadow duration-200">
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
              <CardFooter className="pt-2 flex justify-end">
                <Button onClick={() => openPedidoDetailModal(pedido.id)} size="sm">Ver Detalhes & Finalizar</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Seção de Pedidos Finalizados (Opcional, para revisão) */}
      {(filterStatus === 'Entregue,Cancelado' || filterStatus === 'all') && (
        <>
          <h3 className="text-xl font-semibold mb-4 mt-8 text-gray-700 border-b pb-2">Pedidos Finalizados ({pedidosFinalizados.length})</h3>
          {pedidosFinalizados.length === 0 ? (
            <p className="text-gray-600">Nenhum pedido finalizado encontrado para os filtros selecionados.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pedidosFinalizados.map(pedido => (
                <Card key={pedido.id} className="hover:shadow-lg transition-shadow duration-200 opacity-70">
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
                  <CardFooter className="pt-2 flex justify-end">
                    <Button onClick={() => openPedidoDetailModal(pedido.id)} size="sm" variant="outline">Ver Detalhes</Button>
                    <Button size="sm" variant="ghost" className="ml-2"><Printer className="h-4 w-4 mr-1"/> Imprimir</Button> {/* Botão de Imprimir */}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </>
      )}


      {/* Modal de Detalhes do Pedido e Finalização */}
      <Dialog open={isPedidoDetailModalOpen} onOpenChange={closePedidoDetailModal}>
        <DialogContent className="max-w-screen-lg overflow-y-auto max-h-[90vh]">
          {loadingFinalizacao && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50 rounded-lg">
                <Loader2 className="animate-spin text-primary h-8 w-8" />
                <span className="ml-2 text-primary">Processando...</span>
            </div>
          )}
          {selectedPedido && (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes do Pedido #{selectedPedido.numero_pedido}</DialogTitle>
                <DialogDescription>
                  Cliente: {selectedPedido.nome_cliente || selectedPedido.nome_cliente_convidado || 'Convidado'} | Tipo: {selectedPedido.tipo_entrega} {selectedPedido.numero_mesa ? `(Mesa ${selectedPedido.numero_mesa})` : ''}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                {/* Seção de Itens do Pedido */}
                <div>
                  <h4 className="text-lg font-semibold mb-3 border-b pb-2">Itens do Pedido</h4>
                  <div className="flex items-center space-x-2 mb-3">
                    <Switch
                      id="markAllItems"
                      checked={selectedPedido.itens.every(item => itensParaCobrar[item.id])}
                      onCheckedChange={handleMarkAllItems}
                    />
                    <Label htmlFor="markAllItems">Marcar/Desmarcar Todos</Label>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cobrar</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Preço Unit.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPedido.itens.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Switch
                              checked={!!itensParaCobrar[item.id]}
                              onCheckedChange={(checked) => handleItemToBillChange(item.id, checked)}
                              disabled={selectedPedido.status === 'Entregue' || selectedPedido.status === 'Cancelado'}
                            />
                          </TableCell>
                          <TableCell>{item.nome_produto} {item.observacoes && `(${item.observacoes})`}</TableCell>
                          <TableCell className="text-right">{item.quantidade}</TableCell>
                          <TableCell className="text-right">R$ {parseFloat(item.preco_unitario).toFixed(2).replace('.', ',')}</TableCell>
                          <TableCell className="text-right">R$ {(item.quantidade * parseFloat(item.preco_unitario)).toFixed(2).replace('.', ',')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="text-right font-bold mt-2">
                    Subtotal itens a cobrar: R$ {subtotalItensSelecionados.toFixed(2).replace('.', ',')}
                  </p>
                </div>

                {/* Seção de Pagamento */}
                <div>
                  <h4 className="text-lg font-semibold mb-3 border-b pb-2">Finalização do Pagamento</h4>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="formaPagamentoCaixa">Forma de Pagamento</Label>
                      <Select value={selectedFormaPagamentoId} onValueChange={setSelectedFormaPagamentoId} disabled={selectedPedido.status === 'Entregue' || selectedPedido.status === 'Cancelado'}>
                        <SelectTrigger id="formaPagamentoCaixa"><SelectValue placeholder="Selecione a forma" /></SelectTrigger>
                        <SelectContent>
                          {formasPagamento.length === 0 && <SelectItem disabled value="">Nenhuma forma disponível</SelectItem>}
                          {formasPagamento.map(fp => (
                            <SelectItem key={fp.id} value={fp.id.toString()}>
                              {fp.descricao} {fp.porcentagem_desconto_geral > 0 && `(${parseFloat(fp.porcentagem_desconto_geral).toFixed(0)}% desconto)`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="dividirConta"
                        checked={dividirContaAtivo}
                        onCheckedChange={setDividirContaAtivo}
                        disabled={selectedPedido.status === 'Entregue' || selectedPedido.status === 'Cancelado'}
                      />
                      <Label htmlFor="dividirConta">Dividir Conta</Label>
                    </div>

                    {dividirContaAtivo && (
                      <div>
                        <Label htmlFor="numPessoasDividir">Dividir por (Pessoas)</Label>
                        <Input
                          id="numPessoasDividir"
                          type="number"
                          min="1"
                          value={numPessoasDividir}
                          onChange={(e) => setNumPessoasDividir(parseInt(e.target.value) || '')}
                          placeholder="Ex: 2"
                          disabled={selectedPedido.status === 'Entregue' || selectedPedido.status === 'Cancelado'}
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="valorAPagar">Valor a Pagar (R$)</Label>
                      <Input
                        id="valorAPagar"
                        type="number"
                        step="0.01"
                        min="0"
                        value={valorAPagar.toFixed(2)} // Exibe o valor calculado
                        disabled // Desabilita, pois é um valor calculado
                      />
                    </div>
                    {/* Campo para input real do valor pago (para troco, não exigido, mas útil) */}
                    {/* <div>
                        <Label htmlFor="valorRecebido">Valor Recebido (Opcional)</Label>
                        <Input id="valorRecebido" type="number" step="0.01" value={valorPago} onChange={(e) => setValorPago(e.target.value)} />
                    </div> */}

                    <h5 className="font-bold text-xl mt-4">Total do Pedido: R$ {parseFloat(selectedPedido.valor_total).toFixed(2).replace('.', ',')}</h5>
                    <p className="text-gray-600 text-sm">Valor cobrado nesta operação: R$ {valorAPagar.toFixed(2).replace('.', ',')}</p>

                    <div>
                      <Label htmlFor="obsPagamento">Observações do Pagamento</Label>
                      <Textarea id="obsPagamento" value={observacoesPagamento} onChange={(e) => setObservacoesPagamento(e.target.value)} rows={2} disabled={selectedPedido.status === 'Entregue' || selectedPedido.status === 'Cancelado'} />
                    </div>

                    {selectedPedido.status !== 'Entregue' && selectedPedido.status !== 'Cancelado' && (
                      <Button onClick={handleFinalizarPagamento} className="mt-4 w-full flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2"/> Finalizar Pedido
                      </Button>
                    )}
                    {selectedPedido.status === 'Entregue' && (
                        <Badge className="bg-green-500 text-white text-center py-2 w-full mt-4">Pedido Finalizado</Badge>
                    )}
                    {selectedPedido.status === 'Cancelado' && (
                        <Badge className="bg-red-500 text-white text-center py-2 w-full mt-4">Pedido Cancelado</Badge>
                    )}

                    <Button onClick={() => alert("Função de Imprimir Cupom a ser implementada no Backend!")} variant="outline" className="w-full mt-2 flex items-center">
                        <Printer className="h-4 w-4 mr-2"/> Imprimir Cupom
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={closePedidoDetailModal} variant="outline">Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaixaPage;