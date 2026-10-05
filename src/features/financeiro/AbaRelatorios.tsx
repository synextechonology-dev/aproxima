import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { HandCoins } from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { Secao } from '@/components/layout';
import { Carregando, ErroCarga } from '@/components/estados';
import { formatarData, formatarMesAno, formatarMoeda, formatarNumero, formatarPct } from '@/lib/formato';
import { useLotes } from '@/features/estoque/dados';
import { num } from '@/lib/utils';
import type { Visao } from '@/lib/tipos';
import { useCidadesDoMes, useRetiradas, useVendasDoMes } from './dados';

/** Tabela no computador; cartões (rótulo: valor) no celular. */
function Tabela({ cab, linhas, rodape }: { cab: string[]; linhas: ReactNode[][]; rodape?: ReactNode[] }) {
  const cartao = (l: ReactNode[], i: number | string, forte?: boolean) => (
    <li key={i} className={forte ? 'flex flex-col gap-1 rounded-md bg-bg p-3 font-medium' : 'flex flex-col gap-1 rounded-md bg-bg p-3'}>
      <span>{l[0]}</span>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        {l.slice(1).map((c, j) =>
          c === '' ? null : (
            <div key={j} className="flex flex-col">
              <dt className="text-text-muted">{cab[j + 1]}</dt>
              <dd className="num">{c}</dd>
            </div>
          ),
        )}
      </dl>
    </li>
  );
  return (
    <>
      <ul className="flex flex-col gap-2 md:hidden">
        {linhas.map((l, i) => cartao(l, i))}
        {rodape ? cartao(rodape, 'total', true) : null}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-md">
          <thead className="text-left text-xs text-text-muted">
            <tr className="border-b border-divider">
              {cab.map((c, i) => (
                <th key={c} className={i ? 'px-3 py-2 text-right font-normal' : 'px-3 py-2 font-normal'}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i} className="border-b border-divider last:border-0">
                {l.map((c, j) => (
                  <td key={j} className={j ? 'num px-3 py-2 text-right' : 'px-3 py-2'}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
          {rodape ? (
            <tfoot>
              <tr className="border-t border-divider font-medium">
                {rodape.map((c, j) => (
                  <td key={j} className={j ? 'num px-3 py-2 text-right' : 'px-3 py-2'}>{c}</td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </>
  );
}

function Retiradas({ aoRetirar }: { aoRetirar: () => void }) {
  const q = useRetiradas();
  if (q.isLoading) return <Carregando linhas={2} />;
  if (q.isError) return <ErroCarga erro={q.error} tentarDeNovo={() => void q.refetch()} />;
  const { socios, ultimas } = q.data!;
  const acumulado = socios[0]?.lucro_acumulado;
  return (
    <Secao
      titulo="Retiradas 50/50"
      extra={
        <Botao variante="principal" onClick={aoRetirar}>
          <HandCoins size={18} aria-hidden />
          Registrar retirada
        </Botao>
      }
    >
      <p className="text-md text-text-muted">
        Lucro líquido acumulado {formatarMoeda(acumulado)} · parte de cada sócio {formatarMoeda(socios[0]?.parte)}
      </p>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {socios.map((s) => {
          const parte = num(s.parte) ?? 0;
          const ret = num(s.retirado) ?? 0;
          return (
            <li key={s.socio_id} className="flex flex-col gap-2 rounded-md bg-bg p-3">
              <span className="flex items-baseline justify-between">
                <span className="font-medium">{s.nome}</span>
                <span className="num">saldo {formatarMoeda(s.saldo)}</span>
              </span>
              <div className="h-[8px] overflow-hidden rounded-full bg-neutral-800" aria-hidden>
                <div className="h-full bg-accent" style={{ width: `${parte > 0 ? Math.min(100, (ret / parte) * 100) : 0}%` }} />
              </div>
              <span className="text-sm text-text-muted">já retirou {formatarMoeda(s.retirado)} de {formatarMoeda(s.parte)}</span>
            </li>
          );
        })}
      </ul>
      {ultimas.length ? (
        <>
          <h3 className="text-sm text-text-muted">Últimas retiradas</h3>
          <ul className="flex flex-col gap-1 text-md">
            {ultimas.map((r) => (
              <li key={r.id} className="flex justify-between gap-2">
                <span>{formatarData(r.vencimento)} · {socios.find((s) => s.socio_id === r.socio_id)?.nome ?? '—'}</span>
                <span className="num">{formatarMoeda(r.valor)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-text-muted">Nenhuma retirada registrada ainda.</p>
      )}
    </Secao>
  );
}

export function AbaRelatorios({
  inicio,
  fim,
  mes,
  aoRetirar,
}: {
  inicio: string;
  fim: string;
  mes: Visao<'v_resultado_mensal'> | null | undefined;
  aoRetirar: () => void;
}) {
  const vendas = useVendasDoMes(inicio, fim);
  const lotes = useLotes();
  const cidades = useCidadesDoMes(inicio, fim);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Secao titulo="Lucro por venda" extra={<span className="text-sm text-text-muted">{formatarMesAno(inicio)} · custo pelo lote de cada placa</span>} className="xl:col-span-2">
        {vendas.isLoading ? (
          <Carregando linhas={3} />
        ) : vendas.isError ? (
          <ErroCarga erro={vendas.error} tentarDeNovo={() => void vendas.refetch()} />
        ) : !vendas.data?.length ? (
          <p className="text-md text-text-muted">Nenhuma venda confirmada neste mês.</p>
        ) : (
          <Tabela
            cab={['Venda', 'Total', 'Custo', 'Taxa', 'Lucro', 'Margem']}
            linhas={vendas.data.map((v) => [
              <Link key="v" to={`/vendas/${v.id}`} className="hover:underline">
                {v.codigo} · {v.cliente_nome}
              </Link>,
              formatarMoeda(v.total),
              formatarMoeda(v.custo),
              formatarMoeda(v.taxa),
              formatarMoeda(v.lucro),
              formatarPct(v.margem_pct),
            ])}
            rodape={
              mes
                ? [
                    'Total do mês',
                    formatarMoeda(mes.faturamento),
                    `${formatarMoeda(mes.custo_placas)} placas · ${formatarMoeda(mes.custo_servicos)} serviços`,
                    formatarMoeda(mes.taxas_cartao),
                    formatarMoeda(mes.lucro_vendas),
                    '',
                  ]
                : undefined
            }
          />
        )}
        {mes ? (
          <dl className="grid grid-cols-2 gap-2 text-md md:grid-cols-4">
            <div><dt className="text-sm text-text-muted">Lucro das vendas</dt><dd className="num">{formatarMoeda(mes.lucro_vendas)}</dd></div>
            <div><dt className="text-sm text-text-muted">Outras receitas</dt><dd className="num">{formatarMoeda(mes.outras_receitas)}</dd></div>
            <div><dt className="text-sm text-text-muted">Despesas operacionais</dt><dd className="num">− {formatarMoeda(mes.despesas_operacionais)}</dd></div>
            <div><dt className="text-sm text-text-muted">Lucro líquido</dt><dd className="num font-medium">{formatarMoeda(mes.lucro_liquido)}</dd></div>
          </dl>
        ) : null}
      </Secao>

      <Retiradas aoRetirar={aoRetirar} />

      <Secao titulo="Vendas por cidade" extra={<span className="text-sm text-text-muted">{formatarMesAno(inicio)}</span>}>
        {cidades.isLoading ? (
          <Carregando linhas={2} />
        ) : cidades.isError ? (
          <ErroCarga erro={cidades.error} tentarDeNovo={() => void cidades.refetch()} />
        ) : !cidades.data?.length ? (
          <p className="text-md text-text-muted">Nenhuma venda confirmada neste mês.</p>
        ) : (
          <Tabela cab={['Cidade', 'Vendas', 'Faturamento']} linhas={cidades.data.map((c) => [c.cidade, formatarNumero(c.vendas), formatarMoeda(c.faturamento)])} />
        )}
      </Secao>

      <Secao titulo="Custo por lote, com frete" className="xl:col-span-2">
        {lotes.isLoading ? (
          <Carregando linhas={2} />
        ) : !lotes.data?.length ? (
          <p className="text-md text-text-muted">Nenhum lote registrado.</p>
        ) : (
          <Tabela
            cab={['Lote', 'Placas', 'Valor pago', 'Frete', 'Outras taxas', 'Custo total', 'Por placa']}
            linhas={lotes.data.map((l) => [
              `${l.codigo} · ${formatarData(l.data_compra)}`,
              formatarNumero(l.quantidade),
              formatarMoeda(l.valor_pago),
              formatarMoeda(l.frete),
              formatarMoeda(l.outras_taxas),
              formatarMoeda(l.custo_total),
              formatarMoeda(l.custo_por_placa),
            ])}
          />
        )}
      </Secao>
    </div>
  );
}
