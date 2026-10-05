import { HandTap, Star, WhatsappLogo } from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { Secao } from '@/components/layout';
import { diasEntre, formatarData, formatarDecimal, formatarNumero } from '@/lib/formato';
import { abrirExterno, linkWhatsApp } from '@/lib/contato';
import { ROTULO_MARCO } from '@/lib/rotulos';
import { num } from '@/lib/utils';
import type { DadosProjeto } from './dados';
import { textoResultado } from './textoResultado';

export function BlocoResultado({ d }: { d: DadosProjeto }) {
  const r = d.resultado;
  const temRevisao = r?.avaliacoes_atuais !== null && r?.avaliacoes_atuais !== undefined;
  const wa = linkWhatsApp(d.cliente.telefone, textoResultado(d));
  const dias = r?.ultima_revisao_em && d.venda.data_venda ? diasEntre(d.venda.data_venda, r.ultima_revisao_em) : null;

  // Pontos do gráfico: dia da venda (linha de base) + revisões feitas
  const pontos = [
    { rotulo: 'Dia da venda', data: d.venda.data_venda, avaliacoes: num(d.projeto.baseline_avaliacoes), nota: num(d.projeto.baseline_nota), base: true },
    ...d.revisoes
      .filter((x) => x.realizado_em)
      .map((x) => ({ rotulo: ROTULO_MARCO[x.marco] ?? x.marco, data: x.realizado_em, avaliacoes: num(x.avaliacoes), nota: num(x.nota), base: false })),
  ];
  const maximo = Math.max(1, ...pontos.map((p) => p.avaliacoes ?? 0));
  const base = num(d.projeto.baseline_avaliacoes);

  return (
    <Secao
      titulo={
        <span className="flex items-center gap-2">
          <Star size={20} weight="fill" className="text-star" aria-hidden />
          Resultado no Google
        </span>
      }
    >
      {temRevisao ? (
        <>
          <p className="text-2xl font-medium text-star">
            +{formatarNumero(r!.avaliacoes_ganhas)} avaliações{dias !== null ? ` em ${dias} dias` : ''}
          </p>
          <p className="text-md">
            De {formatarNumero(r!.baseline_avaliacoes)} para {formatarNumero(r!.avaliacoes_atuais)} avaliações
            {r!.nota_atual !== null ? `, e a nota foi de ${formatarDecimal(r!.baseline_nota)} para ${formatarDecimal(r!.nota_atual)}` : ''}.
            {r!.avaliacoes_mes_depois !== null
              ? ` Antes da placa entravam ${formatarDecimal(r!.baseline_avaliacoes_mes)} avaliações por mês; agora entram ${formatarDecimal(r!.avaliacoes_mes_depois)}.`
              : ''}
          </p>
        </>
      ) : (
        <p className="text-md text-text-muted">
          Ainda sem revisão registrada. Na revisão de 30 dias, anote a nota e o número de avaliações no Google para ver o antes e depois.
          {base !== null ? ` No dia da venda eram ${formatarNumero(base)} avaliações.` : ' O lead não tinha avaliações anotadas no dia da venda.'}
        </p>
      )}

      {pontos.some((p) => p.avaliacoes !== null) ? (
        <div className="flex items-end gap-3 pt-2" role="img" aria-label={pontos.map((p) => `${p.rotulo}: ${p.avaliacoes ?? 'sem dado'} avaliações`).join('; ')}>
          {pontos.map((p, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className={p.base ? 'num text-md text-text-muted' : 'num text-md text-star'}>{formatarNumero(p.avaliacoes)}</span>
              <div
                className={p.base ? 'w-full max-w-16 rounded-t-sm bg-neutral-700' : 'w-full max-w-16 rounded-t-sm bg-star'}
                style={{ height: `${Math.max(4, ((p.avaliacoes ?? 0) / maximo) * 140)}px`, opacity: p.base ? 1 : 0.5 + (0.5 * i) / pontos.length }}
              />
              <span className="text-xs text-text-muted">{p.rotulo}</span>
              <span className="num text-xs text-text-muted">{formatarData(p.data)}{p.nota !== null ? ` · ★${formatarDecimal(p.nota)}` : ''}</span>
            </div>
          ))}
        </div>
      ) : null}

      <dl className="grid grid-cols-1 gap-3 text-md md:grid-cols-3">
        <div className="flex flex-col rounded-md bg-bg p-3">
          <dt className="flex items-center gap-1 text-sm text-text-muted"><HandTap size={16} aria-hidden /> Toques na placa</dt>
          <dd className="num text-lg">{formatarNumero(r?.toques_total ?? 0)}</dd>
          <dd className="num text-xs text-text-muted">
            30 dias: {formatarNumero(r?.toques_30d ?? 0)} · 60: {formatarNumero(r?.toques_60d ?? 0)} · 90: {formatarNumero(r?.toques_90d ?? 0)}
          </dd>
        </div>
        <div className="flex flex-col rounded-md bg-bg p-3">
          <dt className="text-sm text-text-muted">Avaliações por mês</dt>
          <dd className="num text-lg">
            {formatarDecimal(r?.baseline_avaliacoes_mes)} → <span className="text-star">{formatarDecimal(r?.avaliacoes_mes_depois)}</span>
          </dd>
        </div>
        <div className="flex flex-col rounded-md bg-bg p-3">
          <dt className="text-sm text-text-muted">Concorrente mais perto</dt>
          <dd>
            {r?.concorrente_nome
              ? `${r.concorrente_nome}${r.concorrente_nota !== null ? ` · ${formatarDecimal(r.concorrente_nota)}` : ''}${r.concorrente_avaliacoes !== null ? ` · ${formatarNumero(r.concorrente_avaliacoes)}` : ''}`
              : 'Não anotado no lead'}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Botao variante="principal" disabled={!wa || !temRevisao} onClick={() => wa && abrirExterno(wa)}>
          <WhatsappLogo size={18} aria-hidden />
          Enviar resultado ao cliente
        </Botao>
        {!d.cliente.telefone ? <span className="self-center text-sm text-text-muted">Cadastre o telefone do lead para enviar.</span> : null}
      </div>
    </Secao>
  );
}
