import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChatCircleText,
  CheckCircle,
  Clock,
  FolderSimple,
  HourglassMedium,
  Info,
  Package,
  Plus,
  Star,
  Wallet,
  WarningCircle,
  WhatsappLogo,
  type Icon,
} from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { Campo, Selecao } from '@/components/ui/campos';
import { Segmentado } from '@/components/abas';
import { Indicador, Secao } from '@/components/layout';
import { Carregando, ErroCarga, Vazio } from '@/components/estados';
import { Selo, type Tom } from '@/components/selo';
import { useAuth } from '@/app/auth-contexto';
import { useMembrosAtivos } from '@/hooks/useBase';
import { supabase } from '@/lib/supabase';
import {
  diasEntre,
  formatarData,
  formatarMoeda,
  formatarNumero,
  formatarPct,
  hojeSP,
  limitesDoMes,
  nomeDiaSemana,
  nomeMes,
  somarDias,
  somarMeses,
} from '@/lib/formato';
import { ROTULO_CATEGORIA_PRODUTO, ROTULO_ETAPA, ROTULO_MOTIVO_DESCARTE, rotulo } from '@/lib/rotulos';
import { abrirExterno, linkWhatsApp } from '@/lib/contato';
import { num } from '@/lib/utils';
import type { Visao } from '@/lib/tipos';
import { useCidadesClientes, useIndicadores, usePraFazerHoje, type Indicadores } from './dados';
import { BarrasHorizontais, BarrasMensais } from './Barras';

type Periodo = 'mes' | 'anterior' | '90';

/** Período escolhido e o período de comparação imediatamente anterior. */
function periodos(p: Periodo, hoje: string) {
  if (p === '90') {
    const inicio = somarDias(hoje, -89);
    return { atual: { inicio, fim: hoje }, anterior: { inicio: somarDias(inicio, -90), fim: somarDias(inicio, -1) }, nome: 'últimos 90 dias', nomeAnterior: '90 dias antes' };
  }
  if (p === 'anterior') {
    const atual = limitesDoMes(somarMeses(hoje, -1));
    const ant = limitesDoMes(somarMeses(hoje, -2));
    return { atual, anterior: ant, nome: nomeMes(Number(atual.inicio.slice(5, 7))), nomeAnterior: nomeMes(Number(ant.inicio.slice(5, 7))) };
  }
  // Este mês até hoje x mês anterior até o mesmo dia
  const inicio = limitesDoMes(hoje).inicio;
  const antInicio = somarMeses(hoje, -1);
  const antLim = limitesDoMes(antInicio);
  const mesmoDia = `${antInicio.slice(0, 8)}${hoje.slice(8, 10)}`;
  const antFim = mesmoDia > antLim.fim ? antLim.fim : mesmoDia;
  return { atual: { inicio, fim: hoje }, anterior: { inicio: antLim.inicio, fim: antFim }, nome: 'este mês', nomeAnterior: `${nomeMes(Number(antLim.inicio.slice(5, 7)))} até o dia ${Number(antFim.slice(8, 10))}` };
}

const TIPOS: Record<string, { rotulo: string; icone: Icon; acao: string; acaoIcone: Icon }> = {
  follow_up: { rotulo: 'Follow-up', icone: ChatCircleText, acao: 'Abrir lead', acaoIcone: ArrowRight },
  projeto_atrasado: { rotulo: 'Projeto atrasado', icone: FolderSimple, acao: 'Abrir projeto', acaoIcone: ArrowRight },
  aguardando_cliente: { rotulo: 'Aguardando cliente', icone: HourglassMedium, acao: 'Abrir projeto', acaoIcone: ArrowRight },
  revisao: { rotulo: 'Revisão', icone: Star, acao: 'Registrar revisão', acaoIcone: ArrowRight },
  upsell: { rotulo: 'Upsell', icone: ArrowRight, acao: 'Abrir projeto', acaoIcone: ArrowRight },
  parcela_atrasada: { rotulo: 'Parcela atrasada', icone: Wallet, acao: 'Cobrar no WhatsApp', acaoIcone: WhatsappLogo },
  estoque_baixo: { rotulo: 'Estoque baixo', icone: Package, acao: 'Registrar lote', acaoIcone: Plus },
};

