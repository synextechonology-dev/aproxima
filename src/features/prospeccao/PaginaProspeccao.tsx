import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowCounterClockwise,
  CaretRight,
  DotsThreeOutline,
  DownloadSimple,
  Kanban,
  MagnifyingGlass,
  MapPin,
  Plus,
  UploadSimple,
} from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { Entrada, Selecao } from '@/components/ui/campos';
import { ConteudoMenu, GatilhoMenu, ItemMenu, Menu } from '@/components/ui/menu';
import { Abas, Segmentado } from '@/components/abas';
import { AcaoFixa, Cabecalho } from '@/components/layout';
import { Carregando, ErroCarga, Vazio } from '@/components/estados';
import { Selo } from '@/components/selo';
import { NotaGoogle } from '@/components/NotaGoogle';
import { useMembrosAtivos, useNomeMembro } from '@/hooks/useBase';
import type { Cliente } from '@/lib/tipos';
import { ETAPAS, ROTULO_ETAPA, ROTULO_MOTIVO_DESCARTE, rotulo, type Etapa } from '@/lib/rotulos';
import { formatarDataHora, formatarNumero, hojeSP } from '@/lib/formato';
import { baixarCsv, numCsv } from '@/lib/csv';
import { digitos, normalizar, cn } from '@/lib/utils';
import { situacaoFollowup } from './followup';
import { useLeads, useMudarEtapa } from './dados';
import { FichaLead } from './FichaLead';
import { FormLead } from './FormLead';
import { ImportarCsv } from './ImportarCsv';

const COR_ETAPA: Record<Etapa, string> = {
  a_prospectar: 'bg-neutral-600',
  prospectado: 'bg-neutral-400',
  follow_up: 'bg-accent',
  negociacao: 'bg-accent-300',
  cliente: 'bg-ok-fg',
  descartado: 'bg-neutral-700',
};

function CartaoLead({ c, aoAbrir, selecionado }: { c: Cliente; aoAbrir: () => void; selecionado?: boolean }) {
  const fu = situacaoFollowup(c);
  return (
    <button
      type="button"
      onClick={aoAbrir}
      className={cn(
        'flex w-full flex-col gap-1.5 rounded-md bg-surface p-3 text-left shadow-(--shadow-sm) hover:shadow-(--shadow-md)',
        selecionado && 'shadow-[0_0_0_1px_var(--color-accent)]',
        c.etapa === 'descartado' && 'opacity-70',
      )}
    >
      <span className="font-medium">{c.nome}</span>
      <span className="flex items-center gap-1 text-sm text-text-muted">
        <MapPin size={14} aria-hidden />
        {c.cidade}
      </span>
      <NotaGoogle nota={c.nota_google} avaliacoes={c.avaliacoes_google} curto />
      <Selo icone={fu.icone} texto={fu.texto} tom={fu.tom} className="self-start" />
    </button>
  );
}

function LinhaCelular({ c, aoAbrir }: { c: Cliente; aoAbrir: () => void }) {
  const fu = situacaoFollowup(c);
  return (
    <li>
      <button type="button" onClick={aoAbrir} className="flex w-full items-center gap-3 rounded-md bg-surface p-4 text-left shadow-(--shadow-sm)">
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-medium">{c.nome}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <NotaGoogle nota={c.nota_google} avaliacoes={c.avaliacoes_google} curto />
            <span className="text-md text-text-muted">· {c.cidade}</span>
          </span>
          <Selo icone={fu.icone} texto={fu.texto} tom={fu.tom} className="self-start" />
        </span>
        <CaretRight size={18} className="shrink-0 text-text-muted" aria-hidden />
      </button>
    </li>
  );
}

