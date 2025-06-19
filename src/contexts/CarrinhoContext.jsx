import React, { createContext, useContext, useState, useEffect } from 'react';

const CarrinhoContext = createContext();

export const useCarrinho = () => {
  const context = useContext(CarrinhoContext);
  if (!context) {
    throw new Error('useCarrinho deve ser usado dentro de um CarrinhoProvider');
  }
  return context;
};

export const CarrinhoProvider = ({ children }) => {
  const [itens, setItens] = useState([]);
  const [tipoEntrega, setTipoEntrega] = useState('Mesa');
  const [mesa, setMesa] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Carregar carrinho do localStorage
  useEffect(() => {
    const carrinhoSalvo = localStorage.getItem('carrinho');
    if (carrinhoSalvo) {
      setItens(JSON.parse(carrinhoSalvo));
    }
  }, []);

  // Salvar carrinho no localStorage
  useEffect(() => {
    localStorage.setItem('carrinho', JSON.stringify(itens));
  }, [itens]);

  const adicionarItem = (produto, quantidade = 1, observacoesItem = '') => {
    setItens(prevItens => {
      const itemExistente = prevItens.find(item => 
        item.id === produto.id && item.observacoes === observacoesItem
      );

      if (itemExistente) {
        return prevItens.map(item =>
          item.id === produto.id && item.observacoes === observacoesItem
            ? { ...item, quantidade: item.quantidade + quantidade }
            : item
        );
      } else {
        return [...prevItens, {
          id: produto.id,
          nome: produto.nome,
          preco: produto.promo_ativa ? produto.promocao : produto.preco,
          quantidade,
          observacoes: observacoesItem,
          produto
        }];
      }
    });
  };

  const removerItem = (id, observacoes = '') => {
    setItens(prevItens => 
      prevItens.filter(item => !(item.id === id && item.observacoes === observacoes))
    );
  };

  const atualizarQuantidade = (id, novaQuantidade, observacoes = '') => {
    if (novaQuantidade <= 0) {
      removerItem(id, observacoes);
      return;
    }

    setItens(prevItens =>
      prevItens.map(item =>
        item.id === id && item.observacoes === observacoes
          ? { ...item, quantidade: novaQuantidade }
          : item
      )
    );
  };

  const limparCarrinho = () => {
    setItens([]);
    setTipoEntrega('Mesa');
    setMesa('');
    setObservacoes('');
  };

  const calcularTotal = () => {
    return itens.reduce((total, item) => total + (item.preco * item.quantidade), 0);
  };

  const calcularQuantidadeTotal = () => {
    return itens.reduce((total, item) => total + item.quantidade, 0);
  };

  const value = {
    itens,
    tipoEntrega,
    mesa,
    observacoes,
    setTipoEntrega,
    setMesa,
    setObservacoes,
    adicionarItem,
    removerItem,
    atualizarQuantidade,
    limparCarrinho,
    calcularTotal,
    calcularQuantidadeTotal
  };

  return (
    <CarrinhoContext.Provider value={value}>
      {children}
    </CarrinhoContext.Provider>
  );
};

