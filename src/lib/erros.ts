import type { PostgrestError } from '@supabase/supabase-js';

// Mensagens dos checks da migration (23514), pelo nome da constraint.
const CHECKS: Record<string, string> = {
  clientes_nome_check: 'Informe o nome (até 150 caracteres).',
  clientes_cidade_check: 'Informe a cidade (até 80 caracteres).',
  clientes_telefone_check: 'Telefone inválido: use só números, espaço, +, ( ) e -, de 8 a 20 caracteres.',
  clientes_email_check: 'E-mail inválido.',
  clientes_google_url_check: 'O link do Google precisa começar com https:// (até 500 caracteres).',
  clientes_site_url_check: 'O site precisa começar com http:// ou https://.',
  clientes_nota_google_check: 'A nota do Google vai de 0 a 5.',
  clientes_concorrente_nota_check: 'A nota do concorrente vai de 0 a 5.',
  descarte_com_motivo: 'Para descartar, escolha o motivo.',
  placas_destino_url_check: 'O destino precisa começar com https:// (até 500 caracteres).',
  revisao_completa: 'Para concluir a revisão, informe o número de avaliações.',
  projeto_revisoes_nota_check: 'A nota vai de 0 a 5.',
  lanc_retirada_socio: 'Retirada precisa do sócio.',
  lanc_cancelamento_motivo: 'Informe o motivo do cancelamento.',
  lanc_tipo_categoria: 'A categoria não combina com o tipo do lançamento.',
  lancamentos_valor_check: 'O valor precisa ser maior que zero.',
  venda_itens_quantidade_check: 'A quantidade vai de 1 a 100.',
  vendas_parcelas_check: 'Parcelas: de 1 a 24.',
  vendas_taxa_cartao_pct_check: 'A taxa do cartão vai de 0% a 20%.',
  lotes_quantidade_check: 'A quantidade do lote vai de 1 a 5000.',
  configuracoes_estoque_minimo_check: 'O estoque mínimo não pode ser negativo.',
};

type ErroLike = Partial<PostgrestError> & { message?: string; status?: number; name?: string };

/** Traduz o erro do Supabase para uma frase que o sócio entende. */
export function mensagemDeErro(e: unknown): string {
  if (!e) return 'Algo deu errado. Tente de novo.';
  const erro = e as ErroLike;
  const msg = erro.message ?? String(e);
  const codigo = erro.code;

  if (codigo === 'P0001' || codigo === 'P0002') return msg;
  if (codigo === '42501' || /permission denied/i.test(msg)) return 'Você não tem permissão para isso';
  if (codigo === '23505') return 'Já existe um lead com esse link do Google';
  if (codigo === '23514') {
    const nome = /constraint "([^"]+)"/.exec(msg)?.[1];
    return (nome && CHECKS[nome]) || 'Algum campo está fora do formato permitido.';
  }
  if (codigo === '23503') return 'Este registro está ligado a outros e não pode ser apagado.';
  if (codigo === '23502') return 'Preencha os campos obrigatórios.';
  if (codigo === '22P02' || codigo === '22003') return 'Algum valor está em formato inválido.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
    return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
  }
  if (/JWT|session/i.test(msg)) return 'Sua sessão expirou. Entre de novo.';
  return msg || 'Algo deu errado. Tente de novo.';
}

/** Lança o erro do Supabase (para o TanStack Query tratar) e devolve os dados. */
export function exigir<T>(r: { data: T; error: PostgrestError | null }): T {
  if (r.error) throw r.error;
  return r.data;
}

/** Busca todas as linhas, de 1000 em 1000 (o limite padrão de linhas da API). */
export async function buscarTudo<T>(
  pagina: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
  tamanho = 1000,
): Promise<T[]> {
  const todas: T[] = [];
  for (let de = 0; ; de += tamanho) {
    const { data, error } = await pagina(de, de + tamanho - 1);
    if (error) throw error;
    const lote = data ?? [];
    todas.push(...lote);
    if (lote.length < tamanho) break;
  }
  return todas;
}

/** Como `exigir`, mas para listas: devolve [] quando não vem nada. */
export function lista<T>(r: { data: T[] | null; error: PostgrestError | null }): T[] {
  if (r.error) throw r.error;
  return r.data ?? [];
}
