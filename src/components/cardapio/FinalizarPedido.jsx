// frontend/src/components/cardapio/FinalizarPedido.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext'; 
import api from '../../services/api';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription} from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'; 
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, Plus } from 'lucide-react';
import { IMaskInput } from 'react-imask';
import { Switch } from '../ui/switch';
import { useCarrinho } from '../../contexts/CarrinhoContext';
import { useNavigate, useParams } from 'react-router-dom';

const FinalizarPedido = ({ pedidoType, onClose, empresa, limparCarrinho, total, itens, onAddMoreItems, setIsMinimoDeliveryModalOpen, setValorFaltanteDelivery }) => {
    const { user, token } = useAuth(); 
    const navigate = useNavigate();
    const { slug } = useParams();

    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [formasPagamento, setFormasPagamento] = useState([]);
    const [step, setStep] = useState(1); // 1: Revisão do carrinho, 2: Dados do cliente

    // Funções para edição/exclusão de itens do carrinho
    const [editingItemIndex, setEditingItemIndex] = useState(null);
    const [editingObservation, setEditingObservation] = useState('');
    const [editingQuantity, setEditingQuantity] = useState(1);
    const { atualizarQuantidadeItem, removerItem } = useCarrinho();

    const handleEditObservation = (idx) => {
        setEditingItemIndex(idx);
        setEditingObservation(itens[idx].observacoes || '');
        setEditingQuantity(itens[idx].quantidade);
    };
    const handleSaveObservation = () => {
        if (editingItemIndex !== null) {
            const item = itens[editingItemIndex];
            atualizarQuantidadeItem(item.id_produto, editingQuantity, editingObservation, item.adicionais);
            setEditingItemIndex(null);
            setEditingObservation('');
            setEditingQuantity(1);
        }
    };
    const handleRemoveItem = (idx) => {
        removerItem(itens[idx].id_produto, true, itens[idx].observacoes, itens[idx].adicionais);
    };

    // Responsividade: classes utilitárias
    const containerClass = "p-2 sm:p-4 overflow-y-auto max-h-[85vh] w-full overflow-x-hidden";
    const tableClass = "min-w-full text-xs sm:text-sm";
    const buttonClass = "h-9 sm:h-10 text-xs sm:text-sm";

    // Carrega dados salvos do localStorage ou usa valores padrão
    const loadSavedData = () => {
        try {
            const saved = localStorage.getItem('finalizarPedidoFormData');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            return null;
        }
    };

    const savedData = loadSavedData();

    // Sempre iniciar os campos em branco para o público
    const [nomeCliente, setNomeCliente] = useState(savedData?.nomeCliente || '');
    const [emailCliente, setEmailCliente] = useState(savedData?.emailCliente || '');
    const [telefoneCliente, setTelefoneCliente] = useState(savedData?.telefoneCliente || '');

    const [ruaCliente, setRuaCliente] = useState(savedData?.ruaCliente || '');
    const [numeroCliente, setNumeroCliente] = useState(savedData?.numeroCliente || '');
    const [bairroCliente, setBairroCliente] = useState(savedData?.bairroCliente || '');
    const [cepCliente, setCepCliente] = useState(savedData?.cepCliente || '');
    const [cidadeCliente, setCidadeCliente] = useState(savedData?.cidadeCliente || '');
    const [estadoCliente, setEstadoCliente] = useState(savedData?.estadoCliente || '');
    const [precisaTroco, setPrecisaTroco] = useState(savedData?.precisaTroco || false);
    const [valorPagoCliente, setValorPagoCliente] = useState(savedData?.valorPagoCliente || '');

    const [obsPedido, setObsPedido] = useState(savedData?.obsPedido || '');
    const [selectedFormaPagamento, setSelectedFormaPagamento] = useState(savedData?.selectedFormaPagamento || undefined); 

    // Salva dados no localStorage sempre que houver mudanças
    useEffect(() => {
        const formData = {
            nomeCliente,
            emailCliente,
            telefoneCliente,
            ruaCliente,
            numeroCliente,
            bairroCliente,
            cepCliente,
            cidadeCliente,
            estadoCliente,
            precisaTroco,
            valorPagoCliente,
            obsPedido,
            selectedFormaPagamento
        };
        localStorage.setItem('finalizarPedidoFormData', JSON.stringify(formData));
    }, [
        nomeCliente, emailCliente, telefoneCliente,
        ruaCliente, numeroCliente, bairroCliente, cepCliente, cidadeCliente, estadoCliente,
        precisaTroco, valorPagoCliente, obsPedido, selectedFormaPagamento
    ]);

    // Preencher automaticamente se usuário logado for cliente
    useEffect(() => {
        if (user && user.role === 'cliente') {
            if (!nomeCliente) setNomeCliente(user.nome || '');
            if (!emailCliente) setEmailCliente(user.email || '');
            if (!telefoneCliente) setTelefoneCliente(user.telefone || '');
            if (user.endereco) {
                // Tenta extrair rua, número, bairro, cep, cidade, estado do campo endereco (string)
                const endereco = user.endereco;
                // Exemplo: Rua José Bongiovani, 151, Vila Liberdade, CEP: 19050-680, Presidente Prudente - SP
                const ruaMatch = endereco.match(/^([^,]+)/);
                const numeroMatch = endereco.match(/,\s*(\d+)/);
                const bairroMatch = endereco.match(/,\s*([^,]+),\s*CEP:/);
                const cepMatch = endereco.match(/CEP:\s*([\d-]+)/);
                const cidadeMatch = endereco.match(/,\s*([^,]+)\s*-\s*[A-Z]{2}$/);
                const estadoMatch = endereco.match(/-\s*([A-Z]{2})$/);
                if (!ruaCliente && ruaMatch) setRuaCliente(ruaMatch[1]);
                if (!numeroCliente && numeroMatch) setNumeroCliente(numeroMatch[1]);
                if (!bairroCliente && bairroMatch) setBairroCliente(bairroMatch[1]);
                if (!cepCliente && cepMatch) setCepCliente(cepMatch[1]);
                if (!cidadeCliente && cidadeMatch) setCidadeCliente(cidadeMatch[1]);
                if (!estadoCliente && estadoMatch) setEstadoCliente(estadoMatch[1]);
            }
        }
    }, [user]);

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

                if (formasOnline.length > 0 && !selectedFormaPagamento) {
                    setSelectedFormaPagamento(formasOnline[0].id.toString());
                } else if (formasOnline.length === 0) {
                    setSelectedFormaPagamento(undefined);
                    toast.warning("Nenhuma forma de pagamento online disponível. Contate a empresa.");
                }
            } catch (err) {
                toast.error("Erro ao carregar formas de pagamento.");
                console.error("Erro ao carregar formas de pagamento:", err);
            }
        };
        fetchFormasPagamento();
    }, [empresa, token, selectedFormaPagamento]);

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pedidoIdFinalizado, setPedidoIdFinalizado] = useState(null);

    const handleFinalizarPedido = async (e) => {
        e.preventDefault();
        setLoading(true); 
        setSubmitError(null); 

        // Garantir preenchimento dos campos se usuário logado for cliente
        if (user && user.role === 'cliente') {
            if (!nomeCliente) setNomeCliente(user.nome || '');
            if (!emailCliente) setEmailCliente(user.email || '');
            if (!telefoneCliente) setTelefoneCliente(user.telefone || '');
            if (user.endereco) {
                const endereco = user.endereco;
                const ruaMatch = endereco.match(/^([^,]+)/);
                const numeroMatch = endereco.match(/,\s*(\d+)/);
                const bairroMatch = endereco.match(/,\s*([^,]+),\s*CEP:/);
                const cepMatch = endereco.match(/CEP:\s*([\d-]+)/);
                const cidadeMatch = endereco.match(/,\s*([^,]+)\s*-\s*[A-Z]{2}$/);
                const estadoMatch = endereco.match(/-\s*([A-Z]{2})$/);
                if (!ruaCliente && ruaMatch) setRuaCliente(ruaMatch[1]);
                if (!numeroCliente && numeroMatch) setNumeroCliente(numeroMatch[1]);
                if (!bairroCliente && bairroMatch) setBairroCliente(bairroMatch[1]);
                if (!cepCliente && cepMatch) setCepCliente(cepMatch[1]);
                if (!cidadeCliente && cidadeMatch) setCidadeCliente(cidadeMatch[1]);
                if (!estadoCliente && estadoMatch) setEstadoCliente(estadoMatch[1]);
            }
        }

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


        const pedidoMinimoDelivery = parseFloat(empresa?.pedido_minimo_delivery || 0);
        if (pedidoType === 'Delivery' && total < pedidoMinimoDelivery) {
            if (typeof setValorFaltanteDelivery === 'function' && typeof setIsMinimoDeliveryModalOpen === 'function') {
                setValorFaltanteDelivery(pedidoMinimoDelivery - total);
                setIsMinimoDeliveryModalOpen(true);
            } else {
                toast.error(`Valor mínimo para Delivery é de R$ ${pedidoMinimoDelivery.toFixed(2).replace('.', ',')}.`);
            }
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
                    observacoes: item.observacoes,
                    adicionais: item.adicionais ? item.adicionais.map(adicional => ({
                        id_adicional: adicional.id,
                        quantidade: adicional.quantidade
                    })) : []
                })),
                id_forma_pagamento: parseInt(selectedFormaPagamento),
                formapagamento: selectedPaymentMethod.descricao || null,
                troco: parseFloat(trocoCalculado.toFixed(2)) || 0,
                taxa_entrega: pedidoType === 'Delivery' ? parseFloat(empresa?.taxa_entrega || 0) : 0,
                nome_cliente_convidado: nomeCliente,
                email_cliente_convidado: emailCliente,
                telefone_cliente_convidado: telefoneCliente.replace(/\D/g, ''),
            };

            if (pedidoType === 'Delivery') {
                let endereco = `${ruaCliente}, ${numeroCliente}, ${bairroCliente}`;
                if (cepCliente) endereco += `, CEP: ${cepCliente}`;
                if (cidadeCliente) endereco += `, ${cidadeCliente}`;
                if (estadoCliente) endereco += ` - ${estadoCliente}`;
                pedidoData.endereco_entrega = endereco;
            }
            if (user?.id) {
                pedidoData.id_cliente = user.id;
            }


            const headers = {};
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const response = await api.post(`/${empresa.slug}/pedidos`, pedidoData, { headers });
            const pedidoCriado = response.data;
            toast.success('Pedido enviado com sucesso! Aguarde a confirmação.');
            limparCarrinho();
            localStorage.removeItem('finalizarPedidoFormData'); // Limpa dados após finalizar
            setPedidoIdFinalizado(pedidoCriado.pedido?.id);
            setShowConfirmDialog(true);
        } catch (err) {
            setSubmitError(err.response?.data?.message || 'Erro ao finalizar pedido.');
            toast.error(err.response?.data?.message || 'Erro ao finalizar pedido.');
            console.error("Erro ao finalizar pedido:", err);
        } finally {
            setLoading(false);
        }
    };

    const renderCustomerDetails = () => {
        return (
            <div className="grid grid-cols-1 gap-4 mt-4">
                <h4 className="text-lg font-semibold border-b pb-2">Dados do Cliente</h4>
                <div>
                    <Label htmlFor="nomeCliente">Nome Completo</Label>
                    <Input id="nomeCliente" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} required autoComplete="off"
                        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                    />
                </div>
                <div>
                    <Label htmlFor="telefoneCliente">Telefone</Label>
                    <Input id="telefoneCliente" value={telefoneCliente} onChange={e => setTelefoneCliente(e.target.value)} required placeholder="(00) 00000-0000" maxLength={15} />
                </div>
                <div>
                    <Label htmlFor="emailCliente">Email (opcional)</Label>
                    <Input id="emailCliente" type="email" value={emailCliente} onChange={(e) => setEmailCliente(e.target.value)} />
                </div>
            </div>
        );
    };

    const renderDeliveryAddress = () => {
        if (pedidoType !== 'Delivery') return null;

        return (
            <div className="grid grid-cols-1 gap-4 mt-4">
                <h4 className="text-lg font-semibold border-b pb-2">Endereço de Entrega</h4>
                <div>
                    <Label htmlFor="ruaCliente">Rua</Label>
                    <Input id="ruaCliente" placeholder="Rua" value={ruaCliente} onChange={e => setRuaCliente(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="numeroCliente">Número</Label>
                    <Input id="numeroCliente" placeholder="Número" value={numeroCliente} onChange={e => setNumeroCliente(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="bairroCliente">Bairro</Label>
                    <Input id="bairroCliente" placeholder="Bairro" value={bairroCliente} onChange={e => setBairroCliente(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="cepCliente">CEP</Label>
                    <Input id="cepCliente" placeholder="CEP" value={cepCliente} onChange={e => setCepCliente(e.target.value)} maxLength={9} />
                </div>
                <div>
                    <Label htmlFor="cidadeCliente">Cidade</Label>
                    <Input id="cidadeCliente" placeholder="Cidade" value={cidadeCliente} onChange={e => setCidadeCliente(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="estadoCliente">Estado (UF)</Label>
                    <Input id="estadoCliente" placeholder="Estado (UF)" value={estadoCliente} onChange={e => setEstadoCliente(e.target.value)} maxLength={2} />
                </div>
            </div>
        );
    };

    const primaryColor = empresa?.cor_primaria_cardapio || '#FF5733';
    const selectedPaymentMethod = formasPagamento.find(fp => fp.id.toString() === selectedFormaPagamento);
    const discountPercentage = parseFloat(selectedPaymentMethod?.porcentagem_desconto_geral || 0) / 100;
    const totalWithDelivery = total + (pedidoType === 'Delivery' ? parseFloat(empresa?.taxa_entrega || 0) : 0);
    const finalTotal = totalWithDelivery * (1 - discountPercentage);

    // Etapa 1: Revisão do carrinho
    if (step === 1) {
        return (
            <div className={containerClass}>
                <DialogHeader>
                    <DialogTitle>Revisar Pedido</DialogTitle>
                    <DialogDescription>Confira, edite ou exclua itens do seu carrinho antes de continuar.</DialogDescription>
                </DialogHeader>
                {/* Layout responsivo: cards no mobile, tabela no desktop */}
                <div className="space-y-2 sm:space-y-0 sm:overflow-x-auto max-h-48 sm:max-h-60 overflow-y-auto">
                  {/* Mobile: Cards */}
                  <div className="sm:hidden space-y-2">
                    {itens.map((item, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">{item.nome}</div>
                            <div className="text-xs text-gray-500">Qtd: {item.quantidade}</div>
                            {item.adicionais && item.adicionais.length > 0 && (
                              <div className="text-xs text-blue-700 mt-1">
                                {item.adicionais.map((ad, i) => (
                                  <span key={i} className="inline-block mr-2 bg-blue-50 px-2 py-1 rounded">
                                    +{ad.quantidade}x {ad.nome} (R$ {parseFloat(ad.preco).toFixed(2).replace('.', ',')})
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.observacoes && (
                              <div className="text-xs text-gray-600 mt-1">Obs: {item.observacoes}</div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <span className="font-bold text-sm">R$ {(item.quantidade * item.preco_unitario).toFixed(2).replace('.', ',')}</span>
                            <div className="flex gap-1 mt-2">
                              <Button size="sm" variant="outline" className={buttonClass} onClick={() => handleEditObservation(idx)}>Editar</Button>
                              <Button size="sm" variant="destructive" className={buttonClass} onClick={() => handleRemoveItem(idx)}>Excluir</Button>
                            </div>
                          </div>
                        </div>
                        {/* Modal de edição do item (reutilizar modal de produto) */}
                        {editingItemIndex === idx && (
                          <Dialog open={true} onOpenChange={() => setEditingItemIndex(null)}>
                            <DialogContent className="max-w-md w-[95vw] sm:w-full">
                              <DialogHeader>
                                <DialogTitle>Editar {item.nome}</DialogTitle>
                                <DialogDescription>Edite a quantidade, observação ou adicionais deste item.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-2">
                                <Label>Quantidade</Label>
                                <div className="flex items-center gap-2">
                                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingQuantity(q => Math.max(1, q - 1))}>-</Button>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="w-12 text-center border rounded h-9"
                                    value={editingQuantity}
                                    onChange={e => {
                                      const val = e.target.value.replace(/\D/g, '');
                                      setEditingQuantity(val ? parseInt(val) : 1);
                                    }}
                                  />
                                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingQuantity(q => q + 1)}>+</Button>
                                </div>
                                <Label>Observação</Label>
                                <Textarea
                                  value={editingObservation}
                                  onChange={e => setEditingObservation(e.target.value)}
                                />
                                {item.adicionais && item.adicionais.length > 0 && (
                                  <div>
                                    <Label>Adicionais</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {item.adicionais.map((ad, i) => (
                                        <span key={i} className="inline-block bg-blue-50 px-2 py-1 rounded text-xs">
                                          +{ad.quantidade}x {ad.nome} (R$ {parseFloat(ad.preco).toFixed(2).replace('.', ',')})
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
                                <Button variant="outline" onClick={() => setEditingItemIndex(null)} className="w-full sm:w-auto">Cancelar</Button>
                                <Button onClick={handleSaveObservation} className="w-full sm:w-auto">Salvar</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    ))}
                    <div className="text-right font-bold mt-2">Total: R$ {total.toFixed(2).replace('.', ',')}</div>
                  </div>
                  {/* Desktop: Tabela */}
                  <div className="hidden sm:block w-full">
                    <div className="overflow-x-auto w-full">
                      <Table className={tableClass}>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Qtd</TableHead>
                            <TableHead>Adicionais</TableHead>
                            <TableHead>Obs.</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itens.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{item.nome}</TableCell>
                              <TableCell>{item.quantidade}</TableCell>
                              <TableCell>
                                {item.adicionais && item.adicionais.length > 0 ? (
                                  <div className="flex flex-col gap-1">
                                    {item.adicionais.map((ad, i) => (
                                      <span key={i} className="inline-block bg-blue-50 px-2 py-1 rounded text-xs">
                                        +{ad.quantidade}x {ad.nome} (R$ {parseFloat(ad.preco).toFixed(2).replace('.', ',')})
                                      </span>
                                    ))}
                                  </div>
                                ) : <span className="text-xs text-gray-400">-</span>}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600">{item.observacoes || <span className="italic text-gray-400">(vazio)</span>}</TableCell>
                              <TableCell className="text-right">R$ {(item.quantidade * item.preco_unitario).toFixed(2).replace('.', ',')}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" className={buttonClass} onClick={() => handleEditObservation(idx)}>Editar</Button>
                                  <Button size="sm" variant="destructive" className={buttonClass} onClick={() => handleRemoveItem(idx)}>Excluir</Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="text-right font-bold mt-2">Total: R$ {total.toFixed(2).replace('.', ',')}</div>
                  </div>
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-end">
                    <Button variant="outline" className={buttonClass} onClick={onClose}>Cancelar</Button>
                    <Button className={buttonClass} onClick={() => setStep(2)} disabled={itens.length === 0}>Continuar</Button>
                </DialogFooter>
            </div>
        );
    }

    // Etapa 2: Dados do cliente e pagamento (mantém o restante do seu código, mas com responsividade)
    return (
        <div className={containerClass}>
            <DialogHeader>
                <DialogTitle>Finalizar Pedido</DialogTitle>
                <DialogDescription>Preencha seus dados e selecione a forma de pagamento.</DialogDescription>
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
                {/* Mobile: Cards */}
                <div className="sm:hidden space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {itens.map((item, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">{item.nome}</div>
                          <div className="text-xs text-gray-500">Qtd: {item.quantidade}</div>
                          {item.adicionais && item.adicionais.length > 0 && (
                            <div className="text-xs text-blue-700 mt-1">
                              {item.adicionais.map((ad, i) => (
                                <span key={i} className="inline-block mr-2 bg-blue-50 px-2 py-1 rounded">
                                  +{ad.quantidade}x {ad.nome} (R$ {parseFloat(ad.preco).toFixed(2).replace('.', ',')})
                                </span>
                              ))}
                            </div>
                          )}
                          {item.observacoes && (
                            <div className="text-xs text-gray-600 mt-1">Obs: {item.observacoes}</div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <span className="font-bold text-sm">R$ {(item.quantidade * item.preco_unitario).toFixed(2).replace('.', ',')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop: Tabela */}
                <div className="hidden sm:block mb-4">
                  <Table className={tableClass}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>Adicionais</TableHead>
                        <TableHead>Obs.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itens.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.nome}</TableCell>
                          <TableCell>{item.quantidade}</TableCell>
                          <TableCell>
                            {item.adicionais && item.adicionais.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {item.adicionais.map((ad, i) => (
                                  <span key={i} className="inline-block bg-blue-50 px-2 py-1 rounded text-xs">
                                    +{ad.quantidade}x {ad.nome} (R$ {parseFloat(ad.preco).toFixed(2).replace('.', ',')})
                                  </span>
                                ))}
                              </div>
                            ) : <span className="text-xs text-gray-400">-</span>}
                          </TableCell>
                          <TableCell className="text-xs text-gray-600">{item.observacoes || <span className="italic text-gray-400">(vazio)</span>}</TableCell>
                          <TableCell className="text-right">R$ {(item.quantidade * item.preco_unitario).toFixed(2).replace('.', ',')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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

                    
                <DialogFooter className="mt-6 flex flex-col sm:flex-row justify-end gap-2">
                    <Button type="button" variant="outline" className={buttonClass} onClick={() => setStep(1)}>Voltar</Button>
                    <Button type="submit" className={buttonClass} disabled={loading}>Finalizar Pedido</Button>
                </DialogFooter>
            </form>
            {/* Modal de confirmação do pedido */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <DialogContent className="max-w-md w-[95vw] sm:w-full text-center">
                <DialogHeader>
                  <DialogTitle>Pedido realizado!</DialogTitle>
                  <DialogDescription>{empresa?.mensagem_confirmacao_pedido || 'Seu pedido foi recebido com sucesso.'}</DialogDescription>
                </DialogHeader>
                <div className="my-4">
                  {empresa?.permitir_acompanhar_status ? (
                    <p className="text-lg font-semibold">Você será redirecionado para acompanhar o status do seu pedido.</p>
                  ) : null}
                </div>
                <DialogFooter>
                  <Button onClick={() => {
                    setShowConfirmDialog(false);
                    if (typeof onClose === 'function') onClose();
                    if (pedidoIdFinalizado && empresa?.permitir_acompanhar_status) {
                      navigate(`/${slug}/acompanhar/${pedidoIdFinalizado}`);
                    } else {
                      navigate(`/${slug}`);
                    }
                  }}>OK</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
    );
};

export default FinalizarPedido;
