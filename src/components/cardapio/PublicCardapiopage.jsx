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
import LayoutCardapio from '../layout/LayoutCardapio';
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

  const [lojaFechadaParaPedidosOnline, setLojaFechadaParaPedidosOnline] = useState(false);

  const canMakeOnlineOrder = empresa?.permitir_pedido_online === 1;
  // Obter status de aberto/fechado igual ao layout
  const getRestaurantStatus = () => {
    if (!empresa?.horario_funcionamento) return { open: false, message: 'Horário não configurado' };
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    const [dayPartsStr, timePartsStr] = empresa.horario_funcionamento.split(':', 2).map(s => s.trim());
    const [openTimeStr, closeTimeStr] = timePartsStr.split('-', 2).map(s => s.trim());
    const parseTime = (timeStr) => {
      const [h, m] = timeStr.replace('h', ':').split(':').map(Number);
      return h * 60 + (m || 0);
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
      return { open: false, message: 'Fechado hoje' };
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
      return { open: true, message: 'Aberto Agora' };
    } else {
      return { open: false, message: 'Fechado Agora' };
    }
  };

  const restaurantStatus = getRestaurantStatus();
  const isCurrentlyOpenForOrders = canMakeOnlineOrder && restaurantStatus.open;

  // Lógica de horário limite de pedidos delivery
  const isAfterDeliveryCutoff = empresa?.tempo_corte_pedido_online ? (() => {
    const [h, m] = empresa.tempo_corte_pedido_online.split(':').map(Number);
    const now = new Date();
    const minAtual = now.getHours() * 60 + now.getMinutes();
    const minCorte = (h || 0) * 60 + (m || 0);
    return minAtual > minCorte;
  })() : false;

  // Status de tipos de pedido
  const deliveryDisponivel = isCurrentlyOpenForOrders && !isAfterDeliveryCutoff && !empresa.desativar_entrega;
  const retiradaDisponivel = isCurrentlyOpenForOrders && !empresa.desativar_retirada;

  // Mensagem de aviso
  let avisoTopo = null;
  if (!restaurantStatus.open) {
    avisoTopo = (
      <div className="bg-red-50 border border-red-300 text-red-700 p-3 sm:p-4 rounded mb-4 text-center text-base sm:text-lg font-semibold shadow animate-fade-in">
        {restaurantStatus.message} - Os pedidos online estão desabilitados no momento. Apenas visualização do cardápio disponível.
      </div>
    );
  } else if (isAfterDeliveryCutoff && retiradaDisponivel) {
    avisoTopo = (
      <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 p-3 sm:p-4 rounded mb-4 text-center text-base sm:text-lg font-semibold shadow animate-fade-in">
        Pedidos para delivery encerrados hoje. Apenas retirada disponível.<br />
        Horário limite para pedidos: {empresa.tempo_corte_pedido_online}
      </div>
    );
  } else if (!deliveryDisponivel && !retiradaDisponivel) {
    avisoTopo = (
      <div className="bg-red-50 border border-red-300 text-red-700 p-3 sm:p-4 rounded mb-4 text-center text-base sm:text-lg font-semibold shadow animate-fade-in">
        Nenhum tipo de pedido disponível no momento. Apenas visualização do cardápio.
      </div>
    );
  }

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
        // Corrigido: não filtrar produtos, só adicionar categoria promoções no topo
        if (promoProducts.length > 0 && empresa.mostrar_promocoes_na_home) {
          const promoCategory = { id: 'promo', descricao: 'Promoções', ativo: true };
          finalCategorias = [promoCategory, ...fetchedCategorias];
        }

        setCategorias(finalCategorias);
        setProdutos(finalProdutos);
        setFilteredProdutos(finalProdutos); // Sempre mostrar todos os produtos
        setSelectedCategoryId('all');
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

  useEffect(() => {
    if (empresa && empresa.tempo_corte_pedido_online) {
      let horaCorte = 0, minCorte = 0;
      if (empresa.tempo_corte_pedido_online.includes(':')) {
        [horaCorte, minCorte] = empresa.tempo_corte_pedido_online.split(':').map(Number);
      } else {
        horaCorte = Number(empresa.tempo_corte_pedido_online);
        minCorte = 0;
      }
      const agora = new Date();
      const horaAtual = agora.getHours();
      const minAtual = agora.getMinutes();
      if (
        (horaAtual > horaCorte) ||
        (horaAtual === horaCorte && minAtual >= (minCorte || 0))
      ) {
        setLojaFechadaParaPedidosOnline(true);
      } else {
        setLojaFechadaParaPedidosOnline(false);
      }
    } else {
      setLojaFechadaParaPedidosOnline(false);
    }
  }, [empresa]);

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
    if (lojaFechadaParaPedidosOnline) {
      toast.error('Pedidos online encerrados. Apenas visualização do cardápio está disponível.');
      return;
    }
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

  // Ajustar seleção de tipo de pedido e botões:
  const handleOpenFinalizarPedidoModal = () => {
    if (lojaFechadaParaPedidosOnline) {
      toast.error('Pedidos online encerrados. Apenas visualização do cardápio está disponível.');
      return;
    }
    if (itens.length === 0) {
      toast.error('O carrinho está vazio para finalizar o pedido!');
      return;
    }
    if (!deliveryDisponivel && !retiradaDisponivel) {
      toast.error('A empresa não está aceitando pedidos online no momento.');
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

  // Componente de ações do usuário para o topo
  const userActions = (
    <>
      {user && user.role === 'cliente' ? (
        <>
          <span className="font-semibold text-sm sm:text-base mr-2">Olá, {user.nome.split(' ')[0]}</span>
          <Button variant="outline" onClick={() => toast.info('Em breve!')} className="text-xs sm:text-sm h-8 sm:h-9">Meus pedidos</Button>
          <Button variant="ghost" onClick={logout} className="text-xs sm:text-sm h-8 sm:h-9">Sair</Button>
        </>
      ) : (
        <Button variant="outline" onClick={() => setIsLoginRegisterModalOpen(true)} className="text-xs sm:text-sm h-8 sm:h-9">Entrar ou Cadastrar</Button>
      )}
    </>
  );

  // Agrupamento de produtos por categoria, respeitando promoções e configs
  let categoriasParaExibir = categorias.filter(c => c.ativo !== false);
  let produtosPorCategoria = {};
  if (empresa?.mostrar_promocoes_na_home) {
    // Promoções primeiro, depois as demais
    const promoCategoria = categoriasParaExibir.find(c => c.id === 'promo');
    if (promoCategoria) {
      categoriasParaExibir = [promoCategoria, ...categoriasParaExibir.filter(c => c.id !== 'promo')];
    }
  }
  categoriasParaExibir.forEach(cat => {
    if (cat.id === 'promo') {
      produtosPorCategoria[cat.id] = produtos.filter(p => p.promo_ativa);
    } else {
      produtosPorCategoria[cat.id] = produtos.filter(p => p.id_categoria === cat.id && p.ativo);
    }
  });

  // Filtro de busca e categoria
  let categoriasFiltradas = categoriasParaExibir;
  if (selectedCategoryId !== 'all') {
    categoriasFiltradas = categoriasParaExibir.filter(c => c.id.toString() === selectedCategoryId);
  }
  if (searchTerm) {
    const cleanedSearchTerm = removeAccents(searchTerm).toLowerCase();
    categoriasFiltradas = categoriasFiltradas.filter(cat =>
      produtosPorCategoria[cat.id]?.some(prod =>
        removeAccents(prod.nome).toLowerCase().includes(cleanedSearchTerm) ||
        removeAccents(prod.descricao).toLowerCase().includes(cleanedSearchTerm)
      )
    );
  }

  // Layout do cardápio
  const isGrid = empresa?.layout_cardapio === 'grid';

  if (empresaLoading || loadingContent || !isReady) {
    return (
      <div className="flex justify-center items-center h-screen">
        Carregando cardápio de {empresa?.nome_fantasia || 'sua empresa'}...
      </div>
    );
  }
  
  // Só mostrar tela de erro se for erro real (API, empresa inativa, etc)
  if (error && error.toLowerCase().indexOf('erro') !== -1) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-red-500 text-center p-4">
        <p className="font-semibold text-lg mb-2">Ops! Algo deu errado.</p>
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
    <LayoutCardapio userActions={userActions}>
      {/* Avisos e status */}
      <div className="max-w-4xl mx-auto px-2 animate-fade-in-up">
        {avisoTopo}
      </div>
      {/* Filtros Modernos */}
      <section className="max-w-4xl mx-auto px-2 mb-8 animate-fade-in-up">
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between bg-white/80 rounded-2xl shadow p-4 border border-gray-100">
          <div className="flex-1">
            <Label htmlFor="categoryFilter" className="text-sm font-semibold">Categoria</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger id="categoryFilter" className="h-10 rounded-lg border-gray-300">
                <SelectValue placeholder="Todas as Categorias" />
              </SelectTrigger>
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
          <div className="flex-1">
            <Label htmlFor="productSearch" className="text-sm font-semibold">Buscar Produto</Label>
            <Input
              id="productSearch"
              placeholder="Nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 rounded-lg border-gray-300"
            />
          </div>
        </div>
      </section>
      {/* Produtos agrupados por categoria */}
      <div className="space-y-8">
        {categoriasFiltradas.map(categoria => {
          const produtosParaExibir = produtosPorCategoria[categoria.id] || [];
          if (!produtosParaExibir.length) return null;
          return (
            <div key={categoria.id} className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                {categoria.id === 'promo' && <span>🔥</span>}
                {categoria.descricao}
              </h2>
              <div className={isGrid ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-4'}>
                {produtosParaExibir
                  .filter(prod => {
                    if (searchTerm) {
                      const cleanedSearchTerm = removeAccents(searchTerm).toLowerCase();
                      return (
                        removeAccents(prod.nome).toLowerCase().includes(cleanedSearchTerm) ||
                        removeAccents(prod.descricao).toLowerCase().includes(cleanedSearchTerm)
                      );
                    }
                    return true;
                  })
                  .map(prod => (
                    <div
                      key={prod.id}
                      className={
                        isGrid
                          ? 'bg-white p-4 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center cursor-pointer'
                          : 'bg-white p-4 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 flex flex-row items-center gap-4 cursor-pointer'
                      }
                      onClick={() => {
                        if (!lojaFechadaParaPedidosOnline && (deliveryDisponivel || retiradaDisponivel)) openProductModal(prod);
                      }}
                      style={(!deliveryDisponivel && !retiradaDisponivel) || lojaFechadaParaPedidosOnline ? { cursor: 'default', opacity: 0.7 } : {}}
                    >
                      {prod.foto_url && (
                        <img
                          src={`${api.defaults.baseURL.replace('/api/v1', '')}${prod.foto_url}`}
                          alt={prod.nome}
                          className={isGrid ? 'w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-xl mb-3' : 'w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl flex-shrink-0'}
                        />
                      )}
                      <div className={isGrid ? '' : 'flex-1 min-w-0'}>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1 truncate">{prod.nome}</h3>
                        <p className="text-gray-600 text-sm sm:text-base line-clamp-2">{prod.descricao}</p>
                        {prod.promo_ativa && prod.promocao ? (
                          <p className="font-bold text-lg sm:text-xl mt-2 text-green-600">
                            <span className="line-through text-gray-500 mr-2">R$ {parseFloat(prod.preco).toFixed(2).replace('.', ',')}</span>
                            <span>R$ {parseFloat(prod.promocao).toFixed(2).replace('.', ',')}</span>
                          </p>
                        ) : (
                          <p className="text-gray-800 font-bold text-lg sm:text-xl mt-2">R$ {parseFloat(prod.preco).toFixed(2).replace('.', ',')}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
      {hasItemsInCart && isCurrentlyOpenForOrders && (
  <div
    className="fixed bottom-4 right-4 md:right-8 lg:right-12 xl:right-16 w-auto p-3 sm:p-4 rounded-full shadow-lg flex items-center space-x-2 sm:space-x-3 z-50 transition-all duration-300 ease-in-out bg-primary"
    style={{ color: '#fff', opacity: 1 }}
  >
    <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 text-white" />
    <span className="text-sm sm:text-lg font-bold whitespace-nowrap">Total: R$ {total.toFixed(2).replace('.', ',')}</span>

    <Button
      onClick={handleOpenFinalizarPedidoModal}
      disabled={!deliveryDisponivel && !retiradaDisponivel}
      className="ml-auto bg-white text-primary border border-white font-semibold rounded-full px-3 sm:px-5 py-1 sm:py-2 text-xs sm:text-sm transition-colors duration-200 hover:bg-gray-100 h-8 sm:h-9"
    >
      <CheckCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Finalizar Pedido
    </Button>
  </div>
)}
        <Dialog open={!!selectedProduct} onOpenChange={closeProductModal}>
          <DialogContent className="w-full max-w-lg rounded-3xl shadow-2xl border-0 bg-white/90 backdrop-blur-lg p-0 animate-fade-in-up">
            <div className="p-6 sm:p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-extrabold text-gray-800 mb-1 text-center">{selectedProduct?.nome}</DialogTitle>
                <DialogDescription className="text-base text-gray-600 text-center mb-2">
                  {selectedProduct?.descricao}
                </DialogDescription>
                {selectedProduct?.promo_ativa && selectedProduct?.promocao ? (
                  <div className="flex justify-center items-center gap-2 mb-4">
                    <span className="line-through text-gray-400 text-lg">R$ {parseFloat(selectedProduct.preco).toFixed(2).replace('.', ',')}</span>
                    <span className="font-bold text-2xl text-green-600">R$ {parseFloat(selectedProduct.promocao).toFixed(2).replace('.', ',')}</span>
                  </div>
                ) : (
                  <div className="flex justify-center items-center mb-4">
                    <span className="text-gray-800 font-bold text-2xl">R$ {parseFloat(selectedProduct?.preco || 0).toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
              </DialogHeader>
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-center gap-4">
                  <Button onClick={() => setProductQuantity(prev => Math.max(1, prev - 1))} disabled={!isCurrentlyOpenForOrders} className="rounded-full h-10 w-10 text-xl bg-gray-200 border border-gray-300 text-gray-700 hover:bg-gray-300">-</Button>
                  <Input type="number" value={productQuantity} onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)} className="w-16 text-center rounded-lg border-gray-300" min={1} disabled={!isCurrentlyOpenForOrders} />
                  <Button onClick={() => setProductQuantity(prev => prev + 1)} disabled={!isCurrentlyOpenForOrders} className="rounded-full h-10 w-10 text-xl bg-gray-200 border border-gray-300 text-gray-700 hover:bg-gray-300">+</Button>
                </div>
                {productAdicionais.length > 0 && (
                  <div>
                    <Label className="text-base font-semibold mb-2 block">Adicionais Disponíveis</Label>
                    <div className="space-y-3 mt-2">
                      {productAdicionais.map((adicional) => (
                        <div key={adicional.id} className="flex items-center justify-between p-3 border rounded-xl bg-gray-50">
                          <div className="flex items-center gap-3">
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
                              className="h-5 w-5 accent-blue-600 rounded-lg border-gray-300"
                            />
                            <div>
                              <Label htmlFor={`adicional-${adicional.id}`} className="font-medium cursor-pointer">
                                {adicional.nome}
                              </Label>
                              {adicional.descricao && (
                                <p className="text-xs text-gray-500">{adicional.descricao}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-green-600">
                              R$ {parseFloat(adicional.preco).toFixed(2).replace('.', ',')}
                            </span>
                            {selectedAdicionais.some(sel => sel.id === adicional.id) && (
                              <div className="flex items-center gap-1">
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
                                  className="h-7 w-7 p-0 rounded-full"
                                >
                                  -
                                </Button>
                                <span className="text-base font-medium w-6 text-center">
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
                                  className="h-7 w-7 p-0 rounded-full"
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
                  <Label htmlFor="observacao" className="font-semibold">Observações (opcional)</Label>
                  <Textarea id="observacao" value={productObservation} onChange={(e) => setProductObservation(e.target.value)} placeholder="Ex: Sem cebola, bem passado..." disabled={!isCurrentlyOpenForOrders} className="rounded-xl border-gray-300 mt-1" />
                </div>
                <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl mt-2">
                  <p className="text-sm text-gray-600">Valor total:</p>
                  <p className="text-2xl font-bold text-green-600">
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
              <DialogFooter className="mt-6 flex justify-center">
                <Button onClick={handleAddToCart} disabled={!isCurrentlyOpenForOrders} className="rounded-full px-8 py-3 text-lg font-bold bg-primary text-white shadow-lg hover:bg-primary/90 transition-all">Adicionar ao Carrinho</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={isFinalizarPedidoModalOpen} onOpenChange={setIsFinalizarPedidoModalOpen}>
          <DialogContent className="w-full max-w-xl rounded-3xl shadow-2xl border-0 bg-white/90 backdrop-blur-lg p-0 animate-fade-in-up">
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
          <DialogContent className="w-full max-w-md rounded-3xl shadow-2xl border-0 bg-white/90 backdrop-blur-lg p-0 animate-fade-in-up">
            <LoginRegisterModal onClose={() => setIsLoginRegisterModalOpen(false)} />
          </DialogContent>
        </Dialog>
        <Dialog open={isPedidoTypeSelectionModalOpen} onOpenChange={setIsPedidoTypeSelectionModalOpen}>
          <DialogContent className="w-full max-w-md rounded-3xl shadow-2xl border-0 bg-white/90 backdrop-blur-lg p-0 animate-fade-in-up">
            <PedidoTypeSelectionModal
              onSelectType={handlePedidoTypeSelected}
              onClose={() => setIsPedidoTypeSelectionModalOpen(false)}
              empresa={empresa}
            />
          </DialogContent>
        </Dialog>
        <Dialog open={isMinimoDeliveryModalOpen} onOpenChange={setIsMinimoDeliveryModalOpen}>
          <DialogContent className="w-full max-w-md rounded-3xl shadow-2xl border-0 bg-white/90 backdrop-blur-lg p-0 animate-fade-in-up">
            <div className="p-8 text-center">
              <DialogHeader>
                <DialogDescription>
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-4">
                    <span className="font-bold text-xl block mb-2">O valor mínimo para delivery</span>
                    <span className="text-blue-700 font-bold text-2xl">R$ {parseFloat(empresa.pedido_minimo_delivery).toFixed(2).replace('.', ',')}</span>
                    <br />
                    <span className="font-bold text-red-600 text-lg block mt-2">
                      Faltam R$ {valorFaltanteDelivery.toFixed(2).replace('.', ',')}
                    </span> para você conseguir finalizar seu pedido.
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex justify-center mt-4">
                <Button
                  onClick={() => setIsMinimoDeliveryModalOpen(false)}
                  className="bg-blue-600 text-white font-bold text-lg rounded-full px-8 py-3 shadow-lg hover:bg-blue-700 transition-all"
                >
                  OK, voltar ao cardápio
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </LayoutCardapio>
  );
};
export default PublicCardapioPage;