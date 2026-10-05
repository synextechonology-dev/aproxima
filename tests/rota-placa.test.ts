import handler, { resolverToque, destinoPermitido } from '../api/p/[token].ts';
let falhas = 0;
const eq = (nome: string, a: unknown, b: unknown) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) falhas++; console.log(`${ok ? 'ok  ' : 'FALHOU'} ${nome}${ok ? '' : ` -> ${JSON.stringify(a)} != ${JSON.stringify(b)}`}`); };
const fakeFetch = (resposta: unknown, status = 200) => (async (_u: any, init: any) => {
  (globalThis as any).ultimaChamada = { url: _u, body: init.body, apikey: init.headers.apikey };
  return new Response(JSON.stringify(resposta), { status });
}) as typeof fetch;
const o = { supabaseUrl: 'https://abc.supabase.co', chavePublica: 'pub' };
eq('token válido redireciona', await resolverToque('3f9a1c7e2b4d6a', { ...o, fetchImpl: fakeFetch('https://g.page/r/padaria/review') }), 'https://g.page/r/padaria/review');
eq('chama a RPC certa com o token', (globalThis as any).ultimaChamada, { url: 'https://abc.supabase.co/rest/v1/rpc/registrar_toque', body: '{"p_token":"3f9a1c7e2b4d6a"}', apikey: 'pub' });
eq('token fora do formato nem consulta o banco', await resolverToque('AP-0001', { ...o, fetchImpl: (() => { throw new Error('não devia chamar'); }) as any }), null);
eq('destino fora do Google é recusado', await resolverToque('3f9a1c7e2b4d6a', { ...o, fetchImpl: fakeFetch('https://golpe.com/login') }), null);
eq('destino http é recusado', await resolverToque('3f9a1c7e2b4d6a', { ...o, fetchImpl: fakeFetch('http://g.page/r/x') }), null);
eq('banco devolve null', await resolverToque('3f9a1c7e2b4d6a', { ...o, fetchImpl: fakeFetch(null) }), null);
eq('banco com erro 500', await resolverToque('3f9a1c7e2b4d6a', { ...o, fetchImpl: fakeFetch({}, 500) }), null);
eq('subdomínio falso do google', destinoPermitido('https://g.page.golpe.com/x'), false);
eq('busca do Google permitida', destinoPermitido('https://search.google.com/local/writereview?placeid=X'), true);
// handler completo
const res: any = { headers: {} as Record<string,string>, setHeader(k: string, v: string) { this.headers[k] = v; }, end(b?: string) { this.body = b; } };
globalThis.fetch = fakeFetch('https://g.page/r/padaria/review');
process.env.VITE_SUPABASE_URL = 'https://abc.supabase.co'; process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'pub';
await handler({ query: { token: '3F9A1C7E2B4D6A' } }, res);
eq('handler: 302 + Location + no-store', [res.statusCode, res.headers.Location, res.headers['Cache-Control']], [302, 'https://g.page/r/padaria/review', 'no-store']);
const res2: any = { headers: {}, setHeader(k: string, v: string) { this.headers[k] = v; }, end(b?: string) { this.body = b; } };
globalThis.fetch = (async () => { throw new Error('timeout'); }) as any;
await handler({ query: { token: '3f9a1c7e2b4d6a' } }, res2);
eq('handler: banco fora do ar mostra página neutra', [res2.statusCode, res2.body.includes('Placa não configurada')], [404, true]);
console.log(falhas ? `\n${falhas} falha(s)` : '\ntodos ok');
process.exit(falhas ? 1 : 0);
