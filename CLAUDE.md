# Aproxima — app interno de gestão (placas NFC + upsell de Google e site)

Usado por 2 sócios (João e Nathan), no computador e no celular, inclusive na rua.
Áreas: Painel, Prospecção, Vendas, Projetos, Estoque, Financeiro.

**O banco já está pronto, testado (117 testes) e INSTALADO** no projeto Supabase `aproxima`
(`luqvtkraekxwdxzwboxn`, aplicado em 05/10/2026 em 4 partes pelo conector e conferido objeto por objeto).
O arquivo `supabase/migrations/20261005000000_aproxima_v2.sql` é o registro do que está lá.
**Não rode essa migration de novo nem `supabase db push`**: daria erro (os objetos já existem).
Tipos já gerados em `src/types/database.ts`; `.env` já tem a URL e a chave pública.
As regras de negócio vivem no banco. O front exibe, coleta e chama as RPCs; **não recalcula** lucro,
custo, saldo de estoque, parcelas nem retiradas.

## Stack
- React + Vite + TypeScript (SPA), Tailwind + shadcn/ui, TanStack Query, react-hook-form + zod
- `@supabase/supabase-js` v2 · ícones `@phosphor-icons/react` · fonte `@fontsource/inter` (sem Google Fonts: a CSP bloqueia)
- CSV: `papaparse` · Deploy: Vercel (`vercel.json` já tem rewrites e headers de segurança)
- Tipos: `src/types/database.ts` (já gerado). Após uma migration nova: `npx supabase gen types typescript --project-id luqvtkraekxwdxzwboxn > src/types/database.ts`

