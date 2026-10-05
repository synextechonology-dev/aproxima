import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowsClockwise,
  Browser,
  Check,
  ContactlessPayment,
  FolderSimple,
  GoogleLogo,
  Minus,
  Package,
  Plus,
  Storefront,
  Trash,
  XCircle,
  type Icon,
} from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { estiloBotao } from '@/components/ui/botao-estilo';
import { AreaTexto, Campo, Entrada, Selecao } from '@/components/ui/campos';
import { Segmentado } from '@/components/abas';
import { Cabecalho, Secao } from '@/components/layout';
import { Carregando, ErroCarga } from '@/components/estados';
import { Selo } from '@/components/selo';
import { NotaGoogle } from '@/components/NotaGoogle';
import { Confirmar } from '@/components/Confirmar';
import { useConfiguracoes, useMembrosAtivos, useProdutos } from '@/hooks/useBase';
import { useResumoEstoque } from '@/features/estoque/dados';
import { FORMAS_PAGAMENTO, ROTULO_FORMA, type FormaPagamento } from '@/lib/rotulos';
import { formatarData, formatarMoeda, formatarNumero, formatarPct, formatarTaxa } from '@/lib/formato';
import { numParaCampo, reaisParaCampo } from '@/lib/zod';
import { num, cn } from '@/lib/utils';
import { SELO_PAGAMENTO, SELO_VENDA } from './status';
import { esquemaVenda, type VendaEntrada } from './schemas';
import {
  useAdicionarItem,
  useAlterarItem,
  useApagarRascunho,
  useCancelarVenda,
  useConfirmarVenda,
  useRemoverItem,
  useSalvarVenda,
  useVenda,
  type DadosVenda,
} from './dados';
import { TrocarCliente } from './TrocarCliente';
import { TrocarPlaca } from './TrocarPlaca';

const ICONE_CATEGORIA: Record<string, Icon> = {
  placa: ContactlessPayment,
  otimizacao_google: GoogleLogo,
  site: Browser,
  outro: Package,
};

const CAMPOS = ['data_venda', 'vendedor_id', 'desconto', 'forma_pagamento', 'parcelas', 'entrada', 'primeiro_vencimento', 'taxa_cartao_pct', 'observacoes'] as const;

function valoresDaVenda(v: DadosVenda['venda']): VendaEntrada {
  return {
    data_venda: v.data_venda,
    vendedor_id: v.vendedor_id ?? '',
    desconto: reaisParaCampo(v.desconto),
    forma_pagamento: v.forma_pagamento as FormaPagamento,
    parcelas: String(v.parcelas),
    entrada: reaisParaCampo(v.entrada),
    primeiro_vencimento: v.primeiro_vencimento ?? '',
    taxa_cartao_pct: numParaCampo(v.taxa_cartao_pct),
    observacoes: v.observacoes ?? '',
  };
}

function LinhaResumo({ rotulo, valor, forte, negativo }: { rotulo: string; valor: string; forte?: boolean; negativo?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3', forte && 'text-lg font-medium')}>
      <dt className={forte ? '' : 'text-text-muted'}>{rotulo}</dt>
      <dd className="num">{negativo && valor !== '—' ? `− ${valor}` : valor}</dd>
    </div>
  );
}

