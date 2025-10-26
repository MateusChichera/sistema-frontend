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
import { Loader2, Plus as PlusIcon, Edit as EditIcon, Trash2 as TrashIcon, MapPin as MapPinIcon, Clock as ClockIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';

const EnderecosPage = () => {
    const { empresa, loading: empresaLoading, isReady } = useEmpresa();
    const { user, token } = useAuth();

    const [enderecos, setEnderecos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showEnderecoModal, setShowEnderecoModal] = useState(false);
    const [showDiaModal, setShowDiaModal] = useState(false);
    const [editingEndereco, setEditingEndereco] = useState(null);
    const [editingDia, setEditingDia] = useState(null);
    const [selectedEndereco, setSelectedEndereco] = useState(null);
    const [modoModal, setModoModal] = useState('visualizar'); // 'visualizar', 'criar', 'editar'

    // Estados do formulário de endereço
    const [formEndereco, setFormEndereco] = useState({
        nome: '',
        endereco_completo: '',
        cidade: '',
        estado: '',
        cep: '',
        telefone: '',
        email: '',
        ativo: true
    });

    // Estados do formulário de dia da semana
    const [formDia, setFormDia] = useState({
        dia_semana: '',
        horario_inicio: '',
        horario_fim: '',
        observacoes: '',
        ativo: true
    });

    const diasSemana = [
        { value: 'segunda', label: 'Segunda-feira' },
        { value: 'terca', label: 'Terça-feira' },
        { value: 'quarta', label: 'Quarta-feira' },
        { value: 'quinta', label: 'Quinta-feira' },
        { value: 'sexta', label: 'Sexta-feira' },
        { value: 'sabado', label: 'Sábado' },
        { value: 'domingo', label: 'Domingo' }
    ];

    const fetchEnderecos = useCallback(async () => {
        if (!empresa || !user || !token) return;

        try {
            setLoading(true);
            const response = await api.get(`/gerencial/${empresa.slug}/enderecos`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const enderecos = response.data || [];
            
            // Buscar dias da semana para cada endereço
            const enderecosComDias = await Promise.all(
                enderecos.map(async (endereco) => {
                    try {
                        const diasResponse = await api.get(`/gerencial/${empresa.slug}/enderecos/${endereco.id}/dias-semana`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        return {
                            ...endereco,
                            dias_semana: diasResponse.data || []
                        };
                    } catch (err) {
                        console.warn(`Erro ao carregar dias para endereço ${endereco.id}:`, err);
                        return {
                            ...endereco,
                            dias_semana: []
                        };
                    }
                })
            );
            
            console.log("EnderecosPage: Endereços com dias carregados:", enderecosComDias);
            setEnderecos(enderecosComDias);
        } catch (err) {
            console.error("Erro ao carregar endereços:", err);
            setError(err.response?.data?.message || 'Erro ao carregar endereços');
            toast.error('Erro ao carregar endereços');
        } finally {
            setLoading(false);
        }
    }, [empresa, user, token]);

    useEffect(() => {
        if (isReady && empresa && user && token) {
            fetchEnderecos();
        }
    }, [isReady, empresa, user, token, fetchEnderecos]);

    const handleSaveEndereco = async () => {
        if (!formEndereco.nome.trim()) {
            toast.error('Nome do endereço é obrigatório');
            return;
        }

        try {
            if (editingEndereco) {
                await api.put(`/gerencial/${empresa.slug}/enderecos/${editingEndereco.id}`, formEndereco, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Endereço atualizado com sucesso!');
            } else {
                await api.post(`/gerencial/${empresa.slug}/enderecos`, formEndereco, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Endereço criado com sucesso!');
            }
            
            setShowEnderecoModal(false);
            setEditingEndereco(null);
            setFormEndereco({
                nome: '',
                endereco_completo: '',
                cidade: '',
                estado: '',
                cep: '',
                telefone: '',
                email: '',
                ativo: true
            });
            fetchEnderecos();
        } catch (err) {
            console.error("Erro ao salvar endereço:", err);
            toast.error(err.response?.data?.message || 'Erro ao salvar endereço');
        }
    };

    const handleEditEndereco = (endereco) => {
        setEditingEndereco(endereco);
        setFormEndereco({
            nome: endereco.nome || '',
            endereco_completo: endereco.endereco_completo || '',
            cidade: endereco.cidade || '',
            estado: endereco.estado || '',
            cep: endereco.cep || '',
            telefone: endereco.telefone || '',
            email: endereco.email || '',
            ativo: endereco.ativo
        });
        setShowEnderecoModal(true);
    };

    const handleDeleteEndereco = async (endereco) => {
        if (!confirm(`Tem certeza que deseja excluir o endereço "${endereco.nome}"?`)) return;

        try {
            await api.delete(`/gerencial/${empresa.slug}/enderecos/${endereco.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Endereço excluído com sucesso!');
            fetchEnderecos();
        } catch (err) {
            console.error("Erro ao excluir endereço:", err);
            toast.error(err.response?.data?.message || 'Erro ao excluir endereço');
        }
    };

    const handleSaveDia = async () => {
        if (!formDia.dia_semana) {
            toast.error('Dia da semana é obrigatório');
            return;
        }

        if (!formDia.horario_inicio || !formDia.horario_fim) {
            toast.error('Horário de início e fim são obrigatórios');
            return;
        }

        try {
            if (editingDia) {
                await api.put(`/gerencial/${empresa.slug}/enderecos/${selectedEndereco.id}/dias-semana/${editingDia.id}`, formDia, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Dia da semana atualizado com sucesso!');
            } else {
                await api.post(`/gerencial/${empresa.slug}/enderecos/${selectedEndereco.id}/dias-semana`, formDia, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Dia da semana criado com sucesso!');
            }
            
            setShowDiaModal(false);
            setEditingDia(null);
            setModoModal('visualizar');
            setFormDia({
                dia_semana: '',
                horario_inicio: '',
                horario_fim: '',
                observacoes: '',
                ativo: true
            });
            fetchEnderecos();
        } catch (err) {
            console.error("Erro ao salvar dia da semana:", err);
            toast.error(err.response?.data?.message || 'Erro ao salvar dia da semana');
        }
    };

    const handleEditDia = (dia) => {
        setEditingDia(dia);
        setModoModal('editar');
        setFormDia({
            dia_semana: dia.dia_semana || '',
            horario_inicio: dia.horario_inicio || '',
            horario_fim: dia.horario_fim || '',
            observacoes: dia.observacoes || '',
            ativo: dia.ativo
        });
        setShowDiaModal(true);
    };

    const handleDeleteDia = async (dia, endereco) => {
        if (!confirm(`Tem certeza que deseja excluir o dia "${dia.dia_semana}"?`)) return;

        if (!endereco || !endereco.id) {
            toast.error('Erro: Endereço não encontrado');
            return;
        }

        try {
            await api.delete(`/gerencial/${empresa.slug}/enderecos/${endereco.id}/dias-semana/${dia.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Dia da semana excluído com sucesso!');
            fetchEnderecos();
        } catch (err) {
            console.error("Erro ao excluir dia da semana:", err);
            toast.error(err.response?.data?.message || 'Erro ao excluir dia da semana');
        }
    };

    const handleOpenDiaModal = (endereco) => {
        setSelectedEndereco(endereco);
        setEditingDia(null);
        setModoModal('visualizar');
        setFormDia({
            dia_semana: '',
            horario_inicio: '',
            horario_fim: '',
            observacoes: '',
            ativo: true
        });
        setShowDiaModal(true);
    };

    if (empresaLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={fetchEnderecos}>Tentar novamente</Button>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Endereços</h1>
                <Button onClick={() => {
                    setEditingEndereco(null);
                    setFormEndereco({
                        nome: '',
                        endereco_completo: '',
                        cidade: '',
                        estado: '',
                        cep: '',
                        telefone: '',
                        email: '',
                        ativo: true
                    });
                    setShowEnderecoModal(true);
                }}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Novo Endereço
                </Button>
            </div>

            <div className="grid gap-6">
                {enderecos.map((endereco) => (
                    <Card key={endereco.id} className="w-full">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-2">
                                    <MapPinIcon className="h-5 w-5 text-blue-500" />
                                    <CardTitle className="text-lg">{endereco.nome}</CardTitle>
                                    <Badge variant={endereco.ativo ? "default" : "secondary"}>
                                        {endereco.ativo ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                </div>
                                <div className="flex space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenDiaModal(endereco)}
                                    >
                                        <ClockIcon className="h-4 w-4 mr-1" />
                                        Gerenciar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditEndereco(endereco)}
                                    >
                                        <EditIcon className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteEndereco(endereco)}
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <p><strong>Endereço:</strong> {endereco.endereco_completo}</p>
                                <p><strong>Cidade:</strong> {endereco.cidade} - {endereco.estado}</p>
                                <p><strong>CEP:</strong> {endereco.cep}</p>
                                <p><strong>Telefone:</strong> {endereco.telefone}</p>
                                <p><strong>Email:</strong> {endereco.email}</p>
                            </div>
                            
                            {endereco.dias_semana && Array.isArray(endereco.dias_semana) && endereco.dias_semana.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-semibold mb-2">Dias de Funcionamento:</h4>
                                    <div className="space-y-2">
                                        {endereco.dias_semana.map((dia) => (
                                            <div key={dia.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                                <div>
                                                    <span className="font-medium">{diasSemana.find(d => d.value === dia.dia_semana)?.label}</span>
                                                    <span className="ml-2 text-sm text-gray-600">
                                                        {dia.horario_inicio} - {dia.horario_fim}
                                                    </span>
                                                    {dia.observacoes && (
                                                        <p className="text-sm text-gray-500 mt-1">{dia.observacoes}</p>
                                                    )}
                                                </div>
                                                <div className="flex space-x-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedEndereco(endereco);
                                                            handleEditDia(dia);
                                                        }}
                                                    >
                                                        <EditIcon className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedEndereco(endereco);
                                                            handleDeleteDia(dia, endereco);
                                                        }}
                                                    >
                                                        <TrashIcon className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Modal de Endereço */}
            <Dialog open={showEnderecoModal} onOpenChange={setShowEnderecoModal}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingEndereco ? 'Editar Endereço' : 'Novo Endereço'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="nome">Nome *</Label>
                                <Input
                                    id="nome"
                                    value={formEndereco.nome}
                                    onChange={(e) => setFormEndereco({...formEndereco, nome: e.target.value})}
                                    placeholder="Nome do endereço"
                                />
                            </div>
                            <div>
                                <Label htmlFor="cep">CEP</Label>
                                <Input
                                    id="cep"
                                    value={formEndereco.cep}
                                    onChange={(e) => setFormEndereco({...formEndereco, cep: e.target.value})}
                                    placeholder="00000-000"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="endereco_completo">Endereço Completo *</Label>
                            <Input
                                id="endereco_completo"
                                value={formEndereco.endereco_completo}
                                onChange={(e) => setFormEndereco({...formEndereco, endereco_completo: e.target.value})}
                                placeholder="Rua, número, bairro"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="cidade">Cidade</Label>
                                <Input
                                    id="cidade"
                                    value={formEndereco.cidade}
                                    onChange={(e) => setFormEndereco({...formEndereco, cidade: e.target.value})}
                                    placeholder="Cidade"
                                />
                            </div>
                            <div>
                                <Label htmlFor="estado">Estado</Label>
                                <Input
                                    id="estado"
                                    value={formEndereco.estado}
                                    onChange={(e) => setFormEndereco({...formEndereco, estado: e.target.value})}
                                    placeholder="Estado"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="telefone">Telefone</Label>
                                <Input
                                    id="telefone"
                                    value={formEndereco.telefone}
                                    onChange={(e) => setFormEndereco({...formEndereco, telefone: e.target.value})}
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formEndereco.email}
                                    onChange={(e) => setFormEndereco({...formEndereco, email: e.target.value})}
                                    placeholder="email@exemplo.com"
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="ativo"
                                checked={formEndereco.ativo}
                                onCheckedChange={(checked) => setFormEndereco({...formEndereco, ativo: checked})}
                            />
                            <Label htmlFor="ativo">Endereço ativo</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEnderecoModal(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveEndereco}>
                            {editingEndereco ? 'Atualizar' : 'Criar'} Endereço
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Dia da Semana */}
            <Dialog open={showDiaModal} onOpenChange={setShowDiaModal}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>
                            {modoModal === 'editar' ? 'Editar Dia da Semana' : 
                             modoModal === 'criar' ? 'Novo Dia da Semana' : 'Gerenciar Dias da Semana'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {modoModal === 'visualizar' ? (
                            // Lista dos dias já cadastrados
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">Dias Cadastrados</h3>
                                    <Button 
                                        size="sm" 
                                        onClick={() => {
                                            setEditingDia(null);
                                            setModoModal('criar');
                                            setFormDia({
                                                dia_semana: '',
                                                horario_inicio: '',
                                                horario_fim: '',
                                                observacoes: '',
                                                ativo: true
                                            });
                                        }}
                                    >
                                        <PlusIcon className="h-4 w-4 mr-1" />
                                        Novo Dia
                                    </Button>
                                </div>
                                
                                {console.log("EnderecosPage: selectedEndereco no modal:", selectedEndereco)}
                                {selectedEndereco && selectedEndereco.dias_semana && selectedEndereco.dias_semana.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedEndereco.dias_semana.map((dia) => (
                                            <div key={dia.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-medium">{diasSemana.find(d => d.value === dia.dia_semana)?.label}</span>
                                                        <span className="text-sm text-gray-600">
                                                            {dia.horario_inicio} - {dia.horario_fim}
                                                        </span>
                                                        <Badge variant={dia.ativo ? "default" : "secondary"}>
                                                            {dia.ativo ? 'Ativo' : 'Inativo'}
                                                        </Badge>
                                                    </div>
                                                    {dia.observacoes && (
                                                        <p className="text-sm text-gray-500 mt-1">{dia.observacoes}</p>
                                                    )}
                                                </div>
                                                <div className="flex space-x-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEditDia(dia)}
                                                    >
                                                        <EditIcon className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteDia(dia, selectedEndereco)}
                                                    >
                                                        <TrashIcon className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                        <p>Nenhum dia cadastrado</p>
                                        <p className="text-sm">Clique em "Novo Dia" para adicionar</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Formulário para criar/editar dia
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="dia_semana">Dia da Semana *</Label>
                                    <Select value={formDia.dia_semana} onValueChange={(value) => setFormDia({...formDia, dia_semana: value})}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o dia" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {diasSemana.map(dia => (
                                                <SelectItem key={dia.value} value={dia.value}>
                                                    {dia.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="horario_inicio">Horário de Início *</Label>
                                        <Input
                                            id="horario_inicio"
                                            type="time"
                                            value={formDia.horario_inicio}
                                            onChange={(e) => setFormDia({...formDia, horario_inicio: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="horario_fim">Horário de Fim *</Label>
                                        <Input
                                            id="horario_fim"
                                            type="time"
                                            value={formDia.horario_fim}
                                            onChange={(e) => setFormDia({...formDia, horario_fim: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="observacoes">Observações</Label>
                                    <Textarea
                                        id="observacoes"
                                        value={formDia.observacoes}
                                        onChange={(e) => setFormDia({...formDia, observacoes: e.target.value})}
                                        placeholder="Observações sobre o funcionamento"
                                        rows={3}
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="ativo_dia"
                                        checked={formDia.ativo}
                                        onCheckedChange={(checked) => setFormDia({...formDia, ativo: checked})}
                                    />
                                    <Label htmlFor="ativo_dia">Dia ativo</Label>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDiaModal(false)}>
                            {modoModal === 'visualizar' ? 'Fechar' : 'Cancelar'}
                        </Button>
                        {(modoModal === 'criar' || modoModal === 'editar') && (
                            <Button onClick={handleSaveDia}>
                                {modoModal === 'editar' ? 'Atualizar' : 'Criar'} Dia
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default EnderecosPage;