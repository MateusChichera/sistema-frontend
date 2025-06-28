// frontend/src/components/cardapio/CardapioPage.jsx
// ESTE ARQUIVO AGORA É O CARDÁPIO EXCLUSIVO PARA GARÇONS/FUNCIONÁRIOS (COMANDA)
import React, { useEffect, useState, useCallback } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../ui/select'; 
import { ShoppingCart, Utensils, LogOut, Plus, Minus, XCircle, SquarePen, ListFilter } from 'lucide-react'; 
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'; 
import { Badge } from '../ui/badge'; 
import { useNavigate } from 'react-router-dom'; 

// REMOVIDO: import LayoutCardapio from '../layout/LayoutCardapio'; // Não é importado aqui


// Função para remover acentos (para busca)
const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};


const CardapioPage = () => {
  const { empresa, loading: empresaLoading, isReady } = useEmpresa();
  const { user, token, logout } = useAuth(); // Logout será usado apenas para redirecionar
  const { adicionarItem, total, itens, limparCarrinho, atualizarQuantidadeItem, removerItem, adicionarObservacaoItem } = useCarrinho();
  const navigate = useNavigate();

  const [loadingContent, setLoadingContent] = useState(true);
  const [error, setError] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]); 
  const [filteredProdutos, setFilteredProdutos] = useState([]);
  
  // selectedProduct para o modal de observações de produto (ao clicar no card do produto)
  const [selectedProduct, setSelectedProduct] = useState(null); 
  // productQuantityInModal é a quantidade que será adicionada/atualizada via modal
  const [productQuantityInModal, setProductQuantityInModal] = useState(1); 
  // productObservationInModal é a observação digitada no modal
  const [productObservationInModal, setProductObservationInModal] = useState(''); 


  // Estado para a mesa selecionada para o pedido
  const [selectedMesaForOrder, setSelectedMesaForOrder] = useState(null); 

  // Estado para edição de observação do item no carrinho (dentro do modal de finalizar)
  const [isEditingObservation, setIsEditingObservation] = useState(false);
  const [itemToEditObservation, setItemToEditObservation] = useState(null); 
  const [currentObservation, setCurrentObservation] = useState(''); 


  // Filtros (para a tela de produtos)
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Garçom: Pedido de Mesa (Comanda) Modal
  const [isMesaOrderModalOpen, setIsMesaOrderModalOpen] = useState(false);
  const [mesas, setMesas] = useState([]); 
  const [selectedMesaId, setSelectedMesaId] = useState(''); 
  const [qtdPessoas, setQtdPessoas] = useState('');
  const [pedidoObservacoesMesa, setPedidoObservacoesMesa] = useState(''); 
  const [nomeClienteMesa, setNomeClienteMesa] = useState(''); 
  const [existingOrderForMesa, setExistingOrderForMesa] = useState(null); 

  // NOVO: Estado para organizar mesas
  const [organizeMesasByStatus, setOrganizeMesasByStatus] = useState(false);


  // Efeito para buscar dados do cardápio e mesas
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
      
      if (!user || !['Funcionario', 'Caixa', 'Gerente', 'Proprietario'].includes(user.role)) {
        setError('Acesso negado. Este cardápio é apenas para uso interno de funcionários.');
        setLoadingContent(false);
        return;
      }

      setLoadingContent(true);
      setError(null);
      try {
        const categoriasResponse = await api.get(`/gerencial/${empresa.slug}/categorias`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const fetchedCategorias = categoriasResponse.data;

        const produtosResponse = await api.get(`/gerencial/${empresa.slug}/produtos`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const fetchedProdutos = produtosResponse.data;
        
        let finalCategorias = [...fetchedCategorias];
        let finalProdutos = [...fetchedProdutos];

        const promoProducts = fetchedProdutos.filter(p => p.promo_ativa && p.ativo);
        if (promoProducts.length > 0) {
            const promoCategory = { id: 'promo', descricao: '🔥 Promoções', ativo: true };
            finalCategorias = [promoCategory, ...fetchedCategorias];
        }
        setCategorias(finalCategorias);
        setProdutos(finalProdutos);
        setFilteredProdutos(finalProdutos);


        const mesasResponse = await api.get(`/gerencial/${empresa.slug}/mesas`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const allActiveMesas = mesasResponse.data.filter(mesa => mesa.ativo);
        setMesas(allActiveMesas);

        toast.success("Cardápio de Comandas carregado!");

      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao carregar cardápio de comandas.');
        console.error("Erro ao carregar cardápio de comandas:", err);
        toast.error(err.response?.data?.message || 'Erro ao carregar cardápio de comandas.');
      } finally {
        setLoadingContent(false);
      }
    };

    fetchCardapioData();
  }, [empresa, isReady, user, token]);


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


  // FUNÇÕES PARA O MODAL DE OBSERVAÇÕES DE PRODUTO (ao clicar no card do produto)
  const openProductObservationModal = (product) => {
    setSelectedProduct(product);
    // Tenta encontrar o item no carrinho para pré-preencher quantidade e observação
    // Buscamos um item genérico (sem observação específica) ou o primeiro com esse ID de produto
    const itemInCart = itens.find(item => item.id_produto === product.id); 
    setProductQuantityInModal(itemInCart ? itemInCart.quantidade : 1);
    setProductObservationInModal(itemInCart ? itemInCart.observacoes : ''); // Pré-preenche com a obs do item encontrado (se houver)
  };

  const closeProductObservationModal = () => {
    setSelectedProduct(null);
    setProductQuantityInModal(1);
    setProductObservationInModal('');
  };

  const handleAddProductToCartFromModal = () => {
    if (selectedProduct) {
      // Quando adicionado/atualizado via modal, sempre usamos a observação e quantidade do modal
      // O CarrinhoContext cuidará de agrupar se produto+obs já existir.
      adicionarItem(
        { 
            id: selectedProduct.id, 
            nome: selectedProduct.nome,
            preco: selectedProduct.preco,
            promocao: selectedProduct.promocao,
            promo_ativa: selectedProduct.promo_ativa,
            foto_url: selectedProduct.foto_url,
        }, 
        productQuantityInModal, 
        productObservationInModal // Passa a observação do modal
      );
      closeProductObservationModal();
    }
  };


  // Lógica para adicionar/atualizar quantidade direto no card do produto (botões + e -)
  const handleQuantityChangeOnCard = (product, newQuantity) => {
    // Busca um item existente para saber qual observação atualizar.
    // Se há múltiplos com o mesmo produto, a lógica aqui é mais simples:
    // Altera a quantidade do primeiro item do produto que encontrar (com qualquer observação).
    const itemInCart = itens.find(item => item.id_produto === product.id); 
    
    if (itemInCart) { 
        if (newQuantity <= 0) {
            removerItem(product.id, itemInCart.observacoes);
        } else {
            // Atualiza a quantidade do item existente, mantendo sua observação original.
            atualizarQuantidadeItem(product.id, newQuantity, itemInCart.observacoes); 
        }
    } else if (newQuantity > 0) { // Se o item não está no carrinho e o usuário digitou uma quantidade > 0
        adicionarItem(product, newQuantity, ''); // Adiciona sem observação
    }
  };

  const handleIncrementOnCard = (product) => {
    // Busca o item no carrinho para saber qual observação atualizar, se já existir.
    const itemInCart = itens.find(item => item.id_produto === product.id);
    if (itemInCart) { // Se já está no carrinho, só incrementa
        atualizarQuantidadeItem(product.id, itemInCart.quantidade + 1, itemInCart.observacoes);
    } else { // Se não está no carrinho, adiciona 1 unidade, sem observação
        adicionarItem(product, 1, '');
    }
  };

  const handleDecrementOnCard = (product) => {
    const itemInCart = itens.find(item => item.id_produto === product.id);
    if (itemInCart && itemInCart.quantidade > 1) {
        atualizarQuantidadeItem(product.id, itemInCart.quantidade - 1, itemInCart.observacoes);
    } else if (itemInCart && itemInCart.quantidade === 1) {
        removerItem(product.id, itemInCart.observacoes);
    }
  };


  // Lógica para finalizar ou adicionar ao pedido de mesa
  const handleFinalizarOuAdicionarPedidoMesa = async (e) => {
    e.preventDefault();
    if (itens.length === 0) {
      toast.error('O carrinho está vazio!');
      return;
    }
    if (!selectedMesaId) {
      toast.error('Selecione o número da mesa.');
      return;
    }
    if (!user || (!['Funcionario', 'Caixa', 'Gerente', 'Proprietario'].includes(user.role)) || !token) {
        toast.error('Apenas funcionários logados podem fazer pedidos de mesa.');
        return;
    }

    setLoadingContent(true);
    try {
      // Mapeia itens do carrinho para o formato esperado pelo backend
      const itensParaEnviar = itens.map(item => ({
        id_produto: item.id_produto,
        quantidade: item.quantidade,
        observacoes: item.observacoes // Observação por item
      }));

      // Se existingOrderForMesa é um objeto de pedido (significa que já existe um pedido ativo para a mesa)
      if (existingOrderForMesa?.id) { 
        await api.post(`/gerencial/${empresa.slug}/pedidos/${existingOrderForMesa.id}/adicionar-itens`, {
            itens: itensParaEnviar,
            id_funcionario: user.id 
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(`Itens adicionados à comanda da Mesa ${existingOrderForMesa.numero_mesa}!`);
      } else { 
        const pedidoData = {
          id_mesa: parseInt(selectedMesaId),
          tipo_entrega: 'Mesa',
          observacoes: pedidoObservacoesMesa, 
          itens: itensParaEnviar,
          nome_cliente_mesa: nomeClienteMesa,
          qtd_pessoas: qtdPessoas ? parseInt(qtdPessoas) : null,
          id_funcionario: user.id 
        };
        await api.post(`/${empresa.slug}/pedidos`, pedidoData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Novo pedido de mesa realizado com sucesso!');
      }

      setIsMesaOrderModalOpen(false);
      limparCarrinho(); 
      // Resetar campos do modal de mesa
      setSelectedMesaId('');
      setQtdPessoas('');
      setPedidoObservacoesMesa('');
      setNomeClienteMesa('');
      setExistingOrderForMesa(null); 
      // Recarregar status das mesas para refletir o novo pedido
      const mesasResponse = await api.get(`/gerencial/${empresa.slug}/mesas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMesas(mesasResponse.data.filter(mesa => mesa.ativo));

      // IMPORTANTE: VOLTAR PARA A TELA DE MESAS APÓS O PEDIDO
      setSelectedMesaForOrder(null); 

    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao finalizar/adicionar ao pedido de mesa.');
      toast.error(err.response?.data?.message || 'Erro ao finalizar/adicionar ao pedido de mesa.');
      console.error("Erro ao finalizar/adicionar ao pedido de mesa:", err);
    } finally {
      setLoadingContent(false);
    }
  };

  // Efeito para buscar comanda existente ao selecionar mesa no modal de finalizar
  useEffect(() => {
    const fetchExistingOrder = async () => {
        const selectedMesaObj = mesas.find(m => m.id.toString() === selectedMesaId);
        // Só busca se tem mesa selecionada E se for funcionário E se a mesa NÃO estiver LIVRE
        if (selectedMesaId && selectedMesaObj && selectedMesaObj.status !== 'Livre' && user?.role && ['Funcionario', 'Caixa', 'Gerente', 'Proprietario'].includes(user.role) && token) {
            try {
                // Busca pedidos PENDENTES ou PREPARANDO para a mesa selecionada
                const response = await api.get(`/gerencial/${empresa.slug}/pedidos?id_mesa=${selectedMesaId}&status=Pendente,Preparando`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data.length > 0) {
                    setExistingOrderForMesa(response.data[0]);
                    toast.info(`Mesa ${response.data[0].numero_mesa} tem uma comanda aberta (Pedido #${response.data[0].numero_pedido}).`);
                } else {
                    // Mesa ocupada/reservada mas sem pedido ativo (pode ter sido finalizado fora do sistema ou erro)
                    setExistingOrderForMesa(null); 
                }
            } catch (err) {
                console.error("Erro ao buscar comanda existente:", err);
                setExistingOrderForMesa(null);
            }
        } else {
            setExistingOrderForMesa(null); // Mesa está livre ou não é garçom. Setando para null garante novo pedido.
        }
    };
    fetchExistingOrder();
  }, [selectedMesaId, user, token, empresa, mesas]);


  // Cores para os cards de mesa
  const getMesaCardColor = (status) => {
    switch (status) {
      case 'Ocupada': return 'bg-orange-500 text-white';
      case 'Livre': return 'bg-green-500 text-white';
      case 'Reservada': return 'bg-blue-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const primaryColor = empresa?.cor_primaria_cardapio || '#FF5733';

  // Handler para abrir o modal de observação (do item NO CARRINHO - usado no modal de finalizar)
  const openEditObservationModal = (item) => {
    setItemToEditObservation(item); // O item é o item DO CARRINHO
    setCurrentObservation(item.observacoes || '');
    setIsEditingObservation(true);
  };

  // Handler para salvar a observação (do item NO CARRINHO - usado no modal de finalizar)
  const saveObservation = () => {
    if (itemToEditObservation) {
      // Passa o ID do produto, a nova observação e a observação antiga (para identificar o item corretamente)
      adicionarObservacaoItem(itemToEditObservation.id_produto, currentObservation, itemToEditObservation.observacoes);
      setIsEditingObservation(false);
      setItemToEditObservation(null);
      setCurrentObservation('');
    }
  };

  // Função para redirecionar após logout
  const handleLogout = () => {
    logout();
    navigate('/gerencial/login'); // Redireciona para a tela de login
  };

  // NOVO: Função para organizar as mesas por status
  const getOrganizedMesas = useCallback(() => {
    if (!organizeMesasByStatus) {
      return mesas.sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true })); // Retorna na ordem alfabética/numérica padrão
    }

    const mesasLivre = mesas.filter(m => m.status === 'Livre');
    const mesasOcupada = mesas.filter(m => m.status === 'Ocupada');
    const mesasReservada = mesas.filter(m => m.status === 'Reservada');
    const outrasMesas = mesas.filter(m => !['Livre', 'Ocupada', 'Reservada'].includes(m.status));

    // Ordena por número dentro de cada grupo para consistência
    mesasLivre.sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }));
    mesasOcupada.sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }));
    mesasReservada.sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }));
    outrasMesas.sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }));

    return [...mesasLivre, ...mesasOcupada, ...mesasReservada, ...outrasMesas];
  }, [mesas, organizeMesasByStatus]);


  // --- Renderização do Componente ---
  // A CardapioPage NÃO renderiza mais o LayoutCardapio por fora, ela é o CHILDREN do LayoutCardapio.
  // Os estados de carregamento e erro são tratados aqui, mas o invólucro visual é do LayoutCardapio.
  if (empresaLoading || loadingContent || !isReady) {
    return (
      <div className="flex justify-center items-center h-full">
        Carregando cardápio de {empresa?.nome_fantasia || 'sua empresa'}...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full text-red-500">
        {error}
      </div>
    );
  }
  
  const hasItemsInCart = itens.length > 0;
  const isGarcomAllowed = user?.role && ['Funcionario', 'Caixa', 'Gerente', 'Proprietario'].includes(user.role);

  if (!isGarcomAllowed) { 
    return (
      <div className="p-4 text-center text-red-600">Acesso negado. Este cardápio é apenas para uso interno de funcionários.</div>
    );
  }

  return (
    // ATENÇÃO: ESTE DIV ENVOLVE TODO O CONTEÚDO PRINCIPAL QUE SERÁ INSERIDO NO <main> DO LAYOUTCARDAPIO
    <div className="container mx-auto p-4 relative">
      {/* Removido qualquer H1 ou elementos de layout de topo/rodapé duplicados. */}
      {/* O título principal da empresa está no LayoutCardapio. */}
      
      {/* Renderização Condicional: Mesas ou Produtos */}
      {!selectedMesaForOrder ? (
        // --- TELA DE SELEÇÃO DE MESAS ---
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-700">Selecione uma Mesa</h2> {/* Título da seção */}
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setOrganizeMesasByStatus(prev => !prev)}
                className="flex items-center space-x-1"
            >
                <ListFilter className="h-4 w-4" /> 
                <span>{organizeMesasByStatus ? 'Ordem Padrão' : 'Organizar por Status'}</span>
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {getOrganizedMesas().map(mesa => ( 
              <Card 
                key={mesa.id} 
                className={`flex flex-col items-center justify-center p-4 rounded-lg shadow-md cursor-pointer transition-all duration-200 
                  ${getMesaCardColor(mesa.status)} hover:shadow-lg`}
                onClick={() => {
                  setSelectedMesaForOrder(mesa);
                  setSelectedMesaId(mesa.id.toString()); 
                }}
              >
                <CardTitle className="text-6xl font-extrabold">{mesa.numero}</CardTitle>
                <CardContent className="mt-2 text-center text-sm">
                  {mesa.status}
                  {mesa.capacidade && ` (Cap: ${mesa.capacidade})`}
                </CardContent>
              </Card>
            ))}
            {mesas.length === 0 && <p className="col-span-full text-center text-gray-600">Nenhuma mesa ativa encontrada.</p>}
          </div>
        </div>
      ) : (
        // --- TELA DE PRODUTOS (APÓS SELECIONAR UMA MESA) ---
        <>
          <div className="mb-4 text-lg flex items-center justify-between">
            <div>
                <span className="font-bold">Mesa Selecionada: </span> 
                <Badge className={`${getMesaCardColor(selectedMesaForOrder.status)} text-lg px-3 py-1`}>
                {selectedMesaForOrder.numero} - {selectedMesaForOrder.status}
                </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedMesaForOrder(null)}>
              Voltar para Mesas
            </Button>
          </div>

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
              const produtosParaExibir = categoria.id === 'promo' 
                ? filteredProdutos.filter(p => p.promo_ativa) 
                : filteredProdutos.filter(prod => prod.id_categoria === categoria.id);
              
              if (produtosParaExibir.length === 0) return null;

              return (
                <div key={categoria.id} className="bg-white p-4 rounded-lg shadow-md">
                  <h2 className="text-2xl font-semibold mb-4 text-gray-700 border-b pb-2">{categoria.descricao}</h2>
                  <div className={`grid gap-4 ${empresa?.layout_cardapio === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                    {produtosParaExibir.map(prod => {
                        // Buscamos o item no carrinho para aquele ID de produto, com qualquer observação
                        // O totalQuantityInCart será a soma das quantidades de todas as observações do mesmo produto
                        const totalQuantityInCart = itens
                            .filter(item => item.id_produto === prod.id)
                            .reduce((sum, item) => sum + item.quantidade, 0);

                        const finalPrice = prod.promo_ativa && prod.promocao ? parseFloat(prod.promocao) : parseFloat(prod.preco);

                        return (
                            <Card 
                                key={prod.id} 
                                className="flex flex-col md:flex-row items-center p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                                // AÇÃO DO CLIQUE NO CARD: Abre o modal de observação
                                onClick={() => openProductObservationModal(prod)} 
                            >
                                {prod.foto_url && (
                                    <img
                                        src={`${api.defaults.baseURL.replace('/api/v1', '')}${prod.foto_url}`}
                                        alt={prod.nome}
                                        className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-md flex-shrink-0 mr-4 mb-2 md:mb-0" 
                                    />
                                )}
                                <div className="flex-1 flex flex-col justify-between w-full md:w-auto">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">{prod.nome}</h3>
                                        <p className="text-gray-600 text-sm">{prod.descricao}</p>
                                        {prod.promo_ativa && prod.promocao ? (
                                            <p className="font-bold text-lg mt-1" style={{ color: primaryColor }}>
                                                <span className="line-through text-gray-500 mr-2">R$ {parseFloat(prod.preco || 0).toFixed(2).replace('.', ',')}</span>
                                                <span style={{ color: '#22C55E' }}>R$ {finalPrice.toFixed(2).replace('.', ',')}</span>
                                            </p>
                                        ) : (
                                            <p className="text-gray-800 font-bold text-lg mt-1">R$ {finalPrice.toFixed(2).replace('.', ',')}</p>
                                        )}
                                    </div>
                                    {/* Botões de quantidade * /}
                                    <div className="flex items-center space-x-2 mt-2 self-end md:self-auto">
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={(e) => { e.stopPropagation(); handleDecrementOnCard(prod); }} // impede clique no card
                                        >
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <Input 
                                            type="number" 
                                            value={totalQuantityInCart} // Exibe a quantidade total desse produto no carrinho
                                            onChange={(e) => { e.stopPropagation(); handleQuantityChangeOnCard(prod, parseInt(e.target.value) || 0); }} 
                                            className="w-16 text-center" 
                                            min="0" 
                                            onClick={(e) => e.stopPropagation()} // impede clique no card
                                        />
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={(e) => { e.stopPropagation(); handleIncrementOnCard(prod); }} // impede clique no card
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                        { Botão para editar observação do item no carrinho */}
                                        {totalQuantityInCart > 0 && (
                                            <span className="text-sm font-semibold whitespace-nowrap">
                                                Subtotal: R$ {(totalQuantityInCart * finalPrice).toFixed(2).replace('.', ',')}
                                            </span>
                                        )}
                                    </div>
                                
                            </Card>
                        );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão flutuante do carrinho / finalizar pedido */}
          {hasItemsInCart && (
            <div
              className="fixed bottom-4 right-4 md:right-8 lg:right-12 xl:right-16 w-auto p-4 rounded-full shadow-lg flex items-center space-x-3 z-50 transition-all duration-300 ease-in-out"
              style={{ backgroundColor: '#d32f2f', color: 'white' }} // fundo vermelho escuro
            >
              <ShoppingCart className="h-6 w-6 flex-shrink-0 text-white" />
              <span className="text-lg font-bold whitespace-nowrap">Total: R$ {total.toFixed(2).replace('.', ',')}</span> 

              <Button
                onClick={() => setIsMesaOrderModalOpen(true)}
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
                <Utensils className="mr-2 h-4 w-4" /> Finalizar Mesa
              </Button>
            </div>
          )}

        </>
      )}

      {/* Modal de Detalhes do Produto / Adicionar ao Carrinho (para observações) */}
      <Dialog open={!!selectedProduct} onOpenChange={closeProductObservationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedProduct?.nome}</DialogTitle>
            <DialogDescription>
              {selectedProduct?.descricao} <br />
              {selectedProduct?.promo_ativa && selectedProduct?.promocao ? (
                <span className="font-bold text-lg mt-1" style={{ color: primaryColor }}>
                  <span className="line-through text-gray-500 mr-2">R$ {parseFloat(selectedProduct.preco || 0).toFixed(2).replace('.', ',')}</span>
                  <span style={{ color: '#22C55E' }}>R$ {parseFloat(selectedProduct.promocao).toFixed(2).replace('.', ',')}</span>
                </span>
              ) : (
                <span className="text-gray-800 font-bold text-lg mt-1">R$ {parseFloat(selectedProduct?.preco || 0).toFixed(2).replace('.', ',')}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <Button onClick={() => setProductQuantityInModal(prev => Math.max(1, prev - 1))}>-</Button>
              <Input type="number" value={productQuantityInModal} onChange={(e) => setProductQuantityInModal(parseInt(e.target.value) || 1)} className="w-16 text-center" />
              <Button onClick={() => setProductQuantityInModal(prev => prev + 1)}>+</Button>
            </div>
            <div>
              <Label htmlFor="observacao">Observações (opcional)</Label>
              <Textarea id="observacao" value={productObservationInModal} onChange={(e) => setProductObservationInModal(e.target.value)} placeholder="Ex: Sem cebola, bem passado..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddProductToCartFromModal}>Adicionar ao Carrinho</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Modal de Pedido de Mesa (para Garçom) - FINALIZAR PEDIDO DE MESA / DETALHES DO CARRINHO */}
      <Dialog open={isMesaOrderModalOpen} onOpenChange={setIsMesaOrderModalOpen}>
        <DialogContent className="max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Finalizar Pedido de Mesa</DialogTitle>
            <DialogDescription>
              Confira os itens do carrinho e os detalhes da mesa para o pedido.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFinalizarOuAdicionarPedidoMesa} className="grid gap-4 py-4">
            {/* Seção de Itens do Carrinho */}
            <h3 className="text-xl font-semibold border-b pb-2">Itens do Pedido ({itens.length})</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {itens.map((item, index) => (
                    <div key={`${item.id_produto}-${item.observacoes}-${index}`} className="flex items-center space-x-2 border rounded-md p-2">
                        {item.foto_url && (
                            <img
                                src={`${api.defaults.baseURL.replace('/api/v1', '')}${item.foto_url}`}
                                alt={item.nome}
                                className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                            />
                        )}
                        <div className="flex-1">
                            <p className="font-semibold">{item.nome}</p>
                            <p className="text-sm text-gray-600">R$ {item.preco_unitario.toFixed(2).replace('.', ',')}</p>
                            {item.observacoes && <p className="text-xs italic text-gray-500">Obs: {item.observacoes}</p>}
                        </div>
                        <div className="flex items-center space-x-1">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => atualizarQuantidadeItem(item.id_produto, item.quantidade - 1, item.observacoes)}
                                disabled={item.quantidade <= 1}
                            >
                                <Minus className="h-4 w-4" />
                            </Button>
                            <Input 
                                type="number" 
                                value={item.quantidade} 
                                onChange={(e) => atualizarQuantidadeItem(item.id_produto, parseInt(e.target.value) || 0, item.observacoes)} 
                                className="w-16 text-center" 
                                min="1" 
                            />
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => atualizarQuantidadeItem(item.id_produto, item.quantidade + 1, item.observacoes)}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                            <Button 
                                type="button" 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => removerItem(item.id_produto, item.observacoes)}
                            >
                                <XCircle className="h-4 w-4" />
                            </Button>
                             <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => openEditObservationModal(item)}
                            >
                                <SquarePen className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-right text-lg font-bold mt-4">Total do Carrinho: R$ {total.toFixed(2).replace('.', ',')}</p>

            <h3 className="text-xl font-semibold border-b pb-2 mt-6">Detalhes da Mesa</h3>
            <div>
              <Label htmlFor="mesa">Mesa</Label>
              <Select value={selectedMesaId} onValueChange={setSelectedMesaId} required>
                <SelectTrigger id="mesa"><SelectValue placeholder="Selecione a mesa" /></SelectTrigger>
                <SelectContent>
                  {mesas.filter(m => m.status === 'Livre').length > 0 && (
                      <SelectGroup>
                          <SelectLabel>Mesas Livres</SelectLabel>
                          {mesas.filter(m => m.status === 'Livre').map(mesa => (
                              <SelectItem key={mesa.id} value={mesa.id.toString()}>{mesa.numero} (Livre - Cap: {mesa.capacidade})</SelectItem>
                          ))}
                      </SelectGroup>
                  )}
                  {mesas.filter(m => m.status !== 'Livre').length > 0 && (
                      <SelectGroup>
                          <SelectLabel>Comandas Abertas</SelectLabel>
                          {mesas.filter(m => m.status !== 'Livre').map(mesa => (
                              <SelectItem key={mesa.id} value={mesa.id.toString()}>{mesa.numero} (Status: {mesa.status})</SelectItem>
                          ))}
                      </SelectGroup>
                  )}
                  {mesas.length === 0 && (
                      <SelectItem disabled value="">Nenhuma mesa encontrada ou ativa</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {existingOrderForMesa && (
                <p className="text-sm text-blue-600">Comanda aberta para Pedido #${existingOrderForMesa.numero_pedido}. Itens serão adicionados.</p>
            )}
            <div>
              <Label htmlFor="nomeClienteMesa">Nome do Cliente na Mesa (opcional)</Label>
              <Input 
                id="nomeClienteMesa" 
                type="text" 
                value={nomeClienteMesa} 
                onChange={(e) => setNomeClienteMesa(e.target.value)} 
                placeholder="Ex: Cliente da Mesa 5" 
              />
            </div>
            <div>
              <Label htmlFor="qtdPessoas">Quantidade de Pessoas (opcional)</Label>
              <Input id="qtdPessoas" type="number" value={qtdPessoas} onChange={(e) => setQtdPessoas(parseInt(e.target.value) || '')} placeholder="Ex: 2" min="1" />
            </div>
            <div>
              <Label htmlFor="obsPedido">Observações do Pedido (opcional)</Label>
              <Textarea id="obsPedido" value={pedidoObservacoesMesa} onChange={(e) => setPedidoObservacoesMesa(e.target.value)} placeholder="Ex: Pedido para viagem, sem talheres..." />
            </div>
            <DialogFooter>
              <Button type="submit">{existingOrderForMesa ? 'Adicionar à Comanda' : 'Finalizar Pedido de Mesa'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para Editar Observação do Item no Carrinho */}
      <Dialog open={isEditingObservation} onOpenChange={setIsEditingObservation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Observação para: {itemToEditObservation?.nome}</DialogTitle>
            <DialogDescription>Adicione ou altere a observação deste item.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="editObservation">Observação</Label>
              <Textarea 
                id="editObservation" 
                value={currentObservation} 
                onChange={(e) => setCurrentObservation(e.target.value)} 
                placeholder="Ex: Sem cebola, bem passado..." 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingObservation(false)}>Cancelar</Button>
            <Button onClick={saveObservation}>Salvar Observação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CardapioPage;