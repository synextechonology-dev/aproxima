import { cn } from '@/lib/utils';

export type Barra = { rotulo: string; valor: number; texto: string; detalhe?: string };

/**
 * Barras horizontais de uma série (magnitude). Um eixo só, valor sempre visível ao lado,
 * dica ao passar o mouse/foco e lista acessível com os mesmos números.
 */
export function BarrasHorizontais({ dados, vazio, rotulo }: { dados: Barra[]; vazio: string; rotulo: string }) {
  if (!dados.length) return <p className="text-md text-text-muted">{vazio}</p>;
  const max = Math.max(1, ...dados.map((d) => d.valor));
  return (
    <ul className="flex flex-col gap-2" aria-label={rotulo}>
      {dados.map((d) => (
        <li key={d.rotulo} className="group grid grid-cols-[minmax(88px,30%)_1fr_auto] items-center gap-3" title={`${d.rotulo}: ${d.texto}${d.detalhe ? ` · ${d.detalhe}` : ''}`} tabIndex={0}>
          <span className="truncate text-sm text-text-muted">{d.rotulo}</span>
          <span className="relative h-[12px]" aria-hidden>
            <span
              className="absolute inset-y-0 left-0 rounded-r-sm bg-accent group-hover:bg-accent-hover group-focus:bg-accent-hover"
              style={{ width: `${Math.max(1.5, (d.valor / max) * 100)}%` }}
            />
          </span>
          <span className="num text-sm">
            {d.texto}
            {d.detalhe ? <span className="text-text-muted"> · {d.detalhe}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Faturamento x lucro líquido por mês: mesmo eixo (R$), faturamento como contexto
 * (neutro) e lucro em destaque (acento). Legenda + valores visíveis + tabela para leitor de tela.
 */
export function BarrasMensais({
  dados,
  formatar,
  formatarCurto,
}: {
  dados: { rotulo: string; faturamento: number; lucro: number }[];
  formatar: (n: number) => string;
  formatarCurto: (n: number) => string;
}) {
  if (!dados.length) return <p className="text-md text-text-muted">Sem vendas nos últimos meses.</p>;
  const max = Math.max(1, ...dados.flatMap((d) => [d.faturamento, Math.max(0, d.lucro)]));
  const altura = 140;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4 text-sm" aria-hidden>
        <span className="flex items-center gap-2"><span className="size-[10px] rounded-sm bg-neutral-600" />faturamento</span>
        <span className="flex items-center gap-2"><span className="size-[10px] rounded-sm bg-accent" />lucro líquido</span>
      </div>
      <div className="flex items-end gap-2 border-b border-divider md:gap-3" aria-hidden style={{ height: altura + 36 }}>
        {dados.map((d) => (
          <div key={d.rotulo} className="group flex min-w-0 flex-1 flex-col items-center gap-1" title={`${d.rotulo}: faturamento ${formatar(d.faturamento)} · lucro líquido ${formatar(d.lucro)}`}>
            <span className="num max-w-full truncate text-xs text-text-muted">{formatarCurto(d.faturamento)}</span>
            <div className="flex w-full items-end justify-center gap-[2px]" style={{ height: altura }}>
              <span className="w-1/3 max-w-6 rounded-t-sm bg-neutral-600 group-hover:opacity-80" style={{ height: `${(d.faturamento / max) * altura}px` }} />
              <span className={cn('w-1/3 max-w-6 rounded-t-sm bg-accent group-hover:bg-accent-hover')} style={{ height: `${(Math.max(0, d.lucro) / max) * altura}px` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 md:gap-3" aria-hidden>
        {dados.map((d) => (
          <span key={d.rotulo} className="min-w-0 flex-1 text-center text-xs text-text-muted">{d.rotulo}</span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Faturamento e lucro líquido por mês</caption>
        <thead><tr><th>Mês</th><th>Faturamento</th><th>Lucro líquido</th></tr></thead>
        <tbody>
          {dados.map((d) => (
            <tr key={d.rotulo}><td>{d.rotulo}</td><td>{formatar(d.faturamento)}</td><td>{formatar(d.lucro)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
