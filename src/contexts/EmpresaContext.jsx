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
   // console.log("EmpresaContext: loadEmpresa: Tentando carregar com slug:", empresaSlug);
    setLoading(true);
    setIsReady(false);

    if (!empresaSlug) {
      setEmpresa(null);
      setLoading(false);
      setIsReady(true);
     // console.log("EmpresaContext: loadEmpresa: Slug nulo ou vazio.");
      return;
    }

    try {
      console.log("EmpresaContext: Fazendo requisição para:", `/${empresaSlug}/config`);
      const response = await api.get(`/${empresaSlug}/config`);
      const empresaData = response.data;
      console.log("EmpresaContext: Resposta completa da API:", response);

      if (empresaData.logo_url) {
        const backendBaseUrl = api.defaults.baseURL.replace('/api/v1', '');
        empresaData.logo_full_url = `${backendBaseUrl}${empresaData.logo_url}`;
      } else {
        empresaData.logo_full_url = null;
      }

      // Buscar dados de endereço e avisos do dia atual
      try {
        console.log("EmpresaContext: Buscando endereço e avisos do dia atual...");
        
        // Fazer requisições com tratamento silencioso para 404 usando validateStatus
        const [enderecoResponse, avisosResponse] = await Promise.allSettled([
          api.get(`/${empresaSlug}/endereco-dia-atual`, {
            validateStatus: function (status) {
              return status < 500; // Aceita qualquer status menor que 500 (incluindo 404)
            }
          }).catch(err => {
            if (err.response?.status === 404) {
              return { data: null }; // Retorna null para 404
            }
            throw err; // Re-throw outros erros
          }),
          api.get(`/${empresaSlug}/avisos-cardapio-dia-atual`, {
            validateStatus: function (status) {
              return status < 500; // Aceita qualquer status menor que 500 (incluindo 404)
            }
          }).catch(err => {
            if (err.response?.status === 404) {
              return { data: [] }; // Retorna array vazio para 404
            }
            throw err; // Re-throw outros erros
          })
        ]);
        
        empresaData.endereco_dia_atual = enderecoResponse.status === 'fulfilled' ? enderecoResponse.value.data : null;
        empresaData.avisos_dia_atual = avisosResponse.status === 'fulfilled' ? (avisosResponse.value.data || []) : [];
        
        console.log("EmpresaContext: Endereço do dia carregado:", empresaData.endereco_dia_atual);
        console.log("EmpresaContext: Avisos do dia carregados:", empresaData.avisos_dia_atual);
      } catch (enderecoError) {
        // Tratar apenas erros não relacionados a 404
        console.warn("EmpresaContext: Erro ao carregar endereço/avisos do dia:", enderecoError.response?.data?.message || enderecoError.message);
        empresaData.endereco_dia_atual = null;
        empresaData.avisos_dia_atual = [];
      }

      setEmpresa(empresaData);
      // LOG MELHORADO:
      console.log("EmpresaContext: loadEmpresa: Dados da Empresa Carregados:", empresaData, "Slug no Objeto:", empresaData.slug);
      console.log("EmpresaContext: Endereço do dia:", empresaData.endereco_dia_atual);
      console.log("EmpresaContext: Avisos do dia:", empresaData.avisos_dia_atual);

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
      // Exceção para rota /lojas
      if (slug === 'lojas') return;
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