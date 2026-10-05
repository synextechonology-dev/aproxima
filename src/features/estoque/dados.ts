import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { buscarTudo, exigir, lista } from '@/lib/erros';
import type { Visao } from '@/lib/tipos';
import { useAcao } from '@/hooks/useAcao';
import type { LoteSaida } from './schemas';

export type PlacaV = Visao<'v_placas'>;
export type LoteV = Visao<'v_lotes'>;

export function useResumoEstoque() {
  return useQuery({
    queryKey: ['estoque', 'resumo'],
    queryFn: async () => exigir(await supabase.from('v_estoque_resumo').select('*').single()),
  });
}

export function usePlacas() {
  return useQuery({
    queryKey: ['estoque', 'placas'],
    queryFn: () =>
      buscarTudo<PlacaV>((de, ate) => supabase.from('v_placas').select('*').order('codigo', { ascending: false }).range(de, ate)),
  });
}

export function useLotes() {
  return useQuery({
    queryKey: ['estoque', 'lotes'],
    queryFn: async () => lista(await supabase.from('v_lotes').select('*').order('codigo', { ascending: false })),
  });
}

/** Campos de lotes que a view não traz (observações, forma). */
export function useLotesDetalhe() {
  return useQuery({
    queryKey: ['estoque', 'lotes-detalhe'],
    queryFn: async () => lista(await supabase.from('lotes').select('id, fornecedor, observacoes, forma_pagamento')),
  });
}

export function useMovimentacoes(placaId: string | null) {
  return useQuery({
    queryKey: ['estoque', 'mov', placaId],
    enabled: !!placaId,
    queryFn: async () =>
      lista(await supabase.from('movimentacoes_estoque').select('*').eq('placa_id', placaId!).order('ocorreu_em', { ascending: false }).limit(50)),
  });
}

const INVALIDAR_ESTOQUE = [['estoque'], ['painel-hoje'], ['busca']];

export function useRegistrarLote() {
  return useAcao(async (p: LoteSaida) => exigir(await supabase.rpc('registrar_lote', { ...p, p_observacoes: p.p_observacoes ?? undefined })), {
    invalidar: true, // cria placas e lançamentos no financeiro
  });
}

export function useEditarLote() {
  return useAcao(
    async ({ id, fornecedor, observacoes }: { id: string; fornecedor: string; observacoes: string | null }) =>
      exigir(await supabase.from('lotes').update({ fornecedor, observacoes }).eq('id', id).select().single()),
    { invalidar: INVALIDAR_ESTOQUE, sucesso: (l) => `${l.codigo} atualizado` },
  );
}

export function useAjustarPlaca() {
  return useAcao(
    async (p: { p_placa_id: string; p_novo_status: string; p_motivo?: string; p_responsavel?: string }) =>
      exigir(await supabase.rpc('ajustar_placa', p)),
    { invalidar: true, sucesso: (pl) => `${pl.codigo} ajustada` },
  );
}

/** Só destino_url, ativo e gravada_em são editáveis na placa. */
export function useAtualizarPlaca() {
  return useAcao(
    async ({ id, dados }: { id: string; dados: { destino_url?: string | null; ativo?: boolean; gravada_em?: string | null } }) =>
      exigir(await supabase.from('placas').update(dados).eq('id', id).select().single()),
    { invalidar: [...INVALIDAR_ESTOQUE, ['projeto']], sucesso: (pl) => `${pl.codigo} atualizada` },
  );
}
