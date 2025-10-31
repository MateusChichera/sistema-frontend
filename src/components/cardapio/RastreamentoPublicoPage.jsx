import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, MapPin, Navigation, CheckCircle2, Clock, Package } from 'lucide-react';
import axios from 'axios';

const RastreamentoPublicoPage = () => {
    const { slug, id } = useParams();
    const [rastreamento, setRastreamento] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [enderecoCoordenadas, setEnderecoCoordenadas] = useState(null);
    const [mapaUrl, setMapaUrl] = useState(null); // URL do mapa para renderizar iframe
    const [tempoEstimado, setTempoEstimado] = useState(null); // Tempo estimado em minutos
    const pollingIntervalRef = useRef(null);
    const mapaInicializadoRef = useRef(false);
    
    // Função para calcular distância entre duas coordenadas (fórmula de Haversine)
    const calcularDistancia = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Raio da Terra em km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distância em km
    };
    
    // Função para calcular tempo estimado (considerando velocidade média de 40 km/h para moto)
    const calcularTempoEstimado = (distanciaKm) => {
        const velocidadeMediaKmH = 40; // km/h
        const tempoEmHoras = distanciaKm / velocidadeMediaKmH;
        const tempoEmMinutos = Math.ceil(tempoEmHoras * 60);
        return tempoEmMinutos;
    };
    
    // Cleanup ao desmontar
    useEffect(() => {
        return () => {
            // Limpar blob URL para evitar vazamento de memória
            if (mapaUrl && mapaUrl.startsWith('blob:')) {
                URL.revokeObjectURL(mapaUrl);
            }
        };
    }, [mapaUrl]);

    // Buscar coordenadas do endereço usando OpenStreetMap Nominatim
    const buscarCoordenadasEndereco = useCallback(async (endereco) => {
        if (!endereco || !endereco.trim()) {
            console.error('Endereço vazio ou inválido');
            return null;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
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
                
                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    
                    if (!isNaN(lat) && !isNaN(lng)) {
                        const coords = { latitude: lat, longitude: lng };
                        setEnderecoCoordenadas(coords);
                        return coords;
                    }
                } else {
                    // Tentar com endereço simplificado
                    const partesEndereco = endereco.split(',');
                    if (partesEndereco.length > 1) {
                        const enderecoSimplificado = partesEndereco[0] + ',' + partesEndereco[1];
                        
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
                                const coords = { latitude: lat, longitude: lng };
                                setEnderecoCoordenadas(coords);
                                return coords;
                            }
                        }
                    }
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name !== 'AbortError') {
                    throw fetchError;
                }
            }
        } catch (err) {
            // Silenciar erro - apenas log se necessário
        }
        return null;
    }, []);

    // Criar mapa apenas uma vez quando tiver todas as coordenadas necessárias
    useEffect(() => {
        // Só criar mapa se ainda não foi criado e todas as condições forem atendidas
        if (rastreamento?.status === 'em_entrega' && 
            rastreamento.latitude && 
            rastreamento.longitude &&
            enderecoCoordenadas &&
            !mapaUrl) { // Só criar se ainda não tiver mapa
            
            const latMotoboy = parseFloat(rastreamento.latitude);
            const lngMotoboy = parseFloat(rastreamento.longitude);
            const enderecoLat = parseFloat(enderecoCoordenadas.latitude);
            const enderecoLng = parseFloat(enderecoCoordenadas.longitude);
            
            // Validar coordenadas
            if (!isNaN(latMotoboy) && !isNaN(lngMotoboy) && !isNaN(enderecoLat) && !isNaN(enderecoLng)) {
                
                // Calcular distância e tempo estimado
                const distancia = calcularDistancia(latMotoboy, lngMotoboy, enderecoLat, enderecoLng);
                const tempo = calcularTempoEstimado(distancia);
                setTempoEstimado(tempo);
                
                // Usar Leaflet via CDN para mostrar mapa interativo com rota traçada e motoboy animado
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
        const motoboyLat = ${latMotoboy};
        const motoboyLng = ${lngMotoboy};
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
            .bindPopup('Entregador');
        
        // Marcador do destino (vermelho)
        const destinoMarker = L.marker([destinoLat, destinoLng])
            .addTo(map)
            .bindPopup('Seu endereço');
        
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
    }, [rastreamento?.status, rastreamento?.latitude, rastreamento?.longitude, enderecoCoordenadas, mapaUrl]);

    // Buscar dados de rastreamento
    const fetchRastreamento = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Rota pública sem autenticação
            // Criar uma requisição sem token para rotas públicas
            const apiBaseUrl = import.meta.env.VITE_BACKEND_API_URL || 
              (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '212.85.23.251'
                ? 'http://localhost:3001/api/v1' 
                : window.location.hostname.startsWith('192.168.') || window.location.hostname.startsWith('10.') || window.location.hostname.startsWith('172.')
                  ? `http://${window.location.hostname}:3001/api/v1`
                  : '/api/v1');
            
            const response = await axios.get(`${apiBaseUrl}/${slug}/pedidos/${id}/rastreamento/publico`);
            
            const data = response.data;
            if (data?.rastreamento) {
                setRastreamento(data.rastreamento);

                // Buscar coordenadas do endereço se ainda não tiver (evitar buscar novamente se já tiver)
                const enderecoEntrega = data.rastreamento.endereco_entrega || data.rastreamento.endereco;
                if (enderecoEntrega && !enderecoCoordenadas) {
                    await buscarCoordenadasEndereco(enderecoEntrega);
                }
            } else {
                setError('Rastreamento não encontrado');
            }
        } catch (err) {
            console.error('Erro ao buscar rastreamento:', err);
            setError(err.response?.data?.message || 'Erro ao carregar rastreamento');
        } finally {
            setLoading(false);
        }
    }, [slug, id, buscarCoordenadasEndereco]);

    // Polling para atualizar rastreamento em tempo real
    useEffect(() => {
        // Buscar inicial
        fetchRastreamento();
    }, [fetchRastreamento]);

    // Polling separado para quando estiver em entrega
    useEffect(() => {
        if (rastreamento?.status === 'em_entrega') {
            pollingIntervalRef.current = setInterval(() => {
                fetchRastreamento();
            }, 5000); // A cada 5 segundos
        } else {
            // Limpar intervalo se não estiver em entrega
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        }

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [rastreamento?.status, fetchRastreamento]);

    // Atualizar posição do motoboy no mapa quando coordenadas mudarem (sem recriar o mapa)
    useEffect(() => {
        if (rastreamento?.status === 'em_entrega' && 
            rastreamento.latitude && 
            rastreamento.longitude &&
            mapaUrl) {
            
            const lat = parseFloat(rastreamento.latitude);
            const lng = parseFloat(rastreamento.longitude);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                // Aguardar iframe carregar antes de enviar mensagem
                setTimeout(() => {
                    const iframe = document.getElementById('mapa-iframe');
                    if (iframe && iframe.contentWindow) {
                        // Atualizar posição do motoboy no mapa via postMessage
                        iframe.contentWindow.postMessage({
                            type: 'updateMotoboyPosition',
                            lat: lat,
                            lng: lng
                        }, '*');
                        
                        // Recalcular tempo estimado se tiver coordenadas do endereço
                        if (enderecoCoordenadas) {
                            const distancia = calcularDistancia(lat, lng, enderecoCoordenadas.latitude, enderecoCoordenadas.longitude);
                            const tempo = calcularTempoEstimado(distancia);
                            setTempoEstimado(tempo);
                        }
                    }
                }, 500); // Aguardar iframe carregar
            }
        }
    }, [rastreamento?.latitude, rastreamento?.longitude, rastreamento?.status, mapaUrl, enderecoCoordenadas]);

    if (loading && !rastreamento) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 bg-gray-50">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-lg font-semibold text-gray-700">Carregando rastreamento...</p>
            </div>
        );
    }

    if (error || !rastreamento) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 bg-gray-50">
                <Package className="h-10 w-10 text-gray-400 mb-4" />
                <p className="text-lg font-semibold text-gray-600">{error || 'Rastreamento não encontrado'}</p>
            </div>
        );
    }

    const statusEntrega = rastreamento.status || 'pendente';

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                        Acompanhe sua Entrega
                    </h1>
                    <p className="text-gray-600">
                        Pedido #{rastreamento.numero_pedido || id}
                    </p>
                </div>

                {/* Status do Rastreamento */}
                <Card>
                    <CardHeader>
                        <CardTitle>Status da Entrega</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            {statusEntrega === 'pendente' && (
                                <>
                                    <Clock className="h-6 w-6 text-gray-500" />
                                    <div>
                                        <p className="font-semibold text-gray-700">Aguardando início da entrega</p>
                                        <p className="text-sm text-gray-500">O entregador ainda não iniciou a entrega</p>
                                    </div>
                                </>
                            )}
                            {statusEntrega === 'em_entrega' && (
                                <>
                                    <Navigation className="h-6 w-6 text-blue-500 animate-pulse" />
                                    <div className="flex-1">
                                        <p className="font-semibold text-blue-700">Em entrega</p>
                                        <p className="text-sm text-gray-500">Seu pedido está a caminho!</p>
                                        {tempoEstimado && tempoEstimado > 0 && (
                                            <p className="text-sm font-medium text-blue-600 mt-1">
                                                ⏱️ Tempo estimado: {tempoEstimado} {tempoEstimado === 1 ? 'minuto' : 'minutos'}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                            {statusEntrega === 'entregue' && (
                                <>
                                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                                    <div>
                                        <p className="font-semibold text-green-700">Pedido entregue!</p>
                                        <p className="text-sm text-gray-500">Seu pedido foi entregue com sucesso</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Endereço de entrega */}
                        {(rastreamento.endereco_entrega || rastreamento.endereco) && (
                            <div className="flex items-start gap-2 pt-3 border-t">
                                <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Endereço de entrega:</p>
                                    <p className="text-sm text-gray-600">{rastreamento.endereco_entrega || rastreamento.endereco}</p>
                                </div>
                            </div>
                        )}

                        {/* Data de início */}
                        {rastreamento.data_inicio && (
                            <div className="text-xs text-gray-500">
                                Entrega iniciada em: {new Date(rastreamento.data_inicio).toLocaleString('pt-BR')}
                            </div>
                        )}

                        {/* Data de entrega */}
                        {rastreamento.data_entrega && (
                            <div className="text-xs text-green-600 font-medium">
                                Entregue em: {new Date(rastreamento.data_entrega).toLocaleString('pt-BR')}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Mapa */}
                <Card>
                    <CardHeader>
                        <CardTitle>Localização em Tempo Real</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div 
                            className="w-full h-[400px] sm:h-[500px] rounded-lg overflow-hidden bg-gray-100 relative"
                            style={{ minHeight: '400px' }}
                        >
                            {/* Mensagens de status - sobrepostas */}
                            {statusEntrega === 'pendente' && (
                                <div className="flex items-center justify-center h-full absolute inset-0 bg-gray-100 z-10">
                                    <div className="text-center">
                                        <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-600">Aguardando início da entrega</p>
                                        <p className="text-xs text-gray-500 mt-1">O mapa aparecerá quando o entregador iniciar a entrega</p>
                                    </div>
                                </div>
                            )}
                            {statusEntrega === 'em_entrega' && !mapaUrl && (
                                <div className="flex items-center justify-center h-full p-4 absolute inset-0 bg-gray-100 z-10">
                                    <div className="text-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                                        <p className="text-sm text-gray-600">
                                            {!rastreamento.latitude || !rastreamento.longitude 
                                                ? 'Aguardando localização do entregador...'
                                                : !enderecoCoordenadas 
                                                    ? 'Buscando endereço de entrega...'
                                                    : 'Carregando mapa...'}
                                        </p>
                                        {!enderecoCoordenadas && (rastreamento.endereco_entrega || rastreamento.endereco) && (
                                            <p className="text-xs text-gray-500 mt-2 px-4">
                                                Endereço: {rastreamento.endereco_entrega || rastreamento.endereco}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                            {statusEntrega === 'entregue' && (
                                <div className="flex items-center justify-center h-full absolute inset-0 bg-gray-100 z-10">
                                    <div className="text-center">
                                        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                        <p className="text-sm font-semibold text-green-700">Pedido entregue!</p>
                                        <p className="text-xs text-gray-500 mt-1">Obrigado pela preferência</p>
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

                {/* Informações Adicionais */}
                {rastreamento.historico && rastreamento.historico.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Localização</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {rastreamento.historico.slice(-5).reverse().map((item, idx) => {
                                    // Converter para número e garantir que sejam válidos
                                    const lat = parseFloat(item.latitude);
                                    const lng = parseFloat(item.longitude);
                                    
                                    // Verificar se são números válidos antes de usar toFixed
                                    if (isNaN(lat) || isNaN(lng)) {
                                        return null; // Não renderizar se valores inválidos
                                    }
                                    
                                    return (
                                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span>
                                                {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('pt-BR') : 'N/A'} - 
                                                Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default RastreamentoPublicoPage;

