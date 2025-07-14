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

const AdicionaisPage = () => {
  const { empresa, loading: empresaLoading } = useEmpresa();
  const { user, token } = useAuth();
  
  const [adicionais, setAdicionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
      setError(err.response?.data?.message || 'Erro ao carregar adicionais.');
      console.error("Erro ao carregar adicionais:", err);
      toast.error(err.response?.data?.message || 'Erro ao carregar adicionais.');
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
      toast.error(err.response?.data?.message || 'Erro ao salvar adicional.');
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
      toast.error(err.response?.data?.message || 'Erro ao excluir adicional.');
      console.error("Erro ao excluir adicional:", err);
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
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gerenciar Adicionais - {empresa.nome_fantasia}</h2>
        <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Novo Adicional
        </Button>
      </div>

      {adicionais.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 mb-4">Nenhum adicional cadastrado.</p>
            <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Adicional
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adicionais.map((adicional) => (
                <TableRow key={adicional.id}>
                  <TableCell className="font-medium">{adicional.nome}</TableCell>
                  <TableCell>{adicional.descricao || '-'}</TableCell>
                  <TableCell>R$ {parseFloat(adicional.preco || 0).toFixed(2).replace('.', ',')}</TableCell>
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
                        className="flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => handleDelete(adicional.id)}
                        size="sm"
                        variant="outline"
                        className="flex items-center text-red-600 hover:text-red-700"
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
      )}

      {/* Modal de Criação/Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAdicional ? 'Editar Adicional' : 'Novo Adicional'}
            </DialogTitle>
            <DialogDescription>
              {editingAdicional ? 'Edite as informações do adicional.' : 'Preencha as informações do novo adicional.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                type="text"
                value={formData.nome}
                onChange={handleFormChange}
                placeholder="Ex: Queijo extra"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={handleFormChange}
                placeholder="Ex: Fatia de queijo cheddar"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="preco">Preço (R$) *</Label>
              <Input
                id="preco"
                type="number"
                step="0.01"
                min="0"
                value={formData.preco}
                onChange={handleFormChange}
                placeholder="Ex: 2.50"
                required
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
              />
              <Label htmlFor="ativo">Ativo</Label>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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