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
    const [itens, setItens] = useState([]);

    // Carregar carrinho do localStorage (se houver)
    useEffect(() => {
        const storedItens = localStorage.getItem('carrinhoItens');
        if (storedItens) {
            setItens(JSON.parse(storedItens));
        }
    }, []);

    // Recalcular total e atualizar localStorage sempre que o carrinho mudar
    const total = useMemo(() => {
        return itens.reduce((acc, item) => {
            // Garante que preco_unitario é um número válido antes de somar
            const preco = parseFloat(item.preco_unitario || 0);
            return acc + (item.quantidade * preco);
        }, 0);
    }, [itens]);

    useEffect(() => {
        localStorage.setItem('carrinhoItens', JSON.stringify(itens));
    }, [itens]);


    // Adicionar um novo item ou atualizar a quantidade de um item existente
    // Agora aceita 'produto.observacoes' e 'produto.adicionais' para diferenciar itens do mesmo produto
    const adicionarItem = useCallback((produto, quantidade = 1) => {
        setItens(prevItens => {
            // Calcula o preço final do produto no momento da adição, incluindo promoção
            const precoAplicado = produto.promo_ativa && produto.promocao !== null && produto.promocao !== undefined
                ? parseFloat(produto.promocao)
                : parseFloat(produto.preco);

            // Calcula o preço total dos adicionais
            const precoAdicionais = produto.adicionais ? produto.adicionais.reduce((total, adicional) => {
                return total + (parseFloat(adicional.preco) * adicional.quantidade);
            }, 0) : 0;

            // Tenta encontrar um item existente com o MESMO ID, MESMA OBSERVAÇÃO e MESMOS ADICIONAIS
            const itemIndex = prevItens.findIndex(
                item => {
                    const mesmaObservacao = item.observacoes === (produto.observacoes || '');
                    const mesmosAdicionais = JSON.stringify(item.adicionais || []) === JSON.stringify(produto.adicionais || []);
                    return item.id_produto === produto.id && mesmaObservacao && mesmosAdicionais;
                }
            );

            if (itemIndex > -1) {
                // Se o item (com a mesma observação e adicionais) já existe, atualiza a quantidade
                const newItens = [...prevItens];
                newItens[itemIndex] = {
                    ...newItens[itemIndex],
                    quantidade: newItens[itemIndex].quantidade + quantidade,
                };
                return newItens;
            } else {
                // Adiciona um novo item ao carrinho
                return [
                    ...prevItens,
                    {
                        id_produto: produto.id, // Armazena o ID do produto original
                        nome: produto.nome,
                        preco_unitario: precoAplicado + precoAdicionais, // Armazena o preço final já calculado + adicionais
                        quantidade: quantidade,
                        observacoes: produto.observacoes || '', // Garante que observacoes exista
                        foto_url: produto.foto_url, // Para exibir no carrinho se necessário
                        adicionais: produto.adicionais || [] // Armazena os adicionais selecionados
                    }
                ];
            }
        });
    }, []);

    // Remover um item do carrinho
    // Se `quantidadeToRemove` for especificado, remove apenas essa quantidade.
    // Se não for especificado ou for `true` (para remover tudo), remove o item completamente.
    const removerItem = useCallback((id_produto, quantidadeToRemove, observacoes = '', adicionais = []) => {
        setItens(prevItens => {
            if (quantidadeToRemove === true) { // Remover item completamente (comportamento para remover X do carrinho)
                const itemToRemove = prevItens.find(item => {
                    const mesmaObservacao = item.observacoes === observacoes;
                    const mesmosAdicionais = JSON.stringify(item.adicionais || []) === JSON.stringify(adicionais);
                    return item.id_produto === id_produto && mesmaObservacao && mesmosAdicionais;
                });
                if (itemToRemove) {
                    toast.info(`"${itemToRemove.nome}" removido do carrinho.`);
                    return prevItens.filter(item => {
                        const mesmaObservacao = item.observacoes === observacoes;
                        const mesmosAdicionais = JSON.stringify(item.adicionais || []) === JSON.stringify(adicionais);
                        return !(item.id_produto === id_produto && mesmaObservacao && mesmosAdicionais);
                    });
                }
                return prevItens;
            } else { // Remover uma quantidade específica (comportamento para botões +/-)
                const itemIndex = prevItens.findIndex(item => {
                    const mesmaObservacao = item.observacoes === observacoes;
                    const mesmosAdicionais = JSON.stringify(item.adicionais || []) === JSON.stringify(adicionais);
                    return item.id_produto === id_produto && mesmaObservacao && mesmosAdicionais;
                });
                if (itemIndex > -1) {
                    const newItens = [...prevItens];
                    const currentQuantity = newItens[itemIndex].quantidade;
                    if (currentQuantity - quantidadeToRemove <= 0) {
                        toast.info(`"${newItens[itemIndex].nome}" removido do carrinho.`);
                        return prevItens.filter((_, idx) => idx !== itemIndex); // Remove completamente se a quantidade <= 0
                    } else {
                        newItens[itemIndex] = {
                            ...newItens[itemIndex],
                            quantidade: currentQuantity - quantidadeToRemove,
                        };
                        return newItens;
                    }
                }
                return prevItens;
            }
        });
    }, []);

    // Atualizar a quantidade de um item no carrinho
    const atualizarQuantidadeItem = useCallback((id_produto, novaQuantidade, observacoes = '', adicionais = []) => {
        setItens(prevItens => {
            if (novaQuantidade <= 0) {
                return prevItens.filter(item => {
                    const mesmaObservacao = item.observacoes === observacoes;
                    const mesmosAdicionais = JSON.stringify(item.adicionais || []) === JSON.stringify(adicionais);
                    return !(item.id_produto === id_produto && mesmaObservacao && mesmosAdicionais);
                });
            }
            return prevItens.map(item => {
                const mesmaObservacao = item.observacoes === observacoes;
                const mesmosAdicionais = JSON.stringify(item.adicionais || []) === JSON.stringify(adicionais);
                return (item.id_produto === id_produto && mesmaObservacao && mesmosAdicionais)
                    ? { ...item, quantidade: novaQuantidade }
                    : item;
            });
        });
    }, []);

    // Adicionar/atualizar observação de um item no carrinho
    const adicionarObservacaoItem = useCallback((id_produto, novaObservacao, oldObservacao = '', adicionais = []) => {
        setItens(prevItens => {
            const originalItemIndex = prevItens.findIndex(item => {
                const mesmaObservacao = item.observacoes === oldObservacao;
                const mesmosAdicionais = JSON.stringify(item.adicionais || []) === JSON.stringify(adicionais);
                return item.id_produto === id_produto && mesmaObservacao && mesmosAdicionais;
            });

            if (originalItemIndex === -1) {
                toast.error('Item não encontrado para atualizar observação.');
                return prevItens;
            }

            const originalItem = prevItens[originalItemIndex];

            if (originalItem.observacoes === novaObservacao) {
                return prevItens; // Nenhuma mudança na observação
            }

            // Se a nova observação já existe para este produto com os mesmos adicionais, agrupa. Caso contrário, apenas atualiza.
            const existingWithNewObsIndex = prevItens.findIndex(item => {
                const mesmaObservacao = item.observacoes === novaObservacao;
                const mesmosAdicionais = JSON.stringify(item.adicionais || []) === JSON.stringify(adicionais);
                return item.id_produto === id_produto && mesmaObservacao && mesmosAdicionais;
            });

            let newItens = [...prevItens];

            if (existingWithNewObsIndex > -1) {
                // Remove o item original e soma sua quantidade ao item existente com a nova observação
                const itemToMerge = newItens.splice(originalItemIndex, 1)[0];
                const targetIndex = existingWithNewObsIndex > originalItemIndex ? existingWithNewObsIndex - 1 : existingWithNewObsIndex; // Ajusta o índice se o item original foi removido antes
                newItens[targetIndex] = {
                    ...newItens[targetIndex],
                    quantidade: newItens[targetIndex].quantidade + itemToMerge.quantidade,
                };
                toast.success('Observação atualizada e itens agrupados!');
            } else {
                // Apenas atualiza a observação do item original
                newItens[originalItemIndex] = {
                    ...originalItem,
                    observacoes: novaObservacao,
                };
                toast.success('Observação adicionada/atualizada!');
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
        atualizarQuantidadeItem,
        adicionarObservacaoItem,
        limparCarrinho,
    }), [itens, total, adicionarItem, removerItem, atualizarQuantidadeItem, adicionarObservacaoItem, limparCarrinho]);

    return (
        <CarrinhoContext.Provider value={value}>
            {children}
        </CarrinhoContext.Provider>
    );
};