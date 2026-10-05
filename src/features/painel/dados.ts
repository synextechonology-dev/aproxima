import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { exigir, lista } from '@/lib/erros';

export type Indicadores = {
  faturamento: number;
  lucro_vendas: number;
  despesas: number;
  lucro_liquido: number;
  lucro_liquido_parcial: boolean;
  vendas: number;
  ticket_medio: number | null;
  placas_vendidas: number;
  leads_periodo: number;
  leads_viraram_cliente: number;
  conversao_pct: number | null;
  clientes_total: number;
  clientes_com_servico: number;
  taxa_upsell_pct: number | null;
  servicos: { categoria: string; vendas: number; valor: number }[];
  funil: { etapa: string; leads: number }[] | null;
  vendas_por_cidade: { cidade: string; vendas: number; faturamento: number }[];
  motivos_descarte: { motivo: string | null; leads: number }[];
  por_mes: { mes: string; faturamento: number; lucro_liquido: number }[];
};

export function useIndicadores(inicio: string, fim: string, vendedor: string, cidade: string) {
  return useQuery({
    queryKey: ['painel', 'indicadores', inicio, fim, vendedor, cidade],
    queryFn: async () => {
      const r = exigir(
        await supabase.rpc('painel_indicadores', { p_inicio: inicio, p_fim: fim, p_vendedor: vendedor || undefined, p_cidade: cidade || undefined }),
      ) as unknown as Partial<Indicadores>;
      // Listas sempre como array, mesmo se vierem vazias
      return {
        ...r,
        servicos: r.servicos ?? [],
        funil: r.funil ?? [],
        vendas_por_cidade: r.vendas_por_cidade ?? [],
        motivos_descarte: r.motivos_descarte ?? [],
        por_mes: r.por_mes ?? [],
      } as Indicadores;
    },
  });
}

export function usePraFazerHoje() {
  return useQuery({
    queryKey: ['painel-hoje', 'lista'],
    queryFn: async () => lista(await supabase.from('v_painel_hoje').select('*').order('quando')),
  });
}

export function useCidadesClientes() {
  return useQuery({
    queryKey: ['painel', 'cidades'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const r = lista(await supabase.from('v_vendas').select('cliente_cidade').eq('status', 'confirmada').limit(1000));
      return [...new Set(r.map((x) => x.cliente_cidade).filter(Boolean))].sort() as string[];
    },
  });
}
