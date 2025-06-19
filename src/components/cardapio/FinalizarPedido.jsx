// frontend/src/components/cardapio/FinalizarPedido.jsx
import React, { useState, useEffect } from 'react';
import { useCarrinho } from '../../contexts/CarrinhoContext';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2 } from 'lucide-react';
import { IMaskInput } from 'react-imask';
import { Switch } from '../ui/switch';


const FinalizarPedido = ({ pedidoType, onClose }) => {
  const { itens, total, limparCarrinho } = useCarrinho();
  const { empresa, loading: empresaLoading } = useEmpresa();
  const { user, token, login } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formasPagamento, setFormasPagamento] = useState([]);

  // Dados do cliente/convidado
  const [nomeCliente, setNomeCliente] = useState(user?.nome || '');
  const [emailCliente, setEmailCliente] = useState(user?.email || '');
  const [telefoneCliente, setTelefoneCliente] = useState(user?.telefone || '');
  // Dados do endereço detalhado
  const [ruaCliente, setRuaCliente] = useState('');
  const [numeroCliente, setNumeroCliente] = useState('');
  const [bairroCliente, setBairroCliente] = useState('');
  const [cepCliente, setCepCliente] = useState('');
  const [cidadeCliente, setCidadeCliente] = useState('');
  const [estadoCliente, setEstadoCliente] = useState('');


  const [mesaCliente, setMesaCliente] = useState('');
  const [obsPedido, setObsPedido] = useState('');

  const [selectedFormaPagamento, setSelectedFormaPagamento] = useState('');

  // Estados para cadastro opcional
  const [wantsToRegister, setWantsToRegister] = useState(false);
  const [passwordRegister, setPasswordRegister] = useState('');


  // Carrega formas de pagamento
  useEffect(() => {
    const fetchFormasPagamento = async () => {
      if (empresaLoading || !empresa || !empresa.slug) return;

      try {
        const headers = {};
        if (user?.token) {
          headers.Authorization = `Bearer ${user.token}`;
        }
        const response = await api.get(`/gerencial/${empresa.slug}/formas-pagamento`, { headers });
        setFormasPagamento(response.data.filter(fp => fp.ativo));
        if (response.data.length > 0) {
            setSelectedFormaPagamento(response.data[0].id.toString());
        }
      } catch (err) {
        toast.error("Erro ao carregar formas de pagamento.");
        console.error("Erro ao carregar formas de pagamento:", err);
      }
    };
    fetchFormasPagamento();
  }, [empresa, empresaLoading, user]);


  const handleFinalizarPedido = async (e) => {
    e.preventDefault();
    if (itens.length === 0) {
      toast.error('O carrinho está vazio!');
      return;
    }
    if (!selectedFormaPagamento) {
        toast.error('Selecione uma forma de pagamento.');
        return;
    }
    if (wantsToRegister && !passwordRegister.trim()) {
        toast.error('Defina uma senha para o seu cadastro.');
        return;
    }
    if (pedidoType === 'Delivery' && total < (parseFloat(empresa?.pedido_minimo_delivery) || 0)) {
        toast.error(`Valor mínimo para Delivery é de R$ ${parseFloat(empresa?.pedido_minimo_delivery || 0).toFixed(2).replace('.', ',')}.`);
        setLoading(false);
        return;
    }

    setLoading(true);
    setError(null);

    try {
      const pedidoData = {
        tipo_entrega: pedidoType,
        observacoes: obsPedido,
        itens: itens.map(item => ({
          id_produto: item.id,
          quantidade: item.quantidade,
          observacoes: item.observacoes
        })),
        id_forma_pagamento: parseInt(selectedFormaPagamento)
      };

      if (user?.id) { // Cliente logado
        pedidoData.id_cliente = user.id;
      } else { // Cliente convidado (ou convidado que quer se registrar)
        if (!nomeCliente || !telefoneCliente) {
          toast.error('Nome e Telefone são obrigatórios para convidados.');
          setLoading(false);
          return;
        }
        pedidoData.nome_cliente_convidado = nomeCliente;
        pedidoData.email_cliente_convidado = emailCliente;
        pedidoData.telefone_cliente_convidado = telefoneCliente.replace(/\D/g, '');
      }

      let enderecoCompleto = '';
      if (pedidoType === 'Delivery') {
          if (!ruaCliente || !numeroCliente || !bairroCliente) {
              toast.error('Rua, Número e Bairro são obrigatórios para entrega.');
              setLoading(false);
              return;
          }
          enderecoCompleto = `${ruaCliente}, ${numeroCliente}, ${bairroCliente}`;
          if (cepCliente) enderecoCompleto += `, CEP: ${cepCliente}`;
          if (cidadeCliente) enderecoCompleto += `, ${cidadeCliente}`;
          if (estadoCliente) enderecoCompleto += ` - ${estadoCliente}`;
          pedidoData.endereco_entrega = enderecoCompleto;
      } else if (pedidoType === 'Mesa') { // Pedido de Mesa por CLIENTE (não garçom)
        if (!mesaCliente) {
            toast.error('Número da mesa é obrigatório.');
            setLoading(false);
            return;
        }
        pedidoData.id_mesa = parseInt(mesaCliente);
      }

      const headers = {};
      if (user?.token) {
        headers.Authorization = `Bearer ${user.token}`;
      }

      const response = await api.post(`/${empresa.slug}/pedidos`, pedidoData, { headers });

      if (wantsToRegister && !user?.id) {
          try {
              await api.post(`/${empresa.slug}/cliente/register`, {
                  nome: nomeCliente,
                  email: emailCliente,
                  telefone: telefoneCliente.replace(/\D/g, ''),
                  senha: passwordRegister,
                  endereco: enderecoCompleto
              });
              toast.success('Seu cadastro foi criado com sucesso! Use seu email/telefone e senha para futuros pedidos.');
          } catch (regErr) {
              toast.error('Erro ao finalizar cadastro: ' + (regErr.response?.data?.message || regErr.message));
              console.error('Erro no cadastro opcional:', regErr);
          }
      }

      toast.success('Pedido enviado com sucesso! Aguarde a confirmação.');
      limparCarrinho();
      onClose();
      // Opcional: Redirecionar para OrderStatusPage
      // navigate(`/${empresa.slug}/status-pedido/${response.data.pedido.numero_pedido}`);
      alert(empresa?.mensagem_confirmacao_pedido || 'Seu pedido foi recebido. Em breve você receberá uma confirmação.');

    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao finalizar pedido.');
      toast.error(err.response?.data?.message || 'Erro ao finalizar pedido.');
      console.error("Erro ao finalizar pedido:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderCustomerDetails = () => {
    if (user?.id) {
        return (
            <div className="mt-4">
                <h4 className="text-lg font-semibold border-b pb-2">Seus Dados</h4>
                <p className="text-gray-700">Nome: {user.nome}</p>
                <p className="text-gray-700">Email: {user.email || 'Não informado'}</p>
                <p className="text-gray-700">Telefone: {user.telefone || 'Não informado'}</p>
            </div>
        );
    }

    return (
      <div className="grid grid-cols-1 gap-4 mt-4">
        <h4 className="text-lg font-semibold border-b pb-2">Dados do Cliente (Convidado)</h4>
        <div>
          <Label htmlFor="nomeCliente">Nome</Label>
          <Input id="nomeCliente" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="telefoneCliente">Telefone</Label>
          <IMaskInput
            mask="(00) 00000-0000"
            value={telefoneCliente}
            onAccept={(value, mask) => setTelefoneCliente(value)}
            placeholder="(00) 00000-0000"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          />
        </div>
        <div>
          <Label htmlFor="emailCliente">Email (opcional)</Label>
          <Input id="emailCliente" type="email" value={emailCliente} onChange={(e) => setEmailCliente(e.target.value)} />
        </div>
        
        <div className="flex items-center space-x-2 mt-2">
            <Switch
                id="wantsToRegister"
                checked={wantsToRegister}
                onCheckedChange={setWantsToRegister}
            />
            <Label htmlFor="wantsToRegister">Deseja se cadastrar para futuros pedidos?</Label>
        </div>
        {wantsToRegister && (
            <div>
                <Label htmlFor="passwordRegister">Defina uma Senha</Label>
                <Input
                    id="passwordRegister"
                    type="password"
                    value={passwordRegister}
                    onChange={(e) => setPasswordRegister(e.target.value)}
                    required
                />
            </div>
        )}
      </div>
    );
  };

  const renderDeliveryAddress = () => {
    if (pedidoType === 'Delivery') {
      return (
        <div className="grid grid-cols-1 gap-4 mt-4">
          <h4 className="text-lg font-semibold border-b pb-2">Endereço de Entrega</h4>
          <div>
            <Label htmlFor="ruaCliente">Rua</Label>
            <Input id="ruaCliente" value={ruaCliente} onChange={(e) => setRuaCliente(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="numeroCliente">Número</Label>
            <Input id="numeroCliente" value={numeroCliente} onChange={(e) => setNumeroCliente(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="bairroCliente">Bairro</Label>
            <Input id="bairroCliente" value={bairroCliente} onChange={(e) => setBairroCliente(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="cepCliente">CEP</Label>
            <IMaskInput
                mask="00000-000"
                value={cepCliente}
                onAccept={(value) => setCepCliente(value)}
                placeholder="00000-000"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div>
            <Label htmlFor="cidadeCliente">Cidade</Label>
            <Input id="cidadeCliente" value={cidadeCliente} onChange={(e) => setCidadeCliente(e.target.value)} placeholder="Ex: Presidente Prudente" />
          </div>
          <div>
            <Label htmlFor="estadoCliente">Estado (UF)</Label>
            <Input id="estadoCliente" value={estadoCliente} onChange={(e) => setEstadoCliente(e.target.value)} placeholder="Ex: SP" maxLength="2" />
          </div>

          <p className="text-sm text-gray-600 mt-1">Taxa de entrega: R$ {parseFloat(empresa?.taxa_entrega || 0).toFixed(2).replace('.', ',')}</p>
        </div>
      );
    }
    return null;
  };

  const renderMesaDetails = () => {
    if (pedidoType === 'Mesa') {
      return (
        <div className="grid grid-cols-1 gap-4 mt-4">
          <h4 className="text-lg font-semibold border-b pb-2">Detalhes da Mesa</h4>
          <div>
            <Label htmlFor="mesaCliente">Número da Mesa</Label>
            <Input id="mesaCliente" value={mesaCliente} onChange={(e) => setMesaCliente(e.target.value)} required placeholder="Ex: 5, B1" />
          </div>
        </div>
      );
    }
    return null;
  };

  if (empresaLoading || !empresa) {
    return <div className="p-4">Carregando dados da empresa...</div>;
  }

  if (itens.length === 0) {
    return (
      <div className="p-4 text-center">
        <p>Carrinho vazio. Adicione itens antes de finalizar o pedido.</p>
        <Button onClick={onClose} className="mt-4">Fechar</Button>
      </div>
    );
  }

  const primaryColor = empresa?.cor_primaria_cardapio || '#FF5733';

  const selectedPaymentMethod = formasPagamento.find(fp => fp.id.toString() === selectedFormaPagamento);
  const discountPercentage = parseFloat(selectedPaymentMethod?.porcentagem_desconto_geral || 0) / 100;
  let totalWithDelivery = total + (pedidoType === 'Delivery' ? (parseFloat(empresa?.taxa_entrega) || 0) : 0);
  let finalTotal = totalWithDelivery * (1 - discountPercentage);


  return (
    <div className="p-4 overflow-y-auto max-h-[90vh]">
      <DialogHeader>
        <DialogTitle>Finalizar Pedido</DialogTitle>
        <DialogDescription>
          Confirme seu pedido e selecione a forma de pagamento.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleFinalizarPedido}>
        <h3 className="text-xl font-semibold mb-3 mt-6 border-b pb-2">Seu Pedido</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead className="text-right">Preço Unit.</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.map(item => (
              <TableRow key={item.id}>
                <TableCell>{item.nome} {item.observacoes && `(${item.observacoes})`}</TableCell>
                <TableCell>{item.quantidade}</TableCell>
                <TableCell className="text-right">R$ {(item.promo_ativa ? parseFloat(item.promocao) : parseFloat(item.preco)).toFixed(2).replace('.', ',')}</TableCell>
                <TableCell className="text-right">R$ {(item.quantidade * (item.promo_ativa ? parseFloat(item.promocao) : parseFloat(item.preco))).toFixed(2).replace('.', ',')}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold">
              <TableCell colSpan={3} className="text-right">Subtotal:</TableCell>
              <TableCell className="text-right">R$ {total.toFixed(2).replace('.', ',')}</TableCell>
            </TableRow>
            {pedidoType === 'Delivery' && (parseFloat(empresa?.taxa_entrega) || 0) > 0 && (
              <TableRow className="text-sm">
                <TableCell colSpan={3} className="text-right">Taxa de Entrega:</TableCell>
                <TableCell className="text-right">R$ {parseFloat(empresa.taxa_entrega).toFixed(2).replace('.', ',')}</TableCell>
              </TableRow>
            )}
            {discountPercentage > 0 && (
                <TableRow className="font-bold text-sm text-green-600">
                    <TableCell colSpan={3} className="text-right">Desconto ({parseFloat(selectedPaymentMethod.porcentagem_desconto_geral).toFixed(0)}%):</TableCell>
                    <TableCell className="text-right">-R$ {(totalWithDelivery * discountPercentage).toFixed(2).replace('.', ',')}</TableCell>
                </TableRow>
            )}
            <TableRow className="font-bold" style={{ backgroundColor: primaryColor }}>
              <TableCell colSpan={3} className="text-right" style={{color: 'white'}}>TOTAL GERAL:</TableCell> {/* Corrigido aqui */}
              <TableCell className="text-right" style={{ color: 'white' }}> {/* Corrigido aqui */}
                R$ {finalTotal.toFixed(2).replace('.', ',')}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {renderCustomerDetails()}
        {renderDeliveryAddress()}
        {renderMesaDetails()}

        <div className="mt-4">
          <Label htmlFor="obsPedido">Observações do Pedido (opcional)</Label>
          <Textarea id="obsPedido" value={obsPedido} onChange={(e) => setObsPedido(e.target.value)} placeholder="Ex: Sem talheres, embalar para presente..." />
        </div>

        <h3 className="text-xl font-semibold mb-3 mt-6 border-b pb-2">Forma de Pagamento</h3>
        <Select value={selectedFormaPagamento} onValueChange={setSelectedFormaPagamento} required>
          <SelectTrigger id="formaPagamento"><SelectValue placeholder="Selecione a forma de pagamento" /></SelectTrigger>
          <SelectContent>
            {formasPagamento.length === 0 && <SelectItem disabled value="">Nenhuma forma de pagamento disponível</SelectItem>}
            {formasPagamento.map(fp => (
              <SelectItem key={fp.id} value={fp.id.toString()}>
                {fp.descricao} {fp.porcentagem_desconto_geral > 0 && `(${parseFloat(fp.porcentagem_desconto_geral).toFixed(0)}% desconto)`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button type="submit" disabled={loading} className="flex items-center" style={{ backgroundColor: primaryColor, color: 'white' }}>
            {loading && <Loader2 className="animate-spin mr-2" />} Finalizar Pedido
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        </DialogFooter>
      </form>
    </div>
  );
};

export default FinalizarPedido;