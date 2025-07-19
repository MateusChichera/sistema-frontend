import React, { useEffect, useState } from 'react';
import { Loader2, MapPin, Clock, Store, Phone, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// Função utilitária para verificar se a empresa está aberta
function isEmpresaAberta(horario_funcionamento) {
  if (!horario_funcionamento) return false;
  // Aceita formatos: 'Seg a Dom: 18h às 23h', 'Seg-Dom: 01h-24h', etc
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const agora = new Date();
  const diaHoje = diasSemana[agora.getDay()];
  const horaAgora = agora.getHours() + agora.getMinutes() / 60;
  // Normaliza separadores
  let horario = horario_funcionamento.replace(/\s*a\s*|\s*-\s*/g, '-').replace(/às|as|:/gi, '-');
  // Ex: 'Seg-Dom-01h-24h'
  const partes = horario.split('-');
  // Busca dias
  let idxIni = -1, idxFim = -1;
  if (partes.length >= 4) {
    idxIni = diasSemana.findIndex(d => d.toLowerCase().startsWith(partes[0].toLowerCase().slice(0,3)));
    idxFim = diasSemana.findIndex(d => d.toLowerCase().startsWith(partes[1].toLowerCase().slice(0,3)));
    // Busca horários
    const hIni = parseInt(partes[2], 10);
    const hFim = parseInt(partes[3], 10);
    const idxHoje = diasSemana.findIndex(d => d === diaHoje);
    let diaOk = false;
    if (idxIni !== -1 && idxFim !== -1 && idxHoje !== -1) {
      if (idxIni <= idxFim) {
        diaOk = idxHoje >= idxIni && idxHoje <= idxFim;
      } else {
        diaOk = idxHoje >= idxIni || idxHoje <= idxFim;
      }
    }
    if (!diaOk) return false;
    if (horaAgora >= hIni && horaAgora < (hFim === 0 ? 24 : hFim)) {
      return true;
    }
    return false;
  }
  // Fallback: tenta regex antigo
  const regex = /(\d{1,2})h.*?(\d{1,2})h/gi;
  let match;
  let encontrouDia = false;
  if (/todos os dias/i.test(horario_funcionamento) || horario_funcionamento.toLowerCase().includes(diaHoje.toLowerCase())) {
    encontrouDia = true;
  } else {
    const matchDias = horario_funcionamento.match(/([A-Za-zçÇãÃéÉêÊíÍóÓôÔõÕúÚàÀ\s\-]+):/);
    if (matchDias && matchDias[1]) {
      const dias = matchDias[1].split(/a|-/).map(s => s.trim());
      if (dias.length === 2) {
        const idxIni2 = diasSemana.findIndex(d => d === dias[0].slice(0,3));
        const idxFim2 = diasSemana.findIndex(d => d === dias[1].slice(0,3));
        const idxHoje2 = diasSemana.findIndex(d => d === diaHoje);
        if (idxIni2 !== -1 && idxFim2 !== -1 && idxHoje2 !== -1) {
          if (idxIni2 <= idxFim2) {
            encontrouDia = idxHoje2 >= idxIni2 && idxHoje2 <= idxFim2;
          } else {
            encontrouDia = idxHoje2 >= idxIni2 || idxHoje2 <= idxFim2;
          }
        }
      }
    }
  }
  if (!encontrouDia) return false;
  while ((match = regex.exec(horario_funcionamento)) !== null) {
    const hIni = parseInt(match[1], 10);
    const hFim = parseInt(match[2], 10);
    if (horaAgora >= hIni && horaAgora < (hFim === 0 ? 24 : hFim)) {
      return true;
    }
  }
  return false;
}

const VitrineEmpresas = () => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [segmentoFiltro, setSegmentoFiltro] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [userCity, setUserCity] = useState('');
  const backendBaseUrl = api.defaults.baseURL.replace('/api/v1', '');

  // Pede localização ao abrir
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        // Tenta buscar cidade do usuário via reverse geocoding (OpenStreetMap Nominatim)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const data = await res.json();
          if (data.address && data.address.city) setUserCity(data.address.city);
        } catch {}
      });
    }
  }, []);

  // Busca empresas públicas
  useEffect(() => {
    const fetchEmpresas = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/empresas-publicas');
        setEmpresas(res.data);
      } catch (err) {
        setError('Erro ao carregar empresas.');
      } finally {
        setLoading(false);
      }
    };
    fetchEmpresas();
  }, []);

  // Função para calcular distância entre dois pontos (Haversine)
  function calcDistKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Função para obter lat/lng aproximado de uma cidade (cache simples)
  const [cityCoords, setCityCoords] = useState({});
  async function getCityCoords(city, state) {
    const key = `${city},${state}`;
    if (cityCoords[key]) return cityCoords[key];
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&country=Brasil&format=json&limit=1`);
      const data = await res.json();
      if (data[0]) {
        setCityCoords(prev => ({ ...prev, [key]: { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } }));
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch {}
    return null;
  }

  // Agrupa empresas por segmento e filtra apenas abertas
  const empresasAbertas = empresas.filter(e => isEmpresaAberta(e.horario_funcionamento));
  const segmentos = [...new Set(empresasAbertas.map(e => e.segmento))];
  const empresasFiltradas = segmentoFiltro ? empresasAbertas.filter(e => e.segmento === segmentoFiltro) : empresasAbertas;

  // Ordena empresas: primeiro da mesma cidade, depois por distância (se possível)
  const [empresasOrdenadas, setEmpresasOrdenadas] = useState([]);
  useEffect(() => {
    async function ordenar() {
      let lista = [...empresasFiltradas];
      // Se tem localização, calcula distância
      if (userLocation) {
        for (let emp of lista) {
          if (!emp._distancia && emp.cidade && emp.estado) {
            const coords = await getCityCoords(emp.cidade, emp.estado);
            if (coords) {
              emp._distancia = calcDistKm(userLocation.lat, userLocation.lng, coords.lat, coords.lng);
            } else {
              emp._distancia = null;
            }
          }
        }
        // Ordena: mesma cidade primeiro, depois por distância
        lista.sort((a, b) => {
          if (userCity && a.cidade === userCity && b.cidade !== userCity) return -1;
          if (userCity && b.cidade === userCity && a.cidade !== userCity) return 1;
          if (a._distancia != null && b._distancia != null) return a._distancia - b._distancia;
          return 0;
        });
      } else if (userCity) {
        lista.sort((a, b) => {
          if (a.cidade === userCity && b.cidade !== userCity) return -1;
          if (b.cidade === userCity && a.cidade !== userCity) return 1;
          return 0;
        });
      }
      setEmpresasOrdenadas(lista);
    }
    ordenar();
    // eslint-disable-next-line
  }, [empresasFiltradas, userLocation, userCity]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col min-h-[100vh]">
      {/* Topo fixo */}
      <header className="sticky top-0 w-full bg-white/95 backdrop-blur-sm border-b border-border z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/logoathos.png" alt="Athos" className="w-10 h-8" />
            <span className="text-xl font-bold tracking-tight text-primary">ATHOS</span>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Filtros dinâmicos de segmento */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <button
            className={`px-4 py-2 rounded-full border font-semibold text-sm transition-colors ${segmentoFiltro === '' ? 'bg-primary text-white' : 'bg-white text-primary border-primary'}`}
            onClick={() => setSegmentoFiltro('')}
          >
            Todos
          </button>
          {segmentos.map(seg => (
            <button
              key={seg}
              className={`px-4 py-2 rounded-full border font-semibold text-sm transition-colors ${segmentoFiltro === seg ? 'bg-primary text-white' : 'bg-white text-primary border-primary'}`}
              onClick={() => setSegmentoFiltro(seg)}
            >
              {seg}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin mr-2" /> Carregando empresas...
          </div>
        ) : error ? (
          <div className="text-center text-red-600 py-10">{error}</div>
        ) : empresasOrdenadas.length === 0 ? (
          <div className="text-center text-gray-500 py-10">Nenhuma empresa aberta no momento.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {empresasOrdenadas.map(empresa => (
              <div
                key={empresa.id}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-border p-5 flex flex-col items-center cursor-pointer transition-all duration-200 card-hover"
                onClick={() => window.location.href = `/${empresa.slug}`}
              >
                <img
                  src={empresa.logo_url ? backendBaseUrl + empresa.logo_url : '/logoathos.png'}
                  alt={empresa.nome_fantasia}
                  className="w-20 h-20 object-contain rounded-full border mb-4 bg-gray-50"
                />
                <h3 className="text-lg font-bold text-center mb-1">{empresa.nome_fantasia}</h3>
                <div className="text-xs text-gray-500 mb-2 text-center">{empresa.cidade} - {empresa.estado}</div>
                <div className="flex items-center gap-1 text-xs text-gray-600 mb-1"><MapPin size={14} /> {empresa.endereco}</div>
                <div className="flex items-center gap-1 text-xs text-gray-600 mb-2"><Clock size={14} /> {empresa.horario_funcionamento}</div>
                {empresa.telefone_contato && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-1"><Phone size={14} /> {empresa.telefone_contato}</div>
                )}
                {empresa.tempo_medio_preparo && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-1"><Timer size={14} /> {empresa.tempo_medio_preparo}</div>
                )}
                {empresa._distancia != null && (
                  <div className="flex items-center gap-1 text-xs text-blue-700 mb-1">{empresa._distancia.toFixed(1)} km de você</div>
                )}
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Aberto agora</span>
              </div>
            ))}
          </div>
        )}
      </main>
      {/* Rodapé clean */}
      <footer className="bg-primary/10 text-foreground py-2 mt-8">
        <div className="container mx-auto px-4">
          <div className="text-center flex flex-col items-center justify-center">
            <img src="/ATHOS.png" alt="Athos" className="w-16 h-10 mb-1" />
            <span className="text-xs text-muted-foreground">© 2025 ATHOS. Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default VitrineEmpresas; 