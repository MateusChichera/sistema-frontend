// frontend/src/components/cardapio/CardapioPage.jsx
// ESTE ARQUIVO AGORA É O CARDÁPIO EXCLUSIVO PARA GARÇONS/FUNCIONÁRIOS (COMANDA)
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../ui/select'; 
import { ShoppingCart, Utensils, LogOut } from 'lucide-react'; // Ícones ajustados

// Função para remover acentos (para busca)
const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// A lógica de isRestaurantOpen não é mais necessária aqui, pois é um painel interno para garçom.
// isRestaurantOpen = (horarioFuncionamento) => { ... }


const CardapioPage = () => {
  const { empresa, loading: empresaLoading, isReady } = useEmpresa();
  const { user, token, logout } = useAuth();
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

  // Garçom: Pedido de Mesa (Comanda)
  const [isMesaOrderModalOpen, setIsMesaOrderModalOpen] = useState(false);
  const [mesas, setMesas] = useState([]); // Todas as mesas ativas
  const [mesasLivres, setMesasLivres] = useState([]); // Mesas livres (para criar novo pedido)
  const [mesasComComanda, setMesasComComanda] = useState([]); // Mesas com pedido ativo (para adicionar itens)
  const [selectedMesaId, setSelectedMesaId] = useState('');
  const [qtdPessoas, setQtdPessoas] = useState('');
  const [pedidoObservacoesMesa, setPedidoObservacoesMesa] = useState('');
  const [existingOrderForMesa, setExistingOrderForMesa] = useState(null);

  // Removido: Estados de Cliente: Finalizar Pedido (isPedidoTypeSelectionModalOpen, isFinalizarPedidoModalOpen, selectedPedidoType)
  // Removido: Estados de Cliente: Login/Cadastro (isLoginRegisterModalOpen)


  // Efeito para buscar dados do cardápio (para Garçom)
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
      
      // Validação de role para acessar este cardápio de garçom
      if (!user || !['Funcionario', 'Caixa', 'Gerente', 'Proprietario'].includes(user.role)) {
        setError('Acesso negado. Apenas funcionários podem usar este cardápio de comandas.');
        setLoadingContent(false);
        return;
      }

      setLoadingContent(true);
      setError(null);
      try {
        // Rotas para garçom: Podem usar as rotas gerenciais autenticadas
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

        // Lógica de Promoções: Mostra a categoria Promoções, mas não filtra por padrão
        const promoProducts = fetchedProdutos.filter(p => p.promo_ativa && p.ativo);
        if (promoProducts.length > 0) {
            const promoCategory = { id: 'promo', descricao: '🔥 Promoções', ativo: true };
            finalCategorias = [promoCategory, ...fetchedCategorias];
        }
        setCategorias(finalCategorias);
        setProdutos(finalProdutos);
        setFilteredProdutos(finalProdutos); // Inicialmente mostra todos

        // Fetch Mesas (para Garçom)
        const mesasResponse = await api.get(`/gerencial/${empresa.slug}/mesas`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const allActiveMesas = mesasResponse.data.filter(mesa => mesa.ativo);
        setMesas(allActiveMesas);
        setMesasLivres(allActiveMesas.filter(mesa => mesa.status === 'Livre'));
        // Mesas com status Pendente, Preparando, Ocupada, Reservada (não Livre)
        setMesasComComanda(allActiveMesas.filter(mesa => mesa.status !== 'Livre')); 

        toast.success("Cardápio de Garçom carregado!");

      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao carregar cardápio de garçom.');
        console.error("Erro ao carregar cardápio de garçom:", err);
        toast.error(err.response?.data?.message || 'Erro ao carregar cardápio de garçom.');
      } finally {
        setLoadingContent(false);
      }
    };

    fetchCardapioData();
  }, [empresa, isReady, user, token]);


  // Efeito para aplicar filtros (categoria e busca)
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
  }, [produtos, selectedCategoryId, searchTerm]);


  // Lógica do Modal de Detalhes do Produto / Adicionar ao Carrinho
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

  // Garçom: Lógica para finalizar ou ADICIONAR a Pedido de Mesa (Comanda)
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
      const itensParaEnviar = itens.map(item => ({
        id_produto: item.id,
        quantidade: item.quantidade,
        observacoes: item.observacoes
      }));

      // A LÓGICA AGORA VERIFICA existingOrderForMesa?.id (se um pedido existente foi encontrado para a mesa)
      if (existingOrderForMesa?.id) { 
          // ADICIONA ITENS A UMA COMANDA EXISTENTE
        await api.post(`/gerencial/${empresa.slug}/pedidos/${existingOrderForMesa.id}/adicionar-itens`, {
            itens: itensParaEnviar
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(`Itens adicionados à comanda da Mesa ${existingOrderForMesa.numero_mesa}!`);
      } else { 
          // CRIA UM NOVO PEDIDO PARA MESA LIVRE
        const pedidoData = {
          id_mesa: parseInt(selectedMesaId),
          tipo_entrega: 'Mesa',
          observacoes: pedidoObservacoesMesa,
          itens: itensParaEnviar,
        };
        await api.post(`/${empresa.slug}/pedidos`, pedidoData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Novo pedido de mesa realizado com sucesso!');
      }

      setIsMesaOrderModalOpen(false);
      limparCarrinho();

    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao finalizar/adicionar ao pedido de mesa.');
      toast.error(err.response?.data?.message || 'Erro ao finalizar/adicionar ao pedido de mesa.');
      console.error("Erro ao finalizar/adicionar ao pedido de mesa:", err);
    } finally {
      setLoadingContent(false);
    }
  };

  // Efeito para carregar pedido existente na mesa selecionada (para Comanda)
  useEffect(() => {
    const fetchExistingOrder = async () => {
        const selectedMesaObj = mesas.find(m => m.id.toString() === selectedMesaId);
        // Só busca se tem mesa selecionada E se for funcionário
        if (selectedMesaId && selectedMesaObj && user?.role && ['Funcionario', 'Caixa', 'Gerente', 'Proprietario'].includes(user.role) && token) {
            try {
                // Busca pedidos PENDENTES ou PREPARANDO para a mesa selecionada
                const response = await api.get(`/gerencial/${empresa.slug}/pedidos?id_mesa=${selectedMesaId}&status=Pendente,Preparando`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data.length > 0) {
                    setExistingOrderForMesa(response.data[0]);
                    toast.info(`Mesa ${response.data[0].numero_mesa} tem uma comanda aberta (Pedido #${response.data[0].numero_pedido}).`);
                } else {
                    // Mesa sem pedido ativo para este status (pode estar Livre, ou outro status finalizado)
                    setExistingOrderForMesa(null); 
                }
            } catch (err) {
                console.error("Erro ao buscar comanda existente:", err);
                setExistingOrderForMesa(null);
            }
        } else {
            setExistingOrderForMesa(null); // Nenhuma mesa selecionada ou não é funcionário
        }
    };
    fetchExistingOrder();
  }, [selectedMesaId, user, token, empresa, mesas]); // Adicione 'mesas' como dependência


  // Removido: handleOpenFinalizarPedidoModal (para cliente)
  // Removido: handlePedidoTypeSelected (para cliente)
  // Removido: handleCloseFinalizarPedidoModal (para cliente)
  
  // A cor primária do cardápio será usada aqui
  const primaryColor = empresa?.cor_primaria_cardapio || '#FF5733';


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
  // A validação de isGarcom aqui é para determinar se o usuário pode ver este cardápio
  const isGarcomAllowed = user?.role && ['Funcionario', 'Caixa', 'Gerente', 'Proprietario'].includes(user.role);

  // Se não for garçom, este CardapioPage não deve ser acessível
  if (!isGarcomAllowed) {
    return <div className="p-4 text-center text-red-600">Acesso negado. Este cardápio é apenas para uso interno de funcionários.</div>;
  }

  return (
    <div className="container mx-auto p-4 relative">
      {/* Botão de Logout (Topo Direito, apenas para Garçom) */}
      {user && ( // Se houver um usuário logado
        <div className="absolute top-4 right-4 flex space-x-2 items-center z-10">
            <span className="text-sm text-gray-700">Olá, {user.nome}!</span>
            <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" /> Sair
            </Button>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center"
          style={{ color: primaryColor }}>
        Cardápio de Comandas - {empresa?.nome_fantasia || 'Empresa'}
      </h1>
      
      {empresa?.logo_full_url && (
        <div className="mb-6 flex justify-center">
          <img 
            src={empresa.logo_full_url} 
            alt={empresa.nome_fantasia || 'Logo'} 
            className="h-24 w-auto rounded-lg shadow-md object-contain"
          />
        </div>
      )}

      {/* Removido: Opções de Tipo de Pedido (Delivery/Retirada/Mesa para cliente) */}
      {/* Removido: Mensagem se pedidos online não são permitidos para clientes */}
      {/* Removido: Exibe valor mínimo de delivery (apenas para cliente) */}


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
                    onClick={() => openProductModal(prod)} // Sempre clicável para garçom
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

      {/* Botão flutuante do carrinho / finalizar pedido (Sempre para Garçom) */}
      {hasItemsInCart && ( // Garçom sempre pode fazer pedido se tiver itens
        <div className="fixed bottom-4 right-4 md:right-8 lg:right-12 xl:right-16 w-auto p-4 text-primary-foreground rounded-full shadow-lg flex items-center space-x-2 z-50 transform translate-x-0 transition-all duration-300 ease-in-out" 
             style={{ backgroundColor: primaryColor }}>
            <ShoppingCart className="h-6 w-6 flex-shrink-0" />
            <span className="text-lg font-bold whitespace-nowrap">Total: R$ {total.toFixed(2).replace('.', ',')}</span>
            
            {/* Garçom SEMPRE CLICA AQUI */}
            <Button onClick={() => setIsMesaOrderModalOpen(true)} variant="secondary" className="ml-auto flex-shrink-0">
                <Utensils className="mr-2" /> Pedido Mesa
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
                <span className="text-gray-800 font-bold text-lg mt-1">R$ {parseFloat(selectedProduct?.preco || 0).toFixed(2).replace('.', ',')}</span
              >)}
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

      {/* Modal de Pedido de Mesa (para Garçom) */}
      <Dialog open={isMesaOrderModalOpen} onOpenChange={setIsMesaOrderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Pedido de Mesa</DialogTitle>
            <DialogDescription>Informe os detalhes da mesa para o pedido.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFinalizarOuAdicionarPedidoMesa} className="grid gap-4 py-4">
            <div>
              <Label htmlFor="mesa">Mesa</Label>
              <Select value={selectedMesaId} onValueChange={setSelectedMesaId} required>
                <SelectTrigger id="mesa"><SelectValue placeholder="Selecione a mesa" /></SelectTrigger>
                <SelectContent>
                  {/* Listar mesas livres e ocupadas para o garçom */}
                  {mesasLivres.length > 0 && (
                      <SelectGroup>
                          <SelectLabel>Mesas Livres</SelectLabel>
                          {mesasLivres.map(mesa => (
                              <SelectItem key={mesa.id} value={mesa.id.toString()}>{mesa.numero} (Cap: {mesa.capacidade})</SelectItem>
                          ))}
                      </SelectGroup>
                  )}
                  {mesasComComanda.length > 0 && (
                      <SelectGroup>
                          <SelectLabel>Comandas Abertas</SelectLabel>
                          {mesasComComanda.map(mesa => (
                              <SelectItem key={mesa.id} value={mesa.id.toString()}>{mesa.numero} (Status: {mesa.status})</SelectItem>
                          ))}
                      </SelectGroup>
                  )}
                  {mesasLivres.length === 0 && mesasComComanda.length === 0 && (
                      <SelectItem disabled value="">Nenhuma mesa encontrada ou ativa</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {existingOrderForMesa && (
                <p className="text-sm text-blue-600">Comanda aberta para Pedido #{existingOrderForMesa.numero_pedido}. Itens serão adicionados.</p>
            )}
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

      {/* Removido: Modal de Finalizar Pedido (para Cliente - Delivery/Retirada/Mesa) */}
      {/* Removido: Modal de Login/Cadastro de Cliente */}
      {/* Removido: Modal de Seleção do Tipo de Pedido (Delivery/Retirada) */}
    </div>
  );
};

export default CardapioPage;