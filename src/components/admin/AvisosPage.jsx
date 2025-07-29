import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Loader2, Plus, Edit, Trash2, Eye, Search, MessageSquare, Users, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const AvisosPage = () => {
    const { user, token } = useAuth();
    const [avisos, setAvisos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAviso, setEditingAviso] = useState(null);
    const [deletingAviso, setDeletingAviso] = useState(null);
    const [selectedAviso, setSelectedAviso] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        titulo: '',
        mensagem: ''
    });

    // Função para buscar avisos
    const fetchAvisos = async () => {
        if (!user || user.email !== 'admin@sistema.com') {
            toast.error('Acesso negado. Apenas o Administrador Master pode gerenciar avisos.');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await api.get('/admin/avisos/detalhes', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAvisos(response.data.avisos || []);
            toast.success("Avisos carregados com sucesso!");
        } catch (err) {
            const msg = err.response?.data?.message || 'Erro ao carregar avisos.';
            toast.error(msg);
            console.error("Erro ao carregar avisos:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAvisos();
    }, [user, token]);

    // Função para filtrar avisos
    const filteredAvisos = avisos.filter(aviso =>
        aviso.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aviso.mensagem.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Função para formatar data
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('pt-BR');
    };

    // Função para abrir formulário
    const handleOpenForm = (aviso = null) => {
        if (aviso) {
            setEditingAviso(aviso);
            setFormData({
                titulo: aviso.titulo,
                mensagem: aviso.mensagem
            });
        } else {
            setEditingAviso(null);
            setFormData({
                titulo: '',
                mensagem: ''
            });
        }
        setIsFormOpen(true);
    };

    // Função para fechar formulário
    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingAviso(null);
        setFormData({
            titulo: '',
            mensagem: ''
        });
    };

    // Função para salvar aviso
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.titulo.trim() || !formData.mensagem.trim()) {
            toast.error('Preencha todos os campos obrigatórios.');
            return;
        }

        try {
            if (editingAviso) {
                // Atualizar aviso existente
                await api.put(`/admin/avisos/${editingAviso.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Aviso atualizado com sucesso!');
            } else {
                // Criar novo aviso
                await api.post('/admin/avisos', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Aviso criado com sucesso!');
            }
            
            handleCloseForm();
            fetchAvisos(); // Recarregar lista
        } catch (err) {
            const msg = err.response?.data?.message || 'Erro ao salvar aviso.';
            toast.error(msg);
            console.error("Erro ao salvar aviso:", err);
        }
    };

    // Função para excluir aviso
    const handleDelete = async () => {
        if (!deletingAviso) return;

        try {
            await api.delete(`/admin/avisos/${deletingAviso.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Aviso excluído com sucesso!');
            setDeletingAviso(null);
            fetchAvisos(); // Recarregar lista
        } catch (err) {
            const msg = err.response?.data?.message || 'Erro ao excluir aviso.';
            toast.error(msg);
            console.error("Erro ao excluir aviso:", err);
        }
    };

    // Função para abrir modal de detalhes
    const handleOpenDetails = (aviso) => {
        setSelectedAviso(aviso);
        setIsDetailsModalOpen(true);
    };

    if (!user || user.email !== 'admin@sistema.com') {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground">Acesso Negado</h3>
                    <p className="text-sm text-muted-foreground">Apenas o Administrador Master pode gerenciar avisos.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Gerenciar Avisos</h1>
                <p className="text-muted-foreground">
                    Crie, edite e gerencie avisos para todas as empresas do sistema
                </p>
            </div>

            {/* Barra de Ações */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Buscar avisos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button onClick={() => handleOpenForm()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Aviso
                </Button>
            </div>

            {/* Lista de Avisos */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Avisos do Sistema
                    </CardTitle>
                    <CardDescription>
                        {filteredAvisos.length} aviso(s) encontrado(s)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Carregando avisos...</span>
                            </div>
                        </div>
                    ) : filteredAvisos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                                Nenhum aviso encontrado
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                {searchTerm ? 'Nenhum aviso corresponde à busca.' : 'Crie seu primeiro aviso para começar.'}
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Título</TableHead>
                                        <TableHead>Mensagem</TableHead>
                                        <TableHead>Data Criação</TableHead>
                                        <TableHead>Empresas</TableHead>
                                        <TableHead>Estatísticas</TableHead>
                                        <TableHead className="text-center">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAvisos.map((aviso) => (
                                        <TableRow key={aviso.id}>
                                            <TableCell className="font-medium">
                                                {aviso.titulo}
                                            </TableCell>
                                            <TableCell className="max-w-xs">
                                                <div className="truncate" title={aviso.mensagem}>
                                                    {aviso.mensagem}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(aviso.data_criacao)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {aviso.empresas?.length || 0} empresas
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1">
                                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                                        <span className="text-xs text-green-600">
                                                            {aviso.estatisticas_gerais?.total_lidos || 0}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3 text-orange-600" />
                                                        <span className="text-xs text-orange-600">
                                                            {aviso.estatisticas_gerais?.total_nao_lidos || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleOpenDetails(aviso)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleOpenForm(aviso)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setDeletingAviso(aviso)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Tem certeza que deseja excluir o aviso "{aviso.titulo}"? 
                                                                    Esta ação não pode ser desfeita.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={handleDelete}>
                                                                    Excluir
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Formulário */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingAviso ? 'Editar Aviso' : 'Novo Aviso'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingAviso 
                                ? 'Atualize as informações do aviso.'
                                : 'Crie um novo aviso para todas as empresas do sistema.'
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="titulo">Título *</Label>
                            <Input
                                id="titulo"
                                value={formData.titulo}
                                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                                placeholder="Digite o título do aviso"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mensagem">Mensagem *</Label>
                            <Textarea
                                id="mensagem"
                                value={formData.mensagem}
                                onChange={(e) => setFormData(prev => ({ ...prev, mensagem: e.target.value }))}
                                placeholder="Digite a mensagem do aviso"
                                rows={6}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseForm}>
                                Cancelar
                            </Button>
                            <Button type="submit">
                                {editingAviso ? 'Atualizar' : 'Criar'} Aviso
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal de Detalhes */}
            <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Detalhes do Aviso
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedAviso && (
                        <div className="space-y-6">
                            {/* Informações Básicas */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Informações do Aviso</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Título</Label>
                                            <p className="text-lg font-semibold">{selectedAviso.titulo}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Mensagem</Label>
                                            <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                                                {selectedAviso.mensagem}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Data de Criação</Label>
                                            <p className="text-sm">{formatDate(selectedAviso.data_criacao)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Estatísticas Gerais */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Estatísticas Gerais</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {selectedAviso.estatisticas_gerais?.total_empresas || 0}
                                            </div>
                                            <div className="text-sm text-muted-foreground">Empresas</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">
                                                {selectedAviso.estatisticas_gerais?.total_lidos || 0}
                                            </div>
                                            <div className="text-sm text-muted-foreground">Lidos</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-orange-600">
                                                {selectedAviso.estatisticas_gerais?.total_nao_lidos || 0}
                                            </div>
                                            <div className="text-sm text-muted-foreground">Não Lidos</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-purple-600">
                                                {selectedAviso.estatisticas_gerais?.percentual_lidos || 0}%
                                            </div>
                                            <div className="text-sm text-muted-foreground">Percentual</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Detalhes por Empresa */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Detalhes por Empresa</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {selectedAviso.empresas?.map((empresa) => (
                                            <div key={empresa.id} className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <h4 className="font-semibold">{empresa.nome}</h4>
                                                        <p className="text-sm text-muted-foreground">{empresa.slug}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm text-muted-foreground">
                                                            {empresa.estatisticas?.lidos || 0} lidos / {empresa.estatisticas?.total_funcionarios || 0} total
                                                        </div>
                                                        <div className="text-sm font-medium">
                                                            {empresa.estatisticas?.percentual_lidos || 0}% lidos
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    {empresa.funcionarios?.map((funcionario) => (
                                                        <div key={funcionario.id} className="flex items-center justify-between text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <span>{funcionario.nome}</span>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {funcionario.role}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge 
                                                                    variant={funcionario.status === 'Lido' ? 'default' : 'secondary'}
                                                                >
                                                                    {funcionario.status}
                                                                </Badge>
                                                                {funcionario.data_alteracao && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {formatDate(funcionario.data_alteracao)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AvisosPage; 