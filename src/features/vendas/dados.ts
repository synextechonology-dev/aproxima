import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { buscarTudo, exigir, lista } from '@/lib/erros';
import type { Visao } from '@/lib/tipos';
import { useAcao } from '@/hooks/useAcao';
import type { VendaSaida } from './schemas';

export type VendaV = Visao<'v_vendas'>;

export function useVendas(inicio: string, fim: string) {
  return useQuery({
    queryKey: ['vendas', 'lista', inicio, fim],
    queryFn: () =>
      buscarTudo<VendaV>((de, ate) =>
        supabase
          .from('v_vendas')
          .select('*')
          .gte('data_venda', inicio)
          .lte('data_venda', fim)
          .order('data_venda', { ascending: false })
          .order('codigo', { ascending: false })
          .range(de, ate),
      ),
  });
}

/** Totais do período calculados pelo banco (painel_indicadores). */
export function useTotaisVendas(inicio: string, fim: string, vendedor: string, cidade: string) {
  return useQuery({
    queryKey: ['vendas', 'totais', inicio, fim, vendedor, cidade],
    queryFn: async () =>
      exigir(
        await supabase.rpc('painel_indicadores', {
          p_inicio: inicio,
          p_fim: fim,
          p_vendedor: vendedor || undefined,
          p_cidade: cidade || undefined,
        }),
      ) as { faturamento: number; lucro_vendas: number; vendas: number },
  });
}

export function useVenda(id: string) {
  return useQuery({
    queryKey: ['venda', id],
    queryFn: async () => {
      const [venda, resumo, itens, placas, lancs, projeto] = await Promise.all([
        supabase.from('vendas').select('*').eq('id', id).single(),
        supabase.from('v_vendas').select('*').eq('id', id).single(),
        supabase.from('venda_itens').select('*, produtos(nome, categoria, preco_padrao)').eq('venda_id', id).order('created_at'),
        supabase.from('v_placas').select('id, codigo, lote_codigo, status').eq('venda_id', id).order('codigo'),
        supabase.from('lancamentos').select('*').eq('venda_id', id).order('vencimento').order('parcela'),
        supabase.from('projetos').select('id, status').eq('venda_id', id).maybeSingle(),
      ]);
      const v = exigir(venda);
      const cliente = exigir(await supabase.from('clientes').select('*').eq('id', v.cliente_id).single());
      return {
        venda: v,
        resumo: exigir(resumo),
        itens: lista(itens),
        placas: lista(placas),
        lancamentos: lista(lancs),
        projeto: projeto.data,
        cliente,
      };
    },
  });
}

export type DadosVenda = NonNullable<ReturnType<typeof useVenda>['data']>;

const recarregar = (id: string) => [['venda', id], ['vendas'], ['estoque'], ['painel-hoje']];

export function useCriarRascunho() {
  return useAcao(
    async ({ clienteId, vendedorId }: { clienteId: string; vendedorId: string | null }) =>
      exigir(await supabase.from('vendas').insert({ cliente_id: clienteId, vendedor_id: vendedorId }).select().single()),
    { invalidar: [['vendas']] },
  );
}

export function useSalvarVenda(id: string) {
  return useAcao(
    async (dados: Partial<VendaSaida> & { cliente_id?: string }) =>
      exigir(await supabase.from('vendas').update(dados).eq('id', id).select().single()),
    { invalidar: recarregar(id) },
  );
}

export function useAdicionarItem(vendaId: string) {
  return useAcao(
    async (produtoId: string) =>
      exigir(await supabase.from('venda_itens').insert({ venda_id: vendaId, produto_id: produtoId, quantidade: 1 }).select().single()),
    { invalidar: recarregar(vendaId) },
  );
}

export function useAlterarItem(vendaId: string) {
  return useAcao(
    async ({ id, quantidade, preco_unitario }: { id: string; quantidade?: number; preco_unitario?: number }) =>
      exigir(await supabase.from('venda_itens').update({ quantidade, preco_unitario }).eq('id', id).select().single()),
    { invalidar: recarregar(vendaId) },
  );
}

export function useRemoverItem(vendaId: string) {
  return useAcao(
    async (id: string) => {
      const { error } = await supabase.from('venda_itens').delete().eq('id', id);
      if (error) throw error;
    },
    { invalidar: recarregar(vendaId) },
  );
}

export function useTrocarPlaca(vendaId: string) {
  return useAcao(
    async ({ atual, nova }: { atual: string; nova: string }) => {
      const { error } = await supabase.rpc('trocar_placa_reservada', { p_venda_id: vendaId, p_placa_atual: atual, p_placa_nova: nova });
      if (error) throw error;
    },
    { invalidar: recarregar(vendaId), sucesso: 'Placa trocada' },
  );
}

export function useConfirmarVenda() {
  return useAcao(async (id: string) => exigir(await supabase.rpc('confirmar_venda', { p_venda_id: id })), {
    invalidar: true, // estoque, financeiro, projetos e leads mudam juntos
    sucesso: (v) => `Venda ${v.codigo} confirmada`,
  });
}

export function useCancelarVenda() {
  return useAcao(
    async ({ id, motivo }: { id: string; motivo: string }) => exigir(await supabase.rpc('cancelar_venda', { p_venda_id: id, p_motivo: motivo })),
    { invalidar: true, sucesso: (v) => `Venda ${v.codigo} cancelada` },
  );
}

export function useApagarRascunho() {
  return useAcao(
    async (id: string) => {
      const { error } = await supabase.from('vendas').delete().eq('id', id);
      if (error) throw error;
    },
    { invalidar: [['vendas'], ['estoque']], sucesso: 'Rascunho apagado' },
  );
}

export function usePlacasDisponiveis(ativo: boolean) {
  return useQuery({
    queryKey: ['estoque', 'disponiveis'],
    enabled: ativo,
    queryFn: async () => lista(await supabase.from('v_placas').select('id, codigo, lote_codigo, custo').eq('status', 'disponivel').order('codigo').limit(500)),
  });
}
