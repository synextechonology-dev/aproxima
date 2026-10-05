# Relatório de construção do Aproxima

Data: 05/10/2026 · Repositório: `synextechonology-dev/aproxima` (app na raiz)

> **Atenção (temporário):** a verificação em duas etapas (código TOTP) está **desligada** para os primeiros testes
> (`EXIGIR_MFA = false` em `src/app/seguranca.ts`). O login pede só e-mail e senha; os dados continuam protegidos
> pelo banco (só quem está em `membros` acessa). **Antes de publicar para uso real, mude para `true`**, faça o build
> de novo e habilite o TOTP em Supabase → Authentication → Multi-Factor.

## Como rodar localmente

```bash
npm install
npm run dev          # abre em http://localhost:5173
```

O `.env` já tem `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Para entrar, a conta precisa:
1. ter sido convidada pelo painel do Supabase;
2. estar em `public.membros` (SQL do `SETUP.md`);
3. ter TOTP ativado, quando `EXIGIR_MFA` estiver ligado (hoje está desligado). Com ele ligado, o app mostra o QR code no primeiro login.

Outros comandos: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run preview` (serve o `dist/`),
`npm run test:placa` (o mesmo que `node --experimental-strip-types tests/rota-placa.test.ts`).

No `localhost`, a rota `/p/<token>` não existe (ela é uma função da Vercel). Para testá-la, use `vercel dev`.

## Resultado das verificações finais

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | sem erros |
| `npm run lint` (com `--max-warnings=0`) | sem erros e sem avisos |
| `npm run build` | ok |
| `node --experimental-strip-types tests/rota-placa.test.ts` | 11 de 11 ok |
| `api/p/[token].ts`, `vercel.json`, migration, `database.ts`, `tokens.css` | idênticos aos do zip (conferido com `cmp`) |
| `.env` no git | não está; só o `.env.example` |
| Largura no celular (390px) | nenhuma tela com rolagem lateral |

**Atenção: nada foi testado contra o banco real.** Não tenho credenciais de sócio nem código MFA. Conferi o visual
e os dados enviados com um simulador que intercepta as chamadas ao Supabase no navegador (ficou fora do projeto),
o que garante formato e colunas, mas não garante que o banco aceite cada operação. O roteiro de teste manual abaixo
é o que falta.

## O que foi feito em cada etapa

Estrutura: `src/features/<área>` (dados com TanStack Query, schemas zod, telas), `src/components` (compartilhados),
`src/lib` (cliente Supabase tipado com `src/types/database.ts`, erros, formatação, rótulos, zod).
Todas as escritas usam só as colunas liberadas pelos grants e as RPCs do CLAUDE.md. Erros: `P0001`/`P0002` mostram
a mensagem do banco; `42501`/"permission denied" mostram "Você não tem permissão para isso"; `23505` e `23514`
têm mensagens próprias.

1. **Login e casca** (`etapa 1`): e-mail + senha, código TOTP, ativação de TOTP com QR code quando a conta ainda
   não tem, tela "Sem acesso" (com Sair) quando a conta não está em `membros`. Menu lateral no computador, barra
   inferior no celular (Painel, Prospecção, Vendas, Projetos, Mais → Estoque, Financeiro, Configurações). Busca global
   (Ctrl/⌘K) por nome, telefone e códigos L-/V-/AP-. Tema escuro padrão + claro lembrado no `localStorage`.
2. **Prospecção** (`etapa 2`): kanban de 6 etapas no computador, abas por etapa no celular, filtros por responsável,
   cidade e busca. Ficha lateral (tela cheia no celular) com WhatsApp, Ligar, Google, Editar, Mover, Descartar
   (com motivo), Reativar e Excluir. Registrar contato com chips grandes de canal e de próximo follow-up.
   Importar CSV com prévia, aliases de cabeçalho, modelo para baixar e resumo de inseridos, repetidos e erros
   (`importar_leads`). Exportar CSV.
3. **Estoque** (`etapa 3`): resumo (`v_estoque_resumo`), abas Placas (tabela/cartões, filtros) e Lotes. Registrar
   lote (`registrar_lote`), editar fornecedor e observações, ficha da placa com movimentações, ajustar status
   (`ajustar_placa`, só as transições que a RPC aceita), ativar e desativar link. **Gravar link**: mostra
   `https://<domínio>/p/<token>`, salva o destino, grava com Web NFC (`NDEFReader`) no Chrome do Android e oferece
   Copiar como alternativa; marca `gravada_em`.
4. **Vendas** (`etapa 4`): lista com período, cidade, vendedor, com serviço / só placas, status e busca; totais do
   cabeçalho vindos de `painel_indicadores`; exportar CSV. Nova venda a partir da ficha do lead (`?cliente=`) ou
   escolhendo o cliente. Editor do rascunho: salva sozinho, itens com reserva de placas, preço editável, troca de
   placa reservada (`trocar_placa_reservada`), forma de pagamento (cartão preenche a taxa padrão), resumo ao vivo de
   `v_vendas`, confirmar (`confirmar_venda`), cancelar com motivo (`cancelar_venda`) e apagar rascunho. Depois de
   confirmada, só a observação muda; mostra os lançamentos da venda e o link para o projeto.
5. **Projetos** (`etapa 5`): colunas por status no computador, abas no celular, filtros por responsável e "Só com
   upsell em aberto", cancelados escondidos por padrão. Página do projeto: status, prazo, responsável, observações,
   bloco **Resultado no Google** (`v_resultado_projeto`, gráfico do dia da venda e das revisões, toques 30/60/90,
   concorrente), "Enviar resultado ao cliente" (wa.me com o resumo), checklist, pendências com "Cobrar pendência",
   revisões (registrar, reabrir, agendar extra), upsell com "Registrar venda do site" e "da otimização", placas do
   projeto (gravar link, marcar instalada).
6. **Financeiro** (`etapa 6`): navegação por mês, resumo (`v_resultado_mensal` + somas de lançamentos em aberto),
   lançamentos do mês e atrasados de meses anteriores com filtros por situação, marcar pago/recebido, desfazer
   pagamento, cobrar no WhatsApp, novo lançamento avulso, editar e cancelar com motivo (só avulsos). Relatórios:
   lucro por venda, retiradas 50/50 (`v_retiradas_socios`) com Registrar retirada, vendas por cidade e custo por lote.
   Exportar planilha (CSV).
7. **Painel** (`etapa 7`): saudação, "Pra fazer hoje" (`v_painel_hoje`) com ação por tipo e filtro "Só os meus",
   indicadores do período com comparação ao período anterior, taxa de upsell e 4 gráficos (funil, faturamento e lucro
   por mês, vendas por cidade, motivos de descarte), filtros de vendedor e cidade com aviso de lucro parcial.
8. **Configurações** (`etapa 8`): estoque mínimo, taxas padrão de cartão, regras de toque, produtos e preços (criar,
   editar, inativar), sócios, tema, sair e auditoria com filtro por área e paginação.

## O que ficou faltando

- **Teste com o banco real** (login, MFA e cada RPC). É o maior risco em aberto.
- **Web NFC num Android de verdade** e leitura em iPhone/Android de um chip gravado.
- Testes automatizados do front (o projeto só tem o teste da rota da placa).
- Arrastar e soltar no kanban: a etapa muda pelo menu "Mover para outra etapa" da ficha.
- Linha do tempo do upsell do esboço do Projeto ("Oferecido em 10/09 → Proposta enviada em 15/09"): o banco guarda
  só o status atual, sem datas de cada passo.
- Itens do esboço que exigiriam cálculo no front e por isso **não** foram feitos (ver dúvidas 2, 3 e 9).

## Dúvidas e decisões anotadas

1. **Repositório.** O app foi construído primeiro dentro do repositório `synex` (pasta `aproxima/`), porque ele já
   tinha outro projeto na raiz. Depois foi movido, com o histórico das etapas, para este repositório, onde fica na
   raiz. Na Vercel, não é preciso configurar Root Directory. O `vercel.json` e o `api/` estão iguais aos originais.
2. **Registrar lote.** O esboço mostra custo por placa e "nova média" antes de salvar. Isso seria recalcular custo no
   front, o que a instrução proíbe; o app avisa que o banco calcula e mostra o custo por placa devolvido pela RPC.
3. **Nova venda.** O esboço mostra "3x de R$ 166,67" e custo "2 × R$ 21,40". As parcelas são geradas pelo banco na
   confirmação (com os centavos na última), então o app mostra só o número de parcelas; o custo vem de `v_vendas`,
   pelo lote de cada placa. A alternância de desconto em % foi omitida, porque exigiria converter % em R$ no front.
4. **Taxa do cartão.** Ao escolher crédito ou débito, o app preenche a taxa padrão (editável). Ao escolher outra
   forma, zera a taxa. O CLAUDE.md não diz o que fazer fora do cartão; confirme se é isso.
5. **Domínio do link da placa.** O link usa o endereço por onde o app foi aberto. Em `*.vercel.app`, gravar e copiar
   ficam bloqueados; em `localhost` há um aviso. Não criei variável de ambiente de domínio porque o CLAUDE.md diz
   que o front só tem as duas variáveis do Supabase. Se preferir fixar o domínio, isso precisa de uma variável nova.