function LinhaDescartado({ c, aoAbrir }: { c: Cliente; aoAbrir: () => void }) {
  const mudar = useMudarEtapa();
  return (
    <li className="flex items-center gap-3 rounded-md bg-surface p-4 shadow-(--shadow-sm)">
      <button type="button" onClick={aoAbrir} className="flex min-w-0 flex-1 flex-col gap-1 text-left">
        <span className="truncate font-medium">{c.nome}</span>
        <span className="text-sm text-text-muted">
          {c.cidade} · descartado em {formatarDataHora(c.descartado_em)}
        </span>
        <span className="text-sm text-text-muted">{rotulo(ROTULO_MOTIVO_DESCARTE, c.motivo_descarte)}</span>
      </button>
      <Botao
        onClick={() => mudar.mutate({ id: c.id, etapa: 'a_prospectar' })}
        carregando={mudar.isPending}
        aria-label={`Reativar ${c.nome} em A prospectar`}
      >
        <ArrowCounterClockwise size={18} aria-hidden />
        Reativar
      </Botao>
    </li>
  );
}

function exportar(leads: Cliente[], nome: (id: string | null) => string) {
  baixarCsv(
    `leads-aproxima-${hojeSP()}.csv`,
    leads.map((c) => ({
      codigo: c.codigo,
      nome: c.nome,
      cidade: c.cidade,
      segmento: c.segmento ?? '',
      etapa: c.etapa,
      telefone: c.telefone ?? '',
      email: c.email ?? '',
      contato_nome: c.contato_nome ?? '',
      endereco: c.endereco ?? '',
      google_url: c.google_url ?? '',
      nota_google: numCsv(c.nota_google),
      avaliacoes_google: c.avaliacoes_google ?? '',
      instagram: c.instagram ?? '',
      tem_site: c.tem_site === null ? '' : c.tem_site ? 'sim' : 'não',
      site_url: c.site_url ?? '',
      origem: c.origem ?? '',
      interesse: c.interesse ?? '',
      proximo_followup: c.proximo_followup ?? '',
      motivo_descarte: c.motivo_descarte ?? '',
      responsavel: c.responsavel_id ? nome(c.responsavel_id) : '',
      observacoes: c.observacoes ?? '',
    })),
  );
}

type Aba = 'todas' | Etapa;

