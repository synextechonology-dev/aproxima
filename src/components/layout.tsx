import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Título da página + resumo + ações (no celular, as ações vão para baixo do título). */
export function Cabecalho({
  titulo,
  resumo,
  acoes,
  antes,
}: {
  titulo: ReactNode;
  resumo?: ReactNode;
  acoes?: ReactNode;
  antes?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {antes}
        <h1 className="text-xl font-medium md:text-2xl">{titulo}</h1>
        {resumo ? <p className="text-sm text-text-muted">{resumo}</p> : null}
      </div>
      {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
    </header>
  );
}

/** Ação principal fixa embaixo, acima da barra inferior (só no celular). */
export function AcaoFixa({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-height)+env(safe-area-inset-bottom))] z-20 flex gap-2 border-t border-divider bg-bg px-4 py-3 md:hidden">
      {children}
    </div>
  );
}

/** Espaço no fim da página para a ação fixa não cobrir o conteúdo no celular. */
export function EspacoAcaoFixa() {
  return <div aria-hidden className="h-20 md:hidden" />;
}

export function Secao({
  titulo,
  extra,
  children,
  className,
}: {
  titulo?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-3 rounded-lg bg-surface p-6 shadow-(--shadow-sm)', className)}>
      {titulo || extra ? (
        <div className="flex flex-wrap items-center gap-2">
          {titulo ? <h2 className="flex-1 text-lg font-medium">{titulo}</h2> : null}
          {extra}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Lista "rótulo: valor" da ficha. */
export function Dados({ itens }: { itens: [string, ReactNode][] }) {
  const visiveis = itens.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!visiveis.length) return <p className="text-sm text-text-muted">Nenhum dado preenchido.</p>;
  return (
    <dl className="grid grid-cols-[minmax(96px,auto)_1fr] gap-x-4 gap-y-2 text-md">
      {visiveis.map(([r, v]) => (
        <div key={r} className="contents">
          <dt className="text-text-muted">{r}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Indicador({
  rotulo,
  valor,
  nota,
  tom,
  className,
}: {
  rotulo: string;
  valor: ReactNode;
  nota?: ReactNode;
  tom?: 'atrasado';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-lg bg-surface p-4 shadow-(--shadow-sm)',
        tom === 'atrasado' && 'shadow-[0_0_0_1px_var(--status-atrasado-fg)]',
        className,
      )}
    >
      <span className="text-sm text-text-muted">{rotulo}</span>
      <span className="num text-xl font-medium">{valor}</span>
      {nota ? <span className={cn('text-xs text-text-muted', tom === 'atrasado' && 'text-atrasado-fg')}>{nota}</span> : null}
    </div>
  );
}
