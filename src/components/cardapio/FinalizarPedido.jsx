// frontend/src/components/cardapio/FinalizarPedido.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext'; 
import api from '../../services/api';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription} from '../ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '../ui/drawer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'; 
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, Plus, X, Trash2 } from 'lucide-react';
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
    const [currentStep, setCurrentStep] = useState('dados'); // 'dados' -> 'pagamento'

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
                const formasOnline = response.data.filter(fp => fp.ativo && fp.descricao.toLowerCase() !== 'a prazo');
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
            <div className="grid grid-cols-1 gap-4 mt-4 w-full min-w-0">
                <h4 className="text-lg font-semibold border-b pb-2 w-full">Dados do Cliente</h4>
                <div className="w-full min-w-0">
                    <Label htmlFor="nomeCliente">Nome Completo</Label>
                    <Input id="nomeCliente" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} required autoComplete="off"
                        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                        className="w-full max-w-full"
                    />
                </div>
                <div className="w-full min-w-0">
                    <Label htmlFor="telefoneCliente">Telefone</Label>
                    <Input id="telefoneCliente" value={telefoneCliente} onChange={e => setTelefoneCliente(e.target.value)} required placeholder="(00) 00000-0000" maxLength={15} className="w-full max-w-full" />
                </div>
                <div className="w-full min-w-0">
                    <Label htmlFor="emailCliente">Email (opcional)</Label>
                    <Input id="emailCliente" type="email" value={emailCliente} onChange={(e) => setEmailCliente(e.target.value)} className="w-full max-w-full" />
                </div>
            </div>
        );
    };

    const renderDeliveryAddress = () => {
        if (pedidoType !== 'Delivery') return null;

        return (
            <div className="grid grid-cols-1 gap-4 mt-4 w-full min-w-0">
                <h4 className="text-lg font-semibold border-b pb-2 w-full">Endereço de Entrega</h4>
                <div className="w-full min-w-0">
                    <Label htmlFor="ruaCliente">Rua</Label>
                    <Input id="ruaCliente" placeholder="Rua" value={ruaCliente} onChange={e => setRuaCliente(e.target.value)} required className="w-full max-w-full" />
                </div>
                <div className="w-full min-w-0">
                    <Label htmlFor="numeroCliente">Número</Label>
                    <Input id="numeroCliente" placeholder="Número" value={numeroCliente} onChange={e => setNumeroCliente(e.target.value)} required className="w-full max-w-full" />
                </div>
                <div className="w-full min-w-0">
                    <Label htmlFor="bairroCliente">Bairro</Label>
                    <Input id="bairroCliente" placeholder="Bairro" value={bairroCliente} onChange={e => setBairroCliente(e.target.value)} required className="w-full max-w-full" />
                </div>
                <div className="w-full min-w-0">
                    <Label htmlFor="cepCliente">CEP</Label>
                    <Input id="cepCliente" placeholder="CEP" value={cepCliente} onChange={e => setCepCliente(e.target.value)} maxLength={9} className="w-full max-w-full" />
                </div>
                <div className="w-full min-w-0">
                    <Label htmlFor="cidadeCliente">Cidade</Label>
                    <Input id="cidadeCliente" placeholder="Cidade" value={cidadeCliente} onChange={e => setCidadeCliente(e.target.value)} className="w-full max-w-full" />
                </div>
                <div className="w-full min-w-0">
                    <Label htmlFor="estadoCliente">Estado (UF)</Label>
                    <Input id="estadoCliente" placeholder="Estado (UF)" value={estadoCliente} onChange={e => setEstadoCliente(e.target.value)} maxLength={2} className="w-full max-w-full" />
                </div>
            </div>
        );
    };

    const primaryColor = empresa?.cor_primaria_cardapio || '#FF5733';
    const selectedPaymentMethod = formasPagamento.find(fp => fp.id.toString() === selectedFormaPagamento);
    const discountPercentage = parseFloat(selectedPaymentMethod?.porcentagem_desconto_geral || 0) / 100;
    const totalWithDelivery = total + (pedidoType === 'Delivery' ? parseFloat(empresa?.taxa_entrega || 0) : 0);
    const finalTotal = totalWithDelivery * (1 - discountPercentage);

    // Detectar se é mobile
    const [isMobile, setIsMobile] = React.useState(false);
    
    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Responsividade: classes utilitárias (movido para depois da detecção de mobile)
    const containerClass = `p-2 sm:p-4 ${isMobile ? 'flex-1 overflow-y-auto min-w-0 min-h-0' : 'max-h-[85vh] overflow-y-auto'} w-full overflow-x-hidden max-w-full`;
    const tableClass = "min-w-full text-xs sm:text-sm";
    const buttonClass = "h-9 sm:h-10 text-xs sm:text-sm";

    // Função para limpar carrinho e fechar
    const handleLimparCarrinhoECancelar = () => {
        if (window.confirm('Tem certeza que deseja limpar o carrinho e cancelar o pedido?')) {
            limparCarrinho();
            onClose();
            toast.info('Carrinho limpo.');
        }
    };

    // Etapa 1: Dados do cliente (e endereço se delivery)
    if (currentStep === 'dados') {
        const content = (
            <div className={`${containerClass} flex flex-col min-h-0`}>
                {isMobile ? (
                    <DrawerHeader className="relative">
                        <button
                            onClick={onClose}
                            className="absolute top-0 right-0 p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100"
                            aria-label="Fechar"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <DrawerTitle>{pedidoType === 'Delivery' ? 'Dados de Entrega' : 'Dados do Cliente'}</DrawerTitle>
                        <DrawerDescription>Preencha seus dados {pedidoType === 'Delivery' ? 'e endereço de entrega' : ''} para continuar.</DrawerDescription>
                    </DrawerHeader>
                ) : (
                <DialogHeader className="relative">
                        <button
                            onClick={onClose}
                            className="absolute top-0 right-0 p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100"
                            aria-label="Fechar"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <DialogTitle>{pedidoType === 'Delivery' ? 'Dados de Entrega' : 'Dados do Cliente'}</DialogTitle>
                        <DialogDescription>Preencha seus dados {pedidoType === 'Delivery' ? 'e endereço de entrega' : ''} para continuar.</DialogDescription>
                </DialogHeader>
                )}
                <form onSubmit={(e) => {
                    e.preventDefault();
                    // Validação básica
                    if (!nomeCliente.trim()) {
                        toast.error('Nome é obrigatório');
                        return;
                    }
                    if (!telefoneCliente.trim()) {
                        toast.error('Telefone é obrigatório');
                        return;
                    }
                    if (pedidoType === 'Delivery') {
                        if (!ruaCliente.trim() || !numeroCliente.trim() || !bairroCliente.trim()) {
                            toast.error('Endereço completo é obrigatório para delivery');
                            return;
                        }
                    }
                    setCurrentStep('pagamento');
                }} className="flex flex-col flex-1 min-h-0 w-full">
                    <div className="flex-1 overflow-y-auto w-full min-w-0">
                        {renderCustomerDetails()}
                        {renderDeliveryAddress()}
                    </div>
                    {isMobile ? (
                        <DrawerFooter className="mt-6 flex flex-col gap-2 pb-safe" style={{ paddingBottom: `calc(1rem + env(safe-area-inset-bottom))` }}>
                            <Button type="button" variant="outline" className={buttonClass} onClick={onClose}>Cancelar</Button>
                            <Button type="submit" className={buttonClass}>Continuar</Button>
                        </DrawerFooter>
                    ) : (
                        <DialogFooter className="mt-6 flex flex-col sm:flex-row justify-end gap-2">
                            <Button type="button" variant="outline" className={buttonClass} onClick={onClose}>Cancelar</Button>
                            <Button type="submit" className={buttonClass}>Continuar</Button>
                              </DialogFooter>
                    )}
                </form>
            </div>
        );
        
        if (isMobile) {
            return (
                <Drawer open={true} onOpenChange={(open) => !open && onClose()} direction="bottom">
                    <DrawerContent className="!h-screen !max-h-screen !mt-0 flex flex-col overflow-hidden rounded-t-3xl min-w-0" style={{ paddingBottom: `max(1rem, env(safe-area-inset-bottom))`, height: '100vh', maxHeight: '100vh', marginTop: '0' }}>
                        {content}
                    </DrawerContent>
                </Drawer>
            );
        }
        
        // Desktop: retorna com Dialog
        return (
            <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="w-[95vw] sm:w-full max-w-4xl max-h-[95vh] rounded-3xl shadow-2xl border-0 bg-white/90 backdrop-blur-lg p-0 animate-fade-in-up overflow-hidden">
                    {content}
                </DialogContent>
            </Dialog>
        );
    }

    // Etapa 2: Forma de pagamento e resumo do pedido
    const content = (
        <div className={containerClass}>
            {isMobile ? (
                <DrawerHeader className="relative">
                    <button
                        onClick={onClose}
                        className="absolute top-0 right-0 p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100"
                        aria-label="Fechar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <DrawerTitle>Forma de Pagamento</DrawerTitle>
                    <DrawerDescription>Selecione a forma de pagamento e revise seu pedido.</DrawerDescription>
                </DrawerHeader>
            ) : (
            <DialogHeader className="relative">
                    <button
                        onClick={onClose}
                        className="absolute top-0 right-0 p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100"
                        aria-label="Fechar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <DialogTitle>Forma de Pagamento</DialogTitle>
                    <DialogDescription>Selecione a forma de pagamento e revise seu pedido.</DialogDescription>
            </DialogHeader>
            )}
            <form onSubmit={handleFinalizarPedido}>
                <h3 className="text-xl font-semibold mb-3 mt-4 sm:mt-6 border-b pb-2">Forma de Pagamento</h3>
                <Select value={selectedFormaPagamento} onValueChange={setSelectedFormaPagamento} required>
                    <SelectTrigger id="formaPagamento" className="h-12 sm:h-14 text-base sm:text-lg font-semibold">
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
                {/* Resumo com valores */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-semibold">R$ {total.toFixed(2).replace('.', ',')}</span>
                  </div>
                  {pedidoType === 'Delivery' && empresa?.taxa_entrega && parseFloat(empresa.taxa_entrega) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Taxa de Entrega:</span>
                      <span className="font-semibold">R$ {parseFloat(empresa.taxa_entrega).toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  {selectedPaymentMethod && discountPercentage > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Desconto ({parseFloat(selectedPaymentMethod.porcentagem_desconto_geral).toFixed(0)}%):</span>
                      <span className="font-semibold">- R$ {(totalWithDelivery * discountPercentage).toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                    <span>Total:</span>
                    <span className="text-green-600">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
                  </div>
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
                {/* Resumo com valores */}
                <div className="hidden sm:block mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-semibold">R$ {total.toFixed(2).replace('.', ',')}</span>
                  </div>
                  {pedidoType === 'Delivery' && empresa?.taxa_entrega && parseFloat(empresa.taxa_entrega) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Taxa de Entrega:</span>
                      <span className="font-semibold">R$ {parseFloat(empresa.taxa_entrega).toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  {selectedPaymentMethod && discountPercentage > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Desconto ({parseFloat(selectedPaymentMethod.porcentagem_desconto_geral).toFixed(0)}%):</span>
                      <span className="font-semibold">- R$ {(totalWithDelivery * discountPercentage).toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                    <span>Total:</span>
                    <span className="text-green-600">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
                  </div>
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

                <div className="mt-4">
                    <Label htmlFor="obsPedido">Observações do Pedido (opcional)</Label>
                    <Textarea id="obsPedido" value={obsPedido} onChange={(e) => setObsPedido(e.target.value)} placeholder="Ex: Tocando a campainha, deixar na porta..." />
                </div>

                {submitError && <p className="text-red-500 text-sm mt-3">{submitError}</p>}

                {isMobile ? (
                    <DrawerFooter className="mt-6 flex flex-col gap-2" style={{ paddingBottom: `calc(1rem + env(safe-area-inset-bottom))` }}>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 text-sm" 
                            onClick={handleLimparCarrinhoECancelar}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Limpar Carrinho
                        </Button>
                        <Button type="button" variant="outline" className={buttonClass} onClick={() => setCurrentStep('dados')}>Voltar</Button>
                        <Button type="submit" className={buttonClass} disabled={loading}>Finalizar Pedido</Button>
                    </DrawerFooter>
                ) : (
                <DialogFooter className="mt-6 flex flex-col sm:flex-row justify-end gap-2">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 text-sm sm:mr-auto" 
                            onClick={handleLimparCarrinhoECancelar}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Limpar Carrinho
                        </Button>
                        <Button type="button" variant="outline" className={buttonClass} onClick={() => setCurrentStep('dados')}>Voltar</Button>
                    <Button type="submit" className={buttonClass} disabled={loading}>Finalizar Pedido</Button>
                </DialogFooter>
                )}
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
    
    if (isMobile) {
        return (
            <Drawer open={true} onOpenChange={(open) => !open && onClose()} direction="bottom">
                <DrawerContent className="!h-screen !max-h-screen !mt-0 flex flex-col overflow-hidden rounded-t-3xl min-w-0" style={{ paddingBottom: `max(1rem, env(safe-area-inset-bottom))`, height: '100vh', maxHeight: '100vh', marginTop: '0' }}>
                    {content}
                </DrawerContent>
            </Drawer>
        );
    }
    
    // Desktop: retorna com Dialog
    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] sm:w-full max-w-4xl max-h-[95vh] rounded-3xl shadow-2xl border-0 bg-white/90 backdrop-blur-lg p-0 animate-fade-in-up overflow-hidden">
                {content}
            </DialogContent>
        </Dialog>
    );
};

export default FinalizarPedido;
