// frontend/src/components/cardapio/PublicCardapioPage.jsx
// ESTE ARQUIVO É O CARDÁPIO EXCLUSIVO PARA PEDIDOS ONLINE (CLIENTES)
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
// import { useAuth } from '../../contexts/AuthContext'; // Comentado: user e logout devem ser passados via props do LayoutCardapio
import { useCarrinho } from '../../contexts/CarrinhoContext';
import api from '../../services/api';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
// Importe apenas os ícones que este componente *realmente* usa
import { ShoppingCart, Home, Bike, CheckCircle, Utensils, Plus, Minus } from 'lucide-react';
import FinalizarPedido from './FinalizarPedido';
import LoginRegisterModal from './LoginRegisterModal'; // Importado diretamente aqui pois o modal é acionado por esta página (independente do layout)
import PedidoTypeSelectionModal from './PedidoTypeSelectionModal'; // Importado diretamente aqui


// Função para remover acentos (para busca)
const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Função para checar se a empresa está aberta
// Retorna um objeto com 'open' (boolean) e 'message' (string com status e horários)
const isRestaurantOpen = (horarioFuncionamento) => {
  if (!horarioFuncionamento) return { open: false, message: 'Horário de funcionamento não configurado.' };

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
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
  // let activeDaysNames = []; // Não é estritamente necessário aqui, só para mensagem de depuração se necessário.

  if (dayPartsStr.includes('-')) {
    const [startDayName, endDayName] = dayPartsStr.split('-').map(s => s.trim());
    const startDayIndex = daysMap[startDayName];
    const endDayIndex = daysMap[endDayName];
    
    if (startDayIndex !== undefined && endDayIndex !== undefined) {
      if (startDayIndex <= endDayIndex) {
        for (let i = startDayIndex; i <= endDayIndex; i++) {
          if (i === dayOfWeek) isTodayIncluded = true;
        }
      } else { // Ex: Sex-Seg (crossed midnight)
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
  } else { // Single day
    const singleDayIndex = daysMap[dayPartsStr];
    if (singleDayIndex !== undefined) {
      if (singleDayIndex === dayOfWeek) isTodayIncluded = true;
    }
  }

  if (!isTodayIncluded) {
    // Retorna os nomes dos dias de funcionamento para a mensagem
    return { open: false, message: `Fechado(a) hoje. Horário de funcionamento: ${dayPartsStr} ${timePartsStr}.` };
  }

  const openTimeMinutes = parseTime(openTimeStr);
  const closeTimeMinutes = parseTime(closeTimeStr);

  let currentlyOpen = false;
  if (closeTimeMinutes < openTimeMinutes) { // Vira a noite
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


const PublicCardapioPage = ({ user }) => { // Recebe 'user' como prop do componente pai (LayoutCardapio/rotas)
  const { empresa, loading: empresaLoading, isReady } = useEmpresa();
  // user e logout agora podem vir do App.jsx (ou onde LayoutCardapio é renderizado)
  // Se user.logout for passado como prop, ele pode ser usado. Senão, se PublicCardapioPage precisa de logout,
  // ele teria que importar useAuth() internamente, mas o ideal é que o Layout trate o user/auth.

  // CORREÇÃO AQUI: Adicionado 'atualizarQuantidadeItem' à desestruturação de useCarrinho
  const { adicionarItem, total, itens, removerItem, limparCarrinho, atualizarQuantidadeItem } = useCarrinho();

  const [loadingContent, setLoadingContent] = useState(true);
  const [error, setError] = useState(null); // Usado para mensagens de "fechado" ou erro de carregamento
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [filteredProdutos, setFilteredProdutos] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null); // Para o modal de observações
  const [productQuantity, setProductQuantity] = useState(1); // Quantidade no modal
  const [productObservation, setProductObservation] = useState(''); // Observação no modal
  const [productAdicionais, setProductAdicionais] = useState([]); // Adicionais disponíveis do produto
  const [selectedAdicionais, setSelectedAdicionais] = useState([]); // Adicionais selecionados no modal

  // Filtros
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Cliente: Finalizar Pedido
  const [selectedPedidoType, setSelectedPedidoType] = useState(null);
  const [isFinalizarPedidoModalOpen, setIsFinalizarPedidoModalOpen] = useState(false);
  const [isPedidoTypeSelectionModalOpen, setIsPedidoTypeSelectionModalOpen] = useState(false);

  // Cliente: Login/Cadastro - Assegura que estes states estão DEFINIDOS
  // Estes states controlam a abertura dos modais diretamente desta página
  const [isLoginRegisterModalOpen, setIsLoginRegisterModalOpen] = useState(false);


  // Definindo essas variáveis aqui, no escopo principal do componente, para que sejam sempre acessíveis no JSX e callbacks.
  const canMakeOnlineOrder = empresa?.permitir_pedido_online === 1; // Transforma em booleano explícito
  const restaurantStatus = isRestaurantOpen(empresa?.horario_funcionamento);
  const isCurrentlyOpenForOrders = canMakeOnlineOrder && restaurantStatus.open;


  // Efeito para buscar dados do cardápio
  // As dependências foram revisadas para evitar o erro de "size changed between renders"
  useEffect(() => {
    const fetchCardapioData = async () => {
      if (!isReady) {
        setLoadingContent(true);
        return;
      }

      // Se a empresa não está ativa ou não carregou, exibe erro
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

      // Lógica para definir a mensagem de erro que será exibida para o cliente se pedidos não forem permitidos
      let displayErrorMessage = null;
      if (!currentRestaurantStatus.open) {
        displayErrorMessage = currentRestaurantStatus.message;
      } else if (empresa.tempo_corte_pedido_online && isAfterCutoff) {
        displayErrorMessage = `Pedidos online fora do horário de corte. Último pedido até ${empresa.tempo_corte_pedido_online}.`;
      } else if (empresa.permitir_pedido_online === 0) {
        displayErrorMessage = `Os pedidos online para "${empresa.nome_fantasia}" estão temporariamente desativados.`;
      }

      // Seta o erro para ser exibido no componente se houver restrições para pedidos online
      // Para o cliente, o cardápio ficará "desabilitado" para adicionar itens.
      if (displayErrorMessage) {
          setError(displayErrorMessage + " Apenas a visualização do cardápio está disponível.");
      } else {
          setError(null); // Limpa erros se a empresa está aberta para pedidos
      }

      setLoadingContent(true);
      try {
        const categoriasResponse = await api.get(`/${empresa.slug}/cardapio/categorias`);
        const fetchedCategorias = categoriasResponse.data;

        const produtosResponse = await api.get(`/${empresa.slug}/cardapio/produtos`);
        // Filtra apenas produtos ATIVOS para exibição no cardápio público
        const fetchedProdutos = produtosResponse.data.filter(p => p.ativo);
        
        // Carregar adicionais de cada produto
        const produtosComAdicionais = await Promise.all(
          fetchedProdutos.map(async (produto) => {
            try {
              const adicionaisResponse = await api.get(`/${empresa.slug}/cardapio/produtos/${produto.id}/adicionais`);
              console.log(`Adicionais do produto ${produto.id} (${produto.nome}):`, adicionaisResponse.data);
              if (adicionaisResponse.data && adicionaisResponse.data.length > 0) {
                console.log(`✅ Produto ${produto.nome} tem ${adicionaisResponse.data.length} adicionais`);
              }
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

        const promoProducts = finalProdutos.filter(p => p.promo_ativa); // Filtra promos de produtos ativos
        if (promoProducts.length > 0 && empresa.mostrar_promocoes_na_home) {
          const promoCategory = { id: 'promo', descricao: '🔥 Promoções', ativo: true };
          finalCategorias = [promoCategory, ...fetchedCategorias];
        }
        setCategorias(finalCategorias);
        setProdutos(finalProdutos);
        console.log('Produtos com adicionais carregados:', finalProdutos);
        // Verificar se há produtos com adicionais
        const produtosComAdicionaisCount = finalProdutos.filter(prod => prod.adicionais && prod.adicionais.length > 0);
        console.log(`📊 Total de produtos com adicionais: ${produtosComAdicionaisCount.length}`);
        if (produtosComAdicionaisCount.length > 0) {
          console.log('Produtos que têm adicionais:', produtosComAdicionaisCount.map(p => ({ id: p.id, nome: p.nome, adicionais: p.adicionais.length })));
        }

        // Define os produtos filtrados iniciais (pode ser promoções se configurado)
        if (empresa.mostrar_promocoes_na_home) {
          setFilteredProdutos(finalProdutos.filter(p => p.promo_ativa));
          setSelectedCategoryId('promo');
        } else {
          setFilteredProdutos(finalProdutos);
          setSelectedCategoryId('all');
        }

        toast.success("Cardápio carregado!");

      } catch (err) {
        // Se houver erro na API, sobrescreve o erro anterior (se houver)
        setError(err.response?.data?.message || 'Erro ao carregar o cardápio.');
        console.error("Erro ao carregar cardápio:", err);
        toast.error(err.response?.data?.message || 'Erro ao carregar cardápio.');
      } finally {
        setLoadingContent(false);
      }
    };

    fetchCardapioData();
  }, [empresa, isReady]); // Dependências ajustadas: não incluem 'user' ou 'canMakeOnlineOrder' diretamente aqui para evitar instabilidade.


  // Ref + flag em localStorage para evitar múltiplos POSTs
  const acessoRegistradoRef = useRef(false);

  useEffect(() => {
    // Executa apenas uma vez por montagem (mesmo em StrictMode poderá montar duas vezes, por isso usamos localStorage)
    if (!isReady) return;

    // 1. Gera (ou recupera) um session_id único
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('session_id', sessionId);
    }

    // Se já registramos acesso nesta sessão, não faz nada
    const acessoFlagKey = `access_registered_${sessionId}`;
    if (localStorage.getItem(acessoFlagKey)) {
      return; // Já havia registrado
    }

    // Impede chamadas concorrentes
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

        // Marca localmente que já registramos
        localStorage.setItem(acessoFlagKey, 'true');
      } catch (err) {
        console.error('Erro ao registrar acesso:', err);
      }
    };

    registrarAcesso();
  }, [isReady, empresa]);


  useEffect(() => {
    let currentFiltered = produtos.filter(prod => prod.ativo); // Filtra por ativo sempre

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


  // Abre o modal de observações do produto
  const openProductModal = async (product) => {
    setSelectedProduct(product);
    // Para o modal de observações, o botão '+'/'Atualizar' deve adicionar a quantidade digitada com a observação.
    // Buscamos o item existente no carrinho (com ou sem observação) para pré-preencher
    const itemInCartForModal = itens.find(item => item.id_produto === product.id);
    
    setProductQuantity(itemInCartForModal ? itemInCartForModal.quantidade : 1);
    setProductObservation(itemInCartForModal ? itemInCartForModal.observacoes : ''); // Preenche com a obs do item encontrado
    setProductAdicionais([]);
    setSelectedAdicionais(itemInCartForModal ? itemInCartForModal.adicionais || [] : []);
    
    // Carregar adicionais do produto
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

  // Adiciona/Atualiza item no carrinho via MODAL (com observações)
  const handleAddToCart = () => {
    if (selectedProduct) {
      // Busca um item existente com a MESMA observação e MESMOS ADICIONAIS que estão sendo passados
      const existingItemIndex = itens.findIndex(item => {
          const mesmaObservacao = item.id_produto === selectedProduct.id && item.observacoes === (productObservation || '');
          const mesmosAdicionais = JSON.stringify(item.adicionais || []) === JSON.stringify(selectedAdicionais);
          return mesmaObservacao && mesmosAdicionais;
      });
      
      if (existingItemIndex > -1) {
          // Se já existe um item com a mesma observação e adicionais, atualiza a quantidade
          // Chama atualizarQuantidadeItem diretamente
          atualizarQuantidadeItem(selectedProduct.id, productQuantity, productObservation || '', selectedAdicionais);
          toast.success(`Quantidade de ${selectedProduct.nome} atualizada.`);
      } else {
          // Se não existe um item com essa observação, adiciona como um novo item
          adicionarItem({
              id: selectedProduct.id,
              nome: selectedProduct.nome,
              preco: selectedProduct.preco,
              promocao: selectedProduct.promocao,
              promo_ativa: selectedProduct.promo_ativa,
              foto_url: selectedProduct.foto_url,
              observacoes: productObservation, // Usa a observação do modal
              adicionais: selectedAdicionais // Inclui os adicionais selecionados
          }, productQuantity); // Usa a quantidade do modal
          toast.success(`${productQuantity}x ${selectedProduct.nome} adicionado(s) ao carrinho!`);
      }
      
      closeProductModal();
    }
  };


  // Funções para adicionar/remover direto do card do produto (sempre alteram o item SEM observações)
  const handleQuickAddToCart = useCallback((e, product) => {
    e.stopPropagation(); // Evita que o clique no botão abra o modal do produto
    if (!isCurrentlyOpenForOrders) { // Desabilitado se a empresa não está aceitando pedidos
      toast.info("A empresa não está aceitando pedidos online no momento.");
      return;
    }
    // Adiciona ao carrinho o item SEM observações
    adicionarItem({ ...product, observacoes: '' }, 1);
    toast.success(`1x ${product.nome} adicionado ao carrinho!`);
  }, [adicionarItem, isCurrentlyOpenForOrders]);

  // handleQuickRemoveFromCart: decrementa a quantidade do item SEM observações
  const handleQuickRemoveFromCart = useCallback((e, product) => {
    e.stopPropagation(); // Evita que o clique no botão abra o modal do produto
    if (!isCurrentlyOpenForOrders) { // Desabilitado se a empresa não está aceitando pedidos
      toast.info("A empresa não está aceitando pedidos online no momento.");
      return;
    }
    // Para os botões +/- rápidos, sempre removemos/atualizamos o item SEM observações
    const itemInCart = itens.find(item => item.id_produto === product.id && (item.observacoes === undefined || item.observacoes === ''));
    if (itemInCart) {
      // Usa atualizarQuantidadeItem para decrementar a quantidade ou remover se <= 0
      atualizarQuantidadeItem(itemInCart.id_produto, itemInCart.quantidade - 1, itemInCart.observacoes);
      // O toast de remoção/atualização já é dado pelo CarrinhoContext ou pela lógica interna
    } else {
      toast.info(`${product.nome} não está no seu carrinho sem observações.`);
    }
  }, [itens, atualizarQuantidadeItem, isCurrentlyOpenForOrders]); // Dependências


  // Função para obter a contagem de um produto específico no carrinho (considera SÓ ITENS SEM OBSERVAÇÃO)
  // Essencial para a atualização visual dos botões +/-
  const getProductCountInCart = useCallback((productId) => {
    // Soma as quantidades de todos os itens com o mesmo id_produto E SEM observações.
    return itens.filter(item => item.id_produto === productId && (item.observacoes === undefined || item.observacoes === '')).reduce((sum, item) => sum + item.quantidade, 0);
  }, [itens]); // Dependência em 'itens' para reatividade


  const handleOpenFinalizarPedidoModal = () => {
    if (itens.length === 0) {
      toast.error('O carrinho está vazio para finalizar o pedido!');
      return;
    }
    if (!isCurrentlyOpenForOrders) { // Desabilita o botão se a empresa não está aceitando pedidos
      toast.error("A empresa não está aceitando pedidos online no momento.");
      return;
    }
    setIsPedidoTypeSelectionModalOpen(true);
  };

  const handlePedidoTypeSelected = (type) => {
    setSelectedPedidoType(type);
    setIsPedidoTypeSelectionModalOpen(false);
    setIsFinalizarPedidoModalOpen(true);
  };

  const handleCloseFinalizarPedidoModal = () => {
    setIsFinalizarPedidoModalOpen(false);
  };

  const handleAddMoreItems = () => {
    // Fecha o modal de finalização temporariamente para permitir adicionar mais itens
    setIsFinalizarPedidoModalOpen(false);
    // Opcional: mostrar uma mensagem informativa
    toast.info('Adicione mais itens ao seu pedido!');
  };


  if (empresaLoading || loadingContent || !isReady) {
    return (
      <div className="flex justify-center items-center h-screen">
        Carregando cardápio de {empresa?.nome_fantasia || 'sua empresa'}...
      </div>
    );
  }

  // Se há um erro e a empresa NÃO está aberta para pedidos online, exibe a mensagem de erro que desabilita a interação.
  // Isso cobre casos como empresa inativa, horários fechados, pedidos online desativados.
  // IMPORTANTE: Se o 'error' não for null, e a empresa não está "aberta para pedidos online",
  // significa que há uma restrição que o cliente deve ver.
  if (error && !isCurrentlyOpenForOrders) { 
    return (
      <div className="flex flex-col justify-center items-center h-screen text-red-500 text-center p-4">
        <p className="font-semibold text-lg mb-2">Ops! Algo deu errado ou a loja está fechada.</p>
        <p>{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Recarregar Página</Button>
      </div>
    );
  }
  
  // Condição para mostrar "Carregando" se ainda não terminou de carregar os produtos/categorias
  if (loadingContent) {
    return (
      <div className="flex justify-center items-center h-screen">
        Carregando cardápio de {empresa?.nome_fantasia || 'sua empresa'}...
      </div>
    );
  }


  const hasItemsInCart = itens.length > 0;
  const primaryColor = empresa?.cor_primaria_cardapio || '#FF5733';


  return (
    <div className="container mx-auto p-4 relative">
      {/*
        O TÍTULO, A LOGO E OS BOTÕES DE LOGIN/CADASTRO/LOGOUT
        SÃO RENDERIZADOS PELO LayoutCardapio (componente pai).
        Sua rota principal deve ter uma estrutura similar a:
        <Route path="/:slug/cardapio-publico" element={<LayoutCardapio userActions={<SeusBotoesDeLoginAqui/>}><PublicCardapioPage user={seuUserDoAuth}/></LayoutCardapio>} />
        A prop 'user' é passada para PublicCardapioPage.
      */}

      {/* Status de Aberto/Fechado (agora exibe a mensagem detalhada da função isRestaurantOpen) */}
      <p className={`text-center font-semibold text-lg mb-4 ${restaurantStatus.open ? 'text-green-600' : 'text-red-600'}`}>
        {restaurantStatus.message}
      </p>

      {/* Mensagem de alerta/informação sobre o status do pedido online */}
      {/* Esta mensagem é exibida SE pedidos não são possíveis, para explicar o motivo ao cliente. */}
      {!isCurrentlyOpenForOrders && ( 
          <div className="text-center text-orange-600 mb-6 p-4 border border-orange-300 bg-orange-50 rounded-md">
            <p className="font-semibold">⚠️ Pedidos Online Temporariamente Indisponíveis!</p>
            <p>{restaurantStatus.message}</p> {/* Usa a mensagem detalhada aqui */}
            {empresa.permitir_pedido_online === 0 && <p>Os pedidos online estão desativados pela empresa.</p>}
            {empresa.tempo_corte_pedido_online && (
              new Date().getHours() * 60 + new Date().getMinutes() >
              parseInt(empresa.tempo_corte_pedido_online.split(':')[0]) * 60 +
              parseInt(empresa.tempo_corte_pedido_online.split(':')[1])
            ) && (
              <p>Último pedido online até: {empresa.tempo_corte_pedido_online}</p>
            )}
            <p className="mt-2">Você pode visualizar o cardápio, mas não poderá adicionar itens ao carrinho ou finalizar o pedido.</p>
          </div>
      )}


      {/* Opções de Tipo de Pedido (apenas para clientes públicos) */}
      {canMakeOnlineOrder && ( // Somente mostra os botões se a empresa permite pedidos online no geral
        <div className="mb-6 flex justify-center space-x-4">
          <Button
            variant={selectedPedidoType === 'Delivery' ? 'default' : 'outline'}
            onClick={() => setSelectedPedidoType('Delivery')}
            disabled={empresa.desativar_entrega || !isCurrentlyOpenForOrders} // Desabilita se entrega desativada OU loja fechada
            className={empresa.desativar_entrega || !isCurrentlyOpenForOrders ? 'opacity-50 cursor-not-allowed' : ''}
          >
            <Bike className="mr-2" /> Delivery
          </Button>
          <Button
            variant={selectedPedidoType === 'Retirada' ? 'default' : 'outline'}
            onClick={() => setSelectedPedidoType('Retirada')}
            disabled={empresa.desativar_retirada || !isCurrentlyOpenForOrders} // Desabilita se retirada desativada OU loja fechada
            className={empresa.desativar_retirada || !isCurrentlyOpenForOrders ? 'opacity-50 cursor-not-allowed' : ''}
          >
            <Home className="mr-2" /> Retirada
          </Button>
          <Button
            variant={selectedPedidoType === 'Mesa' ? 'default' : 'outline'}
            onClick={() => setSelectedPedidoType('Mesa')}
            disabled={true} // Mesa sempre desabilitada para o cardápio público
            className={'opacity-50 cursor-not-allowed'}
          >
            <Utensils className="mr-2" /> Mesa
          </Button>
        </div>
      )}

      {/* Exibe valor mínimo de delivery se for Delivery e tiver valor configurado */}
      {selectedPedidoType === 'Delivery' && (parseFloat(empresa?.pedido_minimo_delivery) || 0) > 0 && (
        <p className="text-center text-gray-700 mb-4">
          Valor mínimo para delivery: <span className="font-semibold">R$ {parseFloat(empresa.pedido_minimo_delivery).toFixed(2).replace('.', ',')}</span>
        </p>
      )}


      {/* Filtros de Categoria e Busca */}
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


      {/* Lista de Categorias e Produtos */}
      <div className="space-y-8">
        {categorias.map(categoria => {
          // Garante que só produtos ATIVOS sejam exibidos e filtrados
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
                    // Desabilita o clique no card se não for possível fazer pedidos online
                    onClick={() => (isCurrentlyOpenForOrders) ? openProductModal(prod) : toast.info("A empresa não está aceitando pedidos online no momento.")}
                    style={{ opacity: (isCurrentlyOpenForOrders) ? 1 : 0.6 }} // Ajuste visual para desabilitado
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
                    {/* Botões +/- e contagem */}
                    {canMakeOnlineOrder && ( // Apenas mostra os botões se a empresa permite pedidos online no geral
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => handleQuickRemoveFromCart(e, prod)}
                          disabled={getProductCountInCart(prod.id) === 0 || !isCurrentlyOpenForOrders} // Desabilita se não tem no carrinho OU loja fechada
                          className="h-8 w-8"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-md font-medium w-6 text-center">
                          {getProductCountInCart(prod.id)}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => handleQuickAddToCart(e, prod)}
                          disabled={!isCurrentlyOpenForOrders} // Desabilita se loja fechada
                          className="h-8 w-8"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
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
    className="fixed bottom-4 right-4 md:right-8 lg:right-12 xl:right-16 w-auto p-4 rounded-full shadow-lg flex items-center space-x-3 z-50 transition-all duration-300 ease-in-out"
    style={{ backgroundColor: '#d32f2f', color: '#ffffff' }} // Vermelho delivery
  >
    <ShoppingCart className="h-6 w-6 flex-shrink-0 text-white" />
    <span className="text-lg font-bold whitespace-nowrap">Total: R$ {total.toFixed(2).replace('.', ',')}</span>

    <Button
      onClick={handleOpenFinalizarPedidoModal}
      variant="ghost"
      className="ml-auto border border-white text-sm font-semibold"
      style={{
        backgroundColor: 'white',
        color: '#d32f2f',
        padding: '0.5rem 1rem',
        borderRadius: '9999px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <CheckCircle className="mr-2 h-4 w-4" /> Finalizar Pedido
    </Button>
  </div>
)}



      {/* Modal de Detalhes do Produto / Adicionar ao Carrinho */}
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
              <Input type="number" value={productQuantity} onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)} className="w-16 text-center" disabled={!isCurrentlyOpenForOrders} />
              <Button onClick={() => setProductQuantity(prev => prev + 1)} disabled={!isCurrentlyOpenForOrders}>+</Button>
            </div>
            {/* Seção de Adicionais */}
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
            {/* Mostrar valor total atualizado */}
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

      {/* MODAIS DE CLIENTE PÚBLICO */}
      <Dialog open={isFinalizarPedidoModalOpen} onOpenChange={setIsFinalizarPedidoModalOpen}>
        <DialogContent>
          <FinalizarPedido
            pedidoType={selectedPedidoType}
            onClose={handleCloseFinalizarPedidoModal}
            empresa={empresa}
            // 'user' não precisa ser passado aqui, FinalizarPedido agora pega via useAuth()
            limparCarrinho={limparCarrinho}
            total={total}
            itens={itens}
            onAddMoreItems={handleAddMoreItems}
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
    </div>
  );
};

export default PublicCardapioPage;