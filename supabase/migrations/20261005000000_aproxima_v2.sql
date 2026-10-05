-- =====================================================================
-- Aproxima — banco de dados v2 (Supabase / PostgreSQL 15+)
-- Especificação: documento "Aproxima — Especificação do app (v1)"
--
-- Princípios de segurança:
--   * Só quem está em `membros` (ativo) lê ou altera dados. Conta no Auth
--     sozinha não dá acesso; membros são cadastrados via SQL Editor.
--   * RLS em todas as tabelas + grants por coluna (defesa em profundidade).
--   * Dinheiro e estoque não se apagam: cancelamento/ajuste com motivo.
--   * Operações que mexem em várias áreas (confirmar/cancelar venda,
--     registrar lote) são RPCs atômicas.
--   * Toda escrita relevante vai para `auditoria`.
--   * Única porta pública (anon): registrar_toque(token), que só conta o
--     toque e devolve o destino da placa.
-- =====================================================================

create schema if not exists private;  -- NÃO expor na Data API
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Data de "hoje" no fuso do negócio (o servidor do Supabase roda em UTC:
-- às 22h em SP já seria "amanhã" em UTC).
create or replace function private.hoje()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- ---------------------------------------------------------------------
-- Membros (João e Nathan)
-- ---------------------------------------------------------------------
create table public.membros (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  nome       text not null check (length(trim(nome)) between 1 and 80),
  papel      text not null default 'socio' check (papel in ('admin', 'socio')),
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function private.is_membro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membros m
    where m.user_id = auth.uid() and m.ativo
  );
$$;

-- ---------------------------------------------------------------------
-- Configurações (linha única)
-- ---------------------------------------------------------------------
create table public.configuracoes (
  id                      boolean primary key default true check (id),
  estoque_minimo          integer      not null default 10   check (estoque_minimo >= 0),
  taxa_credito_pct        numeric(5,2) not null default 4.99 check (taxa_credito_pct between 0 and 20),
  taxa_debito_pct         numeric(5,2) not null default 1.99 check (taxa_debito_pct between 0 and 20),
  janela_toque_segundos   integer      not null default 10   check (janela_toque_segundos between 0 and 3600),
  limite_toques_dia       integer      not null default 500  check (limite_toques_dia between 1 and 100000),
  updated_at              timestamptz  not null default now()
);
insert into public.configuracoes default values;

-- ---------------------------------------------------------------------
-- Utilitários de trigger
-- ---------------------------------------------------------------------
-- Autoria não pode ser forjada pelo cliente: vem do JWT.
create or replace function private.tg_autoria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.tg_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;

create table public.auditoria (
  id          bigint generated always as identity primary key,
  tabela      text not null,
  operacao    text not null,
  registro_id text,
  user_id     uuid,
  antes       jsonb,
  depois      jsonb,
  ocorreu_em  timestamptz not null default now()
);
create index auditoria_registro_idx on public.auditoria (tabela, registro_id);
create index auditoria_quando_idx   on public.auditoria (ocorreu_em desc);

create or replace function private.tg_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes  jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_depois jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_reg    jsonb := coalesce(v_depois, v_antes);
begin
  if tg_op = 'UPDATE' and v_antes = v_depois then
    return null;
  end if;
  insert into public.auditoria (tabela, operacao, registro_id, user_id, antes, depois)
  values (tg_table_name, tg_op,
          coalesce(v_reg->>'id', v_reg->>'user_id'),
          auth.uid(), v_antes, v_depois);
  return null;
end;
$$;

-- Código aleatório e não sequencial para o link público da placa
-- (14 hex = 56 bits; impossível de adivinhar por tentativa).
create or replace function private.gerar_token()
returns text
language sql
volatile
set search_path = ''
as $$ select substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 14) $$;

