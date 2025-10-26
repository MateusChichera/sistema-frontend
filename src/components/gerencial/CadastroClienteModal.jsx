import React, { useState } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Loader2 } from 'lucide-react';

const CadastroClienteModal = ({ isOpen, onClose, onClienteCadastrado }) => {
    const { empresa } = useEmpresa();
    const { token } = useAuth(); 
    
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nome: '',
        telefone: '',
        email: '',
        cpf_cnpj: ''
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.nome.trim()) {
            toast.error('Nome é obrigatório');
            return;
        }

        if (!formData.telefone.trim()) {
            toast.error('Telefone é obrigatório');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post(`/gerencial/${empresa.slug}/contas-prazo/clientes/rapido`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Cliente cadastrado com sucesso!');
            onClienteCadastrado(response.data);
            handleClose();
        } catch (err) {
            console.error("Erro ao cadastrar cliente:", err);
            toast.error(err.response?.data?.message || 'Erro ao cadastrar cliente.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            nome: '',
            telefone: '',
            email: '',
            cpf_cnpj: ''
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Cadastrar Cliente</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label htmlFor="nome">Nome *</Label>
                            <Input
                                id="nome"
                                value={formData.nome}
                                onChange={(e) => handleInputChange('nome', e.target.value)}
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
                                onChange={(e) => handleInputChange('telefone', e.target.value)}
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
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                placeholder="cliente@email.com"
                                className="w-full"
                            />
                        </div>
                        <div>
                            <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                            <Input
                                id="cpf_cnpj"
                                value={formData.cpf_cnpj}
                                onChange={(e) => handleInputChange('cpf_cnpj', e.target.value)}
                                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                                className="w-full"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Cadastrar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CadastroClienteModal;