function Itens({ d, editavel }: { d: DadosVenda; editavel: boolean }) {
  const { data: produtos } = useProdutos();
  const estoque = useResumoEstoque();
  const adicionar = useAdicionarItem(d.venda.id);
  const alterar = useAlterarItem(d.venda.id);
  const remover = useRemoverItem(d.venda.id);
  const [outro, setOutro] = useState('');
  const usados = new Set(d.itens.map((i) => i.produto_id));
  const disponiveisParaAdicionar = (produtos ?? []).filter((p) => p.ativo && !usados.has(p.id));
  const atalhos = disponiveisParaAdicionar.filter((p) => p.categoria !== 'outro');
  const ocupado = adicionar.isPending || alterar.isPending || remover.isPending;

  return (
    <Secao titulo="Itens">
      {!d.itens.length ? (
        <p className="text-md text-text-muted">Nenhum item ainda. Adicione a placa e os serviços vendidos.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-divider">
          {d.itens.map((i) => {
            const Icone = ICONE_CATEGORIA[i.produtos?.categoria ?? 'outro'] ?? Package;
            const placa = i.produtos?.categoria === 'placa';
            return (
              <li key={i.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex size-[36px] shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-text">
                    <Icone size={18} aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{i.produtos?.nome}</span>
                    <span className="text-sm text-text-muted">
                      {placa
                        ? `reserva ${i.quantidade} do estoque${estoque.data ? ` · ${formatarNumero(estoque.data.disponiveis)} disponíveis` : ''}`
                        : `${formatarMoeda(i.preco_unitario)} cada`}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {editavel ? (
                    <>
                      <div className="flex items-center rounded-md border border-divider">
                        <button
                          type="button"
                          className="tap inline-flex items-center justify-center disabled:opacity-40 md:min-h-[36px] md:min-w-[36px]"
                          aria-label={`Diminuir ${i.produtos?.nome}`}
                          disabled={i.quantidade <= 1 || ocupado}
                          onClick={() => alterar.mutate({ id: i.id, quantidade: i.quantidade - 1 })}
                        >
                          <Minus size={16} aria-hidden />
                        </button>
                        <span className="num w-8 text-center" aria-live="polite">{i.quantidade}</span>
                        <button
                          type="button"
                          className="tap inline-flex items-center justify-center disabled:opacity-40 md:min-h-[36px] md:min-w-[36px]"
                          aria-label={`Aumentar ${i.produtos?.nome}`}
                          disabled={i.quantidade >= 100 || ocupado}
                          onClick={() => alterar.mutate({ id: i.id, quantidade: i.quantidade + 1 })}
                        >
                          <Plus size={16} aria-hidden />
                        </button>
                      </div>
                      <label className="sr-only" htmlFor={`preco-${i.id}`}>Preço unitário de {i.produtos?.nome}</label>
                      <Entrada
                        id={`preco-${i.id}`}
                        key={`${i.id}-${i.preco_unitario}`}
                        inputMode="decimal"
                        defaultValue={reaisParaCampo(i.preco_unitario)}
                        className="num w-28 text-right"
                        onBlur={(e) => {
                          const n = Number(e.target.value.replace(/\./g, '').replace(',', '.'));
                          if (!Number.isFinite(n) || n < 0) {
                            e.target.value = reaisParaCampo(i.preco_unitario);
                            return;
                          }
                          if (Math.round(n * 100) !== Math.round((num(i.preco_unitario) ?? 0) * 100)) {
                            alterar.mutate({ id: i.id, preco_unitario: Math.round(n * 100) / 100 });
                          }
                        }}
                      />
                      <Botao variante="fantasma" tamanho="icone" aria-label={`Remover ${i.produtos?.nome}`} onClick={() => remover.mutate(i.id)} disabled={ocupado}>
                        <Trash size={18} aria-hidden />
                      </Botao>
                    </>
                  ) : (
                    <span className="num text-text-muted">
                      {i.quantidade} × {formatarMoeda(i.preco_unitario)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editavel ? (
        <div className="flex flex-wrap items-end gap-2">
          {atalhos.map((p) => (
            <Botao key={p.id} onClick={() => adicionar.mutate(p.id)} disabled={ocupado}>
              <Plus size={16} aria-hidden />
              {p.nome} · {formatarMoeda(p.preco_padrao)}
            </Botao>
          ))}
          {disponiveisParaAdicionar.some((p) => p.categoria === 'outro') ? (
            <div className="flex items-end gap-2">
              <Campo rotulo="Outro item">
                <Selecao value={outro} onChange={(e) => setOutro(e.target.value)}>
                  <option value="">Escolha</option>
                  {disponiveisParaAdicionar
                    .filter((p) => p.categoria === 'outro')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} · {formatarMoeda(p.preco_padrao)}
                      </option>
                    ))}
                </Selecao>
              </Campo>
              <Botao disabled={!outro || ocupado} onClick={() => { adicionar.mutate(outro); setOutro(''); }}>
                Adicionar
              </Botao>
            </div>
          ) : null}
        </div>
      ) : null}
    </Secao>
  );
}

function Placas({ d, editavel }: { d: DadosVenda; editavel: boolean }) {
  const [trocar, setTrocar] = useState<{ id: string; codigo: string | null } | null>(null);
  if (!d.placas.length) return null;
  return (
    <Secao titulo={editavel ? 'Placas reservadas' : 'Placas da venda'}>
      <ul className="flex flex-wrap gap-2">
        {d.placas.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-md border border-divider py-1 pl-3 pr-1">
            <span className="num">{p.codigo}</span>
            <span className="text-sm text-text-muted">{p.lote_codigo}</span>
            {editavel ? (
              <Botao variante="fantasma" onClick={() => setTrocar({ id: p.id!, codigo: p.codigo })} aria-label={`Trocar ${p.codigo}`}>
                <ArrowsClockwise size={16} aria-hidden />
                Trocar
              </Botao>
            ) : (
              <Link to={`/estoque?placa=${p.id}`} className="px-2 text-sm text-accent-text hover:underline">ver</Link>
            )}
          </li>
        ))}
      </ul>
      <TrocarPlaca vendaId={d.venda.id} atual={trocar} aoFechar={() => setTrocar(null)} />
    </Secao>
  );
}

function Resumo({ d }: { d: DadosVenda }) {
  const r = d.resumo;
  const rascunho = d.venda.status === 'rascunho';
  return (
    <Secao titulo="Resumo" extra={rascunho ? <span className="text-xs text-text-muted">prévia calculada pelo banco</span> : null}>
      <dl className="flex flex-col gap-2 text-md">
        <LinhaResumo rotulo="Desconto" valor={formatarMoeda(r.desconto)} negativo />
        <LinhaResumo rotulo="Total" valor={formatarMoeda(r.total)} forte />
        <LinhaResumo rotulo={`Custo${r.qtd_placas ? ` (${r.qtd_placas} ${r.qtd_placas === 1 ? 'placa' : 'placas'} pelo lote)` : ''}`} valor={formatarMoeda(r.custo)} negativo />
        <LinhaResumo rotulo={`Taxa do cartão (${formatarTaxa(d.venda.taxa_cartao_pct)})`} valor={formatarMoeda(r.taxa)} negativo />
        <div className="my-1 h-px bg-divider" />
        <div className="flex items-baseline justify-between gap-3 text-lg font-medium">
          <dt>Lucro <span className="text-sm font-normal text-text-muted">{formatarPct(r.margem_pct)}</span></dt>
          <dd className="num">{formatarMoeda(r.lucro)}</dd>
        </div>
      </dl>
      {rascunho ? (
        <ul className="flex flex-col gap-2 text-sm text-text-muted">
          {d.placas.length ? (
            <li className="flex items-start gap-2">
              <Package size={16} className="mt-0.5 shrink-0" aria-hidden />
              Reserva {d.placas.map((p) => p.codigo).join(', ')}
            </li>
          ) : null}
          <li className="flex items-start gap-2">
            <FolderSimple size={16} className="mt-0.5 shrink-0" aria-hidden />
            Ao confirmar: baixa as placas, gera as parcelas no Financeiro, cria o projeto com checklist e revisões de 30, 60 e 90 dias, e o lead vira Cliente.
          </li>
        </ul>
      ) : null}
    </Secao>
  );
}

function Pagamento({
  d,
  aoSalvar,
  salvarRef,
}: {
  d: DadosVenda;
  aoSalvar: ReturnType<typeof useSalvarVenda>;
  salvarRef: MutableRefObject<(() => Promise<boolean>) | null>;
}) {
  const { data: membros } = useMembrosAtivos();
  const cfg = useConfiguracoes();
  const v = d.venda;
  const f = useForm({ resolver: zodResolver(esquemaVenda), defaultValues: valoresDaVenda(v), mode: 'onBlur' });
  const e = f.formState.errors;
  const forma = useWatch({ control: f.control, name: 'forma_pagamento' });
  const vendedor = useWatch({ control: f.control, name: 'vendedor_id' });

  /** Valida e grava só o que mudou em relação ao banco. */
  const salvar = async () => {
    const ok = await f.trigger();
    if (!ok) return false;
    const dados = esquemaVenda.parse(f.getValues());
    const atual = esquemaVenda.parse(valoresDaVenda(v));
    const mudou = Object.fromEntries(CAMPOS.filter((k) => dados[k] !== atual[k]).map((k) => [k, dados[k]]));
    if (!Object.keys(mudou).length) return true;
    return !!(await aoSalvar.mutateAsync(mudou).catch(() => null));
  };
  useEffect(() => {
    salvarRef.current = salvar;
  });

  const mudarForma = (nova: FormaPagamento) => {
    f.setValue('forma_pagamento', nova);
    // Taxa padrão das Configurações ao escolher cartão (editável); fora do cartão, sem taxa
    const taxa = nova === 'cartao_credito' ? cfg.data?.taxa_credito_pct : nova === 'cartao_debito' ? cfg.data?.taxa_debito_pct : 0;
    f.setValue('taxa_cartao_pct', numParaCampo(taxa ?? 0));
    void salvar();
  };

  const reg = (nome: (typeof CAMPOS)[number]) => ({ ...f.register(nome), onBlur: () => void salvar() });

  return (
    <Secao titulo="Pagamento" extra={aoSalvar.isPending ? <span className="text-xs text-text-muted" aria-live="polite">Salvando…</span> : null}>
      <form id="form-venda" onSubmit={(ev) => ev.preventDefault()} noValidate className="grid grid-cols-2 gap-4">
        <fieldset className="col-span-2 flex flex-col gap-2">
          <legend className="mb-1 text-xs text-text-muted">Forma de pagamento</legend>
          <Segmentado<FormaPagamento>
            rotulo="Forma de pagamento"
            valor={forma as FormaPagamento}
            aoMudar={mudarForma}
            className="flex-wrap"
            opcoes={FORMAS_PAGAMENTO.map((x) => ({ valor: x, rotulo: ROTULO_FORMA[x] }))}
          />
        </fieldset>
        <Campo rotulo="Parcelas" erro={e.parcelas?.message} dica="O banco gera as parcelas ao confirmar.">
          <Selecao {...f.register('parcelas')} onChange={(ev) => { f.setValue('parcelas', ev.target.value); void salvar(); }}>
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>{i + 1}x</option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Taxa do cartão (%)" erro={e.taxa_cartao_pct?.message}>
          <Entrada inputMode="decimal" {...reg('taxa_cartao_pct')} />
        </Campo>
        <Campo rotulo="Desconto (R$)" erro={e.desconto?.message}>
          <Entrada inputMode="decimal" placeholder="0,00" {...reg('desconto')} />
        </Campo>
        <Campo rotulo="Entrada (R$)" erro={e.entrada?.message}>
          <Entrada inputMode="decimal" placeholder="0,00" {...reg('entrada')} />
        </Campo>
        <Campo rotulo="Data da venda" erro={e.data_venda?.message}>
          <Entrada type="date" {...reg('data_venda')} />
        </Campo>
        <Campo rotulo="1º vencimento" erro={e.primeiro_vencimento?.message} dica="Vazio = data da venda.">
          <Entrada type="date" {...reg('primeiro_vencimento')} />
        </Campo>
        <Campo rotulo="Vendedor" erro={e.vendedor_id?.message} className="col-span-2 md:col-span-1">
          <Selecao value={vendedor} onChange={(ev) => { f.setValue('vendedor_id', ev.target.value); void salvar(); }}>
            <option value="">Sem vendedor</option>
            {membros?.map((m) => (
              <option key={m.user_id} value={m.user_id}>{m.nome}</option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Observação" erro={e.observacoes?.message} className="col-span-2">
          <AreaTexto rows={2} {...reg('observacoes')} />
        </Campo>
      </form>
    </Secao>
  );
}

/** Depois de confirmada ou cancelada, só a observação muda. */
function Observacao({ d, aoSalvar }: { d: DadosVenda; aoSalvar: ReturnType<typeof useSalvarVenda> }) {
  const [texto, setTexto] = useState(d.venda.observacoes ?? '');
  const mudou = texto.trim() !== (d.venda.observacoes ?? '');
  return (
    <Secao titulo="Observação">
      <AreaTexto aria-label="Observação" rows={3} maxLength={2000} value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div>
        <Botao disabled={!mudou} carregando={aoSalvar.isPending} onClick={() => aoSalvar.mutate({ observacoes: texto.trim() || null })}>
          Salvar observação
        </Botao>
      </div>
    </Secao>
  );
}

function Parcelas({ d }: { d: DadosVenda }) {
  if (!d.lancamentos.length) return null;
  return (
    <Secao titulo="Lançamentos da venda" extra={<Link to="/financeiro" className="text-sm text-accent-text hover:underline">Abrir Financeiro</Link>}>
      <ul className="flex flex-col divide-y divide-divider">
        {d.lancamentos.map((l) => (
          <li key={l.id} className={cn('flex items-center gap-3 py-2', l.cancelado_em && 'opacity-60')}>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={cn(l.cancelado_em && 'line-through')}>{l.descricao}</span>
              <span className="text-sm text-text-muted">
                vence {formatarData(l.vencimento)}
                {l.pago_em ? ` · pago em ${formatarData(l.pago_em)}` : ''}
                {l.cancelado_em ? ' · cancelado' : ''}
              </span>
            </span>
            <span className="num">{l.tipo === 'receita' ? '' : '− '}{formatarMoeda(l.valor)}</span>
          </li>
        ))}
      </ul>
    </Secao>
  );
}

export default function EditorVenda() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const q = useVenda(id);
  const salvarVenda = useSalvarVenda(id);
  const confirmar = useConfirmarVenda();
  const cancelar = useCancelarVenda();
  const apagar = useApagarRascunho();
  const [trocarCliente, setTrocarCliente] = useState(false);
  const [pedirCancelar, setPedirCancelar] = useState(false);
  const [pedirApagar, setPedirApagar] = useState(false);
  const [pedirConfirmar, setPedirConfirmar] = useState(false);
  const salvarPagamento = useRef<(() => Promise<boolean>) | null>(null);

  if (q.isLoading) return <Carregando linhas={6} />;
  if (q.isError) return <ErroCarga erro={q.error} tentarDeNovo={() => void q.refetch()} />;
  const d = q.data!;
  const v = d.venda;
  const rascunho = v.status === 'rascunho';
  const sv = SELO_VENDA[v.status];
  const sp = d.resumo.situacao_pagamento ? SELO_PAGAMENTO[d.resumo.situacao_pagamento] : null;
  const c = d.cliente;

  const confirmarVenda = async () => {
    // Garante que o que foi digitado por último está salvo antes de confirmar
    if (salvarPagamento.current && !(await salvarPagamento.current())) {
      setPedirConfirmar(false);
      return;
    }
    const ok = await confirmar.mutateAsync(v.id).catch(() => null);
    setPedirConfirmar(false);
    if (ok) void q.refetch();
  };

  const botaoConfirmar = (
    <Botao variante="principal" onClick={() => setPedirConfirmar(true)} disabled={!d.itens.length} carregando={confirmar.isPending}>
      <Check size={18} aria-hidden />
      Confirmar venda
    </Botao>
  );

  return (
    <>
      <Cabecalho
        antes={<Link to="/vendas" className="text-sm text-text-muted hover:underline">Vendas / {v.codigo}</Link>}
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            {rascunho ? 'Nova venda' : `Venda ${v.codigo}`}
            <Selo icone={sv.icone} texto={sv.texto} tom={sv.tom} />
            {sp ? <Selo icone={sp.icone} texto={sp.texto} tom={sp.tom} /> : null}
          </span>
        }
        resumo={
          v.status === 'confirmada'
            ? `Confirmada em ${formatarData(v.confirmada_em?.slice(0, 10))}${d.resumo.e_upsell ? ' · upsell' : ''}`
            : v.status === 'cancelada'
              ? `Cancelada: ${v.motivo_cancelamento ?? ''}`
              : 'Rascunho: as alterações são salvas sozinhas.'
        }
        acoes={
          rascunho ? (
            <>
              <Botao variante="fantasma" onClick={() => setPedirApagar(true)}>
                <Trash size={18} aria-hidden />
                Apagar rascunho
              </Botao>
              <Botao onClick={() => navegar('/vendas')}>Salvar rascunho</Botao>
              <span className="hidden md:inline-flex">{botaoConfirmar}</span>
            </>
          ) : (
            <>
              {d.projeto ? (
                <Link to={`/projetos/${d.projeto.id}`} className={estiloBotao({ variante: 'secundario' })}>
                  <FolderSimple size={18} aria-hidden />
                  Abrir projeto
                </Link>
              ) : null}
              {v.status === 'confirmada' ? (
                <Botao variante="perigo" onClick={() => setPedirCancelar(true)}>
                  <XCircle size={18} aria-hidden />
                  Cancelar venda
                </Botao>
              ) : null}
            </>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Secao>
            <div className="flex items-start gap-3">
              <span className="flex size-[40px] shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-text">
                <Storefront size={20} aria-hidden />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link to={`/prospeccao?lead=${c.id}`} className="font-medium hover:underline">{c.nome}</Link>
                <span className="text-sm text-text-muted">
                  {[c.codigo, c.cidade, c.contato_nome, c.telefone].filter(Boolean).join(' · ')}
                </span>
                <NotaGoogle nota={c.nota_google} avaliacoes={c.avaliacoes_google} />
              </div>
              {rascunho ? (
                <Botao variante="fantasma" onClick={() => setTrocarCliente(true)}>
                  Trocar cliente
                </Botao>
              ) : null}
            </div>
          </Secao>
          <Itens d={d} editavel={rascunho} />
          <Placas d={d} editavel={rascunho} />
          {rascunho ? <Pagamento d={d} aoSalvar={salvarVenda} salvarRef={salvarPagamento} /> : (
            <>
              <Secao titulo="Pagamento">
                <p className="text-md">
                  {ROTULO_FORMA[v.forma_pagamento]} · {v.parcelas}x
                  {num(v.entrada) ? ` · entrada ${formatarMoeda(v.entrada)}` : ''}
                  {v.primeiro_vencimento ? ` · 1º vencimento ${formatarData(v.primeiro_vencimento)}` : ''}
                </p>
                <p className="text-sm text-text-muted">Recebido até agora: {formatarMoeda(d.resumo.recebido)}</p>
              </Secao>
              <Parcelas d={d} />
              <Observacao d={d} aoSalvar={salvarVenda} />
            </>
          )}
        </div>
        <div className="flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
          <Resumo d={d} />
        </div>
      </div>

      {rascunho ? (
        <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-height)+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 border-t border-divider bg-bg px-4 py-3 md:hidden">
          <div className="flex flex-1 flex-col">
            <span className="text-sm text-text-muted">Total {formatarMoeda(d.resumo.total)}</span>
            <span className="num text-sm">Lucro {formatarMoeda(d.resumo.lucro)}</span>
          </div>
          {botaoConfirmar}
        </div>
      ) : null}
      <div aria-hidden className="h-24 md:hidden" />

      <TrocarCliente
        aberto={trocarCliente}
        aoMudar={setTrocarCliente}
        aoEscolher={async (clienteId) => {
          const ok = await salvarVenda.mutateAsync({ cliente_id: clienteId }).catch(() => null);
          if (ok) setTrocarCliente(false);
        }}
      />
      <Confirmar
        aberto={pedirConfirmar}
        aoMudar={setPedirConfirmar}
        titulo={`Confirmar venda para ${c.nome}?`}
        texto={`Total ${formatarMoeda(d.resumo.total)} em ${v.parcelas}x (${ROTULO_FORMA[v.forma_pagamento]}). Depois de confirmada, só a observação pode mudar.`}
        botao="Confirmar venda"
        carregando={confirmar.isPending}
        aoConfirmar={confirmarVenda}
      />
      <Confirmar
        aberto={pedirCancelar}
        aoMudar={setPedirCancelar}
        titulo={`Cancelar ${v.codigo}?`}
        texto="Placas não instaladas voltam ao estoque e as instaladas viram perdidas. Parcelas em aberto são canceladas e as pagas viram estorno. O projeto é cancelado."
        botao="Cancelar venda"
        perigo
        motivo={{ rotulo: 'Motivo do cancelamento' }}
        carregando={cancelar.isPending}
        aoConfirmar={async (motivo) => {
          const ok = await cancelar.mutateAsync({ id: v.id, motivo }).catch(() => null);
          if (ok) setPedirCancelar(false);
        }}
      />
      <Confirmar
        aberto={pedirApagar}
        aoMudar={setPedirApagar}
        titulo="Apagar este rascunho?"
        texto="As placas reservadas voltam para o estoque."
        botao="Apagar rascunho"
        perigo
        carregando={apagar.isPending}
        aoConfirmar={async () => {
          const ok = await apagar.mutateAsync(v.id).then(() => true).catch(() => false);
          if (ok) navegar('/vendas', { replace: true });
        }}
      />
    </>
  );
}
