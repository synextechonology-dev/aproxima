import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const base =
  'w-full rounded-md border border-divider bg-surface text-text px-3 min-h-(--tap-min) md:min-h-[36px] text-md caret-accent placeholder:text-text-muted hover:border-neutral-600 focus-visible:border-accent focus-visible:outline-offset-0 aria-invalid:border-atrasado-fg disabled:opacity-60';

export const Entrada = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Entrada(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(base, 'py-2', className)} {...props} />;
});

export const AreaTexto = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AreaTexto({ className, rows = 3, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(base, 'py-2 resize-y', className)} {...props} />;
  },
);

export const Selecao = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Selecao(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(base, 'appearance-none pr-9 py-2', className)} {...props}>
        {children}
      </select>
      <CaretDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
      />
    </div>
  );
});

type CampoProps = {
  rotulo: string;
  erro?: string;
  dica?: ReactNode;
  obrigatorio?: boolean;
  className?: string;
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
};

/** Rótulo + controle + erro/dica, com os ids ligados para leitores de tela. */
export function Campo({ rotulo, erro, dica, obrigatorio, className, children }: CampoProps) {
  const id = useId();
  const idAjuda = `${id}-ajuda`;
  const controle = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': erro ? true : undefined,
        'aria-describedby': erro || dica ? idAjuda : undefined,
      })
    : children;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-xs text-text-muted">
        {rotulo}
        {obrigatorio ? <span aria-hidden> *</span> : null}
      </label>
      {controle}
      {erro ? (
        <p id={idAjuda} role="alert" className="text-xs text-atrasado-fg">
          {erro}
        </p>
      ) : dica ? (
        <p id={idAjuda} className="text-xs text-text-muted">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

/** Caixa de seleção com área de toque de 44px. */
export const Marcar = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { rotulo: ReactNode }>(
  function Marcar({ rotulo, className, ...props }, ref) {
    return (
      <label className={cn('inline-flex items-center gap-3 min-h-(--tap-min) md:min-h-[36px] cursor-pointer', className)}>
        <input ref={ref} type="checkbox" className="size-[20px] accent-accent cursor-pointer" {...props} />
        <span>{rotulo}</span>
      </label>
    );
  },
);
