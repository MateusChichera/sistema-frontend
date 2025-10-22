// frontend/src/components/layout/LayoutCardapio.jsx
import React, { useMemo } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { Link } from 'react-router-dom'; 

// Mapa de cores Tailwind para seus valores hexadecimais (para uso em style inline)
const tailwindColorMap = {
    'gray-500': '#6B7280',
    'red-500': '#EF4444',
    'orange-500': '#F97316',
    'yellow-500': '#F59E0B',
    'green-500': '#22C55E',
    'teal-500': '#14B8A6',
    'blue-500': '#3B82F6',
    'indigo-500': '#6366F1',
    'purple-500': '#A855F7',
    'pink-500': '#EC4899',
    'rose-500': '#F43F5E',
    'cyan-500': '#06B6D4',
    'emerald-500': '#10B981',
    'fuchsia-500': '#D946EF',
    'amber-500': '#F59E0B',
};

// Função auxiliar para obter a cor CSS a partir de uma classe Tailwind ou valor direto
const getCssColor = (tailwindClass) => {
    if (tailwindClass && (tailwindClass.startsWith('#') || !tailwindClass.includes('-'))) {
        return tailwindClass;
    }
    return tailwindColorMap[tailwindClass] || '#FF5733'; // Fallback padrão (tom de laranja/vermelho)
};

const LayoutCardapio = ({ children, userActions }) => { // Recebe userActions como prop
    const { empresa, loading } = useEmpresa();

    // Calcular status de aberto/fechado
    const status = useMemo(() => {
        if (!empresa?.horario_funcionamento) return { open: false, message: 'Horário não configurado' };
        // Copiado de isRestaurantOpen do cardápio público
        const now = new Date();
        const dayOfWeek = now.getDay();
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
        const [dayPartsStr, timePartsStr] = empresa.horario_funcionamento.split(':', 2).map(s => s.trim());
        const [openTimeStr, closeTimeStr] = timePartsStr.split('-', 2).map(s => s.trim());
        const parseTime = (timeStr) => {
            const [h, m] = timeStr.replace('h', ':').split(':').map(Number);
            return h * 60 + (m || 0);
        };
        const daysMap = {
            'Seg': 1, 'Ter': 2, 'Qua': 3, 'Qui': 4, 'Sex': 5, 'Sab': 6, 'Dom': 0,
            'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sab': 6, 'dom': 0
        };
        let isTodayIncluded = false;
        if (dayPartsStr.includes('-')) {
            const [startDayName, endDayName] = dayPartsStr.split('-').map(s => s.trim());
            const startDayIndex = daysMap[startDayName];
            const endDayIndex = daysMap[endDayName];
            if (startDayIndex !== undefined && endDayIndex !== undefined) {
                if (startDayIndex <= endDayIndex) {
                    for (let i = startDayIndex; i <= endDayIndex; i++) {
                        if (i === dayOfWeek) isTodayIncluded = true;
                    }
                } else {
                    for (let i = startDayIndex; i <= 6; i++) {
                        if (i === dayOfWeek) isTodayIncluded = true;
                    }
                    for (let i = 0; i <= endDayIndex; i++) {
                        if (i === dayOfWeek) isTodayIncluded = true;
                    }
                }
            }
        } else if (dayPartsStr.includes(',')) {
            const daysArr = dayPartsStr.split(',').map(s => s.trim());
            isTodayIncluded = daysArr.some(d => {
                const dayIdx = daysMap[d];
                return dayIdx === dayOfWeek;
            });
        } else {
            const singleDayIndex = daysMap[dayPartsStr];
            if (singleDayIndex !== undefined) {
                if (singleDayIndex === dayOfWeek) isTodayIncluded = true;
            }
        }
        if (!isTodayIncluded) {
            return { open: false, message: 'Fechado hoje' };
        }
        const openTimeMinutes = parseTime(openTimeStr);
        const closeTimeMinutes = parseTime(closeTimeStr);
        let currentlyOpen = false;
        if (closeTimeMinutes < openTimeMinutes) {
            currentlyOpen = currentTimeMinutes >= openTimeMinutes || currentTimeMinutes <= closeTimeMinutes;
        } else {
            currentlyOpen = currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes;
        }
        if (currentlyOpen) {
            return { open: true, message: `Aberto Agora` };
        } else {
            return { open: false, message: `Fechado no momento` };
        }
    }, [empresa?.horario_funcionamento]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Carregando cardápio...</div>;
    }

    if (!empresa) {
        return <div className="flex justify-center items-center h-screen text-red-500">Empresa não encontrada ou inativa.</div>;
    }

    const primaryColorCss = getCssColor(empresa.cor_primaria_cardapio);

    return (
        <div className="flex flex-col min-h-screen bg-blue-50">
            <header className="relative w-full px-4 py-3 bg-blue-50/95 backdrop-blur-md shadow-lg rounded-b-2xl border-b border-blue-200 mb-4 animate-fade-in-down">
                {/* Ações do usuário no topo direito, sem fundo extra */}
                <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
                    {userActions}
                </div>
                <div className="container mx-auto flex flex-col items-center text-center">
                    {/* Logo da ATHOS */}
                    <div className="mb-2">
                        <img 
                            src="/ATHOS.png" 
                            alt="ATHOS Software" 
                            className="h-12 w-auto object-contain animate-fade-in"
                        />
                    </div>
                    {/* Logo da Empresa */}
                    {empresa.logo_full_url ? (
                        <img 
                            src={empresa.logo_full_url} 
                            alt={empresa.nome_fantasia || 'Logo da Empresa'} 
                            className="h-20 w-20 rounded-xl object-cover mb-2 shadow-md border-2 border-white animate-fade-in"
                        />
                    ) : (
                        <h1 className="text-2xl font-extrabold mb-1 text-gray-800 animate-fade-in">{empresa.nome_fantasia || 'Cardápio Digital'}</h1>
                    )}
                    {/* Nome da empresa */}
                    <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800 tracking-tight animate-fade-in mb-1">
                        {empresa.nome_fantasia}
                    </h1>
                    {/* Status e tempo médio de preparo */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-1">
                        {empresa.tempo_medio_preparo && (
                            <span className="text-xs sm:text-sm px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">⏱️ Preparo: {empresa.tempo_medio_preparo}</span>
                        )}
                        <span className={`text-xs sm:text-sm px-2 py-1 rounded-full font-semibold border ${status.open ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{status.message}</span>
                    </div>
                    {/* Informações da Empresa */}
                    <div className="text-sm sm:text-base text-gray-600 space-y-0.5 animate-fade-in-up">
                        {empresa.razao_social && <p>{empresa.razao_social}</p>}
                        {empresa.endereco && <p>{empresa.endereco}</p>}
                        {empresa.telefone_contato && <p>Tel: {empresa.telefone_contato}</p>}
                        {empresa.horario_funcionamento && <p>Horário: {empresa.horario_funcionamento}</p>}
                    </div>
                </div>
            </header>
            <main className="flex-grow w-full px-0 sm:px-4">
                {children}
            </main>
            <footer className="text-white p-4 text-center" style={{ background: 'linear-gradient(90deg,' + primaryColorCss + ',#222 90%)' }}>
                <p className="text-base font-medium">&copy; {new Date().getFullYear()} {empresa.nome_fantasia || 'Seu Sistema'}. Todos os direitos reservados.</p>
            </footer>
        </div>
    );
};

export default LayoutCardapio;