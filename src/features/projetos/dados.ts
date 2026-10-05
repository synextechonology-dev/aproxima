import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { exigir, lista } from '@/lib/erros';
import type { Visao } from '@/lib/tipos';
import { useAcao } from '@/hooks/useAcao';

export type ProjetoV = Visao<'v_projetos'>;

export function useProjetos() {
  return useQuery({
    queryKey: ['projetos'],
    queryFn: async () => lista(await supabase.from('v_projetos').select('*').order('prazo', { ascending: true, nullsFirst: false })),
  });
}

export function useProjeto(id: string) {
  return useQuery({
    queryKey: ['projeto', id],
    queryFn: async () => {
      const projeto = exigir(await supabase.from('projetos').select('*').eq('id', id).single());
      const [visao, resultado, tarefas, pendencias, revisoes, placas, venda, cliente] = await Promise.all([
        supabase.from('v_projetos').select('*').eq('id', id).single(),
        supabase.from('v_resultado_projeto').select('*').eq('projeto_id', id).maybeSingle(),
        supabase.from('projeto_tarefas').select('*').eq('projeto_id', id).order('grupo').order('ordem'),
        supabase.from('projeto_pendencias').select('*').eq('projeto_id', id).order('pedido_em', { ascending: false }),
        supabase.from('projeto_revisoes').select('*').eq('projeto_id', id).order('data_prevista'),
        supabase.from('v_placas').select('*').eq('venda_id', projeto.venda_id).order('codigo'),
        supabase.from('v_vendas').select('id, codigo, data_venda, vendedor_nome, itens_resumo, total').eq('id', projeto.venda_id).single(),
        supabase.from('clientes').select('id, nome, codigo, cidade, contato_nome, telefone, google_url').eq('id', projeto.cliente_id).single(),
      ]);
      return {
        projeto,
        visao: exigir(visao),
        resultado: resultado.data,
        tarefas: lista(tarefas),
        pendencias: lista(pendencias),
        revisoes: lista(revisoes),
        placas: lista(placas),
        venda: exigir(venda),
        cliente: exigir(cliente),
      };
    },
  });
}

export type DadosProjeto = NonNullable<ReturnType<typeof useProjeto>['data']>;

const recarregar = (id: string) => [['projeto', id], ['projetos'], ['painel-hoje']];

type CamposProjeto = {
  status?: string;
  prazo?: string | null;
  responsavel_id?: string | null;
  observacoes?: string | null;
  upsell_site?: string;
  upsell_google?: string;
  upsell_oferecer_em?: string | null;
  upsell_motivo_recusa?: string | null;
};

export function useAtualizarProjeto(id: string) {
  return useAcao(async (dados: CamposProjeto) => exigir(await supabase.from('projetos').update(dados).eq('id', id).select().single()), {
    invalidar: recarregar(id),
  });
}

export function useTarefas(projetoId: string) {
  const inv = { invalidar: recarregar(projetoId) };
  return {
    criar: useAcao(
      async (t: { grupo: string; titulo: string; ordem: number }) =>
        exigir(await supabase.from('projeto_tarefas').insert({ ...t, projeto_id: projetoId }).select().single()),
      { ...inv, sucesso: 'Item incluído no checklist' },
    ),
    marcar: useAcao(
      async ({ id, feito }: { id: string; feito: boolean }) =>
        exigir(await supabase.from('projeto_tarefas').update({ feito_em: feito ? new Date().toISOString() : null }).eq('id', id).select().single()),
      inv,
    ),
    apagar: useAcao(async (id: string) => {
      const { error } = await supabase.from('projeto_tarefas').delete().eq('id', id);
      if (error) throw error;
    }, { ...inv, sucesso: 'Item removido' }),
  };
}

export function usePendencias(projetoId: string) {
  const inv = { invalidar: recarregar(projetoId) };
  return {
    criar: useAcao(
      async (p: { descricao: string; pedido_em: string }) =>
        exigir(await supabase.from('projeto_pendencias').insert({ ...p, projeto_id: projetoId }).select().single()),
      { ...inv, sucesso: 'Pendência registrada' },
    ),
    resolver: useAcao(
      async ({ id, data }: { id: string; data: string | null }) =>
        exigir(await supabase.from('projeto_pendencias').update({ resolvido_em: data }).eq('id', id).select().single()),
      inv,
    ),
    apagar: useAcao(async (id: string) => {
      const { error } = await supabase.from('projeto_pendencias').delete().eq('id', id);
      if (error) throw error;
    }, { ...inv, sucesso: 'Pendência apagada' }),
  };
}

export function useRevisoes(projetoId: string) {
  const inv = { invalidar: recarregar(projetoId) };
  return {
    registrar: useAcao(
      async ({ id, ...d }: { id: string; realizado_em: string | null; nota: number | null; avaliacoes: number | null; observacoes: string | null; data_prevista?: string }) =>
        exigir(await supabase.from('projeto_revisoes').update(d).eq('id', id).select().single()),
      { ...inv, sucesso: 'Revisão salva' },
    ),
    extra: useAcao(
      async (data_prevista: string) =>
        exigir(await supabase.from('projeto_revisoes').insert({ projeto_id: projetoId, marco: 'extra', data_prevista }).select().single()),
      { ...inv, sucesso: 'Revisão extra agendada' },
    ),
  };
}
