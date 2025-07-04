// frontend/src/components/cardapio/FinalizarPedido.jsx
import React, { useState, useEffect } from 'react';
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
import { Loader2, Plus } from 'lucide-react';
import { IMaskInput } from 'react-imask';
import { Switch } from '../ui/switch';

const FinalizarPedido = ({ pedidoType, onClose, empresa, limparCarrinho, total, itens, onAddMoreItems }) => {
    const { user, token } = useAuth(); 

    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [formasPagamento, setFormasPagamento] = useState([]);

    const [nomeCliente, setNomeCliente] = useState(user?.nome || '');
    const [emailCliente, setEmailCliente] = useState(user?.email || '');
    const [telefoneCliente, setTelefoneCliente] = useState(user?.telefone || '');

    const [ruaCliente, setRuaCliente] = useState(user?.endereco?.rua || '');
    const [numeroCliente, setNumeroCliente] = useState(user?.endereco?.numero || '');
    const [bairroCliente, setBairroCliente] = useState(user?.endereco?.bairro || '');
    const [cepCliente, setCepCliente] = useState(user?.endereco?.cep || '');
    const [cidadeCliente, setCidadeCliente] = useState(user?.endereco?.cidade || '');
    const [estadoCliente, setEstadoCliente] = useState(user?.endereco?.estado || '');
    const [precisaTroco, setPrecisaTroco] = useState(false);
    const [valorPagoCliente, setValorPagoCliente] = useState('');

    const [obsPedido, setObsPedido] = useState('');
    const [selectedFormaPagamento, setSelectedFormaPagamento] = useState(undefined); 
    const [wantsToRegister, setWantsToRegister] = useState(false);
    const [passwordRegister, setPasswordRegister] = useState('');

    useEffect(() => {
        const fetchFormasPagamento = async () => {
            if (!empresa || !empresa.slug) return;
            try {
                const headers = {};
                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                }

                const response = await api.get(`/${empresa.slug}/formas-pagamento`, { headers });
                const formasOnline = response.data.filter(fp => fp.ativo);
                setFormasPagamento(formasOnline);

                if (formasOnline.length > 0) {
                    setSelectedFormaPagamento(formasOnline[0].id.toString());
                } else {
                    setSelectedFormaPagamento(undefined);
                    toast.warning("Nenhuma forma de pagamento online disponível. Contate a empresa.");
                }
            } catch (err) {
                toast.error("Erro ao carregar formas de pagamento.");
                console.error("Erro ao carregar formas de pagamento:", err);
            }
        };
        fetchFormasPagamento();
    }, [empresa, token]);

    const handleFinalizarPedido = async (e) => {
        e.preventDefault();
        setLoading(true); 
        setSubmitError(null); 

        if (itens.length === 0) {
            toast.error('O carrinho está vazio!');
            setLoading(false);
            return;
        }

        if (!selectedFormaPagamento) {
            toast.error('Selecione uma forma de pagamento.');
            setLoading(false);
            return;
        }

        if (wantsToRegister && !passwordRegister.trim()) {
            toast.error('Defina uma senha para o seu cadastro.');
            setLoading(false);
            return;
        }

        const pedidoMinimoDelivery = parseFloat(empresa?.pedido_minimo_delivery || 0);
        if (pedidoType === 'Delivery' && total < pedidoMinimoDelivery) {
            toast.error(`Valor mínimo para Delivery é de R$ ${pedidoMinimoDelivery.toFixed(2).replace('.', ',')}.`);
            setLoading(false);
            return;
        }
        let trocoCalculado = 0;
        if (
        selectedPaymentMethod?.descricao?.toLowerCase().includes("dinheiro") &&
        precisaTroco
        ) {
        const valorPago = parseFloat(valorPagoCliente || 0);
        trocoCalculado = valorPago > finalTotal ? valorPago - finalTotal : 0;
        }

        try {
            const pedidoData = {
                tipo_entrega: pedidoType,
                observacoes: obsPedido,
                itens: itens.map(item => ({
                    id_produto: item.id_produto,
                    quantidade: item.quantidade,
                    observacoes: item.observacoes
                })),
                id_forma_pagamento: parseInt(selectedFormaPagamento),
                formapagamento: selectedPaymentMethod.descricao || null,
                troco: parseFloat(trocoCalculado.toFixed(2)) || 0,
                taxa_entrega: pedidoType === 'Delivery' ? parseFloat(empresa?.taxa_entrega || 0) : 0,
            };

            if (user?.id) {
                pedidoData.id_cliente = user.id;
            } else {
                if (!nomeCliente || !telefoneCliente) {
                    toast.error('Nome e Telefone são obrigatórios para convidados.');
                    setLoading(false);
                    return;
                }
                pedidoData.nome_cliente_convidado = nomeCliente;
                pedidoData.email_cliente_convidado = emailCliente;
                pedidoData.telefone_cliente_convidado = telefoneCliente.replace(/\D/g, '');
            }

            if (pedidoType === 'Delivery') {
                if (!ruaCliente || !numeroCliente || !bairroCliente) {
                    toast.error('Rua, Número e Bairro são obrigatórios para entrega.');
                    setLoading(false);
                    return;
                }
                let endereco = `${ruaCliente}, ${numeroCliente}, ${bairroCliente}`;
                if (cepCliente) endereco += `, CEP: ${cepCliente}`;
                if (cidadeCliente) endereco += `, ${cidadeCliente}`;
                if (estadoCliente) endereco += ` - ${estadoCliente}`;
                pedidoData.endereco_entrega = endereco;
            }

            const headers = {};
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            await api.post(`/${empresa.slug}/pedidos`, pedidoData, { headers });

            if (wantsToRegister && !user?.id) {
                try {
                    await api.post(`/${empresa.slug}/cliente/register`, {
                        nome: nomeCliente,
                        email: emailCliente,
                        telefone: telefoneCliente.replace(/\D/g, ''),
                        senha: passwordRegister,
                        endereco: pedidoData.endereco_entrega
                    });
                    toast.success('Seu cadastro foi criado com sucesso!');
                } catch (regErr) {
                    toast.error('Erro ao finalizar cadastro: ' + (regErr.response?.data?.message || 'Verifique os dados de cadastro.'));
                    console.error('Erro no cadastro opcional:', regErr);
                }
            }

            toast.success('Pedido enviado com sucesso! Aguarde a confirmação.');
            limparCarrinho();
            onClose();
            alert(empresa?.mensagem_confirmacao_pedido || 'Seu pedido foi recebido.');
        } catch (err) {
            setSubmitError(err.response?.data?.message || 'Erro ao finalizar pedido.');
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
                <h4 className="text-lg font-semibold border-b pb-2">Dados do Cliente</h4>
                <div>
                    <Label htmlFor="nomeCliente">Nome Completo</Label>
                    <Input id="nomeCliente" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="telefoneCliente">Telefone</Label>
                    <IMaskInput
                        mask="(00) 00000-0000"
                        value={telefoneCliente}
                        onAccept={value => setTelefoneCliente(value)}
                        required
                        className="input"
                        placeholder="(00) 00000-0000"
                    />
                </div>
                <div>
                    <Label htmlFor="emailCliente">Email (opcional)</Label>
                    <Input id="emailCliente" type="email" value={emailCliente} onChange={(e) => setEmailCliente(e.target.value)} />
                </div>
                <div className="flex items-center space-x-2 mt-2">
                    <Switch id="wantsToRegister" checked={wantsToRegister} onCheckedChange={setWantsToRegister} />
                    <Label htmlFor="wantsToRegister">Deseja se cadastrar?</Label>
                </div>
                {wantsToRegister && (
                    <div>
                        <Label htmlFor="passwordRegister">Defina uma Senha</Label>
                        <Input id="passwordRegister" type="password" value={passwordRegister} onChange={(e) => setPasswordRegister(e.target.value)} required />
                    </div>
                )}
            </div>
        );
    };

    const renderDeliveryAddress = () => {
        if (pedidoType !== 'Delivery') return null;

        return (
            <div className="grid grid-cols-1 gap-4 mt-4">
                <h4 className="text-lg font-semibold border-b pb-2">Endereço de Entrega</h4>
                <Input placeholder="Rua" value={ruaCliente} onChange={e => setRuaCliente(e.target.value)} required />
                <Input placeholder="Número" value={numeroCliente} onChange={e => setNumeroCliente(e.target.value)} required />
                <Input placeholder="Bairro" value={bairroCliente} onChange={e => setBairroCliente(e.target.value)} required />
                <IMaskInput mask="00000-000" value={cepCliente} onAccept={value => setCepCliente(value)} className="input" placeholder="CEP" />
                <Input placeholder="Cidade" value={cidadeCliente} onChange={e => setCidadeCliente(e.target.value)} />
                <Input placeholder="Estado (UF)" value={estadoCliente} onChange={e => setEstadoCliente(e.target.value)} maxLength="2" />
            </div>
        );
    };

    const primaryColor = empresa?.cor_primaria_cardapio || '#FF5733';
    const selectedPaymentMethod = formasPagamento.find(fp => fp.id.toString() === selectedFormaPagamento);
    const discountPercentage = parseFloat(selectedPaymentMethod?.porcentagem_desconto_geral || 0) / 100;
    const totalWithDelivery = total + (pedidoType === 'Delivery' ? parseFloat(empresa?.taxa_entrega || 0) : 0);
    const finalTotal = totalWithDelivery * (1 - discountPercentage);

    return (
        <div className="p-4 overflow-y-auto max-h-[90vh]">
            <DialogHeader>
                <DialogTitle>Finalizar Pedido</DialogTitle>
                <DialogDescription>Confirme seu pedido e selecione a forma de pagamento.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleFinalizarPedido}>
                <h3 className="text-xl font-semibold mb-3 mt-6 border-b pb-2">Forma de Pagamento - Pagamento na entrega</h3>
                <Select value={selectedFormaPagamento} onValueChange={setSelectedFormaPagamento} required>
                    <SelectTrigger id="formaPagamento">
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                        {formasPagamento.length === 0 ? (
                            <SelectItem disabled value="indisponivel">Nenhuma forma de pagamento disponível para online</SelectItem>
                        ) : (
                            formasPagamento.map(fp => (
                                <SelectItem key={fp.id} value={fp.id.toString()}>
                                    {fp.descricao} {fp.porcentagem_desconto_geral > 0 && `(${parseFloat(fp.porcentagem_desconto_geral).toFixed(0)}% desconto)`}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
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
                        {itens.map((item) => (
                            <TableRow key={`${item.id_produto}-${item.observacoes}`}>
                                <TableCell>{item.nome} {item.observacoes && `(${item.observacoes})`}</TableCell>
                                <TableCell>{item.quantidade}</TableCell>
                                <TableCell className="text-right">R$ {parseFloat(item.preco_unitario).toFixed(2).replace('.', ',')}</TableCell>
                                <TableCell className="text-right">R$ {(item.quantidade * parseFloat(item.preco_unitario)).toFixed(2).replace('.', ',')}</TableCell>
                            </TableRow>
                        ))}
                        <TableRow className="font-bold">
                            <TableCell colSpan={3} className="text-right">Subtotal:</TableCell>
                            <TableCell className="text-right">R$ {total.toFixed(2).replace('.', ',')}</TableCell>
                        </TableRow>
                        {pedidoType === 'Delivery' && empresa?.taxa_entrega && (
                            <TableRow className="text-sm">
                                <TableCell colSpan={3} className="text-right">Taxa de Entrega:</TableCell>
                                <TableCell className="text-right">R$ {parseFloat(empresa.taxa_entrega).toFixed(2).replace('.', ',')}</TableCell>
                            </TableRow>
                        )}
                        {discountPercentage > 0 && (
                            <TableRow className="text-green-600 text-sm font-bold">
                                <TableCell colSpan={3} className="text-right">Desconto:</TableCell>
                                <TableCell className="text-right">-R$ {(totalWithDelivery * discountPercentage).toFixed(2).replace('.', ',')}</TableCell>
                            </TableRow>
                        )}
                        <TableRow className="font-bold" style={{ backgroundColor: primaryColor }}>
                        <TableCell colSpan={3} className="text-right text-black">TOTAL GERAL:</TableCell>
                        <TableCell className="text-right text-black">R$ {finalTotal.toFixed(2).replace('.', ',')}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
                {/* Se a forma de pagamento for dinheiro, mostrar switch para troco */}
                {selectedPaymentMethod?.descricao?.toLowerCase().includes("dinheiro") && (
                <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                    <Switch id="precisaTroco" checked={precisaTroco} onCheckedChange={setPrecisaTroco} />
                    <Label htmlFor="precisaTroco">Precisa de troco?</Label>
                    </div>

                    {precisaTroco && (
                    <div>
                        <Label htmlFor="valorPagoCliente">Quanto vai pagar?</Label>
                        <Input
                        id="valorPagoCliente"
                        placeholder="Ex: 100.00"
                        type="number"
                        value={valorPagoCliente}
                        onChange={(e) => setValorPagoCliente(e.target.value)}
                        step="0.01"
                        min={finalTotal.toFixed(2)}
                        />
                        <p className="text-sm text-gray-600 mt-1">
                        Troco calculado: R$ {(parseFloat(valorPagoCliente || 0) - finalTotal).toFixed(2).replace('.', ',')}
                        </p>
                    </div>
                    )}
                </div>
                )}

                {renderCustomerDetails()}
                {renderDeliveryAddress()}

                <div className="mt-4">
                    <Label htmlFor="obsPedido">Observações (opcional)</Label>
                    <Textarea id="obsPedido" value={obsPedido} onChange={(e) => setObsPedido(e.target.value)} />
                </div>

                {submitError && <p className="text-red-500 text-sm mt-3">{submitError}</p>}

                    
                <DialogFooter className="mt-6 flex justify-end gap-2">
                    <Button 
                        type="button" 
                        onClick={onClose}
                        style={{ backgroundColor: '#d32f2f', color: 'white', border: 'none' }}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        type="button" 
                        onClick={onAddMoreItems}
                        className="flex items-center"
                        style={{ backgroundColor: '#E4AF24', color: 'white', border: 'none'}}
                    >
                        <Plus className="mr-2 h-4 w-4" color="white" />
                        Adicionar mais itens
                    </Button>
                    <Button type="submit" disabled={loading} className="flex items-center" style={{ backgroundColor: primaryColor, color: 'white' }}>
                        {loading && <Loader2 className="animate-spin mr-2" />} Finalizar Pedido
                    </Button>
                </DialogFooter>
            </form>
        </div>
    );
};

export default FinalizarPedido;
