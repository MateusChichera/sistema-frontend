// frontend/src/components/gerencial/FormasPagamentoPage.jsx
import React, { useState, useEffect } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const FormasPagamentoPage = () => {
  const { empresa, loading: empresaLoading } = useEmpresa();
  const { user } = useAuth(); // Para verificar a role do usuário logado
  
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [loadingFormas, setLoadingFormas] = useState(true);
  const [error, setError] = useState(null);

  // Estados para o formulário de adicionar/editar
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoDesconto, setNovoDesconto] = useState(0.00);
  const [novoAtivo, setNovoAtivo] = useState(true);

  const [editandoForma, setEditandoForma] = useState(null); // Objeto da forma sendo editada
  const [editDescricao, setEditDescricao] = useState('');
  const [editDesconto, setEditDesconto] = useState(0.00);
  const [editAtivo, setEditAtivo] = useState(true);

  // Função para carregar as formas de pagamento
  const fetchFormasPagamento = async () => {
    // Espera a empresa carregar e o usuário estar autenticado
    if (empresaLoading || !empresa || !empresa.slug || !user) {
      setLoadingFormas(true);
      return;
    }
    
    // Checagem de permissão: Todos os funcionários podem visualizar as formas
    const allowedRoles = ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'];
    if (!allowedRoles.includes(user.role)) {
      setError('Você não tem permissão para visualizar formas de pagamento.');
      setLoadingFormas(false);
      setFormasPagamento([]);
      return;
    }

    setLoadingFormas(true);
    setError(null);
    try {
      const response = await api.get(`/gerencial/${empresa.slug}/formas-pagamento`);
      setFormasPagamento(response.data);
      toast.success("Formas de pagamento carregadas com sucesso!");

    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar formas de pagamento.');
      console.error("Erro ao carregar formas de pagamento:", err);
      toast.error(err.response?.data?.message || 'Erro ao carregar formas de pagamento.');
    } finally {
      setLoadingFormas(false);
    }
  };

  // useEffect para carregar as formas de pagamento
  useEffect(() => {
    fetchFormasPagamento();
  }, [empresa, empresaLoading, user]);


  // Função para adicionar nova forma de pagamento
  const handleAddFormaPagamento = async (e) => {
    e.preventDefault();
    if (!novaDescricao.trim()) {
      toast.error('A descrição é obrigatória.');
      return;
    }
    if (!empresa || !empresa.slug) { toast.error('Dados da empresa não carregados.'); return; }
    
    setLoadingFormas(true);
    setError(null);
    try {
        const response = await api.post(`/gerencial/${empresa.slug}/formas-pagamento`, {
            descricao: novaDescricao,
            porcentagem_desconto_geral: parseFloat(novoDesconto), // Converte para número
            ativo: novoAtivo
        });
        setFormasPagamento(prev => [...prev, response.data.formaPagamento]);
        setNovaDescricao(''); setNovoDesconto(0.00); setNovoAtivo(true);
        toast.success('Forma de pagamento adicionada com sucesso!');

    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao adicionar forma de pagamento.');
      toast.error(err.response?.data?.message || 'Erro ao adicionar forma de pagamento.');
      console.error("Erro ao adicionar forma de pagamento:", err);
    } finally {
      setLoadingFormas(false);
    }
  };

  // Função para iniciar a edição
  const handleEditClick = (forma) => {
    setEditandoForma(forma);
    setEditDescricao(forma.descricao);
    setEditDesconto(parseFloat(forma.porcentagem_desconto_geral)); // Garante que é número
    setEditAtivo(forma.ativo);
  };

  // Função para cancelar a edição
  const handleCancelEdit = () => {
    setEditandoForma(null);
    setEditDescricao(''); setEditDesconto(0.00); setEditAtivo(true);
  };

  // Função para salvar edição
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editDescricao.trim()) {
      toast.error('A descrição não pode ser vazia.');
      return;
    }
    if (!empresa || !empresa.slug) { toast.error('Dados da empresa não carregados.'); return; }
    
    setLoadingFormas(true);
    setError(null);
    try {
        await api.put(`/gerencial/${empresa.slug}/formas-pagamento/${editandoForma.id}`, {
            descricao: editDescricao,
            porcentagem_desconto_geral: parseFloat(editDesconto),
            ativo: editAtivo
        });

        setFormasPagamento(prev => prev.map(fp => 
            fp.id === editandoForma.id ? { ...fp, descricao: editDescricao, porcentagem_desconto_geral: parseFloat(editDesconto), ativo: editAtivo } : fp
        ));
        handleCancelEdit();
        toast.success('Forma de pagamento atualizada com sucesso!');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao atualizar forma de pagamento.');
      toast.error(err.response?.data?.message || 'Erro ao atualizar forma de pagamento.');
      console.error("Erro ao atualizar forma de pagamento:", err);
    } finally {
      setLoadingFormas(false);
    }
  };

  // Função para excluir forma de pagamento
  const handleDeleteFormaPagamento = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta forma de pagamento? Isso pode afetar pedidos vinculados!')) {
      return;
    }
    if (!empresa || !empresa.slug) { toast.error('Dados da empresa não carregados.'); return; }
    
    setLoadingFormas(true);
    setError(null);
    try {
        await api.delete(`/gerencial/${empresa.slug}/formas-pagamento/${id}`);
        setFormasPagamento(prev => prev.filter(fp => fp.id !== id));
        toast.success('Forma de pagamento excluída com sucesso!');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao excluir forma de pagamento.');
      toast.error(err.response?.data?.message || 'Erro ao excluir forma de pagamento.');
      console.error("Erro ao excluir forma de pagamento:", err);
    } finally {
      setLoadingFormas(false);
    }
  };

  // Verificação de permissão para o Proprietário/Gerente (para adicionar/editar/excluir)
  const canManage = user?.role === 'Proprietario' || user?.role === 'Gerente';

  if (empresaLoading) {
    return <div className="p-4 text-center text-gray-600">Carregando dados da empresa...</div>;
  }

  if (!empresa) {
    return <div className="p-4 text-red-600 text-center">Nenhuma empresa carregada para exibir formas de pagamento.</div>;
  }
  
  // Acesso negado para visualização, se não for uma role permitida
  const allowedViewRoles = ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'];
  if (!allowedViewRoles.includes(user?.role)) {
    return <div className="p-4 text-red-600 text-center">Você não tem permissão para acessar esta página.</div>;
  }

  if (loadingFormas) {
    return <div className="p-4 text-center text-gray-600">Carregando formas de pagamento...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 text-center">{error}</div>;
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Gerenciar Formas de Pagamento - {empresa.nome_fantasia}</h2>

      {/* Formulário para Adicionar/Editar Forma de Pagamento - Visível apenas para quem pode gerenciar */}
      {canManage && (
        <form onSubmit={editandoForma ? handleSaveEdit : handleAddFormaPagamento} className="mb-8 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">
            {editandoForma ? `Editar Forma: ${editandoForma.descricao}` : 'Adicionar Nova Forma de Pagamento'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                type="text"
                placeholder="Ex: Dinheiro, Cartão de Crédito, PIX"
                value={editandoForma ? editDescricao : novaDescricao}
                onChange={(e) => editandoForma ? setEditDescricao(e.target.value) : setNovaDescricao(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="desconto">Desconto (%)</Label>
              <Input
                id="desconto"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Ex: 5.00"
                value={editandoForma ? editDesconto : novoDesconto}
                onChange={(e) => editandoForma ? setEditDesconto(e.target.value) : setNovoDesconto(e.target.value)}
                required
              />
            </div>
            {editandoForma && ( // O switch de ativo só aparece na edição
              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={editAtivo}
                  onCheckedChange={setEditAtivo}
                />
                <Label htmlFor="ativo">Ativa</Label>
              </div>
            )}
            <div className="flex gap-2 col-span-1 md:col-span-3">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                {editandoForma ? 'Salvar Edição' : 'Adicionar Forma'}
              </Button>
              {editandoForma && (
                <Button type="button" onClick={handleCancelEdit} variant="outline">
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Lista de Formas de Pagamento */}
      <h3 className="text-xl font-semibold mb-4 text-gray-700">Formas de Pagamento Existentes</h3>
      {formasPagamento.length === 0 ? (
        <p className="text-gray-600">{canManage ? 'Nenhuma forma de pagamento cadastrada ainda. Use o formulário acima para adicionar.' : 'Nenhuma forma de pagamento cadastrada para esta empresa.'}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">ID</TableHead>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Descrição</TableHead>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Desconto (%)</TableHead>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Status</TableHead>
                {canManage && <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {formasPagamento.map((forma) => (
                <TableRow key={forma.id} className="hover:bg-gray-50">
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">{forma.id}</TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">{forma.descricao}</TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">{parseFloat(forma.porcentagem_desconto_geral).toFixed(2)}%</TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      forma.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {forma.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </TableCell>
                  {canManage && (
                    <TableCell className="py-2 px-4 border-b text-sm">
                      <Button 
                        onClick={() => handleEditClick(forma)} 
                        variant="outline" 
                        size="sm" 
                        className="mr-2"
                      >
                        Editar
                      </Button>
                      <Button 
                        onClick={() => handleDeleteFormaPagamento(forma.id)} 
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

export default FormasPagamentoPage;