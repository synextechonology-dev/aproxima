import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FolderSimple, FunnelSimple, HourglassMedium } from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { estiloBotao } from '@/components/ui/botao-estilo';
import { Abas, Segmentado } from '@/components/abas';
import { Cabecalho } from '@/components/layout';
import { Carregando, ErroCarga, Vazio } from '@/components/estados';
import { Selo } from '@/components/selo';
import { useMembrosAtivos } from '@/hooks/useBase';
import { ROTULO_STATUS_PROJETO, ROTULO_UPSELL, type StatusProjeto, type StatusUpsell } from '@/lib/rotulos';
import { formatarNumero } from '@/lib/formato';
import { cn } from '@/lib/utils';
import { ICONE_STATUS_PROJETO, seloPrazo } from './status';
import { useProjetos, type ProjetoV } from './dados';

const COLUNAS: StatusProjeto[] = ['a_entregar', 'em_andamento', 'aguardando_cliente', 'entregue'];
const ABERTOS = ['oferecido', 'proposta_enviada', 'em_negociacao'];

function textoUpsell(p: ProjetoV) {
  const partes: string[] = [];
  if (ABERTOS.includes(p.upsell_site ?? '')) partes.push(`site ${ROTULO_UPSELL[p.upsell_site as StatusUpsell].toLowerCase()}`);
  if (ABERTOS.includes(p.upsell_google ?? '')) partes.push(`otimização ${ROTULO_UPSELL[p.upsell_google as StatusUpsell].toLowerCase()}`);
  return partes.join(' · ');
}

function Cartao({ p }: { p: ProjetoV }) {
  const prazo = seloPrazo(p);
  const up = textoUpsell(p);
  return (
    <Link to={`/projetos/${p.id}`} className="flex flex-col gap-1.5 rounded-md bg-surface p-3 shadow-(--shadow-sm) hover:shadow-(--shadow-md)">
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{p.cliente_nome}</span>
        <span className="num text-xs text-text-muted">{p.venda_codigo}</span>
      </span>
      <span className="text-sm text-text-muted">{p.itens_resumo ?? '—'}</span>
      {p.pendencias_abertas ? (
        <span className="flex items-center gap-1 text-sm text-hoje-fg">
          <HourglassMedium size={14} aria-hidden />
          {formatarNumero(p.pendencias_abertas)} {p.pendencias_abertas === 1 ? 'pendência do cliente' : 'pendências do cliente'}
        </span>
      ) : null}
      <span className="flex flex-wrap items-center gap-2">
        <Selo icone={prazo.icone} texto={prazo.texto} tom={prazo.tom} />
        <span className="num text-xs text-text-muted">
          {formatarNumero(p.tarefas_feitas)} de {formatarNumero(p.tarefas_total)}
        </span>
      </span>
      {up ? (
        <span className="flex items-center gap-1 text-sm text-accent-text">
          <ArrowUpRight size={14} aria-hidden />
          upsell: {up}
        </span>
      ) : null}
    </Link>
  );
}

export default function PaginaProjetos() {
  const q = useProjetos();
  const { data: membros } = useMembrosAtivos();
  const [dono, setDono] = useState('todos');
  const [soUpsell, setSoUpsell] = useState(false);
  const [cancelados, setCancelados] = useState(false);
  const [aba, setAba] = useState<StatusProjeto>('em_andamento');

  const filtrados = useMemo(
    () => (q.data ?? []).filter((p) => (dono === 'todos' || p.responsavel_id === dono) && (!soUpsell || p.upsell_em_aberto)),
    [q.data, dono, soUpsell],
  );
  const por = (s: StatusProjeto) => filtrados.filter((p) => p.status === s);
  const abertos = filtrados.filter((p) => ['a_entregar', 'em_andamento', 'aguardando_cliente'].includes(p.status ?? ''));
  const vencidos = abertos.filter((p) => p.atrasado).length;
  const upsells = filtrados.filter((p) => p.upsell_em_aberto).length;
  const colunas = cancelados ? [...COLUNAS, 'cancelado' as const] : COLUNAS;

  return (
    <>
      <Cabecalho
        titulo="Projetos"
        resumo={
          q.data
            ? `${formatarNumero(abertos.length)} em aberto · ${formatarNumero(vencidos)} com prazo vencido · ${formatarNumero(upsells)} ${upsells === 1 ? 'upsell em aberto' : 'upsells em aberto'}`
            : undefined
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Segmentado
          rotulo="Responsável"
          valor={dono}
          aoMudar={setDono}
          opcoes={[{ valor: 'todos', rotulo: 'Todos' }, ...(membros ?? []).map((m) => ({ valor: m.user_id, rotulo: m.nome }))]}
        />
        <Botao aria-pressed={soUpsell} onClick={() => setSoUpsell((v) => !v)} className={cn(soUpsell && 'border-accent bg-accent-soft text-accent-text')}>
          <FunnelSimple size={18} aria-hidden />
          Só com upsell em aberto
        </Botao>
        <Botao aria-pressed={cancelados} variante="fantasma" onClick={() => setCancelados((v) => !v)}>
          {cancelados ? 'Esconder cancelados' : 'Mostrar cancelados'}
        </Botao>
      </div>

      {q.isLoading ? (
        <Carregando linhas={6} />
      ) : q.isError ? (
        <ErroCarga erro={q.error} tentarDeNovo={() => void q.refetch()} />
      ) : !q.data?.length ? (
        <Vazio
          icone={FolderSimple}
          titulo="Nenhum projeto ainda"
          texto="O projeto nasce sozinho quando uma venda é confirmada, com checklist e revisões de 30, 60 e 90 dias."
          acao={<Link to="/vendas/nova" className={estiloBotao({ variante: 'principal' })}>Registrar venda</Link>}
        />
      ) : (
        <>
          <div className="hidden gap-3 overflow-x-auto pb-2 md:flex">
            {colunas.map((s) => {
              const Icone = ICONE_STATUS_PROJETO[s];
              const itens = por(s);
              return (
                <section key={s} aria-label={ROTULO_STATUS_PROJETO[s]} className="flex w-[270px] shrink-0 flex-col gap-2">
                  <h2 className="flex items-center gap-2 px-1 text-sm font-medium">
                    <Icone size={16} aria-hidden />
                    {ROTULO_STATUS_PROJETO[s]}
                    <span className="num font-normal text-text-muted">{itens.length}</span>
                  </h2>
                  <div className="flex max-h-[calc(100dvh-240px)] flex-col gap-2 overflow-y-auto p-1">
                    {itens.length ? itens.map((p) => <Cartao key={p.id} p={p} />) : <p className="rounded-md border border-dashed border-divider p-3 text-sm text-text-muted">Nenhum projeto.</p>}
                  </div>
                </section>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            <Abas<StatusProjeto>
              rotulo="Status"
              valor={aba}
              aoMudar={setAba}
              abas={colunas.map((s) => ({ valor: s, rotulo: ROTULO_STATUS_PROJETO[s], contagem: por(s).length }))}
            />
            {por(aba).length ? (
              <div className="flex flex-col gap-2">{por(aba).map((p) => <Cartao key={p.id} p={p} />)}</div>
            ) : (
              <Vazio icone={FolderSimple} titulo="Nenhum projeto nesta etapa" />
            )}
          </div>
        </>
      )}
    </>
  );
}
