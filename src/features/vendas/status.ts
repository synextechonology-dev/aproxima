import { CheckCircle, CircleHalf, Clock, PencilSimple, XCircle, type Icon } from '@phosphor-icons/react';
import type { Tom } from '@/components/selo';

export const SELO_VENDA: Record<string, { icone: Icon; tom: Tom; texto: string }> = {
  rascunho: { icone: PencilSimple, tom: 'apagado', texto: 'Rascunho' },
  confirmada: { icone: CheckCircle, tom: 'destaque', texto: 'Confirmada' },
  cancelada: { icone: XCircle, tom: 'apagado', texto: 'Cancelada' },
};

export const SELO_PAGAMENTO: Record<string, { icone: Icon; tom: Tom; texto: string }> = {
  pago: { icone: CheckCircle, tom: 'ok', texto: 'Pago' },
  parcial: { icone: CircleHalf, tom: 'hoje', texto: 'Parcial' },
  pendente: { icone: Clock, tom: 'neutro', texto: 'Pendente' },
};
