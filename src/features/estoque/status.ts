import { BookmarkSimple, CheckCircle, Circle, HandTap, Package, Prohibit, WarningCircle, type Icon } from '@phosphor-icons/react';
import type { Tom } from '@/components/selo';
import { ROTULO_STATUS_PLACA, type StatusPlaca } from '@/lib/rotulos';

export const SELO_PLACA: Record<StatusPlaca, { icone: Icon; tom: Tom }> = {
  disponivel: { icone: Circle, tom: 'neutro' },
  reservada: { icone: BookmarkSimple, tom: 'destaque' },
  vendida: { icone: Package, tom: 'hoje' },
  instalada: { icone: CheckCircle, tom: 'ok' },
  demonstracao: { icone: HandTap, tom: 'destaque' },
  defeito: { icone: WarningCircle, tom: 'atrasado' },
  perdida: { icone: Prohibit, tom: 'apagado' },
};

export function seloPlaca(status: string | null) {
  const s = (status ?? 'disponivel') as StatusPlaca;
  return { ...(SELO_PLACA[s] ?? SELO_PLACA.disponivel), texto: ROTULO_STATUS_PLACA[s] ?? String(status) };
}
