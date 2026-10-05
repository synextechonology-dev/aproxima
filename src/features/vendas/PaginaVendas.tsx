import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CaretRight, DownloadSimple, MagnifyingGlass, Plus, Receipt } from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { estiloBotao } from '@/components/ui/botao-estilo';
import { Campo, Entrada, Selecao } from '@/components/ui/campos';
import { Segmentado } from '@/components/abas';
import { AcaoFixa, Cabecalho } from '@/components/layout';
import { Carregando, ErroCarga, Vazio } from '@/components/estados';
import { Selo } from '@/components/selo';
import { useMembrosAtivos } from '@/hooks/useBase';
import { formatarData, formatarMoeda, formatarNumero, formatarPct, hojeSP, limitesDoMes } from '@/lib/formato';
import { baixarCsv, numCsv } from '@/lib/csv';
import { ROTULO_FORMA, ROTULO_SITUACAO_PAGAMENTO, ROTULO_STATUS_VENDA, rotulo } from '@/lib/rotulos';
import { cn, normalizar } from '@/lib/utils';
import { SELO_PAGAMENTO, SELO_VENDA } from './status';
import { useTotaisVendas, useVendas, type VendaV } from './dados';

type Tipo = 'todas' | 'servico' | 'placas';

function SeloStatus({ v }: { v: VendaV }) {
  const s = SELO_VENDA[v.status ?? 'rascunho'];
  return <Selo icone={s.icone} texto={s.texto} tom={s.tom} />;
}
function SeloPagamento({ v }: { v: VendaV }) {
  if (!v.situacao_pagamento) return <span className="text-text-muted">—</span>;
  const s = SELO_PAGAMENTO[v.situacao_pagamento];
  return <Selo icone={s.icone} texto={s.texto} tom={s.tom} />;
}

function exportar(vendas: VendaV[], inicio: string, fim: string) {
  baixarCsv(
    `vendas-${inicio}-a-${fim}.csv`,
    vendas.map((v) => ({
      venda: v.codigo,
      data: formatarData(v.data_venda),
      cliente: v.cliente_nome,
      cidade: v.cliente_cidade,
      vendedor: v.vendedor_nome ?? '',
      itens: v.itens_resumo ?? '',
      forma: rotulo(ROTULO_FORMA, v.forma_pagamento, ''),
      parcelas: v.parcelas,
      desconto: numCsv(v.desconto),
      total: numCsv(v.total),
      custo: numCsv(v.custo),
      taxa: numCsv(v.taxa),
      lucro: numCsv(v.lucro),
      margem_pct: numCsv(v.margem_pct),
      recebido: numCsv(v.recebido),
      pagamento: rotulo(ROTULO_SITUACAO_PAGAMENTO, v.situacao_pagamento, ''),
      status: rotulo(ROTULO_STATUS_VENDA, v.status),
    })),
  );
}

