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
import { Loader2, Plus, Edit, Trash2, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useErrorDialog } from '../../hooks/use-error-dialog';

const FormasPagamentoPage = () => {
  const { empresa, loading: empresaLoading } = useEmpresa();
  const { user, token } = useAuth();
  
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showError, ErrorDialogElement } = useErrorDialog();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingForma, setEditingForma] = useState(null);
  const [formData, setFormData] = useState({
    descricao: '',
    porcentagem_desconto_geral: '',
    ativo: true,
    ordem: ''
  });

  const canManage = user?.role === 'Proprietario' || user?.role === 'Gerente';

  const fetchFormasPagamento = async () => {
    if (empresaLoading || !empresa || !empresa.slug || !user) {
      setLoading(true);
      return;
    }

    if (!canManage) {
      setError('Você não tem permissão para gerenciar formas de pagamento.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/gerencial/${empresa.slug}/formas-pagamento`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormasPagamento(response.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao carregar formas de pagamento.';
      toast.error(msg);
      showError(msg);
      console.error("Erro ao carregar formas de pagamento:", err);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormasPagamento();
  }, [empresa, empresaLoading, user]);

  const handleFormChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [id]: type === 'checkbox' || type === 'switch' ? checked : value 
    }));
  };

  const openModal = (forma = null) => {
    if (forma) {
      setEditingForma(forma);
      setFormData({
        descricao: forma.descricao || '',
        porcentagem_desconto_geral: forma.porcentagem_desconto_geral || '',
        ativo: !!forma.ativo,
        ordem: forma.ordem || ''
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setEditingForma(null);
      setFormData({
        descricao: '',
        porcentagem_desconto_geral: '',
        ativo: true,
        ordem: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingForma(null);
    setFormData({
      descricao: '',
      porcentagem_desconto_geral: '',
      ativo: true,
      ordem: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!empresa || !empresa.slug) { 
      toast.error('Dados da empresa não carregados.'); 
      return; 
    }

    if (!formData.descricao.trim()) {
      toast.error('Descrição é obrigatória.');
      return;
    }

    if (formData.porcentagem_desconto_geral && (parseFloat(formData.porcentagem_desconto_geral) < 0 || parseFloat(formData.porcentagem_desconto_geral) > 100)) {
      toast.error('Porcentagem deve ser entre 0 e 100.');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = {
        descricao: formData.descricao.trim(),
        porcentagem_desconto_geral: parseFloat(formData.porcentagem_desconto_geral) || 0,
        ativo: formData.ativo ? 1 : 0,
        ordem: formData.ordem ? parseInt(formData.ordem) : null
      };

      if (editingForma) {
        await api.put(`/gerencial/${empresa.slug}/formas-pagamento/${editingForma.id}`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Forma de pagamento atualizada com sucesso!');
      } else {
        await api.post(`/gerencial/${empresa.slug}/formas-pagamento`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Forma de pagamento criada com sucesso!');
      }

      closeModal();
      fetchFormasPagamento();
    } catch (err) {
      const msgSave = err.response?.data?.message || 'Erro ao salvar forma de pagamento.';
      toast.error(msgSave);
      showError(msgSave);
      console.error("Erro ao salvar forma de pagamento:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (formaId) => {
    if (!confirm('Tem certeza que deseja excluir esta forma de pagamento?')) return;

    setLoading(true);
    try {
      await api.delete(`/gerencial/${empresa.slug}/formas-pagamento/${formaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Forma de pagamento excluída com sucesso!');
      fetchFormasPagamento();
    } catch (err) {
      const msgDel = err.response?.data?.message || 'Erro ao excluir forma de pagamento.';
      toast.error(msgDel);
      showError(msgDel);
      console.error("Erro ao excluir forma de pagamento:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMoverOrdem = async (formaId, direcao) => {
    setLoading(true);
    try {
      const forma = formasPagamento.find(f => f.id === formaId);
      if (!forma) return;

      const formasOrdenadas = [...formasPagamento].sort((a, b) => a.ordem - b.ordem);
      const indexAtual = formasOrdenadas.findIndex(f => f.id === formaId);
      
      if (direcao === 'up' && indexAtual > 0) {
        const formaAnterior = formasOrdenadas[indexAtual - 1];
        await api.post(`/gerencial/${empresa.slug}/formas-pagamento/trocar-ordem`, {
          forma_pagamento_id_1: formaId,
          forma_pagamento_id_2: formaAnterior.id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else if (direcao === 'down' && indexAtual < formasOrdenadas.length - 1) {
        const formaProxima = formasOrdenadas[indexAtual + 1];
        await api.post(`/gerencial/${empresa.slug}/formas-pagamento/trocar-ordem`, {
          forma_pagamento_id_1: formaId,
          forma_pagamento_id_2: formaProxima.id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      toast.success('Ordem alterada com sucesso!');
      fetchFormasPagamento();
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao alterar ordem.';
      toast.error(msg);
      showError(msg);
      console.error("Erro ao alterar ordem:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReordenarTodas = async () => {
    if (!confirm('Deseja reordenar todas as formas de pagamento sequencialmente (1, 2, 3...)?')) return;
    
    setLoading(true);
    try {
      await api.post(`/gerencial/${empresa.slug}/formas-pagamento/reordenar`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Todas as formas foram reordenadas!');
      fetchFormasPagamento();
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao reordenar formas.';
      toast.error(msg);
      showError(msg);
      console.error("Erro ao reordenar todas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAtivarTodos = async () => {
    if (!confirm('Deseja ativar todas as formas de pagamento?')) return;
    
    setLoading(true);
    try {
      const promises = formasPagamento.map(forma => 
        api.put(`/gerencial/${empresa.slug}/formas-pagamento/${forma.id}`, 
          { ...forma, ativo: 1 },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );
      await Promise.all(promises);
      toast.success('Todas as formas foram ativadas!');
      fetchFormasPagamento();
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao ativar formas.';
      toast.error(msg);
      showError(msg);
      console.error("Erro ao ativar todos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDesativarTodos = async () => {
    if (!confirm('Deseja desativar todas as formas de pagamento?')) return;
    
    setLoading(true);
    try {
      const promises = formasPagamento.map(forma => 
        api.put(`/gerencial/${empresa.slug}/formas-pagamento/${forma.id}`, 
          { ...forma, ativo: 0 },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );
      await Promise.all(promises);
      toast.success('Todas as formas foram desativadas!');
      fetchFormasPagamento();
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao desativar formas.';
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

  if (loading && formasPagamento.length === 0) {
    return <div className="p-4 text-center text-gray-600">Carregando formas de pagamento...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 text-center">{error}</div>;
  }

  const formasOrdenadas = [...formasPagamento].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="p-2 sm:p-4 md:p-6 bg-white rounded-lg shadow-md">
      {ErrorDialogElement}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-title">Gerenciar Formas de Pagamento - {empresa.nome_fantasia}</h2>
        <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm h-8 sm:h-9">
          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          Nova Forma
        </Button>
      </div>

      {formasPagamento.length === 0 ? (
        <Card>
          <CardContent className="p-4 sm:p-8 text-center">
            <p className="text-gray-600 mb-4 text-sm sm:text-base">Nenhuma forma de pagamento cadastrada.</p>
            <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm h-8 sm:h-9">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Criar Primeira Forma
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {/* Botões de Ação em Massa */}
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              onClick={handleReordenarTodas}
              variant="outline"
              size="sm"
              disabled={loading || formasPagamento.length === 0}
              className="text-xs sm:text-sm h-8 sm:h-9 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reordenar Todas
            </Button>
            <Button
              onClick={handleAtivarTodos}
              variant="outline"
              size="sm"
              disabled={loading || formasPagamento.length === 0}
              className="text-xs sm:text-sm h-8 sm:h-9 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
            >
              ✓ Ativar Todas
            </Button>
            <Button
              onClick={handleDesativarTodos}
              variant="outline"
              size="sm"
              disabled={loading || formasPagamento.length === 0}
              className="text-xs sm:text-sm h-8 sm:h-9 bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
            >
              ✗ Desativar Todas
            </Button>
          </div>

          {/* Versão mobile/tablet - Cards */}
          <div className="sm:hidden space-y-2">
            {formasOrdenadas.map((forma, index) => (
              <div key={forma.id} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        #{forma.ordem}
                      </span>
                      <h4 className="text-sm font-medium text-gray-800">{forma.descricao}</h4>
                    </div>
                    {forma.porcentagem_desconto_geral > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        Desconto: {forma.porcentagem_desconto_geral}%
                      </p>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      forma.ativo 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {forma.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleMoverOrdem(forma.id, 'up')}
                    size="sm"
                    variant="outline"
                    disabled={index === 0 || loading}
                    className="flex-1 text-xs h-8"
                  >
                    <ArrowUp className="h-3 w-3 mr-1" />
                    Subir
                  </Button>
                  <Button
                    onClick={() => handleMoverOrdem(forma.id, 'down')}
                    size="sm"
                    variant="outline"
                    disabled={index === formasOrdenadas.length - 1 || loading}
                    className="flex-1 text-xs h-8"
                  >
                    <ArrowDown className="h-3 w-3 mr-1" />
                    Descer
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => openModal(forma)}
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-8"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => handleDelete(forma.id)}
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
                  <TableHead className="text-sm">Ordem</TableHead>
                  <TableHead className="text-sm">Descrição</TableHead>
                  <TableHead className="text-sm">Desconto</TableHead>
                  <TableHead className="text-sm">Status</TableHead>
                  <TableHead className="text-sm">Ações</TableHead>
                  <TableHead className="text-right text-sm">Gerenciar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formasOrdenadas.map((forma, index) => (
                  <TableRow key={forma.id}>
                    <TableCell className="font-medium text-sm">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        #{forma.ordem}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{forma.descricao}</TableCell>
                    <TableCell className="text-sm">
                      {forma.porcentagem_desconto_geral > 0 ? `${forma.porcentagem_desconto_geral}%` : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        forma.ativo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {forma.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => handleMoverOrdem(forma.id, 'up')}
                          size="sm"
                          variant="outline"
                          disabled={index === 0 || loading}
                          className="text-xs h-7 px-2"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => handleMoverOrdem(forma.id, 'down')}
                          size="sm"
                          variant="outline"
                          disabled={index === formasOrdenadas.length - 1 || loading}
                          className="text-xs h-7 px-2"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => openModal(forma)}
                          size="sm"
                          variant="outline"
                          className="flex items-center text-xs h-8 px-2"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          onClick={() => handleDelete(forma.id)}
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
              {editingForma ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editingForma ? 'Edite as informações da forma de pagamento.' : 'Preencha as informações da nova forma de pagamento.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="descricao" className="text-sm">Descrição *</Label>
              <Input
                id="descricao"
                type="text"
                value={formData.descricao}
                onChange={handleFormChange}
                placeholder="Ex: Dinheiro, PIX, Cartão de Crédito"
                required
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            
            <div>
              <Label htmlFor="porcentagem_desconto_geral" className="text-sm">Desconto (%)</Label>
              <Input
                id="porcentagem_desconto_geral"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.porcentagem_desconto_geral}
                onChange={handleFormChange}
                placeholder="Ex: 5.00"
                className="h-9 sm:h-10 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="ordem" className="text-sm">Ordem (opcional)</Label>
              <Input
                id="ordem"
                type="number"
                min="1"
                value={formData.ordem}
                onChange={handleFormChange}
                placeholder="Ex: 1 (primeira posição)"
                className="h-9 sm:h-10 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Deixe vazio para adicionar ao final da lista
              </p>
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
                {editingForma ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormasPagamentoPage;