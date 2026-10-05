import * as M from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Menu = M.Root;
export const GatilhoMenu = M.Trigger;

export function ConteudoMenu({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <M.Portal>
      <M.Content
        align="end"
        sideOffset={6}
        className={cn('z-50 min-w-52 rounded-md bg-surface p-1 shadow-(--shadow-md)', className)}
      >
        {children}
      </M.Content>
    </M.Portal>
  );
}

export function ItemMenu({
  children,
  aoEscolher,
  perigo,
  disabled,
}: {
  children: ReactNode;
  aoEscolher: () => void;
  perigo?: boolean;
  disabled?: boolean;
}) {
  return (
    <M.Item
      disabled={disabled}
      onSelect={aoEscolher}
      className={cn(
        'flex min-h-(--tap-min) md:min-h-[36px] cursor-pointer items-center gap-3 rounded-sm px-3 text-md outline-none',
        'data-[highlighted]:bg-accent-soft data-[disabled]:opacity-50',
        perigo && 'text-atrasado-fg',
      )}
    >
      {children}
    </M.Item>
  );
}

export const SeparadorMenu = () => <M.Separator className="my-1 h-px bg-divider" />;
