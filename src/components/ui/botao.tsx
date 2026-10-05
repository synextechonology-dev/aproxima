import type { VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { estiloBotao } from './botao-estilo';

export type BotaoProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof estiloBotao> & { carregando?: boolean };

export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(function Botao(
  { className, variante, tamanho, carregando, disabled, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(estiloBotao({ variante, tamanho }), className)}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...props}
    >
      {carregando ? <CircleNotch className="animate-spin" size={18} aria-hidden /> : null}
      {children}
    </button>
  );
});
