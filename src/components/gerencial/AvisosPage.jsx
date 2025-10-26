import React, { useState, useEffect, useCallback } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, Plus as PlusIcon, Edit as EditIcon, Trash2 as TrashIcon, Bell as BellIcon, Search as SearchIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const AvisosPage = () => {
    const { empresa, loading: empresaLoading, isReady } = useEmpresa();
    const { user, token } = useAuth();

    const [avisos, setAvisos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAvisoModal, setShowAvisoModal] = useState(false);
    const [editingAviso, setEditingAviso] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterTipo, setFilterTipo] = useState('all');

    // Estados do formulário de aviso
    const [formAviso, setFormAviso] = useState({
        titulo: '',
        mensagem: '',
        tipo: 'info',
        dias_semana: [],
        prioridade: 1,
        ativo: true
    });

    const tiposAviso = [
        { value: 'info', label: 'Informação', cor: 'blue' },
        { value: 'aviso', label: 'Aviso', cor: 'yellow' },
        { value: 'promocao', label: 'Promoção', cor: 'green' },
        { value: 'manutencao', label: 'Manutenção', cor: 'red' }
    ];

    const diasSemana = [
        { value: 'segunda', label: 'Segunda-feira' },
        { value: 'terca', label: 'Terça-feira' },
        { value: 'quarta', label: 'Quarta-feira' },
        { value: 'quinta', label: 'Quinta-feira' },
        { value: 'sexta', label: 'Sexta-feira' },
        { value: 'sabado', label: 'Sábado' },
        { value: 'domingo', label: 'Domingo' }
    ];

    const prioridades = [
        { value: 1, label: 'Baixa', cor: 'gray' },
        { value: 2, label: 'Média', cor: 'yellow' },
        { value: 3, label: 'Alta', cor: 'red' }
    ];

    // Verificar se está pronto
    useEffect(() => {
        if (isReady && !empresaLoading && empresa && user && token) {
            fetchAvisos();
        }
    }, [isReady, empresaLoading, empresa, user, token]);

    const fetchAvisos = useCallback(async () => {
        if (!empresa || !user || !token) return;

        try {
            setLoading(true);
            // Usar a nova rota de avisos do cardápio
            const response = await api.get(`/gerencial/${empresa.slug}/avisos-cardapio`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAvisos(response.data || []);
        } catch (err) {
            console.error("Erro ao carregar avisos:", err);
            setError(err.response?.data?.message || 'Erro ao carregar avisos');
            toast.error('Erro ao carregar avisos');
        } finally {
            setLoading(false);
        }
    }, [empresa, user, token]);

    const handleSaveAviso = async () => {
        if (!formAviso.titulo.trim() || !formAviso.mensagem.trim()) {
            toast.error('Título e mensagem são obrigatórios');
            return;
        }

        if (formAviso.dias_semana.length === 0) {
            toast.error('Selecione pelo menos um dia da semana');
            return;
        }

        try {
            if (editingAviso) {
                await api.put(`/gerencial/${empresa.slug}/avisos-cardapio/${editingAviso.id}`, formAviso, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Aviso atualizado com sucesso!');
            } else {
                await api.post(`/gerencial/${empresa.slug}/avisos-cardapio`, formAviso, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Aviso criado com sucesso!');
            }
            
            setShowAvisoModal(false);
            setEditingAviso(null);
            setFormAviso({
                titulo: '',
                mensagem: '',
                tipo: 'info',
                dias_semana: [],
                prioridade: 1,
                ativo: true
            });
            fetchAvisos();
        } catch (err) {
            console.error("Erro ao salvar aviso:", err);
            toast.error(err.response?.data?.message || 'Erro ao salvar aviso');
        }
    };

    const handleEditAviso = (aviso) => {
        setEditingAviso(aviso);
        setFormAviso({
            titulo: aviso.titulo,
            mensagem: aviso.mensagem,
            tipo: aviso.tipo,
            dias_semana: aviso.dias_semana || [],
            prioridade: aviso.prioridade,
            ativo: aviso.ativo
        });
        setShowAvisoModal(true);
    };

    const handleDeleteAviso = async (aviso) => {
        if (!confirm(`Tem certeza que deseja excluir o aviso "${aviso.titulo}"?`)) return;

        try {
            await api.delete(`/gerencial/${empresa.slug}/avisos-cardapio/${aviso.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Aviso excluído com sucesso!');
            fetchAvisos();
        } catch (err) {
            console.error("Erro ao excluir aviso:", err);
            toast.error(err.response?.data?.message || 'Erro ao excluir aviso');
        }
    };

    const handleToggleAviso = async (aviso) => {
        try {
            await api.patch(`/gerencial/${empresa.slug}/avisos-cardapio/${aviso.id}/toggle`, {
                ativo: !aviso.ativo
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Aviso ${aviso.ativo ? 'desativado' : 'ativado'} com sucesso!`);
            fetchAvisos();
        } catch (err) {
            console.error("Erro ao alterar status do aviso:", err);
            toast.error(err.response?.data?.message || 'Erro ao alterar status do aviso');
        }
    };

    const handleFormChange = (field, value) => {
        setFormAviso(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleDiaSemanaChange = (dia, checked) => {
        setFormAviso(prev => ({
            ...prev,
            dias_semana: checked 
                ? [...prev.dias_semana, dia]
                : prev.dias_semana.filter(d => d !== dia)
        }));
    };

    const getTipoAvisoColor = (tipo) => {
        const tipoObj = tiposAviso.find(t => t.value === tipo);
        return tipoObj ? tipoObj.cor : 'gray';
    };

    const getPrioridadeColor = (prioridade) => {
        const prioridadeObj = prioridades.find(p => p.value === prioridade);
        return prioridadeObj ? prioridadeObj.cor : 'gray';
    };

    const filteredAvisos = avisos.filter(aviso => {
        const matchesSearch = aviso.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             aviso.mensagem.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || 
                             (filterStatus === 'ativo' && aviso.ativo === true) ||
                             (filterStatus === 'inativo' && aviso.ativo === false);
        const matchesTipo = filterTipo === 'all' || aviso.tipo === filterTipo;
        
        return matchesSearch && matchesStatus && matchesTipo;
    });


    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gerenciar Avisos</h1>
                    <p className="text-gray-600">Gerencie os avisos que aparecem no cardápio público</p>
                </div>
                <Button onClick={() => setShowAvisoModal(true)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Novo Aviso
                </Button>
            </div>

            {/* Filtros */}
            <Card className="mb-6">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <Label htmlFor="search">Buscar</Label>
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="search"
                                    placeholder="Buscar avisos..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="status">Status</Label>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos os status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="ativo">Ativos</SelectItem>
                                    <SelectItem value="inativo">Inativos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="tipo">Tipo</Label>
                            <Select value={filterTipo} onValueChange={setFilterTipo}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos os tipos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {tiposAviso.map(tipo => (
                                        <SelectItem key={tipo.value} value={tipo.value}>
                                            {tipo.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterStatus('all');
                                    setFilterTipo('all');
                                }}
                            >
                                Limpar Filtros
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de Avisos */}
            {filteredAvisos.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {avisos.length === 0 ? 'Nenhum aviso cadastrado' : 'Nenhum aviso encontrado'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {avisos.length === 0 
                                ? 'Comece criando seu primeiro aviso para o cardápio público'
                                : 'Tente ajustar os filtros de busca'
                            }
                        </p>
                        {avisos.length === 0 && (
                            <Button onClick={() => setShowAvisoModal(true)}>
                                <PlusIcon className="h-4 w-4 mr-2" />
                                Criar Primeiro Aviso
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAvisos.map(aviso => (
                        <Card key={aviso.id} className={`border-l-4 border-${getTipoAvisoColor(aviso.tipo)}-400`}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{aviso.titulo}</CardTitle>
                                    <div className="flex gap-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditAviso(aviso)}
                                        >
                                            <EditIcon className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleToggleAviso(aviso)}
                                        >
                                            {aviso.ativo ? 'Desativar' : 'Ativar'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDeleteAviso(aviso)}
                                        >
                                            <TrashIcon className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700 mb-3">{aviso.mensagem}</p>
                                
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <Badge className={`bg-${getTipoAvisoColor(aviso.tipo)}-100 text-${getTipoAvisoColor(aviso.tipo)}-800`}>
                                        {tiposAviso.find(t => t.value === aviso.tipo)?.label}
                                    </Badge>
                                    <Badge className={`bg-${getPrioridadeColor(aviso.prioridade)}-100 text-${getPrioridadeColor(aviso.prioridade)}-800`}>
                                        P{aviso.prioridade}
                                    </Badge>
                                    <Badge variant={aviso.ativo ? "default" : "secondary"}>
                                        {aviso.ativo ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                </div>

                                <div className="text-sm text-gray-600">
                                    <p><strong>Dias:</strong> {aviso.dias_semana && Array.isArray(aviso.dias_semana) ? aviso.dias_semana.join(', ') : 'Não definido'}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal de Aviso */}
            <Dialog open={showAvisoModal} onOpenChange={setShowAvisoModal}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingAviso ? 'Editar Aviso' : 'Novo Aviso'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="titulo">Título *</Label>
                                <Input
                                    id="titulo"
                                    value={formAviso.titulo}
                                    onChange={(e) => handleFormChange('titulo', e.target.value)}
                                    placeholder="Ex: Promoção Especial"
                                />
                            </div>
                            <div>
                                <Label htmlFor="tipo">Tipo *</Label>
                                <Select value={formAviso.tipo} onValueChange={(value) => handleFormChange('tipo', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tiposAviso.map(tipo => (
                                            <SelectItem key={tipo.value} value={tipo.value}>
                                                {tipo.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="mensagem">Mensagem *</Label>
                            <Textarea
                                id="mensagem"
                                value={formAviso.mensagem}
                                onChange={(e) => handleFormChange('mensagem', e.target.value)}
                                placeholder="Digite a mensagem do aviso..."
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="prioridade">Prioridade *</Label>
                                <Select value={formAviso.prioridade.toString()} onValueChange={(value) => handleFormChange('prioridade', parseInt(value))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a prioridade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {prioridades.map(prioridade => (
                                            <SelectItem key={prioridade.value} value={prioridade.value.toString()}>
                                                {prioridade.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="ativo"
                                    checked={formAviso.ativo}
                                    onCheckedChange={(checked) => handleFormChange('ativo', checked)}
                                />
                                <Label htmlFor="ativo">Aviso ativo</Label>
                            </div>
                        </div>

                        <div>
                            <Label>Dias da Semana *</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                {diasSemana.map(dia => (
                                    <div key={dia.value} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={dia.value}
                                            checked={formAviso.dias_semana.includes(dia.value)}
                                            onChange={(e) => handleDiaSemanaChange(dia.value, e.target.checked)}
                                            className="rounded"
                                        />
                                        <Label htmlFor={dia.value} className="text-sm">
                                            {dia.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAvisoModal(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveAviso}>
                            {editingAviso ? 'Atualizar' : 'Criar'} Aviso
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AvisosPage;
