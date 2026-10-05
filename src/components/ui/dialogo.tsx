import * as D from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

type BaseProps = {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  titulo: ReactNode;
  descricao?: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
  className?: string;
};

const fundo = 'fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--color-bg)_70%,transparent)] backdrop-blur-[2px]';

function Topo({ titulo, descricao }: { titulo: ReactNode; descricao?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-divider px-6 py-4">
      <div className="min-w-0 flex-1">
        <D.Title className="text-lg font-medium">{titulo}</D.Title>
        {descricao ? (
          <D.Description className="text-sm text-text-muted">{descricao}</D.Description>
        ) : (
          <D.Description className="sr-only">{typeof titulo === 'string' ? titulo : 'Janela'}</D.Description>
        )}
      </div>
      <D.Close
        className="tap md:min-h-[36px] md:min-w-[36px] -mr-2 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text"
        aria-label="Fechar"
      >
        <X size={20} />
      </D.Close>
    </div>
  );
}

/** Janela central no computador; no celular ocupa a tela, com o botão de ação embaixo. */
export function Modal({ aberto, aoMudar, titulo, descricao, children, rodape, className }: BaseProps) {
  return (
    <D.Root open={aberto} onOpenChange={aoMudar}>
      <D.Portal>
        <D.Overlay className={fundo} />
        <D.Content
          className={cn(
            'fixed z-50 flex flex-col bg-surface text-text shadow-(--shadow-lg)',
            'inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
            'md:max-h-[90vh] md:w-[min(560px,calc(100vw-32px))] md:rounded-lg',
            className,
          )}
        >
          <Topo titulo={titulo} descricao={descricao} />
          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
          {rodape ? (
            <div className="pb-safe flex flex-col-reverse gap-2 border-t border-divider px-6 py-3 md:flex-row md:justify-end">
              {rodape}
            </div>
          ) : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** Painel lateral no computador (ficha); tela cheia no celular. */
export function Lateral({ aberto, aoMudar, titulo, descricao, children, rodape, className }: BaseProps) {
  return (
    <D.Root open={aberto} onOpenChange={aoMudar}>
      <D.Portal>
        <D.Overlay className={fundo} />
        <D.Content
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface text-text shadow-(--shadow-lg) md:w-[480px]',
            className,
          )}
        >
          <Topo titulo={titulo} descricao={descricao} />
          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
          {rodape ? (
            <div className="pb-safe flex flex-wrap gap-2 border-t border-divider px-6 py-3">{rodape}</div>
          ) : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
