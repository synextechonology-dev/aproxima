import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CaretLeft, CaretRight, DownloadSimple, HandCoins, Plus } from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { Abas } from '@/components/abas';
import { AcaoFixa, Cabecalho, Indicador } from '@/components/layout';
import { Carregando, ErroCarga } from '@/components/estados';
import { formatarData, formatarMesAno, formatarMoeda, formatarNumero, hojeSP, limitesDoMes, somarMeses } from '@/lib/formato';
import { baixarCsv, numCsv } from '@/lib/csv';
import { ROTULO_CATEGORIA_LANCAMENTO, ROTULO_FORMA, ROTULO_TIPO_LANCAMENTO, rotulo } from '@/lib/rotulos';
import { num } from '@/lib/utils';
import type { TipoLancamento } from '@/lib/rotulos';
import { useLancamentos, useResultadoMes, type LancamentoC } from './dados';
import { situacao } from './situacao';
import { AbaLancamentos } from './AbaLancamentos';
import { AbaRelatorios } from './AbaRelatorios';
import { FormLancamento } from './FormLancamento';

type Aba = 'lancamentos' | 'relatorios';

function exportar(ls: LancamentoC[], mes: string) {
  const hoje = hojeSP();
  baixarCsv(
    `financeiro-${mes.slice(0, 7)}.csv`,
    ls.map((l) => ({
      vencimento: formatarData(l.vencimento),
      tipo: rotulo(ROTULO_TIPO_LANCAMENTO, l.tipo),
      categoria: rotulo(ROTULO_CATEGORIA_LANCAMENTO, l.categoria),
      descricao: l.descricao,
      cliente: l.clientes?.nome ?? '',
      forma: rotulo(ROTULO_FORMA, l.forma_pagamento, ''),
      valor: numCsv(l.valor),
      pago_em: l.pago_em ? formatarData(l.pago_em) : '',
      situacao: situacao(l, hoje),
      motivo_cancelamento: l.motivo_cancelamento ?? '',
    })),
  );
}

export default function PaginaFinanceiro() {
  const [params, setParams] = useSearchParams();
  const hoje = hojeSP();
  const mesParam = params.get('mes');
  const base = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? `${mesParam}-01` : limitesDoMes(hoje).inicio;
  const { inicio, fim } = limitesDoMes(base);
  const aba = (params.get('aba') as Aba) ?? 'lancamentos';
  const [novo, setNovo] = useState<{ aberto: boolean; tipo: TipoLancamento }>({ aberto: false, tipo: 'despesa' });
  const q = useLancamentos(inicio, fim);
  const mes = useResultadoMes(inicio);

  const set = (k: string, v: string) =>
    setParams((p) => {
      p.set(k, v);
      return p;
    });
  const irMes = (d: number) => set('mes', somarMeses(inicio, d).slice(0, 7));

  const todos = q.data ? [...q.data.anteriores, ...q.data.doMes] : [];
  // Somas de lançamentos em aberto (valores vindos do banco; lucro e resultado vêm de v_resultado_mensal)
  const abertasReceita = todos.filter((l) => l.tipo === 'receita' && !l.pago_em && !l.cancelado_em);
  const aReceber = abertasReceita.filter((l) => l.vencimento >= hoje);
  const atrasadas = abertasReceita.filter((l) => l.vencimento < hoje);
  const soma = (ls: LancamentoC[]) => ls.reduce((s, l) => s + (num(l.valor) ?? 0), 0);
  const proximo = aReceber.map((l) => l.vencimento).sort()[0];

  return (
    <>
      <Cabecalho
        titulo="Financeiro"
        resumo={formatarMesAno(inicio)}
        acoes={
          <>
            <div className="flex items-center rounded-md border border-divider">
              <Botao variante="fantasma" tamanho="icone" aria-label="Mês anterior" onClick={() => irMes(-1)}>
                <CaretLeft size={18} aria-hidden />
              </Botao>
              <span className="min-w-36 text-center text-md">{formatarMesAno(inicio)}</span>
              <Botao variante="fantasma" tamanho="icone" aria-label="Próximo mês" onClick={() => irMes(1)}>
                <CaretRight size={18} aria-hidden />
              </Botao>
            </div>
            <Botao onClick={() => exportar(q.data?.doMes ?? [], inicio)} disabled={!q.data?.doMes.length}>
              <DownloadSimple size={18} aria-hidden />
              Exportar planilha
            </Botao>
            <Botao className="hidden md:inline-flex" onClick={() => setNovo({ aberto: true, tipo: 'retirada' })}>
              <HandCoins size={18} aria-hidden />
              Registrar retirada
            </Botao>
            <Botao variante="principal" className="hidden md:inline-flex" onClick={() => setNovo({ aberto: true, tipo: 'despesa' })}>
              <Plus size={18} aria-hidden />
              Novo lançamento
            </Botao>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Indicador className="col-span-2 md:col-span-1" rotulo="Lucro líquido" valor={formatarMoeda(mes.data?.lucro_liquido ?? 0)} nota={`despesas ${formatarMoeda(mes.data?.despesas_operacionais ?? 0)}`} />
        <Indicador rotulo="Faturamento" valor={formatarMoeda(mes.data?.faturamento ?? 0)} nota={`${formatarNumero(mes.data?.vendas ?? 0)} ${mes.data?.vendas === 1 ? 'venda' : 'vendas'}`} />
        <Indicador rotulo="Recebido" valor={formatarMoeda(mes.data?.caixa_recebido ?? 0)} nota="entrou no caixa no mês" />
        <Indicador rotulo="A receber" valor={formatarMoeda(soma(aReceber))} nota={proximo ? `próximo em ${formatarData(proximo)}` : 'nada em aberto'} />
        <Indicador
          rotulo="Atrasado"
          valor={formatarMoeda(soma(atrasadas))}
          nota={`${atrasadas.length} ${atrasadas.length === 1 ? 'parcela' : 'parcelas'}`}
          tom={atrasadas.length ? 'atrasado' : undefined}
        />
      </div>

      <Abas<Aba>
        rotulo="Financeiro"
        valor={aba}
        aoMudar={(v) => set('aba', v)}
        abas={[
          { valor: 'lancamentos', rotulo: 'Lançamentos' },
          { valor: 'relatorios', rotulo: 'Relatórios' },
        ]}
      />

      {aba === 'relatorios' ? (
        <AbaRelatorios inicio={inicio} fim={fim} mes={mes.data} aoRetirar={() => setNovo({ aberto: true, tipo: 'retirada' })} />
      ) : q.isLoading ? (
        <Carregando linhas={6} />
      ) : q.isError ? (
        <ErroCarga erro={q.error} tentarDeNovo={() => void q.refetch()} />
      ) : (
        <AbaLancamentos lancamentos={todos} />
      )}

      <AcaoFixa>
        {aba === 'relatorios' ? (
          <Botao variante="principal" tamanho="bloco" onClick={() => setNovo({ aberto: true, tipo: 'retirada' })}>
            <HandCoins size={18} aria-hidden />
            Registrar retirada
          </Botao>
        ) : (
          <Botao variante="principal" tamanho="bloco" onClick={() => setNovo({ aberto: true, tipo: 'despesa' })}>
            <Plus size={18} aria-hidden />
            Novo lançamento
          </Botao>
        )}
      </AcaoFixa>
      <FormLancamento aberto={novo.aberto} aoMudar={(v) => setNovo((n) => ({ ...n, aberto: v }))} tipoInicial={novo.tipo} />
    </>
  );
}
