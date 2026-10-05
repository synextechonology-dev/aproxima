import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { buscarTudo, exigir, lista } from '@/lib/erros';
import type { Cliente, Interacao } from '@/lib/tipos';
import { useAcao } from '@/hooks/useAcao';
import type { ContatoSaida, LeadSaida } from './schemas';
import { localSPparaISO } from '@/lib/formato';
import { ROTULO_ETAPA, type Etapa } from '@/lib/rotulos';

export const CHAVE_LEADS = ['clientes'] as const;

export function useLeads() {
  return useQuery({
    queryKey: CHAVE_LEADS,
    queryFn: () =>
      buscarTudo<Cliente>((de, ate) =>
        supabase.from('clientes').select('*').order('updated_at', { ascending: false }).order('numero').range(de, ate),
      ),
  });
}

export function useInteracoes(clienteId: string | null) {
  return useQuery({
    queryKey: ['interacoes', clienteId],
    enabled: !!clienteId,
    queryFn: async () =>
      lista(await supabase.from('interacoes').select('*').eq('cliente_id', clienteId!).order('ocorreu_em', { ascending: false })),
  });
}

export function useSalvarLead() {
  return useAcao(
    async ({ id, dados }: { id?: string; dados: Partial<LeadSaida> }) => {
      if (id) return exigir(await supabase.from('clientes').update(dados).eq('id', id).select().single());
      return exigir(await supabase.from('clientes').insert(dados as LeadSaida).select().single());
    },
    {
      invalidar: [CHAVE_LEADS, ['painel-hoje']],
      sucesso: (c, v) => (v.id ? `${c.nome} atualizado` : `${c.codigo} · ${c.nome} cadastrado`),
    },
  );
}

/** Muda só a etapa (mover, descartar com motivo, reativar). */
export function useMudarEtapa() {
  return useAcao(
    async ({ id, etapa, motivo }: { id: string; etapa: Etapa; motivo?: string }) =>
      exigir(
        await supabase
          .from('clientes')
          .update(etapa === 'descartado' ? { etapa, motivo_descarte: motivo } : { etapa })
          .eq('id', id)
          .select()
          .single(),
      ),
    {
      invalidar: [CHAVE_LEADS, ['painel-hoje']],
      sucesso: (c) => `${c.nome}: ${ROTULO_ETAPA[c.etapa as Etapa] ?? c.etapa}`,
    },
  );
}

export function useExcluirLead() {
  return useAcao(
    async (id: string) => {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (error) throw error;
    },
    { invalidar: [CHAVE_LEADS, ['painel-hoje']], sucesso: 'Lead excluído' },
  );
}

export function useSalvarContato(clienteId: string) {
  return useAcao(
    async ({ id, dados }: { id?: string; dados: ContatoSaida }) => {
      const corpo = { ...dados, ocorreu_em: localSPparaISO(dados.ocorreu_em) };
      if (id) {
        return exigir(await supabase.from('interacoes').update(corpo).eq('id', id).select().single());
      }
      return exigir(await supabase.from('interacoes').insert({ ...corpo, cliente_id: clienteId }).select().single());
    },
    {
      invalidar: [CHAVE_LEADS, ['interacoes', clienteId], ['painel-hoje']],
      sucesso: (_, v) => (v.id ? 'Contato atualizado' : 'Contato registrado'),
    },
  );
}

export function useExcluirContato(clienteId: string) {
  return useAcao(
    async (id: string) => {
      const { error } = await supabase.from('interacoes').delete().eq('id', id);
      if (error) throw error;
    },
    { invalidar: [['interacoes', clienteId]], sucesso: 'Contato apagado' },
  );
}

export type ResultadoImportacao = {
  total: number;
  inseridos: number;
  duplicados: { linha: number; nome: string | null }[];
  erros: { linha: number; nome: string | null; erro: string }[];
};

export function useImportarLeads() {
  return useAcao(
    async (linhas: Record<string, string>[]) =>
      exigir(await supabase.rpc('importar_leads', { p_linhas: linhas })) as unknown as ResultadoImportacao,
    { invalidar: [CHAVE_LEADS] },
  );
}

export type { Interacao };
