import React, { useState, useEffect } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useCarrinho } from '../../contexts/CarrinhoContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, ShoppingCart } from 'lucide-react';

const CardapioPage = () => {
  const { empresa } = useEmpresa();
  const { adicionarItem, calcularQuantidadeTotal } = useCarrinho();
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCardapio();
  }, [empresa]);

  const loadCardapio = async () => {
    try {
      setLoading(true);
      
      // Dados mock para demonstração
      const mockCategorias = [
        { id: 1, descricao: 'Entradas', ordem_exibicao: 1 },
        { id: 2, descricao: 'Pratos Principais', ordem_exibicao: 2 },
        { id: 3, descricao: 'Bebidas', ordem_exibicao: 3 },
        { id: 4, descricao: 'Sobremesas', ordem_exibicao: 4 }
      ];

      const mockProdutos = [
        {
          id: 1,
          id_categoria: 1,
          nome: 'Bruschetta Italiana',
          descricao: 'Pão italiano tostado com tomate, manjericão e azeite extra virgem',
          preco: 18.90,
          promocao: 15.90,
          promo_ativa: true,
          foto_url: '/images/bruschetta.jpg',
          disponivel_cardapio: true
        },
        {
          id: 2,
          id_categoria: 1,
          nome: 'Carpaccio de Salmão',
          descricao: 'Fatias finas de salmão fresco com alcaparras e molho especial',
          preco: 32.90,
          promocao: 0,
          promo_ativa: false,
          foto_url: '/images/carpaccio.jpg',
          disponivel_cardapio: true
        },
        {
          id: 3,
          id_categoria: 2,
          nome: 'Risotto de Camarão',
          descricao: 'Risotto cremoso com camarões frescos e ervas finas',
          preco: 45.90,
          promocao: 0,
          promo_ativa: false,
          foto_url: '/images/risotto.jpg',
          disponivel_cardapio: true
        },
        {
          id: 4,
          id_categoria: 2,
          nome: 'Filé Mignon Grelhado',
          descricao: 'Filé mignon grelhado acompanhado de batatas rústicas e legumes',
          preco: 58.90,
          promocao: 52.90,
          promo_ativa: true,
          foto_url: '/images/file.jpg',
          disponivel_cardapio: true
        },
        {
          id: 5,
          id_categoria: 3,
          nome: 'Suco Natural',
          descricao: 'Suco natural de frutas da estação (laranja, limão, maracujá)',
          preco: 8.90,
          promocao: 0,
          promo_ativa: false,
          foto_url: '/images/suco.jpg',
          disponivel_cardapio: true
        },
        {
          id: 6,
          id_categoria: 3,
          nome: 'Refrigerante',
          descricao: 'Coca-Cola, Pepsi, Guaraná ou Sprite (350ml)',
          preco: 6.90,
          promocao: 0,
          promo_ativa: false,
          foto_url: '/images/refrigerante.jpg',
          disponivel_cardapio: true
        },
        {
          id: 7,
          id_categoria: 4,
          nome: 'Tiramisu',
          descricao: 'Sobremesa italiana tradicional com café e mascarpone',
          preco: 16.90,
          promocao: 0,
          promo_ativa: false,
          foto_url: '/images/tiramisu.jpg',
          disponivel_cardapio: true
        }
      ];

      setCategorias(mockCategorias);
      setProdutos(mockProdutos);
      setCategoriaAtiva(mockCategorias[0]?.id);
    } catch (error) {
      console.error('Erro ao carregar cardápio:', error);
    } finally {
      setLoading(false);
    }
  };

  const produtosPorCategoria = produtos.filter(produto => 
    produto.id_categoria === categoriaAtiva && produto.disponivel_cardapio
  );

  const formatarPreco = (preco) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(preco);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Nosso Cardápio</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Descubra sabores únicos preparados com ingredientes frescos e muito carinho.
        </p>
      </div>

      {/* Categorias */}
      <div className="flex flex-wrap justify-center gap-2">
        {categorias.map((categoria) => (
          <Button
            key={categoria.id}
            variant={categoriaAtiva === categoria.id ? "default" : "outline"}
            onClick={() => setCategoriaAtiva(categoria.id)}
            className="rounded-full"
          >
            {categoria.descricao}
          </Button>
        ))}
      </div>

      {/* Produtos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {produtosPorCategoria.map((produto) => (
          <Card key={produto.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-video bg-gray-200 relative">
              {produto.foto_url ? (
                <img 
                  src={produto.foto_url} 
                  alt={produto.nome}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <ShoppingCart className="h-12 w-12" />
                </div>
              )}
              {produto.promo_ativa && (
                <Badge className="absolute top-2 right-2 bg-red-500">
                  Promoção
                </Badge>
              )}
            </div>
            
            <CardHeader>
              <CardTitle className="text-lg">{produto.nome}</CardTitle>
              <p className="text-sm text-gray-600">{produto.descricao}</p>
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  {produto.promo_ativa ? (
                    <>
                      <span className="text-lg font-bold text-green-600">
                        {formatarPreco(produto.promocao)}
                      </span>
                      <span className="text-sm text-gray-500 line-through ml-2">
                        {formatarPreco(produto.preco)}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-gray-900">
                      {formatarPreco(produto.preco)}
                    </span>
                  )}
                </div>
                
                <Button
                  onClick={() => adicionarItem(produto, 1)}
                  size="sm"
                  className="rounded-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {produtosPorCategoria.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhum produto disponível nesta categoria.</p>
        </div>
      )}

      {/* Carrinho Flutuante */}
      {calcularQuantidadeTotal() > 0 && (
        <div className="fixed bottom-6 right-6">
          <Button 
            size="lg" 
            className="rounded-full shadow-lg"
            onClick={() => window.location.href = `/${empresa?.slug}/pedido`}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Ver Carrinho ({calcularQuantidadeTotal()})
          </Button>
        </div>
      )}
    </div>
  );
};

export default CardapioPage;

