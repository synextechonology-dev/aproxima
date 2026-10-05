import { Moon, Sun } from '@phosphor-icons/react';
import { useTema } from '@/hooks/useTema';
import { cn } from '@/lib/utils';

export function AlternarTema({ comTexto, className }: { comTexto?: boolean; className?: string }) {
  const { tema, alternar } = useTema();
  const proximo = tema === 'dark' ? 'claro' : 'escuro';
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={`Mudar para o tema ${proximo}`}
      className={cn(
        'inline-flex min-h-(--tap-min) md:min-h-[36px] items-center gap-3 rounded-md px-3 text-md text-text-muted hover:text-text',
        !comTexto && 'w-(--tap-min) justify-center px-0 md:w-[36px]',
        className,
      )}
    >
      {tema === 'dark' ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
      {comTexto ? `Tema ${proximo}` : null}
    </button>
  );
}
