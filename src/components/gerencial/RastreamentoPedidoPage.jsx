import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEmpresa } from '../../contexts/EmpresaContext';
import api from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, Phone, User, DollarSign, Navigation, Loader2, CheckCircle2, Map as MapIcon } from 'lucide-react';

const RastreamentoPedidoPage = () => {
    const { slug, id } = useParams();
    const { user, token } = useAuth();
    const { empresa, loading: empresaLoading, isReady } = useEmpresa();
    const navigate = useNavigate();
    
    const [pedido, setPedido] = useState(null);
    const [rastreamento, setRastreamento] = useState(null);
    const [loading, setLoading] = useState(true);
    const [iniciando, setIniciando] = useState(false);
    const [marcandoEntregue, setMarcandoEntregue] = useState(false);
    const [localizacaoAtual, setLocalizacaoAtual] = useState(null);
    const [enderecoCoordenadas, setEnderecoCoordenadas] = useState(null);
    const [mapaUrl, setMapaUrl] = useState(null); // URL do mapa para renderizar iframe
    const watchIdRef = useRef(null);
    const envioLocalizacaoIniciadoRef = useRef(false);
    const rastreamentoRef = useRef(null);
    const pedidoIdRef = useRef(null); // Armazenar o pedido.id correto da API

    // Cleanup ao desmontar
    useEffect(() => {
        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
            // Limpar blob URL para evitar vazamento de memória
            if (mapaUrl && mapaUrl.startsWith('blob:')) {
                URL.revokeObjectURL(mapaUrl);
            }
        };
    }, [mapaUrl]);

    const requestLocationPermission = useCallback(() => {
        if (!navigator.geolocation) {
            toast.error('Geolocalização não está disponível neste dispositivo.');
            return;
        }
        
        // Forçar solicitação de permissão mesmo em HTTP (alguns navegadores permitem)
        // Tentar solicitar permissão primeiro
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                if (result.state === 'prompt' || result.state === 'granted') {
                    // Pode solicitar
                    solicitarLocalizacao();
                } else {
                    toast.warning('Por favor, permita o acesso à localização nas configurações do navegador.');
                }
            }).catch(() => {
                // Se não suportar permissions API, tentar diretamente
                solicitarLocalizacao();
            });
        } else {
            // Se não suportar permissions API, tentar diretamente
            solicitarLocalizacao();
        }
        
        function solicitarLocalizacao() {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    setLocalizacaoAtual(coords);
                    console.log('Localização obtida:', coords);
                    toast.success('Localização obtida com sucesso!');
                },
                (error) => {
                    console.error('Erro ao obter localização:', error);
                    
                    let errorMessage = 'Erro ao obter localização.';
                    
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Permissão de localização negada. Por favor, permita o acesso à localização nas configurações do navegador.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Localização indisponível. Verifique se o GPS está ativado.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Tempo de espera esgotado. Tentando novamente com configurações mais flexíveis...';
                            // Tentar novamente com configurações menos restritivas
                            navigator.geolocation.getCurrentPosition(
                                (position) => {
                                    const coords = {
                                        latitude: position.coords.latitude,
                                        longitude: position.coords.longitude
                                    };
                                    setLocalizacaoAtual(coords);
                                    toast.success('Localização obtida!');
                                },
                                (err) => {
                                    toast.error('Não foi possível obter sua localização. Verifique as permissões.');
                                },
                                {
                                    enableHighAccuracy: false, // Menos restritivo
                                    timeout: 30000, // 30 segundos
                                    maximumAge: 60000 // Aceitar localização com até 1 minuto
                                }
                            );
                            return; // Não mostrar erro se tentou novamente
                        default:
                            errorMessage = 'Erro desconhecido ao obter localização.';
                            break;
                    }
                    
                    toast.warning(errorMessage);
                    setLocalizacaoAtual(null);
                },
                { 
                    enableHighAccuracy: true,
                    timeout: 30000, // 30 segundos
                    maximumAge: 0 // Sempre obter localização atual
                }
            );
        }
    }, []);

    const buscarCoordenadasEndereco = useCallback(async (endereco) => {
        if (!endereco || !endereco.trim()) {
            console.error('Endereço vazio ou inválido');
            return;
        }

        try {
            console.log('Buscando coordenadas para endereço:', endereco);
            
            // Usar OpenStreetMap Nominatim API (gratuita, sem necessidade de API key)
            // Adicionar timeout e headers necessários
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout
            
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&limit=1&addressdetails=1`,
                    {
                        signal: controller.signal,
                        headers: {
                            'User-Agent': 'AthosRestaurantSystem/1.0'
                        }
                    }
                );
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Resposta Nominatim:', data);
                
                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    
                    if (!isNaN(lat) && !isNaN(lng)) {
                        console.log('Coordenadas encontradas:', { lat, lng });
                        setEnderecoCoordenadas({
                            latitude: lat,
                            longitude: lng
                        });
                        toast.success('Endereço localizado no mapa');
                    } else {
                        console.error('Coordenadas inválidas:', { lat, lng });
                        toast.error('Erro: coordenadas inválidas do endereço');
                    }
                } else {
                    console.error('Endereço não encontrado no Nominatim');
                    
                    // Tentar novamente com apenas o nome da rua e número (sem recursão)
                    const partesEndereco = endereco.split(',');
                    if (partesEndereco.length > 1) {
                        const enderecoSimplificado = partesEndereco[0] + ',' + partesEndereco[1];
                        console.log('Tentando endereço simplificado:', enderecoSimplificado);
                        
                        // Fazer uma nova busca sem recursão
                        const responseSimplificado = await fetch(
                            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoSimplificado)}&limit=1&addressdetails=1`,
                            {
                                headers: {
                                    'User-Agent': 'AthosRestaurantSystem/1.0'
                                }
                            }
                        );
                        
                        const dataSimplificado = await responseSimplificado.json();
                        if (dataSimplificado && dataSimplificado.length > 0) {
                            const lat = parseFloat(dataSimplificado[0].lat);
                            const lng = parseFloat(dataSimplificado[0].lon);
                            
                            if (!isNaN(lat) && !isNaN(lng)) {
                                console.log('Coordenadas encontradas (endereço simplificado):', { lat, lng });
                                setEnderecoCoordenadas({
                                    latitude: lat,
                                    longitude: lng
                                });
                                toast.success('Endereço localizado no mapa (versão simplificada)');
                                return;
                            }
                        }
                    }
                    
                    toast.error('Endereço não encontrado no mapa. O mapa pode não funcionar corretamente.');
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    console.error('Timeout ao buscar coordenadas (10s)');
                    toast.error('Timeout ao buscar coordenadas. Verifique sua conexão.');
                } else {
                    throw fetchError;
                }
            }
        } catch (err) {
            console.error('Erro ao buscar coordenadas:', err);
            toast.error('Erro ao buscar coordenadas do endereço: ' + (err.message || 'Erro desconhecido'));
        }
    }, []);

    const fetchPedido = useCallback(async () => {
        if (!slug || !id || !token) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            // O token já é adicionado automaticamente pelo interceptor do api.js
            const response = await api.get(`/gerencial/${slug}/rastreamento/pedidos`);
            
            // IMPORTANTE: Usar id da URL apenas para buscar o pedido na lista
            // Mas depois usar pedido.id (da API) para todas as chamadas
            const pedidoEncontrado = response.data.pedidos?.find(p => p.id === parseInt(id));
            if (pedidoEncontrado) {
                console.log('=== PEDIDO CARREGADO ===');
                console.log('ID da URL (usado apenas para buscar):', id);
                console.log('Pedido ID da API (USE ESTE!):', pedidoEncontrado.id);
                console.log('Rastreamento ID (NÃO USE):', pedidoEncontrado.rastreamento?.id);
                
                setPedido(pedidoEncontrado);
                const rastreamentoPedido = pedidoEncontrado.rastreamento;
                setRastreamento(rastreamentoPedido);
                rastreamentoRef.current = rastreamentoPedido;
                
                // ⚠️ CRÍTICO: Armazenar o pedido.id correto da API (não o id da URL)
                pedidoIdRef.current = pedidoEncontrado.id;
                console.log('Pedido ID armazenado para uso nas APIs:', pedidoIdRef.current);
                
                // Buscar coordenadas do endereço de entrega (campo correto da API)
                const enderecoEntrega = pedidoEncontrado.endereco_entrega || pedidoEncontrado.endereco;
                if (enderecoEntrega) {
                    buscarCoordenadasEndereco(enderecoEntrega);
                }
            } else {
                toast.error('Pedido não encontrado.');
                navigate(`/gerencial/${slug}/motoboy/pedidos`);
            }
        } catch (err) {
            console.error('Erro ao buscar pedido:', err);
            toast.error('Erro ao carregar pedido.');
            navigate(`/gerencial/${slug}/motoboy/pedidos`);
        } finally {
            setLoading(false);
        }
    }, [slug, id, token, buscarCoordenadasEndereco, navigate]);

    // Carregar pedido quando componente montar
    useEffect(() => {
        if (empresaLoading || !isReady || !empresa || !slug || !id || !token) {
            return;
        }

        if (empresa.slug !== slug) {
            setLoading(false);
            toast.error('Erro: slug da empresa não corresponde.');
            return;
        }

        fetchPedido();
        // Sempre solicitar localização quando componente carregar
        requestLocationPermission();
    }, [slug, id, token, empresa, empresaLoading, isReady, fetchPedido, requestLocationPermission]);
    
    // Solicitar localização novamente quando iniciar entrega para garantir localização precisa
    useEffect(() => {
        if (rastreamento?.status === 'em_entrega' && !localizacaoAtual) {
            console.log('Entrega iniciada mas sem localização. Solicitando localização...');
            requestLocationPermission();
        }
    }, [rastreamento?.status, localizacaoAtual, requestLocationPermission]);

    const mapaInicializadoRef = useRef(false);
    
    // Criar mapa apenas uma vez quando tiver todas as coordenadas necessárias
    useEffect(() => {
        const statusEntregaAtual = rastreamento?.status || 'pendente';
        
        // Só criar mapa se ainda não foi criado e todas as condições forem atendidas
        if (statusEntregaAtual === 'em_entrega' && 
            localizacaoAtual && 
            enderecoCoordenadas &&
            localizacaoAtual.latitude && 
            localizacaoAtual.longitude &&
            enderecoCoordenadas.latitude &&
            enderecoCoordenadas.longitude &&
            !mapaUrl) { // Só criar se ainda não tiver mapa
            
            const lat = parseFloat(localizacaoAtual.latitude);
            const lng = parseFloat(localizacaoAtual.longitude);
            const enderecoLat = parseFloat(enderecoCoordenadas.latitude);
            const enderecoLng = parseFloat(enderecoCoordenadas.longitude);
            
            // Validar coordenadas
            if (!isNaN(lat) && !isNaN(lng) && !isNaN(enderecoLat) && !isNaN(enderecoLng)) {
                // Usar Leaflet via CDN para mostrar mapa interativo com rota traçada
                // Criar um HTML completo que será injetado no iframe
                const mapHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mapa de Rastreamento</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
        .motoboy-icon {
            background-color: #22c55e;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        // Coordenadas
        const motoboyLat = ${lat};
        const motoboyLng = ${lng};
        const destinoLat = ${enderecoLat};
        const destinoLng = ${enderecoLng};
        
        // Criar mapa centralizado entre as duas localizações
        const centerLat = (motoboyLat + destinoLat) / 2;
        const centerLng = (motoboyLng + destinoLng) / 2;
        const map = L.map('map').setView([centerLat, centerLng], 13);
        
        // Adicionar camada do OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
        
        // Criar ícone customizado para o motoboy (verde, animado)
        const motoboyIcon = L.divIcon({
            className: 'motoboy-icon',
            html: '🛵',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
        
        // Marcador do motoboy (verde, animado)
        const motoboyMarker = L.marker([motoboyLat, motoboyLng], { icon: motoboyIcon })
            .addTo(map)
            .bindPopup('Você está aqui');
        
        // Marcador do destino (vermelho)
        const destinoMarker = L.marker([destinoLat, destinoLng])
            .addTo(map)
            .bindPopup('Destino da entrega');
        
        // Armazenar referências globalmente para atualização via postMessage
        window.motoboyMarkerRef = motoboyMarker;
        window.mapRef = map;
        
        // Atualizar posição do motoboy quando coordenadas mudarem (será chamado via postMessage)
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'updateMotoboyPosition') {
                const { lat, lng } = event.data;
                if (window.motoboyMarkerRef) {
                    window.motoboyMarkerRef.setLatLng([lat, lng]);
                    // Não ajustar zoom automaticamente, apenas mover o marcador
                }
            }
        });
        
        // Traçar rota usando OSRM (Open Source Routing Machine) - gratuito
        fetch('https://router.project-osrm.org/route/v1/driving/' + motoboyLng + ',' + motoboyLat + ';' + destinoLng + ',' + destinoLat + '?overview=full&geometries=geojson')
            .then(response => response.json())
            .then(data => {
                if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // OSRM retorna [lng, lat], Leaflet precisa [lat, lng]
                    
                    // Desenhar rota no mapa
                    L.polyline(coordinates, {
                        color: '#3b82f6',
                        weight: 4,
                        opacity: 0.7,
                        dashArray: '10, 5'
                    }).addTo(map);
                    
                    // Ajustar zoom apenas uma vez para mostrar toda a rota
                    if (!window.mapBoundsSet) {
                        const bounds = L.latLngBounds(coordinates);
                        map.fitBounds(bounds, { padding: [50, 50] });
                        window.mapBoundsSet = true; // Marcar que já ajustou o zoom
                    }
                }
            })
            .catch(error => {
                // Se falhar, apenas ajustar zoom uma vez para mostrar ambos os marcadores
                if (!window.mapBoundsSet) {
                    const bounds = L.latLngBounds([[motoboyLat, motoboyLng], [destinoLat, destinoLng]]);
                    map.fitBounds(bounds, { padding: [50, 50] });
                    window.mapBoundsSet = true;
                }
            });
    </script>
</body>
</html>`;
                
                // Criar blob URL para o HTML apenas uma vez
                if (!mapaInicializadoRef.current) {
                    const blob = new Blob([mapHtml], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    setMapaUrl(url);
                    mapaInicializadoRef.current = true;
                }
            }
        }
    }, [rastreamento?.status, localizacaoAtual, enderecoCoordenadas, mapaUrl]);


    const iniciarEnvioLocalizacao = useCallback(() => {
        // Evitar iniciar múltiplas vezes
        if (envioLocalizacaoIniciadoRef.current || watchIdRef.current) {
            return;
        }

        // Verificar se rastreamento foi iniciado
        if (rastreamento?.status !== 'em_entrega') {
            console.log('Rastreamento não está em entrega. Aguardando inicialização...');
            return;
        }

        if (!navigator.geolocation) {
            toast.error('Geolocalização não está disponível neste dispositivo.');
            return;
        }

        envioLocalizacaoIniciadoRef.current = true;

        const id = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                // Só atualiza estado se mudou significativamente (evita re-renders excessivos)
                setLocalizacaoAtual(prev => {
                    if (!prev || 
                        Math.abs(prev.latitude - latitude) > 0.0001 || 
                        Math.abs(prev.longitude - longitude) > 0.0001) {
                            return { latitude, longitude };
                        }
                        return prev;
                });

                try {
                    // Verificar se rastreamento está iniciado antes de atualizar (usar ref para valor atual)
                    const rastreamentoAtual = rastreamentoRef.current;
                    if (!rastreamentoAtual || rastreamentoAtual.status !== 'em_entrega') {
                        console.log('Rastreamento não está em entrega. Aguardando...');
                        return;
                    }

                    // ⚠️ CRÍTICO: Usar pedido.id da API (não id da URL)
                    const pedidoIdParaApi = pedidoIdRef.current;
                    if (!pedidoIdParaApi) {
                        console.error('Pedido ID não encontrado!');
                        return;
                    }
                    
                    console.log('Atualizando localização para pedido:', pedidoIdParaApi);
                    
                    // O token já é adicionado automaticamente pelo interceptor do api.js
                    await api.put(
                        `/gerencial/${slug}/rastreamento/pedidos/${pedidoIdParaApi}/localizacao`,
                        { latitude, longitude }
                    );
                    
                    // Atualizar posição do motoboy no mapa em tempo real
                    if (mapaUrl) {
                        setTimeout(() => {
                            const iframe = document.getElementById('mapa-iframe');
                            if (iframe && iframe.contentWindow) {
                                iframe.contentWindow.postMessage({
                                    type: 'updateMotoboyPosition',
                                    lat: latitude,
                                    lng: longitude
                                }, '*');
                            }
                        }, 100);
                    }
                } catch (error) {
                    if (error.response?.status === 404 || error.response?.status === 400) {
                        const erro = error.response.data;
                        if (erro?.error === 'RASTREAMENTO_NAO_ENCONTRADO' || erro?.error === 'RASTREAMENTO_NAO_INICIADO') {
                            console.log('Rastreamento não encontrado ou não iniciado. Aguardando inicialização...');
                            // Não mostrar erro, apenas aguardar
                            return;
                        }
                    }
                    console.error('Erro ao atualizar localização:', error);
                }
            },
            (error) => {
                console.error('Erro ao obter localização:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 30000, // Aumentado para 30 segundos
                maximumAge: 60000 // Aceitar localização com até 1 minuto de idade
            }
        );

        watchIdRef.current = id;
    }, [slug, enderecoCoordenadas, rastreamento?.status]);

    const iniciarEntrega = async () => {
        if (!localizacaoAtual) {
            toast.error('Não foi possível obter sua localização. Verifique as permissões.');
            return;
        }

        if (iniciando) {
            return; // Evita múltiplas chamadas
        }

        // ⚠️ CRÍTICO: Usar pedido.id da API (não id da URL)
        const pedidoIdParaApi = pedidoIdRef.current;
        if (!pedidoIdParaApi) {
            toast.error('Erro: Pedido ID não encontrado. Recarregue a página.');
            return;
        }

        try {
            setIniciando(true);
            
            console.log('=== INICIAR ENTREGA ===');
            console.log('Pedido ID (da API):', pedidoIdParaApi);
            console.log('URL:', `/gerencial/${slug}/rastreamento/pedidos/${pedidoIdParaApi}/iniciar`);
            
            // Iniciar rastreamento no backend
            // O token já é adicionado automaticamente pelo interceptor do api.js
            const response = await api.post(
                `/gerencial/${slug}/rastreamento/pedidos/${pedidoIdParaApi}/iniciar`,
                {}
            );

            // Atualizar status do rastreamento
            // O useEffect detectará a mudança e iniciará o envio de localização
            const novoRastreamento = response.data.rastreamento;
            setRastreamento(novoRastreamento);
            rastreamentoRef.current = novoRastreamento; // Atualizar ref também
            
            // O mapa será atualizado automaticamente pelo useEffect que observa localizacaoAtual e enderecoCoordenadas
            
            // Solicitar localização novamente após iniciar entrega para garantir precisão
            if (!localizacaoAtual) {
                requestLocationPermission();
            }
            
            toast.success('Entrega iniciada! Cliente foi notificado via WhatsApp.');
        } catch (err) {
            console.error('Erro ao iniciar entrega:', err);
            toast.error('Erro ao iniciar entrega.');
        } finally {
            setIniciando(false);
        }
    };


    const marcarEntregue = async () => {
        if (marcandoEntregue) {
            return; // Evita múltiplas chamadas
        }

        // ⚠️ CRÍTICO: Usar pedido.id da API (não id da URL)
        const pedidoIdParaApi = pedidoIdRef.current;
        if (!pedidoIdParaApi) {
            toast.error('Erro: Pedido ID não encontrado. Recarregue a página.');
            return;
        }

        try {
            setMarcandoEntregue(true);
            
            // Parar de enviar localização
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
                envioLocalizacaoIniciadoRef.current = false;
            }

            console.log('=== MARCAR ENTREGUE ===');
            console.log('Pedido ID (da API):', pedidoIdParaApi);
            console.log('URL:', `/gerencial/${slug}/rastreamento/pedidos/${pedidoIdParaApi}/entregue`);

            // O token já é adicionado automaticamente pelo interceptor do api.js
            const response = await api.post(
                `/gerencial/${slug}/rastreamento/pedidos/${pedidoIdParaApi}/entregue`,
                { observacoes: '' }
            );

            toast.success('Pedido marcado como entregue! Cliente foi notificado.');
            
            // Atualizar status
            const novoRastreamento = response.data.rastreamento || { status: 'entregue' };
            setRastreamento(novoRastreamento);
            rastreamentoRef.current = novoRastreamento; // Atualizar ref também
            
            // Voltar para lista após 2 segundos
            setTimeout(() => {
                navigate(`/gerencial/${slug}/motoboy/pedidos`);
            }, 2000);
        } catch (err) {
            console.error('Erro ao marcar como entregue:', err);
            toast.error('Erro ao marcar pedido como entregue.');
        } finally {
            setMarcandoEntregue(false);
        }
    };

    // Atualizar ref quando rastreamento mudar
    useEffect(() => {
        rastreamentoRef.current = rastreamento;
    }, [rastreamento]);

    // Iniciar envio de localização quando status mudar para 'em_entrega'
    useEffect(() => {
        // Só executa quando status muda para 'em_entrega' e ainda não foi iniciado
        if (rastreamento?.status !== 'em_entrega' || envioLocalizacaoIniciadoRef.current) {
            return;
        }

        // Verificar se tem localização antes de iniciar
        if (!localizacaoAtual) {
            return;
        }
        
        // Usar a função já declarada
        iniciarEnvioLocalizacao();
        
        // O mapa será atualizado automaticamente pelo useEffect que observa localizacaoAtual e enderecoCoordenadas
    }, [rastreamento?.status, localizacaoAtual, enderecoCoordenadas, iniciarEnvioLocalizacao]);

    const abrirRotaWaze = () => {
        const enderecoEntrega = pedido?.endereco_entrega || pedido?.endereco;
        if (!enderecoEntrega) {
            toast.warning('Endereço não disponível.');
            return;
        }
        // Usar endereço completo como texto para garantir localização correta
        const url = `https://waze.com/ul?q=${encodeURIComponent(enderecoEntrega)}&navigate=yes`;
        window.open(url, '_blank');
    };

    const abrirRotaGoogleMaps = () => {
        const enderecoEntrega = pedido?.endereco_entrega || pedido?.endereco;
        if (!enderecoEntrega) {
            toast.warning('Endereço não disponível.');
            return;
        }
        // Usar endereço completo como texto para garantir localização correta
        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(enderecoEntrega)}&travelmode=driving`;
        window.open(url, '_blank');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!pedido) {
        return null;
    }

    const statusEntrega = rastreamento?.status || 'pendente';
    
    // Calcular valor total incluindo taxa de entrega se aplicável
    const valorTotalComTaxa = pedido?.tipo_entrega === 'Delivery' && empresa?.taxa_entrega && parseFloat(empresa.taxa_entrega) > 0
        ? parseFloat(pedido.valor_total) + parseFloat(empresa.taxa_entrega)
        : parseFloat(pedido?.valor_total || 0);

    return (
        <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
                {/* Header Responsivo */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-white rounded-lg shadow-sm p-3 sm:p-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/gerencial/${slug}/motoboy/pedidos`)}
                        className="self-start sm:self-auto"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                        Pedido #{pedido.numero_pedido}
                    </h1>
                </div>

                {/* Grid Responsivo - Stack em mobile, 2 colunas em desktop */}
                <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                    {/* Informações do Pedido */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg sm:text-xl">Informações do Pedido</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                        <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-gray-500 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-gray-900">{pedido.cliente}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-2">
                            <Phone className="h-4 w-4 text-gray-500 mt-0.5" />
                            <p className="text-sm text-gray-600">{pedido.telefone}</p>
                        </div>
                        
                        <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                            <p className="text-sm text-gray-600">{pedido.endereco_entrega || pedido.endereco}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                            <div className="flex flex-col">
                                {pedido.tipo_entrega === 'Delivery' && empresa?.taxa_entrega && parseFloat(empresa.taxa_entrega) > 0 ? (
                                    <>
                                        <p className="text-xs text-gray-500">
                                            Subtotal: R$ {parseFloat(pedido.valor_total).toFixed(2).replace('.', ',')}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            + Taxa de entrega: R$ {parseFloat(empresa.taxa_entrega).toFixed(2).replace('.', ',')}
                                        </p>
                                        <p className="text-sm font-semibold text-gray-900 mt-1">
                                            Total: R$ {valorTotalComTaxa.toFixed(2).replace('.', ',')}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm font-semibold text-gray-900">
                                        R$ {parseFloat(pedido.valor_total).toFixed(2).replace('.', ',')}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Forma de pagamento */}
                        {pedido.formapagamento && (
                            <div className="flex items-start gap-2 pt-2 border-t">
                                <DollarSign className="h-4 w-4 text-gray-500 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-gray-500">Forma de pagamento:</p>
                                    <p className="text-sm text-gray-900">{pedido.formapagamento}</p>
                                </div>
                            </div>
                        )}

                        {/* Status */}
                        <div className="pt-4 border-t">
                            <p className="text-sm font-medium text-gray-700 mb-2">Status:</p>
                            {statusEntrega === 'pendente' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                                    Aguardando início
                                </span>
                            )}
                            {statusEntrega === 'em_entrega' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                                    <Navigation className="h-3 w-3 mr-1 animate-pulse" />
                                    Em entrega
                                </span>
                            )}
                            {statusEntrega === 'entregue' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Entregue
                                </span>
                            )}
                        </div>

                        {/* Botões de ação - Responsivos */}
                        {statusEntrega === 'pendente' && (
                            <div className="space-y-2 sm:space-y-3">
                                {!localizacaoAtual && (
                                    <p className="text-xs sm:text-sm text-gray-500 text-center mb-2">
                                        Aguardando permissão de localização...
                                    </p>
                                )}
                                <Button 
                                    className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold" 
                                    onClick={iniciarEntrega}
                                    disabled={iniciando || !localizacaoAtual}
                                >
                                    {iniciando ? (
                                        <>
                                            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                                            <span className="hidden sm:inline">Iniciando...</span>
                                            <span className="sm:hidden">Iniciando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Navigation className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                            <span className="hidden sm:inline">Iniciar Entrega</span>
                                            <span className="sm:hidden">Iniciar</span>
                                        </>
                                    )}
                                </Button>
                                {!localizacaoAtual && (
                                    <Button 
                                        variant="outline" 
                                        className="w-full h-10 sm:h-11 text-sm sm:text-base" 
                                        onClick={requestLocationPermission}
                                    >
                                        Solicitar Localização
                                    </Button>
                                )}
                            </div>
                        )}

                        {statusEntrega === 'em_entrega' && (
                            <Button 
                                className="w-full h-11 sm:h-12 bg-green-600 hover:bg-green-700 text-sm sm:text-base font-semibold" 
                                onClick={marcarEntregue}
                                disabled={marcandoEntregue}
                            >
                                {marcandoEntregue ? (
                                    <>
                                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                                        <span className="hidden sm:inline">Marcando...</span>
                                        <span className="sm:hidden">Marcando...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                        <span className="hidden sm:inline">Marcar como Entregue</span>
                                        <span className="sm:hidden">Entregue</span>
                                    </>
                                )}
                            </Button>
                        )}

                        {/* Botões de navegação - só aparecem quando em entrega */}
                        {statusEntrega === 'em_entrega' && enderecoCoordenadas && (
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-3 sm:pt-4 border-t mt-3 sm:mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={abrirRotaWaze}
                                    className="w-full h-10 sm:h-11 text-xs sm:text-sm"
                                >
                                    <MapIcon className="h-4 w-4 mr-1 sm:mr-2" />
                                    <span className="hidden sm:inline">Abrir no Waze</span>
                                    <span className="sm:hidden">Waze</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={abrirRotaGoogleMaps}
                                    className="w-full h-10 sm:h-11 text-xs sm:text-sm"
                                >
                                    <MapIcon className="h-4 w-4 mr-1 sm:mr-2" />
                                    <span className="hidden sm:inline">Abrir no Maps</span>
                                    <span className="sm:hidden">Maps</span>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Mapa - Ocupa largura total em mobile */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg sm:text-xl">Rastreamento</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                        <div 
                            className="w-full h-[300px] sm:h-[400px] md:h-[500px] rounded-lg overflow-hidden bg-gray-100 relative"
                            style={{ minHeight: '300px' }}
                        >
                            {statusEntrega === 'pendente' && (
                                <div className="flex items-center justify-center h-full p-4 absolute inset-0 bg-gray-100 z-10">
                                    <div className="text-center">
                                        <Navigation className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                                        <p className="text-sm sm:text-base font-medium text-gray-700 px-2">
                                            Clique em "Iniciar Entrega" para começar
                                        </p>
                                        <p className="text-xs sm:text-sm text-gray-500 mt-2 px-2">
                                            O mapa aparecerá após iniciar a entrega
                                        </p>
                                    </div>
                                </div>
                            )}
                            {statusEntrega === 'em_entrega' && !mapaUrl && (
                                <div className="flex items-center justify-center h-full p-4 absolute inset-0 bg-gray-100 z-10">
                                    <div className="text-center">
                                        <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-primary mx-auto mb-3 sm:mb-4" />
                                        <p className="text-sm sm:text-base text-gray-600">
                                            {!enderecoCoordenadas 
                                                ? `Buscando coordenadas do endereço...` 
                                                : !localizacaoAtual 
                                                    ? 'Aguardando sua localização...' 
                                                    : 'Carregando mapa...'}
                                        </p>
                                        {!enderecoCoordenadas && pedido?.endereco && (
                                            <p className="text-xs text-gray-500 mt-2 px-4">
                                                Endereço: {pedido.endereco}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                            {mapaUrl && (
                                <iframe
                                    id="mapa-iframe"
                                    src={mapaUrl}
                                    width="100%"
                                    height="100%"
                                    style={{
                                        border: 0,
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%'
                                    }}
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="Mapa de Rastreamento"
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>
                </div>
            </div>
        </div>
    );
};

export default RastreamentoPedidoPage;

