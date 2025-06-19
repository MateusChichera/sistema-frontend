// frontend/src/contexts/CarrinhoContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
    // Itens no carrinho: { id_produto, nome, preco_unitario, quantidade, observacoes, foto_url }
    // A chave de identificação única agora será a combinação de id_produto e observacoes
    const [itens, setItens] = useState([]);

    // Carregar carrinho do localStorage (se houver)
    useEffect(() => {
        const storedItens = localStorage.getItem('carrinhoItens');
        if (storedItens) {
            setItens(JSON.parse(storedItens));
        }
    }, []);

    // Recalcular total e atualizar localStorage sempre que o carrinho mudar
    // Usamos useMemo para o total para evitar recálculos desnecessários
    const total = useMemo(() => {
        return itens.reduce((acc, item) => {
            // Garante que preco_unitario é um número válido antes de somar
            const preco = parseFloat(item.preco_unitario || 0); 
            return acc + (item.quantidade * preco);
        }, 0);
    }, [itens]);

    useEffect(() => {
        localStorage.setItem('carrinhoItens', JSON.stringify(itens));
        // O total é agora calculado com useMemo, então não precisa de setTotal aqui
    }, [itens]);


    // Adicionar um novo item ou atualizar a quantidade de um item existente
    // Agora aceita 'produto.observacoes' para diferenciar itens do mesmo produto
    const adicionarItem = useCallback((produto, quantidade = 1) => {
        setItens(prevItens => {
            // Calcula o preço final do produto no momento da adição
            const precoFinal = produto.promo_ativa && produto.promocao ? parseFloat(produto.promocao) : parseFloat(produto.preco);

            // Tenta encontrar um item existente com o MESMO ID e a MESMA OBSERVAÇÃO
            const itemIndex = prevItens.findIndex(
                item => item.id_produto === produto.id && item.observacoes === (produto.observacoes || '')
            );

            if (itemIndex > -1) {
                // Se o item (com a mesma observação) já existe, atualiza a quantidade
                const newItens = [...prevItens];
                newItens[itemIndex] = {
                    ...newItens[itemIndex],
                    quantidade: newItens[itemIndex].quantidade + quantidade,
                };
                toast.info(`Quantidade de ${produto.nome} atualizada.`);
                return newItens;
            } else {
                // Adiciona um novo item ao carrinho
                toast.success(`${produto.nome} adicionado ao carrinho!`);
                return [
                    ...prevItens,
                    {
                        id_produto: produto.id, // Armazena o ID do produto original
                        nome: produto.nome,
                        preco_unitario: precoFinal, // Armazena o preço final já calculado
                        quantidade: quantidade,
                        observacoes: produto.observacoes || '', // Garante que observacoes exista
                        foto_url: produto.foto_url // Para exibir no carrinho se necessário
                    }
                ];
            }
        });
    }, []);

    // Remover um item do carrinho, considerando o ID do produto e a observação
    const removerItem = useCallback((id_produto, observacoes = '') => {
        setItens(prevItens => {
            const itemToRemove = prevItens.find(item => item.id_produto === id_produto && item.observacoes === observacoes);
            if (itemToRemove) {
                toast.info(`"${itemToRemove.nome}" removido do carrinho.`);
                return prevItens.filter(item => !(item.id_produto === id_produto && item.observacoes === observacoes));
            }
            return prevItens; // Retorna o estado anterior se o item não for encontrado
        });
    }, []);

    // Atualizar a quantidade de um item no carrinho
    // Agora aceita 'id_produto' e 'observacoes' para identificar o item
    const atualizarQuantidadeItem = useCallback((id_produto, novaQuantidade, observacoes = '') => {
        setItens(prevItens => {
            if (novaQuantidade <= 0) {
                // Se a nova quantidade for 0 ou menos, remove o item
                return prevItens.filter(item => !(item.id_produto === id_produto && item.observacoes === observacoes));
            }
            // Atualiza a quantidade do item específico
            return prevItens.map(item =>
                (item.id_produto === id_produto && item.observacoes === observacoes)
                    ? { ...item, quantidade: novaQuantidade }
                    : item
            );
        });
    }, []);

    // Adicionar/atualizar observação de um item no carrinho
    // Importante: isso pode "mover" o item se a nova observação já existir com o mesmo produto
    const adicionarObservacaoItem = useCallback((id_produto, novaObservacao, oldObservacao = '') => {
        setItens(prevItens => {
            // 1. Encontrar o item original que será modificado
            const originalItemIndex = prevItens.findIndex(item => item.id_produto === id_produto && item.observacoes === oldObservacao);

            if (originalItemIndex === -1) {
                toast.error('Item não encontrado para atualizar observação.');
                return prevItens;
            }

            const originalItem = prevItens[originalItemIndex];

            // Se a observação não mudou, não faz nada
            if (originalItem.observacoes === novaObservacao) {
                return prevItens;
            }

            // 2. Verificar se já existe um item com o mesmo produto e a NOVA observação
            const existingWithNewObsIndex = prevItens.findIndex(item => item.id_produto === id_produto && item.observacoes === novaObservacao);

            let newItens = [...prevItens];

            if (existingWithNewObsIndex > -1) {
                // Se já existe um item com a nova observação, agrupamos:
                // Remove o item original
                newItens.splice(originalItemIndex, 1);
                // Atualiza a quantidade do item existente com a nova observação
                newItens[existingWithNewObsIndex > originalItemIndex ? existingWithNewObsIndex -1 : existingWithNewObsIndex] = { // Ajuste de índice se o original foi removido antes
                    ...newItens[existingWithNewObsIndex > originalItemIndex ? existingWithNewObsIndex -1 : existingWithNewObsIndex],
                    quantidade: newItens[existingWithNewObsIndex > originalItemIndex ? existingWithNewObsIndex -1 : existingWithNewObsIndex].quantidade + originalItem.quantidade,
                };
                toast.success('Observação atualizada e itens agrupados!');
            } else {
                // Se não existe, apenas atualiza a observação do item original
                newItens[originalItemIndex] = {
                    ...originalItem,
                    observacoes: novaObservacao,
                };
                toast.success('Observação adicionada!');
            }
            return newItens;
        });
    }, []);


    const limparCarrinho = useCallback(() => {
        setItens([]);
        toast.info('Carrinho limpo.');
    }, []);

    const value = useMemo(() => ({
        itens,
        total,
        adicionarItem,
        removerItem,
        atualizarQuantidadeItem, // Renomeado
        adicionarObservacaoItem, // Nova função
        limparCarrinho,
    }), [itens, total, adicionarItem, removerItem, atualizarQuantidadeItem, adicionarObservacaoItem, limparCarrinho]);

    return (
        <CarrinhoContext.Provider value={value}>
            {children}
        </CarrinhoContext.Provider>
    );
};