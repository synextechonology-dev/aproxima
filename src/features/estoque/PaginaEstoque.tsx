import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CaretRight, MagnifyingGlass, Package, PencilSimple, PencilSimpleLine, Plus } from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { Entrada, Selecao } from '@/components/ui/campos';
import { Abas } from '@/components/abas';
import { AcaoFixa, Cabecalho, Indicador } from '@/components/layout';
import { Carregando, ErroCarga, Vazio } from '@/components/estados';
import { Selo } from '@/components/selo';
import { STATUS_PLACA, ROTULO_STATUS_PLACA } from '@/lib/rotulos';
import { formatarData, formatarDataHora, formatarMoeda, formatarNumero } from '@/lib/formato';
import { normalizar, cn } from '@/lib/utils';
import { seloPlaca } from './status';
import { useLotes, useLotesDetalhe, usePlacas, useResumoEstoque, type PlacaV } from './dados';
import { RegistrarLote } from './RegistrarLote';
import { AjustarPlaca } from './AjustarPlaca';
import { GravarLink } from './GravarLink';
import { FichaPlaca } from './FichaPlaca';
import { EditarLote } from './EditarLote';

const COR_BARRA: Record<string, string> = {
  instaladas: 'bg-ok-fg',
  aguardando_instalacao: 'bg-hoje-fg',
  disponiveis: 'bg-neutral-400',
  demonstracao: 'bg-accent',
  reservadas: 'bg-accent-700',
  defeito: 'bg-atrasado-fg',
  perdidas: 'bg-neutral-700',
};
const ROTULO_BARRA: Record<string, string> = {
  instaladas: 'instaladas',
  aguardando_instalacao: 'aguardando instalação',
  disponiveis: 'disponíveis',
  demonstracao: 'demonstração',
  reservadas: 'reservadas',
  defeito: 'com defeito',
  perdidas: 'perdidas',
};