const GRAVIDADE: Record<string, { tom: Tom; icone: Icon; ordem: number }> = {
  atrasado: { tom: 'atrasado', icone: WarningCircle, ordem: 0 },
  hoje: { tom: 'hoje', icone: Clock, ordem: 1 },
  info: { tom: 'neutro', icone: Info, ordem: 2 },
};

type Item = Visao<'v_painel_hoje'>;

function quando(i: Item, hoje: string) {
  if (!i.quando) return '';
  if (i.tipo === 'estoque_baixo') return 'repor';
  const d = diasEntre(i.quando, hoje);
  if (d > 0) return `${i.tipo === 'aguardando_cliente' ? 'desde' : 'venceu'} ${formatarData(i.quando)}`;
  return 'hoje';
}

function PraFazerHoje() {
  const q = usePraFazerHoje();
  const { membro } = useAuth();
  const navegar = useNavigate();
  const [meus, setMeus] = useState<'todos' | 'meus'>('todos');
  const hoje = hojeSP();

  const lista = useMemo(
    () =>
      (q.data ?? [])
        .filter((i) => meus === 'todos' || !i.responsavel_id || i.responsavel_id === membro?.user_id)
        .sort((a, b) => (GRAVIDADE[a.gravidade ?? 'info']?.ordem ?? 3) - (GRAVIDADE[b.gravidade ?? 'info']?.ordem ?? 3) || (a.quando ?? '').localeCompare(b.quando ?? '')),
    [q.data, meus, membro?.user_id],
  );

  const agir = async (i: Item) => {
    switch (i.tipo) {
      case 'follow_up':
        return navegar(`/prospeccao?lead=${i.ref_id}`);
      case 'estoque_baixo':
        return navegar('/estoque?registrar=1');
      case 'parcela_atrasada': {
        const { data } = await supabase.from('lancamentos').select('descricao, valor, vencimento, clientes(telefone)').eq('id', i.ref_id!).maybeSingle();
        const wa = data
          ? linkWhatsApp(
              (data.clientes as { telefone: string | null } | null)?.telefone,
              `Olá! Tudo bem? Passando para lembrar de ${data.descricao}, no valor de ${formatarMoeda(data.valor)}, que venceu em ${formatarData(data.vencimento)}. Qualquer dúvida, é só chamar.`,
            )
          : null;
        if (wa) abrirExterno(wa);
        else navegar('/financeiro?aba=lancamentos');
        return;
      }
      default:
        return navegar(`/projetos/${i.ref_id}`);
    }
  };

  return (
    <Secao
      titulo="Pra fazer hoje"
      extra={
        <Segmentado
          rotulo="De quem"
          valor={meus}
          aoMudar={setMeus}
          opcoes={[
            { valor: 'todos', rotulo: 'Tudo' },
            { valor: 'meus', rotulo: 'Só os meus' },
          ]}
        />
      }
    >
      {q.isLoading ? (
        <Carregando linhas={3} />
      ) : q.isError ? (
        <ErroCarga erro={q.error} tentarDeNovo={() => void q.refetch()} />
      ) : !lista.length ? (
        <Vazio icone={CheckCircle} titulo="Nada pendente para hoje" texto="Follow-ups, revisões, parcelas e prazos vencidos aparecem aqui." className="py-6" />
      ) : (
        <ul className="flex flex-col divide-y divide-divider">
          {lista.map((i, n) => {
            const t = TIPOS[i.tipo ?? ''] ?? TIPOS.follow_up;
            const g = GRAVIDADE[i.gravidade ?? 'info'] ?? GRAVIDADE.info;
            const Acao = t.acaoIcone;
            return (
              <li key={`${i.tipo}-${i.ref_id}-${n}`} className="flex flex-col gap-2 py-3 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Selo icone={t.icone} texto={t.rotulo} tom={g.tom} className="mt-0.5 shrink-0" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{i.titulo}</span>
                    <span className="truncate text-sm text-text-muted">{i.detalhe}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:justify-end">
                  <span className="flex items-center gap-1 text-sm text-text-muted">
                    <g.icone size={14} aria-hidden />
                    {quando(i, hoje)}
                  </span>
                  <Botao className="ml-auto md:ml-0" onClick={() => void agir(i)}>
                    <Acao size={16} aria-hidden />
                    {t.acao}
                  </Botao>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Secao>
  );
}

function comparar(atual: number | null | undefined, ant: number | null | undefined, nome: string, f: (n: number | null | undefined) => string) {
  return `${nome}: ${f(ant)}${num(atual) !== null && num(ant) !== null ? (Number(atual) >= Number(ant) ? ' · subiu' : ' · caiu') : ''}`;
}

function Numeros({ a, b, nomeAnterior }: { a: Indicadores; b: Indicadores | undefined; nomeAnterior: string }) {
  return (
    <>
      {a.lucro_liquido_parcial ? (
        <p className="flex items-center gap-2 rounded-md bg-hoje-bg px-3 py-2 text-sm text-hoje-fg">
          <Info size={16} aria-hidden />
          Com filtro de vendedor ou cidade, o lucro líquido não desconta as despesas (é parcial).
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Indicador rotulo="Faturamento" valor={formatarMoeda(a.faturamento)} nota={b ? comparar(a.faturamento, b.faturamento, nomeAnterior, formatarMoeda) : undefined} />
        <Indicador rotulo={a.lucro_liquido_parcial ? 'Lucro (parcial)' : 'Lucro líquido'} valor={formatarMoeda(a.lucro_liquido)} nota={b ? comparar(a.lucro_liquido, b.lucro_liquido, nomeAnterior, formatarMoeda) : undefined} />
        <Indicador rotulo="Vendas" valor={formatarNumero(a.vendas)} nota={b ? comparar(a.vendas, b.vendas, nomeAnterior, formatarNumero) : undefined} />
        <Indicador rotulo="Ticket médio" valor={formatarMoeda(a.ticket_medio)} nota={b ? comparar(a.ticket_medio, b.ticket_medio, nomeAnterior, formatarMoeda) : undefined} />
        <Indicador rotulo="Placas vendidas" valor={formatarNumero(a.placas_vendidas)} nota={b ? comparar(a.placas_vendidas, b.placas_vendidas, nomeAnterior, formatarNumero) : undefined} />
        <Indicador
          rotulo="Conversão"
          valor={formatarPct(a.conversao_pct)}
          nota={`${formatarNumero(a.leads_viraram_cliente)} de ${formatarNumero(a.leads_periodo)} leads${b ? ` · ${nomeAnterior}: ${formatarPct(b.conversao_pct)}` : ''}`}
        />
      </div>
      <Secao titulo="Taxa de upsell">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex flex-col">
            <span className="num text-2xl font-medium">{formatarPct(a.taxa_upsell_pct)}</span>
            <span className="text-sm text-text-muted">
              {formatarNumero(a.clientes_com_servico)} de {formatarNumero(a.clientes_total)} clientes compraram otimização ou site além da placa
              {b ? ` · ${nomeAnterior}: ${formatarPct(b.taxa_upsell_pct)}` : ''}
            </span>
          </div>
          <ul className="flex flex-wrap gap-3 md:ml-auto">
            {a.servicos.length ? (
              a.servicos.map((s) => (
                <li key={s.categoria} className="rounded-md bg-bg px-3 py-2 text-md">
                  {rotulo(ROTULO_CATEGORIA_PRODUTO, s.categoria)} · <span className="num">{formatarNumero(s.vendas)} · {formatarMoeda(s.valor)}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-text-muted">Nenhum serviço vendido no período.</li>
            )}
          </ul>
        </div>
      </Secao>
    </>
  );
}

const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const moedaCurta = (n: number) => `R$ ${compacto.format(n)}`;

function rotuloMes(iso: string) {
  return nomeMes(Number(iso.slice(5, 7))).slice(0, 3);
}

export default function PaginaPainel() {
  const { membro } = useAuth();
  const { data: membros } = useMembrosAtivos();
  const cidades = useCidadesClientes();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [vendedor, setVendedor] = useState('');
  const [cidade, setCidade] = useState('');
  const hoje = hojeSP();
  const p = periodos(periodo, hoje);
  const atual = useIndicadores(p.atual.inicio, p.atual.fim, vendedor, cidade);
  const anterior = useIndicadores(p.anterior.inicio, p.anterior.fim, vendedor, cidade);
  const hora = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date()));
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const a = atual.data;

  return (
    <>
      <header className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <h1 className="text-xl font-medium md:text-2xl">{saudacao}, {membro?.nome}</h1>
          <p className="text-sm text-text-muted">{nomeDiaSemana(hoje)}, {formatarData(hoje)}</p>
        </div>
        <Segmentado<Periodo>
          rotulo="Período"
          valor={periodo}
          aoMudar={setPeriodo}
          opcoes={[
            { valor: 'mes', rotulo: 'Este mês' },
            { valor: 'anterior', rotulo: 'Mês passado' },
            { valor: '90', rotulo: 'Últimos 90 dias' },
          ]}
        />
      </header>

      <PraFazerHoje />

      <div className="flex flex-wrap items-end gap-2">
        <h2 className="mr-auto text-lg font-medium">Números de {p.nome}</h2>
        <Campo rotulo="Vendedor" className="w-40">
          <Selecao value={vendedor} onChange={(e) => setVendedor(e.target.value)}>
            <option value="">Todos</option>
            {membros?.map((m) => (
              <option key={m.user_id} value={m.user_id}>{m.nome}</option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Cidade" className="w-48">
          <Selecao value={cidade} onChange={(e) => setCidade(e.target.value)}>
            <option value="">Todas</option>
            {cidades.data?.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Selecao>
        </Campo>
      </div>

      {atual.isLoading ? (
        <Carregando linhas={4} />
      ) : atual.isError ? (
        <ErroCarga erro={atual.error} tentarDeNovo={() => void atual.refetch()} />
      ) : a ? (
        <>
          <Numeros a={a} b={anterior.data} nomeAnterior={p.nomeAnterior} />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Secao titulo="Funil por etapa" extra={<span className="text-sm text-text-muted">leads cadastrados no período, onde estão hoje</span>}>
              <BarrasHorizontais
                rotulo="Funil por etapa"
                vazio="Nenhum lead cadastrado no período."
                dados={a.leads_periodo ? (a.funil ?? []).map((f) => ({ rotulo: rotulo(ROTULO_ETAPA, f.etapa), valor: f.leads, texto: formatarNumero(f.leads) })) : []}
              />
            </Secao>
            <Secao titulo="Faturamento e lucro por mês" extra={<span className="text-sm text-text-muted">últimos 6 meses</span>}>
              <BarrasMensais formatar={(n) => formatarMoeda(n)} formatarCurto={moedaCurta} dados={a.por_mes.map((m) => ({ rotulo: rotuloMes(m.mes), faturamento: Number(m.faturamento), lucro: Number(m.lucro_liquido) }))} />
            </Secao>
            <Secao titulo="Vendas por cidade" extra={<span className="text-sm text-text-muted">{p.nome}</span>}>
              <BarrasHorizontais
                rotulo="Vendas por cidade"
                vazio="Nenhuma venda confirmada no período."
                dados={a.vendas_por_cidade.map((c) => ({ rotulo: c.cidade, valor: Number(c.faturamento), texto: formatarMoeda(c.faturamento), detalhe: `${formatarNumero(c.vendas)} ${c.vendas === 1 ? 'venda' : 'vendas'}` }))}
              />
            </Secao>
            <Secao titulo="Motivos de descarte" extra={<span className="text-sm text-text-muted">descartados no período</span>}>
              <BarrasHorizontais
                rotulo="Motivos de descarte"
                vazio="Nenhum lead descartado no período."
                dados={a.motivos_descarte.map((m) => ({ rotulo: rotulo(ROTULO_MOTIVO_DESCARTE, m.motivo, 'Sem motivo'), valor: m.leads, texto: formatarNumero(m.leads) }))}
              />
            </Secao>
          </div>
        </>
      ) : null}
    </>
  );
}
