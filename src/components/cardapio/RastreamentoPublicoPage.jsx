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
                console.log('=== CRIANDO MAPA - RASTREAMENTO PÚBLICO ===');
                console.log('Coordenadas do motoboy:', latMotoboy, lngMotoboy);
                console.log('Coordenadas do destino:', enderecoLat, enderecoLng);
                
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
            background-color: #22c55e !important;
            width: 48px !important;
            height: 48px !important;
            border-radius: 50% !important;
            border: 4px solid white !important;
            box-shadow: 0 4px 8px rgba(0,0,0,0.4) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 24px !important;
            animation: pulse 2s infinite, bounce 1s infinite !important;
            position: relative !important;
            z-index: 1000 !important;
            opacity: 1 !important;
            visibility: visible !important;
            line-height: 1 !important;
            text-align: center !important;
        }
        .motoboy-icon::before {
            content: '';
            position: absolute;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background-color: #22c55e;
            opacity: 0.3;
            animation: ripple 2s infinite;
            z-index: -1;
        }
        .motoboy-icon-inner {
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 24px !important;
            line-height: 1 !important;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        @keyframes ripple {
            0% { transform: scale(1); opacity: 0.3; }
            100% { transform: scale(2); opacity: 0; }
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
        
        // Variáveis globais para os marcadores
        let motoboyMarker = null;
        let destinoMarker = null;
        
        // Adicionar camada do OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
        
        // Aguardar mapa carregar completamente antes de adicionar marcadores
        map.whenReady(function() {
            console.log('=== MAPA PRONTO - ADICIONANDO MARCADORES ===');
            console.log('Coordenadas do motoboy:', motoboyLat, motoboyLng);
            
            // Validar coordenadas do motoboy antes de criar marcador
            if (isNaN(motoboyLat) || isNaN(motoboyLng) || 
                motoboyLat < -90 || motoboyLat > 90 || 
                motoboyLng < -180 || motoboyLng > 180) {
                console.error('Coordenadas inválidas do motoboy:', motoboyLat, motoboyLng);
                // Usar coordenadas padrão se inválidas
                motoboyLat = destinoLat;
                motoboyLng = destinoLng;
            }
            
            console.log('=== CRIANDO MARCADOR DO MOTOBOY ===');
            console.log('Coordenadas validadas:', motoboyLat, motoboyLng);
            
            // Criar SVG como string e converter para data URL (estilo Uber/99/iFood)
            const motoboyIconSvg = '<?xml version="1.0" encoding="UTF-8"?>' +
                '<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">' +
                '<circle cx="24" cy="24" r="20" fill="#22c55e" stroke="white" stroke-width="4"/>' +
                '<circle cx="24" cy="24" r="20" fill="#22c55e" stroke="white" stroke-width="4" opacity="0.3">' +
                '<animate attributeName="r" values="20;30" dur="2s" repeatCount="indefinite"/>' +
                '<animate attributeName="opacity" values="0.3;0" dur="2s" repeatCount="indefinite"/>' +
                '</circle>' +
                '<text x="24" y="32" font-size="28" text-anchor="middle" fill="white">🛵</text>' +
                '</svg>';
            
            // Converter SVG para data URL
            const svgBlob = new Blob([motoboyIconSvg], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);
            
            // Criar ícone customizado usando a imagem SVG
            const motoboyIcon = L.icon({
                iconUrl: svgUrl,
                iconSize: [48, 48],
                iconAnchor: [24, 24], // Centro do ícone
                popupAnchor: [0, -24]
            });
            
            console.log('Ícone criado:', motoboyIcon);
            
            // Criar marcador do motoboy com coordenadas validadas
            motoboyMarker = L.marker([motoboyLat, motoboyLng], { 
                icon: motoboyIcon,
                zIndexOffset: 1000,
                draggable: false,
                keyboard: false
            });
            
            // Adicionar ao mapa
            motoboyMarker.addTo(map);
            motoboyMarker.bindPopup('🛵 Entregador');
            
            console.log('Marcador adicionado ao mapa:', motoboyMarker);
            console.log('Posição do marcador:', motoboyMarker.getLatLng());
            console.log('Marcador está no mapa?', map.hasLayer(motoboyMarker));
            
            // Forçar visibilidade do ícone
            setTimeout(() => {
                const markerPos = motoboyMarker.getLatLng();
                console.log('=== VERIFICAÇÃO FINAL DO MARCADOR ===');
                console.log('Posição do marcador (getLatLng):', markerPos.lat, markerPos.lng);
                console.log('Coordenadas originais:', motoboyLat, motoboyLng);
                
                if (motoboyMarker._icon) {
                    console.log('Elemento HTML do ícone encontrado');
                    const iconElement = motoboyMarker._icon;
                    const iconImg = iconElement.querySelector('img');
                    
                    if (iconImg) {
                        console.log('Imagem do ícone encontrada');
                        iconImg.style.display = 'block';
                        iconImg.style.visibility = 'visible';
                        iconImg.style.opacity = '1';
                        iconImg.style.zIndex = '1000';
                    }
                    
                    // Verificar posição do elemento no DOM
                    const rect = iconElement.getBoundingClientRect();
                    console.log('Posição do ícone na tela:', rect);
                    
                    // Verificar se o marcador está visível na viewport
                    const bounds = map.getBounds();
                    console.log('Bounds do mapa:', bounds);
                    console.log('Marcador está dentro dos bounds?', bounds.contains(markerPos));
                    
                    // Garantir que o marcador esteja no centro da view
                    if (!bounds.contains(markerPos)) {
                        console.log('Marcador fora dos bounds! Ajustando view...');
                        map.setView(markerPos, Math.max(13, map.getZoom()));
                    }
                    
                    // Verificar posição real do marcador no mapa
                    const mapContainer = document.getElementById('map');
                    const mapRect = mapContainer.getBoundingClientRect();
                    console.log('Container do mapa:', mapRect);
                    
                } else {
                    console.error('Ícone do marcador não encontrado!');
                }
            }, 500);
            
            // Marcador do destino (vermelho, maior para contraste)
            const destinoIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
            destinoMarker = L.marker([destinoLat, destinoLng], { icon: destinoIcon })
                .addTo(map)
                .bindPopup('📍 Seu endereço');
            
            console.log('Marcador de destino adicionado:', destinoMarker);
            
            // Armazenar referências globalmente
            window.motoboyMarkerRef = motoboyMarker;
            window.destinoMarkerRef = destinoMarker;
            window.mapRef = map;
            console.log('Referências armazenadas globalmente');
            
            // Armazenar referência da rota para atualização do marcador
            window.routeCoordinates = null;
            window.routePolyline = null;
            window.routeProgress = 0; // Progresso na rota (0 a 1)
            
            // Traçar rota usando OSRM (Open Source Routing Machine) - gratuito
            fetch('https://router.project-osrm.org/route/v1/driving/' + motoboyLng + ',' + motoboyLat + ';' + destinoLng + ',' + destinoLat + '?overview=full&geometries=geojson')
                .then(response => response.json())
                .then(data => {
                    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                        const route = data.routes[0];
                        window.routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // OSRM retorna [lng, lat], Leaflet precisa [lat, lng]
                        
                        console.log('Rota calculada com', window.routeCoordinates.length, 'pontos');
                        
                        // Desenhar rota no mapa
                        window.routePolyline = L.polyline(window.routeCoordinates, {
                            color: '#3b82f6',
                            weight: 4,
                            opacity: 0.7,
                            dashArray: '10, 5'
                        }).addTo(map);
                        
                        // IMPORTANTE: Sempre projetar o motoboy na rota quando a rota for traçada
                        // Usar as coordenadas atuais do marcador (que podem ter sido atualizadas)
                        const currentMotoboyPos = motoboyMarker.getLatLng();
                        console.log('Projetando motoboy inicial na rota. Coordenadas atuais:', currentMotoboyPos.lat, currentMotoboyPos.lng);
                        updateMotoboyPositionOnRoute(currentMotoboyPos.lat, currentMotoboyPos.lng);
                        
                        // Ajustar zoom apenas uma vez para mostrar toda a rota E ambos os marcadores
                        if (!window.mapBoundsSet) {
                            // Criar bounds que incluem a rota, o motoboy e o destino
                            const bounds = L.latLngBounds(window.routeCoordinates);
                            bounds.extend([currentMotoboyPos.lat, currentMotoboyPos.lng]);
                            bounds.extend([destinoLat, destinoLng]);
                            map.fitBounds(bounds, { padding: [50, 50] });
                            window.mapBoundsSet = true; // Marcar que já ajustou o zoom
                            console.log('Mapa ajustado para mostrar rota completa e marcadores');
                        }
                        
                        // Se as coordenadas do rastreamento mudarem depois que a rota foi traçada,
                        // garantir que o motoboy seja reprojetado na rota
                        console.log('Rota traçada! Motoboy deve estar projetado na rota.');
                    }
                })
                .catch(error => {
                    console.error('Erro ao traçar rota:', error);
                    // Se falhar, apenas ajustar zoom uma vez para mostrar ambos os marcadores
                    if (!window.mapBoundsSet) {
                        const bounds = L.latLngBounds([[motoboyLat, motoboyLng], [destinoLat, destinoLng]]);
                        map.fitBounds(bounds, { padding: [50, 50] });
                        window.mapBoundsSet = true;
                    }
                });
            
            // Função para calcular distância entre dois pontos (Haversine simplificado para distâncias curtas)
            function getDistance(lat1, lng1, lat2, lng2) {
                const R = 6371000; // Raio da Terra em metros
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLng = (lng2 - lng1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c; // Distância em metros
            }
            
            // Função para projetar ponto em um segmento de linha (projeção perpendicular)
            function projectPointOnSegment(pointLat, pointLng, segStartLat, segStartLng, segEndLat, segEndLng) {
                const dx = segEndLng - segStartLng;
                const dy = segEndLat - segStartLat;
                const lengthSq = dx * dx + dy * dy;
                
                if (lengthSq === 0) {
                    return [segStartLat, segStartLng]; // Segmento é um ponto
                }
                
                // Projeção do ponto no segmento
                const t = Math.max(0, Math.min(1, 
                    ((pointLng - segStartLng) * dx + (pointLat - segStartLat) * dy) / lengthSq
                ));
                
                // Ponto projetado no segmento
                return [
                    segStartLat + t * dy,
                    segStartLng + t * dx
                ];
            }
            
            // Função para atualizar posição do motoboy na rota (projeta na rota mais próxima)
            function updateMotoboyPositionOnRoute(currentLat, currentLng) {
                // Validar coordenadas de entrada
                if (isNaN(currentLat) || isNaN(currentLng) || 
                    currentLat < -90 || currentLat > 90 || 
                    currentLng < -180 || currentLng > 180) {
                    console.error('Coordenadas inválidas para atualização:', currentLat, currentLng);
                    return;
                }
                
                if (!motoboyMarker) {
                    console.error('Marcador do motoboy não existe!');
                    return;
                }
                
                // Se não tiver rota, apenas mover para a posição atual (validada)
                if (!window.routeCoordinates || !window.routeCoordinates.length) {
                    console.log('Rota não disponível ainda, movendo diretamente para posição GPS');
                    motoboyMarker.setLatLng([currentLat, currentLng]);
                    // Garantir que o marcador esteja visível
                    if (!map.getBounds().contains(motoboyMarker.getLatLng())) {
                        map.setView([currentLat, currentLng], map.getZoom());
                    }
                    return;
                }
                
                // Encontrar o segmento da rota mais próximo e projetar o ponto nele
                let closestPoint = window.routeCoordinates[0];
                let minDistance = Infinity;
                let closestSegmentIndex = 0;
                
                // Verificar cada segmento da rota
                for (let i = 0; i < window.routeCoordinates.length - 1; i++) {
                    const segStart = window.routeCoordinates[i];
                    const segEnd = window.routeCoordinates[i + 1];
                    
                    // Validar coordenadas do segmento
                    if (!segStart || !segEnd || 
                        isNaN(segStart[0]) || isNaN(segStart[1]) ||
                        isNaN(segEnd[0]) || isNaN(segEnd[1])) {
                        continue;
                    }
                    
                    // Projetar ponto atual no segmento
                    const projectedPoint = projectPointOnSegment(
                        currentLat, currentLng,
                        segStart[0], segStart[1],
                        segEnd[0], segEnd[1]
                    );
                    
                    // Validar ponto projetado
                    if (!projectedPoint || 
                        isNaN(projectedPoint[0]) || isNaN(projectedPoint[1]) ||
                        projectedPoint[0] < -90 || projectedPoint[0] > 90 ||
                        projectedPoint[1] < -180 || projectedPoint[1] > 180) {
                        continue;
                    }
                    
                    // Calcular distância até o ponto projetado
                    const distance = getDistance(currentLat, currentLng, projectedPoint[0], projectedPoint[1]);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPoint = projectedPoint;
                        closestSegmentIndex = i;
                    }
                }
                
                // Validar ponto mais próximo antes de usar
                if (!closestPoint || 
                    isNaN(closestPoint[0]) || isNaN(closestPoint[1]) ||
                    closestPoint[0] < -90 || closestPoint[0] > 90 ||
                    closestPoint[1] < -180 || closestPoint[1] > 180) {
                    console.error('Ponto projetado inválido! Usando posição GPS original');
                    closestPoint = [currentLat, currentLng];
                }
                
                // Atualizar progresso na rota (baseado no segmento encontrado)
                window.routeProgress = closestSegmentIndex / (window.routeCoordinates.length - 1);
                
                // Mover marcador para o ponto projetado na rota (estilo Uber/99/iFood)
                console.log('Movendo marcador para:', closestPoint[0], closestPoint[1]);
                
                // Usar setLatLng do Leaflet (método confiável)
                motoboyMarker.setLatLng(closestPoint);
                
                // Centralizar mapa no motoboy (estilo Uber/99/iFood - sempre foca no entregador)
                map.setView(closestPoint, map.getZoom(), {
                    animate: true,
                    duration: 0.5
                });
                
                // Garantir que o ícone continue visível
                if (motoboyMarker._icon) {
                    const iconImg = motoboyMarker._icon.querySelector('img');
                    if (iconImg) {
                        iconImg.style.display = 'block';
                        iconImg.style.visibility = 'visible';
                        iconImg.style.opacity = '1';
                        iconImg.style.zIndex = '1000';
                    }
                    motoboyMarker._icon.style.zIndex = '1000';
                }
                
                console.log('Motoboy projetado na rota. Segmento:', closestSegmentIndex, 'de', window.routeCoordinates.length - 2, 'Distância:', minDistance.toFixed(2), 'm');
            }
            
            // Expor função globalmente para uso via postMessage
            window.updateMotoboyPositionOnRoute = updateMotoboyPositionOnRoute;
            
            // Verificar se o marcador está realmente visível após um pequeno delay
            setTimeout(() => {
                console.log('=== VERIFICAÇÃO APÓS DELAY ===');
                console.log('Mapa criado:', map);
                console.log('Marcador motoboy:', motoboyMarker);
                console.log('Marcador está no mapa?', map.hasLayer(motoboyMarker));
                console.log('Elemento HTML do marcador:', motoboyMarker._icon);
                if (motoboyMarker._icon) {
                    const style = window.getComputedStyle(motoboyMarker._icon);
                    console.log('Estilo computado - display:', style.display);
                    console.log('Estilo computado - visibility:', style.visibility);
                    console.log('Estilo computado - opacity:', style.opacity);
                    console.log('Estilo computado - z-index:', style.zIndex);
                    console.log('Elemento visível?', motoboyMarker._icon.offsetParent !== null);
                    console.log('Posição do elemento:', {
                        top: motoboyMarker._icon.offsetTop,
                        left: motoboyMarker._icon.offsetLeft,
                        width: motoboyMarker._icon.offsetWidth,
                        height: motoboyMarker._icon.offsetHeight
                    });
                }
            }, 1500);
        });
        
        // Atualizar posição do motoboy quando coordenadas mudarem (será chamado via postMessage)
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'updateMotoboyPosition') {
                const { lat, lng } = event.data;
                console.log('=== ATUALIZAÇÃO DE POSIÇÃO DO MOTOBOY ===');
                console.log('Nova posição GPS:', lat, lng);
                
                if (window.motoboyMarkerRef) {
                    // SEMPRE usar a função de projeção na rota se estiver disponível
                    if (window.updateMotoboyPositionOnRoute && window.routeCoordinates && window.routeCoordinates.length > 0) {
                        console.log('Projetando motoboy na rota usando novas coordenadas GPS');
                        window.updateMotoboyPositionOnRoute(lat, lng);
                        console.log('Motoboy projetado na rota com sucesso');
                    } else {
                        console.warn('Rota ainda não foi traçada ou função não disponível. Movendo diretamente.');
                        // Se a rota ainda não foi traçada, mover diretamente
                        window.motoboyMarkerRef.setLatLng([lat, lng]);
                    }
                    
                    // Garantir que o ícone continue visível após atualização
                    if (window.motoboyMarkerRef._icon) {
                        window.motoboyMarkerRef._icon.style.display = 'flex';
                        window.motoboyMarkerRef._icon.style.visibility = 'visible';
                        window.motoboyMarkerRef._icon.style.opacity = '1';
                        // Forçar renderização do emoji
                        const innerDiv = window.motoboyMarkerRef._icon.querySelector('.motoboy-icon-inner');
                        if (innerDiv) {
                            innerDiv.style.display = 'flex';
                            innerDiv.style.alignItems = 'center';
                            innerDiv.style.justifyContent = 'center';
                            innerDiv.style.fontSize = '24px';
                            innerDiv.textContent = '🛵';
                        }
                    }
                } else {
                    console.error('window.motoboyMarkerRef não existe!');
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
                console.log('=== ATUALIZANDO POSIÇÃO DO MOTOBOY (REACT) ===');
                console.log('Coordenadas do rastreamento:', lat, lng);
                
                // Aguardar iframe carregar e rota ser traçada antes de enviar mensagem
                setTimeout(() => {
                    const iframe = document.getElementById('mapa-iframe');
                    if (iframe && iframe.contentWindow) {
                        console.log('Enviando atualização via postMessage para o iframe');
                        // Atualizar posição do motoboy no mapa via postMessage
                        // A função updateMotoboyPositionOnRoute dentro do iframe vai projetar na rota
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
                    } else {
                        console.warn('Iframe ainda não está pronto');
                    }
                }, 1000); // Aguardar iframe carregar e rota ser traçada (aumentado para 1s)
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

            </div>
        </div>
    );
};

export default RastreamentoPublicoPage;

