// frontend/src/components/gerencial/CadastrosPage.jsx
import React, { useState, useEffect } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { useErrorDialog } from '../../hooks/use-error-dialog';

const CadastrosPage = () => {
  const { empresa, loading: empresaLoading } = useEmpresa(); // Remove isReady aqui, pois o LayoutGerencial já a trata
  const { user } = useAuth();
  
  const [categorias, setCategorias] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [error, setError] = useState(null);
  const { showError, ErrorDialogElement } = useErrorDialog();

  const [novaDescricao, setNovaDescricao] = useState('');
  const [editandoCategoria, setEditandoCategoria] = useState(null);
  const [editDescricao, setEditDescricao] = useState('');
  const [editAtivo, setEditAtivo] = useState(true);

  useEffect(() => {
    const fetchCategorias = async () => {
      // O LayoutGerencial agora garante que 'empresa' e 'empresa.slug' são válidos e carregados.
      // Aqui, precisamos apenas verificar se 'empresa' e 'user' estão presentes
      // e se a empresa não está mais no estado de carregamento inicial.
      if (!empresa || !user || empresaLoading) {
        setLoadingCategorias(true); // Mantém o loading se o contexto ainda não está pronto
        console.log("CadastrosPage: Aguardando empresa ou user estarem prontos...");
        return; 
      }
      
      // Checagem de permissão
      const allowedRoles = ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'];
      if (!allowedRoles.includes(user.role)) {
        setError('Você não tem permissão para visualizar categorias.');
        setLoadingCategorias(false);
        return;
      }

      setLoadingCategorias(true);
      setError(null);
      try {
        console.log(`CadastrosPage: Tentando buscar categorias para slug: ${empresa.slug}`);
        const response = await api.get(`/gerencial/${empresa.slug}/categorias`);
        setCategorias(response.data);
        console.log("CadastrosPage: Categorias carregadas:", response.data);
      } catch (err) {
        const msg = err.response?.data?.message || 'Erro ao carregar categorias.';
        toast.error(msg);
        showError(msg);
        setError(null);
        console.error("CadastrosPage: Erro ao carregar categorias:", err);
      } finally {
        setLoadingCategorias(false);
      }
    };

    fetchCategorias();
    // Dependências: `empresa` e `user`.
    // O `useEffect` será re-executado se `empresa` ou `user` mudarem.
    // `empresaLoading` também deve ser uma dependência para reagir a mudanças no estado de carregamento da empresa.
  }, [empresa, user, empresaLoading]); 


  const handleAddCategoria = async (e) => {
    e.preventDefault();
    if (!novaDescricao.trim()) { toast.error('A descrição da categoria não pode ser vazia.'); return; }
    if (!empresa || !empresa.slug) { toast.error('Dados da empresa não carregados.'); return; }
    setLoadingCategorias(true); setError(null);
    try {
      const response = await api.post(`/gerencial/${empresa.slug}/categorias`, { descricao: novaDescricao });
      setCategorias(prev => [...prev, response.data.categoria]); setNovaDescricao('');
      toast.success('Categoria adicionada com sucesso!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao adicionar categoria.';
      toast.error(msg);
      showError(msg);
      console.error("Erro ao adicionar categoria:", err);
    } finally { setLoadingCategorias(false); }
  };

  const handleEditClick = (categoria) => { setEditandoCategoria(categoria); setEditDescricao(categoria.descricao); setEditAtivo(categoria.ativo); };
  const handleCancelEdit = () => { setEditandoCategoria(null); setEditDescricao(''); setEditAtivo(true); };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editDescricao.trim()) { toast.error('A descrição não pode ser vazia.'); return; }
    if (!empresa || !empresa.slug) { toast.error('Dados da empresa não carregados.'); return; }
    setLoadingCategorias(true); setError(null);
    try {
      await api.put(`/gerencial/${empresa.slug}/categorias/${editandoCategoria.id}`, { descricao: editDescricao, ativo: editAtivo });
      setCategorias(prev => prev.map(cat => cat.id === editandoCategoria.id ? { ...cat, descricao: editDescricao, ativo: editAtivo } : cat));
      handleCancelEdit();
      toast.success('Categoria atualizada com sucesso!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao atualizar categoria.';
      toast.error(msg);
      showError(msg);
      console.error("Erro ao atualizar categoria:", err);
    } finally { setLoadingCategorias(false); }
  };

  const handleDeleteCategoria = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria? Isso pode afetar produtos vinculados!')) { return; }
    if (!empresa || !empresa.slug) { toast.error('Dados da empresa não carregados.'); return; }
    setLoadingCategorias(true); setError(null);
    try {
      await api.delete(`/gerencial/${empresa.slug}/categorias/${id}`);
      setCategorias(prev => prev.filter(cat => cat.id !== id));
      toast.success('Categoria excluída com sucesso!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao excluir categoria.';
      toast.error(msg);
      showError(msg);
      console.error("Erro ao excluir categoria:", err);
    } finally { setLoadingCategorias(false); }
  };

  // Renderização condicional para CadastrosPage
  if (loadingCategorias) {
    return <div className="p-4 text-center text-gray-600">Carregando categorias...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 text-center">{error}</div>;
  }
  
  // Se chegamos até aqui, categorias foram carregadas (mesmo que vazias) e não há erro.
  return (
    <div className="p-2 sm:p-4 md:p-6 bg-white rounded-lg shadow-md">
      {ErrorDialogElement}
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Gerenciar Categorias - {empresa.nome_fantasia}</h2>

      {/* Formulário para Adicionar/Editar Categoria */}
      <form onSubmit={editandoCategoria ? handleSaveEdit : handleAddCategoria} className="mb-6 sm:mb-8 p-3 sm:p-4 border rounded-lg bg-gray-50">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 text-gray-700">
          {editandoCategoria ? 'Editar Categoria' : 'Adicionar Nova Categoria'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-end">
          <div>
            <Label htmlFor="descricao" className="text-sm">Descrição</Label>
            <Input
              id="descricao"
              type="text"
              placeholder="Ex: Pizzas, Bebidas, Sobremesas"
              value={editandoCategoria ? editDescricao : novaDescricao}
              onChange={(e) => editandoCategoria ? setEditDescricao(e.target.value) : setNovaDescricao(e.target.value)}
              required
              className="h-9 sm:h-10 text-sm"
            />
          </div>
          {editandoCategoria && (
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={editAtivo}
                onCheckedChange={setEditAtivo}
              />
              <Label htmlFor="ativo" className="text-sm">Ativa</Label>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm h-8 sm:h-9">
              {editandoCategoria ? 'Salvar Edição' : 'Adicionar Categoria'}
            </Button>
            {editandoCategoria && (
              <Button type="button" onClick={handleCancelEdit} variant="outline" className="text-xs sm:text-sm h-8 sm:h-9">
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Lista de Categorias */}
      <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 text-gray-700">Categorias Existentes</h3>
      {categorias.length === 0 ? (
        <p className="text-gray-600 text-sm sm:text-base">Nenhuma categoria cadastrada ainda.</p>
      ) : (
        <div className="space-y-2 sm:space-y-0 sm:overflow-x-auto">
          {/* Versão mobile/tablet - Cards */}
          <div className="sm:hidden space-y-2">
            {categorias.map((categoria) => (
              <div key={categoria.id} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{categoria.descricao}</p>
                    <p className="text-xs text-gray-500">ID: {categoria.id}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    categoria.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {categoria.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleEditClick(categoria)} 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs h-8"
                  >
                    Editar
                  </Button>
                  <Button 
                    onClick={() => handleDeleteCategoria(categoria.id)} 
                    variant="destructive" 
                    size="sm"
                    className="flex-1 text-xs h-8"
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Versão desktop - Tabela */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">ID</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Descrição</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Status</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((categoria) => (
                  <tr key={categoria.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b text-sm text-gray-800">{categoria.id}</td>
                    <td className="py-2 px-4 border-b text-sm text-gray-800">{categoria.descricao}</td>
                    <td className="py-2 px-4 border-b text-sm text-gray-800">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        categoria.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {categoria.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b text-sm">
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleEditClick(categoria)} 
                          variant="outline" 
                          size="sm" 
                          className="text-xs h-8 px-2"
                        >
                          Editar
                        </Button>
                        <Button 
                          onClick={() => handleDeleteCategoria(categoria.id)} 
                          variant="destructive" 
                          size="sm"
                          className="text-xs h-8 px-2"
                        >
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CadastrosPage;