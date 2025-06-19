// frontend/src/contexts/CarrinhoContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

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
  const [total, setTotal] = useState(0);

  // Carregar carrinho do localStorage (se houver)
  useEffect(() => {
    const storedItens = localStorage.getItem('carrinhoItens');
    if (storedItens) {
      setItens(JSON.parse(storedItens));
    }
  }, []);

  // Atualizar localStorage sempre que o carrinho mudar
  useEffect(() => {
    localStorage.setItem('carrinhoItens', JSON.stringify(itens));
    // Recalcular total
    const newTotal = itens.reduce((acc, item) => {
      return acc + (item.quantidade * (item.promocao_ativa ? parseFloat(item.promocao) : parseFloat(item.preco)));
    }, 0);
    setTotal(newTotal);
  }, [itens]);


  const adicionarItem = (produto, quantidade = 1) => {
    setItens(prevItens => {
      const itemExistente = prevItens.find(item => item.id === produto.id);
      if (itemExistente) {
        toast.info(`Quantidade de ${produto.nome} atualizada.`);
        return prevItens.map(item =>
          item.id === produto.id ? { ...item, quantidade: item.quantidade + quantidade } : item
        );
      } else {
        toast.success(`${produto.nome} adicionado ao carrinho!`);
        return [...prevItens, { ...produto, quantidade }];
      }
    });
  };

  const removerItem = (produtoId) => {
    setItens(prevItens => {
      toast.info('Item removido do carrinho.');
      return prevItens.filter(item => item.id !== produtoId);
    });
  };

  const atualizarQuantidade = (produtoId, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      return removerItem(produtoId);
    }
    setItens(prevItens =>
      prevItens.map(item =>
        item.id === produtoId ? { ...item, quantidade: novaQuantidade } : item
      )
    );
  };

  const limparCarrinho = () => {
    setItens([]);
    toast.info('Carrinho limpo.');
  };

  const value = {
    itens,
    total,
    adicionarItem,
    removerItem,
    atualizarQuantidade,
    limparCarrinho,
  };

  return (
    <CarrinhoContext.Provider value={value}>
      {children}
    </CarrinhoContext.Provider>
  );
};