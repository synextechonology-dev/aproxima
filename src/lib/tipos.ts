import type { Database } from '@/types/database';

type Public = Database['public'];
export type Linha<T extends keyof Public['Tables']> = Public['Tables'][T]['Row'];
export type Visao<T extends keyof Public['Views']> = Public['Views'][T]['Row'];
export type Rpc<T extends keyof Public['Functions']> = Public['Functions'][T];

export type Cliente = Linha<'clientes'>;
export type Interacao = Linha<'interacoes'>;
export type Membro = Linha<'membros'>;
export type Produto = Linha<'produtos'>;
export type Lote = Linha<'lotes'>;
export type Placa = Linha<'placas'>;
export type Venda = Linha<'vendas'>;
export type VendaItem = Linha<'venda_itens'>;
export type Projeto = Linha<'projetos'>;
export type Tarefa = Linha<'projeto_tarefas'>;
export type Pendencia = Linha<'projeto_pendencias'>;
export type Revisao = Linha<'projeto_revisoes'>;
export type Lancamento = Linha<'lancamentos'>;
export type Configuracoes = Linha<'configuracoes'>;
export type Auditoria = Linha<'auditoria'>;
export type Movimentacao = Linha<'movimentacoes_estoque'>;
