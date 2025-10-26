# 🔧 Implementação Backend - Pagamento Múltiplo de Títulos

## 📋 Objetivo
Implementar funcionalidade para receber pagamento parcial de múltiplos títulos selecionados, distribuindo automaticamente o valor entre os títulos (mais antigo primeiro).

## 🎯 Funcionalidade
- Usuário seleciona múltiplos títulos
- Insere valor total a pagar
- Sistema distribui automaticamente pelos títulos (ordem de vencimento)
- Cria pagamentos individuais para cada título
- Atualiza status dos títulos conforme necessário

---

## 1. 📁 Nova Rota - Pagamento Múltiplo

### Arquivo: `routes/contas-prazo.js` (ou onde estão as rotas de contas a prazo)

```javascript
// Nova rota para pagamento múltiplo
router.post('/titulos/pagamento-multiplo', authMiddleware, async (req, res) => {
    try {
        const { 
            titulos_ids, 
            valor_total_pago, 
            forma_pagamento_id, 
            observacoes,
            cobrar_juros = false 
        } = req.body;
        
        // Validações básicas
        if (!titulos_ids || !Array.isArray(titulos_ids) || titulos_ids.length === 0) {
            return res.status(400).json({ 
                message: 'IDs dos títulos são obrigatórios' 
            });
        }
        
        if (!valor_total_pago || valor_total_pago <= 0) {
            return res.status(400).json({ 
                message: 'Valor total pago deve ser maior que zero' 
            });
        }
        
        if (!forma_pagamento_id) {
            return res.status(400).json({ 
                message: 'Forma de pagamento é obrigatória' 
            });
        }
        
        // Buscar todos os títulos pendentes
        const titulos = await Titulo.findAll({
            where: {
                id: titulos_ids,
                empresa_id: req.empresa.id,
                status: 'Pendente'
            },
            include: [
                { model: Cliente, as: 'cliente' },
                { model: Empresa, as: 'empresa' }
            ],
            order: [['data_vencimento', 'ASC']] // Ordenar por vencimento (mais antigo primeiro)
        });
        
        if (titulos.length !== titulos_ids.length) {
            return res.status(400).json({ 
                message: 'Alguns títulos não foram encontrados ou não estão pendentes' 
            });
        }
        
        // Calcular valor total dos títulos (com juros se necessário)
        let valorTotalTitulos = 0;
        const titulosComJuros = [];
        
        for (const titulo of titulos) {
            let valorRestante = parseFloat(titulo.valor_restante);
            
            // Calcular juros se solicitado e título vencido
            if (cobrar_juros && titulo.data_vencimento < new Date()) {
                const diasAtraso = Math.ceil((new Date() - new Date(titulo.data_vencimento)) / (1000 * 60 * 60 * 24));
                const taxaJuros = parseFloat(titulo.empresa.juros_contas_prazo || 0);
                const jurosCalculado = (valorRestante * (taxaJuros / 100) * diasAtraso) / 30;
                
                titulosComJuros.push({
                    ...titulo.toJSON(),
                    juros_calculado: jurosCalculado,
                    valor_com_juros: valorRestante + jurosCalculado
                });
                
                valorTotalTitulos += valorRestante + jurosCalculado;
            } else {
                titulosComJuros.push({
                    ...titulo.toJSON(),
                    juros_calculado: 0,
                    valor_com_juros: valorRestante
                });
                
                valorTotalTitulos += valorRestante;
            }
        }
        
        if (valor_total_pago > valorTotalTitulos) {
            return res.status(400).json({ 
                message: `Valor pago (R$ ${valor_total_pago.toFixed(2)}) não pode ser maior que o valor total dos títulos (R$ ${valorTotalTitulos.toFixed(2)})` 
            });
        }
        
        // Iniciar transação
        const transaction = await sequelize.transaction();
        
        try {
            // Distribuir pagamento pelos títulos
            const pagamentos = [];
            let valorRestanteParaDistribuir = valor_total_pago;
            
            for (const titulo of titulosComJuros) {
                if (valorRestanteParaDistribuir <= 0) break;
                
                const valorComJuros = parseFloat(titulo.valor_com_juros);
                const valorAPagar = Math.min(valorRestanteParaDistribuir, valorComJuros);
                
                // Criar pagamento
                const pagamento = await PagamentoTitulo.create({
                    titulo_id: titulo.id,
                    valor_pago: valorAPagar,
                    forma_pagamento_id: forma_pagamento_id,
                    observacoes: observacoes || `Pagamento múltiplo - ${titulos.length} títulos${cobrar_juros ? ' (com juros)' : ''}`,
                    data_pagamento: new Date(),
                    empresa_id: req.empresa.id,
                    cobrar_juros: cobrar_juros,
                    juros_calculado: titulo.juros_calculado
                }, { transaction });
                
                pagamentos.push(pagamento);
                valorRestanteParaDistribuir -= valorAPagar;
            }
            
            // Buscar títulos atualizados para retornar
            const titulosAtualizados = await Titulo.findAll({
                where: { id: titulos_ids },
                include: [
                    { model: Cliente, as: 'cliente' },
                    { model: PagamentoTitulo, as: 'pagamentos' }
                ]
            }, { transaction });
            
            // Commit da transação
            await transaction.commit();
            
            res.json({
                message: `Pagamento distribuído em ${pagamentos.length} título(s)`,
                pagamentos_criados: pagamentos.length,
                valor_total_distribuido: valor_total_pago,
                titulos_atualizados: titulosAtualizados,
                resumo_distribuicao: pagamentos.map(p => ({
                    titulo_id: p.titulo_id,
                    valor_pago: p.valor_pago,
                    juros_incluido: p.juros_calculado || 0
                }))
            });
            
        } catch (error) {
            // Rollback em caso de erro
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Erro no pagamento múltiplo:', error);
        res.status(500).json({ 
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
```

