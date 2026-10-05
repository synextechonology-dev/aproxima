import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { exigir, lista } from '@/lib/erros';
import { useAcao } from '@/hooks/useAcao';
import type { z } from 'zod';
import type { esquemaConfig, esquemaProduto } from './schemas';

export function useSalvarConfig() {
  return useAcao(
    async (d: z.output<typeof esquemaConfig>) => exigir(await supabase.from('configuracoes').update(d).eq('id', true).select().single()),
    { invalidar: [['configuracoes'], ['estoque'], ['painel-hoje']], sucesso: 'Configurações salvas' },
  );
}

export function useSalvarProduto() {
  return useAcao(
    async ({ id, dados }: { id?: string; dados: Partial<z.output<typeof esquemaProduto>> & { ativo?: boolean } }) => {
      if (id) {
        // A categoria não muda depois de criada (sem grant de update)
        const { categoria: _c, ...resto } = dados;
        void _c;
        return exigir(await supabase.from('produtos').update(resto).eq('id', id).select().single());
      }
      return exigir(await supabase.from('produtos').insert(dados as z.output<typeof esquemaProduto>).select().single());
    },
    { invalidar: [['produtos']], sucesso: (p) => `${p.nome} salvo` },
  );
}

export function useAuditoria(tabela: string, pagina: number) {
  const tamanho = 30;
  return useQuery({
    queryKey: ['auditoria', tabela, pagina],
    queryFn: async () => {
      let q = supabase.from('auditoria').select('*').order('ocorreu_em', { ascending: false }).range(pagina * tamanho, pagina * tamanho + tamanho);
      if (tabela) q = q.eq('tabela', tabela);
      const linhas = lista(await q);
      return { linhas: linhas.slice(0, tamanho), temMais: linhas.length > tamanho };
    },
  });
}