export default function PaginaVendas() {
  const navegar = useNavigate();
  const mes = limitesDoMes(hojeSP());
  const [inicio, setInicio] = useState(mes.inicio);
  const [fim, setFim] = useState(mes.fim);
  const [cidade, setCidade] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [tipo, setTipo] = useState<Tipo>('todas');
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const { data: membros } = useMembrosAtivos();
  const periodoValido = !!inicio && !!fim && inicio <= fim;
  const q = useVendas(inicio, fim);
  const totais = useTotaisVendas(inicio, fim, vendedor, cidade);

  const todas = useMemo(() => q.data ?? [], [q.data]);
  const cidades = useMemo(() => [...new Set(todas.map((v) => v.cliente_cidade).filter(Boolean))].sort() as string[], [todas]);
  const lista = useMemo(() => {
    const t = normalizar(busca);
    return todas.filter(
      (v) =>
        (!cidade || v.cliente_cidade === cidade) &&
        (!vendedor || v.vendedor_id === vendedor) &&
        (!status || v.status === status) &&
        (tipo === 'todas' || (tipo === 'servico' ? v.tem_servico : !v.tem_servico)) &&
        (!t || normalizar(`${v.codigo} ${v.cliente_nome}`).includes(t)),
    );
  }, [todas, cidade, vendedor, status, tipo, busca]);
  const rascunhos = todas.filter((v) => v.status === 'rascunho').length;

  const resumo = totais.data
    ? `${formatarNumero(totais.data.vendas)} confirmadas · ${formatarMoeda(totais.data.faturamento)} · lucro ${formatarMoeda(totais.data.lucro_vendas)}${rascunhos ? ` · ${rascunhos} ${rascunhos === 1 ? 'rascunho' : 'rascunhos'}` : ''}`
    : undefined;

  return (
    <>
      <Cabecalho
        titulo="Vendas"
        resumo={resumo}
        acoes={
          <>
            <Botao onClick={() => exportar(lista, inicio, fim)} disabled={!lista.length}>
              <DownloadSimple size={18} aria-hidden />
              Exportar CSV
            </Botao>
            <Link to="/vendas/nova" className={cn(estiloBotao({ variante: 'principal' }), 'hidden md:inline-flex')}>
              <Plus size={18} aria-hidden />
              Nova venda
            </Link>
          </>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-end">
          <Campo rotulo="De" erro={periodoValido ? undefined : 'Período inválido'}>
            <Entrada type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </Campo>
          <Campo rotulo="Até">
            <Entrada type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </Campo>
          <Campo rotulo="Cidade">
            <Selecao value={cidade} onChange={(e) => setCidade(e.target.value)}>
              <option value="">Todas as cidades</option>
              {cidades.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Vendedor">
            <Selecao value={vendedor} onChange={(e) => setVendedor(e.target.value)}>
              <option value="">Todos</option>
              {membros?.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.nome}</option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Status" className="col-span-2 md:col-span-1">
            <Selecao value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="rascunho">Rascunho</option>
              <option value="confirmada">Confirmada</option>
              <option value="cancelada">Cancelada</option>
            </Selecao>
          </Campo>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Segmentado<Tipo>
            rotulo="Tipo de venda"
            valor={tipo}
            aoMudar={setTipo}
            opcoes={[
              { valor: 'todas', rotulo: 'Todas' },
              { valor: 'servico', rotulo: 'Com serviço' },
              { valor: 'placas', rotulo: 'Só placas' },
            ]}
          />
          <div className="relative md:w-72">
            <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
            <Entrada type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Cliente ou nº da venda" aria-label="Buscar vendas" className="pl-[36px]" />
          </div>
        </div>
        {(vendedor || cidade) && totais.data ? (
          <p className="text-sm text-text-muted">Os totais do cabeçalho seguem o vendedor e a cidade escolhidos.</p>
        ) : null}
      </div>

      {!periodoValido ? null : q.isLoading ? (
        <Carregando linhas={6} />
      ) : q.isError ? (
        <ErroCarga erro={q.error} tentarDeNovo={() => void q.refetch()} />
      ) : !lista.length ? (
        <Vazio
          icone={Receipt}
          titulo={todas.length ? 'Nenhuma venda com esses filtros' : 'Nenhuma venda neste período'}
          texto={todas.length ? 'Mude os filtros ou o período.' : 'Registre uma venda a partir da ficha do lead ou comece por aqui.'}
          acao={
            <Botao variante="principal" onClick={() => navegar('/vendas/nova')}>
              <Plus size={18} aria-hidden />
              Nova venda
            </Botao>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg bg-surface shadow-(--shadow-sm) md:block">
            <table className="w-full text-md">
              <thead className="text-left text-xs text-text-muted">
                <tr className="border-b border-divider">
                  <th className="px-4 py-3 font-normal">Nº</th>
                  <th className="px-4 py-3 font-normal">Data</th>
                  <th className="px-4 py-3 font-normal">Cliente</th>
                  <th className="px-4 py-3 font-normal">Cidade</th>
                  <th className="px-4 py-3 font-normal">Itens</th>
                  <th className="px-4 py-3 text-right font-normal">Total</th>
                  <th className="px-4 py-3 text-right font-normal">Lucro</th>
                  <th className="px-4 py-3 text-right font-normal">Margem</th>
                  <th className="px-4 py-3 font-normal">Pagamento</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((v) => {
                  const cancelada = v.status === 'cancelada';
                  return (
                    <tr key={v.id} className={cn('cursor-pointer border-b border-divider last:border-0 hover:bg-accent-soft', cancelada && 'opacity-60')} onClick={() => navegar(`/vendas/${v.id}`)}>
                      <td className="px-4 py-2">
                        <Link to={`/vendas/${v.id}`} className="num font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                          {v.codigo}
                        </Link>
                      </td>
                      <td className="num px-4 py-2 text-text-muted">{formatarData(v.data_venda)}</td>
                      <td className="px-4 py-2">
                        <span className="flex flex-col">
                          <span>{v.cliente_nome}</span>
                          <span className="text-sm text-text-muted">{v.vendedor_nome ?? 'sem vendedor'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2 text-text-muted">{v.cliente_cidade}</td>
                      <td className="max-w-56 truncate px-4 py-2 text-text-muted">{v.itens_resumo ?? 'sem itens'}</td>
                      <td className={cn('num px-4 py-2 text-right', cancelada && 'line-through')}>{formatarMoeda(v.total)}</td>
                      <td className="num px-4 py-2 text-right">{cancelada ? '—' : formatarMoeda(v.lucro)}</td>
                      <td className="num px-4 py-2 text-right text-text-muted">{cancelada ? '—' : formatarPct(v.margem_pct)}</td>
                      <td className="px-4 py-2"><SeloPagamento v={v} /></td>
                      <td className="px-4 py-2"><SeloStatus v={v} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-2 md:hidden">
            {lista.map((v) => (
              <li key={v.id}>
                <Link to={`/vendas/${v.id}`} className={cn('flex items-center gap-3 rounded-md bg-surface p-4 shadow-(--shadow-sm)', v.status === 'cancelada' && 'opacity-60')}>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center justify-between gap-2 text-sm text-text-muted">
                      <span className="num">{v.codigo} · {formatarData(v.data_venda)}</span>
                      <SeloStatus v={v} />
                    </span>
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium">{v.cliente_nome}</span>
                      <span className={cn('num font-medium', v.status === 'cancelada' && 'line-through')}>{formatarMoeda(v.total)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2 text-sm text-text-muted">
                      <span className="truncate">{v.itens_resumo ?? 'sem itens'} · {v.cliente_cidade}</span>
                      {v.status !== 'cancelada' ? <span className="num shrink-0">lucro {formatarMoeda(v.lucro)}</span> : null}
                    </span>
                    {v.situacao_pagamento ? <SeloPagamento v={v} /> : null}
                  </span>
                  <CaretRight size={18} className="shrink-0 text-text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <AcaoFixa>
        <Link to="/vendas/nova" className={estiloBotao({ variante: 'principal', tamanho: 'bloco' })}>
          <Plus size={18} aria-hidden />
          Nova venda
        </Link>
      </AcaoFixa>
    </>
  );
}
