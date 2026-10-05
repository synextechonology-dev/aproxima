import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CaretRight, Kanban, MagnifyingGlass, Storefront } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { mensagemDeErro } from '@/lib/erros';
import { Entrada } from '@/components/ui/campos';
import { estiloBotao } from '@/components/ui/botao-estilo';
import { Cabecalho } from '@/components/layout';
import { Carregando, ErroCarga, Vazio } from '@/components/estados';
import { useEu, useProdutos } from '@/hooks/useBase';
import { useLeads } from '@/features/prospeccao/dados';
import { ROTULO_ETAPA, rotulo } from '@/lib/rotulos';
import { digitos, normalizar } from '@/lib/utils';
import { useCriarRascunho } from './dados';

/** Nova venda: escolhe o cliente e cria o rascunho. Vindo da ficha do lead (?cliente=), cria direto. */
export default function NovaVenda() {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const eu = useEu();
  const leads = useLeads();
  const { data: produtos } = useProdutos();
  const criar = useCriarRascunho();
  const [busca, setBusca] = useState('');
  const disparou = useRef(false);
  const clienteParam = params.get('cliente');
  const categoriaParam = params.get('produto'); // ex.: site (vindo do upsell do projeto)

  const comecar = async (clienteId: string) => {
    const v = await criar.mutateAsync({ clienteId, vendedorId: eu?.user_id ?? null }).catch(() => null);
    if (!v) return;
    if (categoriaParam) {
      const p = produtos?.find((x) => x.categoria === categoriaParam && x.ativo);
      if (p) {
        const { error } = await supabase.from('venda_itens').insert({ venda_id: v.id, produto_id: p.id, quantidade: 1 });
        if (error) toast.error(mensagemDeErro(error));
      }
    }
    navegar(`/vendas/${v.id}`, { replace: true });
  };

  useEffect(() => {
    if (clienteParam && !disparou.current && (!categoriaParam || produtos)) {
      disparou.current = true;
      void comecar(clienteParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cria uma vez ao abrir com ?cliente=
  }, [clienteParam, categoriaParam, produtos]);

  const lista = useMemo(() => {
    const t = normalizar(busca);
    const d = digitos(busca);
    return (leads.data ?? [])
      .filter((c) => c.etapa !== 'descartado')
      .filter((c) => !t || normalizar(`${c.nome} ${c.codigo} ${c.cidade}`).includes(t) || (d.length >= 3 && digitos(c.telefone).includes(d)))
      .slice(0, 50);
  }, [leads.data, busca]);

  if (clienteParam) {
    return criar.isError ? (
      <ErroCarga erro={criar.error} tentarDeNovo={() => void comecar(clienteParam)} />
    ) : (
      <Carregando linhas={3} rotulo="Criando o rascunho da venda" />
    );
  }

  return (
    <>
      <Cabecalho titulo="Nova venda" resumo="Escolha o cliente. A venda começa como rascunho; as placas são reservadas ao adicionar os itens." antes={<Link to="/vendas" className="text-sm text-text-muted hover:underline">Vendas</Link>} />
      <div className="relative max-w-xl">
        <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
        <Entrada autoFocus type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, código L-, cidade ou telefone" aria-label="Buscar cliente" className="pl-[36px]" />
      </div>
      {leads.isLoading ? (
        <Carregando linhas={5} />
      ) : leads.isError ? (
        <ErroCarga erro={leads.error} tentarDeNovo={() => void leads.refetch()} />
      ) : !leads.data?.length ? (
        <Vazio
          icone={Kanban}
          titulo="Nenhum lead cadastrado"
          texto="Toda venda é de um lead. Cadastre o cliente na Prospecção primeiro."
          acao={<Link to="/prospeccao" className={estiloBotao({ variante: 'principal' })}>Ir para Prospecção</Link>}
        />
      ) : !lista.length ? (
        <Vazio icone={Storefront} titulo="Nenhum lead encontrado" texto="Confira a busca ou cadastre o lead na Prospecção." />
      ) : (
        <ul className="flex max-w-xl flex-col gap-2">
          {lista.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={criar.isPending}
                onClick={() => void comecar(c.id)}
                className="flex w-full items-center gap-3 rounded-md bg-surface p-4 text-left shadow-(--shadow-sm) hover:shadow-(--shadow-md) disabled:opacity-60"
              >
                <Storefront size={20} className="shrink-0 text-text-muted" aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{c.nome}</span>
                  <span className="truncate text-sm text-text-muted">
                    {c.codigo} · {c.cidade} · {rotulo(ROTULO_ETAPA, c.etapa)}
                  </span>
                </span>
                <CaretRight size={18} className="text-text-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
