// Link gravado no chip: https://<domínio>/p/<token>. Precisa ser o domínio próprio definitivo.

/** Mesma lista de api/p/[token].ts: a rota pública só redireciona para esses hosts. */
const HOSTS_GOOGLE = ['g.page', 'google.com', 'www.google.com', 'search.google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl', 'g.co'];

export function destinoEhGoogle(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && HOSTS_GOOGLE.includes(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export type SituacaoDominio = 'ok' | 'vercel' | 'local';

/** O endereço vem do próprio app aberto; *.vercel.app nunca pode ir para o chip. */
export function situacaoDominio(host = window.location.hostname): SituacaoDominio {
  if (host.endsWith('.vercel.app')) return 'vercel';
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return 'local';
  return 'ok';
}

export function linkDaPlaca(token: string): string {
  return `${window.location.origin}/p/${token}`;
}

/** Status em que o toque redireciona (registrar_toque). */
export const STATUS_QUE_REDIRECIONAM = ['vendida', 'instalada', 'demonstracao'];

type NdefWriter = { write: (m: { records: { recordType: string; data: string }[] }) => Promise<void> };

export function temWebNfc(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window;
}

/** Grava o link no chip pelo Chrome do Android (Web NFC). */
export async function gravarNoChip(url: string): Promise<void> {
  const Leitor = (window as unknown as { NDEFReader: new () => NdefWriter }).NDEFReader;
  await new Leitor().write({ records: [{ recordType: 'url', data: url }] });
}
