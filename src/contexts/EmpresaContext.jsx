// frontend/src/contexts/EmpresaContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

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
  const [isReady, setIsReady] = useState(false);

  const loadEmpresa = useCallback(async (empresaSlug) => {
    console.log("EmpresaContext: loadEmpresa: Tentando carregar com slug:", empresaSlug);
    setLoading(true);
    setIsReady(false);

    if (!empresaSlug) {
      setEmpresa(null);
      setLoading(false);
      setIsReady(true);
      console.log("EmpresaContext: loadEmpresa: Slug nulo ou vazio.");
      return;
    }

    try {
      const response = await api.get(`/${empresaSlug}/config`);
      const empresaData = response.data;

      if (empresaData.logo_url) {
        const backendBaseUrl = api.defaults.baseURL.replace('/api/v1', '');
        empresaData.logo_full_url = `${backendBaseUrl}${empresaData.logo_url}`;
      } else {
        empresaData.logo_full_url = null;
      }

      setEmpresa(empresaData);
      // LOG MELHORADO:
      console.log("EmpresaContext: loadEmpresa: Dados da Empresa Carregados:", empresaData, "Slug no Objeto:", empresaData.slug);

    } catch (error) {
      console.error('EmpresaContext: loadEmpresa: Erro ao carregar empresa:', error.response?.data?.message || error.message);
      setEmpresa(null);
    } finally {
      setLoading(false);
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const segments = path.split('/').filter(Boolean);

      let slug = null;
      if (segments.length > 0) {
        if (segments[0] === 'gerencial' && segments.length > 1) {
          slug = segments[1];
        } else if (segments[0] !== 'gerencial' && segments[0] !== 'admin') {
          slug = segments[0];
        }
      }
      console.log("EmpresaContext: handleLocationChange: Slug extraído da URL:", slug);
      loadEmpresa(slug);
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [loadEmpresa]);

  const value = {
    empresa,
    loading,
    isReady,
    loadEmpresa
  };

  return (
    <EmpresaContext.Provider value={value}>
      {children}
    </EmpresaContext.Provider>
  );
};