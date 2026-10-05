import { cva } from 'class-variance-authority';

// Principal: preenchido (--color-accent + --color-on-accent). Secundário: contornado.
export const estiloBotao = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap select-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 min-h-(--tap-min) md:min-h-[36px] px-4 text-md [&_svg]:shrink-0',
  {
    variants: {
      variante: {
        principal: 'bg-accent text-on-accent border border-accent hover:bg-accent-hover hover:border-accent-hover',
        secundario: 'border border-divider text-text hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)]',
        fantasma: 'text-accent-text hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] px-2',
        perigo: 'border border-atrasado-fg text-atrasado-fg hover:bg-atrasado-bg',
      },
      tamanho: {
        normal: '',
        icone: 'px-0 w-(--tap-min) md:w-[36px]',
        bloco: 'w-full',
      },
    },
    defaultVariants: { variante: 'secundario', tamanho: 'normal' },
  },
);

