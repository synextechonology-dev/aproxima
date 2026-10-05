import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { buscarTudo, exigir, lista } from '@/lib/erros';
import type { Lancamento } from '@/lib/tipos';
import { useAcao } from '@/hooks/useAcao';
import type { LancSaida } from './schemas';

export type LancamentoC = Lancamento & { clientes: { nome: string; telefone: string | null } | null };

/** Lançamentos com vencimento no mês + os abertos de meses anteriores (atrasados). */
export function useLancamentos(inicio: string, fim: string) {
  return useQuery({
    queryKey: ['financeiro', 'lancamentos', inicio, fim],
    queryFn: async () => {
      const [doMes, anteriores] = await Promise.all([
        buscarTudo<LancamentoC>((de, ate) =>
          supabase.from('lancamentos').select('*, clientes(nome, telefone)').gte('vencimento', inicio).lte('vencimento', fim).order('vencimento').range(de, ate),
        ),
        buscarTudo<LancamentoC>((de, ate) =>
          supabase
            .from('lancamentos')
            .select('*, clientes(nome, telefone)')
            .lt('vencimento', inicio)
            .is('pago_em', null)
            .is('cancelado_em', null)
            .order('vencimento')
            .range(de, ate),
        ),
      ]);
      return { doMes, anteriores };
    },
  });
}

export function useResultadoMes(mes: string) {
  return useQuery({
    queryKey: ['financeiro', 'mensal', mes],
    queryFn: async () => (await supabase.from('v_resultado_mensal').select('*').eq('mes', mes).maybeSingle()).data,
  });
}

export function useVendasDoMes(inicio: string, fim: string) {
  return useQuery({
    queryKey: ['financeiro', 'vendas', inicio, fim],
    queryFn: async () =>
      lista(await supabase.from('v_vendas').select('*').eq('status', 'confirmada').gte('data_venda', inicio).lte('data_venda', fim).order('data_venda')),
  });
}

export function useCidadesDoMes(inicio: string, fim: string) {
  return useQuery({
    queryKey: ['financeiro', 'cidades', inicio, fim],
    queryFn: async () => {
      const r = exigir(await supabase.rpc('painel_indicadores', { p_inicio: inicio, p_fim: fim })) as {
        vendas_por_cidade: { cidade: string; vendas: number; faturamento: number }[];
      };
      return r.vendas_por_cidade ?? [];
    },
  });
}

export function useRetiradas() {
  return useQuery({
    queryKey: ['financeiro', 'retiradas'],
    queryFn: async () => {
      const [socios, ultimas] = await Promise.all([
        supabase.from('v_retiradas_socios').select('*').order('nome'),
        supabase.from('lancamentos').select('*').eq('tipo', 'retirada').is('cancelado_em', null).order('vencimento', { ascending: false }).limit(10),
      ]);
      return { socios: lista(socios), ultimas: lista(ultimas) };
    },
  });
}

const INV = [['financeiro'], ['venda'], ['vendas'], ['painel-hoje'], ['painel']];

export function useSalvarLancamento() {
  return useAcao(
    async ({ id, dados }: { id?: string; dados: LancSaida }) => {
      if (id) return exigir(await supabase.from('lancamentos').update(dados).eq('id', id).select().single());
      return exigir(await supabase.from('lancamentos').insert(dados).select().single());
    },
    { invalidar: INV, sucesso: (_, v) => (v.id ? 'Lançamento atualizado' : 'Lançamento registrado') },
  );
}

/** Pagamento: única mudança aceita em lançamento gerado por venda ou lote. */
export function useRegistrarPagamento() {
  return useAcao(
    async ({ id, pago_em, forma_pagamento }: { id: string; pago_em: string | null; forma_pagamento?: string | null }) =>
      exigir(
        await supabase
          .from('lancamentos')
          .update(forma_pagamento !== undefined ? { pago_em, forma_pagamento } : { pago_em })
          .eq('id', id)
          .select()
          .single(),
      ),
    { invalidar: INV, sucesso: (l) => (l.pago_em ? 'Pagamento registrado' : 'Pagamento desfeito') },
  );
}

export function useCancelarLancamento() {
  return useAcao(
    async ({ id, motivo }: { id: string; motivo: string }) =>
      exigir(
        await supabase.from('lancamentos').update({ cancelado_em: new Date().toISOString(), motivo_cancelamento: motivo }).eq('id', id).select().single(),
      ),
    { invalidar: INV, sucesso: 'Lançamento cancelado' },
  );
}
