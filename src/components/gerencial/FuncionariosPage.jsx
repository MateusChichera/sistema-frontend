// frontend/src/components/gerencial/FuncionariosPage.jsx
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const FuncionariosPage = () => {
  const { empresa, loading: empresaLoading } = useEmpresa();
  const { user } = useAuth();
  
  const [funcionarios, setFuncionarios] = useState([]);
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(true);
  const [error, setError] = useState(null);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const { showError, ErrorDialogElement } = useErrorDialog();

  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [novaRole, setNovaRole] = useState('Funcionario');
  const [novoAtivo, setNovoAtivo] = useState(true);

  const [editandoFuncionario, setEditandoFuncionario] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editAtivo, setEditAtivo] = useState(true);
  const [editSenha, setEditSenha] = useState('');

  // Roles permitidas para selecionar no formulário (remova 'Proprietario' se quiser que só o Admin Master crie)
  const availableRoles = ['Funcionario', 'Gerente', 'Caixa']; // Proprietario não pode ser criado via UI do restaurante, apenas via Admin Master.

  // Funçao para carregar os funcionários
  const fetchFuncionarios = async () => {
    // Espera a empresa carregar e o usuário estar autenticado
    if (empresaLoading || !empresa || !empresa.slug || !user) {
      setLoadingFuncionarios(true);
      return;
    }
    
    // Checagem de permissão: Apenas Proprietario pode ver e gerenciar funcionários
    if (user.role !== 'Proprietario') {
      setError('Você não tem permissão para visualizar ou gerenciar funcionários. Apenas o Proprietário tem acesso.');
      setLoadingFuncionarios(false);
      setFuncionarios([]); // Limpa a lista se não tiver permissão
      return;
    }

    setLoadingFuncionarios(true);
    setError(null);
    try {
      const response = await api.get(`/gerencial/${empresa.slug}/funcionarios`);
      setFuncionarios(response.data);
      toast.success("Funcionários carregados com sucesso!"); // Notificação de sucesso

    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao carregar funcionários.';
      toast.error(msg);
      showError(msg);
      setError(null);
    } finally {
      setLoadingFuncionarios(false);
    }
  };

  // useEffect para carregar os funcionários
  useEffect(() => {
    fetchFuncionarios();
  }, [empresa, empresaLoading, user]);


  // Função para adicionar novo funcionário
  const handleAddFuncionario = async (e) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoEmail.trim() || !novaSenha.trim()) {
      toast.error('Nome, Email e Senha são obrigatórios.');
      return;
    }
    if (!empresa || !empresa.slug) { toast.error('Dados da empresa não carregados.'); return; }
    
    setLoadingFuncionarios(true);
    setError(null);
    try {
        const response = await api.post(`/gerencial/${empresa.slug}/funcionarios`, {
            nome: novoNome,
            email: novoEmail,
            senha: novaSenha,
            role: novaRole,
            ativo: novoAtivo
        });
        setFuncionarios(prev => [...prev, response.data.funcionario]);
        setNovoNome(''); setNovoEmail(''); setNovaSenha(''); setNovaRole('Funcionario'); setNovoAtivo(true);
        toast.success('Funcionário adicionado com sucesso!');

    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao adicionar funcionário.');
      toast.error(err.response?.data?.message || 'Erro ao adicionar funcionário.');
      console.error("Erro ao adicionar funcionário:", err);
    } finally {
      setLoadingFuncionarios(false);
    }
  };

  // Função para iniciar a edição
  const handleEditClick = (funcionario) => {
    setEditandoFuncionario(funcionario);
    setEditNome(funcionario.nome);
    setEditEmail(funcionario.email);
    setEditRole(funcionario.role);
    setEditAtivo(funcionario.ativo);
    setEditSenha('');
  };

  // Função para cancelar a edição
  const handleCancelEdit = () => {
    setEditandoFuncionario(null);
    setEditNome(''); setEditEmail(''); setEditRole(''); setEditAtivo(true); setEditSenha('');
  };

  // Função para salvar edição
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editNome.trim()) {
      toast.error('O nome do funcionário não pode ser vazio.');
      return;
    }
    if (!empresa || !empresa.slug) { toast.error('Dados da empresa não carregados.'); return; }
    
    setLoadingFuncionarios(true);
    setError(null);
    try {
        const dataToUpdate = { nome: editNome, role: editRole, ativo: editAtivo };
        if (editSenha.trim()) { dataToUpdate.senha = editSenha; } // Inclui senha apenas se alterada

        await api.put(`/gerencial/${empresa.slug}/funcionarios/${editandoFuncionario.id}`, dataToUpdate);

        setFuncionarios(prev => prev.map(func => 
            func.id === editandoFuncionario.id ? { ...func, nome: editNome, role: editRole, ativo: editAtivo } : func
        ));
        handleCancelEdit();
        toast.success('Funcionário atualizado com sucesso!');
    } catch (err) {
     // setError(err.response?.data?.message || 'Erro ao atualizar funcionário.');
      toast.error(err.response?.data?.message || 'Erro ao atualizar funcionário.');
      console.error("Erro ao atualizar funcionário:", err);
    } finally {
      setLoadingFuncionarios(false);
    }
  };

  // Função para excluir funcionário
  const handleDeleteFuncionario = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este funcionário?')) {
      return;
    }
    if (!empresa || !empresa.slug) { toast.error('Dados da empresa não carregados.'); return; }
    
    setLoadingFuncionarios(true);
    setError(null);
    try {
        await api.delete(`/gerencial/${empresa.slug}/funcionarios/${id}`);
        setFuncionarios(prev => prev.filter(func => func.id !== id));
        toast.success('Funcionário excluído com sucesso!');
    } catch (err) {
      //setError(err.response?.data?.message || 'Erro ao excluir funcionário.');
      toast.error(err.response?.data?.message || 'Erro ao excluir funcionário.');
      console.error("Erro ao excluir funcionário:", err);
    } finally {
      setLoadingFuncionarios(false);
    }
  };

  const handleKeyDown = (e) => {
    setCapsLockOn(e.getModifierState('CapsLock'));
  };

  const handleKeyUp = (e) => {
    setCapsLockOn(e.getModifierState('CapsLock'));
  };

  if (empresaLoading) {
    return <div className="p-4 text-center text-gray-600">Carregando dados da empresa...</div>;
  }

  if (!empresa) {
    return <div className="p-4 text-red-600 text-center">Nenhuma empresa carregada para exibir funcionários.</div>;
  }
  
  if (user?.role !== 'Proprietario') { // Acesso negado se não for Proprietario
    return <div className="p-4 text-red-600 text-center">Você não tem permissão para acessar esta página. Apenas proprietários podem gerenciar funcionários.</div>;
  }

  if (loadingFuncionarios) {
    return <div className="p-4 text-center text-gray-600">Carregando funcionários...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 text-center">{error}</div>;
  }
  
  return (
    <div className="p-2 sm:p-4 md:p-6 bg-white rounded-lg shadow-md">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-6 text-title">Gerenciar Funcionários - {empresa.nome_fantasia}</h2>

      {/* Formulário para Adicionar/Editar Funcionário */}
      <form onSubmit={editandoFuncionario ? handleSaveEdit : handleAddFuncionario} className="mb-6 sm:mb-8 p-3 sm:p-4 border rounded-lg bg-gray-50">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 text-gray-700">
          {editandoFuncionario ? `Editar Funcionário: ${editandoFuncionario.nome}` : 'Adicionar Novo Funcionário'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-end">
          <div>
            <Label htmlFor="nome" className="text-sm">Nome</Label>
            <Input
              id="nome"
              type="text"
              placeholder="Nome Completo"
              value={editandoFuncionario ? editNome : novoNome}
              onChange={(e) => editandoFuncionario ? setEditNome(e.target.value) : setNovoNome(e.target.value)}
              required
              className="h-9 sm:h-10 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@empresa.com"
              value={editandoFuncionario ? editEmail : novoEmail}
              onChange={(e) => editandoFuncionario ? setEditEmail(e.target.value) : setNovoEmail(e.target.value)}
              disabled={!!editandoFuncionario}
              required
              className="h-9 sm:h-10 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="senha" className="text-sm">{editandoFuncionario ? 'Nova Senha (opcional)' : 'Senha'}</Label>
            <Input
              id="senha"
              type="password"
              placeholder={editandoFuncionario ? 'Deixe em branco para manter a atual' : 'Defina uma senha'}
              value={editandoFuncionario ? editSenha : novaSenha}
              onChange={(e) => editandoFuncionario ? setEditSenha(e.target.value) : setNovaSenha(e.target.value)}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              required={!editandoFuncionario}
              className="h-9 sm:h-10 text-sm"
            />
            {capsLockOn && (
              <p className="text-amber-600 text-xs mt-1 flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                Caps Lock está ativado
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="role" className="text-sm">Cargo (Role)</Label>
            <Select 
              value={editandoFuncionario ? editRole : novaRole} 
              onValueChange={(value) => editandoFuncionario ? setEditRole(value) : setNovaRole(value)}
              disabled={user?.role !== 'Proprietario' || (editandoFuncionario && editandoFuncionario.id === user?.id)} 
            >
              <SelectTrigger id="role" className="h-9 sm:h-10 text-sm">
                <SelectValue placeholder="Selecione um cargo" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {editandoFuncionario && (
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={editAtivo}
                onCheckedChange={setEditAtivo}
              />
              <Label htmlFor="ativo" className="text-sm">Ativo</Label>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 col-span-1 md:col-span-2 lg:col-span-1">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm h-8 sm:h-9">
              {editandoFuncionario ? 'Salvar Edição' : 'Adicionar Funcionário'}
            </Button>
            {editandoFuncionario && (
              <Button type="button" onClick={handleCancelEdit} variant="outline" className="text-xs sm:text-sm h-8 sm:h-9">
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Lista de Funcionários */}
      <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 text-gray-700">Funcionários Existentes</h3>
      {funcionarios.length === 0 ? (
        <p className="text-gray-600 text-sm sm:text-base">Nenhum funcionário cadastrado ainda.</p>
      ) : (
        <div className="space-y-2 sm:space-y-0 sm:overflow-x-auto">
          {/* Versão mobile/tablet - Cards */}
          <div className="sm:hidden space-y-2">
            {funcionarios.map((func) => (
              <div key={func.id} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-800">{func.nome}</h4>
                    <p className="text-xs text-gray-500">ID: {func.id}</p>
                    <p className="text-xs text-gray-600">{func.email}</p>
                    <p className="text-sm font-semibold text-blue-600 mt-1">{func.role}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    func.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {func.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleEditClick(func)} 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs h-8"
                    disabled={user?.role !== 'Proprietario' || (func.role === 'Proprietario' && func.id !== user?.id)} 
                  >
                    Editar
                  </Button>
                  <Button 
                    onClick={() => handleDeleteFuncionario(func.id)} 
                    variant="destructive" 
                    size="sm"
                    className="flex-1 text-xs h-8"
                    disabled={user?.role !== 'Proprietario' || func.id === user?.id || func.role === 'Proprietario'} 
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
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Nome</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Email</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Cargo</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Status</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {funcionarios.map((func) => (
                  <tr key={func.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b text-sm text-gray-800">{func.id}</td>
                    <td className="py-2 px-4 border-b text-sm text-gray-800">{func.nome}</td>
                    <td className="py-2 px-4 border-b text-sm text-gray-800">{func.email}</td>
                    <td className="py-2 px-4 border-b text-sm text-gray-800">{func.role}</td>
                    <td className="py-2 px-4 border-b text-sm text-gray-800">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        func.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {func.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b text-sm">
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleEditClick(func)} 
                          variant="outline" 
                          size="sm" 
                          className="text-xs h-8 px-2"
                          disabled={user?.role !== 'Proprietario' || (func.role === 'Proprietario' && func.id !== user?.id)} 
                        >
                          Editar
                        </Button>
                        <Button 
                          onClick={() => handleDeleteFuncionario(func.id)} 
                          variant="destructive" 
                          size="sm"
                          className="text-xs h-8 px-2"
                          disabled={user?.role !== 'Proprietario' || func.id === user?.id || func.role === 'Proprietario'} 
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
      {ErrorDialogElement}
    </div>
  );
};

export default FuncionariosPage;