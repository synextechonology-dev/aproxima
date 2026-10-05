import Papa from 'papaparse';
import { normalizar } from '@/lib/utils';
import { ORIGENS, ROTULO_ORIGEM, ROTULO_SEGMENTO, SEGMENTOS } from '@/lib/rotulos';

/** Colunas que importar_leads aceita (as mesmas do insert da RPC). */
export const COLUNAS_IMPORTACAO = [
  'nome', 'cidade', 'segmento', 'endereco', 'contato_nome', 'telefone', 'email', 'google_url',
  'nota_google', 'avaliacoes_google', 'instagram', 'tem_site', 'site_url', 'origem', 'observacoes',
] as const;
type Coluna = (typeof COLUNAS_IMPORTACAO)[number];

// Cabeçalhos comuns em planilhas → coluna do banco
const APELIDOS: Record<string, Coluna> = {
  estabelecimento: 'nome',
  empresa: 'nome',
  municipio: 'cidade',
  contato: 'contato_nome',
  responsavel: 'contato_nome',
  whatsapp: 'telefone',
  celular: 'telefone',
  fone: 'telefone',
  'e-mail': 'email',
  e_mail: 'email',
  google: 'google_url',
  link_do_google: 'google_url',
  link_google: 'google_url',
  google_maps: 'google_url',
  nota: 'nota_google',
  avaliacoes: 'avaliacoes_google',
  site: 'site_url',
  observacao: 'observacoes',
  obs: 'observacoes',
};

export function colunaDoCabecalho(h: string): Coluna | null {
  const n = normalizar(h).replace(/[\s-]+/g, '_');
  if ((COLUNAS_IMPORTACAO as readonly string[]).includes(n)) return n as Coluna;
  return APELIDOS[n] ?? APELIDOS[normalizar(h)] ?? null;
}

/** Converte rótulos em português para os valores do banco (o resto o banco confere). */
function valorDe(col: Coluna, bruto: string): string {
  const v = bruto.trim();
  if (!v) return '';
  if (col === 'tem_site') {
    const n = normalizar(v);
    if (['sim', 's', 'yes', 'true', '1'].includes(n)) return 'true';
    if (['nao', 'n', 'no', 'false', '0'].includes(n)) return 'false';
    return v;
  }
  if (col === 'segmento') {
    const n = normalizar(v).replace(/\s+/g, '_');
    if ((SEGMENTOS as readonly string[]).includes(n)) return n;
    return SEGMENTOS.find((s) => normalizar(ROTULO_SEGMENTO[s]) === normalizar(v)) ?? v;
  }
  if (col === 'origem') {
    const n = normalizar(v).replace(/\s+/g, '_');
    if ((ORIGENS as readonly string[]).includes(n)) return n;
    return ORIGENS.find((o) => normalizar(ROTULO_ORIGEM[o]) === normalizar(v)) ?? v;
  }
  return v;
}

export type Previa = {
  linhas: Record<string, string>[];
  reconhecidas: Coluna[];
  ignoradas: string[];
  semNomeOuCidade: number;
};

export function lerCsv(arquivo: File): Promise<Previa> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(arquivo, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (r) => {
        const cabecalhos = r.meta.fields ?? [];
        const mapa = new Map<string, Coluna>();
        const ignoradas: string[] = [];
        for (const h of cabecalhos) {
          const c = colunaDoCabecalho(h);
          if (c && ![...mapa.values()].includes(c)) mapa.set(h, c);
          else if (h.trim()) ignoradas.push(h);
        }
        const linhas = r.data.map((bruta) => {
          const l: Record<string, string> = {};
          for (const [h, c] of mapa) l[c] = valorDe(c, String(bruta[h] ?? ''));
          return l;
        });
        resolve({
          linhas,
          reconhecidas: [...mapa.values()],
          ignoradas,
          semNomeOuCidade: linhas.filter((l) => !l.nome || !l.cidade).length,
        });
      },
      error: (e) => reject(e),
    });
  });
}
