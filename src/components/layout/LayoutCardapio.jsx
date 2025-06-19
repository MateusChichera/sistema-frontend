// frontend/src/components/layout/LayoutCardapio.jsx
import React from 'react';
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

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Carregando cardápio...</div>;
    }

    if (!empresa) {
        return <div className="flex justify-center items-center h-screen text-red-500">Empresa não encontrada ou inativa.</div>;
    }

    const primaryColorCss = getCssColor(empresa.cor_primaria_cardapio);

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <header className="text-white p-4 shadow-md relative" style={{ backgroundColor: primaryColorCss }}>
                <div className="container mx-auto flex flex-col items-center text-center">
                    {/* Logo da Empresa */}
                    {empresa.logo_full_url ? (
                        <img 
                            src={empresa.logo_full_url} 
                            alt={empresa.nome_fantasia || 'Logo da Empresa'} 
                            className="h-20 w-auto rounded-lg object-contain mb-3"
                        />
                    ) : (
                        <h1 className="text-4xl font-bold mb-2">{empresa.nome_fantasia || 'Cardápio Digital'}</h1>
                    )}
                    
                    {/* Informações da Empresa */}
                    <div className="text-sm space-y-1">
                        {empresa.razao_social && <p>{empresa.razao_social}</p>}
                        {empresa.endereco && <p>{empresa.endereco}</p>}
                        {empresa.telefone_contato && <p>Tel: {empresa.telefone_contato}</p>}
                        {empresa.horario_funcionamento && <p>Horário: {empresa.horario_funcionamento}</p>}
                        {empresa.email_contato && <p>Email: {empresa.email_contato}</p>}
                    </div>
                </div>
                {/* Slot para ações do usuário (Login/Logout), posicionado absolutamente */}
                <div className="absolute top-4 right-4 z-20">
                    {userActions} {/* Renderiza os botões passados pela prop */}
                </div>
            </header>
            
            <main className="flex-grow container mx-auto p-4">
                {children}
            </main>
            
            <footer className="text-white p-4 text-center" style={{ backgroundColor: primaryColorCss }}>
                <p>&copy; {new Date().getFullYear()} {empresa.nome_fantasia || 'Seu Sistema'}. Todos os direitos reservados.</p>
            </footer>
        </div>
    );
};

export default LayoutCardapio;