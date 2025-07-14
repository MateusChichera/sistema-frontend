// frontend/src/components/gerencial/ProdutosPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const ProdutosPage = () => {
  const { empresa, loading: empresaLoading } = useEmpresa();
  const { user } = useAuth();
  
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');

  const [novoIdCategoria, setNovoIdCategoria] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [novoPromocao, setNovoPromocao] = useState('');
  const [novoPromoAtiva, setNovoPromoAtiva] = useState(false);
  const [novoAtivo, setNovoAtivo] = useState(true);
  const [novaFoto, setNovaFoto] = useState(null);

  const [editandoProduto, setEditandoProduto] = useState(null);
  const [editIdCategoria, setEditIdCategoria] = useState('');
  const [editNome, setEditNome] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editPreco, setEditPreco] = useState('');
  const [editPromocao, setEditPromocao] = useState('');
  const [editPromoAtiva, setEditPromoAtiva] = useState(false);
  const [editAtivo, setEditAtivo] = useState(true);
  const [editFoto, setEditFoto] = useState(null);
  const [removerFotoExistente, setRemoverFotoExistente] = useState(false);
  const [adicionais, setAdicionais] = useState([]);
  const [produtoAdicionais, setProdutoAdicionais] = useState({});
  const [editProdutoAdicionais, setEditProdutoAdicionais] = useState([]);

  const fetchProductsAndCategories = async () => {
    if (empresaLoading || !empresa || !empresa.slug || !user) {
      setLoadingProdutos(true);
      return;
    }

    const canManage = user?.role === 'Proprietario' || user?.role === 'Gerente';
    const canView = ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'].includes(user?.role);

    if (!canView) {
      setError('Você não tem permissão para visualizar produtos.');
      setLoadingProdutos(false);
      return;
    }

    setLoadingProdutos(true);
    setError(null);
    try {
      const categoriasResponse = await api.get(`/gerencial/${empresa.slug}/categorias`);
      setCategorias(categoriasResponse.data);

      const produtosResponse = await api.get(`/gerencial/${empresa.slug}/produtos`);
      setProdutos(produtosResponse.data);
      
      // Carregar adicionais disponíveis
      try {
        const adicionaisResponse = await api.get(`/gerencial/${empresa.slug}/adicionais`);
        setAdicionais(adicionaisResponse.data || []);
        
        // Carregar adicionais de cada produto
        const adicionaisPorProduto = {};
        for (const produto of produtosResponse.data) {
          try {
            const produtoAdicionaisResponse = await api.get(`/gerencial/${empresa.slug}/produtos/${produto.id}/adicionais`);
            adicionaisPorProduto[produto.id] = produtoAdicionaisResponse.data || [];
          } catch (err) {
            console.error(`Erro ao carregar adicionais do produto ${produto.id}:`, err);
            adicionaisPorProduto[produto.id] = [];
          }
        }
        setProdutoAdicionais(adicionaisPorProduto);
      } catch (err) {
        console.error("Erro ao carregar adicionais:", err);
      }
      
      toast.success("Produtos e Categorias carregados!");

    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar dados.');
      console.error("Erro ao carregar produtos/categorias:", err);
      toast.error(err.response?.data?.message || 'Erro ao carregar produtos/categorias.');
    } finally {
      setLoadingProdutos(false);
    }
  };

  useEffect(() => {
    fetchProductsAndCategories();
  }, [empresa, empresaLoading, user]);

  const filteredProdutos = useMemo(() => {
    if (!searchTerm) {
      return produtos;
    }
    return produtos.filter(prod =>
      prod.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [produtos, searchTerm]);

  const handleAddProduto = async (e) => {
    e.preventDefault();
    if (!novoIdCategoria || !novoNome.trim() || !novoPreco.trim()) {
      toast.error('Categoria, nome e preço são obrigatórios.');
      return;
    }
    if (!empresa || !empresa.slug) { toast.error('Dados da empresa não carregados.'); return; }

    setLoadingProdutos(true);
    setError(null);

    const formData = new FormData();
    formData.append('id_categoria', novoIdCategoria);
    formData.append('nome', novoNome);
    formData.append('descricao', novaDescricao);
    formData.append('preco', parseFloat(novoPreco));
    formData.append('promocao', parseFloat(novoPromocao) || 0);
    formData.append('promo_ativa', novoPromoAtiva ? 1 : 0);
    formData.append('ativo', novoAtivo ? 1 : 0);
    if (novaFoto) {
      formData.append('foto_produto', novaFoto);
    }

    try {
      await api.post(`/gerencial/${empresa.slug}/produtos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await fetchProductsAndCategories();
      setNovoIdCategoria(''); setNovoNome(''); setNovaDescricao(''); setNovoPreco('');
      setNovoPromocao(''); setNovoPromoAtiva(false); setNovoAtivo(true); setNovaFoto(null);
      document.getElementById('novaFotoInput').value = '';
      toast.success('Produto adicionado com sucesso!');

    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao adicionar produto.');
      toast.error(err.response?.data?.message || 'Erro ao adicionar produto.');
      console.error("Erro ao adicionar produto:", err);
    } finally {
      setLoadingProdutos(false);
    }
  };

  const handleEditClick = (produto) => {
    setEditandoProduto(produto);
    setEditIdCategoria(produto.id_categoria.toString());
    setEditNome(produto.nome);
    setEditDescricao(produto.descricao || '');
    setEditPreco(parseFloat(produto.preco).toFixed(2));
    setEditPromocao(produto.promocao ? parseFloat(produto.promocao).toFixed(2) : '');
    setEditPromoAtiva(!!produto.promo_ativa);
    setEditAtivo(!!produto.ativo);
    setEditFoto(null);
    setRemoverFotoExistente(false);
    
    // Carregar adicionais do produto
    fetchProdutoAdicionais(produto.id);
    
    const editFotoInput = document.getElementById('editFotoInput');
    if (editFotoInput) editFotoInput.value = '';
  };
  
  const fetchProdutoAdicionais = async (produtoId) => {
    try {
      const response = await api.get(`/gerencial/${empresa.slug}/produtos/${produtoId}/adicionais`);
      const adicionaisIds = response.data.map(adicional => adicional.id);
      setEditProdutoAdicionais(adicionaisIds);
    } catch (err) {
      console.error("Erro ao carregar adicionais do produto:", err);
      setEditProdutoAdicionais([]);
    }
  };

  const handleCancelEdit = () => {
    setEditandoProduto(null);
    setEditIdCategoria(''); setEditNome(''); setEditDescricao(''); setEditPreco('');
    setEditPromocao(''); setEditPromoAtiva(false); setEditAtivo(true); setEditFoto(null);
    setRemoverFotoExistente(false);
    setEditProdutoAdicionais([]);
    const editFotoInput = document.getElementById('editFotoInput');
    if (editFotoInput) editFotoInput.value = '';
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editIdCategoria || !editNome.trim() || !editPreco.trim()) {
      toast.error('Categoria, nome e preço são obrigatórios.');
      return;
    }
    if (!empresa || !empresa.slug) { toast.error('Dados da empresa não carregados.'); return; }

    setLoadingProdutos(true);
    setError(null);

    const formData = new FormData();
    formData.append('id_categoria', editIdCategoria);
    formData.append('nome', editNome);
    formData.append('descricao', editDescricao);
    formData.append('preco', parseFloat(editPreco));
    formData.append('promocao', parseFloat(editPromocao) || 0);
    formData.append('promo_ativa', editPromoAtiva ? 1 : 0);
    formData.append('ativo', editAtivo ? 1 : 0);
    if (editFoto) {
      formData.append('foto_produto', editFoto);
    }
    if (removerFotoExistente) {
      formData.append('remover_foto', true);
    }

    try {
      await api.put(`/gerencial/${empresa.slug}/produtos/${editandoProduto.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Atualizar adicionais do produto
      await updateProdutoAdicionais(editandoProduto.id, editProdutoAdicionais);

      await fetchProductsAndCategories();
      handleCancelEdit();
      toast.success('Produto atualizado com sucesso!');

    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao atualizar produto.');
      toast.error(err.response?.data?.message || 'Erro ao atualizar produto.');
      console.error("Erro ao atualizar produto:", err);
    } finally {
      setLoadingProdutos(false);
    }
  };
  
  const updateProdutoAdicionais = async (produtoId, adicionaisIds) => {
    try {
      // Primeiro, remover todos os adicionais atuais
      const currentAdicionais = await api.get(`/gerencial/${empresa.slug}/produtos/${produtoId}/adicionais`);
      for (const adicional of currentAdicionais.data) {
        await api.delete(`/gerencial/${empresa.slug}/produtos/${produtoId}/adicionais/${adicional.id}`);
      }
      
      // Adicionar os novos adicionais selecionados
      for (const adicionalId of adicionaisIds) {
        await api.post(`/gerencial/${empresa.slug}/produtos/${produtoId}/adicionais`, {
          id_adicional: adicionalId
        });
      }
    } catch (err) {
      console.error("Erro ao atualizar adicionais do produto:", err);
      toast.error("Erro ao atualizar adicionais do produto.");
    }
  };

  const handleDeleteProduto = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) {
      return;
    }
    if (!empresa || !empresa.slug) { toast.error('Dados da empresa não carregados.'); return; }
    
    setLoadingProdutos(true);
    setError(null);
    try {
      await api.delete(`/gerencial/${empresa.slug}/produtos/${id}`);
      setProdutos(prev => prev.filter(prod => prod.id !== id));
      toast.success('Produto excluído com sucesso!');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao excluir produto.');
      toast.error(err.response?.data?.message || 'Erro ao excluir produto.');
      console.error("Erro ao excluir produto:", err);
    } finally {
      setLoadingProdutos(false);
    }
  };

  const canManage = user?.role === 'Proprietario' || user?.role === 'Gerente';
  const canView = ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'].includes(user?.role);


  if (empresaLoading) {
    return <div className="p-4 text-center text-gray-600">Carregando dados da empresa...</div>;
  }

  if (!empresa) {
    return <div className="p-4 text-red-600 text-center">Nenhuma empresa carregada.</div>;
  }
  
  if (!canView) {
    return <div className="p-4 text-red-600 text-center">Você não tem permissão para visualizar esta página.</div>;
  }

  if (loadingProdutos) {
    return <div className="p-4 text-center text-gray-600">Carregando produtos...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 text-center">{error}</div>;
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Gerenciar Produtos - {empresa.nome_fantasia}</h2>

      {/* Campo de Busca */}
      <div className="mb-6">
        <Label htmlFor="search">Buscar Produto</Label>
        <Input
          id="search"
          type="text"
          placeholder="Digite o nome do produto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Formulário para Adicionar/Editar Produto - Visível apenas para quem pode gerenciar */}
      {canManage && (
        <form onSubmit={editandoProduto ? handleSaveEdit : handleAddProduto} className="mb-8 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">
            {editandoProduto ? `Editar Produto: ${editandoProduto.nome}` : 'Adicionar Novo Produto'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="idCategoria">Categoria</Label>
              <Select 
                value={editandoProduto ? editIdCategoria : novoIdCategoria} 
                onValueChange={(value) => editandoProduto ? setEditIdCategoria(value) : setNovoIdCategoria(value)}
                required
              >
                <SelectTrigger id="idCategoria">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nome">Nome do Produto</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Nome do Produto"
                value={editandoProduto ? editNome : novoNome}
                onChange={(e) => editandoProduto ? setEditNome(e.target.value) : setNovoNome(e.target.value)}
                required
              />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-1">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                placeholder="Descrição detalhada do produto"
                value={editandoProduto ? editDescricao : novaDescricao}
                onChange={(e) => editandoProduto ? setEditDescricao(e.target.value) : setNovaDescricao(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="preco">Preço</Label>
              <Input
                id="preco"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={editandoProduto ? editPreco : novoPreco}
                onChange={(e) => editandoProduto ? setEditPreco(e.target.value) : setNovoPreco(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="promocao">Preço Promocional (opcional)</Label>
              <Input
                id="promocao"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={editandoProduto ? editPromocao : novoPromocao}
                onChange={(e) => editandoProduto ? setEditPromocao(e.target.value) : setNovoPromocao(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="promoAtiva"
                checked={editandoProduto ? editPromoAtiva : novoPromoAtiva}
                onCheckedChange={(checked) => editandoProduto ? setEditPromoAtiva(checked) : setNovoPromoAtiva(checked)}
              />
              <Label htmlFor="promoAtiva">Promoção Ativa</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={editandoProduto ? editAtivo : novoAtivo}
                onCheckedChange={(checked) => editandoProduto ? setEditAtivo(checked) : setNovoAtivo(checked)}
              />
              <Label htmlFor="ativo">Produto Ativo</Label>
            </div>
            <div className="col-span-full">
              <Label htmlFor={editandoProduto ? "editFotoInput" : "novaFotoInput"}>Foto do Produto (opcional)</Label>
              <Input
                id={editandoProduto ? "editFotoInput" : "novaFotoInput"}
                type="file"
                accept="image/*"
                onChange={(e) => editandoProduto ? setEditFoto(e.target.files[0]) : setNovaFoto(e.target.files[0])}
              />
              {editandoProduto?.foto_url && !editFoto && !removerFotoExistente && (
                <div className="mt-2 flex items-center space-x-2">
                  <img 
                    src={`${api.defaults.baseURL.replace('/api/v1', '')}${editandoProduto.foto_url}`} 
                    alt="Foto atual" 
                    className="h-16 w-16 object-cover rounded-md" 
                  />
                  <Label htmlFor="removerFoto">Remover foto existente?</Label>
                  <Switch
                    id="removerFoto"
                    checked={removerFotoExistente}
                    onCheckedChange={setRemoverFotoExistente}
                  />
                </div>
              )}
            </div>

            {/* Seção de Adicionais - Apenas na edição */}
            {editandoProduto && adicionais.length > 0 && (
              <div className="col-span-full">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Adicionais Disponíveis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {adicionais.filter(adicional => adicional.ativo).map((adicional) => (
                        <div key={adicional.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                          <Checkbox
                            id={`adicional-${adicional.id}`}
                            checked={editProdutoAdicionais.includes(adicional.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditProdutoAdicionais(prev => [...prev, adicional.id]);
                              } else {
                                setEditProdutoAdicionais(prev => prev.filter(id => id !== adicional.id));
                              }
                            }}
                          />
                          <div className="flex-1">
                            <Label htmlFor={`adicional-${adicional.id}`} className="font-medium cursor-pointer">
                              {adicional.nome}
                            </Label>
                            {adicional.descricao && (
                              <p className="text-sm text-gray-600">{adicional.descricao}</p>
                            )}
                            <p className="text-sm font-semibold text-green-600">
                              R$ {parseFloat(adicional.preco).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {adicionais.filter(adicional => adicional.ativo).length === 0 && (
                      <p className="text-gray-600 text-center py-4">
                        Nenhum adicional ativo disponível. 
                        <a href="/adicionais" className="text-blue-600 hover:underline ml-1">
                          Criar adicionais
                        </a>
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex gap-2 col-span-full justify-end">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                {editandoProduto ? 'Salvar Edição' : 'Adicionar Produto'}
              </Button>
              {editandoProduto && (
                <Button type="button" onClick={handleCancelEdit} variant="outline">
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Lista de Produtos */}
      <h3 className="text-xl font-semibold mb-4 text-gray-700">Produtos Existentes</h3>
      {filteredProdutos.length === 0 ? (
        <p className="text-gray-600">Nenhum produto cadastrado ainda ou nenhum resultado para a busca.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <TableHeader className="bg-gray-100">
              <TableRow>
                {/* REMOVIDO: <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">ID</TableHead> */}
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Foto</TableHead>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Nome</TableHead>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Categoria</TableHead>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Preço</TableHead>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Promoção</TableHead> {/* NOVA COLUNA */}
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Status</TableHead>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Adicionais</TableHead>
                {canManage && <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProdutos.map((prod) => (
                <TableRow key={prod.id} className="hover:bg-gray-50">
                  {/* REMOVIDO: <TableCell className="py-2 px-4 border-b text-sm text-gray-800">{prod.id}</TableCell> */}
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">
                    {prod.foto_url ? (
                      <img 
                        src={`${api.defaults.baseURL.replace('/api/v1', '')}${prod.foto_url}`} 
                        alt={prod.nome} 
                        className="h-12 w-12 object-cover rounded-md" 
                      />
                    ) : (
                      <div className="h-12 w-12 bg-gray-200 flex items-center justify-center text-xs text-gray-500 rounded-md">Sem Foto</div>
                    )}
                  </TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">{prod.nome}</TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">{prod.categoria_nome}</TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">R$ {parseFloat(prod.preco).toFixed(2)}</TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">
                    {/* Exibição da promoção */}
                    {prod.promo_ativa ? (
                      <p className="text-green-600 font-semibold">R$ {parseFloat(prod.promocao).toFixed(2)}</p>
                    ) : (
                      prod.promocao > 0 ? (
                        <p className="text-yellow-600">R$ {parseFloat(prod.promocao).toFixed(2)} (Off)</p>
                      ) : (
                        '-'
                      )
                    )}
                  </TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      prod.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {prod.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    {prod.promo_ativa && ( // Badge de 'Promoção Ativa'
                      <span className="ml-1 px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        Ativa
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">
                    {produtoAdicionais[prod.id] && produtoAdicionais[prod.id].length > 0 ? (
                      <div className="space-y-1">
                        {produtoAdicionais[prod.id].slice(0, 2).map((adicional) => (
                          <div key={adicional.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {adicional.nome} (+R$ {parseFloat(adicional.preco).toFixed(2).replace('.', ',')})
                          </div>
                        ))}
                        {produtoAdicionais[prod.id].length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{produtoAdicionais[prod.id].length - 2} mais
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Nenhum</span>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="py-2 px-4 border-b text-sm">
                      <Button 
                        onClick={() => handleEditClick(prod)} 
                        variant="outline" 
                        size="sm" 
                        className="mr-2"
                      >
                        Editar
                      </Button>
                      <Button 
                        onClick={() => handleDeleteProduto(prod.id)} 
                        variant="destructive" 
                        size="sm"
                      >
                        Excluir
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ProdutosPage;