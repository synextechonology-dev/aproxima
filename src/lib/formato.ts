import { num } from './utils';

const FUSO = 'America/Sao_Paulo';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export function formatarMoeda(v: number | string | null | undefined, vazio = '—'): string {
  const n = num(v);
  return n === null ? vazio : moeda.format(n);
}

export function formatarNumero(v: number | string | null | undefined, vazio = '—'): string {
  const n = num(v);
  return n === null ? vazio : inteiro.format(n);
}

/** Nota do Google, avaliações por mês, percentuais: uma casa decimal com vírgula. */
export function formatarDecimal(v: number | string | null | undefined, vazio = '—'): string {
  const n = num(v);
  return n === null ? vazio : decimal1.format(n);
}

export function formatarPct(v: number | string | null | undefined, vazio = '—'): string {
  const n = num(v);
  return n === null ? vazio : `${decimal1.format(n)}%`;
}

/** Coluna `date` (aaaa-mm-dd): formata sem passar por fuso, para não mudar o dia. */
export function formatarData(v: string | null | undefined, vazio = '—'): string {
  if (!v) return vazio;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return vazio;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Coluna `timestamptz`: dd/mm/aaaa no fuso de São Paulo. */
export function formatarDataHora(v: string | null | undefined, comHora = false, vazio = '—'): string {
  if (!v) return vazio;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return vazio;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(comHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(d);
}

/** Data de hoje em São Paulo, no formato aaaa-mm-dd. */
export function hojeSP(): string {
  return dataSP(new Date());
}

export function dataSP(d: Date): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return p; // en-CA já sai como aaaa-mm-dd
}

/** Soma dias a uma data aaaa-mm-dd (aritmética de calendário, sem fuso). */
export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

/** Diferença em dias entre duas datas aaaa-mm-dd (b − a). */
export function diasEntre(a: string, b: string): number {
  const utc = (iso: string) => {
    const [ano, mes, dia] = iso.split('-').map(Number);
    return Date.UTC(ano, mes - 1, dia);
  };
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

/** Dia da semana (0 = domingo) de uma data aaaa-mm-dd. */
export function diaDaSemana(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

const NOMES_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export function nomeDiaSemana(iso: string): string {
  return NOMES_DIA[diaDaSemana(iso)];
}

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export function nomeMes(mes1a12: number): string {
  return NOMES_MES[mes1a12 - 1];
}

/** "setembro de 2026" a partir de aaaa-mm(-dd). */
export function formatarMesAno(iso: string): string {
  const [a, m] = iso.split('-').map(Number);
  return `${nomeMes(m)} de ${a}`;
}

/** Primeiro e último dia do mês de uma data aaaa-mm-dd. */
export function limitesDoMes(iso: string): { inicio: string; fim: string } {
  const [a, m] = iso.split('-').map(Number);
  const inicio = `${a}-${String(m).padStart(2, '0')}-01`;
  const fim = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  return { inicio, fim };
}

export function somarMeses(iso: string, meses: number): string {
  const [a, m] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1 + meses, 1));
  return dt.toISOString().slice(0, 10);
}

/** Data/hora local (para <input type="datetime-local">) em São Paulo. */
export function agoraLocalSP(): string {
  const p = new Intl.DateTimeFormat('sv-SE', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
  return p.replace(' ', 'T');
}

/** Converte "aaaa-mm-ddThh:mm" digitado em São Paulo para ISO com fuso (-03:00). */
export function localSPparaISO(v: string): string {
  return `${v}:00-03:00`;
}

const decimal2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
/** Taxa percentual com até 2 casas (4,99%). */
export function formatarTaxa(v: number | string | null | undefined, vazio = '—'): string {
  const n = num(v);
  return n === null ? vazio : `${decimal2.format(n)}%`;
}
