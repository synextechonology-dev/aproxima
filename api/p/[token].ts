// Rota pública do link gravado na placa: https://<domínio>/p/<token>
// Conta o toque no banco (registrar_toque) e redireciona para a página de
// avaliação do Google. Não lê cookie, não grava IP, não guarda nada de quem tocou.
//
// Variáveis de ambiente (Vercel):
//   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY  (as mesmas do app; chave pública)
//   DESTINOS_PERMITIDOS (opcional) — hosts extras separados por vírgula

const TOKEN_RE = /^[0-9a-f]{14}$/;

// Só redireciona para endereços do Google. Se alguém invadir a conta de um
// sócio, não consegue mandar as placas instaladas para um site falso.
export const HOSTS_PADRAO = [
  'g.page',
  'google.com',
  'www.google.com',
  'search.google.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'goo.gl',
  'g.co',
];

export function destinoPermitido(url: string, hosts: string[] = HOSTS_PADRAO): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && hosts.includes(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

type Opcoes = {
  supabaseUrl: string;
  chavePublica: string;
  hosts?: string[];
  fetchImpl?: typeof fetch;
};

export async function resolverToque(token: string, o: Opcoes): Promise<string | null> {
  if (!TOKEN_RE.test(token)) return null;
  const resposta = await (o.fetchImpl ?? fetch)(`${o.supabaseUrl}/rest/v1/rpc/registrar_toque`, {
    method: 'POST',
    // Só o cabeçalho apikey: as chaves novas (sb_publishable_...) não são JWT e não vão em Authorization
    headers: {
      apikey: o.chavePublica,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_token: token }),
    signal: AbortSignal.timeout(4000),
  });
  if (!resposta.ok) return null;
  const destino: unknown = await resposta.json();
  return typeof destino === 'string' && destinoPermitido(destino, o.hosts) ? destino : null;
}

export const PAGINA_NEUTRA = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Placa não configurada</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;
background:#f2f3f7;color:#14161f}main{max-width:320px;padding:24px;text-align:center}
p{color:#585c6f;line-height:1.5}</style></head>
<body><main><h1>Placa não configurada</h1>
<p>Esta placa ainda não está ligada a uma página. Avise o estabelecimento.</p></main></body></html>`;

// Handler da Vercel (Node). O rewrite /p/:token → /api/p/:token está no vercel.json.
export default async function handler(req: any, res: any) {
  const token = String(req.query?.token ?? '').toLowerCase();
  const extras = (process.env.DESTINOS_PERMITIDOS ?? '')
    .split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);

  let destino: string | null = null;
  try {
    destino = await resolverToque(token, {
      supabaseUrl: process.env.VITE_SUPABASE_URL ?? '',
      chavePublica: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
      hosts: [...HOSTS_PADRAO, ...extras],
    });
  } catch {
    destino = null; // banco fora do ar ou lento: mostra a página neutra
  }

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (destino) {
    res.statusCode = 302;
    res.setHeader('Location', destino);
    res.end();
    return;
  }
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(PAGINA_NEUTRA);
}