---

## 2. 🔄 Ajustar Rota Existente - Pagamento Individual

### Arquivo: `routes/contas-prazo.js`

**Adicionar suporte a juros na rota existente de pagamento individual:**

```javascript
// Rota existente: POST /titulos/:id/pagamento
router.post('/titulos/:id/pagamento', authMiddleware, async (req, res) => {
    try {
        const { 
            valor_pago, 
            forma_pagamento_id, 
            observacoes, 
            tipo_pagamento = 'parcial',
            cobrar_juros = false 
        } = req.body;
        
        // ... código existente ...
        
        // Adicionar cálculo de juros se necessário
        let valorComJuros = parseFloat(valor_pago);
        let jurosCalculado = 0;
        
        if (cobrar_juros && titulo.data_vencimento < new Date()) {
            const diasAtraso = Math.ceil((new Date() - new Date(titulo.data_vencimento)) / (1000 * 60 * 60 * 24));
            const taxaJuros = parseFloat(titulo.empresa.juros_contas_prazo || 0);
            jurosCalculado = (parseFloat(titulo.valor_restante) * (taxaJuros / 100) * diasAtraso) / 30;
            valorComJuros = parseFloat(titulo.valor_restante) + jurosCalculado;
        }
        
        // Criar pagamento com juros
        const pagamento = await PagamentoTitulo.create({
            titulo_id: titulo.id,
            valor_pago: valorComJuros,
            forma_pagamento_id: forma_pagamento_id,
            observacoes: observacoes || `Pagamento ${tipo_pagamento}${cobrar_juros ? ' (com juros)' : ''}`,
            data_pagamento: new Date(),
            empresa_id: req.empresa.id,
            cobrar_juros: cobrar_juros,
            juros_calculado: jurosCalculado
        });
        
        // ... resto do código existente ...
        
    } catch (error) {
        console.error('Erro no pagamento individual:', error);
        res.status(500).json({ 
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
```

---

## 3. 📊 Ajustar Modelo PagamentoTitulo

### Arquivo: `models/PagamentoTitulo.js` (se necessário)

**Adicionar campos para juros:**

```javascript
// Adicionar campos se não existirem
cobrar_juros: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
},
juros_calculado: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
}
```

---

## 4. 🔍 Ajustar Consultas de Títulos

### Arquivo: `controllers/contas-prazo.js` (ou onde estão os controllers)

**Ajustar consulta para incluir juros calculados:**

