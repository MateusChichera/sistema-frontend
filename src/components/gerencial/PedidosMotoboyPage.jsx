import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEmpresa } from '../../contexts/EmpresaContext';
import api from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { Package, MapPin, Phone, DollarSign, User, Loader2 } from 'lucide-react';

const PedidosMotoboyPage = () => {
    const { slug } = useParams();
    const { user, token } = useAuth();
    const { empresa, loading: empresaLoading, isReady } = useEmpresa();
    const navigate = useNavigate();
    
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchPedidos = useCallback(async () => {
        // Verificar novamente se temos tudo necessário
        if (!slug || !token) {
            console.log('PedidosMotoboyPage - fetchPedidos: faltando slug ou token', { slug, hasToken: !!token });
            setLoading(false);
            setError('Slug ou token não disponível. Por favor, faça login novamente.');
            return;
        }
        
        try {
            setLoading(true);
            setError(null);
            const url = `/gerencial/${slug}/rastreamento/pedidos`;
            console.log('PedidosMotoboyPage - Chamando API:', url);
            console.log('PedidosMotoboyPage - Base URL:', api.defaults.baseURL);
            console.log('PedidosMotoboyPage - Slug:', slug);
            console.log('PedidosMotoboyPage - Token existe:', !!token);
            
            // O token já é adicionado automaticamente pelo interceptor do api.js
            const response = await api.get(url);
            
            console.log('PedidosMotoboyPage - Resposta da API:', response.data);
            setPedidos(response.data?.pedidos || response.data || []);
        } catch (err) {
            console.error('PedidosMotoboyPage - Erro completo:', err);
            console.error('PedidosMotoboyPage - Response error:', err.response);
            const errorMsg = err.response?.data?.message || err.message || 'Erro ao carregar pedidos.';
            setError(errorMsg);
            toast.error(errorMsg);
            setPedidos([]);
        } finally {
            setLoading(false);
        }
    }, [slug, token]);

    useEffect(() => {
        // Debug: verificar estados
        console.log('PedidosMotoboyPage - Estados:', {
            empresaLoading,
            isReady,
            empresa: !!empresa,
            empresaSlug: empresa?.slug,
            slug,
            hasToken: !!token,
            userId: user?.id
        });
        
        // Se ainda está carregando a empresa, aguarda
        if (empresaLoading) {
            console.log('PedidosMotoboyPage - Aguardando empresa carregar...');
            return;
        }
        
        // Se empresa não está pronta, aguarda
        if (!isReady || !empresa) {
            console.log('PedidosMotoboyPage - Empresa não pronta');
            setLoading(false);
            return;
        }
        
        // Se não tem slug ou token, mostra erro e para loading
        if (!slug || !token) {
            console.log('PedidosMotoboyPage - Faltando slug ou token');
            setLoading(false);
            setError('Dados necessários não disponíveis. Por favor, recarregue a página.');
            return;
        }
        
        // Verifica se o slug da empresa corresponde ao slug da URL
        if (empresa.slug !== slug) {
            console.log('PedidosMotoboyPage - Slug da empresa não corresponde ao slug da URL', {
                empresaSlug: empresa.slug,
                urlSlug: slug
            });
            setLoading(false);
            setError('Erro: slug da empresa não corresponde.');
            return;
        }
        
        console.log('PedidosMotoboyPage - Todas condições atendidas, chamando fetchPedidos');
        fetchPedidos();
    }, [slug, token, empresa, empresaLoading, isReady, fetchPedidos]);

    const handleSelecionarPedido = (pedidoId) => {
        navigate(`/gerencial/${slug}/motoboy/pedido/${pedidoId}`);
    };

    if (empresaLoading || !isReady || loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-gray-600">Carregando pedidos...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">Pedidos para Entrega</h1>
                    <Button onClick={fetchPedidos} variant="outline" size="sm">
                        Tentar Novamente
                    </Button>
                </div>
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-red-600 text-lg mb-4">{error}</p>
                        <Button onClick={fetchPedidos} variant="outline">
                            Recarregar
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Pedidos para Entrega</h1>
                <Button onClick={fetchPedidos} variant="outline" size="sm">
                    Atualizar
                </Button>
            </div>

            {pedidos.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 text-lg">Nenhum pedido disponível para entrega</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {pedidos.map((pedido) => (
                        <Card 
                            key={pedido.id} 
                            className="cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => handleSelecionarPedido(pedido.id)}
                        >
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Pedido #{pedido.numero_pedido}</span>
                                    {pedido.rastreamento && (
                                        <span className={`text-xs px-2 py-1 rounded ${
                                            pedido.rastreamento.status === 'em_entrega' 
                                                ? 'bg-blue-100 text-blue-700' 
                                                : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            {pedido.rastreamento.status === 'em_entrega' ? 'Em entrega' : 'Pendente'}
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-start gap-2">
                                    <User className="h-4 w-4 text-gray-500 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium">{pedido.cliente}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start gap-2">
                                    <Phone className="h-4 w-4 text-gray-500 mt-0.5" />
                                    <p className="text-sm text-gray-600">{pedido.telefone}</p>
                                </div>
                                
                                <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                                    <p className="text-sm text-gray-600">{pedido.endereco}</p>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-gray-500" />
                                    <p className="text-sm font-semibold text-gray-900">
                                        R$ {parseFloat(pedido.valor_total).toFixed(2).replace('.', ',')}
                                    </p>
                                </div>
                                
                                <Button 
                                    className="w-full mt-4" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelecionarPedido(pedido.id);
                                    }}
                                >
                                    {pedido.rastreamento?.status === 'em_entrega' ? 'Continuar Entrega' : 'Iniciar Entrega'}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PedidosMotoboyPage;

