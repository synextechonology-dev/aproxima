import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export type Tom = 'atrasado' | 'hoje' | 'ok' | 'neutro' | 'destaque' | 'apagado';

const TONS: Record<Tom, string> = {
  atrasado: 'bg-atrasado-bg text-atrasado-fg',
  hoje: 'bg-hoje-bg text-hoje-fg',
  ok: 'bg-ok-bg text-ok-fg',
  neutro: 'bg-neutro-bg text-neutro-fg',
  destaque: 'bg-accent-800 text-accent-100',
  apagado: 'text-text-muted shadow-[inset_0_0_0_1px_var(--color-neutral-700)]',
};

/** Status sempre com ícone + texto (nunca só a cor). */
export function Selo({ icone: Icone, texto, tom = 'neutro', className }: { icone: Icon; texto: string; tom?: Tom; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-sm px-2 py-0.5 text-xs whitespace-nowrap',
        TONS[tom],
        className,
      )}
    >
      <Icone size={14} weight="bold" aria-hidden className="shrink-0" />
      <span className="truncate">{texto}</span>
    </span>
  );
}
