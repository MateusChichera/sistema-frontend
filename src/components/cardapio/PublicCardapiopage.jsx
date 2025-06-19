// frontend/src/components/cardapio/PublicCardapioPage.jsx
// ESTE ARQUIVO É O CARDÁPIO EXCLUSIVO PARA PEDIDOS ONLINE (CLIENTES)
import React, { useEffect, useState } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCarrinho } from '../../contexts/CarrinhoContext';
import api from '../../services/api';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog'; 
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ShoppingCart, Home, Bike, CheckCircle, User, LogIn, UserPlus, LogOut } from 'lucide-react';
import FinalizarPedido from './FinalizarPedido';
import LoginRegisterModal from './LoginRegisterModal';
import PedidoTypeSelectionModal from './PedidoTypeSelectionModal';


// Função para remover acentos (para busca)
const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Função para checar se a empresa está aberta
const isRestaurantOpen = (horarioFuncionamento) => {
  if (!horarioFuncionamento) return true;

  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  const dayParts = horarioFuncionamento.split(':')[0].trim();
  const timeParts = horarioFuncionamento.split(':')[1].trim();

  const daysMap = {
    'Seg': 1, 'Ter': 2, 'Qua': 3, 'Qui': 4, 'Sex': 5, 'Sab': 6, 'Dom': 0,
    'Seg-Sex': [1,2,3,4,5], 'Sab-Dom': [6,0], 'Todos': [0,1,2,3,4,5,6]
  };

  let isTodayIncluded = false;
  if (dayParts.includes('-')) {
      const [startDayStr, endDayStr] = dayParts.split('-');
      const startDay = daysMap[startDayStr];
      const endDay = daysMap[endDayStr];
      if (startDay !== undefined && endDay !== undefined) {
          if (startDay <= endDay) {
              isTodayIncluded = (dayOfWeek >= startDay && dayOfWeek <= endDay);
          } else {
              isTodayIncluded = (dayOfWeek >= startDay || dayOfWeek <= endDay);
          }
      }
  } else if (dayParts.includes(',')) {
      isTodayIncluded = dayParts.split(',').some(d => daysMap[d.trim()] === dayOfWeek);
  } else {
      isTodayIncluded = (daysMap[dayParts] === dayOfWeek);
  }

  if (!isTodayIncluded) return false;

  const [openTimeStr, closeTimeStr] = timeParts.split('-');
  const openTimeMinutes = parseInt(openTimeStr.replace('h', '')) * 60 + (openTimeStr.includes(':') ? parseInt(openTimeStr.split(':')[1]) : 0);
  const closeTimeMinutes = parseInt(closeTimeStr.replace('h', '')) * 60 + (closeTimeStr.includes(':') ? parseInt(closeTimeStr.split(':')[1]) : 0);

  if (closeTimeMinutes < openTimeMinutes) {
      return currentTimeMinutes >= openTimeMinutes || currentTimeMinutes <= closeTimeMinutes;
  } else {
      return currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes;
  }
};


