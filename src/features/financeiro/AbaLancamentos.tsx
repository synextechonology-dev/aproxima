import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowCounterClockwise, Check, DotsThreeOutline, PencilSimple, Wallet, WhatsappLogo, XCircle } from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { ConteudoMenu, GatilhoMenu, ItemMenu, Menu } from '@/components/ui/menu';
import { Abas } from '@/components/abas';
import { Vazio } from '@/components/estados';
import { Selo } from '@/components/selo';
import { Confirmar } from '@/components/Confirmar';
import { ROTULO_FORMA, rotulo } from '@/lib/rotulos';
import { formatarData, formatarMoeda, hojeSP } from '@/lib/formato';
import { abrirExterno, linkWhatsApp } from '@/lib/contato';
import { cn } from '@/lib/utils';
import type { Lancamento } from '@/lib/tipos';
import { situacao, seloSituacao } from './situacao';
import { useCancelarLancamento, useRegistrarPagamento, type LancamentoC } from './dados';
import { MarcarPago } from './MarcarPago';
import { FormLancamento } from './FormLancamento';

type Filtro = 'todos' | 'receber' | 'pagar' | 'pago' | 'atrasado' | 'cancelado';

function cobrar(l: LancamentoC) {
  const nome = l.clientes?.nome ?? '';
  const wa = linkWhatsApp(
    l.clientes?.telefone,
    `Olá! Tudo bem? Passando para lembrar de ${l.descricao}, no valor de ${formatarMoeda(l.valor)}, com vencimento em ${formatarData(l.vencimento)}${nome ? ` (${nome})` : ''}. Qualquer dúvida, é só chamar.`,
  );
  if (wa) abrirExterno(wa);
}

