import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { exigir } from '@/lib/erros';
import { useAuth } from '@/app/auth-contexto';

/** Sócios ativos e inativos (para nomes e filtros). */
export function useMembros() {
  return useQuery({
    queryKey: ['membros'],
    queryFn: async () => exigir(await supabase.from('membros').select('*').order('nome')),
    staleTime: 5 * 60_000,
  });
}

export function useMembrosAtivos() {
  const q = useMembros();
  return { ...q, data: q.data?.filter((m) => m.ativo) };
}

/** Nome de um sócio pelo user_id. */
export function useNomeMembro() {
  const { data } = useMembros();
  return (id: string | null | undefined) => (id ? (data?.find((m) => m.user_id === id)?.nome ?? '—') : '—');
}

export function useConfiguracoes() {
  return useQuery({
    queryKey: ['configuracoes'],
    queryFn: async () => exigir(await supabase.from('configuracoes').select('*').single()),
    staleTime: 5 * 60_000,
  });
}

export function useProdutos() {
  return useQuery({
    queryKey: ['produtos'],
    queryFn: async () => exigir(await supabase.from('produtos').select('*').order('categoria').order('nome')),
    staleTime: 5 * 60_000,
  });
}

/** Membro logado. */
export function useEu() {
  return useAuth().membro;
}
