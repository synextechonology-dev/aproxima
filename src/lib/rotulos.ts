// Rótulos em português para os valores guardados no banco (os checks da migration).

export const ETAPAS = ['a_prospectar', 'prospectado', 'follow_up', 'negociacao', 'cliente', 'descartado'] as const;
export type Etapa = (typeof ETAPAS)[number];
export const ROTULO_ETAPA: Record<Etapa, string> = {
  a_prospectar: 'A prospectar',
  prospectado: 'Prospectado',
  follow_up: 'Follow-up',
  negociacao: 'Negociação',
  cliente: 'Cliente',
  descartado: 'Descartado',
};
/** Etapas que o app pode escolher (Cliente é automática; Descartado pede motivo). */
export const ETAPAS_MANUAIS = ['a_prospectar', 'prospectado', 'follow_up', 'negociacao'] as const;

export const SEGMENTOS = [
  'restaurante', 'bar', 'lanchonete', 'padaria', 'salao_barbearia', 'clinica_saude', 'academia',
  'oficina_auto', 'loja', 'mercado', 'hospedagem', 'pet', 'servicos', 'outro',
] as const;
export const ROTULO_SEGMENTO: Record<(typeof SEGMENTOS)[number], string> = {
  restaurante: 'Restaurante',
  bar: 'Bar',
  lanchonete: 'Lanchonete',
  padaria: 'Padaria',
  salao_barbearia: 'Salão ou barbearia',
  clinica_saude: 'Clínica ou saúde',
  academia: 'Academia',
  oficina_auto: 'Oficina ou automotivo',
  loja: 'Loja',
  mercado: 'Mercado',
  hospedagem: 'Hospedagem',
  pet: 'Pet',
  servicos: 'Serviços',
  outro: 'Outro',
};

export const MOTIVOS_DESCARTE = [
  'sem_interesse', 'preco', 'ja_tem_fornecedor', 'nao_respondeu', 'nao_usa_google', 'fechou', 'outro',
] as const;
export const ROTULO_MOTIVO_DESCARTE: Record<(typeof MOTIVOS_DESCARTE)[number], string> = {
  sem_interesse: 'Sem interesse',
  preco: 'Achou caro',
  ja_tem_fornecedor: 'Já tem fornecedor',
  nao_respondeu: 'Não respondeu',
  nao_usa_google: 'Não usa o Google',
  fechou: 'Fechou ou mudou',
  outro: 'Outro motivo',
};

export const ORIGENS = ['visita', 'indicacao', 'instagram', 'whatsapp', 'lista_importada', 'outro'] as const;
export const ROTULO_ORIGEM: Record<(typeof ORIGENS)[number], string> = {
  visita: 'Visita presencial',
  indicacao: 'Indicação',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  lista_importada: 'Lista importada',
  outro: 'Outra',
};

export const CANAIS = ['visita', 'whatsapp', 'ligacao', 'instagram', 'email', 'outro'] as const;
export type Canal = (typeof CANAIS)[number];
export const ROTULO_CANAL: Record<Canal, string> = {
  visita: 'Visita',
  whatsapp: 'WhatsApp',
  ligacao: 'Ligação',
  instagram: 'Instagram',
  email: 'E-mail',
  outro: 'Outro',
};

export const CATEGORIAS_PRODUTO = ['placa', 'otimizacao_google', 'site', 'outro'] as const;
export const ROTULO_CATEGORIA_PRODUTO: Record<(typeof CATEGORIAS_PRODUTO)[number], string> = {
  placa: 'Placa',
  otimizacao_google: 'Otimização do Google',
  site: 'Site',
  outro: 'Outro',
};

export const STATUS_PLACA = ['disponivel', 'reservada', 'vendida', 'instalada', 'demonstracao', 'defeito', 'perdida'] as const;
export type StatusPlaca = (typeof STATUS_PLACA)[number];
export const ROTULO_STATUS_PLACA: Record<StatusPlaca, string> = {
  disponivel: 'Disponível',
  reservada: 'Reservada',
  vendida: 'Aguardando instalação',
  instalada: 'Instalada',
  demonstracao: 'Em demonstração',
  defeito: 'Com defeito',
  perdida: 'Perdida',
};
/** Mudanças aceitas por ajustar_placa (mesma tabela da RPC; o banco confere de novo). */
export const AJUSTES_PLACA: Partial<Record<StatusPlaca, StatusPlaca[]>> = {
  disponivel: ['demonstracao', 'defeito', 'perdida'],
  demonstracao: ['disponivel', 'defeito', 'perdida'],
  vendida: ['instalada'],
  instalada: ['defeito', 'perdida'],
  defeito: ['disponivel', 'perdida'],
};