export default function PaginaProspeccao() {
  const [params, setParams] = useSearchParams();
  const leads = useLeads();
  const { data: membros } = useMembrosAtivos();
  const nome = useNomeMembro();
  const [dono, setDono] = useState('todos');
  const [cidade, setCidade] = useState('');
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<Aba>('todas');
  const [novo, setNovo] = useState<{ aberto: boolean; etapa: Etapa }>({ aberto: false, etapa: 'a_prospectar' });
  const [importar, setImportar] = useState(false);

  const idFicha = params.get('lead');
  const abrir = (id: string) => setParams((p) => { p.set('lead', id); return p; });
  const fechar = () => setParams((p) => { p.delete('lead'); return p; });

  const todos = useMemo(() => leads.data ?? [], [leads.data]);
  const cidades = useMemo(() => [...new Set(todos.map((c) => c.cidade))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [todos]);

  const filtrados = useMemo(() => {
    const t = normalizar(busca);
    const d = digitos(busca);
    return todos.filter((c) => {
      if (dono !== 'todos' && c.responsavel_id !== dono) return false;
      if (cidade && c.cidade !== cidade) return false;
      if (t) {
        const casa =
          normalizar(c.nome).includes(t) ||
          normalizar(c.codigo ?? '').includes(t) ||
          (d.length >= 3 && digitos(c.telefone).includes(d));
        if (!casa) return false;
      }
      return true;
    });
  }, [todos, dono, cidade, busca]);

  const porEtapa = useMemo(() => {
    const m = Object.fromEntries(ETAPAS.map((e) => [e, [] as Cliente[]])) as Record<Etapa, Cliente[]>;
    for (const c of filtrados) m[c.etapa as Etapa]?.push(c);
    return m;
  }, [filtrados]);

  const ativos = filtrados.filter((c) => c.etapa !== 'cliente' && c.etapa !== 'descartado');
  const hoje = hojeSP();
  const vencidos = ativos.filter((c) => c.proximo_followup && c.proximo_followup < hoje).length;
  const ficha = idFicha ? (todos.find((c) => c.id === idFicha) ?? null) : null;

  const listaCelular = aba === 'todas' ? filtrados.filter((c) => c.etapa !== 'descartado') : porEtapa[aba];

  const acoesArquivo = (
    <>
      <Botao onClick={() => setImportar(true)}>
        <UploadSimple size={18} aria-hidden />
        Importar CSV
      </Botao>
      <Botao onClick={() => exportar(filtrados, nome)} disabled={!filtrados.length}>
        <DownloadSimple size={18} aria-hidden />
        Exportar CSV
      </Botao>
    </>
  );

  return (
    <>
      <Cabecalho
        titulo="Prospecção"
        resumo={
          leads.data
            ? `${formatarNumero(ativos.length)} leads ativos · ${formatarNumero(vencidos)} ${vencidos === 1 ? 'follow-up vencido' : 'follow-ups vencidos'}`
            : undefined
        }
        acoes={
          <>
            <div className="hidden gap-2 md:flex">{acoesArquivo}</div>
            <Botao variante="principal" className="hidden md:inline-flex" onClick={() => setNovo({ aberto: true, etapa: 'a_prospectar' })}>
              <Plus size={18} aria-hidden />
              Novo lead
            </Botao>
            <div className="md:hidden">
              <Menu>
                <GatilhoMenu asChild>
                  <Botao aria-label="Importar ou exportar CSV">
                    <DotsThreeOutline size={18} aria-hidden />
                    CSV
                  </Botao>
                </GatilhoMenu>
                <ConteudoMenu>
                  <ItemMenu aoEscolher={() => setImportar(true)}>
                    <UploadSimple size={18} aria-hidden /> Importar CSV
                  </ItemMenu>
                  <ItemMenu aoEscolher={() => exportar(filtrados, nome)} disabled={!filtrados.length}>
                    <DownloadSimple size={18} aria-hidden /> Exportar CSV
                  </ItemMenu>
                </ConteudoMenu>
              </Menu>
            </div>
          </>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <div className="relative md:w-72">
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
          <Entrada
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nome, telefone ou código"
            aria-label="Buscar leads"
            className="pl-[36px]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmentado
            rotulo="Responsável"
            valor={dono}
            aoMudar={setDono}
            opcoes={[{ valor: 'todos', rotulo: 'Todos' }, ...(membros ?? []).map((m) => ({ valor: m.user_id, rotulo: m.nome }))]}
          />
          <div className="min-w-44">
            <Selecao value={cidade} onChange={(e) => setCidade(e.target.value)} aria-label="Cidade">
              <option value="">Todas as cidades</option>
              {cidades.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Selecao>
          </div>
        </div>
      </div>

      {leads.isLoading ? (
        <Carregando linhas={6} />
      ) : leads.isError ? (
        <ErroCarga erro={leads.error} tentarDeNovo={() => void leads.refetch()} />
      ) : !todos.length ? (
        <Vazio
          icone={Kanban}
          titulo="Nenhum lead ainda"
          texto="Cadastre o primeiro ou importe um CSV com a sua lista."
          acao={
            <>
              <Botao variante="principal" onClick={() => setNovo({ aberto: true, etapa: 'a_prospectar' })}>
                <Plus size={18} aria-hidden />
                Cadastrar lead
              </Botao>
              <Botao onClick={() => setImportar(true)}>
                <UploadSimple size={18} aria-hidden />
                Importar CSV
              </Botao>
            </>
          }
        />
      ) : (
        <>
          {/* Computador: kanban por etapa */}
          <div className="-mx-8 hidden overflow-x-auto px-8 pb-2 md:block">
            <div className="flex min-h-[60vh] gap-3">
              {ETAPAS.map((etapa) => {
                const itens = porEtapa[etapa];
                return (
                  <section key={etapa} aria-label={ROTULO_ETAPA[etapa]} className="flex w-[232px] shrink-0 flex-col gap-2">
                    <div className="flex min-h-[28px] items-center gap-2 px-1 text-sm">
                      <span className={cn('size-[8px] rounded-full', COR_ETAPA[etapa])} aria-hidden />
                      <h2 className="font-medium">{ROTULO_ETAPA[etapa]}</h2>
                      <span className="num text-text-muted">{itens.length}</span>
                      {etapa !== 'cliente' ? (
                        <button
                          type="button"
                          onClick={() => setNovo({ aberto: true, etapa })}
                          className="ml-auto inline-flex size-[28px] items-center justify-center rounded-sm text-text-muted hover:text-text"
                          aria-label={`Novo lead em ${ROTULO_ETAPA[etapa]}`}
                        >
                          <Plus size={16} aria-hidden />
                        </button>
                      ) : null}
                    </div>
                    <div className="flex max-h-[calc(100dvh-260px)] flex-col gap-2 overflow-y-auto p-1">
                      {itens.length ? (
                        itens.map((c) => <CartaoLead key={c.id} c={c} aoAbrir={() => abrir(c.id)} selecionado={c.id === idFicha} />)
                      ) : (
                        <p className="rounded-md border border-dashed border-divider p-3 text-sm text-text-muted">
                          {etapa === 'cliente' ? 'Vira cliente quando uma venda é confirmada.' : 'Nenhum lead nesta etapa.'}
                        </p>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          {/* Celular: abas por etapa */}
          <div className="flex flex-col gap-3 md:hidden">
            <Abas<Aba>
              rotulo="Etapas"
              valor={aba}
              aoMudar={setAba}
              abas={[
                { valor: 'todas', rotulo: 'Todas', contagem: filtrados.filter((c) => c.etapa !== 'descartado').length },
                ...ETAPAS.map((e) => ({ valor: e, rotulo: ROTULO_ETAPA[e], contagem: porEtapa[e].length })),
              ]}
            />
            {listaCelular.length ? (
              <ul className="flex flex-col gap-2">
                {listaCelular.map((c) =>
                  aba === 'descartado' ? (
                    <LinhaDescartado key={c.id} c={c} aoAbrir={() => abrir(c.id)} />
                  ) : (
                    <LinhaCelular key={c.id} c={c} aoAbrir={() => abrir(c.id)} />
                  ),
                )}
              </ul>
            ) : (
              <Vazio
                icone={Kanban}
                titulo={filtrados.length ? 'Nenhum lead nesta etapa' : 'Nenhum lead com esses filtros'}
                texto={busca || cidade || dono !== 'todos' ? 'Limpe a busca ou os filtros para ver todos.' : undefined}
              />
            )}
          </div>

          {/* Computador: descartados também em lista, com Reativar */}
          {porEtapa.descartado.length ? (
            <details className="hidden rounded-lg bg-surface p-4 shadow-(--shadow-sm) md:block">
              <summary className="cursor-pointer font-medium">
                Descartados ({formatarNumero(porEtapa.descartado.length)}): ver motivos e reativar
              </summary>
              <ul className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-3">
                {porEtapa.descartado.map((c) => (
                  <LinhaDescartado key={c.id} c={c} aoAbrir={() => abrir(c.id)} />
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}

      <AcaoFixa>
        <Botao variante="principal" tamanho="bloco" onClick={() => setNovo({ aberto: true, etapa: 'a_prospectar' })}>
          <Plus size={18} aria-hidden />
          Novo lead
        </Botao>
      </AcaoFixa>

      <FichaLead lead={ficha} aoFechar={fechar} />
      <FormLead
        aberto={novo.aberto}
        aoMudar={(v) => setNovo((n) => ({ ...n, aberto: v }))}
        lead={null}
        etapaInicial={novo.etapa}
        aoSalvar={(c) => abrir(c.id)}
      />
      <ImportarCsv aberto={importar} aoMudar={setImportar} />
    </>
  );
}
