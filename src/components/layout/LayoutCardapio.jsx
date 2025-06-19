// frontend/src/components/layout/LayoutCardapio.jsx
import React from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';

// Mapa de cores Tailwind para seus valores hexadecimais (para uso em style inline)
// Este mapa ajuda a converter classes como 'red-500' para um código hexadecimal CSS
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
    // Se o valor já é um código hexadecimal (ex: #RRGGBB) ou um nome de cor CSS válido
    if (tailwindClass && (tailwindClass.startsWith('#') || !tailwindClass.includes('-'))) {
        return tailwindClass;
    }
    // Se é uma classe Tailwind (ex: 'red-500'), busca no mapa
    return tailwindColorMap[tailwindClass] || '#FF5733'; // Fallback padrão (tom de laranja/vermelho)
};

const LayoutCardapio = ({ children }) => {
  const { empresa, loading } = useEmpresa(); // Obtém os dados da empresa e o estado de carregamento do contexto

  // Se a empresa ainda está carregando, exibe uma mensagem de carregamento
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Carregando cardápio...</div>;
  }

  // Se a empresa não foi encontrada ou está inativa, exibe uma mensagem de erro
  if (!empresa) {
    return <div className="flex justify-center items-center h-screen text-red-500">Empresa não encontrada ou inativa.</div>;
  }

  // Obtém a cor primária do cardápio das configurações da empresa e a converte para um formato CSS
  const primaryColorCss = getCssColor(empresa.cor_primaria_cardapio);

  return (
    <div className="flex flex-col min-h-screen bg-white"> {/* O fundo principal da página é branco */}
      {/* Header do Cardápio */}
      <header className="text-white p-4 shadow-md" style={{ backgroundColor: primaryColorCss }}> {/* Aplica a cor primária aqui */}
        <div className="container mx-auto flex justify-between items-center">
          {/* Logo da Empresa */}
          {empresa.logo_full_url ? (
            <img 
              src={empresa.logo_full_url} 
              alt={empresa.nome_fantasia || 'Logo da Empresa'} 
              className="h-12 w-auto rounded-lg object-contain"
            />
          ) : (
            <h1 className="text-2xl font-bold">{empresa.nome_fantasia || 'Cardápio Digital'}</h1>
          )}
          <nav>
            {/* Links de navegação específicos do cardápio (se houver, como "Sobre", "Contato") */}
          </nav>
        </div>
      </header>
      
      {/* Conteúdo principal da página (onde os produtos e categorias são exibidos) */}
      <main className="flex-grow container mx-auto p-4">
        {children} {/* Este é o slot onde o CardapioPage.jsx será renderizado */}
      </main>
      
      {/* Footer do Cardápio */}
      <footer className="text-white p-4 text-center" style={{ backgroundColor: primaryColorCss }}> {/* Aplica a cor primária aqui */}
        <p>&copy; {new Date().getFullYear()} {empresa.nome_fantasia || 'Seu Sistema'}. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default LayoutCardapio;