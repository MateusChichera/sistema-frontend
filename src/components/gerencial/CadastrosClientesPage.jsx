import React, { useState, useEffect, useCallback } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Loader2, Search as SearchIcon, Plus as PlusIcon, Edit as EditIcon, Trash2 as TrashIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';

const CadastrosClientesPage = () => {
    const { empresa, loading: empresaLoading, isReady } = useEmpresa();
    const { user, token } = useAuth();
    

    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCliente, setEditingCliente] = useState(null);
    const [loadingSave, setLoadingSave] = useState(false);

    const [formData, setFormData] = useState({
        nome: '',
        telefone: '',
        email: '',
        cpf_cnpj: '',
        endereco: '',
        observacoes: ''
    });

    const fetchClientes = useCallback(async (termo = '') => {
        if (!isReady || empresaLoading || !empresa?.slug || !user) {
            setLoading(true);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (termo) {
                queryParams.append('search', termo);
            }

            const response = await api.get(`/gerencial/${empresa.slug}/contas-prazo/clientes/buscar?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setClientes(response.data || []);
        } catch (err) {
            console.error("Erro ao carregar clientes:", err);
            toast.error(err.response?.data?.message || 'Erro ao carregar clientes.');
        } finally {
            setLoading(false);
        }
    }, [empresa, empresaLoading, isReady, user, token]);

    const handleSearch = useCallback(() => {
        fetchClientes(searchTerm);
    }, [fetchClientes, searchTerm]);

    const handleOpenModal = (cliente = null) => {
        if (cliente) {
            setEditingCliente(cliente);
            setFormData({
                nome: cliente.nome || '',
                telefone: cliente.telefone || '',
                email: cliente.email || '',
                cpf_cnpj: cliente.cpf_cnpj || '',
                endereco: cliente.endereco || '',
                observacoes: cliente.observacoes || ''
            });
        } else {
            setEditingCliente(null);
            setFormData({
                nome: '',
                telefone: '',
                email: '',
                cpf_cnpj: '',
                endereco: '',
                observacoes: ''
            });
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.nome.trim()) {
            toast.error('Nome é obrigatório');
            return;
        }

        if (!formData.telefone.trim()) {
            toast.error('Telefone é obrigatório');
            return;
        }

        setLoadingSave(true);
        try {
            if (editingCliente) {
                // Editar cliente existente
                await api.put(`/gerencial/${empresa.slug}/contas-prazo/clientes/${editingCliente.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Cliente atualizado com sucesso!');
            } else {
                // Cadastrar novo cliente
                await api.post(`/gerencial/${empresa.slug}/contas-prazo/clientes/rapido`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Cliente cadastrado com sucesso!');
            }
            
            setShowModal(false);
            fetchClientes();
        } catch (err) {
            console.error("Erro ao salvar cliente:", err);
            toast.error(err.response?.data?.message || 'Erro ao salvar cliente.');
        } finally {
            setLoadingSave(false);
        }
    };

    const handleDelete = async (cliente) => {
        if (!confirm(`Tem certeza que deseja excluir o cliente "${cliente.nome}"?`)) {
            return;
        }

        try {
            await api.delete(`/gerencial/${empresa.slug}/contas-prazo/clientes/${cliente.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Cliente excluído com sucesso!');
            fetchClientes();
        } catch (err) {
            console.error("Erro ao excluir cliente:", err);
            toast.error(err.response?.data?.message || 'Erro ao excluir cliente.');
        }
    };

    const handleToggleAtivo = async (cliente) => {
        const novoStatus = cliente.ativo === 1 ? 0 : 1;
        
        try {
            await api.put(`/gerencial/${empresa.slug}/contas-prazo/clientes/${cliente.id}`, {
                ...cliente,
                ativo: novoStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            toast.success(`Cliente ${novoStatus === 1 ? 'ativado' : 'desativado'} com sucesso!`);
            fetchClientes();
        } catch (err) {
            console.error("Erro ao atualizar status do cliente:", err);
            toast.error(err.response?.data?.message || 'Erro ao atualizar status do cliente.');
        }
    };

    // Carregar todos os clientes inicialmente
    useEffect(() => {
        if (isReady && !empresaLoading && empresa?.slug && user) {
            fetchClientes('');
        }
    }, [isReady, empresaLoading, empresa?.slug, user, fetchClientes]);

    // Debounce para busca de clientes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm) {
                fetchClientes(searchTerm);
            } else {
                fetchClientes('');
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, fetchClientes]);

    if (empresaLoading || loading || !isReady) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin mr-2" /> Carregando clientes...
            </div>
        );
    }

    if (error) {
        return <div className="p-4 text-center text-red-600">{error}</div>;
    }

    return (
        <div className="p-2 sm:p-4 md:p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-800 text-center">
                Cadastro de Clientes - {empresa.nome_fantasia}
            </h1>
            <p className="text-center text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">
                Gerencie os clientes para contas a prazo.
            </p>

            {/* Filtros */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 border rounded-lg bg-gray-50 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                    <Label htmlFor="searchTerm" className="text-sm">Buscar Cliente</Label>
                    <Input
                        id="searchTerm"
                        placeholder="Nome, telefone ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-9 sm:h-10 text-sm"
                    />
                </div>
                <div className="flex items-end gap-2">
                    <Button onClick={handleSearch} className="flex-1 h-9 sm:h-10 text-sm">
                        <SearchIcon className="mr-2 h-4 w-4" /> Buscar
                    </Button>
                    <Button onClick={() => handleOpenModal()} className="h-9 sm:h-10 text-sm">
                        <PlusIcon className="mr-2 h-4 w-4" /> Novo Cliente
                    </Button>
                </div>
            </div>

            {/* Lista de Clientes */}
            {clientes.length === 0 ? (
                <p className="w-full text-center text-gray-600 text-base sm:text-lg p-4">
                    Nenhum cliente encontrado.
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {clientes.map(cliente => (
                        <Card 
                            key={cliente.id} 
                            className={`relative overflow-hidden bg-white shadow-md ${
                                cliente.ativo === 0 ? 'border-2 border-red-500' : ''
                            }`}
                        >
                            <CardHeader className="pb-2 px-3 sm:px-4 py-3">
                                <CardTitle className="text-base sm:text-lg">
                                    {cliente.nome}
                                </CardTitle>
                                <div className="text-xs sm:text-sm text-gray-600">
                                    {cliente.telefone}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2 text-xs sm:text-sm pt-2 px-3 sm:px-4">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span><strong>Status:</strong></span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-600">
                                                {cliente.ativo === 1 ? 'Ativo' : 'Inativo'}
                                            </span>
                                            <Switch
                                                checked={cliente.ativo === 1}
                                                onCheckedChange={() => handleToggleAtivo(cliente)}
                                            />
                                        </div>
                                    </div>
                                    {cliente.email && (
                                        <div><strong>Email:</strong> {cliente.email}</div>
                                    )}
                                    {cliente.cpf_cnpj && (
                                        <div><strong>CPF/CNPJ:</strong> {cliente.cpf_cnpj}</div>
                                    )}
                                    {cliente.endereco && (
                                        <div><strong>Endereço:</strong> {cliente.endereco}</div>
                                    )}
                                    {cliente.observacoes && (
                                        <div><strong>Observações:</strong> {cliente.observacoes}</div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-3 sm:pt-4 px-3 sm:px-4 pb-3 flex flex-wrap gap-2 justify-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenModal(cliente)}
                                    className="text-xs h-8 px-2"
                                >
                                    <EditIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    Editar
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(cliente)}
                                    className="text-xs h-8 px-2 text-red-600 hover:text-red-700"
                                >
                                    <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    Excluir
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal de Cadastro/Edição */}
            {showModal && (
                <Dialog open={showModal} onOpenChange={setShowModal}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>
                                {editingCliente ? 'Editar Cliente' : 'Cadastrar Cliente'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div>
                                <Label htmlFor="nome">Nome *</Label>
                                <Input
                                    id="nome"
                                    value={formData.nome}
                                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                                    placeholder="Nome completo do cliente"
                                    className="w-full"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="telefone">Telefone *</Label>
                                <Input
                                    id="telefone"
                                    value={formData.telefone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                                    placeholder="(11) 99999-9999"
                                    className="w-full"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="email">E-mail</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="cliente@email.com"
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                                <Input
                                    id="cpf_cnpj"
                                    value={formData.cpf_cnpj}
                                    onChange={(e) => setFormData(prev => ({ ...prev, cpf_cnpj: e.target.value }))}
                                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <Label htmlFor="endereco">Endereço</Label>
                                <Input
                                    id="endereco"
                                    value={formData.endereco}
                                    onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                                    placeholder="Endereço completo"
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <Label htmlFor="observacoes">Observações</Label>
                                <Textarea
                                    id="observacoes"
                                    value={formData.observacoes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                                    placeholder="Observações sobre o cliente"
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={loadingSave}>
                                {loadingSave && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingCliente ? 'Atualizar' : 'Cadastrar'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default CadastrosClientesPage;
