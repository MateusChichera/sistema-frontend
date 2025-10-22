// frontend/src/components/gerencial/ProdutosPage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { useState as useStateReact } from 'react';
import { useErrorDialog } from '../../hooks/use-error-dialog';

const ProdutosPage = () => {
  const { empresa, loading: empresaLoading } = useEmpresa();
  const { user } = useAuth();
  
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [error, setError] = useState(null);
  const { showError, ErrorDialogElement } = useErrorDialog();

  const [searchTerm, setSearchTerm] = useState('');

  const [novoIdCategoria, setNovoIdCategoria] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [novoPromocao, setNovoPromocao] = useState('');
  // Novos campos
  const [novoCusto, setNovoCusto] = useState('');
  const [novoEstoque, setNovoEstoque] = useState('');
  const [novoMargem, setNovoMargem] = useState('');
  const [novoPromoAtiva, setNovoPromoAtiva] = useState(false);
  const [novoAtivo, setNovoAtivo] = useState(true);
  const [novaFoto, setNovaFoto] = useState(null);
  const [ncm, setNcm] = useState('');
  const [perfilTributarioId, setPerfilTributarioId] = useState('');

  const [editandoProduto, setEditandoProduto] = useState(null);
  const [editIdCategoria, setEditIdCategoria] = useState('');
  const [editNome, setEditNome] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editPreco, setEditPreco] = useState('');
  const [editPromocao, setEditPromocao] = useState('');
  // Novos campos (edição)
  const [editCusto, setEditCusto] = useState('');
  const [editEstoque, setEditEstoque] = useState('');
  const [editMargem, setEditMargem] = useState('');
  const [editPromoAtiva, setEditPromoAtiva] = useState(false);
  const [editAtivo, setEditAtivo] = useState(true);
  const [editFoto, setEditFoto] = useState(null);
  const [removerFotoExistente, setRemoverFotoExistente] = useState(false);
  const [adicionais, setAdicionais] = useState([]);
  const [produtoAdicionais, setProdutoAdicionais] = useState({});
  const [editProdutoAdicionais, setEditProdutoAdicionais] = useState([]);
  const [editNcm, setEditNcm] = useState('');
  const [editPerfilTributarioId, setEditPerfilTributarioId] = useState('');
  const [perfisTributarios, setPerfisTributarios] = useState([]);

  // Funções auxiliares para cálculo de preço e margem
  const calculatePrecoFromMargem = (custo, margem) => {
    const c = parseFloat(custo);
    const m = parseFloat(margem);
    if (isNaN(c) || isNaN(m)) return '';
    return (c * (1 + m / 100)).toFixed(2);
  };

  const calculateMargemFromPreco = (custo, preco) => {
    const c = parseFloat(custo);
    const p = parseFloat(preco);
    if (isNaN(c) || c === 0 || isNaN(p)) return '';
    return (((p - c) / c) * 100).toFixed(2);
  };

  // Ajuda do perfil tributário
  const ajudaRef = useRef();
  const [showAjudaPerfil, setShowAjudaPerfil] = useStateReact(false);

  // Buscar perfis tributários ao carregar
  useEffect(() => {
    const fetchPerfis = async () => {
      try {
        const res = await api.get('/perfis-tributarios');
        setPerfisTributarios(res.data || []);
      } catch (err) {
        setPerfisTributarios([]);
      }
    };
    fetchPerfis();
  }, []);

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
      const msg = err.response?.data?.message || 'Erro ao carregar dados.';
      setError(msg);
      showError(msg);
      console.error("Erro ao carregar produtos/categorias:", err);
      toast.error(msg);
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
    formData.append('custo', parseFloat(novoCusto) || 0);
    formData.append('estoque', parseInt(novoEstoque) || 0);
    formData.append('promocao', parseFloat(novoPromocao) || 0);
    formData.append('promo_ativa', novoPromoAtiva ? 1 : 0);
    formData.append('ativo', novoAtivo ? 1 : 0);
    if (novaFoto) {
      formData.append('foto_produto', novaFoto);
    }
    if (ncm) formData.append('ncm', ncm);
    if (perfilTributarioId) formData.append('perfil_tributario_id', parseInt(perfilTributarioId));

    try {
      await api.post(`/gerencial/${empresa.slug}/produtos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await fetchProductsAndCategories();
      setNovoIdCategoria(''); setNovoNome(''); setNovaDescricao(''); setNovoPreco('');
      setNovoPromocao(''); setNovoPromoAtiva(false); setNovoAtivo(true); setNovaFoto(null);
      setNovoCusto(''); setNovoEstoque(''); setNovoMargem('');
      
      // Limpar o input de foto de forma segura
      const novaFotoInput = document.getElementById('novaFotoInput');
      if (novaFotoInput) {
        novaFotoInput.value = '';
      }
      
      toast.success('Produto adicionado com sucesso!');

    } catch (err) {
      const msgAdd = err.response?.data?.message || 'Erro ao adicionar produto.';
      setError(msgAdd);
      showError(msgAdd);
      toast.error(msgAdd);
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
    setEditCusto(produto.custo ? parseFloat(produto.custo).toFixed(2) : '');
    setEditEstoque(produto.estoque !== undefined ? String(produto.estoque) : '');
    setEditMargem(produto.custo && produto.preco ? calculateMargemFromPreco(produto.custo, produto.preco) : '');
    setEditPromoAtiva(!!produto.promo_ativa);
    setEditAtivo(!!produto.ativo);
    setEditFoto(null);
    setRemoverFotoExistente(false);
    setEditNcm(produto.ncm || '');
    setEditPerfilTributarioId(
      produto.perfil_tributario_id ? String(produto.perfil_tributario_id) :
      produto.id_perfil_tributario ? String(produto.id_perfil_tributario) : ''
    );
    
    // Carregar adicionais do produto
    fetchProdutoAdicionais(produto.id);
    
    const editFotoInput = document.getElementById('editFotoInput');
    if (editFotoInput) editFotoInput.value = '';
    
    // Rola suavemente para o topo da página
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    setEditCusto(''); setEditEstoque(''); setEditMargem('');
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
    formData.append('custo', parseFloat(editCusto) || 0);
    formData.append('estoque', parseInt(editEstoque) || 0);
    formData.append('promocao', parseFloat(editPromocao) || 0);
    formData.append('promo_ativa', editPromoAtiva ? 1 : 0);
    formData.append('ativo', editAtivo ? 1 : 0);
    if (editFoto) {
      formData.append('foto_produto', editFoto);
    }
    if (removerFotoExistente) {
      formData.append('remover_foto', true);
    }
    if (editNcm) formData.append('ncm', editNcm);
    if (editPerfilTributarioId) formData.append('perfil_tributario_id', parseInt(editPerfilTributarioId));

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
      const msgUpdate = err.response?.data?.message || 'Erro ao atualizar produto.';
      setError(msgUpdate);
      showError(msgUpdate);
      toast.error(msgUpdate);
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
      const msgDel = err.response?.data?.message || 'Erro ao excluir produto.';
      setError(msgDel);
      showError(msgDel);
      toast.error(msgDel);
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

  // Não fazemos early return. O aviso será mostrado via diálogo.
  
  return (
    <div className="p-2 sm:p-4 md:p-6 bg-white rounded-lg shadow-md">
      {/* Dialogo de Erro */}
      {ErrorDialogElement}
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-6 text-title">Gerenciar Produtos - {empresa.nome_fantasia}</h2>

      {/* Campo de Busca */}
      <div className="mb-4 sm:mb-6">
        <Label htmlFor="search" className="text-sm">Buscar Produto</Label>
        <Input
          id="search"
          type="text"
          placeholder="Digite o nome do produto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9 sm:h-10 text-sm"
        />
      </div>

      {/* Formulário para Adicionar/Editar Produto - Visível apenas para quem pode gerenciar */}
      {canManage && (
        <form onSubmit={editandoProduto ? handleSaveEdit : handleAddProduto} className="mb-6 sm:mb-8 p-3 sm:p-4 border rounded-lg bg-gray-50">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 text-gray-700">
            {editandoProduto ? `Editar Produto: ${editandoProduto.nome}` : 'Adicionar Novo Produto'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-end">
            <div>
              <Label htmlFor="idCategoria" className="text-sm">Categoria</Label>
              <Select 
                value={editandoProduto ? editIdCategoria : novoIdCategoria} 
                onValueChange={(value) => editandoProduto ? setEditIdCategoria(value) : setNovoIdCategoria(value)}
                required
              >
                <SelectTrigger id="idCategoria" className="h-9 sm:h-10 text-sm">
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
              <Label htmlFor="nome" className="text-sm">Nome do Produto</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Nome do Produto"
                value={editandoProduto ? editNome : novoNome}
                onChange={(e) => editandoProduto ? setEditNome(e.target.value) : setNovoNome(e.target.value)}
                required
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-1">
              <Label htmlFor="descricao" className="text-sm">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                placeholder="Descrição detalhada do produto"
                value={editandoProduto ? editDescricao : novaDescricao}
                onChange={(e) => editandoProduto ? setEditDescricao(e.target.value) : setNovaDescricao(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
            {/* Campo Custo */}
            <div>
              <Label htmlFor="custo" className="text-sm">Custo</Label>
              <Input
                id="custo"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={editandoProduto ? editCusto : novoCusto}
                onChange={(e) => {
                  const val = e.target.value;
                  if (editandoProduto) {
                    setEditCusto(val);
                    if (editMargem) setEditPreco(calculatePrecoFromMargem(val, editMargem));
                    else if (editPreco) setEditMargem(calculateMargemFromPreco(val, editPreco));
                  } else {
                    setNovoCusto(val);
                    if (novoMargem) setNovoPreco(calculatePrecoFromMargem(val, novoMargem));
                    else if (novoPreco) setNovoMargem(calculateMargemFromPreco(val, novoPreco));
                  }
                }}
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            {/* Campo Margem (apenas visual) */}
            <div>
              <Label htmlFor="margem" className="text-sm">Margem (%)</Label>
              <Input
                id="margem"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={editandoProduto ? editMargem : novoMargem}
                onChange={(e) => {
                  const val = e.target.value;
                  if (editandoProduto) {
                    setEditMargem(val);
                    if (editCusto) setEditPreco(calculatePrecoFromMargem(editCusto, val));
                  } else {
                    setNovoMargem(val);
                    if (novoCusto) setNovoPreco(calculatePrecoFromMargem(novoCusto, val));
                  }
                }}
                className="h-9 sm:h-10 text-sm"
              />
            </div>

            {/* Campo Preço */}
            <div>
              <Label htmlFor="preco" className="text-sm">Preço</Label>
              <Input
                id="preco"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={editandoProduto ? editPreco : novoPreco}
                onChange={(e) => {
                  const val = e.target.value;
                  if (editandoProduto) {
                    setEditPreco(val);
                    if (editCusto) setEditMargem(calculateMargemFromPreco(editCusto, val));
                  } else {
                    setNovoPreco(val);
                    if (novoCusto) setNovoMargem(calculateMargemFromPreco(novoCusto, val));
                  }
                }}
                required
                className="h-9 sm:h-10 text-sm"
              />
            </div>

            {/* Campo Estoque */}
            <div>
              <Label htmlFor="estoque" className="text-sm">Estoque</Label>
              <Input
                id="estoque"
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={editandoProduto ? editEstoque : novoEstoque}
                onChange={(e) => editandoProduto ? setEditEstoque(e.target.value) : setNovoEstoque(e.target.value)}
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="promocao" className="text-sm">Preço Promocional (opcional)</Label>
              <Input
                id="promocao"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={editandoProduto ? editPromocao : novoPromocao}
                onChange={(e) => editandoProduto ? setEditPromocao(e.target.value) : setNovoPromocao(e.target.value)}
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="promoAtiva"
                checked={editandoProduto ? editPromoAtiva : novoPromoAtiva}
                onCheckedChange={(checked) => editandoProduto ? setEditPromoAtiva(checked) : setNovoPromoAtiva(checked)}
              />
              <Label htmlFor="promoAtiva" className="text-sm">Promoção Ativa</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={editandoProduto ? editAtivo : novoAtivo}
                onCheckedChange={(checked) => editandoProduto ? setEditAtivo(checked) : setNovoAtivo(checked)}
              />
              <Label htmlFor="ativo" className="text-sm">Produto Ativo</Label>
            </div>
            <div className="col-span-full">
              <Label htmlFor={editandoProduto ? "editFotoInput" : "novaFotoInput"} className="text-sm">Foto do Produto (opcional)</Label>
              <Input
                id={editandoProduto ? "editFotoInput" : "novaFotoInput"}
                type="file"
                accept="image/*"
                onChange={(e) => editandoProduto ? setEditFoto(e.target.files[0]) : setNovaFoto(e.target.files[0])}
                className="text-sm"
              />
              {editandoProduto?.foto_url && !editFoto && !removerFotoExistente && (
                <div className="mt-2 flex items-center space-x-2">
                  <img 
                    src={`${api.defaults.baseURL.replace('/api/v1', '')}${editandoProduto.foto_url}`} 
                    alt="Foto atual" 
                    className="h-12 w-12 sm:h-16 sm:w-16 object-cover rounded-md" 
                  />
                  <Label htmlFor="removerFoto" className="text-sm">Remover foto existente?</Label>
                  <Switch
                    id="removerFoto"
                    checked={removerFotoExistente}
                    onCheckedChange={setRemoverFotoExistente}
                  />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="ncm" className="text-sm">NCM</Label>
              <Input
                id="ncm"
                type="text"
                placeholder="NCM"
                value={editandoProduto ? editNcm : ncm}
                onChange={e => editandoProduto ? setEditNcm(e.target.value) : setNcm(e.target.value)}
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="perfilTributario" className="text-sm">Perfil Tributário</Label>
                <button
                  type="button"
                  ref={ajudaRef}
                  onMouseEnter={() => setShowAjudaPerfil(true)}
                  onMouseLeave={() => setShowAjudaPerfil(false)}
                  className="text-gray-500 bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center text-base font-bold align-middle border border-gray-300 hover:bg-gray-300"
                  style={{ cursor: 'pointer' }}
                  tabIndex={-1}
                  aria-label="Ajuda sobre perfis tributários"
                >
                  ?
                </button>
              </div>
              <Select
                value={editandoProduto ? editPerfilTributarioId : perfilTributarioId}
                onValueChange={value => editandoProduto ? setEditPerfilTributarioId(value) : setPerfilTributarioId(value)}
              >
                <SelectTrigger id="perfilTributario" className="h-9 sm:h-10 text-sm">
                  <SelectValue placeholder="Selecione o perfil tributário" />
                </SelectTrigger>
                <SelectContent>
                  {perfisTributarios.map(perfil => (
                    <SelectItem key={perfil.id} value={perfil.id.toString()}>{perfil.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showAjudaPerfil && (
                <div
                  className="absolute z-500 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-gray-800 shadow max-w-md"
                  style={{ minWidth: 260 }}
                  onMouseEnter={() => setShowAjudaPerfil(true)}
                  onMouseLeave={() => setShowAjudaPerfil(false)}
                >
                  <strong>Explicação dos Perfis Tributários:</strong>
                  <ul className="list-disc ml-4 mt-1 space-y-1">
                    <li><b>ICMS 18%</b> - Venda padrão com ICMS cheio (CFOP 5102, CSOSN 102)</li>
                    <li><b>ICMS 7%</b> - Venda com redução de ICMS (CFOP 5102, CSOSN 102)</li>
                    <li><b>Isento</b> - Produto isento de impostos (CFOP 5102, CSOSN 400)</li>
                    <li><b>Substituição Tributária</b> - ICMS recolhido na fonte (CFOP 5405, CSOSN 500)</li>
                    <li><b>ICMS Fixo 12%</b> - Perfil personalizado com alíquota específica (CSOSN 900)</li>
                    <li><b>Não Tributado</b> - Produto sem incidência de impostos (CFOP 5102, CSOSN 400)</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Seção de Adicionais - Apenas na edição */}
            {editandoProduto && adicionais.length > 0 && (
              <div className="col-span-full">
                <Card>
                  <CardHeader className="px-3 sm:px-4 py-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <CardTitle className="text-base sm:text-lg">Adicionais Disponíveis</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const adicionaisAtivos = adicionais.filter(adicional => adicional.ativo);
                            const todosIds = adicionaisAtivos.map(adicional => adicional.id);
                            setEditProdutoAdicionais(todosIds);
                            toast.success(`${todosIds.length} adicionais selecionados!`);
                          }}
                          className="text-xs sm:text-sm h-8 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                        >
                          ✓ Selecionar Todos
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditProdutoAdicionais([]);
                            toast.info('Seleção de adicionais limpa!');
                          }}
                          className="text-xs sm:text-sm h-8 bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                        >
                          ✗ Limpar Seleção
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-4 pb-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {adicionais.filter(adicional => adicional.ativo).map((adicional) => (
                        <div key={adicional.id} className="flex items-center space-x-2 p-2 sm:p-3 border rounded-lg">
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
                            <Label htmlFor={`adicional-${adicional.id}`} className="font-medium cursor-pointer text-sm">
                              {adicional.nome}
                            </Label>
                            {adicional.descricao && (
                              <p className="text-xs sm:text-sm text-gray-600">{adicional.descricao}</p>
                            )}
                            <p className="text-xs sm:text-sm font-semibold text-green-600">
                              R$ {parseFloat(adicional.preco).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {adicionais.filter(adicional => adicional.ativo).length === 0 && (
                      <p className="text-gray-600 text-center py-4 text-sm sm:text-base">
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

            <div className="flex flex-col sm:flex-row gap-2 col-span-full justify-end">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm h-8 sm:h-9">
                {editandoProduto ? 'Salvar Edição' : 'Adicionar Produto'}
              </Button>
              {editandoProduto && (
                <Button type="button" onClick={handleCancelEdit} variant="outline" className="text-xs sm:text-sm h-8 sm:h-9">
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Lista de Produtos */}
      <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 text-gray-700">Produtos Existentes</h3>
      {filteredProdutos.length === 0 ? (
        <p className="text-gray-600 text-sm sm:text-base">Nenhum produto cadastrado ainda ou nenhum resultado para a busca.</p>
      ) : (
        <div className="space-y-3 sm:space-y-0 sm:overflow-x-auto">
          {/* Versão mobile/tablet - Cards */}
          <div className="sm:hidden space-y-3">
            {filteredProdutos.map((prod) => (
              <div key={prod.id} className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {prod.foto_url ? (
                      <img 
                        src={`${api.defaults.baseURL.replace('/api/v1', '')}${prod.foto_url}`} 
                        alt={prod.nome} 
                        className="h-16 w-16 object-cover rounded-md" 
                      />
                    ) : (
                      <div className="h-16 w-16 bg-gray-200 flex items-center justify-center text-xs text-gray-500 rounded-md">Sem Foto</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-800 truncate">{prod.nome}</h4>
                    <p className="text-xs text-gray-500">{prod.categoria_nome}</p>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <span className="text-xs text-gray-600">Custo: {prod.custo ? `R$ ${parseFloat(prod.custo).toFixed(2)}` : '-'}</span>
                      <span className="text-xs text-gray-600">Margem: {prod.custo && prod.preco ? `${calculateMargemFromPreco(prod.custo, prod.preco)}%` : '-'}</span>
                      <span className="text-sm font-semibold">Preço: R$ {parseFloat(prod.preco).toFixed(2)}</span>
                      {prod.promo_ativa && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Promoção</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      prod.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {prod.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                
                {produtoAdicionais[prod.id] && produtoAdicionais[prod.id].length > 0 && (
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">Adicionais:</span> {produtoAdicionais[prod.id].slice(0, 2).map(a => a.nome).join(', ')}
                    {produtoAdicionais[prod.id].length > 2 && ` +${produtoAdicionais[prod.id].length - 2} mais`}
                  </div>
                )}
                
                {canManage && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleEditClick(prod)} 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs h-8"
                    >
                      Editar
                    </Button>
                    <Button 
                      onClick={() => handleDeleteProduto(prod.id)} 
                      variant="destructive" 
                      size="sm"
                      className="flex-1 text-xs h-8"
                    >
                      Excluir
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Versão desktop - Tabela */}
          <div className="hidden sm:block overflow-x-auto">
            <Table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Foto</TableHead>
                  <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Nome</TableHead>
                  <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Categoria</TableHead>
                  <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Custo</TableHead>
                  <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Margem</TableHead>
                  <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Preço</TableHead>
                  <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Estoque</TableHead>
                  <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Promoção</TableHead>
                  <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Tributação</TableHead>
                  <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Status</TableHead>
                  <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Adicionais</TableHead>
                  {canManage && <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProdutos.map((prod) => (
                  <TableRow key={prod.id} className="hover:bg-gray-50">
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
                    <TableCell className="py-2 px-4 border-b text-sm text-gray-800">{prod.custo !== undefined ? `R$ ${parseFloat(prod.custo).toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="py-2 px-4 border-b text-sm text-gray-800">
                      {prod.custo && prod.preco ? `${calculateMargemFromPreco(prod.custo, prod.preco)}%` : '-'}
                    </TableCell>
                    <TableCell className="py-2 px-4 border-b text-sm text-gray-800">R$ {parseFloat(prod.preco).toFixed(2)}</TableCell>
                    <TableCell className="py-2 px-4 border-b text-sm text-gray-800">{prod.estoque !== undefined ? prod.estoque : '-'}</TableCell>
                    <TableCell className="py-2 px-4 border-b text-sm text-gray-800">
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
                      {(() => {
                        const perfilId = prod.perfil_tributario_id || prod.id_perfil_tributario;
                        if (!perfilId) return '-';
                        const perfil = perfisTributarios.find(p => String(p.id) === String(perfilId));
                        return perfil ? perfil.descricao : '-';
                      })()}
                    </TableCell>
                    <TableCell className="py-2 px-4 border-b text-sm text-gray-800">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        prod.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {prod.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      {prod.promo_ativa && (
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
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleEditClick(prod)} 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-8 px-2"
                          >
                            Editar
                          </Button>
                          <Button 
                            onClick={() => handleDeleteProduto(prod.id)} 
                            variant="destructive" 
                            size="sm"
                            className="text-xs h-8 px-2"
                          >
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProdutosPage;