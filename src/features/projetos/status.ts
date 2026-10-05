import { CheckCircle, CircleDashed, CircleHalf, HourglassMedium, XCircle, type Icon } from '@phosphor-icons/react';
import type { Tom } from '@/components/selo';
import { diasEntre, formatarData, hojeSP } from '@/lib/formato';
import type { StatusProjeto } from '@/lib/rotulos';
import { CalendarBlank, Clock, WarningCircle } from '@phosphor-icons/react';

export const ICONE_STATUS_PROJETO: Record<StatusProjeto, Icon> = {
  a_entregar: CircleDashed,
  em_andamento: CircleHalf,
  aguardando_cliente: HourglassMedium,
  entregue: CheckCircle,
  cancelado: XCircle,
};

/** Selo do prazo (só exibição; "atrasado" vem da view). */
export function seloPrazo(p: { status: string | null; prazo: string | null; atrasado?: boolean | null; entregue_em?: string | null }): {
  tom: Tom;
  icone: Icon;
  texto: string;
} {
  if (p.status === 'entregue') return { tom: 'ok', icone: CheckCircle, texto: p.entregue_em ? `entregue ${formatarData(p.entregue_em.slice(0, 10))}` : 'entregue' };
  if (p.status === 'cancelado') return { tom: 'apagado', icone: XCircle, texto: 'cancelado' };
  if (!p.prazo) return { tom: 'apagado', icone: CalendarBlank, texto: 'sem prazo' };
  const d = diasEntre(hojeSP(), p.prazo);
  if (p.atrasado || d < 0) return { tom: 'atrasado', icone: WarningCircle, texto: `venceu ${formatarData(p.prazo)} · ${-d} ${d === -1 ? 'dia' : 'dias'}` };
  if (d <= 1) return { tom: 'hoje', icone: Clock, texto: `prazo ${formatarData(p.prazo)} · ${d === 0 ? 'hoje' : 'amanhã'}` };
  return { tom: 'neutro', icone: CalendarBlank, texto: `prazo ${formatarData(p.prazo)}` };
}