## Segurança (não negociável)
1. A segurança está no banco (RLS + grants por coluna + triggers). Esconder botão não protege nada.
2. No front, só `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. A `service_role` nunca entra no código nem na Vercel.
3. `.env*` no `.gitignore`; versionar só `.env.example`.
4. Sem `dangerouslySetInnerHTML`. Texto do banco é sempre texto.
5. Toda rota além de `/login` exige sessão. Logou mas `membros` voltou vazio → tela "Sem acesso" + logout.
6. Sem tela de cadastro (sign up). Usuários são convidados pelo painel do Supabase.
7. Nunca mandar colunas que o banco não libera (ex.: `id`, `created_by`, `status` da venda, `total`): o banco recusa com "permission denied".

## Referência visual
- `design/tokens.css` é a fonte das cores, tipos, espaços e dos dois temas. Importe uma vez e use só `var(--...)`.
- `design/referencia/*.dc.html` são os **esboços** do Claude Design. Leia para layout, hierarquia e textos.
  **Não copie o HTML para o projeto** (não salva nada, não tem acessibilidade nem estados).
  Os números dos esboços são fictícios; em especial a Nova venda usa custo médio R$ 21,40 por placa, mas
  **a regra é o custo do lote de cada placa** (o banco calcula).
- Tema escuro padrão + alternância para claro (`<html data-theme="light">`), lembrada em localStorage.
- Botões principais **preenchidos** (`--color-accent` + `--color-on-accent`); secundários contornados.
- Status sempre com ícone + texto (`--status-*`). Amarelo-estrela (`--color-star`) só para dados do Google,
  e no tema claro só em texto ≥ 14px (contraste 4,5:1).
- Celular: barra inferior (Painel, Prospecção, Vendas, Projetos, Mais → Estoque, Financeiro, Configurações),
  kanban vira abas por etapa, tabelas viram cartões, ação principal em botão fixo embaixo, alvos de toque ≥ 44px.

## Banco: o que o front pode fazer
| Objeto | Front pode | Notas |
|---|---|---|
| `membros` | ler | Gerenciado por SQL |
| `configuracoes` | ler, editar | Linha única: estoque mínimo, taxas de cartão padrão, regras de toque |
| `clientes` (leads) | CRUD | `codigo` L-0001 automático. Etapas: a_prospectar, prospectado, follow_up, negociacao, cliente, descartado. **Cliente é automático** (venda confirmada). Descartar exige `motivo_descarte`. Reativar = mudar etapa (motivo é limpo sozinho). `google_url` único |
| `interacoes` | CRUD | Registrar contato atualiza `proximo_followup` do lead e tira de "A prospectar" |
| `produtos` | ler, criar, editar | Categorias: placa (só uma: acrílico), otimizacao_google, site, outro. Inativar em vez de apagar |
| `lotes` | ler; editar fornecedor/observações | Criar **só** via `registrar_lote` |
| `placas` | ler; editar `destino_url`, `ativo`, `gravada_em` | Status muda só por RPC. `token` é o que vai no link do chip |
| `movimentacoes_estoque`, `toques_placa`, `auditoria` | ler | Escritos pelo banco |
| `vendas` | criar (rascunho), editar rascunho, apagar rascunho | Confirmada/cancelada: só `observacoes`. Status só por RPC |
| `venda_itens` | CRUD em rascunho | Placas são **reservadas** ao adicionar (erro se faltar estoque). `preco_unitario` opcional |
| `projetos` | ler; editar status, prazo, responsável, upsell | `cancelado` e upsell `vendido` são automáticos |
| `projeto_tarefas`, `projeto_pendencias` | CRUD | Checklist nasce da venda |
| `projeto_revisoes` | ler, editar; criar só `marco='extra'` | 30/60/90 dias nascem da venda. Concluir exige `avaliacoes` |
| `lancamentos` | ler; criar avulso; editar avulso; cancelar com motivo | Gerado por venda/lote: só `pago_em`/`forma_pagamento`. Avulso: outra_receita, ferramentas, dominio_hospedagem, deslocamento, marketing, outra_despesa, retirada (exige `socio_id`). Nunca apagar |

### RPCs (`supabase.rpc(nome, params)`)
- `confirmar_venda({ p_venda_id })` — baixa placas, gera parcelas (+ taxa do cartão), cria projeto com checklist e revisões, lead → Cliente, marca upsell.
- `cancelar_venda({ p_venda_id, p_motivo })` — placas não instaladas voltam, instaladas viram "perdida"; parcelas abertas canceladas, pagas viram estorno.
- `trocar_placa_reservada({ p_venda_id, p_placa_atual, p_placa_nova })`
- `registrar_lote({ p_fornecedor, p_quantidade, p_valor_pago, p_frete, p_outras_taxas, p_data_compra, p_forma, p_pago, p_observacoes })`
- `ajustar_placa({ p_placa_id, p_novo_status, p_motivo, p_responsavel })` — demonstração, defeito, perdida, instalada. Motivo obrigatório (exceto instalada).
- `importar_leads({ p_linhas })` — array de objetos (chaves = colunas de `clientes`). Devolve `{ total, inseridos, duplicados[], erros[] }`. Máx. 2000.
- `painel_indicadores({ p_inicio, p_fim, p_vendedor?, p_cidade? })` — JSON do Painel. Para "vs. período anterior", chame de novo com as datas anteriores. Com filtro de vendedor/cidade, `lucro_liquido_parcial = true` (despesas não entram).

### Views (somente leitura)
`v_vendas` (lista com total, custo, taxa, lucro, margem, situação do pagamento; rascunho mostra prévia) ·
`v_projetos` · `v_resultado_projeto` (antes/depois, ritmo, concorrente, toques 30/60/90) · `v_placas` ·
`v_lotes` (custo por placa com frete) · `v_estoque_resumo` · `v_resultado_mensal` (lucro por competência) ·
`v_retiradas_socios` (50/50: parte, retirado, saldo) · `v_painel_hoje` (lista "Pra fazer hoje").

### Erros
- `code === 'P0001'` → regra de negócio: mostrar `error.message` (já em português).
- `42501` ou "permission denied" → "Você não tem permissão para isso".
- `23505` (único) → "Já existe um lead com esse link do Google". `23514` (check) → mensagem do campo.
- Os schemas zod espelham os `check` da migration (tamanhos, telefone `^[0-9+() -]{8,20}$`, URLs `https://`, nota 0–5).

## Telas (ordem sugerida de construção)
1. **Login** (e-mail + senha + código MFA) e casca: menu lateral/inferior, busca global (nome, telefone, L-/V-/AP-), alternância de tema.
2. **Prospecção** (`Prospeccao.dc.html`): kanban/abas, ficha lateral, registrar contato (rápido com uma mão), importar/exportar CSV com prévia, reativar descartado.
3. **Estoque** (`Estoque.dc.html`): resumo, abas Placas/Lotes, registrar lote, ajustar placa, **Gravar link** (mostra `https://<domínio>/p/<token>` com botão copiar; no Chrome do Android pode gravar direto com Web NFC `NDEFReader`, com fallback para copiar).
4. **Vendas** (`Vendas.dc.html`, `Nova venda.dc.html`): lista, editor de rascunho com resumo ao vivo (`v_vendas`), placas reservadas pelo código, confirmar/cancelar (pede motivo).
5. **Projetos** (`Projetos.dc.html`, `Projeto.dc.html`): colunas por status, checklist, pendências, revisões, bloco Resultado, upsell, "Enviar resultado ao cliente" (abre `https://wa.me/<telefone>?text=` com o resumo), "Registrar venda do site".
6. **Financeiro** (`Financeiro.dc.html`): resumo do mês, lançamentos com filtros, marcar pago, cobrar no WhatsApp, relatórios (lucro por venda, custo por lote, vendas por cidade), retiradas 50/50.
7. **Painel** (`Painel.dc.html`): "Pra fazer hoje", indicadores com comparação, 4 gráficos.
8. **Configurações**: estoque mínimo, taxas de cartão padrão (preencher `taxa_cartao_pct` da venda ao escolher cartão), auditoria.

Moeda: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Datas em `America/Sao_Paulo`, formato dd/mm/aaaa.
Valores `numeric` chegam como string ou number; converta antes de formatar.

## Link da placa (público)
`api/p/[token].ts` + rewrite no `vercel.json`. Conta o toque e redireciona (302) só para domínios do Google.
Testes: `node --experimental-strip-types tests/rota-placa.test.ts`. O endereço gravado no chip precisa usar o
**domínio próprio definitivo** — nunca `*.vercel.app`.

## Testes do banco
`supabase/tests/rodar_testes.sh` (Postgres local; cria um banco descartável). Toda migration nova precisa:
RLS ligada, policies com `(select private.is_membro())`, grants por coluna, triggers de autoria e auditoria,
e testes novos que passem junto com os 117 atuais.
