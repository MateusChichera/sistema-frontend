// frontend/src/components/cardapio/PublicCardapioPage.jsx
// ESTE ARQUIVO É O CARDÁPIO EXCLUSIVO PARA PEDIDOS ONLINE (CLIENTES)
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useCarrinho } from '../../contexts/CarrinhoContext';
import api from '../../services/api';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ShoppingCart, Home, Bike, CheckCircle, Utensils, Plus, Minus } from 'lucide-react';
import FinalizarPedido from './FinalizarPedido';
import LoginRegisterModal from './LoginRegisterModal';
import PedidoTypeSelectionModal from './PedidoTypeSelectionModal';
import { useAuth } from '../../contexts/AuthContext';
//corrigido merge

const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const isRestaurantOpen = (horarioFuncionamento) => {
  if (!horarioFuncionamento) return { open: false, message: 'Horário de funcionamento não configurado.' };
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
  const [dayPartsStr, timePartsStr] = horarioFuncionamento.split(':', 2).map(s => s.trim());
  const [openTimeStr, closeTimeStr] = timePartsStr.split('-', 2).map(s => s.trim());

  const parseTime = (timeStr) => {
    const [h, m] = timeStr.replace('h', ':').split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}h${String(mins).padStart(2, '0')}`;
  };

  const daysMap = {
    'Seg': 1, 'Ter': 2, 'Qua': 3, 'Qui': 4, 'Sex': 5, 'Sab': 6, 'Dom': 0,
    'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sab': 6, 'dom': 0
  };

  let isTodayIncluded = false;
  
  if (dayPartsStr.includes('-')) {
    const [startDayName, endDayName] = dayPartsStr.split('-').map(s => s.trim());
    const startDayIndex = daysMap[startDayName];
    const endDayIndex = daysMap[endDayName];
    
    if (startDayIndex !== undefined && endDayIndex !== undefined) {
      if (startDayIndex <= endDayIndex) {
        for (let i = startDayIndex; i <= endDayIndex; i++) {
          if (i === dayOfWeek) isTodayIncluded = true;
        }
      } else {
        for (let i = startDayIndex; i <= 6; i++) {
          if (i === dayOfWeek) isTodayIncluded = true;
        }
        for (let i = 0; i <= endDayIndex; i++) {
          if (i === dayOfWeek) isTodayIncluded = true;
        }
      }
    }
  } else if (dayPartsStr.includes(',')) {
    const daysArr = dayPartsStr.split(',').map(s => s.trim());
    isTodayIncluded = daysArr.some(d => {
        const dayIdx = daysMap[d];
        return dayIdx === dayOfWeek;
    });
  } else {
    const singleDayIndex = daysMap[dayPartsStr];
    if (singleDayIndex !== undefined) {
      if (singleDayIndex === dayOfWeek) isTodayIncluded = true;
    }
  }

  if (!isTodayIncluded) {
    return { open: false, message: `Fechado(a) hoje. Horário de funcionamento: ${dayPartsStr} ${timePartsStr}.` };
  }

  const openTimeMinutes = parseTime(openTimeStr);
  const closeTimeMinutes = parseTime(closeTimeStr);
  let currentlyOpen = false;

  if (closeTimeMinutes < openTimeMinutes) {
    currentlyOpen = currentTimeMinutes >= openTimeMinutes || currentTimeMinutes <= closeTimeMinutes;
  } else {
    currentlyOpen = currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes;
  }

  if (currentlyOpen) {
    return { open: true, message: `Aberto(a) agora! Fecha às ${formatTime(closeTimeMinutes)}.` };
  } else {
    return { open: false, message: `Fechado(a) no momento. Abre às ${formatTime(openTimeMinutes)}.` };
  }
};

const PublicCardapioPage = ({ user: userProp }) => {
  const { empresa, loading: empresaLoading, isReady } = useEmpresa();
  const { adicionarItem, total, itens, removerItem, limparCarrinho, atualizarQuantidadeItem } = useCarrinho();
  const { user, logout } = useAuth();

  const [loadingContent, setLoadingContent] = useState(true);
  const [error, setError] = useState(null); 
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [filteredProdutos, setFilteredProdutos] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null); 
  const [productQuantity, setProductQuantity] = useState(1); 
  const [productObservation, setProductObservation] = useState(''); 
  const [productAdicionais, setProductAdicionais] = useState([]);
  const [selectedAdicionais, setSelectedAdicionais] = useState([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedPedidoType, setSelectedPedidoType] = useState(null);
  const [isFinalizarPedidoModalOpen, setIsFinalizarPedidoModalOpen] = useState(false);
  const [isPedidoTypeSelectionModalOpen, setIsPedidoTypeSelectionModalOpen] = useState(false);

  const [isLoginRegisterModalOpen, setIsLoginRegisterModalOpen] = useState(false);

  const [isMinimoDeliveryModalOpen, setIsMinimoDeliveryModalOpen] = useState(false);
  const [valorFaltanteDelivery, setValorFaltanteDelivery] = useState(0);

  const canMakeOnlineOrder = empresa?.permitir_pedido_online === 1;
  const restaurantStatus = isRestaurantOpen(empresa?.horario_funcionamento);
  const isCurrentlyOpenForOrders = canMakeOnlineOrder && restaurantStatus.open;

  useEffect(() => {
    const fetchCardapioData = async () => {
      if (!isReady) {
        setLoadingContent(true);
        return;
      }
      
      if (!empresa || empresa.status !== 'Ativa') {
        setError(`O cardápio de "${empresa?.nome_fantasia || 'sua empresa'}" não está ativo no momento.`);
        setLoadingContent(false);
        return;
      }
      
      const currentRestaurantStatus = isRestaurantOpen(empresa.horario_funcionamento);
      const isAfterCutoff = empresa.tempo_corte_pedido_online ? (
          new Date().getHours() * 60 + new Date().getMinutes() >
          parseInt(empresa.tempo_corte_pedido_online.split(':')[0]) * 60 +
          parseInt(empresa.tempo_corte_pedido_online.split(':')[1])
      ) : false;

      let displayErrorMessage = null;
      if (!currentRestaurantStatus.open) {
        displayErrorMessage = currentRestaurantStatus.message;
      } else if (empresa.tempo_corte_pedido_online && isAfterCutoff) {
        displayErrorMessage = `Pedidos online fora do horário de corte. Último pedido até ${empresa.tempo_corte_pedido_online}.`;
      } else if (empresa.permitir_pedido_online === 0) {
        displayErrorMessage = `Os pedidos online para "${empresa.nome_fantasia}" estão temporariamente desativados.`;
      }
      
      if (displayErrorMessage) {
          setError(displayErrorMessage + " Apenas a visualização do cardápio está disponível.");
      } else {
          setError(null); 
      }

      setLoadingContent(true);
      try {
        const categoriasResponse = await api.get(`/${empresa.slug}/cardapio/categorias`);
        const fetchedCategorias = categoriasResponse.data;
        const produtosResponse = await api.get(`/${empresa.slug}/cardapio/produtos`);
        
        const fetchedProdutos = produtosResponse.data.filter(p => p.ativo);
        
        const produtosComAdicionais = await Promise.all(
          fetchedProdutos.map(async (produto) => {
            try {
              const adicionaisResponse = await api.get(`/${empresa.slug}/cardapio/produtos/${produto.id}/adicionais`);
              return {
                ...produto,
                adicionais: adicionaisResponse.data || []
              };
            } catch (err) {
              console.error(`Erro ao carregar adicionais do produto ${produto.id}:`, err);
              return {
                ...produto,
                adicionais: []
              };
            }
          })
        ); 

        let finalCategorias = [...fetchedCategorias];
        let finalProdutos = [...produtosComAdicionais];
        
        const promoProducts = finalProdutos.filter(p => p.promo_ativa); 
        if (promoProducts.length > 0 && empresa.mostrar_promocoes_na_home) {
          const promoCategory = { id: 'promo', descricao: '🔥 Promoções', ativo: true };
          finalCategorias = [promoCategory, ...fetchedCategorias];
        }

        setCategorias(finalCategorias);
        setProdutos(finalProdutos);
        
        if (empresa.mostrar_promocoes_na_home) {
          setFilteredProdutos(finalProdutos.filter(p => p.promo_ativa));
          setSelectedCategoryId('promo');
        } else {
          setFilteredProdutos(finalProdutos);
          setSelectedCategoryId('all');
        }
        toast.success("Cardápio carregado!");
      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao carregar o cardápio.');
        console.error("Erro ao carregar cardápio:", err);
        toast.error(err.response?.data?.message || 'Erro ao carregar cardápio.');
      } finally {
        setLoadingContent(false);
      }
    };
    fetchCardapioData();
  }, [empresa, isReady]); 

  const acessoRegistradoRef = useRef(false);
  useEffect(() => {
    if (!isReady) return;
    
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('session_id', sessionId);
    }
    
    const acessoFlagKey = `access_registered_${sessionId}`;
    if (localStorage.getItem(acessoFlagKey)) {
      return; 
    }
    
    if (acessoRegistradoRef.current) return;
    acessoRegistradoRef.current = true;

    const registrarAcesso = async () => {
      try {
        const dispositivo = window.innerWidth <= 768 ? 'mobile' : 'desktop';
        let ip_address = 'unknown';
        try {
          const response = await fetch('https://api.ipify.org?format=json');
          const data = await response.json();
          if (data?.ip) ip_address = data.ip;
        } catch (err) {
          console.error('Falha ao obter IP:', err);
        }
        const endpoint = empresa?.slug ? `/${empresa.slug}/acesso` : '/acesso';
        await api.post(endpoint, {
          session_id: sessionId,
          dispositivo,
          ip_address,
        });
        localStorage.setItem(acessoFlagKey, 'true');
      } catch (err) {
        console.error('Erro ao registrar acesso:', err);
      }
    };
    registrarAcesso();
  }, [isReady, empresa]);

  useEffect(() => {
    let currentFiltered = produtos.filter(prod => prod.ativo); 
    if (selectedCategoryId === 'promo') {
      currentFiltered = currentFiltered.filter(prod => prod.promo_ativa);
    } else if (selectedCategoryId !== 'all') {
      currentFiltered = currentFiltered.filter(prod => prod.id_categoria.toString() === selectedCategoryId);
    }
    if (searchTerm) {
      const cleanedSearchTerm = removeAccents(searchTerm).toLowerCase();
      currentFiltered = currentFiltered.filter(prod =>
        removeAccents(prod.nome).toLowerCase().includes(cleanedSearchTerm) ||
        removeAccents(prod.descricao).toLowerCase().includes(cleanedSearchTerm)
      );
    }
    setFilteredProdutos(currentFiltered);
  }, [produtos, selectedCategoryId, searchTerm]);

  const openProductModal = async (product) => {
    setSelectedProduct(product);
    const itemInCartForModal = itens.find(item => item.id_produto === product.id);
    
    setProductQuantity(itemInCartForModal ? itemInCartForModal.quantidade : 1);
    setProductObservation(itemInCartForModal ? itemInCartForModal.observacoes : ''); 
    setProductAdicionais([]);
    setSelectedAdicionais(itemInCartForModal ? itemInCartForModal.adicionais || [] : []);
    
    try {
      const response = await api.get(`/${empresa.slug}/cardapio/produtos/${product.id}/adicionais`);
      setProductAdicionais(response.data || []);
    } catch (err) {
      console.error("Erro ao carregar adicionais do produto:", err);
      setProductAdicionais([]);
    }
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    setProductQuantity(1);
    setProductObservation('');
    setProductAdicionais([]);
    setSelectedAdicionais([]);
  };

  const handleAddToCart = () => {
    if (selectedProduct) {
      const existingItemIndex = itens.findIndex(item => {
          const mesmaObservacao = item.id_produto === selectedProduct.id && item.observacoes === (productObservation || '');
          const mesmosAdicionais = JSON.stringify(item.adicionais || []) === JSON.stringify(selectedAdicionais);
          return mesmaObservacao && mesmosAdicionais;
      });
      
      if (existingItemIndex > -1) {
          atualizarQuantidadeItem(selectedProduct.id, productQuantity, productObservation || '', selectedAdicionais);
          toast.success(`Quantidade de ${selectedProduct.nome} atualizada.`);
      } else {
          adicionarItem({
              id: selectedProduct.id,
              nome: selectedProduct.nome,
              preco: selectedProduct.preco,
              promocao: selectedProduct.promocao,
              promo_ativa: selectedProduct.promo_ativa,
              foto_url: selectedProduct.foto_url,
              observacoes: productObservation, 
              adicionais: selectedAdicionais 
          }, productQuantity); 
          toast.success(`${productQuantity}x ${selectedProduct.nome} adicionado(s) ao carrinho!`);
      }
      
      closeProductModal();
    }
  };

  const handleQuickAddToCart = useCallback((e, product) => {
    e.stopPropagation(); 
    if (!isCurrentlyOpenForOrders) { 
      toast.info("A empresa não está aceitando pedidos online no momento.");
      return;
    }
    adicionarItem({ ...product, observacoes: '' }, 1);
    toast.success(`1x ${product.nome} adicionado ao carrinho!`);
  }, [adicionarItem, isCurrentlyOpenForOrders]);

  const handleQuickRemoveFromCart = useCallback((e, product) => {
    e.stopPropagation(); 
    if (!isCurrentlyOpenForOrders) { 
      toast.info("A empresa não está aceitando pedidos online no momento.");
      return;
    }
    const itemInCart = itens.find(item => item.id_produto === product.id && (item.observacoes === undefined || item.observacoes === ''));
    if (itemInCart) {
      atualizarQuantidadeItem(itemInCart.id_produto, itemInCart.quantidade - 1, itemInCart.observacoes);
    } else {
      toast.info(`${product.nome} não está no seu carrinho sem observações.`);
    }
  }, [itens, atualizarQuantidadeItem, isCurrentlyOpenForOrders]); 

  const getProductCountInCart = useCallback((productId) => {
    return itens.filter(item => item.id_produto === productId && (item.observacoes === undefined || item.observacoes === '')).reduce((sum, item) => sum + item.quantidade, 0);
  }, [itens]); 

  const handleOpenFinalizarPedidoModal = () => {
    if (itens.length === 0) {
      toast.error('O carrinho está vazio para finalizar o pedido!');
      return;
    }
    if (!isCurrentlyOpenForOrders) { 
      toast.error("A empresa não está aceitando pedidos online no momento.");
      return;
    }
    setIsPedidoTypeSelectionModalOpen(true);
  };

  const handlePedidoTypeSelected = (type) => {
    setSelectedPedidoType(type);
    setIsPedidoTypeSelectionModalOpen(false);
    if (
      type === 'Delivery' &&
      (parseFloat(empresa?.pedido_minimo_delivery) || 0) > 0 &&
      total < parseFloat(empresa.pedido_minimo_delivery)
    ) {
      setValorFaltanteDelivery(parseFloat(empresa.pedido_minimo_delivery) - total);
      setIsMinimoDeliveryModalOpen(true);
      return; 
    }
    setIsFinalizarPedidoModalOpen(true); 
  };

  const handleCloseFinalizarPedidoModal = () => {
    setIsFinalizarPedidoModalOpen(false);
  };

  const handleAddMoreItems = () => {
    setIsFinalizarPedidoModalOpen(false);
    toast.info('Adicione mais itens ao seu pedido!');
  };

  if (empresaLoading || loadingContent || !isReady) {
    return (
      <div className="flex justify-center items-center h-screen">
        Carregando cardápio de {empresa?.nome_fantasia || 'sua empresa'}...
      </div>
    );
  }
  
  if (error && !isCurrentlyOpenForOrders) { 
    return (
      <div className="flex flex-col justify-center items-center h-screen text-red-500 text-center p-4">
        <p className="font-semibold text-lg mb-2">Ops! Algo deu errado ou a loja está fechada.</p>
        <p>{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Recarregar Página</Button>
      </div>
    );
  }
  
  if (loadingContent) {
    return (
      <div className="flex justify-center items-center h-screen">
        Carregando cardápio de {empresa?.nome_fantasia || 'sua empresa'}...
      </div>
    );
  }

  const hasItemsInCart = itens.length > 0;
  const primaryColor = empresa?.cor_primaria_cardapio || '#FF5733';
  const corPrimaria = empresa?.cor_primaria_cardapio || '#d32f2f';

  return (
    <>
      <div className="container mx-auto p-4 relative">
        <div className="flex justify-end mb-4 items-center gap-2">
          {user && user.role === 'cliente' ? (
            <>
              <span className="font-semibold text-base mr-2">Olá, {user.nome.split(' ')[0]}</span>
              <Button variant="outline" onClick={() => toast.info('Em breve!')}>Meus pedidos</Button>
              <Button variant="ghost" onClick={logout}>Sair</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsLoginRegisterModalOpen(true)}>
              Entrar ou Cadastrar
            </Button>
          )}
        </div>
        <p className={`text-center font-semibold text-lg mb-4 ${restaurantStatus.open ? 'text-green-600' : 'text-red-600'}`}>
          {restaurantStatus.message}
        </p>
        
        {!isCurrentlyOpenForOrders && ( 
            <div className="text-center text-orange-600 mb-6 p-4 border border-orange-300 bg-orange-50 rounded-md flex flex-col items-center justify-center">
              <div className="flex items-center justify-center mb-2">
                <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='orange' strokeWidth='2' className='w-8 h-8 mr-2'><path strokeLinecap='round' strokeLinejoin='round' d='M12 9v2m0 4h.01M21 20H3a1 1 0 01-.87-1.5l9-16a1 1 0 011.74 0l9 16A1 1 0 0121 20z' /></svg>
                <p className="font-bold text-xl text-orange-700">⚠️ Pedidos Online Temporariamente Indisponíveis!</p>
              </div>
              <p className="font-semibold text-lg">{restaurantStatus.message}</p>
              {empresa.permitir_pedido_online === 0 && <p className="text-lg">Os pedidos online estão desativados pela empresa.</p>}
              {empresa.tempo_corte_pedido_online && (
                <p className="text-lg">Horário limite para pedidos: {empresa.tempo_corte_pedido_online}</p>
              )}
            </div>
        )}

        {canMakeOnlineOrder && ( 
          <div className="mb-6 flex justify-center space-x-4">
            <Button
              variant={selectedPedidoType === 'Delivery' ? 'default' : 'outline'}
              onClick={() => setSelectedPedidoType('Delivery')}
              disabled={empresa.desativar_entrega || !isCurrentlyOpenForOrders} 
              className={empresa.desativar_entrega || !isCurrentlyOpenForOrders ? 'opacity-50 cursor-not-allowed' : ''}
            >
              <Bike className="mr-2" /> Delivery
            </Button>
            <Button
              variant={selectedPedidoType === 'Retirada' ? 'default' : 'outline'}
              onClick={() => setSelectedPedidoType('Retirada')}
              disabled={empresa.desativar_retirada || !isCurrentlyOpenForOrders} 
              className={empresa.desativar_retirada || !isCurrentlyOpenForOrders ? 'opacity-50 cursor-not-allowed' : ''}
            >
              <Home className="mr-2" /> Retirada
            </Button>
            <Button
              variant={selectedPedidoType === 'Mesa' ? 'default' : 'outline'}
              onClick={() => setSelectedPedidoType('Mesa')}
              disabled={true} 
              className={'opacity-50 cursor-not-allowed'}
            >
              <Utensils className="mr-2" /> Mesa
            </Button>
          </div>
        )}

        {(!selectedPedidoType || selectedPedidoType === 'Delivery') && (parseFloat(empresa?.pedido_minimo_delivery) || 0) > 0 && (
          <p className="text-center text-gray-700 mb-4">
            Valor mínimo para delivery: <span className="font-semibold">R$ {parseFloat(empresa.pedido_minimo_delivery).toFixed(2).replace('.', ',')}</span>
          </p>
        )}

        <div className="mb-6 p-4 border rounded-lg bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <Label htmlFor="categoryFilter">Categoria</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger id="categoryFilter"><SelectValue placeholder="Todas as Categorias" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categorias.some(c => c.id === 'promo') && (
                  <SelectItem value="promo">🔥 Promoções</SelectItem>
                )}
                {categorias.filter(c => c.id !== 'promo').map(cat => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>{cat.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="productSearch">Buscar Produto</Label>
            <Input
              id="productSearch"
              placeholder="Nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-8">
          {categorias.map(categoria => {
            const produtosParaExibir = categoria.id === 'promo' 
              ? filteredProdutos.filter(p => p.promo_ativa && p.ativo) 
              : filteredProdutos.filter(prod => prod.id_categoria === categoria.id && prod.ativo);
            if (produtosParaExibir.length === 0) return null;
            return (
              <div key={categoria.id} className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-4 text-gray-700 border-b pb-2">{categoria.descricao}</h2>
                <div className={`grid gap-4 ${empresa?.layout_cardapio === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                  {produtosParaExibir.map(prod => (
                    <div
                      key={prod.id}
                      className="border p-4 rounded-lg flex items-center space-x-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => (isCurrentlyOpenForOrders) ? openProductModal(prod) : toast.info("A empresa não está aceitando pedidos online no momento.")}
                      style={{ opacity: (isCurrentlyOpenForOrders) ? 1 : 0.6 }} 
                    >
                      {prod.foto_url && (
                        <img
                          src={`${api.defaults.baseURL.replace('/api/v1', '')}${prod.foto_url}`}
                          alt={prod.nome}
                          className="w-24 h-24 object-cover rounded-md"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800">{prod.nome}</h3>
                        <p className="text-gray-600 text-sm">{prod.descricao}</p>
                        {prod.promo_ativa && prod.promocao ? (
                          <p className="font-bold text-lg mt-1" style={{ color: primaryColor }}>
                            <span className="line-through text-gray-500 mr-2">R$ {parseFloat(prod.preco).toFixed(2).replace('.', ',')}</span>
                            <span style={{ color: '#22C55E' }}>R$ {parseFloat(prod.promocao).toFixed(2).replace('.', ',')}</span>
                          </p>
                        ) : (
                          <p className="text-gray-800 font-bold text-lg mt-1">R$ {parseFloat(prod.preco).toFixed(2).replace('.', ',')}</p>
                        )}
                      </div>
                      {canMakeOnlineOrder && ( 
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {/* Botões +/- e contagem */}
                          {/* Nenhuma exibição de quantidade nos cards */}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

{hasItemsInCart && isCurrentlyOpenForOrders && (
  <div
    className="fixed bottom-4 right-4 md:right-8 lg:right-12 xl:right-16 w-auto p-4 rounded-full shadow-lg flex items-center space-x-3 z-50 transition-all duration-300 ease-in-out bg-primary"
    style={{ color: '#fff', opacity: 1 }}
  >
    <ShoppingCart className="h-6 w-6 flex-shrink-0 text-white" />
    <span className="text-lg font-bold whitespace-nowrap">Total: R$ {total.toFixed(2).replace('.', ',')}</span>

    <Button
      onClick={handleOpenFinalizarPedidoModal}
      className="ml-auto bg-white text-primary border border-white font-semibold rounded-full px-5 py-2 text-sm transition-colors duration-200 hover:bg-gray-100"
    >
      <CheckCircle className="mr-2 h-4 w-4" /> Finalizar Pedido
    </Button>
  </div>
)}
        <Dialog open={!!selectedProduct} onOpenChange={closeProductModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedProduct?.nome}</DialogTitle>
              <DialogDescription>
                {selectedProduct?.descricao}
                {selectedProduct?.promo_ativa && selectedProduct?.promocao ? (
                  <span className="font-bold text-lg mt-1" style={{ color: primaryColor }}>
                    <span className="line-through text-gray-500 mr-2">R$ {parseFloat(selectedProduct.preco).toFixed(2).replace('.', ',')}</span>
                    <span style={{ color: '#22C55E' }}>R$ {parseFloat(selectedProduct.promocao).toFixed(2).replace('.', ',')}</span>
                  </span>
                ) : (
                  <span className="text-gray-800 font-bold text-lg mt-1">R$ {parseFloat(selectedProduct?.preco || 0).toFixed(2).replace('.', ',')}</span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center space-x-2">
                <Button onClick={() => setProductQuantity(prev => Math.max(1, prev - 1))} disabled={!isCurrentlyOpenForOrders}>-</Button>
                <Input type="number" value={productQuantity} onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)} className="w-16 text-center" min={1} disabled={!isCurrentlyOpenForOrders} />
                <Button onClick={() => setProductQuantity(prev => prev + 1)} disabled={!isCurrentlyOpenForOrders}>+</Button>
              </div>
              {productAdicionais.length > 0 && (
                <div>
                  <Label className="text-base font-medium">Adicionais Disponíveis</Label>
                  <div className="space-y-2 mt-2">
                    {productAdicionais.map((adicional) => (
                      <div key={adicional.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id={`adicional-${adicional.id}`}
                            checked={selectedAdicionais.some(sel => sel.id === adicional.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAdicionais(prev => [...prev, { ...adicional, quantidade: 1 }]);
                              } else {
                                setSelectedAdicionais(prev => prev.filter(sel => sel.id !== adicional.id));
                              }
                            }}
                            disabled={!isCurrentlyOpenForOrders}
                            className="h-4 w-4 text-blue-600"
                          />
                          <div>
                            <Label htmlFor={`adicional-${adicional.id}`} className="font-medium cursor-pointer">
                              {adicional.nome}
                            </Label>
                            {adicional.descricao && (
                              <p className="text-sm text-gray-600">{adicional.descricao}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-green-600">
                            R$ {parseFloat(adicional.preco).toFixed(2).replace('.', ',')}
                          </span>
                          {selectedAdicionais.some(sel => sel.id === adicional.id) && (
                            <div className="flex items-center space-x-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAdicionais(prev => prev.map(sel => 
                                    sel.id === adicional.id 
                                      ? { ...sel, quantidade: Math.max(1, sel.quantidade - 1) }
                                      : sel
                                  ));
                                }}
                                disabled={!isCurrentlyOpenForOrders}
                                className="h-6 w-6 p-0"
                              >
                                -
                              </Button>
                              <span className="text-sm font-medium w-4 text-center">
                                {selectedAdicionais.find(sel => sel.id === adicional.id)?.quantidade || 1}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAdicionais(prev => prev.map(sel => 
                                    sel.id === adicional.id 
                                      ? { ...sel, quantidade: sel.quantidade + 1 }
                                      : sel
                                  ));
                                }}
                                disabled={!isCurrentlyOpenForOrders}
                                className="h-6 w-6 p-0"
                              >
                                +
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="observacao">Observações (opcional)</Label>
                <Textarea id="observacao" value={productObservation} onChange={(e) => setProductObservation(e.target.value)} placeholder="Ex: Sem cebola, bem passado..." disabled={!isCurrentlyOpenForOrders} />
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Valor total:</p>
                <p className="text-lg font-bold text-green-600">
                  R$ {(() => {
                    const precoBase = selectedProduct?.promo_ativa && selectedProduct?.promocao 
                      ? parseFloat(selectedProduct.promocao) 
                      : parseFloat(selectedProduct?.preco || 0);
                    const precoAdicionais = selectedAdicionais.reduce((total, adicional) => {
                      return total + (parseFloat(adicional.preco) * adicional.quantidade);
                    }, 0);
                    return ((precoBase + precoAdicionais) * productQuantity).toFixed(2).replace('.', ',');
                  })()}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddToCart} disabled={!isCurrentlyOpenForOrders}>Adicionar ao Carrinho</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isFinalizarPedidoModalOpen} onOpenChange={setIsFinalizarPedidoModalOpen}>
          <DialogContent>
            <FinalizarPedido
              pedidoType={selectedPedidoType}
              onClose={handleCloseFinalizarPedidoModal}
              empresa={empresa}
              limparCarrinho={limparCarrinho}
              total={total}
              itens={itens}
              onAddMoreItems={handleAddMoreItems}
              setIsMinimoDeliveryModalOpen={setIsMinimoDeliveryModalOpen}
              setValorFaltanteDelivery={setValorFaltanteDelivery}
            />
          </DialogContent>
        </Dialog>
        <Dialog open={isLoginRegisterModalOpen} onOpenChange={setIsLoginRegisterModalOpen}>
          <DialogContent>
            <LoginRegisterModal onClose={() => setIsLoginRegisterModalOpen(false)} />
          </DialogContent>
        </Dialog>
        <Dialog open={isPedidoTypeSelectionModalOpen} onOpenChange={setIsPedidoTypeSelectionModalOpen}>
          <DialogContent>
            <PedidoTypeSelectionModal
              onSelectType={handlePedidoTypeSelected}
              onClose={() => setIsPedidoTypeSelectionModalOpen(false)}
              empresa={empresa}
            />
          </DialogContent>
        </Dialog>
        <Dialog open={isMinimoDeliveryModalOpen} onOpenChange={setIsMinimoDeliveryModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogDescription>
                <div style={{
                  background: '#e0edff',
                  border: '1px solid #93c5fd',
                  borderRadius: 8,
                  padding: 16,
                  margin: '16px 0',
                  textAlign: 'center'
                }}>
                  <span style={{ fontWeight: 'bold', fontSize: 18 }}>O valor mínimo para delivery</span> é de <b style={{ color: '#2563eb', fontSize: 18 }}>
                    R$ {parseFloat(empresa.pedido_minimo_delivery).toFixed(2).replace('.', ',')}
                  </b>.<br />
                  <span style={{ fontWeight: 'bold', color: '#dc2626', fontSize: 15 }}>
                    Faltam R$ {valorFaltanteDelivery.toFixed(2).replace('.', ',')}
                  </span> para você conseguir finalizar seu pedido.
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() => setIsMinimoDeliveryModalOpen(false)}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: 16,
                  borderRadius: 8,
                  padding: '10px 24px'
                }}
              >
                OK, voltar ao cardápio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <style>{`.botao-flutuante-finalizar {
        background: #fff !important;
        color: ${corPrimaria} !important;
        border: 2px solid #fff !important;
        border-radius: 9999px !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.10) !important;
        font-weight: bold !important;
        opacity: 1 !important;
        padding: 0.5rem 1rem !important;
        display: flex !important;
        align-items: center !important;
      }`}</style>
    </>
  );
};
export default PublicCardapioPage;