```javascript
// Função para buscar títulos com juros calculados
const calcularJurosTitulos = async (titulos, empresa) => {
    const taxaJuros = parseFloat(empresa.juros_contas_prazo || 0);
    
    return titulos.map(titulo => {
        const tituloData = titulo.toJSON();
        
        if (titulo.data_vencimento < new Date() && titulo.status === 'Pendente') {
            const diasAtraso = Math.ceil((new Date() - new Date(titulo.data_vencimento)) / (1000 * 60 * 60 * 24));
            const jurosCalculado = (parseFloat(titulo.valor_restante) * (taxaJuros / 100) * diasAtraso) / 30;
            
            tituloData.juros_calculado = jurosCalculado;
            tituloData.valor_com_juros = parseFloat(titulo.valor_restante) + jurosCalculado;
        } else {
            tituloData.juros_calculado = 0;
            tituloData.valor_com_juros = parseFloat(titulo.valor_restante);
        }
        
        return tituloData;
    });
};

// Usar em todas as consultas de títulos
const titulosComJuros = await calcularJurosTitulos(titulos, empresa);
```

---

## 5. 📝 Validações Adicionais

### Arquivo: `middleware/validations.js` (se existir)

```javascript
// Validação para pagamento múltiplo
const validatePagamentoMultiplo = (req, res, next) => {
    const { titulos_ids, valor_total_pago, forma_pagamento_id } = req.body;
    
    if (!titulos_ids || !Array.isArray(titulos_ids)) {
        return res.status(400).json({ 
            message: 'titulos_ids deve ser um array' 
        });
    }
    
    if (titulos_ids.length === 0) {
        return res.status(400).json({ 
            message: 'Pelo menos um título deve ser selecionado' 
        });
    }
    
    if (titulos_ids.length > 10) {
        return res.status(400).json({ 
            message: 'Máximo de 10 títulos por pagamento múltiplo' 
        });
    }
    
    if (!valor_total_pago || isNaN(valor_total_pago) || valor_total_pago <= 0) {
        return res.status(400).json({ 
            message: 'Valor total pago deve ser um número maior que zero' 
        });
    }
    
    if (!forma_pagamento_id || isNaN(forma_pagamento_id)) {
        return res.status(400).json({ 
            message: 'Forma de pagamento é obrigatória' 
        });
    }
    
    next();
};
```

---

## 6. 🧪 Testes da API

### Endpoint: `POST /api/v1/gerencial/:slug/contas-prazo/titulos/pagamento-multiplo`

**Body de exemplo:**
```json
{
    "titulos_ids": [1, 2, 3],
    "valor_total_pago": 150.00,
    "forma_pagamento_id": 1,
    "observacoes": "Pagamento múltiplo de 3 títulos",
    "cobrar_juros": true
}
```

**Resposta esperada:**
```json
{
    "message": "Pagamento distribuído em 3 título(s)",
    "pagamentos_criados": 3,
    "valor_total_distribuido": 150.00,
    "titulos_atualizados": [...],
    "resumo_distribuicao": [
        {
            "titulo_id": 1,
            "valor_pago": 50.00,
            "juros_incluido": 5.00
        },
        {
            "titulo_id": 2,
            "valor_pago": 50.00,
            "juros_incluido": 0.00
        },
        {
            "titulo_id": 3,
            "valor_pago": 50.00,
            "juros_incluido": 0.00
        }
    ]
}
```

---

## 7. 📋 Checklist de Implementação

- [ ] Criar nova rota `/titulos/pagamento-multiplo`
- [ ] Implementar lógica de distribuição automática
- [ ] Adicionar suporte a juros
- [ ] Implementar transações para consistência
- [ ] Adicionar validações
- [ ] Testar com múltiplos cenários
- [ ] Ajustar consultas existentes para incluir juros
- [ ] Documentar a nova funcionalidade

---

## 8. 🚨 Pontos de Atenção

1. **Transações**: Usar transações para garantir consistência
2. **Ordenação**: Sempre ordenar por data de vencimento (mais antigo primeiro)
3. **Juros**: Calcular juros apenas para títulos vencidos
4. **Validações**: Validar limites e valores
5. **Logs**: Adicionar logs para debug
6. **Performance**: Considerar índices para consultas de títulos

---

**Após implementar, me envie o MD de volta e eu ajusto o frontend!** 🚀
