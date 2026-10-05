import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import { mensagemDeErro } from '@/lib/erros';

type Opcoes<TDados, TVars> = {
  /** Mensagem de sucesso (ou função que a monta a partir do retorno). */
  sucesso?: string | ((dados: TDados, vars: TVars) => string);
  /** Chaves para recarregar. `true` recarrega tudo (RPCs que mexem em várias áreas). */
  invalidar?: QueryKey[] | true;
  aoConcluir?: (dados: TDados, vars: TVars) => void;
};

/** Escrita no banco com aviso de erro traduzido (P0001, 42501…) e recarga das telas afetadas. */
export function useAcao<TDados, TVars = void>(fn: (vars: TVars) => Promise<TDados>, opcoes: Opcoes<TDados, TVars> = {}) {
  const qc = useQueryClient();
  return useMutation<TDados, unknown, TVars>({
    mutationFn: fn,
    onSuccess: async (dados, vars) => {
      if (opcoes.invalidar === true) await qc.invalidateQueries();
      else if (opcoes.invalidar) await Promise.all(opcoes.invalidar.map((k) => qc.invalidateQueries({ queryKey: k })));
      if (opcoes.sucesso) {
        toast.success(typeof opcoes.sucesso === 'function' ? opcoes.sucesso(dados, vars) : opcoes.sucesso);
      }
      opcoes.aoConcluir?.(dados, vars);
    },
    onError: (erro) => {
      toast.error(mensagemDeErro(erro));
    },
  });
}
