// frontend/src/components/gerencial/MesasPage.jsx
import React, { useState, useEffect } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const MesasPage = () => {
  const { empresa, loading: empresaLoading } = useEmpresa();
  const { user } = useAuth();
  
  const [mesas, setMesas] = useState([]);
  const [loadingMesas, setLoadingMesas] = useState(true);
  const [error, setError] = useState(null);

  // Estados para o formulário de adicionar/editar
  const [novoNumero, setNovoNumero] = useState('');
  const [novaCapacidade, setNovaCapacidade] = useState('');
  const [novoStatus, setNovoStatus] = useState('Livre'); // ENUM do DB
  const [novoAtivo, setNovoAtivo] = useState(true);

  const [editandoMesa, setEditandoMesa] = useState(null);
  const [editNumero, setEditNumero] = useState('');
  const [editCapacidade, setEditCapacidade] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editAtivo, setEditAtivo] = useState(true);

  // Opções de status do ENUM do DB
  const statusOptions = ['Livre', 'Ocupada', 'Reservada'];

  // Função para carregar as mesas
  const fetchMesas = async () => {
    if (empresaLoading || !empresa || !empresa.slug || !user) {
      setLoadingMesas(true);
      return;
    }
    
    // Todos os funcionários podem visualizar mesas
    const allowedRoles = ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'];
    if (!allowedRoles.includes(user.role)) {
      setError('Você não tem permissão para visualizar mesas.');
      setLoadingMesas(false);
      setMesas([]);
      return;
    }

    setLoadingMesas(true);
    setError(null);
    try {
      const response = await api.get(`/gerencial/${empresa.slug}/mesas`);
      setMesas(response.data);
      toast.success("Mesas carregadas com sucesso!");

    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar mesas.');
      console.error("Erro ao carregar mesas:", err);
      toast.error(err.response?.data?.message || 'Erro ao carregar mesas.');
    } finally {
      setLoadingMesas(false);
    }
  };

  useEffect(() => {
    fetchMesas();
  }, [empresa, empresaLoading, user]);


  // Função para adicionar nova mesa
  const handleAddMesa = async (e) => {
    e.preventDefault();
    if (!novoNumero.trim() || !novaCapacidade.trim()) {
      toast.error('Número da mesa e capacidade são obrigatórios.');
      return;
    }
    if (!empresa || !empresa.slug) { toast.error('Dados da empresa não carregados.'); return; }
    
    setLoadingMesas(true);
    setError(null);
    try {
        const response = await api.post(`/gerencial/${empresa.slug}/mesas`, {
            numero: novoNumero,
            capacidade: parseInt(novaCapacidade),
            status: novoStatus,
            ativo: novoAtivo
        });
        setMesas(prev => [...prev, response.data.mesa]);
        setNovoNumero(''); setNovaCapacidade(''); setNovoStatus('Livre'); setNovoAtivo(true);
        toast.success('Mesa adicionada com sucesso!');

    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao adicionar mesa.');
      toast.error(err.response?.data?.message || 'Erro ao adicionar mesa.');
      console.error("Erro ao adicionar mesa:", err);
    } finally {
      setLoadingMesas(false);
    }
  };

  // Função para iniciar a edição
  const handleEditClick = (mesa) => {
    setEditandoMesa(mesa);
    setEditNumero(mesa.numero);
    setEditCapacidade(mesa.capacidade.toString());
    setEditStatus(mesa.status);
    setEditAtivo(mesa.ativo);
  };

  // Função para cancelar a edição
  const handleCancelEdit = () => {
    setEditandoMesa(null);
    setEditNumero(''); setEditCapacidade(''); setEditStatus('Livre'); setEditAtivo(true);
  };

  // Função para salvar edição
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editNumero.trim() || !editCapacidade.trim()) {
      toast.error('Número da mesa e capacidade são obrigatórios.');
      return;
    }
    if (!empresa || !empresa.slug) { toast.error('Dados da empresa não carregados.'); return; }
    
    setLoadingMesas(true);
    setError(null);
    try {
        await api.put(`/gerencial/${empresa.slug}/mesas/${editandoMesa.id}`, {
            numero: editNumero,
            capacidade: parseInt(editCapacidade),
            status: editStatus,
            ativo: editAtivo
        });

        setMesas(prev => prev.map(m => 
            m.id === editandoMesa.id ? { ...m, numero: editNumero, capacidade: parseInt(editCapacidade), status: editStatus, ativo: editAtivo } : m
        ));
        handleCancelEdit();
        toast.success('Mesa atualizada com sucesso!');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao atualizar mesa.');
      toast.error(err.response?.data?.message || 'Erro ao atualizar mesa.');
      console.error("Erro ao atualizar mesa:", err);
    } finally {
      setLoadingMesas(false);
    }
  };

  // Função para excluir mesa
  const handleDeleteMesa = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta mesa? Isso pode afetar pedidos vinculados!')) {
      return;
    }
    if (!empresa || !empresa.slug) { toast.error('Dados da empresa não carregados.'); return; }
    
    setLoadingMesas(true);
    setError(null);
    try {
        await api.delete(`/gerencial/${empresa.slug}/mesas/${id}`);
        setMesas(prev => prev.filter(m => m.id !== id));
        toast.success('Mesa excluída com sucesso!');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao excluir mesa.');
      toast.error(err.response?.data?.message || 'Erro ao excluir mesa.');
      console.error("Erro ao excluir mesa:", err);
    } finally {
      setLoadingMesas(false);
    }
  };

  // Verificação de permissão para gerenciar (CRUD completo)
  const canManage = user?.role === 'Proprietario' || user?.role === 'Gerente';
  // Verificação de permissão para visualizar (todos os funcionários podem)
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

  if (loadingMesas) {
    return <div className="p-4 text-center text-gray-600">Carregando mesas...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 text-center">{error}</div>;
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Gerenciar Mesas - {empresa.nome_fantasia}</h2>

      {/* Formulário para Adicionar/Editar Mesa - Visível apenas para quem pode gerenciar */}
      {canManage && (
        <form onSubmit={editandoMesa ? handleSaveEdit : handleAddMesa} className="mb-8 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">
            {editandoMesa ? `Editar Mesa: ${editandoMesa.numero}` : 'Adicionar Nova Mesa'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="numero">Número da Mesa</Label>
              <Input
                id="numero"
                type="text"
                placeholder="Ex: 1, A1, Balcão"
                value={editandoMesa ? editNumero : novoNumero}
                onChange={(e) => editandoMesa ? setEditNumero(e.target.value) : setNovoNumero(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="capacidade">Capacidade</Label>
              <Input
                id="capacidade"
                type="number"
                min="1"
                placeholder="Ex: 4"
                value={editandoMesa ? editCapacidade : novaCapacidade}
                onChange={(e) => editandoMesa ? setEditCapacidade(e.target.value) : setNovaCapacidade(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={editandoMesa ? editStatus : novoStatus} 
                onValueChange={(value) => editandoMesa ? setEditStatus(value) : setNovoStatus(value)}
                required
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={editandoMesa ? editAtivo : novoAtivo}
                onCheckedChange={(checked) => editandoMesa ? setEditAtivo(checked) : setNovoAtivo(checked)}
              />
              <Label htmlFor="ativo">Ativa</Label>
            </div>
            <div className="flex gap-2 col-span-1 md:col-span-3 justify-end">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                {editandoMesa ? 'Salvar Edição' : 'Adicionar Mesa'}
              </Button>
              {editandoMesa && (
                <Button type="button" onClick={handleCancelEdit} variant="outline">
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Lista de Mesas */}
      <h3 className="text-xl font-semibold mb-4 text-gray-700">Mesas Existentes</h3>
      {mesas.length === 0 ? (
        <p className="text-gray-600">{canManage ? 'Nenhuma mesa cadastrada ainda. Use o formulário acima para adicionar.' : 'Nenhuma mesa cadastrada para esta empresa.'}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Número</TableHead>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Capacidade</TableHead>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Status</TableHead>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Ativa</TableHead>
                {canManage && <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {mesas.map((mesa) => (
                <TableRow key={mesa.id} className="hover:bg-gray-50">
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">{mesa.numero}</TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">{mesa.capacidade}</TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      mesa.status === 'Livre' ? 'bg-green-100 text-green-800' : 
                      mesa.status === 'Ocupada' ? 'bg-red-100 text-red-800' : 
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {mesa.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      mesa.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {mesa.ativo ? 'Sim' : 'Não'}
                    </span>
                  </TableCell>
                  {canManage && (
                    <TableCell className="py-2 px-4 border-b text-sm">
                      <Button 
                        onClick={() => handleEditClick(mesa)} 
                        variant="outline" 
                        size="sm" 
                        className="mr-2"
                      >
                        Editar
                      </Button>
                      <Button 
                        onClick={() => handleDeleteMesa(mesa.id)} 
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

export default MesasPage;