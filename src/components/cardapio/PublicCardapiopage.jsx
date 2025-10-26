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
import PedidoTypeSelectionModal from './PedidoTypeSelectionModal';
import { useAuth } from '../../contexts/AuthContext';
import LayoutCardapio from '../layout/LayoutCardapio';
//corrigido merge

const removeAccents = (str) => {
  if (!str || typeof str !== 'string') return '';
  
  // Função mais robusta que não usa normalize para evitar problemas com hífens e caracteres especiais
  return str
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[ÀÁÂÃÄÅ]/g, 'A')
    .replace(/[ÈÉÊË]/g, 'E')
    .replace(/[ÌÍÎÏ]/g, 'I')
    .replace(/[ÒÓÔÕÖ]/g, 'O')
    .replace(/[ÙÚÛÜ]/g, 'U')
    .replace(/[Ç]/g, 'C')
    .replace(/[Ñ]/g, 'N');
};

const isRestaurantOpen = (horarioFuncionamento) => {
  if (!horarioFuncionamento) return { open: false, message: 'Horário de funcionamento não configurado.' };
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
  const parts = horarioFuncionamento.split(':', 2).map(s => s.trim());
  if (parts.length < 2) {
    return { open: false, message: 'Horário de funcionamento inválido.' };
  }
  const [dayPartsStr, timePartsStr] = parts;
  const timeParts = timePartsStr.split('-', 2).map(s => s.trim());
  if (timeParts.length < 2) {
    return { open: false, message: 'Horário de funcionamento inválido.' };
  }
  const [openTimeStr, closeTimeStr] = timeParts;

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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [selectedPedidoType, setSelectedPedidoType] = useState(null);
  const [isFinalizarPedidoModalOpen, setIsFinalizarPedidoModalOpen] = useState(false);
  const [isPedidoTypeSelectionModalOpen, setIsPedidoTypeSelectionModalOpen] = useState(false);


  const [isMinimoDeliveryModalOpen, setIsMinimoDeliveryModalOpen] = useState(false);
  const [valorFaltanteDelivery, setValorFaltanteDelivery] = useState(0);

  const [lojaFechadaParaPedidosOnline, setLojaFechadaParaPedidosOnline] = useState(false);

  // Estados para modal de avisos
  const [showAvisoModal, setShowAvisoModal] = useState(false);
  const [avisosParaMostrar, setAvisosParaMostrar] = useState([]);
  const [avisoAtualIndex, setAvisoAtualIndex] = useState(0);

  const canMakeOnlineOrder = empresa?.permitir_pedido_online === 1;
  // Obter status de aberto/fechado igual ao layout
  const getRestaurantStatus = () => {
    if (!empresa?.horario_funcionamento) return { open: false, message: 'Horário não configurado' };
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    const parts = empresa.horario_funcionamento.split(':', 2).map(s => s.trim());
    if (parts.length < 2) {
      return { open: false, message: 'Horário não configurado' };
    }
    const [dayPartsStr, timePartsStr] = parts;
    const timeParts = timePartsStr.split('-', 2).map(s => s.trim());
    if (timeParts.length < 2) {
      return { open: false, message: 'Horário não configurado' };
    }
    const [openTimeStr, closeTimeStr] = timeParts;
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


  // Função para mostrar avisos como modal
  const mostrarAvisosComoModal = () => {
    console.log("PublicCardapio: mostrarAvisosComoModal - avisos_dia_atual:", empresa?.avisos_dia_atual);
    
    if (!empresa?.avisos_dia_atual || empresa.avisos_dia_atual.length === 0) {
      console.log("PublicCardapio: Nenhum aviso para mostrar");
      return;
    }

    console.log(`PublicCardapio: Mostrando ${empresa.avisos_dia_atual.length} avisos como modal`);
    
    setAvisosParaMostrar(empresa.avisos_dia_atual);
    setAvisoAtualIndex(0);
    setShowAvisoModal(true);
  };

  // Funções para navegar entre avisos
  const proximoAviso = () => {
    if (avisoAtualIndex < avisosParaMostrar.length - 1) {
      setAvisoAtualIndex(avisoAtualIndex + 1);
    } else {
      setShowAvisoModal(false);
    }
  };

  const avisoAnterior = () => {
    if (avisoAtualIndex > 0) {
      setAvisoAtualIndex(avisoAtualIndex - 1);
    }
  };

  const fecharAvisos = () => {
    setShowAvisoModal(false);
    setAvisosParaMostrar([]);
    setAvisoAtualIndex(0);
  };

  // useEffect para mostrar avisos como modal quando carregados
  useEffect(() => {
    if (empresa?.avisos_dia_atual && empresa.avisos_dia_atual.length > 0) {
      mostrarAvisosComoModal();
    }
  }, [empresa?.avisos_dia_atual]);

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
        // As categorias já vêm ordenadas do backend por ordem ASC, descricao ASC
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
        // Adicionar categoria promoções respeitando a ordenação
        if (promoProducts.length > 0 && empresa.mostrar_promocoes_na_home) {
          const promoCategory = { id: 'promo', descricao: 'Promoções', ativo: true, ordem: 0 };
          // Inserir promoções no início, mas respeitando a ordem das outras categorias
          finalCategorias = [promoCategory, ...fetchedCategorias];
        }

        setCategorias(finalCategorias);
        setProdutos(finalProdutos);
        setFilteredProdutos(finalProdutos); // Sempre mostrar todos os produtos
        setSelectedCategoryId('all');
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

  // Debounce para pesquisa - evita atualizações desnecessárias
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    }
    
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, 500); // 500ms de delay para ser mais contido

    return () => {
      clearTimeout(timer);
      setIsSearching(false);
    };
  }, [searchTerm, debouncedSearchTerm]);

  useEffect(() => {
    let currentFiltered = produtos.filter(prod => prod && prod.ativo); 
    if (selectedCategoryId === 'promo') {
      currentFiltered = currentFiltered.filter(prod => prod && prod.promo_ativa);
    } else if (selectedCategoryId !== 'all') {
      currentFiltered = currentFiltered.filter(prod => prod && prod.id_categoria && prod.id_categoria.toString() === selectedCategoryId);
    }
    if (debouncedSearchTerm) {
      const cleanedSearchTerm = removeAccents(debouncedSearchTerm).toLowerCase();
      currentFiltered = currentFiltered.filter(prod =>
        prod && prod.nome && prod.descricao &&
        (removeAccents(prod.nome).toLowerCase().includes(cleanedSearchTerm) ||
        removeAccents(prod.descricao).toLowerCase().includes(cleanedSearchTerm))
      );
    }
    setFilteredProdutos(currentFiltered);
  }, [produtos, selectedCategoryId, debouncedSearchTerm]);

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
      // Verificar estoque se a configuração não permitir pedidos com estoque zerado
      if (empresa?.permitir_pedidos_estoque_zerado !== 1 && selectedProduct.estoque !== undefined && selectedProduct.estoque <= 0) {
        toast.error(`${selectedProduct.nome} está fora de estoque.`);
        return;
      }
      
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
    
    // Verificar estoque se a configuração não permitir pedidos com estoque zerado
    if (empresa?.permitir_pedidos_estoque_zerado !== 1 && product.estoque !== undefined && product.estoque <= 0) {
      toast.error(`${product.nome} está fora de estoque.`);
      return;
    }
    
    adicionarItem({ ...product, observacoes: '' }, 1);
    toast.success(`1x ${product.nome} adicionado ao carrinho!`);
  }, [adicionarItem, isCurrentlyOpenForOrders, empresa]);

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
      ) : null}
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
    categoriasFiltradas = categoriasParaExibir.filter(c => c && c.id && c.id.toString() === selectedCategoryId);
  }
  if (debouncedSearchTerm) {
    const cleanedSearchTerm = removeAccents(debouncedSearchTerm).toLowerCase();
    categoriasFiltradas = categoriasFiltradas.filter(cat =>
      cat && produtosPorCategoria[cat.id]?.some(prod =>
        prod && prod.nome && prod.descricao &&
        (removeAccents(prod.nome).toLowerCase().includes(cleanedSearchTerm) ||
        removeAccents(prod.descricao).toLowerCase().includes(cleanedSearchTerm))
      )
    );
  }

  // Layout do cardápio - força lista no mobile
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint do Tailwind
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const isGrid = !isMobile && empresa?.layout_cardapio === 'grid';

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
      <div className="max-w-4xl mx-auto px-3 sm:px-4 animate-fade-in-up">
        {avisoTopo}
      </div>
      {/* Filtros Modernos */}
      <section className="max-w-4xl mx-auto px-3 sm:px-4 mb-8 animate-fade-in-up">
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between bg-white/80 rounded-2xl shadow p-4 border border-gray-100">
          <div className="flex-1 w-full">
            <Label htmlFor="categoryFilter" className="text-sm font-semibold">Categoria</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger id="categoryFilter" className="h-10 rounded-lg border-gray-300 w-full">
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
          <div className="flex-1 w-full">
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
      <div className="space-y-8 max-w-4xl mx-auto px-3 sm:px-4">
        {categoriasFiltradas.map(categoria => {
          const produtosParaExibir = produtosPorCategoria[categoria.id] || [];
          if (!produtosParaExibir.length) return null;
          return (
            <div key={categoria.id} className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-gray-700 border-b pb-2 flex items-center gap-2">
                {categoria.id === 'promo' && <span>🔥</span>}
                {categoria.descricao}
              </h2>
              <div className={isGrid ? 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4' : 'flex flex-col gap-4'}>
                {produtosParaExibir
                  .filter(prod => {
                    if (!prod) return false;
                    if (debouncedSearchTerm) {
                      const cleanedSearchTerm = removeAccents(debouncedSearchTerm).toLowerCase();
                      return (
                        prod.nome && prod.descricao &&
                        (removeAccents(prod.nome).toLowerCase().includes(cleanedSearchTerm) ||
                        removeAccents(prod.descricao).toLowerCase().includes(cleanedSearchTerm))
                      );
                    }
                    return true;
                  })
                  .map(prod => (
                    <div
                      key={prod.id}
                      className={
                        isGrid
                          ? 'bg-white p-2 sm:p-4 rounded-xl sm:rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center cursor-pointer w-full'
                          : 'bg-white p-4 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 flex flex-row items-center gap-4 cursor-pointer'
                      }
                      onClick={() => {
                        if (!lojaFechadaParaPedidosOnline && (deliveryDisponivel || retiradaDisponivel)) openProductModal(prod);
                      }}
                      style={
                        (!deliveryDisponivel && !retiradaDisponivel) || lojaFechadaParaPedidosOnline 
                          ? { cursor: 'default', opacity: 0.7 } 
                          : (empresa?.permitir_pedidos_estoque_zerado !== 1 && prod.estoque !== undefined && prod.estoque <= 0)
                            ? { cursor: 'default', opacity: 0.6 }
                            : {}
                      }
                    >
                      {prod.foto_url && (
                        <img
                          src={`${api.defaults.baseURL.replace('/api/v1', '')}${prod.foto_url}`}
                          alt={prod.nome}
                          className={isGrid ? 'w-20 h-20 sm:w-32 sm:h-32 lg:w-40 lg:h-40 object-cover rounded-lg sm:rounded-xl mb-2 sm:mb-3' : 'w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl flex-shrink-0'}
                        />
                      )}
                      <div className={isGrid ? 'w-full' : 'flex-1 min-w-0'}>
                        <h3 className={isGrid ? 'text-xs sm:text-lg lg:text-xl font-bold text-gray-800 mb-0.5 sm:mb-1 line-clamp-2 px-1' : 'text-lg sm:text-xl font-bold text-gray-800 mb-1'}>{prod.nome}</h3>
                        <p className={isGrid ? 'text-gray-600 text-[10px] sm:text-sm line-clamp-2 px-1 mb-1' : 'text-gray-600 text-sm sm:text-base line-clamp-3 mb-1'}>{prod.descricao}</p>
                        {prod.promo_ativa && prod.promocao ? (
                          <p className={isGrid ? 'font-bold text-xs sm:text-lg lg:text-xl mt-1 sm:mt-2 text-green-600 px-1' : 'font-bold text-lg sm:text-xl mt-2 text-green-600'}>
                            <span className="line-through text-gray-500 mr-1 text-[10px] sm:text-base block sm:inline">R$ {parseFloat(prod.preco).toFixed(2).replace('.', ',')}</span>
                            <span className="block sm:inline">R$ {parseFloat(prod.promocao).toFixed(2).replace('.', ',')}</span>
                          </p>
                        ) : (
                          <p className={isGrid ? 'text-gray-800 font-bold text-xs sm:text-lg lg:text-xl mt-1 sm:mt-2 px-1' : 'text-gray-800 font-bold text-lg sm:text-xl mt-2'}>R$ {parseFloat(prod.preco).toFixed(2).replace('.', ',')}</p>
                        )}
                        {/* Indicador de estoque zerado */}
                        {empresa?.permitir_pedidos_estoque_zerado !== 1 && prod.estoque !== undefined && prod.estoque <= 0 && (
                          <div className={isGrid ? 'mt-1 px-1' : 'mt-1'}>
                            <span className="inline-block bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded-full">
                              Fora de Estoque
                            </span>
                          </div>
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
    className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-4 md:right-8 lg:right-12 xl:right-16 sm:w-auto max-w-full p-3 sm:p-4 rounded-full shadow-lg flex items-center space-x-2 sm:space-x-3 z-50 transition-all duration-300 ease-in-out bg-primary"
    style={{ color: '#fff', opacity: 1 }}
  >
    <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 text-white" />
    <span className="text-sm sm:text-lg font-bold whitespace-nowrap">Total: R$ {total.toFixed(2).replace('.', ',')}</span>

    <Button
      onClick={handleOpenFinalizarPedidoModal}
      disabled={!deliveryDisponivel && !retiradaDisponivel}
      className="ml-auto bg-white text-primary border border-white font-semibold rounded-full px-3 sm:px-5 py-1 sm:py-2 text-xs sm:text-sm transition-colors duration-200 hover:bg-gray-100 h-8 sm:h-9 flex-shrink-0"
    >
      <CheckCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden xs:inline">Finalizar</span><span className="inline xs:hidden">Finalizar</span> Pedido
    </Button>
  </div>
)}
        <Dialog open={!!selectedProduct} onOpenChange={closeProductModal}>
          <DialogContent className="w-full max-w-lg rounded-3xl shadow-2xl border-0 bg-white/90 backdrop-blur-lg p-0 animate-fade-in-up max-h-[95vh] flex flex-col overflow-hidden">
            {/* Header fixo */}
            <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl font-extrabold text-gray-800 mb-1 text-center">{selectedProduct?.nome}</DialogTitle>
                <DialogDescription className="text-sm sm:text-base text-gray-600 text-center mb-2">
                  {selectedProduct?.descricao}
                </DialogDescription>
                {selectedProduct?.promo_ativa && selectedProduct?.promocao ? (
                  <div className="flex justify-center items-center gap-2 mb-2">
                    <span className="line-through text-gray-400 text-base sm:text-lg">R$ {parseFloat(selectedProduct.preco).toFixed(2).replace('.', ',')}</span>
                    <span className="font-bold text-xl sm:text-2xl text-green-600">R$ {parseFloat(selectedProduct.promocao).toFixed(2).replace('.', ',')}</span>
                  </div>
                ) : (
                  <div className="flex justify-center items-center mb-2">
                    <span className="text-gray-800 font-bold text-xl sm:text-2xl">R$ {parseFloat(selectedProduct?.preco || 0).toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
              </DialogHeader>
            </div>
            
            {/* Área scrollável */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex items-center justify-center gap-4">
                  <Button onClick={() => setProductQuantity(prev => Math.max(1, prev - 1))} disabled={!isCurrentlyOpenForOrders} className="rounded-full h-10 w-10 text-xl bg-gray-200 border border-gray-300 text-gray-700 hover:bg-gray-300">-</Button>
                  <Input type="number" value={productQuantity} onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)} className="w-16 text-center rounded-lg border-gray-300" min={1} disabled={!isCurrentlyOpenForOrders} />
                  <Button onClick={() => setProductQuantity(prev => prev + 1)} disabled={!isCurrentlyOpenForOrders} className="rounded-full h-10 w-10 text-xl bg-gray-200 border border-gray-300 text-gray-700 hover:bg-gray-300">+</Button>
                </div>
                
                {productAdicionais.length > 0 && (
                  <div>
                    <Label className="text-base font-semibold mb-2 block">Adicionais Disponíveis</Label>
                    <div className="space-y-2 sm:space-y-3 mt-2 max-h-[40vh] overflow-y-auto">
                      {productAdicionais.map((adicional) => (
                        <div key={adicional.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 border rounded-xl bg-gray-50 gap-2">
                          <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
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
                              className="h-5 w-5 accent-blue-600 rounded-lg border-gray-300 flex-shrink-0 mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <Label htmlFor={`adicional-${adicional.id}`} className="font-medium cursor-pointer text-sm sm:text-base break-words">
                                {adicional.nome}
                              </Label>
                              {adicional.descricao && (
                                <p className="text-xs text-gray-500 break-words">{adicional.descricao}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 ml-7 sm:ml-0">
                            <span className="font-semibold text-green-600 text-sm sm:text-base whitespace-nowrap">
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
                                  className="h-7 w-7 p-0 rounded-full text-base"
                                >
                                  -
                                </Button>
                                <span className="text-sm sm:text-base font-medium w-6 text-center">
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
                                  className="h-7 w-7 p-0 rounded-full text-base"
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
                  <Label htmlFor="observacao" className="font-semibold text-sm sm:text-base">Observações (opcional)</Label>
                  <Textarea id="observacao" value={productObservation} onChange={(e) => setProductObservation(e.target.value)} placeholder="Ex: Sem cebola, bem passado..." disabled={!isCurrentlyOpenForOrders} className="rounded-xl border-gray-300 mt-1 min-h-[80px]" />
                </div>
              </div>
            </div>
            
            {/* Footer fixo */}
            <div className="p-4 sm:p-6 border-t border-gray-200 flex-shrink-0 bg-white/95">
              <div className="text-center p-3 sm:p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl mb-4">
                <p className="text-xs sm:text-sm text-gray-600">Valor total:</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
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
              <DialogFooter className="flex justify-center">
                <Button 
                  onClick={handleAddToCart} 
                  disabled={
                    !isCurrentlyOpenForOrders || 
                    (empresa?.permitir_pedidos_estoque_zerado !== 1 && selectedProduct?.estoque !== undefined && selectedProduct?.estoque <= 0)
                  } 
                  className="rounded-full px-6 sm:px-8 py-2 sm:py-3 text-base sm:text-lg font-bold bg-primary text-white shadow-lg hover:bg-primary/90 transition-all w-full sm:w-auto"
                >
                  {empresa?.permitir_pedidos_estoque_zerado !== 1 && selectedProduct?.estoque !== undefined && selectedProduct?.estoque <= 0
                    ? 'Fora de Estoque'
                    : 'Adicionar ao Carrinho'
                  }
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={isFinalizarPedidoModalOpen} onOpenChange={setIsFinalizarPedidoModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full max-w-4xl max-h-[95vh] rounded-3xl shadow-2xl border-0 bg-white/90 backdrop-blur-lg p-0 animate-fade-in-up overflow-hidden">
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

        {/* Modal de Avisos */}
        <Dialog open={showAvisoModal} onOpenChange={setShowAvisoModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {avisosParaMostrar[avisoAtualIndex]?.tipo === 'info' && 'ℹ️'}
                {avisosParaMostrar[avisoAtualIndex]?.tipo === 'aviso' && '⚠️'}
                {avisosParaMostrar[avisoAtualIndex]?.tipo === 'promocao' && '🎉'}
                {avisosParaMostrar[avisoAtualIndex]?.tipo === 'manutencao' && '🔧'}
                {avisosParaMostrar[avisoAtualIndex]?.titulo || 'Aviso'}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700 text-lg leading-relaxed">
                {avisosParaMostrar[avisoAtualIndex]?.mensagem}
              </p>
            </div>
            <DialogFooter className="flex justify-between">
              <div className="flex gap-2">
                {avisoAtualIndex > 0 && (
                  <Button variant="outline" onClick={avisoAnterior}>
                    Anterior
                  </Button>
                )}
                <Button variant="outline" onClick={fecharAvisos}>
                  Fechar
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {avisoAtualIndex + 1} de {avisosParaMostrar.length}
                </span>
                {avisoAtualIndex < avisosParaMostrar.length - 1 ? (
                  <Button onClick={proximoAviso}>
                    Próximo
                  </Button>
                ) : (
                  <Button onClick={fecharAvisos}>
                    Finalizar
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </LayoutCardapio>
  );
};
export default PublicCardapioPage;