import { Star } from '@phosphor-icons/react';
import { formatarDecimal, formatarNumero } from '@/lib/formato';
import { cn } from '@/lib/utils';

/** Nota e avaliações do Google, no amarelo-estrela (só dados do Google usam essa cor). */
export function NotaGoogle({
  nota,
  avaliacoes,
  curto,
  className,
}: {
  nota: number | string | null | undefined;
  avaliacoes: number | string | null | undefined;
  curto?: boolean;
  className?: string;
}) {
  if ((nota === null || nota === undefined) && (avaliacoes === null || avaliacoes === undefined)) {
    return <span className={cn('text-md text-text-muted', className)}>sem dados do Google</span>;
  }
  return (
    <span className={cn('inline-flex items-center gap-1 text-md', className)}>
      <Star size={14} weight="fill" className="text-star" aria-hidden />
      <span className="num text-star">{formatarDecimal(nota)}</span>
      {avaliacoes !== null && avaliacoes !== undefined ? (
        <span className="num text-text-muted">
          · {formatarNumero(avaliacoes)} {curto ? 'aval.' : 'avaliações'}
        </span>
      ) : null}
    </span>
  );
}
