import React, { useState, useEffect } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { Textarea } from '../ui/textarea';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useErrorDialog } from '../../hooks/use-error-dialog';

const AdicionaisPage = () => {
  const { empresa, loading: empresaLoading } = useEmpresa();
  const { user, token } = useAuth();
  
  const [adicionais, setAdicionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // mantido para permissões
  const { showError, ErrorDialogElement } = useErrorDialog();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdicional, setEditingAdicional] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    ativo: true
  });

  const canManage = user?.role === 'Proprietario' || user?.role === 'Gerente';

  const fetchAdicionais = async () => {
    if (empresaLoading || !empresa || !empresa.slug || !user) {
      setLoading(true);
      return;
    }

    if (!canManage) {
      setError('Você não tem permissão para gerenciar adicionais.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/gerencial/${empresa.slug}/adicionais`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdicionais(response.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao carregar adicionais.';
      toast.error(msg);
      showError(msg);
      console.error("Erro ao carregar adicionais:", err);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdicionais();
  }, [empresa, empresaLoading, user]);

  const handleFormChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [id]: type === 'checkbox' || type === 'switch' ? checked : value 
    }));
  };

  const openModal = (adicional = null) => {
    if (adicional) {
      setEditingAdicional(adicional);
      setFormData({
        nome: adicional.nome || '',
        descricao: adicional.descricao || '',
        preco: adicional.preco || '',
        ativo: !!adicional.ativo
      });
      // Rola suavemente para o topo da página ao editar
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setEditingAdicional(null);
      setFormData({
        nome: '',
        descricao: '',
        preco: '',
        ativo: true
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAdicional(null);
    setFormData({
      nome: '',
      descricao: '',
      preco: '',
      ativo: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!empresa || !empresa.slug) { 
      toast.error('Dados da empresa não carregados.'); 
      return; 
    }

    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório.');
      return;
    }

    if (!formData.preco || parseFloat(formData.preco) < 0) {
      toast.error('Preço deve ser um valor válido.');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = {
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim(),
        preco: parseFloat(formData.preco),
        ativo: formData.ativo ? 1 : 0
      };

      if (editingAdicional) {
        await api.put(`/gerencial/${empresa.slug}/adicionais/${editingAdicional.id}`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Adicional atualizado com sucesso!');
      } else {
        await api.post(`/gerencial/${empresa.slug}/adicionais`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Adicional criado com sucesso!');
      }

      closeModal();
      fetchAdicionais();
    } catch (err) {
      const msgSave = err.response?.data?.message || 'Erro ao salvar adicional.';
      toast.error(msgSave);
      showError(msgSave);
      console.error("Erro ao salvar adicional:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (adicionalId) => {
    if (!confirm('Tem certeza que deseja excluir este adicional?')) return;

    setLoading(true);
    try {
      await api.delete(`/gerencial/${empresa.slug}/adicionais/${adicionalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Adicional excluído com sucesso!');
      fetchAdicionais();
    } catch (err) {
      const msgDel = err.response?.data?.message || 'Erro ao excluir adicional.';
      toast.error(msgDel);
      showError(msgDel);
      console.error("Erro ao excluir adicional:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAtivarTodos = async () => {
    if (!confirm('Deseja ativar todos os adicionais?')) return;
    
    setLoading(true);
    try {
      const promises = adicionais.map(adicional => 
        api.put(`/gerencial/${empresa.slug}/adicionais/${adicional.id}`, 
          { ...adicional, ativo: 1 },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );
      await Promise.all(promises);
      toast.success('Todos os adicionais foram ativados!');
      fetchAdicionais();
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao ativar adicionais.';
      toast.error(msg);
      showError(msg);
      console.error("Erro ao ativar todos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDesativarTodos = async () => {
    if (!confirm('Deseja desativar todos os adicionais?')) return;
    
    setLoading(true);
    try {
      const promises = adicionais.map(adicional => 
        api.put(`/gerencial/${empresa.slug}/adicionais/${adicional.id}`, 
          { ...adicional, ativo: 0 },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );
      await Promise.all(promises);
      toast.success('Todos os adicionais foram desativados!');
      fetchAdicionais();
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao desativar adicionais.';
      toast.error(msg);
      showError(msg);
      console.error("Erro ao desativar todos:", err);
    } finally {
      setLoading(false);
    }
  };

  if (empresaLoading || !empresa) {
    return <div className="p-4 text-center text-gray-600">Carregando dados da empresa...</div>;
  }
  
  if (!canManage) {
    return <div className="p-4 text-red-600 text-center">Você não tem permissão para acessar esta página.</div>;
  }

  if (loading && adicionais.length === 0) {
    return <div className="p-4 text-center text-gray-600">Carregando adicionais...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 text-center">{error}</div>;
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 bg-white rounded-lg shadow-md">
      {ErrorDialogElement}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-title">Gerenciar Adicionais - {empresa.nome_fantasia}</h2>
        <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm h-8 sm:h-9">
          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          Novo Adicional
        </Button>
      </div>

      {adicionais.length === 0 ? (
        <Card>
          <CardContent className="p-4 sm:p-8 text-center">
            <p className="text-gray-600 mb-4 text-sm sm:text-base">Nenhum adicional cadastrado.</p>
            <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm h-8 sm:h-9">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Criar Primeiro Adicional
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {/* Botões de Ação em Massa */}
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              onClick={handleAtivarTodos}
              variant="outline"
              size="sm"
              disabled={loading || adicionais.length === 0}
              className="text-xs sm:text-sm h-8 sm:h-9 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
            >
              ✓ Ativar Todos
            </Button>
            <Button
              onClick={handleDesativarTodos}
              variant="outline"
              size="sm"
              disabled={loading || adicionais.length === 0}
              className="text-xs sm:text-sm h-8 sm:h-9 bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
            >
              ✗ Desativar Todos
            </Button>
          </div>

          {/* Versão mobile/tablet - Cards */}
          <div className="sm:hidden space-y-2">
            {adicionais.map((adicional) => (
              <div key={adicional.id} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-800">{adicional.nome}</h4>
                    {adicional.descricao && (
                      <p className="text-xs text-gray-600 mt-1">{adicional.descricao}</p>
                    )}
                    <p className="text-sm font-semibold text-green-600 mt-1">
                      R$ {parseFloat(adicional.preco || 0).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    adicional.ativo 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {adicional.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => openModal(adicional)}
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-8"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => handleDelete(adicional.id)}
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-8 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Versão desktop - Tabela */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm">Nome</TableHead>
                  <TableHead className="text-sm">Descrição</TableHead>
                  <TableHead className="text-sm">Preço</TableHead>
                  <TableHead className="text-sm">Status</TableHead>
                  <TableHead className="text-right text-sm">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adicionais.map((adicional) => (
                  <TableRow key={adicional.id}>
                    <TableCell className="font-medium text-sm">{adicional.nome}</TableCell>
                    <TableCell className="text-sm">{adicional.descricao || '-'}</TableCell>
                    <TableCell className="text-sm">R$ {parseFloat(adicional.preco || 0).toFixed(2).replace('.', ',')}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        adicional.ativo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {adicional.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => openModal(adicional)}
                          size="sm"
                          variant="outline"
                          className="flex items-center text-xs h-8 px-2"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          onClick={() => handleDelete(adicional.id)}
                          size="sm"
                          variant="outline"
                          className="flex items-center text-red-600 hover:text-red-700 text-xs h-8 px-2"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingAdicional ? 'Editar Adicional' : 'Novo Adicional'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editingAdicional ? 'Edite as informações do adicional.' : 'Preencha as informações do novo adicional.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="nome" className="text-sm">Nome *</Label>
              <Input
                id="nome"
                type="text"
                value={formData.nome}
                onChange={handleFormChange}
                placeholder="Ex: Queijo extra"
                required
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            
            <div>
              <Label htmlFor="descricao" className="text-sm">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={handleFormChange}
                placeholder="Ex: Fatia de queijo cheddar"
                rows={3}
                className="text-sm"
              />
            </div>
            
            <div>
              <Label htmlFor="preco" className="text-sm">Preço (R$) *</Label>
              <Input
                id="preco"
                type="number"
                step="0.01"
                min="0"
                value={formData.preco}
                onChange={handleFormChange}
                placeholder="Ex: 2.50"
                required
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
              />
              <Label htmlFor="ativo" className="text-sm">Ativo</Label>
            </div>
            
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={closeModal} className="text-xs sm:text-sm h-8 sm:h-9">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="text-xs sm:text-sm h-8 sm:h-9">
                {loading && <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />}
                {editingAdicional ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdicionaisPage; 