-- =====================================================================
-- PROSPECÇÃO
-- =====================================================================
create table public.clientes (
  id                     uuid primary key default gen_random_uuid(),
  numero                 bigint generated always as identity unique,
  codigo                 text generated always as ('L-' || lpad(numero::text, 4, '0')) stored,
  nome                   text not null check (length(trim(nome)) between 1 and 150),
  segmento               text check (segmento in ('restaurante','bar','lanchonete','padaria','salao_barbearia',
                                                  'clinica_saude','academia','oficina_auto','loja','mercado',
                                                  'hospedagem','pet','servicos','outro')),
  cidade                 text not null check (length(trim(cidade)) between 1 and 80),
  endereco               text check (length(endereco) <= 200),
  contato_nome           text check (length(contato_nome) <= 100),
  telefone               text check (telefone ~ '^[0-9+() -]{8,20}$'),
  email                  text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  google_url             text check (google_url ~* '^https://' and length(google_url) <= 500),
  nota_google            numeric(2,1) check (nota_google between 0 and 5),
  avaliacoes_google      integer check (avaliacoes_google >= 0),
  avaliacoes_mes_antes   numeric(6,1) check (avaliacoes_mes_antes >= 0),
  instagram              text check (length(instagram) <= 80),
  tem_site               boolean,
  site_url               text check (site_url ~* '^https?://' and length(site_url) <= 300),
  interesse              text check (length(interesse) <= 200),
  concorrente_nome       text check (length(concorrente_nome) <= 150),
  concorrente_nota       numeric(2,1) check (concorrente_nota between 0 and 5),
  concorrente_avaliacoes integer check (concorrente_avaliacoes >= 0),
  etapa                  text not null default 'a_prospectar'
                         check (etapa in ('a_prospectar','prospectado','follow_up','negociacao','cliente','descartado')),
  motivo_descarte        text check (motivo_descarte in ('sem_interesse','preco','ja_tem_fornecedor','nao_respondeu',
                                                         'nao_usa_google','fechou','outro')),
  descartado_em          timestamptz,
  origem                 text check (origem in ('visita','indicacao','instagram','whatsapp','lista_importada','outro')),
  responsavel_id         uuid references public.membros (user_id) on delete set null,
  proximo_followup       date,
  observacoes            text check (length(observacoes) <= 4000),
  created_by             uuid references auth.users (id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint descarte_com_motivo check (etapa <> 'descartado' or motivo_descarte is not null)
);
create unique index clientes_google_url_uq on public.clientes (lower(google_url)) where google_url is not null;
create index clientes_etapa_idx       on public.clientes (etapa);
create index clientes_responsavel_idx on public.clientes (responsavel_id);
create index clientes_followup_idx    on public.clientes (proximo_followup) where proximo_followup is not null;
create index clientes_nome_idx        on public.clientes (lower(nome));
create index clientes_cidade_idx      on public.clientes (cidade);
create index clientes_telefone_idx    on public.clientes (regexp_replace(telefone, '\D', '', 'g')) where telefone is not null;

create table public.interacoes (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references public.clientes (id) on delete cascade,
  canal            text not null check (canal in ('visita','whatsapp','ligacao','instagram','email','outro')),
  resumo           text not null check (length(trim(resumo)) between 1 and 2000),
  proximo_passo    text check (length(proximo_passo) <= 300),
  proximo_followup date,
  ocorreu_em       timestamptz not null default now(),
  created_by       uuid references auth.users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index interacoes_cliente_idx on public.interacoes (cliente_id, ocorreu_em desc);

-- =====================================================================
-- CATÁLOGO
-- =====================================================================
create table public.produtos (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null check (length(trim(nome)) between 1 and 120),
  descricao    text check (length(descricao) <= 1000),
  categoria    text not null check (categoria in ('placa','otimizacao_google','site','outro')),
  preco_padrao numeric(12,2) not null default 0 check (preco_padrao >= 0),
  custo_padrao numeric(12,2) not null default 0 check (custo_padrao >= 0),  -- só serviços; placa usa o lote
  ativo        boolean not null default true,
  created_by   uuid references auth.users (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- Um único modelo de placa (acrílico): simplifica reserva e custo.
create unique index produtos_uma_placa_uq on public.produtos (categoria) where categoria = 'placa';

-- =====================================================================
-- ESTOQUE: lotes, placas, movimentações, toques
-- =====================================================================
create table public.lotes (
  id              uuid primary key default gen_random_uuid(),
  numero          bigint generated always as identity unique,
  codigo          text generated always as ('LT-' || lpad(numero::text, 3, '0')) stored,
  fornecedor      text not null check (length(trim(fornecedor)) between 1 and 120),
  data_compra     date not null default private.hoje(),
  quantidade      integer not null check (quantidade between 1 and 5000),
  valor_pago      numeric(12,2) not null check (valor_pago >= 0),
  frete           numeric(12,2) not null default 0 check (frete >= 0),
  outras_taxas    numeric(12,2) not null default 0 check (outras_taxas >= 0),
  forma_pagamento text check (forma_pagamento in ('pix','dinheiro','cartao_credito','cartao_debito','boleto','transferencia')),
  custo_total     numeric(12,2) generated always as (valor_pago + frete + outras_taxas) stored,
  custo_unitario  numeric(12,4) generated always as (round((valor_pago + frete + outras_taxas) / quantidade, 4)) stored,
  observacoes     text check (length(observacoes) <= 1000),
  created_by      uuid references auth.users (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.placas (
  id             uuid primary key default gen_random_uuid(),
  numero         bigint generated always as identity unique,
  codigo         text generated always as ('AP-' || lpad(numero::text, 4, '0')) stored,
  token          text not null unique default private.gerar_token(),  -- vai no link gravado no chip
  lote_id        uuid not null references public.lotes (id) on delete restrict,
  status         text not null default 'disponivel'
                 check (status in ('disponivel','reservada','vendida','instalada','demonstracao','defeito','perdida')),
  venda_id       uuid,  -- FK adicionada depois de criar vendas
  cliente_id     uuid references public.clientes (id) on delete restrict,
  responsavel_id uuid references public.membros (user_id) on delete set null,  -- com quem está a demonstração
  destino_url    text check (destino_url ~* '^https://' and length(destino_url) <= 500),
  ativo          boolean not null default true,
  gravada_em     timestamptz,
  instalada_em   timestamptz,
  created_by     uuid references auth.users (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint placa_venda_coerente check (status not in ('reservada','vendida','instalada') or venda_id is not null),
  constraint placa_livre_coerente check (status <> 'disponivel' or (venda_id is null and cliente_id is null)),
  constraint placa_demo_coerente  check (status <> 'demonstracao' or responsavel_id is not null)
);
create index placas_status_idx on public.placas (status, numero);
create index placas_venda_idx  on public.placas (venda_id) where venda_id is not null;
create index placas_lote_idx   on public.placas (lote_id);

create table public.movimentacoes_estoque (
  id          bigint generated always as identity primary key,
  placa_id    uuid not null references public.placas (id) on delete restrict,
  status_de   text,
  status_para text not null,
  venda_id    uuid,
  motivo      text,
  created_by  uuid default auth.uid(),
  ocorreu_em  timestamptz not null default now()
);
create index mov_placa_idx on public.movimentacoes_estoque (placa_id, ocorreu_em desc);

-- Toque na placa: guarda só placa + horário. Nada sobre quem tocou.
create table public.toques_placa (
  id         bigint generated always as identity primary key,
  placa_id   uuid not null references public.placas (id) on delete restrict,
  ocorreu_em timestamptz not null default now()
);
create index toques_placa_idx on public.toques_placa (placa_id, ocorreu_em desc);

-- =====================================================================
-- VENDAS
-- =====================================================================
create table public.vendas (
  id                  uuid primary key default gen_random_uuid(),
  numero              bigint generated always as identity unique,
  codigo              text generated always as ('V-' || lpad(numero::text, 4, '0')) stored,
  cliente_id          uuid not null references public.clientes (id) on delete restrict,
  status              text not null default 'rascunho' check (status in ('rascunho','confirmada','cancelada')),
  data_venda          date not null default private.hoje(),
  vendedor_id         uuid references public.membros (user_id) on delete set null default auth.uid(),
  desconto            numeric(12,2) not null default 0 check (desconto >= 0),
  forma_pagamento     text not null default 'pix'
                      check (forma_pagamento in ('pix','dinheiro','cartao_credito','cartao_debito','boleto','transferencia')),
  parcelas            integer not null default 1 check (parcelas between 1 and 24),
  entrada             numeric(12,2) not null default 0 check (entrada >= 0),
  primeiro_vencimento date,          -- vazio = data da venda
  taxa_cartao_pct     numeric(5,2) not null default 0 check (taxa_cartao_pct between 0 and 20),
  observacoes         text check (length(observacoes) <= 2000),
  -- Fotografia gravada na confirmação (não muda depois)
  total               numeric(12,2),
  custo_placas        numeric(12,2),
  custo_servicos      numeric(12,2),
  taxa_valor          numeric(12,2),
  lucro               numeric(12,2),
  e_upsell            boolean,
  confirmada_em       timestamptz,
  cancelada_em        timestamptz,
  motivo_cancelamento text check (length(motivo_cancelamento) <= 300),
  created_by          uuid references auth.users (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index vendas_cliente_idx  on public.vendas (cliente_id);
create index vendas_data_idx     on public.vendas (data_venda desc);
create index vendas_status_idx   on public.vendas (status);

alter table public.placas
  add constraint placas_venda_fk foreign key (venda_id) references public.vendas (id) on delete restrict;

create table public.venda_itens (
  id             uuid primary key default gen_random_uuid(),
  venda_id       uuid not null references public.vendas (id) on delete cascade,
  produto_id     uuid not null references public.produtos (id) on delete restrict,
  quantidade     integer not null check (quantidade between 1 and 100),
  preco_unitario numeric(12,2) check (preco_unitario >= 0),
  created_by     uuid references auth.users (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index venda_itens_venda_idx on public.venda_itens (venda_id);

-- =====================================================================
-- PROJETOS (entregas + pós-venda + upsell)
-- =====================================================================
create table public.projetos (
  id                      uuid primary key default gen_random_uuid(),
  venda_id                uuid not null unique references public.vendas (id) on delete restrict,
  cliente_id              uuid not null references public.clientes (id) on delete restrict,
  status                  text not null default 'a_entregar'
                          check (status in ('a_entregar','em_andamento','aguardando_cliente','entregue','cancelado')),
  responsavel_id          uuid references public.membros (user_id) on delete set null,
  prazo                   date,
  entregue_em             timestamptz,
  observacoes             text check (length(observacoes) <= 4000),
  baseline_nota           numeric(2,1),
  baseline_avaliacoes     integer,
  baseline_avaliacoes_mes numeric(6,1),
  upsell_site             text not null default 'nao_oferecido'
                          check (upsell_site in ('nao_oferecido','oferecido','proposta_enviada','em_negociacao','vendido','recusou')),
  upsell_google           text not null default 'nao_oferecido'
                          check (upsell_google in ('nao_oferecido','oferecido','proposta_enviada','em_negociacao','vendido','recusou')),
  upsell_oferecer_em      date,
  upsell_motivo_recusa    text check (length(upsell_motivo_recusa) <= 300),
  created_by              uuid references auth.users (id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index projetos_cliente_idx on public.projetos (cliente_id);
create index projetos_status_idx  on public.projetos (status);

create table public.projeto_tarefas (
  id         uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  grupo      text not null check (grupo in ('placa','otimizacao_google','site','outro')),
  titulo     text not null check (length(trim(titulo)) between 1 and 200),
  ordem      integer not null default 0,
  feito_em   timestamptz,
  feito_por  uuid references auth.users (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projeto_tarefas_idx on public.projeto_tarefas (projeto_id, grupo, ordem);

create table public.projeto_pendencias (
  id           uuid primary key default gen_random_uuid(),
  projeto_id   uuid not null references public.projetos (id) on delete cascade,
  descricao    text not null check (length(trim(descricao)) between 1 and 300),
  pedido_em    date not null default private.hoje(),
  resolvido_em date,
  created_by   uuid references auth.users (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index projeto_pendencias_idx on public.projeto_pendencias (projeto_id);

create table public.projeto_revisoes (
  id            uuid primary key default gen_random_uuid(),
  projeto_id    uuid not null references public.projetos (id) on delete cascade,
  marco         text not null check (marco in ('30d','60d','90d','extra')),
  data_prevista date not null,
  realizado_em  date,
  nota          numeric(2,1) check (nota between 0 and 5),
  avaliacoes    integer check (avaliacoes >= 0),
  observacoes   text check (length(observacoes) <= 1000),
  created_by    uuid references auth.users (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint revisao_completa check (realizado_em is null or avaliacoes is not null)
);
create index projeto_revisoes_idx on public.projeto_revisoes (projeto_id, data_prevista);

-- =====================================================================
-- FINANCEIRO
-- =====================================================================
create table public.lancamentos (
  id                  uuid primary key default gen_random_uuid(),
  tipo                text not null check (tipo in ('receita','despesa','retirada')),
  categoria           text not null check (categoria in (
                        'venda','outra_receita',
                        'compra_placas','frete_placas','taxas_lote','taxas_cartao','estorno',
                        'ferramentas','dominio_hospedagem','deslocamento','marketing','outra_despesa',
                        'retirada')),
  descricao           text not null check (length(trim(descricao)) between 1 and 300),
  valor               numeric(12,2) not null check (valor > 0),
  vencimento          date not null,
  pago_em             date,
  forma_pagamento     text check (forma_pagamento in ('pix','dinheiro','cartao_credito','cartao_debito','boleto','transferencia','debito_automatico')),
  venda_id            uuid references public.vendas (id) on delete restrict,
  lote_id             uuid references public.lotes (id) on delete restrict,
  cliente_id          uuid references public.clientes (id) on delete set null,
  socio_id            uuid references public.membros (user_id) on delete restrict,
  parcela             integer check (parcela >= 0),
  parcelas            integer check (parcelas >= 1),
  cancelado_em        timestamptz,
  motivo_cancelamento text check (length(motivo_cancelamento) <= 300),
  created_by          uuid references auth.users (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint lanc_tipo_categoria check (
    (tipo = 'receita'  and categoria in ('venda','outra_receita')) or
    (tipo = 'retirada' and categoria = 'retirada') or
    (tipo = 'despesa'  and categoria not in ('venda','outra_receita','retirada'))),
  constraint lanc_retirada_socio check (tipo <> 'retirada' or socio_id is not null),
  constraint lanc_cancelamento_motivo check (cancelado_em is null or motivo_cancelamento is not null)
);
create index lanc_vencimento_idx on public.lancamentos (vencimento) where cancelado_em is null;
create index lanc_pago_idx       on public.lancamentos (pago_em) where pago_em is not null;
create index lanc_venda_idx      on public.lancamentos (venda_id) where venda_id is not null;
create index lanc_lote_idx       on public.lancamentos (lote_id) where lote_id is not null;
create index lanc_socio_idx      on public.lancamentos (socio_id) where socio_id is not null;

-- =====================================================================
-- REGRAS DE NEGÓCIO (triggers)
-- current_user = 'authenticated' identifica chamada direta do app;
-- RPCs security definer rodam como dono e passam pelas regras do sistema.
-- =====================================================================

-- Prospecção: "Cliente" é automático; descarte registra data.
create or replace function private.tg_clientes_regras()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if new.etapa = 'cliente' and (tg_op = 'INSERT' or old.etapa <> 'cliente') then
      raise exception 'A etapa Cliente é automática: ela muda quando uma venda é confirmada'
        using errcode = 'P0001';
    end if;
    if tg_op = 'UPDATE' and old.etapa = 'cliente' and new.etapa <> 'cliente'
       and exists (select 1 from public.vendas v where v.cliente_id = old.id and v.status = 'confirmada') then
      raise exception 'Este lead tem venda confirmada; para tirá-lo de Cliente, cancele a venda'
        using errcode = 'P0001';
    end if;
  end if;

  if new.etapa = 'descartado' then
    if tg_op = 'INSERT' or old.etapa <> 'descartado' then
      new.descartado_em := now();
    end if;
  else
    new.descartado_em := null;
    new.motivo_descarte := null;
  end if;
  return new;
end;
$$;

-- Registrar contato atualiza o próximo follow-up e tira de "A prospectar".
create or replace function private.tg_interacoes_apos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.clientes c
     set proximo_followup = new.proximo_followup,
         etapa = case when c.etapa = 'a_prospectar' then 'prospectado' else c.etapa end
   where c.id = new.cliente_id;
  return null;
end;
$$;

-- Toda mudança de status de placa vira movimentação (motivo vem de app.motivo).
create or replace function private.tg_placas_mov()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.movimentacoes_estoque (placa_id, status_de, status_para, venda_id, motivo, created_by)
    values (new.id,
            case when tg_op = 'UPDATE' then old.status end,
            new.status,
            coalesce(new.venda_id, case when tg_op = 'UPDATE' then old.venda_id end),
            nullif(current_setting('app.motivo', true), ''),
            auth.uid());
  end if;
  return null;
end;
$$;

-- Reserva/libera placas para casar com a quantidade dos itens de um rascunho.
create or replace function private.sincronizar_reservas(p_venda uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venda   public.vendas;
  v_queria  integer;
  v_tem     integer;
  v_feitas  integer;
begin
  select * into v_venda from public.vendas where id = p_venda;
  if not found or v_venda.status <> 'rascunho' then
    return;
  end if;

  select coalesce(sum(i.quantidade), 0) into v_queria
  from public.venda_itens i
  join public.produtos p on p.id = i.produto_id
  where i.venda_id = p_venda and p.categoria = 'placa';

  select count(*) into v_tem
  from public.placas where venda_id = p_venda and status = 'reservada';

  perform set_config('app.motivo', 'Reserva ' || v_venda.codigo, true);

  if v_queria > v_tem then
    with livres as (
      select id from public.placas
      where status = 'disponivel'
      order by numero
      limit v_queria - v_tem
      for update skip locked
    )
    update public.placas p
       set status = 'reservada', venda_id = p_venda, cliente_id = v_venda.cliente_id
      from livres where p.id = livres.id;
    get diagnostics v_feitas = row_count;
    if v_feitas < v_queria - v_tem then
      raise exception 'Estoque insuficiente: faltam % placa(s) disponível(is)', (v_queria - v_tem) - v_feitas
        using errcode = 'P0001';
    end if;
  elsif v_queria < v_tem then
    perform set_config('app.motivo', 'Reserva liberada ' || v_venda.codigo, true);
    update public.placas
       set status = 'disponivel', venda_id = null, cliente_id = null
     where id in (select id from public.placas
                  where venda_id = p_venda and status = 'reservada'
                  order by numero desc
                  limit v_tem - v_queria);
  end if;
end;
$$;

-- Itens só mudam em rascunho; preço vem do catálogo se não informado.
create or replace function private.tg_venda_itens_antes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_prod   public.produtos;
begin
  select status into v_status from public.vendas where id = coalesce(new.venda_id, old.venda_id);
  -- v_status nulo = venda sendo apagada (cascata): deixa passar
  if v_status is not null and v_status <> 'rascunho' then
    raise exception 'Itens só podem ser alterados enquanto a venda é rascunho' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if tg_op = 'UPDATE' and (new.venda_id <> old.venda_id or new.produto_id <> old.produto_id) then
    raise exception 'Para trocar o produto, remova o item e adicione outro' using errcode = 'P0001';
  end if;
  select * into v_prod from public.produtos where id = new.produto_id;
  if tg_op = 'INSERT' and not v_prod.ativo then
    raise exception 'Produto inativo' using errcode = 'P0001';
  end if;
  new.preco_unitario := coalesce(new.preco_unitario, v_prod.preco_padrao);
  return new;
end;
$$;

create or replace function private.tg_venda_itens_apos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sincronizar_reservas(coalesce(new.venda_id, old.venda_id));
  return null;
end;
$$;

-- Venda: depois de confirmada/cancelada, pelo app só observações mudam.
create or replace function private.tg_vendas_regras()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and old.status <> 'rascunho' then
    if (new.cliente_id, new.data_venda, new.vendedor_id, new.desconto, new.forma_pagamento,
        new.parcelas, new.entrada, new.primeiro_vencimento, new.taxa_cartao_pct)
       is distinct from
       (old.cliente_id, old.data_venda, old.vendedor_id, old.desconto, old.forma_pagamento,
        old.parcelas, old.entrada, old.primeiro_vencimento, old.taxa_cartao_pct) then
      raise exception 'Venda % já está %: só as observações podem mudar', old.codigo, old.status
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

-- Trocar o cliente de um rascunho leva junto as placas reservadas.
create or replace function private.tg_vendas_cliente_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cliente_id is distinct from old.cliente_id and new.status = 'rascunho' then
    update public.placas set cliente_id = new.cliente_id
     where venda_id = new.id and status = 'reservada';
  end if;
  return null;
end;
$$;

-- Apagar só rascunho; antes, devolve as placas reservadas.
create or replace function private.tg_vendas_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status <> 'rascunho' then
    raise exception 'Venda % não pode ser apagada; use Cancelar venda', old.codigo using errcode = 'P0001';
  end if;
  perform set_config('app.motivo', 'Rascunho apagado ' || old.codigo, true);
  update public.placas set status = 'disponivel', venda_id = null, cliente_id = null
   where venda_id = old.id and status = 'reservada';
  return old;
end;
$$;

-- Projetos: "cancelado" e "vendido" (upsell) são do sistema.
create or replace function private.tg_projetos_regras()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if old.status = 'cancelado' then
      raise exception 'Projeto cancelado não pode ser alterado' using errcode = 'P0001';
    end if;
    if new.status = 'cancelado' then
      raise exception 'Projeto é cancelado junto com a venda' using errcode = 'P0001';
    end if;
    if (new.upsell_site = 'vendido' and old.upsell_site <> 'vendido')
       or (new.upsell_google = 'vendido' and old.upsell_google <> 'vendido') then
      raise exception 'Upsell vira "vendido" sozinho quando a venda do serviço é confirmada'
        using errcode = 'P0001';
    end if;
    if (old.upsell_site = 'vendido' and new.upsell_site <> 'vendido')
       or (old.upsell_google = 'vendido' and new.upsell_google <> 'vendido') then
      raise exception 'Upsell vendido não pode voltar atrás' using errcode = 'P0001';
    end if;
  end if;
  if new.status = 'entregue' and old.status <> 'entregue' then
    new.entregue_em := now();
  elsif new.status <> 'entregue' then
    new.entregue_em := null;
  end if;
  return new;
end;
$$;

create or replace function private.tg_tarefas_feito()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.feito_em is not null and (tg_op = 'INSERT' or old.feito_em is null) then
    new.feito_por := auth.uid();
  elsif new.feito_em is null then
    new.feito_por := null;
  end if;
  return new;
end;
$$;

-- Lançamentos: cancelado é final; gerado por venda/lote só aceita pagamento.
create or replace function private.tg_lancamentos_regras()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if old.cancelado_em is not null then
      raise exception 'Lançamento cancelado não pode ser alterado' using errcode = 'P0001';
    end if;
    if (old.venda_id is not null or old.lote_id is not null) and
       (new.tipo, new.categoria, new.descricao, new.valor, new.vencimento, new.cliente_id, new.socio_id, new.cancelado_em)
       is distinct from
       (old.tipo, old.categoria, old.descricao, old.valor, old.vencimento, old.cliente_id, old.socio_id, old.cancelado_em) then
      raise exception 'Lançamento gerado por venda ou lote: aqui só dá para registrar o pagamento'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Ligação dos triggers
-- ---------------------------------------------------------------------
create trigger clientes_autoria    before insert or update on public.clientes           for each row execute function private.tg_autoria();
create trigger interacoes_autoria  before insert or update on public.interacoes         for each row execute function private.tg_autoria();
create trigger produtos_autoria    before insert or update on public.produtos           for each row execute function private.tg_autoria();
create trigger lotes_autoria       before insert or update on public.lotes              for each row execute function private.tg_autoria();
create trigger placas_autoria      before insert or update on public.placas             for each row execute function private.tg_autoria();
create trigger vendas_autoria      before insert or update on public.vendas             for each row execute function private.tg_autoria();
create trigger itens_autoria       before insert or update on public.venda_itens        for each row execute function private.tg_autoria();
create trigger projetos_autoria    before insert or update on public.projetos           for each row execute function private.tg_autoria();
create trigger tarefas_autoria     before insert or update on public.projeto_tarefas    for each row execute function private.tg_autoria();
create trigger pendencias_autoria  before insert or update on public.projeto_pendencias for each row execute function private.tg_autoria();
create trigger revisoes_autoria    before insert or update on public.projeto_revisoes   for each row execute function private.tg_autoria();
create trigger lanc_autoria        before insert or update on public.lancamentos        for each row execute function private.tg_autoria();
create trigger config_updated      before update on public.configuracoes for each row execute function private.tg_updated_at();

create trigger clientes_regras   before insert or update on public.clientes    for each row execute function private.tg_clientes_regras();
create trigger interacoes_apos   after insert on public.interacoes             for each row execute function private.tg_interacoes_apos();
create trigger placas_mov        after insert or update of status on public.placas for each row execute function private.tg_placas_mov();
create trigger itens_antes       before insert or update or delete on public.venda_itens for each row execute function private.tg_venda_itens_antes();
create trigger itens_apos        after insert or update or delete on public.venda_itens  for each row execute function private.tg_venda_itens_apos();
create trigger vendas_regras     before update on public.vendas                for each row execute function private.tg_vendas_regras();
create trigger vendas_cliente_sync after update of cliente_id on public.vendas for each row execute function private.tg_vendas_cliente_sync();
create trigger vendas_delete     before delete on public.vendas                for each row execute function private.tg_vendas_delete();
create trigger projetos_regras   before update on public.projetos              for each row execute function private.tg_projetos_regras();
create trigger tarefas_feito     before insert or update on public.projeto_tarefas for each row execute function private.tg_tarefas_feito();
create trigger lanc_regras       before update on public.lancamentos           for each row execute function private.tg_lancamentos_regras();

create trigger aud_membros    after insert or update or delete on public.membros            for each row execute function private.tg_auditoria();
create trigger aud_config     after update                     on public.configuracoes      for each row execute function private.tg_auditoria();
create trigger aud_clientes   after insert or update or delete on public.clientes           for each row execute function private.tg_auditoria();
create trigger aud_interacoes after insert or update or delete on public.interacoes         for each row execute function private.tg_auditoria();
create trigger aud_produtos   after insert or update or delete on public.produtos           for each row execute function private.tg_auditoria();
create trigger aud_lotes      after insert or update or delete on public.lotes              for each row execute function private.tg_auditoria();
create trigger aud_placas     after insert or update or delete on public.placas             for each row execute function private.tg_auditoria();
create trigger aud_vendas     after insert or update or delete on public.vendas             for each row execute function private.tg_auditoria();
create trigger aud_itens      after insert or update or delete on public.venda_itens        for each row execute function private.tg_auditoria();
create trigger aud_projetos   after insert or update or delete on public.projetos           for each row execute function private.tg_auditoria();
create trigger aud_tarefas    after insert or update or delete on public.projeto_tarefas    for each row execute function private.tg_auditoria();
create trigger aud_pendencias after insert or update or delete on public.projeto_pendencias for each row execute function private.tg_auditoria();
create trigger aud_revisoes   after insert or update or delete on public.projeto_revisoes   for each row execute function private.tg_auditoria();
create trigger aud_lanc       after insert or update or delete on public.lancamentos        for each row execute function private.tg_auditoria();

-- =====================================================================
-- RPCs (chamadas pelo app com supabase.rpc)
-- =====================================================================

create or replace function private.exigir_membro()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_membro() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Confirmar venda: placas saem, financeiro gera parcelas, nasce o projeto,
-- lead vira Cliente. Tudo ou nada.
-- ---------------------------------------------------------------------
create or replace function public.confirmar_venda(p_venda_id uuid)
returns public.vendas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v          public.vendas;
  c          public.clientes;
  v_bruto    numeric(12,2);
  v_total    numeric(12,2);
  v_qtd_pl   integer;
  v_res      integer;
  v_c_placas numeric(12,2);
  v_c_serv   numeric(12,2);
  v_taxa     numeric(12,2);
  v_upsell   boolean;
  v_tem_site boolean;
  v_tem_goog boolean;
  v_tem_pl   boolean;
  v_restante numeric(12,2);
  v_parcela  numeric(12,2);
  v_venc1    date;
  v_proj     uuid;
  i          integer;
begin
  perform private.exigir_membro();

  select * into v from public.vendas where id = p_venda_id for update;
  if not found then
    raise exception 'Venda não encontrada' using errcode = 'P0002';
  end if;
  if v.status <> 'rascunho' then
    raise exception 'Venda % já está %', v.codigo, v.status using errcode = 'P0001';
  end if;
  select * into c from public.clientes where id = v.cliente_id for update;

  select coalesce(sum(i2.quantidade * i2.preco_unitario), 0),
         coalesce(sum(i2.quantidade) filter (where p.categoria = 'placa'), 0),
         coalesce(sum(i2.quantidade * p.custo_padrao) filter (where p.categoria <> 'placa'), 0),
         coalesce(bool_or(p.categoria = 'site'), false),
         coalesce(bool_or(p.categoria = 'otimizacao_google'), false),
         coalesce(bool_or(p.categoria = 'placa'), false)
    into v_bruto, v_qtd_pl, v_c_serv, v_tem_site, v_tem_goog, v_tem_pl
  from public.venda_itens i2
  join public.produtos p on p.id = i2.produto_id
  where i2.venda_id = v.id;

  if not exists (select 1 from public.venda_itens where venda_id = v.id) then
    raise exception 'Venda sem itens' using errcode = 'P0001';
  end if;
  v_total := v_bruto - v.desconto;
  if v_total < 0 then
    raise exception 'Desconto maior que o total' using errcode = 'P0001';
  end if;
  if v.entrada > v_total then
    raise exception 'Entrada maior que o total' using errcode = 'P0001';
  end if;

  -- Placas: as reservadas precisam bater com a quantidade vendida
  perform private.sincronizar_reservas(v.id);
  select count(*), coalesce(round(sum(l.custo_unitario), 2), 0)
    into v_res, v_c_placas
  from public.placas pl
  join public.lotes l on l.id = pl.lote_id
  where pl.venda_id = v.id and pl.status = 'reservada';
  if v_res <> v_qtd_pl then
    raise exception 'Placas reservadas (%) não batem com a venda (%)', v_res, v_qtd_pl using errcode = 'P0001';
  end if;

  v_taxa   := round(v_total * v.taxa_cartao_pct / 100, 2);
  v_upsell := exists (select 1 from public.vendas o
                      where o.cliente_id = v.cliente_id and o.status = 'confirmada' and o.id <> v.id);

  perform set_config('app.motivo', 'Venda ' || v.codigo || ' confirmada', true);
  update public.placas set status = 'vendida'
   where venda_id = v.id and status = 'reservada';

  -- Financeiro: entrada + parcelas (centavos de arredondamento na última)
  v_venc1 := coalesce(v.primeiro_vencimento, v.data_venda);
  if v.entrada > 0 then
    insert into public.lancamentos (tipo, categoria, descricao, valor, vencimento, forma_pagamento,
                                    venda_id, cliente_id, parcela, parcelas)
    values ('receita', 'venda', 'Entrada · ' || v.codigo, v.entrada, v.data_venda, v.forma_pagamento,
            v.id, v.cliente_id, 0, v.parcelas);
  end if;
  v_restante := v_total - v.entrada;
  if v_restante > 0 then
    v_parcela := round(v_restante / v.parcelas, 2);
    for i in 1 .. v.parcelas loop
      insert into public.lancamentos (tipo, categoria, descricao, valor, vencimento, forma_pagamento,
                                      venda_id, cliente_id, parcela, parcelas)
      values ('receita', 'venda',
              case when v.parcelas = 1 and v.entrada = 0 then 'Venda ' || v.codigo
                   else 'Parcela ' || i || ' de ' || v.parcelas || ' · ' || v.codigo end,
              case when i = v.parcelas then v_restante - v_parcela * (v.parcelas - 1) else v_parcela end,
              (v_venc1 + make_interval(months => i - 1))::date,
              v.forma_pagamento, v.id, v.cliente_id, i, v.parcelas);
    end loop;
  end if;
  if v_taxa > 0 then
    insert into public.lancamentos (tipo, categoria, descricao, valor, vencimento, pago_em, forma_pagamento,
                                    venda_id, cliente_id)
    values ('despesa', 'taxas_cartao', 'Taxa do cartão · ' || v.codigo, v_taxa, v.data_venda, v.data_venda,
            'debito_automatico', v.id, v.cliente_id);
  end if;

  -- Projeto com checklist e revisões de 30/60/90 dias
  insert into public.projetos (venda_id, cliente_id, responsavel_id, baseline_nota, baseline_avaliacoes,
                               baseline_avaliacoes_mes, upsell_site, upsell_google)
  values (v.id, v.cliente_id, v.vendedor_id, c.nota_google, c.avaliacoes_google, c.avaliacoes_mes_antes,
          case when v_tem_site then 'vendido' else 'nao_oferecido' end,
          case when v_tem_goog then 'vendido' else 'nao_oferecido' end)
  returning id into v_proj;

  if v_tem_pl then
    insert into public.projeto_tarefas (projeto_id, grupo, titulo, ordem)
    select v_proj, 'placa', t, o from unnest(array[
      'Gravar o link na placa', 'Testar em Android e iPhone', 'Entregar ou instalar',
      'Orientar a equipe a pedir avaliação']) with ordinality as x(t, o);
  end if;
  if v_tem_goog then
    insert into public.projeto_tarefas (projeto_id, grupo, titulo, ordem)
    select v_proj, 'otimizacao_google', t, o from unnest(array[
      'Acesso ao perfil', 'Categorias', 'Horários', 'Descrição', 'Fotos', 'Produtos e serviços',
      'Primeira postagem', 'Responder avaliações antigas']) with ordinality as x(t, o);
  end if;
  if v_tem_site then
    insert into public.projeto_tarefas (projeto_id, grupo, titulo, ordem)
    select v_proj, 'site', t, o from unnest(array[
      'Briefing', 'Conteúdo recebido', 'Layout aprovado', 'Domínio', 'Publicado',
      'Ligado ao perfil do Google']) with ordinality as x(t, o);
  end if;
  insert into public.projeto_revisoes (projeto_id, marco, data_prevista)
  values (v_proj, '30d', v.data_venda + 30),
         (v_proj, '60d', v.data_venda + 60),
         (v_proj, '90d', v.data_venda + 90);

  -- Upsell: serviço comprado agora fecha a oportunidade nos projetos anteriores
  if v_tem_site then
    update public.projetos set upsell_site = 'vendido'
     where cliente_id = v.cliente_id and id <> v_proj and status <> 'cancelado' and upsell_site <> 'vendido';
  end if;
  if v_tem_goog then
    update public.projetos set upsell_google = 'vendido'
     where cliente_id = v.cliente_id and id <> v_proj and status <> 'cancelado' and upsell_google <> 'vendido';
  end if;

  update public.clientes set etapa = 'cliente', proximo_followup = null where id = v.cliente_id;

  update public.vendas
     set status = 'confirmada', confirmada_em = now(),
         total = v_total, custo_placas = v_c_placas, custo_servicos = v_c_serv,
         taxa_valor = v_taxa, lucro = v_total - v_c_placas - v_c_serv - v_taxa,
         e_upsell = v_upsell
   where id = v.id
  returning * into v;
  return v;
end;
$$;

-- ---------------------------------------------------------------------
-- Cancelar venda (rascunho ou confirmada)
-- ---------------------------------------------------------------------
create or replace function public.cancelar_venda(p_venda_id uuid, p_motivo text)
returns public.vendas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.vendas;
  l public.lancamentos;
begin
  perform private.exigir_membro();
  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'Informe o motivo do cancelamento' using errcode = 'P0001';
  end if;
  p_motivo := left(trim(p_motivo), 300);

  select * into v from public.vendas where id = p_venda_id for update;
  if not found then
    raise exception 'Venda não encontrada' using errcode = 'P0002';
  end if;
  if v.status = 'cancelada' then
    raise exception 'Venda já cancelada' using errcode = 'P0001';
  end if;

  perform set_config('app.motivo', 'Cancelamento ' || v.codigo || ': ' || p_motivo, true);

  -- Placas: reservadas e não entregues voltam; instaladas viram "perdida"
  update public.placas set status = 'disponivel', venda_id = null, cliente_id = null
   where venda_id = v.id and status in ('reservada', 'vendida');
  update public.placas set status = 'perdida'
   where venda_id = v.id and status = 'instalada';

  if v.status = 'confirmada' then
    for l in select * from public.lancamentos
             where venda_id = v.id and cancelado_em is null and categoria in ('venda', 'taxas_cartao')
    loop
      if l.tipo = 'receita' and l.pago_em is not null then
        insert into public.lancamentos (tipo, categoria, descricao, valor, vencimento, pago_em,
                                        forma_pagamento, venda_id, cliente_id)
        values ('despesa', 'estorno', left('Estorno ' || v.codigo || ': ' || p_motivo, 300),
                l.valor, private.hoje(), private.hoje(), l.forma_pagamento, v.id, v.cliente_id);
      else
        update public.lancamentos
           set cancelado_em = now(), motivo_cancelamento = 'Venda cancelada: ' || left(p_motivo, 270)
         where id = l.id;
      end if;
    end loop;

    update public.projetos set status = 'cancelado' where venda_id = v.id;

    -- Upsell: se a venda cancelada era a que tinha o serviço, a oportunidade volta a "em negociação"
    update public.projetos p
       set upsell_site = 'em_negociacao'
     where p.cliente_id = v.cliente_id and p.status <> 'cancelado' and p.upsell_site = 'vendido'
       and not exists (select 1 from public.vendas o
                       join public.venda_itens i on i.venda_id = o.id
                       join public.produtos pr on pr.id = i.produto_id
                       where o.cliente_id = v.cliente_id and o.status = 'confirmada' and o.id <> v.id
                         and pr.categoria = 'site');
    update public.projetos p
       set upsell_google = 'em_negociacao'
     where p.cliente_id = v.cliente_id and p.status <> 'cancelado' and p.upsell_google = 'vendido'
       and not exists (select 1 from public.vendas o
                       join public.venda_itens i on i.venda_id = o.id
                       join public.produtos pr on pr.id = i.produto_id
                       where o.cliente_id = v.cliente_id and o.status = 'confirmada' and o.id <> v.id
                         and pr.categoria = 'otimizacao_google');

    if not exists (select 1 from public.vendas o
                   where o.cliente_id = v.cliente_id and o.status = 'confirmada' and o.id <> v.id) then
      update public.clientes set etapa = 'negociacao' where id = v.cliente_id and etapa = 'cliente';
    end if;
  end if;

  update public.vendas
     set status = 'cancelada', cancelada_em = now(), motivo_cancelamento = p_motivo
   where id = v.id
  returning * into v;
  return v;
end;
$$;

-- ---------------------------------------------------------------------
-- Trocar uma placa reservada por outra disponível (escolher o código)
-- ---------------------------------------------------------------------
create or replace function public.trocar_placa_reservada(p_venda_id uuid, p_placa_atual uuid, p_placa_nova uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.vendas;
begin
  perform private.exigir_membro();
  select * into v from public.vendas where id = p_venda_id for update;
  if not found or v.status <> 'rascunho' then
    raise exception 'Só é possível trocar placas de uma venda em rascunho' using errcode = 'P0001';
  end if;
  perform 1 from public.placas where id = p_placa_atual and venda_id = v.id and status = 'reservada' for update;
  if not found then
    raise exception 'A placa atual não está reservada nesta venda' using errcode = 'P0001';
  end if;
  perform 1 from public.placas where id = p_placa_nova and status = 'disponivel' for update;
  if not found then
    raise exception 'A placa escolhida não está disponível' using errcode = 'P0001';
  end if;
  perform set_config('app.motivo', 'Troca de placa em ' || v.codigo, true);
  update public.placas set status = 'disponivel', venda_id = null, cliente_id = null where id = p_placa_atual;
  update public.placas set status = 'reservada', venda_id = v.id, cliente_id = v.cliente_id where id = p_placa_nova;
end;
$$;

-- ---------------------------------------------------------------------
-- Registrar lote: cria as placas e lança as despesas
-- ---------------------------------------------------------------------
create or replace function public.registrar_lote(
  p_fornecedor   text,
  p_quantidade   integer,
  p_valor_pago   numeric,
  p_frete        numeric default 0,
  p_outras_taxas numeric default 0,
  p_data_compra  date default null,
  p_forma        text default 'pix',
  p_pago         boolean default true,
  p_observacoes  text default null)
returns public.lotes
language plpgsql
security definer
set search_path = ''
as $$
declare
  lt     public.lotes;
  v_data date := coalesce(p_data_compra, private.hoje());
begin
  perform private.exigir_membro();

  insert into public.lotes (fornecedor, data_compra, quantidade, valor_pago, frete, outras_taxas,
                            forma_pagamento, observacoes)
  values (p_fornecedor, v_data, p_quantidade, p_valor_pago, coalesce(p_frete, 0), coalesce(p_outras_taxas, 0),
          p_forma, p_observacoes)
  returning * into lt;

  perform set_config('app.motivo', 'Entrada do lote ' || lt.codigo, true);
  insert into public.placas (lote_id)
  select lt.id from generate_series(1, p_quantidade);

  if lt.valor_pago > 0 then
    insert into public.lancamentos (tipo, categoria, descricao, valor, vencimento, pago_em, forma_pagamento, lote_id)
    values ('despesa', 'compra_placas', 'Compra do lote ' || lt.codigo || ' · ' || lt.quantidade || ' placas',
            lt.valor_pago, v_data, case when p_pago then v_data end, p_forma, lt.id);
  end if;
  if lt.frete > 0 then
    insert into public.lancamentos (tipo, categoria, descricao, valor, vencimento, pago_em, forma_pagamento, lote_id)
    values ('despesa', 'frete_placas', 'Frete do lote ' || lt.codigo, lt.frete, v_data,
            case when p_pago then v_data end, p_forma, lt.id);
  end if;
  if lt.outras_taxas > 0 then
    insert into public.lancamentos (tipo, categoria, descricao, valor, vencimento, pago_em, forma_pagamento, lote_id)
    values ('despesa', 'taxas_lote', 'Taxas do lote ' || lt.codigo, lt.outras_taxas, v_data,
            case when p_pago then v_data end, p_forma, lt.id);
  end if;
  return lt;
end;
$$;

-- ---------------------------------------------------------------------
-- Ajustar placa (demonstração, defeito, perda, instalação) com motivo
-- ---------------------------------------------------------------------
create or replace function public.ajustar_placa(
  p_placa_id      uuid,
  p_novo_status   text,
  p_motivo        text default null,
  p_responsavel   uuid default null)
returns public.placas
language plpgsql
security definer
set search_path = ''
as $$
declare
  pl public.placas;
  ok boolean;
begin
  perform private.exigir_membro();
  select * into pl from public.placas where id = p_placa_id for update;
  if not found then
    raise exception 'Placa não encontrada' using errcode = 'P0002';
  end if;

  ok := (pl.status, p_novo_status) in (
    ('disponivel','demonstracao'), ('disponivel','defeito'), ('disponivel','perdida'),
    ('demonstracao','disponivel'), ('demonstracao','defeito'), ('demonstracao','perdida'),
    ('vendida','instalada'),
    ('instalada','defeito'), ('instalada','perdida'),
    ('defeito','disponivel'), ('defeito','perdida'));
  if not ok then
    raise exception 'Não é possível mudar a placa % de "%" para "%"', pl.codigo, pl.status, p_novo_status
      using errcode = 'P0001';
  end if;
  if p_novo_status <> 'instalada' and (p_motivo is null or length(trim(p_motivo)) = 0) then
    raise exception 'Informe o motivo do ajuste' using errcode = 'P0001';
  end if;
  if p_novo_status = 'demonstracao' and p_responsavel is null then
    p_responsavel := auth.uid();
  end if;

  perform set_config('app.motivo', coalesce(left(trim(p_motivo), 300), 'Instalada no cliente'), true);
  update public.placas
     set status         = p_novo_status,
         responsavel_id = case when p_novo_status = 'demonstracao' then p_responsavel else null end,
         instalada_em   = case when p_novo_status = 'instalada' then now() else instalada_em end,
         venda_id       = case when p_novo_status = 'disponivel' then null else venda_id end,
         cliente_id     = case when p_novo_status = 'disponivel' then null else cliente_id end
   where id = pl.id
  returning * into pl;
  return pl;
end;
$$;

-- ---------------------------------------------------------------------
-- Importar leads de CSV (o app converte o CSV em JSON).
-- Roda com as permissões de quem chama (RLS vale). Pula duplicados por
-- link do Google ou telefone; devolve o resumo linha a linha.
-- ---------------------------------------------------------------------
create or replace function public.importar_leads(p_linhas jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r          jsonb;
  n          integer := 0;
  v_inseridos integer := 0;
  v_dup      jsonb := '[]'::jsonb;
  v_erros    jsonb := '[]'::jsonb;
  v_tel      text;
  v_url      text;
begin
  if not private.is_membro() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  if jsonb_typeof(p_linhas) <> 'array' then
    raise exception 'Formato inválido: envie uma lista de linhas' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_linhas) > 2000 then
    raise exception 'Máximo de 2000 linhas por importação' using errcode = 'P0001';
  end if;

  for r in select * from jsonb_array_elements(p_linhas) loop
    n := n + 1;
    v_tel := nullif(regexp_replace(coalesce(r->>'telefone', ''), '\D', '', 'g'), '');
    v_url := nullif(trim(r->>'google_url'), '');
    if (v_url is not null and exists (select 1 from public.clientes where lower(google_url) = lower(v_url)))
       or (v_tel is not null and exists (select 1 from public.clientes
                                         where regexp_replace(telefone, '\D', '', 'g') = v_tel)) then
      v_dup := v_dup || jsonb_build_object('linha', n, 'nome', r->>'nome');
      continue;
    end if;
    begin
      insert into public.clientes (nome, cidade, segmento, endereco, contato_nome, telefone, email, google_url,
                                   nota_google, avaliacoes_google, instagram, tem_site, site_url, origem,
                                   observacoes)
      values (trim(r->>'nome'), trim(r->>'cidade'), nullif(r->>'segmento', ''), nullif(r->>'endereco', ''),
              nullif(r->>'contato_nome', ''), nullif(trim(r->>'telefone'), ''), nullif(r->>'email', ''), v_url,
              nullif(replace(r->>'nota_google', ',', '.'), '')::numeric,
              nullif(r->>'avaliacoes_google', '')::integer,
              nullif(r->>'instagram', ''), nullif(r->>'tem_site', '')::boolean, nullif(r->>'site_url', ''),
              coalesce(nullif(r->>'origem', ''), 'lista_importada'), nullif(r->>'observacoes', ''));
      v_inseridos := v_inseridos + 1;
    exception when others then
      v_erros := v_erros || jsonb_build_object('linha', n, 'nome', r->>'nome', 'erro', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('total', n, 'inseridos', v_inseridos, 'duplicados', v_dup, 'erros', v_erros);
end;
$$;

-- ---------------------------------------------------------------------
-- Toque na placa (ÚNICA função pública). Conta o toque e devolve o
-- destino. Toques seguidos dentro da janela contam uma vez; acima do
-- limite diário, não conta (mas redireciona normalmente).
-- ---------------------------------------------------------------------
create or replace function public.registrar_toque(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pl     public.placas;
  cfg    public.configuracoes;
  v_hoje timestamptz;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{14}$' then
    return null;
  end if;
  select * into pl from public.placas
   where token = p_token and ativo and destino_url is not null
     and status in ('vendida', 'instalada', 'demonstracao');
  if not found then
    return null;
  end if;
  select * into cfg from public.configuracoes;
  v_hoje := (private.hoje())::timestamp at time zone 'America/Sao_Paulo';

  if not exists (select 1 from public.toques_placa
                 where placa_id = pl.id
                   and ocorreu_em > now() - make_interval(secs => cfg.janela_toque_segundos))
     and (select count(*) from public.toques_placa
          where placa_id = pl.id and ocorreu_em >= v_hoje) < cfg.limite_toques_dia then
    insert into public.toques_placa (placa_id) values (pl.id);
  end if;
  return pl.destino_url;
end;
$$;

-- =====================================================================
-- VIEWS (security_invoker: respeitam a RLS de quem consulta)
--
-- Definição de lucro (competência):
--   lucro da venda   = total − custo das placas (lote de cada placa)
--                      − custo dos serviços − taxa do cartão
--   lucro líquido    = Σ lucro das vendas confirmadas no mês
--                      − despesas operacionais do mês (por vencimento)
--   Fora das despesas operacionais, para não contar duas vezes:
--   compra_placas, frete_placas, taxas_lote (já estão no custo de cada
--   placa vendida), taxas_cartao (já no lucro da venda), estorno (a venda
--   cancelada já saiu do lucro) e retiradas (não são despesa).
-- =====================================================================

create view public.v_estoque_resumo with (security_invoker = true) as
select
  count(*) filter (where p.status = 'disponivel')   as disponiveis,
  count(*) filter (where p.status = 'reservada')    as reservadas,
  count(*) filter (where p.status = 'vendida')      as aguardando_instalacao,
  count(*) filter (where p.status = 'instalada')    as instaladas,
  count(*) filter (where p.status = 'demonstracao') as demonstracao,
  count(*) filter (where p.status = 'defeito')      as defeito,
  count(*) filter (where p.status = 'perdida')      as perdidas,
  count(*)                                          as total,
  round(avg(l.custo_unitario) filter (where p.status = 'disponivel'), 2) as custo_medio_disponiveis,
  (select estoque_minimo from public.configuracoes) as estoque_minimo,
  count(*) filter (where p.status = 'disponivel') < (select estoque_minimo from public.configuracoes) as abaixo_minimo
from public.placas p
join public.lotes l on l.id = p.lote_id;

create view public.v_lotes with (security_invoker = true) as
select l.id, l.codigo, l.fornecedor, l.data_compra, l.quantidade, l.valor_pago, l.frete, l.outras_taxas,
       l.custo_total, round(l.custo_unitario, 2) as custo_por_placa,
       round(l.frete / l.quantidade, 2) as frete_por_placa,
       count(p.id) filter (where p.status = 'disponivel')                    as disponiveis,
       count(p.id) filter (where p.status in ('reservada','vendida','instalada')) as em_clientes,
       count(p.id) filter (where p.status = 'demonstracao')                  as demonstracao,
       count(p.id) filter (where p.status in ('defeito','perdida'))          as perdas
from public.lotes l
left join public.placas p on p.lote_id = l.id
group by l.id;

create view public.v_placas with (security_invoker = true) as
select p.id, p.codigo, p.token, p.status, p.lote_id, l.codigo as lote_codigo, round(l.custo_unitario, 2) as custo,
       p.venda_id, v.codigo as venda_codigo, p.cliente_id, c.nome as cliente_nome, c.cidade as cliente_cidade,
       p.responsavel_id, m.nome as responsavel_nome, p.destino_url, p.ativo, p.gravada_em, p.instalada_em,
       p.updated_at,
       (select count(*) from public.toques_placa t where t.placa_id = p.id) as toques_total,
       (select count(*) from public.toques_placa t where t.placa_id = p.id
          and t.ocorreu_em >= now() - interval '30 days') as toques_30d
from public.placas p
join public.lotes l on l.id = p.lote_id
left join public.vendas v on v.id = p.venda_id
left join public.clientes c on c.id = p.cliente_id
left join public.membros m on m.user_id = p.responsavel_id;

-- Vendas: confirmada/cancelada usa a fotografia; rascunho calcula ao vivo
create view public.v_vendas with (security_invoker = true) as
with itens as (
  select i.venda_id,
         sum(i.quantidade * i.preco_unitario)                                        as bruto,
         coalesce(sum(i.quantidade) filter (where p.categoria = 'placa'), 0)         as qtd_placas,
         coalesce(sum(i.quantidade * p.custo_padrao) filter (where p.categoria <> 'placa'), 0) as custo_serv,
         bool_or(p.categoria in ('otimizacao_google', 'site'))                       as tem_servico,
         string_agg(i.quantidade || '× ' || p.nome, ', ' order by p.categoria)       as itens_resumo
  from public.venda_itens i
  join public.produtos p on p.id = i.produto_id
  group by i.venda_id
),
reservas as (
  select pl.venda_id, round(sum(l.custo_unitario), 2) as custo
  from public.placas pl
  join public.lotes l on l.id = pl.lote_id
  where pl.status = 'reservada'
  group by pl.venda_id
),
pagamentos as (
  select venda_id,
         coalesce(sum(valor) filter (where tipo = 'receita' and pago_em is not null), 0) as recebido
  from public.lancamentos
  where venda_id is not null and cancelado_em is null
  group by venda_id
),
calc as (
  select v.*, c.nome as cliente_nome, c.cidade as cliente_cidade, m.nome as vendedor_nome,
         it.itens_resumo, coalesce(it.qtd_placas, 0) as qtd_placas, coalesce(it.tem_servico, false) as tem_servico,
         coalesce(v.total, coalesce(it.bruto, 0) - v.desconto)                       as total_calc,
         coalesce(v.custo_placas, r.custo, 0) + coalesce(v.custo_servicos, it.custo_serv, 0) as custo_calc,
         coalesce(v.taxa_valor, round((coalesce(it.bruto, 0) - v.desconto) * v.taxa_cartao_pct / 100, 2)) as taxa_calc,
         coalesce(pg.recebido, 0) as recebido
  from public.vendas v
  join public.clientes c on c.id = v.cliente_id
  left join public.membros m on m.user_id = v.vendedor_id
  left join itens it on it.venda_id = v.id
  left join reservas r on r.venda_id = v.id
  left join pagamentos pg on pg.venda_id = v.id
)
select id, codigo, status, data_venda, cliente_id, cliente_nome, cliente_cidade, vendedor_id, vendedor_nome,
       itens_resumo, qtd_placas, tem_servico, coalesce(e_upsell, false) as e_upsell,
       forma_pagamento, parcelas, desconto,
       total_calc as total, custo_calc as custo, taxa_calc as taxa,
       total_calc - custo_calc - taxa_calc as lucro,
       case when total_calc > 0 then round((total_calc - custo_calc - taxa_calc) / total_calc * 100, 1) end as margem_pct,
       recebido,
       case when status <> 'confirmada' then null
            when recebido >= total_calc then 'pago'
            when recebido > 0 then 'parcial'
            else 'pendente' end as situacao_pagamento,
       confirmada_em, cancelada_em, motivo_cancelamento, observacoes
from calc;

create view public.v_resultado_mensal with (security_invoker = true) as
with vendas_mes as (
  select date_trunc('month', data_venda)::date as mes,
         count(*) as vendas, sum(total) as faturamento, sum(custo_placas) as custo_placas,
         sum(custo_servicos) as custo_servicos, sum(taxa_valor) as taxas, sum(lucro) as lucro_vendas
  from public.vendas
  where status = 'confirmada'
  group by 1
),
despesas_mes as (
  select date_trunc('month', vencimento)::date as mes, sum(valor) as despesas_operacionais
  from public.lancamentos
  where tipo = 'despesa' and cancelado_em is null
    and categoria not in ('compra_placas', 'frete_placas', 'taxas_lote', 'taxas_cartao', 'estorno')
  group by 1
),
outras_receitas_mes as (
  select date_trunc('month', vencimento)::date as mes, sum(valor) as outras_receitas
  from public.lancamentos
  where tipo = 'receita' and categoria = 'outra_receita' and cancelado_em is null
  group by 1
),
caixa_mes as (
  select date_trunc('month', pago_em)::date as mes,
         sum(valor) filter (where tipo = 'receita')  as recebido,
         sum(valor) filter (where tipo = 'despesa')  as pago,
         sum(valor) filter (where tipo = 'retirada') as retiradas
  from public.lancamentos
  where pago_em is not null and cancelado_em is null
  group by 1
),
meses as (
  select mes from vendas_mes union select mes from despesas_mes
  union select mes from outras_receitas_mes union select mes from caixa_mes
)
select m.mes,
       coalesce(v.vendas, 0)                 as vendas,
       coalesce(v.faturamento, 0)            as faturamento,
       coalesce(v.custo_placas, 0)           as custo_placas,
       coalesce(v.custo_servicos, 0)         as custo_servicos,
       coalesce(v.taxas, 0)                  as taxas_cartao,
       coalesce(v.lucro_vendas, 0)           as lucro_vendas,
       coalesce(o.outras_receitas, 0)        as outras_receitas,
       coalesce(d.despesas_operacionais, 0)  as despesas_operacionais,
       coalesce(v.lucro_vendas, 0) + coalesce(o.outras_receitas, 0) - coalesce(d.despesas_operacionais, 0) as lucro_liquido,
       coalesce(c.recebido, 0)               as caixa_recebido,
       coalesce(c.pago, 0)                   as caixa_pago,
       coalesce(c.retiradas, 0)              as caixa_retiradas
from meses m
left join vendas_mes v on v.mes = m.mes
left join despesas_mes d on d.mes = m.mes
left join outras_receitas_mes o on o.mes = m.mes
left join caixa_mes c on c.mes = m.mes;

-- Retiradas 50/50: lucro acumulado dividido igualmente entre os sócios ativos
create view public.v_retiradas_socios with (security_invoker = true) as
with lucro as (
  select coalesce(sum(lucro_liquido), 0) as acumulado from public.v_resultado_mensal
),
socios as (
  select user_id, nome from public.membros where ativo
),
retirado as (
  select socio_id, sum(valor) as total
  from public.lancamentos
  where tipo = 'retirada' and cancelado_em is null
  group by socio_id
)
select s.user_id as socio_id, s.nome,
       l.acumulado                                              as lucro_acumulado,
       round(l.acumulado / (select count(*) from socios), 2)    as parte,
       coalesce(r.total, 0)                                     as retirado,
       round(l.acumulado / (select count(*) from socios), 2) - coalesce(r.total, 0) as saldo
from socios s
cross join lucro l
left join retirado r on r.socio_id = s.user_id;

-- Lista "Pra fazer hoje" do Painel
create view public.v_painel_hoje with (security_invoker = true) as
select 'follow_up'::text as tipo, c.nome as titulo,
       c.cidade || coalesce(' · ' || c.interesse, '') as detalhe,
       c.proximo_followup as quando,
       case when c.proximo_followup < private.hoje() then 'atrasado' else 'hoje' end as gravidade,
       'clientes'::text as ref_tabela, c.id as ref_id, c.responsavel_id
from public.clientes c
where c.proximo_followup <= private.hoje() and c.etapa not in ('cliente', 'descartado')
union all
select 'projeto_atrasado', c.nome, 'Prazo ' || to_char(p.prazo, 'DD/MM/YYYY'), p.prazo, 'atrasado',
       'projetos', p.id, p.responsavel_id
from public.projetos p join public.clientes c on c.id = p.cliente_id
where p.prazo < private.hoje() and p.status in ('a_entregar', 'em_andamento', 'aguardando_cliente')
union all
select 'aguardando_cliente', c.nome, pe.descricao, pe.pedido_em, 'info', 'projetos', p.id, p.responsavel_id
from public.projeto_pendencias pe
join public.projetos p on p.id = pe.projeto_id
join public.clientes c on c.id = p.cliente_id
where pe.resolvido_em is null and p.status <> 'cancelado'
union all
select 'revisao', c.nome, 'Revisão de ' || r.marco || ': anotar nota e avaliações', r.data_prevista,
       case when r.data_prevista < private.hoje() then 'atrasado' else 'hoje' end, 'projetos', p.id, p.responsavel_id
from public.projeto_revisoes r
join public.projetos p on p.id = r.projeto_id
join public.clientes c on c.id = p.cliente_id
where r.realizado_em is null and r.data_prevista <= private.hoje() and p.status <> 'cancelado'
union all
select 'upsell', c.nome, 'Oferecer de novo', p.upsell_oferecer_em,
       case when p.upsell_oferecer_em < private.hoje() then 'atrasado' else 'hoje' end, 'projetos', p.id, p.responsavel_id
from public.projetos p join public.clientes c on c.id = p.cliente_id
where p.upsell_oferecer_em <= private.hoje() and p.status <> 'cancelado'
  and (p.upsell_site not in ('vendido') or p.upsell_google not in ('vendido'))
union all
select 'parcela_atrasada', coalesce(c.nome, l.descricao), l.descricao || ' · R$ ' || to_char(l.valor, 'FM999G990D00'),
       l.vencimento, 'atrasado', 'lancamentos', l.id, null::uuid
from public.lancamentos l left join public.clientes c on c.id = l.cliente_id
where l.tipo = 'receita' and l.pago_em is null and l.cancelado_em is null and l.vencimento < private.hoje()
union all
select 'estoque_baixo', e.disponiveis || ' placas disponíveis', 'Mínimo definido: ' || e.estoque_minimo,
       private.hoje(), 'info', 'placas', null::uuid, null::uuid
from public.v_estoque_resumo e
where e.abaixo_minimo;

create view public.v_projetos with (security_invoker = true) as
select p.id, p.status, p.prazo, p.responsavel_id, m.nome as responsavel_nome,
       p.cliente_id, c.nome as cliente_nome, c.cidade as cliente_cidade, c.telefone as cliente_telefone,
       p.venda_id, v.codigo as venda_codigo, v.data_venda,
       vv.itens_resumo,
       (select count(*) from public.projeto_tarefas t where t.projeto_id = p.id)                         as tarefas_total,
       (select count(*) from public.projeto_tarefas t where t.projeto_id = p.id and t.feito_em is not null) as tarefas_feitas,
       (select count(*) from public.projeto_pendencias pe where pe.projeto_id = p.id and pe.resolvido_em is null) as pendencias_abertas,
       p.prazo < private.hoje() and p.status in ('a_entregar', 'em_andamento', 'aguardando_cliente') as atrasado,
       p.upsell_site, p.upsell_google, p.upsell_oferecer_em,
       p.upsell_site in ('oferecido', 'proposta_enviada', 'em_negociacao')
         or p.upsell_google in ('oferecido', 'proposta_enviada', 'em_negociacao') as upsell_em_aberto,
       p.entregue_em, p.updated_at
from public.projetos p
join public.clientes c on c.id = p.cliente_id
join public.vendas v on v.id = p.venda_id
left join public.v_vendas vv on vv.id = p.venda_id
left join public.membros m on m.user_id = p.responsavel_id;

-- Bloco "Resultado no Google" do Projeto
create view public.v_resultado_projeto with (security_invoker = true) as
with ultima as (
  select distinct on (projeto_id) projeto_id, realizado_em, nota, avaliacoes, marco
  from public.projeto_revisoes
  where realizado_em is not null
  order by projeto_id, realizado_em desc
),
toques as (
  select p.id as projeto_id,
         count(t.id) as toques_total,
         count(t.id) filter (where t.ocorreu_em <  (v.data_venda + 30)::timestamp at time zone 'America/Sao_Paulo') as toques_30d,
         count(t.id) filter (where t.ocorreu_em <  (v.data_venda + 60)::timestamp at time zone 'America/Sao_Paulo') as toques_60d,
         count(t.id) filter (where t.ocorreu_em <  (v.data_venda + 90)::timestamp at time zone 'America/Sao_Paulo') as toques_90d
  from public.projetos p
  join public.vendas v on v.id = p.venda_id
  left join public.placas pl on pl.venda_id = p.venda_id
  left join public.toques_placa t on t.placa_id = pl.id
  group by p.id
)
select p.id as projeto_id, v.data_venda,
       p.baseline_nota, p.baseline_avaliacoes, p.baseline_avaliacoes_mes,
       u.realizado_em as ultima_revisao_em, u.marco as ultima_revisao_marco, u.nota as nota_atual, u.avaliacoes as avaliacoes_atuais,
       u.avaliacoes - p.baseline_avaliacoes as avaliacoes_ganhas,
       case when u.realizado_em > v.data_venda then
         round((u.avaliacoes - p.baseline_avaliacoes)::numeric / ((u.realizado_em - v.data_venda) / 30.0), 1)
       end as avaliacoes_mes_depois,
       c.concorrente_nome, c.concorrente_nota, c.concorrente_avaliacoes,
       coalesce(t.toques_total, 0) as toques_total, coalesce(t.toques_30d, 0) as toques_30d,
       coalesce(t.toques_60d, 0) as toques_60d, coalesce(t.toques_90d, 0) as toques_90d
from public.projetos p
join public.vendas v on v.id = p.venda_id
join public.clientes c on c.id = p.cliente_id
left join ultima u on u.projeto_id = p.id
left join toques t on t.projeto_id = p.id;

-- =====================================================================
-- Indicadores do Painel para um período (o app compara com o anterior
-- chamando de novo com as datas do período anterior).
-- =====================================================================
create or replace function public.painel_indicadores(
  p_inicio   date,
  p_fim      date,
  p_vendedor uuid default null,
  p_cidade   text default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with vendas_periodo as (
    -- Vendas confirmadas no período, com filtros opcionais
    select v.id, v.cliente_id, v.total, v.lucro, c.cidade,
           (select coalesce(sum(i.quantidade), 0) from public.venda_itens i
             join public.produtos p on p.id = i.produto_id
            where i.venda_id = v.id and p.categoria = 'placa') as placas
    from public.vendas v
    join public.clientes c on c.id = v.cliente_id
    where v.status = 'confirmada'
      and v.data_venda between p_inicio and p_fim
      and (p_vendedor is null or v.vendedor_id = p_vendedor)
      and (p_cidade is null or c.cidade = p_cidade)
  ),
  despesas as (
    -- Despesas operacionais só entram sem filtro de vendedor/cidade
    select coalesce(sum(l.valor), 0) as total
    from public.lancamentos l
    where p_vendedor is null and p_cidade is null
      and l.tipo = 'despesa' and l.cancelado_em is null
      and l.categoria not in ('compra_placas', 'frete_placas', 'taxas_lote', 'taxas_cartao', 'estorno')
      and l.vencimento between p_inicio and p_fim
  ),
  outras as (
    select coalesce(sum(l.valor), 0) as total
    from public.lancamentos l
    where p_vendedor is null and p_cidade is null
      and l.tipo = 'receita' and l.categoria = 'outra_receita' and l.cancelado_em is null
      and l.vencimento between p_inicio and p_fim
  ),
  leads_periodo as (
    -- Coorte: leads cadastrados no período e onde estão hoje
    select c.id, c.etapa
    from public.clientes c
    where c.created_at >= p_inicio::timestamp at time zone 'America/Sao_Paulo'
      and c.created_at <  (p_fim + 1)::timestamp at time zone 'America/Sao_Paulo'
      and (p_vendedor is null or c.responsavel_id = p_vendedor)
      and (p_cidade is null or c.cidade = p_cidade)
  ),
  clientes_ate_fim as (
    -- Para a taxa de upsell: todo cliente com venda confirmada até o fim do período
    select v.cliente_id,
           bool_or(p.categoria in ('otimizacao_google', 'site')) as comprou_servico
    from public.vendas v
    join public.clientes c on c.id = v.cliente_id
    join public.venda_itens i on i.venda_id = v.id
    join public.produtos p on p.id = i.produto_id
    where v.status = 'confirmada' and v.data_venda <= p_fim
      and (p_cidade is null or c.cidade = p_cidade)
    group by v.cliente_id
  ),
  servicos_periodo as (
    select p.categoria, count(distinct v.id) as vendas, sum(i.quantidade * i.preco_unitario) as valor
    from vendas_periodo v
    join public.venda_itens i on i.venda_id = v.id
    join public.produtos p on p.id = i.produto_id
    where p.categoria in ('otimizacao_google', 'site')
    group by p.categoria
  ),
  descartes as (
    select c.motivo_descarte, count(*) as n
    from public.clientes c
    where c.etapa = 'descartado'
      and c.descartado_em >= p_inicio::timestamp at time zone 'America/Sao_Paulo'
      and c.descartado_em <  (p_fim + 1)::timestamp at time zone 'America/Sao_Paulo'
      and (p_cidade is null or c.cidade = p_cidade)
    group by c.motivo_descarte
  ),
  meses as (
    select r.mes, r.faturamento, r.lucro_liquido
    from public.v_resultado_mensal r
    where r.mes > (date_trunc('month', p_fim) - interval '6 months')::date
      and r.mes <= p_fim
  )
  select jsonb_build_object(
    'faturamento',     (select coalesce(sum(total), 0) from vendas_periodo),
    'lucro_vendas',    (select coalesce(sum(lucro), 0) from vendas_periodo),
    'despesas',        (select total from despesas),
    'lucro_liquido',   (select coalesce(sum(lucro), 0) from vendas_periodo)
                       + (select total from outras) - (select total from despesas),
    'lucro_liquido_parcial', (p_vendedor is not null or p_cidade is not null),
    'vendas',          (select count(*) from vendas_periodo),
    'ticket_medio',    (select round(avg(total), 2) from vendas_periodo),
    'placas_vendidas', (select coalesce(sum(placas), 0) from vendas_periodo),
    'leads_periodo',   (select count(*) from leads_periodo),
    'leads_viraram_cliente', (select count(*) from leads_periodo where etapa = 'cliente'),
    'conversao_pct',   (select case when count(*) > 0
                               then round(count(*) filter (where etapa = 'cliente') * 100.0 / count(*), 1) end
                        from leads_periodo),
    'clientes_total',  (select count(*) from clientes_ate_fim),
    'clientes_com_servico', (select count(*) from clientes_ate_fim where comprou_servico),
    'taxa_upsell_pct', (select case when count(*) > 0
                               then round(count(*) filter (where comprou_servico) * 100.0 / count(*), 1) end
                        from clientes_ate_fim),
    'servicos', coalesce((select jsonb_agg(jsonb_build_object('categoria', categoria, 'vendas', vendas, 'valor', valor))
                          from servicos_periodo), '[]'::jsonb),
    'funil', (select jsonb_agg(jsonb_build_object('etapa', e.etapa, 'leads',
                       (select count(*) from leads_periodo lp where lp.etapa = e.etapa)) order by e.ordem)
              from (values ('a_prospectar', 1), ('prospectado', 2), ('follow_up', 3), ('negociacao', 4),
                           ('cliente', 5), ('descartado', 6)) as e(etapa, ordem)),
    'vendas_por_cidade', coalesce((select jsonb_agg(x order by x.faturamento desc)
                                   from (select cidade, count(*) as vendas, sum(total) as faturamento
                                         from vendas_periodo group by cidade) x), '[]'::jsonb),
    'motivos_descarte', coalesce((select jsonb_agg(jsonb_build_object('motivo', motivo_descarte, 'leads', n) order by n desc)
                                  from descartes), '[]'::jsonb),
    'por_mes', coalesce((select jsonb_agg(jsonb_build_object('mes', mes, 'faturamento', faturamento,
                                                             'lucro_liquido', lucro_liquido) order by mes)
                         from meses), '[]'::jsonb)
  );
$$;

-- =====================================================================
-- RLS: só membros ativos. Políticas de escrita por tabela.
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['membros','configuracoes','auditoria','clientes','interacoes','produtos','lotes',
                           'placas','movimentacoes_estoque','toques_placa','vendas','venda_itens','projetos',
                           'projeto_tarefas','projeto_pendencias','projeto_revisoes','lancamentos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select private.is_membro()))',
                   t || '_select', t);
  end loop;
end $$;

-- Escrita (o "o quê" de cada coluna é limitado pelos grants abaixo)
create policy config_update on public.configuracoes for update to authenticated
  using ((select private.is_membro())) with check ((select private.is_membro()));

create policy clientes_insert on public.clientes for insert to authenticated with check ((select private.is_membro()));
create policy clientes_update on public.clientes for update to authenticated
  using ((select private.is_membro())) with check ((select private.is_membro()));
create policy clientes_delete on public.clientes for delete to authenticated using ((select private.is_membro()));

create policy interacoes_insert on public.interacoes for insert to authenticated with check ((select private.is_membro()));
create policy interacoes_update on public.interacoes for update to authenticated
  using ((select private.is_membro())) with check ((select private.is_membro()));
create policy interacoes_delete on public.interacoes for delete to authenticated using ((select private.is_membro()));

create policy produtos_insert on public.produtos for insert to authenticated with check ((select private.is_membro()));
create policy produtos_update on public.produtos for update to authenticated
  using ((select private.is_membro())) with check ((select private.is_membro()));

create policy lotes_update on public.lotes for update to authenticated
  using ((select private.is_membro())) with check ((select private.is_membro()));

create policy placas_update on public.placas for update to authenticated
  using ((select private.is_membro())) with check ((select private.is_membro()));

create policy vendas_insert on public.vendas for insert to authenticated
  with check ((select private.is_membro()) and status = 'rascunho');
create policy vendas_update on public.vendas for update to authenticated
  using ((select private.is_membro())) with check ((select private.is_membro()));
create policy vendas_delete on public.vendas for delete to authenticated using ((select private.is_membro()));

create policy itens_insert on public.venda_itens for insert to authenticated with check ((select private.is_membro()));
create policy itens_update on public.venda_itens for update to authenticated
  using ((select private.is_membro())) with check ((select private.is_membro()));
create policy itens_delete on public.venda_itens for delete to authenticated using ((select private.is_membro()));

create policy projetos_update on public.projetos for update to authenticated
  using ((select private.is_membro())) with check ((select private.is_membro()));

create policy tarefas_insert on public.projeto_tarefas for insert to authenticated with check ((select private.is_membro()));
create policy tarefas_update on public.projeto_tarefas for update to authenticated
  using ((select private.is_membro())) with check ((select private.is_membro()));
create policy tarefas_delete on public.projeto_tarefas for delete to authenticated using ((select private.is_membro()));

create policy pendencias_insert on public.projeto_pendencias for insert to authenticated with check ((select private.is_membro()));
create policy pendencias_update on public.projeto_pendencias for update to authenticated
  using ((select private.is_membro())) with check ((select private.is_membro()));
create policy pendencias_delete on public.projeto_pendencias for delete to authenticated using ((select private.is_membro()));

create policy revisoes_insert on public.projeto_revisoes for insert to authenticated
  with check ((select private.is_membro()) and marco = 'extra');
create policy revisoes_update on public.projeto_revisoes for update to authenticated
  using ((select private.is_membro())) with check ((select private.is_membro()));

-- Lançamento manual: só avulsos (sem venda/lote) e nunca já cancelado
create policy lanc_insert on public.lancamentos for insert to authenticated
  with check ((select private.is_membro()) and venda_id is null and lote_id is null and cancelado_em is null
              and categoria in ('outra_receita','ferramentas','dominio_hospedagem','deslocamento',
                                'marketing','outra_despesa','retirada'));
create policy lanc_update on public.lancamentos for update to authenticated
  using ((select private.is_membro())) with check ((select private.is_membro()));

-- =====================================================================
-- Privilégios (o Supabase concede tudo por padrão em public; zeramos)
-- =====================================================================
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public  from anon, authenticated, public;
revoke all on all functions in schema private from anon, authenticated, public;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;

grant execute on function private.is_membro()     to authenticated;
grant execute on function private.hoje()          to authenticated;
grant execute on function private.exigir_membro() to authenticated;

grant select on public.membros, public.auditoria, public.movimentacoes_estoque, public.toques_placa to authenticated;

grant select on public.configuracoes to authenticated;
grant update (estoque_minimo, taxa_credito_pct, taxa_debito_pct, janela_toque_segundos, limite_toques_dia)
  on public.configuracoes to authenticated;

grant select, delete on public.clientes to authenticated;
grant insert (nome, segmento, cidade, endereco, contato_nome, telefone, email, google_url, nota_google,
              avaliacoes_google, avaliacoes_mes_antes, instagram, tem_site, site_url, interesse,
              concorrente_nome, concorrente_nota, concorrente_avaliacoes, etapa, motivo_descarte, origem,
              responsavel_id, proximo_followup, observacoes)
  on public.clientes to authenticated;
grant update (nome, segmento, cidade, endereco, contato_nome, telefone, email, google_url, nota_google,
              avaliacoes_google, avaliacoes_mes_antes, instagram, tem_site, site_url, interesse,
              concorrente_nome, concorrente_nota, concorrente_avaliacoes, etapa, motivo_descarte, origem,
              responsavel_id, proximo_followup, observacoes)
  on public.clientes to authenticated;

grant select, delete on public.interacoes to authenticated;
grant insert (cliente_id, canal, resumo, proximo_passo, proximo_followup, ocorreu_em) on public.interacoes to authenticated;
grant update (canal, resumo, proximo_passo, proximo_followup, ocorreu_em)             on public.interacoes to authenticated;

grant select on public.produtos to authenticated;
grant insert (nome, descricao, categoria, preco_padrao, custo_padrao, ativo) on public.produtos to authenticated;
grant update (nome, descricao, preco_padrao, custo_padrao, ativo)            on public.produtos to authenticated;

grant select on public.lotes to authenticated;
grant update (fornecedor, observacoes) on public.lotes to authenticated;

grant select on public.placas to authenticated;
grant update (destino_url, ativo, gravada_em) on public.placas to authenticated;

grant select, delete on public.vendas to authenticated;
grant insert (cliente_id, data_venda, vendedor_id, desconto, forma_pagamento, parcelas, entrada,
              primeiro_vencimento, taxa_cartao_pct, observacoes) on public.vendas to authenticated;
grant update (cliente_id, data_venda, vendedor_id, desconto, forma_pagamento, parcelas, entrada,
              primeiro_vencimento, taxa_cartao_pct, observacoes) on public.vendas to authenticated;

grant select, delete on public.venda_itens to authenticated;
grant insert (venda_id, produto_id, quantidade, preco_unitario) on public.venda_itens to authenticated;
grant update (quantidade, preco_unitario)                       on public.venda_itens to authenticated;

grant select on public.projetos to authenticated;
grant update (status, responsavel_id, prazo, observacoes, upsell_site, upsell_google, upsell_oferecer_em,
              upsell_motivo_recusa) on public.projetos to authenticated;

grant select, delete on public.projeto_tarefas to authenticated;
grant insert (projeto_id, grupo, titulo, ordem, feito_em) on public.projeto_tarefas to authenticated;
grant update (titulo, ordem, feito_em)                    on public.projeto_tarefas to authenticated;

grant select, delete on public.projeto_pendencias to authenticated;
grant insert (projeto_id, descricao, pedido_em, resolvido_em) on public.projeto_pendencias to authenticated;
grant update (descricao, pedido_em, resolvido_em)             on public.projeto_pendencias to authenticated;

grant select on public.projeto_revisoes to authenticated;
grant insert (projeto_id, marco, data_prevista, realizado_em, nota, avaliacoes, observacoes) on public.projeto_revisoes to authenticated;
grant update (data_prevista, realizado_em, nota, avaliacoes, observacoes)                   on public.projeto_revisoes to authenticated;

grant select on public.lancamentos to authenticated;
grant insert (tipo, categoria, descricao, valor, vencimento, pago_em, forma_pagamento, cliente_id, socio_id)
  on public.lancamentos to authenticated;
grant update (tipo, categoria, descricao, valor, vencimento, pago_em, forma_pagamento, cliente_id, socio_id,
              cancelado_em, motivo_cancelamento)
  on public.lancamentos to authenticated;

grant select on public.v_estoque_resumo, public.v_lotes, public.v_placas, public.v_vendas, public.v_resultado_mensal,
                public.v_retiradas_socios, public.v_painel_hoje, public.v_projetos, public.v_resultado_projeto
  to authenticated;

grant execute on function public.confirmar_venda(uuid)                         to authenticated;
grant execute on function public.cancelar_venda(uuid, text)                    to authenticated;
grant execute on function public.trocar_placa_reservada(uuid, uuid, uuid)      to authenticated;
grant execute on function public.registrar_lote(text, integer, numeric, numeric, numeric, date, text, boolean, text) to authenticated;
grant execute on function public.ajustar_placa(uuid, text, text, uuid)         to authenticated;
grant execute on function public.importar_leads(jsonb)                         to authenticated;
grant execute on function public.painel_indicadores(date, date, uuid, text)    to authenticated;
-- Única porta pública
grant execute on function public.registrar_toque(text) to anon, authenticated;

-- =====================================================================
-- Catálogo inicial (preços editáveis no app)
-- =====================================================================
insert into public.produtos (nome, descricao, categoria, preco_padrao) values
  ('Placa NFC (acrílico)', 'Placa de aproximação com link de avaliação do Google', 'placa', 89.90),
  ('Otimização do Google', 'Perfil, categorias, horários, fotos, postagens e respostas', 'otimizacao_google', 350.00),
  ('Site', 'Site institucional ligado ao perfil do Google', 'site', 1500.00);

-- =====================================================================
-- Depois de rodar (SQL Editor, como admin): cadastre os sócios
--   insert into public.membros (user_id, nome, papel)
--   select id, 'João', 'admin' from auth.users where email = 'EMAIL_DO_JOAO';
--   insert into public.membros (user_id, nome, papel)
--   select id, 'Nathan', 'socio' from auth.users where email = 'EMAIL_DO_NATHAN';
-- =====================================================================