export function AbaLancamentos({ lancamentos }: { lancamentos: LancamentoC[] }) {
  const hoje = hojeSP();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [pagar, setPagar] = useState<Lancamento | null>(null);
  const [editar, setEditar] = useState<Lancamento | null>(null);
  const [cancelar, setCancelar] = useState<Lancamento | null>(null);
  const desfazer = useRegistrarPagamento();
  const cancelarL = useCancelarLancamento();

  const com = useMemo(() => lancamentos.map((l) => ({ l, s: situacao(l, hoje) })), [lancamentos, hoje]);
  const passa = (x: (typeof com)[number], f: Filtro) =>
    f === 'todos' ||
    (f === 'receber' && x.s === 'aberto' && x.l.tipo === 'receita') ||
    (f === 'pagar' && x.s === 'aberto' && x.l.tipo !== 'receita') ||
    (f === 'pago' && x.s === 'pago') ||
    (f === 'atrasado' && x.s === 'atrasado') ||
    (f === 'cancelado' && x.s === 'cancelado');
  const lista = com.filter((x) => passa(x, filtro));
  const conta = (f: Filtro) => com.filter((x) => passa(x, f)).length;

  const acoes = (l: LancamentoC, s: ReturnType<typeof situacao>) => {
    const avulso = !l.venda_id && !l.lote_id;
    const podeCobrar = l.tipo === 'receita' && s === 'atrasado' && !!l.clientes?.telefone;
    return (
      <div className="flex items-center justify-end gap-1">
        {podeCobrar ? (
          <Botao variante="fantasma" onClick={() => cobrar(l)}>
            <WhatsappLogo size={16} aria-hidden />
            Cobrar no WhatsApp
          </Botao>
        ) : null}
        {s === 'aberto' || s === 'atrasado' ? (
          <Botao variante="fantasma" onClick={() => setPagar(l)}>
            <Check size={16} aria-hidden />
            {l.tipo === 'receita' ? 'Recebido' : 'Pago'}
          </Botao>
        ) : null}
        {s !== 'cancelado' && (s === 'pago' || avulso) ? (
          <Menu>
            <GatilhoMenu asChild>
              <Botao variante="fantasma" tamanho="icone" aria-label="Mais ações do lançamento">
                <DotsThreeOutline size={16} aria-hidden />
              </Botao>
            </GatilhoMenu>
            <ConteudoMenu>
              {s === 'pago' ? (
                <ItemMenu aoEscolher={() => desfazer.mutate({ id: l.id, pago_em: null })}>
                  <ArrowCounterClockwise size={18} aria-hidden /> Desfazer pagamento
                </ItemMenu>
              ) : null}
              {avulso ? (
                <>
                  <ItemMenu aoEscolher={() => setEditar(l)}>
                    <PencilSimple size={18} aria-hidden /> Editar lançamento
                  </ItemMenu>
                  <ItemMenu perigo aoEscolher={() => setCancelar(l)}>
                    <XCircle size={18} aria-hidden /> Cancelar lançamento
                  </ItemMenu>
                </>
              ) : null}
            </ConteudoMenu>
          </Menu>
        ) : null}
      </div>
    );
  };

  const sub = (l: LancamentoC) =>
    [l.clientes?.nome, l.venda_id ? 'gerado pela venda' : l.lote_id ? 'gerado pelo lote' : null, l.motivo_cancelamento].filter(Boolean).join(' · ');
  const valor = (l: LancamentoC) => `${l.tipo === 'receita' ? '' : '− '}${formatarMoeda(l.valor)}`;

  return (
    <div className="flex flex-col gap-3">
      <Abas<Filtro>
        rotulo="Situação"
        valor={filtro}
        aoMudar={setFiltro}
        abas={[
          { valor: 'todos', rotulo: 'Todos', contagem: conta('todos') },
          { valor: 'receber', rotulo: 'A receber', contagem: conta('receber') },
          { valor: 'pagar', rotulo: 'A pagar', contagem: conta('pagar') },
          { valor: 'pago', rotulo: 'Pagos', contagem: conta('pago') },
          { valor: 'atrasado', rotulo: 'Atrasados', contagem: conta('atrasado') },
          { valor: 'cancelado', rotulo: 'Cancelados', contagem: conta('cancelado') },
        ]}
      />
      {!lista.length ? (
        <Vazio icone={Wallet} titulo="Nenhum lançamento aqui" texto="Vendas confirmadas e lotes registrados lançam sozinhos. Despesas do dia a dia entram em Novo lançamento." />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg bg-surface shadow-(--shadow-sm) md:block">
            <table className="w-full text-md">
              <thead className="text-left text-xs text-text-muted">
                <tr className="border-b border-divider">
                  <th className="px-4 py-3 font-normal">Vencimento</th>
                  <th className="px-4 py-3 font-normal">Descrição</th>
                  <th className="px-4 py-3 font-normal">Forma</th>
                  <th className="px-4 py-3 text-right font-normal">Valor</th>
                  <th className="px-4 py-3 font-normal">Situação</th>
                  <th className="px-4 py-3 font-normal"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {lista.map(({ l, s }) => {
                  const sel = seloSituacao(s, l.tipo);
                  return (
                    <tr key={l.id} className={cn('border-b border-divider last:border-0', s === 'cancelado' && 'opacity-60')}>
                      <td className="num px-4 py-2 text-text-muted">{formatarData(l.vencimento)}</td>
                      <td className="px-4 py-2">
                        <span className="flex flex-col">
                          <span className={cn(s === 'cancelado' && 'line-through')}>
                            {l.venda_id ? <Link to={`/vendas/${l.venda_id}`} className="hover:underline">{l.descricao}</Link> : l.descricao}
                          </span>
                          {sub(l) ? <span className="text-sm text-text-muted">{sub(l)}</span> : null}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-text-muted">{rotulo(ROTULO_FORMA, l.forma_pagamento)}</td>
                      <td className={cn('num px-4 py-2 text-right', l.tipo !== 'receita' && 'text-neutral-300', s === 'cancelado' && 'line-through')}>{valor(l)}</td>
                      <td className="px-4 py-2"><Selo icone={sel.icone} texto={sel.texto} tom={sel.tom} /></td>
                      <td className="px-2 py-1">{acoes(l, s)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-2 md:hidden">
            {lista.map(({ l, s }) => {
              const sel = seloSituacao(s, l.tipo);
              return (
                <li key={l.id} className={cn('flex flex-col gap-1 rounded-md bg-surface p-4 shadow-(--shadow-sm)', s === 'cancelado' && 'opacity-60')}>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn('min-w-0 truncate', s === 'cancelado' && 'line-through')}>{l.descricao}</span>
                    <span className="num shrink-0 font-medium">{valor(l)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2 text-sm text-text-muted">
                    <span className="truncate">{formatarData(l.vencimento)} · {rotulo(ROTULO_FORMA, l.forma_pagamento)}{sub(l) ? ` · ${sub(l)}` : ''}</span>
                    <Selo icone={sel.icone} texto={sel.texto} tom={sel.tom} />
                  </span>
                  {acoes(l, s)}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <MarcarPago lanc={pagar} aoFechar={() => setPagar(null)} />
      <FormLancamento aberto={!!editar} aoMudar={(v) => !v && setEditar(null)} lancamento={editar} />
      <Confirmar
        aberto={!!cancelar}
        aoMudar={(v) => !v && setCancelar(null)}
        titulo="Cancelar lançamento?"
        texto="Lançamento não se apaga: ele fica na lista como cancelado, com o motivo."
        botao="Cancelar lançamento"
        perigo
        motivo={{ rotulo: 'Motivo' }}
        carregando={cancelarL.isPending}
        aoConfirmar={async (motivo) => {
          if (!cancelar) return;
          const ok = await cancelarL.mutateAsync({ id: cancelar.id, motivo }).catch(() => null);
          if (ok) setCancelar(null);
        }}
      />
    </div>
  );
}
