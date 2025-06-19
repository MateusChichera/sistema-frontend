// frontend/src/components/cardapio/OrderStatusPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';


const OrderStatusPage = () => {
  const { numeroPedido, empresaSlug } = useParams(); // Pega o numeroPedido e empresaSlug da URL
  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrderStatus = async () => {
      if (!numeroPedido || !empresaSlug) {
        setError('Número do pedido ou slug da empresa não fornecido na URL.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // A API de busca de pedidos tem um filtro por numero_pedido
        // GET /api/v1/gerencial/:slug/pedidos?search=NUMERO_PEDIDO
        // No entanto, para ser público, precisaremos de um endpoint público específico
        // que busque por numero_pedido e empresa_id (via slug) sem autenticação de funcionário.
        // Por enquanto, vamos fazer um mock ou usar uma rota autenticada para teste.

        // SOLUÇÃO TEMPORÁRIA (MOCK ou ROTA AUTHENTICADA para DEMONSTRAÇÃO):
        // Idealmente, criaríamos uma rota pública:
        // router.get('/:slug/pedidos/status/:numeroPedido', extractEmpresaId, pedidoController.getPublicPedidoStatus);

        // Por simplicidade, farei um fetch com a rota gerencial, mas isso exigiria token.
        // Para um cliente público, o back-end precisaria de um endpoint desprotegido.
        // Para fins de demonstração, o ideal seria que o backend permitisse buscar o status do pedido publicamente.
        // Vou simular um atraso e alguns dados mockados para o fluxo da UI.
        
        // Simulação de delay para a API
        await new Promise(resolve => setTimeout(resolve, 1000)); 

        const mockPedidos = [
          {
            id: 1,
            numero_pedido: '240620093012345',
            id_mesa: null,
            numero_mesa: null,
            nome_cliente: 'João Silva',
            nome_cliente_convidado: null,
            tipo_entrega: 'Delivery',
            status: 'Preparando',
            valor_total: 75.50,
            observacoes: 'Sem cebola',
            data_pedido: new Date().toISOString(),
            data_atualizacao: new Date().toISOString(),
            itens: [
              { id: 101, nome_produto: 'Pizza Calabresa', quantidade: 1, preco_unitario: 50.00, observacoes: null },
              { id: 102, nome_produto: 'Coca-Cola', quantidade: 2, preco_unitario: 5.00, observacoes: null },
              { id: 103, nome_produto: 'Taxa de Entrega', quantidade: 1, preco_unitario: 15.50, observacoes: null }
            ]
          },
          {
            id: 2,
            numero_pedido: '240620094067890',
            id_mesa: 5,
            numero_mesa: 'B1',
            nome_cliente: null,
            nome_cliente_convidado: 'Maria Convidada',
            tipo_entrega: 'Mesa',
            status: 'Pendente',
            valor_total: 30.00,
            observacoes: 'Bem passado',
            data_pedido: new Date().toISOString(),
            data_atualizacao: new Date().toISOString(),
            itens: [
              { id: 201, nome_produto: 'Bife à Parmegiana', quantidade: 1, preco_unitario: 30.00, observacoes: null }
            ]
          }
        ];

        const foundPedido = mockPedidos.find(p => p.numero_pedido === numeroPedido);

        if (foundPedido) {
          setPedido(foundPedido);
          toast.success(`Status do pedido #${numeroPedido} carregado!`);
        } else {
          setError(`Pedido #${numeroPedido} não encontrado.`);
          toast.error(`Pedido #${numeroPedido} não encontrado.`);
        }
      } catch (err) {
        setError(err.message || 'Erro ao buscar status do pedido.');
        console.error("Erro ao buscar status do pedido:", err);
        toast.error('Erro ao buscar status do pedido.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderStatus();
  }, [numeroPedido, empresaSlug]);

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
    if (!dateTimeString) return '-';
    return format(parseISO(dateTimeString), 'dd/MM/yyyy HH:mm');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin mr-2" /> Carregando status do pedido...
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">{error}</div>;
  }

  if (!pedido) {
    return <div className="p-4 text-center text-gray-600">Nenhum pedido encontrado.</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl bg-white rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 text-center">Status do Pedido</h2>
      <p className="text-center text-lg font-semibold mb-6">Pedido #{pedido.numero_pedido}</p>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Informações do Pedido {getStatusBadge(pedido.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
          <p><strong>Tipo:</strong> {pedido.tipo_entrega}</p>
          {pedido.numero_mesa && <p><strong>Mesa:</strong> {pedido.numero_mesa}</p>}
          <p><strong>Cliente:</strong> {pedido.nome_cliente || pedido.nome_cliente_convidado || 'Convidado'}</p>
          {pedido.email_cliente && <p><strong>Email:</strong> {pedido.email_cliente}</p>}
          {pedido.telefone_cliente && <p><strong>Telefone:</strong> {pedido.telefone_cliente}</p>}
          {/* Se houver um campo de endereço em 'pedido' para delivery */}
          {pedido.tipo_entrega === 'Delivery' && pedido.endereco_entrega && <p className="col-span-full"><strong>Endereço:</strong> {pedido.endereco_entrega}</p>}
          <p className="col-span-full"><strong>Observações:</strong> {pedido.observacoes || 'Nenhuma'}</p>
          <p><strong>Criado em:</strong> {formatDateTime(pedido.data_pedido)}</p>
          <p><strong>Última atualização:</strong> {formatDateTime(pedido.data_atualizacao)}</p>
        </CardContent>
        <CardFooter className="pt-4">
          <p className="text-xl font-bold">Total: R$ {parseFloat(pedido.valor_total).toFixed(2).replace('.', ',')}</p>
        </CardFooter>
      </Card>

      <h3 className="text-xl font-semibold mb-3">Itens do Pedido</h3>
      {pedido.itens && pedido.itens.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Preço Unit.</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedido.itens.map(item => (
              <TableRow key={item.id}>
                <TableCell>{item.nome_produto} {item.observacoes && `(${item.observacoes})`}</TableCell>
                <TableCell className="text-right">{item.quantidade}</TableCell>
                <TableCell className="text-right">R$ {parseFloat(item.preco_unitario).toFixed(2).replace('.', ',')}</TableCell>
                <TableCell className="text-right">R$ {(parseFloat(item.quantidade) * parseFloat(item.preco_unitario)).toFixed(2).replace('.', ',')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-gray-600">Nenhum item encontrado para este pedido.</p>
      )}
    </div>
  );
};

export default OrderStatusPage;