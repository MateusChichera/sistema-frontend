import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Loader2, CheckCircle, Clock, Utensils, Truck, XCircle, Info } from 'lucide-react';
import socket from '../../services/socket';
import api from '../../services/api';
import { useEmpresa } from '../../contexts/EmpresaContext';

const statusSteps = [
  { key: 'Recebido', label: 'Recebido', icon: <Clock className="h-5 w-5" /> },
  { key: 'Preparando', label: 'Preparando', icon: <Utensils className="h-5 w-5" /> },
  { key: 'Pronto', label: 'Saiu para entrega', icon: <CheckCircle className="h-5 w-5" /> },
  { key: 'Entregue', label: 'Entregue', icon: <Truck className="h-5 w-5" /> },
  { key: 'Cancelado', label: 'Cancelado', icon: <XCircle className="h-5 w-5" /> },
];

const getStatusIndex = (status) => {
  const idx = statusSteps.findIndex(s => s.key.toLowerCase() === status?.toLowerCase());
  return idx === -1 ? 0 : idx;
};

const OrderStatusPagePublic = () => {
  const { id, slug: slugParam } = useParams();
  const { empresa } = useEmpresa();
  const slug = slugParam || empresa?.slug || '';
  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPedido = async () => {
      setLoading(true);
      setError(null);
      try {
        // Chamada usando axios configurado
        const res = await api.get(`/${slug}/pedidos/publico/${id}`);
        setPedido(res.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Erro ao buscar pedido');
      } finally {
        setLoading(false);
      }
    };
    fetchPedido();
    // Socket.IO para atualização em tempo real
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('join_pedido_room', { slug, pedidoId: id });
    const handlePedidoUpdated = (pedidoAtualizado) => {
      setPedido(pedidoAtualizado);
    };
    socket.on('pedidoUpdated', handlePedidoUpdated);
    return () => {
      socket.emit('leave_pedido_room', { slug, pedidoId: id });
      socket.off('pedidoUpdated', handlePedidoUpdated);
    };
  }, [id, slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin h-10 w-10 text-primary mb-4" />
        <p className="text-lg font-semibold text-gray-700">Carregando pedido...</p>
      </div>
    );
  }
  if (error || !pedido) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <XCircle className="h-10 w-10 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-red-600">{error || 'Pedido não encontrado'}</p>
      </div>
    );
  }

  const statusIdx = getStatusIndex(pedido.status);
  const isCancelado = pedido.status?.toLowerCase() === 'cancelado';

  // Não existe mais empresa no JSON, então não tente acessar empresa.
  // const empresa = pedido.empresa || {};
  // const telefone = empresa.telefone_contato || '';
  // const tempoPreparo = empresa.tempo_medio_preparo || '';
  const numeroPedido = pedido.numero_pedido || id;

  // Dados da empresa para contato e previsão
  const telefone = empresa?.telefone_contato || '';
  const endereco = empresa?.endereco || '';
  const tempoPreparo = empresa?.tempo_medio_preparo || '';
  const telefoneWhats = telefone.replace(/\D/g, '');
  const mensagemWhats = encodeURIComponent(`Olá, fiz um pedido no site número do pedido:${numeroPedido}`);
  const linkWhats = telefoneWhats ? `https://wa.me/55${telefoneWhats}?text=${mensagemWhats}` : null;

  const taxaEntrega = parseFloat(pedido.taxa_entrega || 0);
  const totalBase = parseFloat(pedido.valor_total || 0);
  const totalGeral = totalBase + (taxaEntrega > 0 ? taxaEntrega : 0);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-2 sm:p-6 bg-gray-50">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-4 sm:p-8 flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-2 text-primary">Acompanhe seu Pedido</h2>
        <p className="text-gray-600 mb-4">Pedido #{numeroPedido}</p>
        {/* Previsão de entrega/preparo */}
        {tempoPreparo && (
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-700 bg-yellow-50 rounded px-3 py-1">
            <Clock className="h-4 w-4 text-yellow-600" />
            Previsão de entrega: <span className="font-semibold ml-1">{tempoPreparo}</span>
          </div>
        )}
        {/* Endereço */}
        {endereco && (
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded px-3 py-1">
            <span className="font-semibold">Endereço:</span> <span>{endereco}</span>
          </div>
        )}
        {/* Telefone */}
        {telefone && (
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded px-3 py-1">
            <span className="font-semibold">Telefone:</span> <span>{telefone}</span>
          </div>
        )}
        {/* Botão WhatsApp */}
        {telefoneWhats && (
          <a
            href={linkWhats}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 flex items-center gap-2 text-green-700 hover:text-green-900 font-medium bg-green-50 rounded px-3 py-1 transition-colors"
            style={{ textDecoration: 'none' }}
          >
            <svg viewBox="0 0 32 32" width="20" height="20" fill="currentColor"><path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.832 4.584 2.236 6.393L4 29l7.828-2.236C13.416 27.168 15.615 28 18 28c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22c-2.021 0-3.938-.627-5.527-1.701l-.393-.262-4.658 1.33 1.33-4.658-.262-.393C5.627 18.938 5 17.021 5 15c0-6.065 4.935-11 11-11s11 4.935 11 11-4.935 11-11 11zm5.29-7.71c-.26-.13-1.54-.76-1.78-.85-.24-.09-.41-.13-.58.13-.17.26-.67.85-.82 1.02-.15.17-.3.19-.56.06-.26-.13-1.09-.4-2.07-1.28-.76-.68-1.27-1.52-1.42-1.78-.15-.26-.02-.4.11-.53.11-.11.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.06-.13-.58-1.4-.8-1.92-.21-.51-.43-.44-.58-.45-.15-.01-.32-.01-.5-.01-.17 0-.45.06-.68.32-.23.26-.9.88-.9 2.15s.92 2.49 1.05 2.66c.13.17 1.81 2.77 4.39 3.77.61.21 1.09.33 1.46.42.61.15 1.16.13 1.6.08.49-.06 1.54-.63 1.76-1.24.22-.61.22-1.13.15-1.24-.07-.11-.24-.17-.5-.3z"/></svg>
            Tirar dúvidas no WhatsApp
          </a>
        )}
        {/* Stepper visual */}
        <div className="flex items-center justify-center w-full mb-6">
          {statusSteps.slice(0, isCancelado ? 5 : 4).map((step, idx) => (
            <div key={step.key} className="flex items-center w-full">
              <div className={`flex flex-col items-center ${idx <= statusIdx ? 'text-primary' : 'text-gray-300'}`}> 
                <div className={`rounded-full border-2 ${idx <= statusIdx ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white'} h-10 w-10 flex items-center justify-center mb-1`}>{step.icon}</div>
                <span className="text-xs font-medium text-center w-16">{step.label}</span>
              </div>
              {idx < (isCancelado ? 4 : 3) && (
                <div className={`flex-1 h-1 ${idx < statusIdx ? 'bg-primary' : 'bg-gray-200'} mx-1 sm:mx-2 rounded`}></div>
              )}
            </div>
          ))}
        </div>
        {/* Status atual */}
        <div className={`mb-2 px-4 py-2 rounded-full font-semibold text-center ${isCancelado ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'}`}>{pedido.status}</div>
        {/* Card resumo do pedido */}
        <div className="w-full bg-gray-50 rounded-lg p-3 mb-4 shadow-inner">
          <div className="flex flex-col gap-1">
            {pedido.itens && pedido.itens.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between border-b last:border-b-0 py-2">
                <div>
                  <span className="font-semibold text-gray-800">{item.nome_produto}</span>
                  <span className="ml-2 text-xs text-gray-500">x{item.quantidade}</span>
                  {item.adicionais && item.adicionais.length > 0 && (
                    <div className="text-xs text-blue-700 mt-1">
                      {item.adicionais.map((ad, i) => (
                        <span key={i} className="inline-block mr-2 bg-blue-50 px-2 py-1 rounded">
                          +{ad.quantidade}x {ad.nome} (R$ {parseFloat(ad.preco_unitario_adicional).toFixed(2).replace('.', ',')})
                        </span>
                      ))}
                    </div>
                  )}
                  {item.observacoes && (
                    <div className="text-xs text-gray-600 mt-1">Obs: {item.observacoes}</div>
                  )}
                </div>
                <div className="font-bold text-sm text-right mt-2 sm:mt-0">R$ {(item.quantidade * parseFloat(item.preco_unitario)).toFixed(2).replace('.', ',')}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 font-bold text-base">
            <span>Subtotal:</span>
            <span>R$ {totalBase.toFixed(2).replace('.', ',')}</span>
          </div>
          {taxaEntrega > 0 && (
            <div className="flex justify-between mt-1 text-base">
              <span>Taxa de entrega:</span>
              <span>R$ {taxaEntrega.toFixed(2).replace('.', ',')}</span>
            </div>
          )}
          <div className="flex justify-between mt-1 font-bold text-lg border-t pt-2">
            <span>Total geral:</span>
            <span>R$ {totalGeral.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
        <Button onClick={() => setShowDetails(true)} variant="outline" className="mb-2">Ver detalhes do pedido</Button>
        <Button onClick={() => window.location.href = `/${slug}`} variant="ghost">Voltar ao cardápio</Button>
      </div>
      {/* Modal de detalhes do pedido */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription>Status: {pedido.status}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="font-semibold">Itens:</div>
            {pedido.itens && pedido.itens.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-1 border-b last:border-b-0 pb-2">
                <span>{item.nome_produto} x{item.quantidade}</span>
                {item.adicionais && item.adicionais.length > 0 && (
                  <div className="text-xs text-blue-700 mt-1">
                    {item.adicionais.map((ad, i) => (
                      <span key={i} className="inline-block mr-2 bg-blue-50 px-2 py-1 rounded">
                        +{ad.quantidade}x {ad.nome} (R$ {parseFloat(ad.preco_unitario_adicional).toFixed(2).replace('.', ',')})
                      </span>
                    ))}
                  </div>
                )}
                {item.observacoes && (
                  <div className="text-xs text-gray-600 mt-1">Obs: {item.observacoes}</div>
                )}
                <div className="font-bold text-sm text-right">R$ {(item.quantidade * parseFloat(item.preco_unitario)).toFixed(2).replace('.', ',')}</div>
              </div>
            ))}
            <div className="flex justify-between mt-3 font-bold text-base">
              <span>Total:</span>
              <span>R$ {parseFloat(pedido.valor_total || 0).toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="mt-2">
              <Info className="inline-block mr-1 text-blue-500" />
              <span className="text-xs text-gray-500">Acompanhe esta tela para ver o andamento do seu pedido em tempo real.</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDetails(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderStatusPagePublic; 