6. **MFA obrigatório.** Conta sem TOTP verificado é levada à tela de ativação antes de entrar. Isso segue o
   SETUP.md ("ativar nos dois usuários"), mas depende de o TOTP estar habilitado em Authentication → Multi-Factor.
7. **Registrar contato.** O follow-up vem marcado em "Em 3 dias" para agilizar o uso com uma mão. Escolher "Sem
   follow-up" apaga o follow-up do lead (é o que o trigger faz com valor vazio). O padrão é escolha de interface,
   não regra de negócio.
8. **Financeiro: "A receber" e "Atrasado"** são somas, no front, dos lançamentos em aberto já carregados. Lucro,
   faturamento e recebido vêm de `v_resultado_mensal`. O esboço tem "lucro por cidade", mas `painel_indicadores` só
   devolve vendas e faturamento por cidade; a coluna de lucro foi omitida para não calcular no front.
9. **Projeto.** O esboço mostra "17% viraram avaliação" e "3,3× o do dia da venda", que não existem nas views;
   ficaram de fora. A frase "+54 avaliações em 90 dias" usa a diferença de datas entre a venda e a última revisão.
10. **Cores do gráfico mensal.** A paleta de tokens não tem dois tons de série que passem no validador de contraste e
    daltonismo no tema claro. Usei faturamento em neutro (contexto) e lucro no `--color-accent` (destaque), com
    legenda, valores visíveis, dica ao passar o mouse e tabela para leitor de tela.
11. **Produtos e preços** ficaram em Configurações, porque o CLAUDE.md permite criar e editar produtos mas não
    define uma tela para isso.
12. **Comparação do Painel.** "Este mês" compara com o mês anterior até o mesmo dia; "Mês passado" com o mês
    anterior a ele; "Últimos 90 dias" com os 90 dias antes.
13. **Totais da lista de Vendas** respeitam período, vendedor e cidade, mas não o filtro "com serviço / só placas"
    (o `painel_indicadores` não tem esse filtro).
14. **Excluir lead** está disponível (o CLAUDE.md libera CRUD em `clientes`); lead com venda é recusado pelo banco.
    A ficha sugere Descartar no lugar.
15. **TypeScript 5.9**, e não o 7.0: o `typescript-eslint` ainda não suporta o 7.
16. **Regras do lint** que precisei liberar só para `api/` e `tests/` (arquivos que não podem mudar): `no-explicit-any`
    e `no-useless-assignment`. No `src/` há uma regra extra que proíbe `dangerouslySetInnerHTML`.
17. **shadcn/ui.** Os componentes de `src/components/ui` seguem o padrão do shadcn (Radix Dialog e Dropdown,
    `class-variance-authority`, `tailwind-merge`), mas foram escritos à mão em vez de gerados pelo CLI, para usar só
    os tokens de `design/tokens.css`. A paleta padrão do Tailwind foi desligada em `src/index.css`: uma cor fora dos
    tokens simplesmente não existe, e o espaçamento do Tailwind segue a escala `--space-*`.

## Roteiro de teste manual

Faça cada roteiro no computador (janela larga) e no celular (Chrome do Android e Safari do iPhone), nos dois temas.
No celular, confira também: barra inferior visível, botão principal fixo acima dela, alvos de toque confortáveis e
nenhuma rolagem lateral.

### 1. Login e casca
- Computador: entrar com e-mail e senha errados → "E-mail ou senha incorretos". Entrar certo → pede o código; código
  errado → mensagem; código certo → Painel. Conta convidada sem linha em `membros` → "Sem acesso" e Sair funciona.
- Primeiro login sem TOTP → QR code; ler com o app autenticador; código → entra.
- Ctrl+K abre a busca: buscar por nome, por parte do telefone (só números), por `L-0001`, `V-0001`, `AP-0001`.
- Trocar o tema, recarregar a página: o tema continua.
- Celular: barra inferior com 5 itens; "Mais" abre Estoque, Financeiro, Configurações, Tema e Sair; a lupa no topo abre a busca.

### 2. Prospecção
- Sem leads: aparece "Nenhum lead ainda" com Cadastrar lead e Importar CSV.
- Novo lead: deixar nome vazio, telefone com letras, Google sem `https://` e nota 6 → mensagens de erro nos campos.
  Salvar certo → aparece com código L-.
- Cadastrar outro lead com o mesmo link do Google → "Já existe um lead com esse link do Google".
- Abrir a ficha: WhatsApp e Ligar abrem os apps; Editar salva; Registrar contato (canal, resumo, "Sexta") → o lead
  sai de "A prospectar" e mostra o follow-up; editar e apagar o contato.
- Mover para outra etapa; tentar Cliente não é possível; Descartar sem motivo não salva; com motivo vai para
  Descartado; Reativar volta para A prospectar.