const PublicCardapioPage = () => { // Renomeado para PublicCardapioPage
  const { empresa, loading: empresaLoading, isReady } = useEmpresa();
  const { user, logout } = useAuth(); // Apenas para saber se está logado como cliente
  const { adicionarItem, total, itens, limparCarrinho } = useCarrinho();

  const [loadingContent, setLoadingContent] = useState(true);
  const [error, setError] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [filteredProdutos, setFilteredProdutos] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productQuantity, setProductQuantity] = useState(1);
  const [productObservation, setProductObservation] = useState('');

  // Filtros
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Cliente: Finalizar Pedido
  const [selectedPedidoType, setSelectedPedidoType] = useState(null); // Null inicialmente, para abrir modal de escolha
  const [isFinalizarPedidoModalOpen, setIsFinalizarPedidoModalOpen] = useState(false);
  const [isPedidoTypeSelectionModalOpen, setIsPedidoTypeSelectionModalOpen] = useState(false);


  // Cliente: Login/Cadastro
  const [isLoginRegisterModalOpen, setIsLoginRegisterModalOpen] = useState(false);


  // Efeito para buscar dados do cardápio
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
      
      const isOpen = isRestaurantOpen(empresa.horario_funcionamento);
      const cutoffTimeStr = empresa.tempo_corte_pedido_online;
      const now = new Date();
      let isAfterCutoff = false;
      if (cutoffTimeStr) {
          const [cutoffHour, cutoffMinute] = cutoffTimeStr.split(':').map(Number);
          const cutoffTimeMinutes = cutoffHour * 60 + cutoffMinute;
          const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
          isAfterCutoff = currentTimeMinutes > cutoffTimeMinutes;
      }

      if ((!isOpen || (cutoffTimeStr && isAfterCutoff)) && (!user || !user.role)) { // <--- Verificação de horário de corte aqui
        setError(`"${empresa.nome_fantasia}" está fechado(a) ou fora do horário de pedidos online (${empresa.horario_funcionamento}).`);
        setLoadingContent(false);
        return;
      }
      
      if (empresa.permitir_pedido_online === 0 && (!user || !user.role)) { // <--- Verificação de permitir pedido online aqui
        setError(`Os pedidos online para "${empresa.nome_fantasia}" estão temporariamente desativados. Apenas a visualização do cardápio está disponível.`);
        setLoadingContent(false);
        return;
      }

      setLoadingContent(true);
      setError(null);
      try {
        const categoriasResponse = await api.get(`/${empresa.slug}/cardapio/categorias`);
        const fetchedCategorias = categoriasResponse.data;

        const produtosResponse = await api.get(`/${empresa.slug}/cardapio/produtos`);
        const fetchedProdutos = produtosResponse.data;
        
        let finalCategorias = [...fetchedCategorias];
        let finalProdutos = [...fetchedProdutos];

        const promoProducts = fetchedProdutos.filter(p => p.promo_ativa && p.ativo);
        if (promoProducts.length > 0 && empresa.mostrar_promocoes_na_home) {
            const promoCategory = { id: 'promo', descricao: '🔥 Promoções', ativo: true };
            finalCategorias = [promoCategory, ...fetchedCategorias];
        }
        setCategorias(finalCategorias);
        setProdutos(finalProdutos);

        if (empresa.mostrar_promocoes_na_home) {
            setFilteredProdutos(finalProdutos.filter(p => p.promo_ativa && p.ativo));
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
  }, [empresa, isReady, user]);


  useEffect(() => {
    let currentFiltered = produtos;

    if (selectedCategoryId === 'promo') {
        currentFiltered = produtos.filter(prod => prod.promo_ativa && prod.ativo);
    } else if (selectedCategoryId !== 'all') {
      currentFiltered = currentFiltered.filter(prod => prod.id_categoria.toString() === selectedCategoryId);
    } else {
        currentFiltered = produtos; 
    }

    if (searchTerm) {
      const cleanedSearchTerm = removeAccents(searchTerm).toLowerCase();
      currentFiltered = currentFiltered.filter(prod =>
        removeAccents(prod.nome).toLowerCase().includes(cleanedSearchTerm) ||
        removeAccents(prod.descricao).toLowerCase().includes(cleanedSearchTerm)
      );
    }
    setFilteredProdutos(currentFiltered);
  }, [produtos, selectedCategoryId, searchTerm, empresa?.mostrar_promocoes_na_home]);


  const openProductModal = (product) => {
    setSelectedProduct(product);
    setProductQuantity(1);
    setProductObservation('');
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    setProductQuantity(1);
    setProductObservation('');
  };

  const handleAddToCart = () => {
    if (selectedProduct) {
      adicionarItem({ ...selectedProduct, observacoes: productObservation }, productQuantity);
      closeProductModal();
    }
  };


  // Cliente: Lógica para abrir modal Finalizar Pedido (agora abre modal de seleção de tipo)
  const handleOpenFinalizarPedidoModal = () => {
    if (itens.length === 0) {
      toast.error('O carrinho está vazio para finalizar o pedido!');
      return;
    }
    setIsPedidoTypeSelectionModalOpen(true); // Abre o modal de escolha Delivery/Retirada
  };

  // Callback do PedidoTypeSelectionModal para abrir o FinalizarPedido
  const handlePedidoTypeSelected = (type) => {
    setSelectedPedidoType(type);
    setIsPedidoTypeSelectionModalOpen(false); // Fecha o modal de seleção
    setIsFinalizarPedidoModalOpen(true); // Abre o modal de Finalizar Pedido com o tipo selecionado
  };

  const handleCloseFinalizarPedidoModal = () => {
    setIsFinalizarPedidoModalOpen(false);
  };
  
  const canMakeOnlineOrder = empresa?.permitir_pedido_online;


  if (empresaLoading || loadingContent || !isReady) {
    return (
      <div className="flex justify-center items-center h-screen">
        Carregando cardápio de {empresa?.nome_fantasia || 'sua empresa'}...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        {error}
      </div>
    );
  }
  
  const hasItemsInCart = itens.length > 0;
  const primaryColor = empresa?.cor_primaria_cardapio || '#FF5733';


  return (
    <div className="container mx-auto p-4 relative">
      {/* Botões de Login/Cadastro (Topo Direito) */}
      {!user ? (
        <div className="absolute top-4 right-4 flex space-x-2 z-10">
          <Button variant="outline" size="sm" onClick={() => setIsLoginRegisterModalOpen(true)}>
            <LogIn className="mr-2 h-4 w-4" /> Entrar
          </Button>
          <Button variant="default" size="sm" onClick={() => { setIsLoginRegisterModalOpen(true); /* set default to register tab */ }}>
            <UserPlus className="mr-2 h-4 w-4" /> Cadastrar
          </Button>
        </div>
      ) : (
        <div className="absolute top-4 right-4 flex space-x-2 items-center z-10">
            <span className="text-sm text-gray-700">Olá, {user.nome}!</span>
            <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" /> Sair
            </Button>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center"
          style={{ color: primaryColor }}>
        Cardápio Digital de {empresa?.nome_fantasia || 'Empresa'}
      </h1>
      
      {/* Status de Aberto/Fechado */}
      <p className={`text-center font-semibold text-lg mb-4 ${isRestaurantOpen(empresa.horario_funcionamento) ? 'text-green-600' : 'text-red-600'}`}>
        {isRestaurantOpen(empresa.horario_funcionamento) ? 'Aberto(a) agora!' : 'Fechado(a) no momento.'}
      </p>

      {empresa?.logo_full_url && (
        <div className="mb-6 flex justify-center">
          <img 
            src={empresa.logo_full_url} 
            alt={empresa.nome_fantasia || 'Logo'} 
            className="h-24 w-auto rounded-lg shadow-md object-contain"
          />
        </div>
      )}

      {/* Opções de Tipo de Pedido (apenas para clientes públicos) */}
      {canMakeOnlineOrder && (
        <div className="mb-6 flex justify-center space-x-4">
          <Button 
            variant={selectedPedidoType === 'Delivery' ? 'default' : 'outline'}
            onClick={() => setSelectedPedidoType('Delivery')}
            disabled={empresa.desativar_entrega}
            className={empresa.desativar_entrega ? 'opacity-50 cursor-not-allowed' : ''}
          >
            <Bike className="mr-2" /> Delivery
          </Button>
          <Button 
            variant={selectedPedidoType === 'Retirada' ? 'default' : 'outline'}
            onClick={() => setSelectedPedidoType('Retirada')}
            disabled={empresa.desativar_retirada}
            className={empresa.desativar_retirada ? 'opacity-50 cursor-not-allowed' : ''}
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
      
      {/* Mensagem se pedidos online não são permitidos para clientes */}
      {!canMakeOnlineOrder && (
          <div className="text-center text-orange-600 mb-6 p-4 border border-orange-300 bg-orange-50 rounded-md">
              <p>Os pedidos online estão temporariamente desativados. Apenas a visualização do cardápio está disponível.</p>
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
          const produtosParaExibir = categoria.id === 'promo' ? filteredProdutos.filter(p => p.promo_ativa && p.ativo) : filteredProdutos.filter(prod => prod.id_categoria === categoria.id && prod.ativo);
          
          if (produtosParaExibir.length === 0) return null;

          return (
            <div key={categoria.id} className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4 text-gray-700 border-b pb-2">{categoria.descricao}</h2>
              <div className={`grid gap-4 ${empresa?.layout_cardapio === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {produtosParaExibir.map(prod => (
                  <div 
                    key={prod.id} 
                    className="border p-4 rounded-lg flex items-center space-x-4 hover:bg-gray-50 cursor-pointer" 
                    onClick={() => (canMakeOnlineOrder) ? openProductModal(prod) : toast.info("Pedidos desativados para esta empresa.")}
                    style={{ opacity: (canMakeOnlineOrder) ? 1 : 0.6 }}
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
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão flutuante do carrinho / finalizar pedido */}
      {itens.length > 0 && (canMakeOnlineOrder) && (
        <div className="fixed bottom-4 right-4 md:right-8 lg:right-12 xl:right-16 w-auto p-4 text-primary-foreground rounded-full shadow-lg flex items-center space-x-2 z-50 transform translate-x-0 transition-all duration-300 ease-in-out" 
             style={{ backgroundColor: primaryColor }}>
            <ShoppingCart className="h-6 w-6 flex-shrink-0" />
            <span className="text-lg font-bold whitespace-nowrap" style={{color: 'white'}}>Total: R$ {total.toFixed(2).replace('.', ',')}</span>
            
            <Button onClick={handleOpenFinalizarPedidoModal} variant="secondary" className="ml-auto flex-shrink-0">
              <CheckCircle className="mr-2" /> Finalizar Pedido
            </Button>
        </div>
      )}


      {/* Modal de Detalhes do Produto / Adicionar ao Carrinho */}
      <Dialog open={!!selectedProduct} onOpenChange={closeProductModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedProduct?.nome}</DialogTitle>
            <DialogDescription> {/* Agora com span para conteúdo interno */}
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
              <Button onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))}>-</Button>
              <Input type="number" value={productQuantity} onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)} className="w-16 text-center" />
              <Button onClick={() => setProductQuantity(productQuantity + 1)}>+</Button>
            </div>
            <div>
              <Label htmlFor="observacao">Observações (opcional)</Label>
              <Textarea id="observacao" value={productObservation} onChange={(e) => setProductObservation(e.target.value)} placeholder="Ex: Sem cebola, bem passado..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddToCart}>Adicionar ao Carrinho</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAIS DE CLIENTE PÚBLICO - MOVIDOS AQUI */}
      <Dialog open={isFinalizarPedidoModalOpen} onOpenChange={setIsFinalizarPedidoModalOpen}>
        <DialogContent>
          <FinalizarPedido 
            pedidoType={selectedPedidoType} 
            onClose={handleCloseFinalizarPedidoModal}
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

export default PublicCardapioPage; // Renomeado para PublicCardapioPage