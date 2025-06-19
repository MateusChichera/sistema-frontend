import React, { useState } from 'react';
import { useCarrinho } from '../../contexts/CarrinhoContext';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, Trash2, ArrowLeft } from 'lucide-react';

const FinalizarPedido = () => {
  const { 
    itens, 
    tipoEntrega, 
    mesa, 
    observacoes,
    setTipoEntrega,
    setMesa,
    setObservacoes,
    atualizarQuantidade,
    removerItem,
    calcularTotal,
    limparCarrinho
  } = useCarrinho();
  
  const { empresa } = useEmpresa();
  const navigate = useNavigate();
  
  const [dadosCliente, setDadosCliente] = useState({
    nome: '',
    telefone: '',
    email: '',
    endereco: ''
  });
  
  const [formaPagamento, setFormaPagamento] = useState('');
  const [loading, setLoading] = useState(false);

  const formatarPreco = (preco) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(preco);
  };

  const handleFinalizarPedido = async () => {
    try {
      setLoading(true);
      
      // Validações básicas
      if (itens.length === 0) {
        alert('Adicione itens ao carrinho antes de finalizar o pedido.');
        return;
      }
      
      if (!dadosCliente.nome || !dadosCliente.telefone) {
        alert('Preencha pelo menos o nome e telefone.');
        return;
      }
      
      if (tipoEntrega === 'Mesa' && !mesa) {
        alert('Informe o número da mesa.');
        return;
      }
      
      if (!formaPagamento) {
        alert('Selecione uma forma de pagamento.');
        return;
      }

      // Aqui seria feita a chamada para a API
      const pedido = {
        id_empresa: empresa.id,
        itens,
        tipo_entrega: tipoEntrega,
        mesa: tipoEntrega === 'Mesa' ? mesa : null,
        observacoes_pedido: observacoes,
        valor_total: calcularTotal(),
        cliente: dadosCliente,
        forma_pagamento: formaPagamento
      };
      
      console.log('Pedido a ser enviado:', pedido);
      
      // Simular sucesso
      alert('Pedido realizado com sucesso! Você receberá atualizações sobre o status.');
      limparCarrinho();
      navigate(`/${empresa.slug}`);
      
    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
      alert('Erro ao finalizar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (itens.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Carrinho Vazio</h1>
        <p className="text-gray-600">Adicione itens ao carrinho para continuar.</p>
        <Button onClick={() => navigate(`/${empresa.slug}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Cardápio
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          onClick={() => navigate(`/${empresa.slug}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Finalizar Pedido</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Resumo do Pedido */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {itens.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.nome}</h4>
                    {item.observacoes && (
                      <p className="text-sm text-gray-600">Obs: {item.observacoes}</p>
                    )}
                    <p className="text-sm text-gray-600">
                      {formatarPreco(item.preco)} x {item.quantidade}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => atualizarQuantidade(item.id, item.quantidade - 1, item.observacoes)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantidade}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => atualizarQuantidade(item.id, item.quantidade + 1, item.observacoes)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removerItem(item.id, item.observacoes)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Separator />
              
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total:</span>
                <span>{formatarPreco(calcularTotal())}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulário */}
        <div className="space-y-6">
          {/* Dados do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Seus Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={dadosCliente.nome}
                  onChange={(e) => setDadosCliente({...dadosCliente, nome: e.target.value})}
                  placeholder="Seu nome completo"
                />
              </div>
              
              <div>
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  value={dadosCliente.telefone}
                  onChange={(e) => setDadosCliente({...dadosCliente, telefone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>
              
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={dadosCliente.email}
                  onChange={(e) => setDadosCliente({...dadosCliente, email: e.target.value})}
                  placeholder="seu@email.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tipo de Entrega */}
          <Card>
            <CardHeader>
              <CardTitle>Tipo de Entrega</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={tipoEntrega} onValueChange={setTipoEntrega}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Mesa" id="mesa" />
                  <Label htmlFor="mesa">Mesa (Consumo no Local)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Retirada" id="retirada" />
                  <Label htmlFor="retirada">Retirada no Balcão</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Delivery" id="delivery" />
                  <Label htmlFor="delivery">Delivery</Label>
                </div>
              </RadioGroup>
              
              {tipoEntrega === 'Mesa' && (
                <div className="mt-4">
                  <Label htmlFor="numeroMesa">Número da Mesa *</Label>
                  <Input
                    id="numeroMesa"
                    value={mesa}
                    onChange={(e) => setMesa(e.target.value)}
                    placeholder="Ex: 5"
                  />
                </div>
              )}
              
              {tipoEntrega === 'Delivery' && (
                <div className="mt-4">
                  <Label htmlFor="endereco">Endereço de Entrega</Label>
                  <Textarea
                    id="endereco"
                    value={dadosCliente.endereco}
                    onChange={(e) => setDadosCliente({...dadosCliente, endereco: e.target.value})}
                    placeholder="Rua, número, bairro, cidade"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Forma de Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle>Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={formaPagamento} onValueChange={setFormaPagamento}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dinheiro" id="dinheiro" />
                  <Label htmlFor="dinheiro">Dinheiro</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix">PIX</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cartao_credito" id="cartao_credito" />
                  <Label htmlFor="cartao_credito">Cartão de Crédito</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cartao_debito" id="cartao_debito" />
                  <Label htmlFor="cartao_debito">Cartão de Débito</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Alguma observação especial sobre o pedido?"
              />
            </CardContent>
          </Card>

          {/* Botão Finalizar */}
          <Button 
            onClick={handleFinalizarPedido}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Processando...' : `Finalizar Pedido - ${formatarPreco(calcularTotal())}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FinalizarPedido;

