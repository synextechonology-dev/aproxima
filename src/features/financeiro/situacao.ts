import { CheckCircle, Clock, WarningCircle, XCircle, type Icon } from '@phosphor-icons/react';
import type { Tom } from '@/components/selo';
import type { Lancamento } from '@/lib/tipos';

export type Situacao = 'pago' | 'aberto' | 'atrasado' | 'cancelado';

export function situacao(l: Pick<Lancamento, 'pago_em' | 'cancelado_em' | 'vencimento'>, hoje: string): Situacao {
  if (l.cancelado_em) return 'cancelado';
  if (l.pago_em) return 'pago';
  return l.vencimento < hoje ? 'atrasado' : 'aberto';
}

export function seloSituacao(s: Situacao, tipo: string): { icone: Icon; tom: Tom; texto: string } {
  switch (s) {
    case 'pago':
      return { icone: CheckCircle, tom: 'ok', texto: tipo === 'receita' ? 'recebido' : 'pago' };
    case 'atrasado':
      return { icone: WarningCircle, tom: 'atrasado', texto: 'atrasado' };
    case 'cancelado':
      return { icone: XCircle, tom: 'apagado', texto: 'cancelado' };
    default:
      return { icone: Clock, tom: 'neutro', texto: tipo === 'receita' ? 'a receber' : 'a pagar' };
  }
}
