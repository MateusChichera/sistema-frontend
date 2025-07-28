export const reportConfigs = {
  caixa: (slug) => ({
    title: 'Relatório de Caixa',
    endpoint: `/gerencial/${slug}/caixas/fechamentos-completos`,
    filters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'todos', label: 'Todos' },
          { value: 'Aberto', label: 'Aberto' },
          { value: 'Fechado', label: 'Fechado' },
        ],
      },
      { key: 'data_inicio', label: 'Data Início', type: 'date' },
      { key: 'data_fim', label: 'Data Fim', type: 'date' },
    ],
  }),
}; 