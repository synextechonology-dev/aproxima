import { cn } from '@/lib/utils';

type Aba<T extends string> = { valor: T; rotulo: string; contagem?: number | null };

/** Abas em chips, com rolagem lateral no celular. */
export function Abas<T extends string>({
  abas,
  valor,
  aoMudar,
  rotulo,
  className,
}: {
  abas: Aba<T>[];
  valor: T;
  aoMudar: (v: T) => void;
  rotulo: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={rotulo} className={cn('scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0', className)}>
      {abas.map((a) => {
        const ativa = a.valor === valor;
        return (
          <button
            key={a.valor}
            role="tab"
            type="button"
            aria-selected={ativa}
            onClick={() => aoMudar(a.valor)}
            className={cn(
              'inline-flex min-h-(--tap-min) md:min-h-[36px] shrink-0 items-center gap-2 rounded-md border px-3 text-sm whitespace-nowrap',
              ativa ? 'border-accent bg-accent-soft text-accent-text' : 'border-divider text-text hover:border-neutral-600',
            )}
          >
            {a.rotulo}
            {a.contagem !== undefined && a.contagem !== null ? (
              <span className="num text-xs text-text-muted">{a.contagem}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Controle segmentado (opções exclusivas, como Todos / João / Nathan). */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
  className,
}: {
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  aoMudar: (v: T) => void;
  rotulo: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className={cn('inline-flex overflow-hidden rounded-md border border-divider', className)}>
      {opcoes.map((o, i) => {
        const ativa = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativa}
            onClick={() => aoMudar(o.valor)}
            className={cn(
              'min-h-(--tap-min) md:min-h-[36px] px-3 text-sm whitespace-nowrap',
              i > 0 && 'border-l border-divider',
              ativa ? 'bg-accent-soft text-accent-text shadow-[inset_0_0_0_1px_var(--color-accent)]' : 'hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)]',
            )}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}
