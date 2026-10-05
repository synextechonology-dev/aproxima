import type { Icon } from '@phosphor-icons/react';
import { WarningCircle } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { Botao } from '@/components/ui/botao';
import { mensagemDeErro } from '@/lib/erros';
import { cn } from '@/lib/utils';

/** Estado vazio que convida a agir. */
export function Vazio({
  icone: Icone,
  titulo,
  texto,
  acao,
  className,
}: {
  icone: Icon;
  titulo: string;
  texto?: ReactNode;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-lg px-6 py-10 text-center', className)}>
      <Icone size={32} className="text-text-muted" aria-hidden />
      <p className="text-lg font-medium">{titulo}</p>
      {texto ? <p className="max-w-md text-md text-text-muted">{texto}</p> : null}
      {acao ? <div className="mt-2 flex flex-wrap justify-center gap-2">{acao}</div> : null}
    </div>
  );
}

export function ErroCarga({ erro, tentarDeNovo, className }: { erro: unknown; tentarDeNovo?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 rounded-lg bg-atrasado-bg px-6 py-8 text-center text-atrasado-fg', className)}>
      <WarningCircle size={28} aria-hidden />
      <p className="font-medium">Não foi possível carregar</p>
      <p className="text-md">{mensagemDeErro(erro)}</p>
      {tentarDeNovo ? (
        <Botao onClick={tentarDeNovo} variante="secundario">
          Tentar de novo
        </Botao>
      ) : null}
    </div>
  );
}

/** Esqueleto de carregamento (linhas cinzas). */
export function Carregando({ linhas = 4, className, rotulo = 'Carregando' }: { linhas?: number; className?: string; rotulo?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)} role="status" aria-live="polite">
      <span className="sr-only">{rotulo}…</span>
      {Array.from({ length: linhas }, (_, i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded-md bg-surface"
          style={{ opacity: 1 - i * (0.6 / linhas) }}
        />
      ))}
    </div>
  );
}