function Resumo() {
  const r = useResumoEstoque();
  const placas = usePlacas();
  if (r.isLoading) return <Carregando linhas={2} />;
  if (r.isError) return <ErroCarga erro={r.error} tentarDeNovo={() => void r.refetch()} />;
  const e = r.data!;
  const demo = (placas.data ?? []).filter((p) => p.status === 'demonstracao');
  const porPessoa = Object.entries(
    demo.reduce<Record<string, number>>((acc, p) => {
      const n = p.responsavel_nome ?? 'sem responsável';
      acc[n] = (acc[n] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([n, q]) => `${q} com ${n}`)
    .join(' · ');
  const total = e.total ?? 0;
  const partes = Object.keys(COR_BARRA)
    .map((k) => ({ k, v: (e[k as keyof typeof e] as number | null) ?? 0 }))
    .filter((x) => x.v > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Indicador
          rotulo="Disponíveis"
          valor={formatarNumero(e.disponiveis)}
          nota={e.abaixo_minimo ? `abaixo do mínimo de ${e.estoque_minimo}` : `mínimo ${e.estoque_minimo}`}
          tom={e.abaixo_minimo ? 'atrasado' : undefined}
        />
        <Indicador rotulo="Em demonstração" valor={formatarNumero(e.demonstracao)} nota={porPessoa || 'nenhuma fora'} />
        <Indicador className="col-span-2 md:col-span-1" rotulo="Custo médio por placa" valor={formatarMoeda(e.custo_medio_disponiveis)} nota="das disponíveis, com frete" />
      </div>
      {total > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg bg-surface p-4 shadow-(--shadow-sm)">
          <span className="text-sm text-text-muted">Onde estão as {formatarNumero(total)} placas</span>
          <div className="flex h-[10px] overflow-hidden rounded-full bg-neutral-900" aria-hidden>
            {partes.map((p) => (
              <span key={p.k} className={COR_BARRA[p.k]} style={{ width: `${(p.v / total) * 100}%` }} />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {partes.map((p) => (
              <li key={p.k} className="flex items-center gap-1.5">
                <span className={cn('size-[8px] rounded-full', COR_BARRA[p.k])} aria-hidden />
                <span className="text-text-muted">{ROTULO_BARRA[p.k]}</span>
                <span className="num">{formatarNumero(p.v)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function quemOuCliente(p: PlacaV) {
  if (p.cliente_nome) return `${p.cliente_nome}${p.venda_codigo ? ` · ${p.venda_codigo}` : ''}`;
  if (p.status === 'demonstracao' && p.responsavel_nome) return `com ${p.responsavel_nome}`;
  return '—';
}

function linkResumo(p: PlacaV) {
  if (!p.destino_url) return 'sem destino';
  try {
    const u = new URL(p.destino_url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return p.destino_url;
  }
}

function AbaPlacas({ aoAbrir }: { aoAbrir: (p: PlacaV) => void }) {
  const q = usePlacas();
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const lista = useMemo(() => {
    const t = normalizar(busca);
    return (q.data ?? []).filter(
      (p) =>
        (!status || p.status === status) &&
        (!t || [p.codigo, p.cliente_nome, p.destino_url, p.responsavel_nome, p.venda_codigo].some((x) => normalizar(x ?? '').includes(t))),
    );
  }, [q.data, status, busca]);

  if (q.isLoading) return <Carregando linhas={5} />;
  if (q.isError) return <ErroCarga erro={q.error} tentarDeNovo={() => void q.refetch()} />;
  if (!q.data?.length) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row">
        <div className="relative md:w-80">
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
          <Entrada type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Código, cliente ou link" aria-label="Buscar placas" className="pl-[36px]" />
        </div>
        <div className="md:w-56">
          <Selecao value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Todos os status</option>
            {STATUS_PLACA.map((s) => (
              <option key={s} value={s}>
                {ROTULO_STATUS_PLACA[s]}
              </option>
            ))}
          </Selecao>
        </div>
      </div>
      {!lista.length ? (
        <Vazio icone={Package} titulo="Nenhuma placa com esses filtros" texto="Limpe a busca ou escolha outro status." />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg bg-surface shadow-(--shadow-sm) md:block">
            <table className="w-full text-md">
              <thead className="text-left text-xs text-text-muted">
                <tr className="border-b border-divider">
                  <th className="px-4 py-3 font-normal">Código</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                  <th className="px-4 py-3 font-normal">Lote</th>
                  <th className="px-4 py-3 font-normal">Cliente ou responsável</th>
                  <th className="px-4 py-3 font-normal">Destino</th>
                  <th className="px-4 py-3 font-normal">Gravada</th>
                  <th className="px-4 py-3 font-normal">Atualizada em</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => {
                  const s = seloPlaca(p.status);
                  return (
                    <tr key={p.id} className="cursor-pointer border-b border-divider last:border-0 hover:bg-accent-soft" onClick={() => aoAbrir(p)}>
                      <td className="px-4 py-2">
                        <button type="button" className="num font-medium underline-offset-2 hover:underline" onClick={() => aoAbrir(p)}>
                          {p.codigo}
                        </button>
                      </td>
                      <td className="px-4 py-2"><Selo icone={s.icone} texto={s.texto} tom={s.tom} /></td>
                      <td className="num px-4 py-2 text-text-muted">{p.lote_codigo}</td>
                      <td className="max-w-64 truncate px-4 py-2">{quemOuCliente(p)}</td>
                      <td className={cn('max-w-56 truncate px-4 py-2', p.destino_url ? 'text-accent-text' : 'text-text-muted')}>{linkResumo(p)}</td>
                      <td className="px-4 py-2 text-text-muted">{p.gravada_em ? formatarDataHora(p.gravada_em) : 'não'}</td>
                      <td className="num px-4 py-2 text-text-muted">{formatarDataHora(p.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-2 md:hidden">
            {lista.map((p) => {
              const s = seloPlaca(p.status);
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => aoAbrir(p)} className="flex w-full items-center gap-3 rounded-md bg-surface p-4 text-left shadow-(--shadow-sm)">
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center gap-2">
                        <span className="num font-medium">{p.codigo}</span>
                        <Selo icone={s.icone} texto={s.texto} tom={s.tom} />
                      </span>
                      <span className="truncate text-sm text-text-muted">{quemOuCliente(p)}</span>
                      <span className="truncate text-sm text-text-muted">
                        {p.lote_codigo} · {p.gravada_em ? 'gravada' : 'não gravada'} · {linkResumo(p)}
                      </span>
                    </span>
                    <CaretRight size={18} className="shrink-0 text-text-muted" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function AbaLotes() {
  const q = useLotes();
  const det = useLotesDetalhe();
  const [editar, setEditar] = useState<{ id: string; codigo: string | null; fornecedor: string; observacoes: string | null } | null>(null);
  if (q.isLoading) return <Carregando linhas={3} />;
  if (q.isError) return <ErroCarga erro={q.error} tentarDeNovo={() => void q.refetch()} />;
  if (!q.data?.length) return null;
  return (
    <>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {q.data.map((l) => {
          const d = det.data?.find((x) => x.id === l.id);
          const comVoces = (l.disponiveis ?? 0) + (l.demonstracao ?? 0);
          return (
            <li key={l.id} className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-(--shadow-sm)">
              <div className="flex items-start gap-2">
                <div className="flex flex-1 flex-col">
                  <span className="num font-medium">{l.codigo}</span>
                  <span className="text-sm text-text-muted">
                    {l.fornecedor} · comprado em {formatarData(l.data_compra)}
                  </span>
                </div>
                <Botao
                  variante="fantasma"
                  tamanho="icone"
                  aria-label={`Editar ${l.codigo}`}
                  onClick={() => setEditar({ id: l.id!, codigo: l.codigo, fornecedor: d?.fornecedor ?? l.fornecedor ?? '', observacoes: d?.observacoes ?? null })}
                >
                  <PencilSimple size={18} aria-hidden />
                </Botao>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div><dt className="text-text-muted">Placas</dt><dd className="num">{formatarNumero(l.quantidade)}</dd></div>
                <div><dt className="text-text-muted">Total</dt><dd className="num">{formatarMoeda(l.custo_total)}</dd></div>
                <div><dt className="text-text-muted">Por placa</dt><dd className="num">{formatarMoeda(l.custo_por_placa)}</dd></div>
                <div><dt className="text-text-muted">Pago</dt><dd className="num">{formatarMoeda(l.valor_pago)}</dd></div>
                <div><dt className="text-text-muted">Frete</dt><dd className="num">{formatarMoeda(l.frete)}</dd></div>
                <div><dt className="text-text-muted">Taxas</dt><dd className="num">{formatarMoeda(l.outras_taxas)}</dd></div>
              </dl>
              <p className="text-sm text-text-muted">
                {formatarNumero(l.disponiveis)} disponíveis · {formatarNumero(l.em_clientes)} em clientes · {formatarNumero(l.demonstracao)} em demonstração · {formatarNumero(l.perdas)} perdas
                {comVoces === 0 ? ' · lote esgotado' : ''}
              </p>
              {d?.observacoes ? <p className="text-sm whitespace-pre-wrap">{d.observacoes}</p> : null}
            </li>
          );
        })}
      </ul>
      <EditarLote lote={editar} aoFechar={() => setEditar(null)} />
    </>
  );
}

type Aba = 'placas' | 'lotes';

export default function PaginaEstoque() {
  const [params, setParams] = useSearchParams();
  const aba = (params.get('aba') as Aba) ?? 'placas';
  const placas = usePlacas();
  const lotes = useLotes();
  const resumo = useResumoEstoque();
  const [registrar, setRegistrar] = useState(params.get('registrar') === '1');
  const [gravar, setGravar] = useState<{ aberto: boolean; placa: PlacaV | null }>({ aberto: false, placa: null });
  const [ajustar, setAjustar] = useState<PlacaV | null>(null);

  const idPlaca = params.get('placa');
  const ficha = idPlaca ? (placas.data?.find((p) => p.id === idPlaca) ?? null) : null;
  const mudar = (fn: (p: URLSearchParams) => void) =>
    setParams((p) => {
      fn(p);
      return p;
    });

  const semNada = !placas.isLoading && !lotes.isLoading && !placas.data?.length && !lotes.data?.length;

  return (
    <>
      <Cabecalho
        titulo="Estoque"
        resumo={resumo.data ? `${formatarNumero(resumo.data.total)} placas em ${formatarNumero(lotes.data?.length ?? 0)} ${lotes.data?.length === 1 ? "lote" : "lotes"}` : undefined}
        acoes={
          <>
            <Botao onClick={() => setGravar({ aberto: true, placa: null })} disabled={!placas.data?.length}>
              <PencilSimpleLine size={18} aria-hidden />
              Gravar link
            </Botao>
            <Botao variante="principal" className="hidden md:inline-flex" onClick={() => setRegistrar(true)}>
              <Plus size={18} aria-hidden />
              Registrar lote
            </Botao>
          </>
        }
      />

      {semNada ? (
        <Vazio
          icone={Package}
          titulo="Nenhuma placa no estoque ainda"
          texto="Registre o primeiro lote comprado: o app cria as placas com código AP- e lança a compra no Financeiro."
          acao={
            <Botao variante="principal" onClick={() => setRegistrar(true)}>
              <Plus size={18} aria-hidden />
              Registrar lote
            </Botao>
          }
        />
      ) : (
        <>
          <Resumo />
          <Abas<Aba>
            rotulo="Estoque"
            valor={aba}
            aoMudar={(v) => mudar((p) => p.set('aba', v))}
            abas={[
              { valor: 'placas', rotulo: 'Placas', contagem: placas.data?.length },
              { valor: 'lotes', rotulo: 'Lotes', contagem: lotes.data?.length },
            ]}
          />
          {aba === 'lotes' ? <AbaLotes /> : <AbaPlacas aoAbrir={(p) => mudar((x) => x.set('placa', p.id!))} />}
        </>
      )}

      <AcaoFixa>
        <Botao variante="principal" tamanho="bloco" onClick={() => setRegistrar(true)}>
          <Plus size={18} aria-hidden />
          Registrar lote
        </Botao>
      </AcaoFixa>

      <RegistrarLote
        aberto={registrar}
        aoMudar={(v) => {
          setRegistrar(v);
          if (!v && params.get('registrar')) mudar((p) => p.delete('registrar'));
        }}
      />
      <GravarLink aberto={gravar.aberto} aoMudar={(v) => setGravar((g) => ({ ...g, aberto: v }))} placaInicial={gravar.placa} />
      <AjustarPlaca placa={ajustar} aoFechar={() => setAjustar(null)} />
      {ficha && !gravar.aberto && !ajustar ? (
        <FichaPlaca
          placa={ficha}
          aoFechar={() => mudar((p) => p.delete('placa'))}
          aoGravar={(p) => setGravar({ aberto: true, placa: p })}
          aoAjustar={(p) => setAjustar(p)}
        />
      ) : null}
    </>
  );
}
