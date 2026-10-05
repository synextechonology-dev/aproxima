import { CalendarBlank, CalendarDots, CheckCircle, Clock, WarningCircle, XCircle, type Icon } from '@phosphor-icons/react';
import type { Tom } from '@/components/selo';
import type { Cliente } from '@/lib/tipos';
import { diasEntre, formatarData, hojeSP } from '@/lib/formato';
import { ROTULO_MOTIVO_DESCARTE, rotulo } from '@/lib/rotulos';

/** Situação do follow-up mostrada no cartão do lead (só exibição; a data vem do banco). */
export function situacaoFollowup(c: Pick<Cliente, 'etapa' | 'proximo_followup' | 'motivo_descarte'>, hoje = hojeSP()): {
  tom: Tom;
  icone: Icon;
  texto: string;
  longo: string;
} {
  if (c.etapa === 'descartado') {
    const m = rotulo(ROTULO_MOTIVO_DESCARTE, c.motivo_descarte, 'Descartado');
    return { tom: 'apagado', icone: XCircle, texto: m, longo: `Descartado: ${m.toLowerCase()}` };
  }
  if (c.etapa === 'cliente') return { tom: 'ok', icone: CheckCircle, texto: 'cliente', longo: 'Já é cliente' };
  if (!c.proximo_followup) return { tom: 'apagado', icone: CalendarDots, texto: 'sem follow-up', longo: 'Sem follow-up marcado' };
  const d = diasEntre(c.proximo_followup, hoje);
  if (d > 0) {
    return {
      tom: 'atrasado',
      icone: WarningCircle,
      texto: `venceu ${formatarData(c.proximo_followup)}`,
      longo: `Follow-up venceu em ${formatarData(c.proximo_followup)} · ${d} ${d === 1 ? 'dia' : 'dias'} de atraso`,
    };
  }
  if (d === 0) return { tom: 'hoje', icone: Clock, texto: 'hoje', longo: 'Follow-up é hoje' };
  return {
    tom: 'neutro',
    icone: CalendarBlank,
    texto: formatarData(c.proximo_followup),
    longo: `Próximo follow-up em ${formatarData(c.proximo_followup)}`,
  };
}