- Importar CSV: baixar o modelo, preencher 3 linhas (uma repetida, uma sem cidade), conferir a prévia e o resumo final.
- Exportar CSV e abrir no Excel (acentos certos).
- Celular: abas por etapa, aba Descartado com Reativar, ficha em tela cheia, Registrar contato com uma mão.

### 3. Estoque
- Sem lotes: aparece o convite para Registrar lote.
- Registrar lote com 3 placas, valor, frete e taxas → aviso com o custo por placa calculado pelo banco; aparecem
  AP- novos; o Financeiro mostra as despesas do lote.
- Ajustar placa disponível → Em demonstração (com quem fica) → Com defeito (motivo obrigatório) → Disponível.
- Gravar link: digitar o código, salvar o destino `https://g.page/r/.../review`; destino fora do Google mostra aviso;
  Copiar link; Marcar como gravada.
- Abrir o app por `*.vercel.app` → gravar e copiar bloqueados com aviso.
- Celular Android (Chrome, domínio próprio): "Gravar no chip agora" e encostar o chip; tocar o chip com outro
  celular abre a avaliação.
- Desativar o link da placa → o toque mostra "Placa não configurada".

### 4. Vendas
- Da ficha do lead, Registrar venda → cria o rascunho com o cliente.
- Adicionar placa com estoque zerado → mensagem do banco (estoque insuficiente).
- Adicionar placa, + e −, mudar preço, adicionar Otimização; resumo atualiza (total, custo pelo lote, taxa, lucro).
- Escolher Cartão de crédito → taxa preenchida com a das Configurações; mudar parcelas, desconto, entrada.
- Trocar uma placa reservada por outra disponível; Trocar cliente.
- Entrada maior que o total e Confirmar → mensagem do banco.
- Confirmar venda → status Confirmada, lançamentos aparecem, projeto criado, lead vira Cliente, placas vendidas.
- Tentar editar algo além da observação depois de confirmada: os campos não aparecem; a observação salva.
- Cancelar venda sem motivo não deixa; com motivo → cancelada, placas voltam, parcelas canceladas ou estornadas.
- Apagar um rascunho → placas reservadas voltam.
- Lista: filtros, busca, Exportar CSV. Celular: cartões e botão fixo Nova venda; no editor, total, lucro e
  Confirmar fixos embaixo.

### 5. Projetos
- Projeto da venda confirmada aparece em "A entregar" com o checklist.
- Mudar status, prazo (no passado → selo vencido) e responsável.
- Marcar itens do checklist, incluir e remover item.
- Registrar pendência, Cobrar pendência (WhatsApp), Marcar resolvida, Reabrir.
- Registrar a revisão de 30 dias sem avaliações e tentar concluir → pede avaliações; concluir com nota e avaliações →
  bloco Resultado mostra o antes e depois; Enviar resultado ao cliente abre o WhatsApp com o texto.
- Upsell: mudar Site para "Em negociação", data para oferecer de novo (aparece no Painel no dia); Registrar venda do
  site → rascunho com o Site; confirmar → upsell vira Vendido sozinho.
- Projeto de venda cancelada: aviso e nada editável.
- Celular: abas por status; na página, botão fixo "Enviar resultado ao cliente".

### 6. Financeiro
- Navegar entre meses; o resumo muda.
- Marcar parcela como recebida (data e forma); Desfazer pagamento.
- Parcela vencida de cliente com telefone → Cobrar no WhatsApp.
- Novo lançamento (despesa Ferramentas), editar, cancelar com motivo (fica riscado, não some).
- Tentar editar lançamento de venda: só aparecem Recebido/Desfazer.
- Registrar retirada → Relatórios mostram o saldo de cada sócio atualizado.
- Relatórios: lucro por venda, vendas por cidade, custo por lote. Exportar planilha.
- Celular: tabelas viram cartões; botão fixo muda entre Novo lançamento e Registrar retirada.

### 7. Painel
- "Pra fazer hoje" lista follow-ups vencidos, revisões, parcelas atrasadas, prazos e estoque baixo; cada botão leva à
  tela certa; "Só os meus" filtra.
- Trocar o período (Este mês, Mês passado, Últimos 90 dias) e conferir a comparação.
- Filtrar por vendedor ou cidade → aviso de lucro parcial.
- Conferir os 4 gráficos (passar o mouse mostra os valores) e os estados vazios num período sem vendas.

### 8. Configurações
- Mudar estoque mínimo para acima do disponível → Painel e Estoque avisam estoque baixo.
- Taxa de crédito 25 → erro "de 0 a 20"; salvar 3,5 → nova venda no crédito usa 3,5.
- Criar produto Outro, editar preço, inativar (some das opções da venda), reativar.
- Auditoria: filtrar por Leads e Vendas, paginar.
