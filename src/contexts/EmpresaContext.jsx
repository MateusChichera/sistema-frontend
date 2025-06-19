import React, { createContext, useContext, useState, useEffect } from 'react';

const EmpresaContext = createContext();

export const useEmpresa = () => {
  const context = useContext(EmpresaContext);
  if (!context) {
    throw new Error('useEmpresa deve ser usado dentro de um EmpresaProvider');
  }
  return context;
};

export const EmpresaProvider = ({ children }) => {
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Função para detectar mudanças na URL
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const segments = path.split('/').filter(Boolean);
      
      let slug = null;
      if (segments.length > 0) {
        if (segments[0] === 'gerencial' && segments.length > 1) {
          slug = segments[1]; // Para URLs como /gerencial/demo-restaurante
        } else if (segments[0] !== 'gerencial') {
          slug = segments[0]; // Para URLs como /demo-restaurante
        }
      }
      
      if (slug) {
        loadEmpresa(slug);
      } else {
        setLoading(false);
      }
    };

    // Executar na montagem
    handleLocationChange();

    // Escutar mudanças na URL
    window.addEventListener('popstate', handleLocationChange);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const loadEmpresa = async (empresaSlug) => {
    try {
      setLoading(true);
      
      // Simulando dados da empresa
      const mockEmpresa = {
        id: 1,
        nome_fantasia: 'Restaurante Demo',
        razao_social: 'Demo Restaurante LTDA',
        cnpj: '12.345.678/0001-90',
        email_contato: 'contato@demo.com',
        telefone_contato: '(11) 99999-9999',
        logo_url: '/logo-demo.png',
        slug: empresaSlug,
        status: 'Ativo'
      };
      
      setEmpresa(mockEmpresa);
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
      setEmpresa(null);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    empresa,
    loading,
    loadEmpresa
  };

  return (
    <EmpresaContext.Provider value={value}>
      {children}
    </EmpresaContext.Provider>
  );
};