export const FORMAS_PAGAMENTO = ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia'] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];
export const ROTULO_FORMA: Record<string, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  boleto: 'Boleto',
  transferencia: 'Transferência',
  debito_automatico: 'Débito automático',
};

export const STATUS_VENDA = ['rascunho', 'confirmada', 'cancelada'] as const;
export const ROTULO_STATUS_VENDA: Record<string, string> = {
  rascunho: 'Rascunho',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
};
export const ROTULO_SITUACAO_PAGAMENTO: Record<string, string> = {
  pago: 'Pago',
  parcial: 'Parcial',
  pendente: 'Pendente',
};

export const STATUS_PROJETO = ['a_entregar', 'em_andamento', 'aguardando_cliente', 'entregue', 'cancelado'] as const;
export type StatusProjeto = (typeof STATUS_PROJETO)[number];
export const ROTULO_STATUS_PROJETO: Record<StatusProjeto, string> = {
  a_entregar: 'A entregar',
  em_andamento: 'Em andamento',
  aguardando_cliente: 'Aguardando cliente',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const STATUS_UPSELL = ['nao_oferecido', 'oferecido', 'proposta_enviada', 'em_negociacao', 'vendido', 'recusou'] as const;
export type StatusUpsell = (typeof STATUS_UPSELL)[number];
export const ROTULO_UPSELL: Record<StatusUpsell, string> = {
  nao_oferecido: 'Não oferecido',
  oferecido: 'Oferecido',
  proposta_enviada: 'Proposta enviada',
  em_negociacao: 'Em negociação',
  vendido: 'Vendido',
  recusou: 'Recusou',
};

export const GRUPOS_TAREFA = ['placa', 'otimizacao_google', 'site', 'outro'] as const;
export const ROTULO_GRUPO_TAREFA: Record<(typeof GRUPOS_TAREFA)[number], string> = {
  placa: 'Placa NFC',
  otimizacao_google: 'Otimização do Google',
  site: 'Site',
  outro: 'Outros',
};

export const ROTULO_MARCO: Record<string, string> = {
  '30d': '30 dias',
  '60d': '60 dias',
  '90d': '90 dias',
  extra: 'Extra',
};

export const TIPOS_LANCAMENTO = ['receita', 'despesa', 'retirada'] as const;
export type TipoLancamento = (typeof TIPOS_LANCAMENTO)[number];
export const ROTULO_TIPO_LANCAMENTO: Record<TipoLancamento, string> = {
  receita: 'Receita',
  despesa: 'Despesa',
  retirada: 'Retirada',
};
export const ROTULO_CATEGORIA_LANCAMENTO: Record<string, string> = {
  venda: 'Venda',
  outra_receita: 'Outra receita',
  compra_placas: 'Compra de placas',
  frete_placas: 'Frete das placas',
  taxas_lote: 'Taxas do lote',
  taxas_cartao: 'Taxa do cartão',
  estorno: 'Estorno',
  ferramentas: 'Ferramentas',
  dominio_hospedagem: 'Domínio e hospedagem',
  deslocamento: 'Deslocamento',
  marketing: 'Marketing',
  outra_despesa: 'Outra despesa',
  retirada: 'Retirada de sócio',
};
/** Categorias que o app pode lançar à mão (policy lanc_insert), por tipo. */
export const CATEGORIAS_AVULSAS: Record<TipoLancamento, string[]> = {
  receita: ['outra_receita'],
  despesa: ['ferramentas', 'dominio_hospedagem', 'deslocamento', 'marketing', 'outra_despesa'],
  retirada: ['retirada'],
};
export const FORMAS_LANCAMENTO = [...FORMAS_PAGAMENTO, 'debito_automatico'] as const;

export const ROTULO_TABELA: Record<string, string> = {
  membros: 'Membros',
  configuracoes: 'Configurações',
  clientes: 'Leads',
  interacoes: 'Contatos',
  produtos: 'Produtos',
  lotes: 'Lotes',
  placas: 'Placas',
  vendas: 'Vendas',
  venda_itens: 'Itens de venda',
  projetos: 'Projetos',
  projeto_tarefas: 'Checklist',
  projeto_pendencias: 'Pendências',
  projeto_revisoes: 'Revisões',
  lancamentos: 'Lançamentos',
};
export const ROTULO_OPERACAO: Record<string, string> = {
  INSERT: 'Criou',
  UPDATE: 'Alterou',
  DELETE: 'Apagou',
};

export function rotulo(mapa: Record<string, string>, valor: string | null | undefined, vazio = '—'): string {
  if (!valor) return vazio;
  return mapa[valor] ?? valor;
}
