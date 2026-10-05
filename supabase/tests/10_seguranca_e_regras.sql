-- Testes do banco Aproxima v2. Rodar num Postgres LIMPO, depois de
-- 00_stub_auth_local.sql e da migration. Saída: linhas "ok" ou "FALHOU".
\set QUIET on
\pset footer off
set client_min_messages = notice;

insert into auth.users (id, email) values
 ('11111111-1111-1111-1111-111111111111', 'joao@x.com'),
 ('22222222-2222-2222-2222-222222222222', 'nathan@x.com'),
 ('33333333-3333-3333-3333-333333333333', 'intruso@x.com');
insert into public.membros (user_id, nome, papel) values
 ('11111111-1111-1111-1111-111111111111', 'João', 'admin'),
 ('22222222-2222-2222-2222-222222222222', 'Nathan', 'socio');

create or replace function pg_temp.t(nome text, sqltxt text, espera_erro boolean) returns void language plpgsql as $$
begin
  begin
    execute sqltxt;
    if espera_erro then raise notice 'FALHOU (deveria bloquear): %', nome;
    else raise notice 'ok   %', nome; end if;
  exception when others then
    if espera_erro then raise notice 'ok   % -> bloqueado: %', nome, sqlerrm;
    else raise notice 'FALHOU: % -> %', nome, sqlerrm; end if;
  end;
end $$;
create or replace function pg_temp.eq(nome text, obtido text, esperado text) returns void language plpgsql as $$
begin
  if obtido is not distinct from esperado then raise notice 'ok   % = %', nome, obtido;
  else raise notice 'FALHOU: % -> obtido %, esperado %', nome, obtido, esperado; end if;
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

create or replace function pg_temp.joao() returns void language sql as
$$ select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false) $$;
create or replace function pg_temp.nathan() returns void language sql as
$$ select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', false) $$;
create or replace function pg_temp.intruso() returns void language sql as
$$ select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333', false) $$;

-- ===================== ANÔNIMO =====================
\echo '== anônimo'
set role anon;
select pg_temp.t('anon lê clientes',        'select * from public.clientes', true);
select pg_temp.t('anon lê placas',          'select * from public.placas', true);
select pg_temp.t('anon chama confirmar',    $q$select public.confirmar_venda(gen_random_uuid())$q$, true);
select pg_temp.t('anon registra lote',      $q$select public.registrar_lote('x', 1, 1)$q$, true);
select pg_temp.eq('anon toque com token inválido', public.registrar_toque('nao-existe'), null);
reset role;

-- ===================== JOÃO: estoque =====================
\echo '== estoque'
set role authenticated;
select pg_temp.joao();
select pg_temp.eq('catálogo inicial', (select count(*)::text from public.produtos), '3');
select pg_temp.t('lote 1: 2 placas, R$40 + frete 2', $q$select public.registrar_lote('NFC Brasil Tags', 2, 40, 2, 0)$q$, false);
select pg_temp.t('lote 2: 10 placas, R$170 + frete 15 + taxas 5', $q$select public.registrar_lote('NFC Brasil Tags', 10, 170, 15, 5)$q$, false);
select pg_temp.eq('custo por placa LT-001', (select custo_por_placa::text from public.v_lotes where codigo='LT-001'), '21.00');
select pg_temp.eq('custo por placa LT-002', (select custo_por_placa::text from public.v_lotes where codigo='LT-002'), '19.00');
select pg_temp.eq('placas disponíveis', (select disponiveis::text from public.v_estoque_resumo), '12');
select pg_temp.eq('despesas do lote no financeiro', (select count(*)::text from public.lancamentos where lote_id is not null), '5');
select pg_temp.t('inserir lote direto (sem placas)', $q$insert into public.lotes (fornecedor, quantidade, valor_pago) values ('x', 1, 1)$q$, true);
select pg_temp.t('mudar status da placa direto', $q$update public.placas set status='instalada' where codigo='AP-0005'$q$, true);
select pg_temp.t('inserir movimentação direto', $q$insert into public.movimentacoes_estoque (placa_id, status_para) select id, 'x' from public.placas limit 1$q$, true);
select pg_temp.t('ajuste sem motivo', $q$select public.ajustar_placa((select id from public.placas where codigo='AP-0012'), 'demonstracao')$q$, true);
select pg_temp.t('AP-0012 vai para demonstração', $q$select public.ajustar_placa((select id from public.placas where codigo='AP-0012'), 'demonstracao', 'Kit de visitas')$q$, false);
select pg_temp.t('transição inválida demonstração→instalada', $q$select public.ajustar_placa((select id from public.placas where codigo='AP-0012'), 'instalada', 'x')$q$, true);
select pg_temp.eq('movimentação registra motivo', (select motivo from public.movimentacoes_estoque m join public.placas p on p.id=m.placa_id where p.codigo='AP-0012' order by m.id desc limit 1), 'Kit de visitas');

-- ===================== Prospecção =====================
\echo '== prospecção'
select pg_temp.t('forjar autor do lead', $q$insert into public.clientes (nome, cidade, created_by) values ('x', 'y', '22222222-2222-2222-2222-222222222222')$q$, true);
select pg_temp.t('cria lead Padaria', $q$insert into public.clientes (nome, cidade, telefone, google_url, nota_google, avaliacoes_google, avaliacoes_mes_antes)
  values ('Padaria Pão Nosso', 'Santa Cruz do Rio Pardo', '(14) 99999-0001', 'https://g.page/r/padaria', 4.2, 23, 1.9)$q$, false);
select pg_temp.eq('código do lead', (select codigo from public.clientes where nome='Padaria Pão Nosso'), 'L-0001');
select pg_temp.eq('autor vem do login', (select created_by::text from public.clientes where codigo='L-0001'), '11111111-1111-1111-1111-111111111111');
select pg_temp.t('link do Google duplicado', $q$insert into public.clientes (nome, cidade, google_url) values ('Cópia', 'X', 'https://G.page/r/padaria')$q$, true);
select pg_temp.t('etapa Cliente manual', $q$update public.clientes set etapa='cliente' where codigo='L-0001'$q$, true);
select pg_temp.t('descartar sem motivo', $q$update public.clientes set etapa='descartado' where codigo='L-0001'$q$, true);
select pg_temp.t('registrar contato', $q$insert into public.interacoes (cliente_id, canal, resumo, proximo_followup)
  select id, 'visita', 'Mostrei a placa, gostou', private.hoje() from public.clientes where codigo='L-0001'$q$, false);
select pg_temp.eq('contato tira de A prospectar', (select etapa from public.clientes where codigo='L-0001'), 'prospectado');
select pg_temp.eq('follow-up aparece no Painel', (select count(*)::text from public.v_painel_hoje where tipo='follow_up'), '1');
select pg_temp.t('importar CSV', $q$select public.importar_leads('[
   {"nome":"Barbearia Dom","cidade":"Ourinhos","telefone":"(14) 98888-0002","nota_google":"4,7","avaliacoes_google":"64"},
   {"nome":"Padaria repetida","cidade":"SCRP","google_url":"https://g.page/r/padaria"},
   {"nome":"Telefone ruim","cidade":"Ipaussu","telefone":"abc"}]'::jsonb)$q$, false);
select pg_temp.eq('importação: 1 inserido, 1 duplicado, 1 erro',
  (select (r->>'inseridos') || '/' || jsonb_array_length(r->'duplicados') || '/' || jsonb_array_length(r->'erros')
     from (select public.importar_leads('[{"nome":"Ótica Visão","cidade":"Chavantes"},{"nome":"Dup","cidade":"x","telefone":"14 98888 0002"},{"nome":"","cidade":"x"}]'::jsonb) r) s),
  '1/1/1');
select pg_temp.eq('nota com vírgula importada', (select nota_google::text from public.clientes where nome='Barbearia Dom'), '4.7');

-- ===================== Venda 1 =====================
\echo '== venda'
select pg_temp.t('cria rascunho (cartão 3x, 4,99%)', $q$insert into public.vendas (cliente_id, desconto, forma_pagamento, parcelas, taxa_cartao_pct)
  select id, 29.80, 'cartao_credito', 3, 4.99 from public.clientes where codigo='L-0001'$q$, false);
select pg_temp.t('3 placas', $q$insert into public.venda_itens (venda_id, produto_id, quantidade)
  select (select id from public.vendas where codigo='V-0001'), id, 3 from public.produtos where categoria='placa'$q$, false);
select pg_temp.t('otimização do Google', $q$insert into public.venda_itens (venda_id, produto_id, quantidade)
  select (select id from public.vendas where codigo='V-0001'), id, 1 from public.produtos where categoria='otimizacao_google'$q$, false);
select pg_temp.eq('placas reservadas (FIFO)', (select string_agg(codigo, ',' order by codigo) from public.placas where status='reservada'), 'AP-0001,AP-0002,AP-0003');
select pg_temp.eq('prévia do lucro no rascunho', (select lucro::text from public.v_vendas where id=(select id from public.vendas where codigo='V-0001')), '499.46');
select pg_temp.t('troca AP-0003 por AP-0010', $q$select public.trocar_placa_reservada((select id from public.vendas where codigo='V-0001'),
  (select id from public.placas where codigo='AP-0003'), (select id from public.placas where codigo='AP-0010'))$q$, false);
select pg_temp.t('status direto para confirmada', $q$update public.vendas set status='confirmada' where id=(select id from public.vendas where codigo='V-0001')$q$, true);
select pg_temp.t('forjar total', $q$update public.vendas set total=1 where id=(select id from public.vendas where codigo='V-0001')$q$, true);
select pg_temp.t('estoque insuficiente', $q$update public.venda_itens set quantidade=50 where venda_id=(select id from public.vendas where codigo='V-0001') and quantidade=3$q$, true);

select pg_temp.nathan();
select pg_temp.t('Nathan confirma', $q$select public.confirmar_venda((select id from public.vendas where codigo='V-0001'))$q$, false);
select pg_temp.eq('total', (select total::text from public.vendas where codigo='V-0001'), '589.90');
select pg_temp.eq('custo das placas pelo lote (21+21+19)', (select custo_placas::text from public.vendas where codigo='V-0001'), '61.00');
select pg_temp.eq('taxa do cartão', (select taxa_valor::text from public.vendas where codigo='V-0001'), '29.44');
select pg_temp.eq('lucro', (select lucro::text from public.vendas where codigo='V-0001'), '499.46');
select pg_temp.eq('parcelas (centavos na última)', (select string_agg(valor::text, ' + ' order by parcela) from public.lancamentos where venda_id=(select id from public.vendas where codigo='V-0001') and tipo='receita'), '196.63 + 196.63 + 196.64');
select pg_temp.eq('placas vendidas', (select string_agg(codigo, ',' order by codigo) from public.placas where status='vendida'), 'AP-0001,AP-0002,AP-0010');
select pg_temp.eq('lead virou Cliente', (select etapa from public.clientes where codigo='L-0001'), 'cliente');
select pg_temp.eq('projeto: tarefas 4+8, revisões 3', (select tarefas_total || '/' || (select count(*) from public.projeto_revisoes r where r.projeto_id=p.id) from public.v_projetos p where venda_codigo='V-0001'), '12/3');
select pg_temp.eq('upsell: google vendido, site não oferecido', (select upsell_google || '/' || upsell_site from public.projetos), 'vendido/nao_oferecido');
select pg_temp.eq('fotografia do antes', (select baseline_avaliacoes || '/' || baseline_avaliacoes_mes from public.projetos), '23/1.9');
select pg_temp.t('confirmar de novo', $q$select public.confirmar_venda((select id from public.vendas where codigo='V-0001'))$q$, true);
select pg_temp.t('mudar item depois de confirmada', $q$update public.venda_itens set quantidade=1 where venda_id=(select id from public.vendas where codigo='V-0001')$q$, true);
select pg_temp.t('mudar desconto depois de confirmada', $q$update public.vendas set desconto=0 where codigo='V-0001'$q$, true);
select pg_temp.t('mudar observação depois de confirmada', $q$update public.vendas set observacoes='Instalar na sexta' where codigo='V-0001'$q$, false);
select pg_temp.t('apagar venda confirmada', $q$delete from public.vendas where codigo='V-0001'$q$, true);
select pg_temp.t('mudar valor da parcela', $q$update public.lancamentos set valor=1 where venda_id=(select id from public.vendas where codigo='V-0001') and parcela=1$q$, true);
select pg_temp.t('marcar parcela 1 paga', $q$update public.lancamentos set pago_em=private.hoje(), forma_pagamento='cartao_credito' where venda_id=(select id from public.vendas where codigo='V-0001') and parcela=1$q$, false);
select pg_temp.eq('situação do pagamento', (select situacao_pagamento from public.v_vendas where codigo='V-0001'), 'parcial');
select pg_temp.t('lead com venda sai de Cliente', $q$update public.clientes set etapa='follow_up' where codigo='L-0001'$q$, true);

-- ===================== Projeto, placa e toques =====================
\echo '== projeto e link da placa'
select pg_temp.t('cancelar projeto direto', $q$update public.projetos set status='cancelado'$q$, true);
select pg_temp.t('marcar upsell vendido à mão', $q$update public.projetos set upsell_site='vendido'$q$, true);
select pg_temp.t('oferecer site', $q$update public.projetos set upsell_site='oferecido', upsell_oferecer_em=private.hoje()$q$, false);
select pg_temp.t('entregar projeto', $q$update public.projetos set status='entregue'$q$, false);
select pg_temp.eq('data de entrega registrada', (select (entregue_em is not null)::text from public.projetos), 'true');
select pg_temp.t('revisão 30d', $q$update public.projeto_revisoes set realizado_em=private.hoje()+30, nota=4.4, avaliacoes=41 where marco='30d'$q$, false);
select pg_temp.t('revisão sem avaliações', $q$update public.projeto_revisoes set realizado_em=private.hoje() where marco='60d'$q$, true);
select pg_temp.t('instalar AP-0001', $q$select public.ajustar_placa((select id from public.placas where codigo='AP-0001'), 'instalada')$q$, false);
select pg_temp.t('gravar destino do Google', $q$update public.placas set destino_url='https://g.page/r/padaria/review', gravada_em=now() where codigo='AP-0001'$q$, false);
select pg_temp.t('destino sem https', $q$update public.placas set destino_url='http://x' where codigo='AP-0002'$q$, true);
reset role;
select token as tk1 from public.placas where codigo='AP-0001' \gset
select token as tk5 from public.placas where codigo='AP-0005' \gset
set role anon;
select pg_temp.eq('toque redireciona', public.registrar_toque(:'tk1'), 'https://g.page/r/padaria/review');
select pg_temp.eq('toque repetido redireciona', public.registrar_toque(:'tk1'), 'https://g.page/r/padaria/review');
select pg_temp.eq('placa em estoque não redireciona', public.registrar_toque(:'tk5'), null);
select pg_temp.t('anon lê toques', 'select * from public.toques_placa', true);
reset role;
select pg_temp.eq('toque repetido conta 1 vez', (select count(*)::text from public.toques_placa), '1');
select pg_temp.eq('token tem 14 hex e não é o código', (select (token ~ '^[0-9a-f]{14}$' and token <> codigo)::text from public.placas where codigo='AP-0001'), 'true');
set role authenticated;
select pg_temp.nathan();
select pg_temp.eq('resultado do projeto', (select avaliacoes_ganhas || ' aval / ' || avaliacoes_mes_depois || ' por mês / ' || toques_total || ' toque' from public.v_resultado_projeto), '18 aval / 18.0 por mês / 1 toque');
select pg_temp.eq('upsell no Painel', (select count(*)::text from public.v_painel_hoje where tipo='upsell'), '1');

-- ===================== Upsell: venda 2 (site) =====================
\echo '== upsell'
select pg_temp.t('venda 2: site', $q$insert into public.vendas (cliente_id) select id from public.clientes where codigo='L-0001'$q$, false);
select pg_temp.t('item site', $q$insert into public.venda_itens (venda_id, produto_id, quantidade) select (select id from public.vendas where codigo='V-0002'), id, 1 from public.produtos where categoria='site'$q$, false);
select pg_temp.t('confirma venda 2', $q$select public.confirmar_venda((select id from public.vendas where codigo='V-0002'))$q$, false);
select pg_temp.eq('venda 2 é upsell', (select e_upsell::text from public.vendas where codigo='V-0002'), 'true');
select pg_temp.eq('projeto 1: site virou vendido', (select upsell_site from public.projetos p join public.vendas v on v.id=p.venda_id where v.codigo='V-0001'), 'vendido');

-- ===================== Financeiro =====================
\echo '== financeiro'
select pg_temp.t('despesa avulsa (ferramentas R$50)', $q$insert into public.lancamentos (tipo, categoria, descricao, valor, vencimento, pago_em) values ('despesa','ferramentas','Assinatura', 50, private.hoje(), private.hoje())$q$, false);
select pg_temp.t('lançar compra de placas à mão', $q$insert into public.lancamentos (tipo, categoria, descricao, valor, vencimento) values ('despesa','compra_placas','x', 10, private.hoje())$q$, true);
select pg_temp.t('retirada sem sócio', $q$insert into public.lancamentos (tipo, categoria, descricao, valor, vencimento) values ('retirada','retirada','x', 10, private.hoje())$q$, true);
select pg_temp.t('retirada do João R$100', $q$insert into public.lancamentos (tipo, categoria, descricao, valor, vencimento, pago_em, socio_id) values ('retirada','retirada','Retirada', 100, private.hoje(), private.hoje(), '11111111-1111-1111-1111-111111111111')$q$, false);
select pg_temp.t('cancelar avulso sem motivo', $q$update public.lancamentos set cancelado_em=now() where categoria='ferramentas'$q$, true);
-- lucro: V-0001 499,46 + V-0002 1500 − ferramentas 50 (compra/frete das placas não entram de novo)
select pg_temp.eq('lucro líquido do mês', (select lucro_liquido::text from public.v_resultado_mensal where mes = date_trunc('month', private.hoje())::date), '1949.46');
select pg_temp.eq('retiradas 50/50: saldo do João', (select saldo::text from public.v_retiradas_socios where nome='João'), '874.73');
select pg_temp.eq('retiradas 50/50: saldo do Nathan', (select saldo::text from public.v_retiradas_socios where nome='Nathan'), '974.73');
select pg_temp.eq('painel: faturamento / vendas / placas / upsell',
  (select (j->>'faturamento') || ' / ' || (j->>'vendas') || ' / ' || (j->>'placas_vendidas') || ' / ' || (j->>'taxa_upsell_pct')
     from (select public.painel_indicadores(date_trunc('month', private.hoje())::date, private.hoje()) j) s),
  '2089.90 / 2 / 3 / 100.0');

-- ===================== Cancelamentos =====================
\echo '== cancelamentos'
select pg_temp.t('cancela venda 2 (site, não paga)', $q$select public.cancelar_venda((select id from public.vendas where codigo='V-0002'), 'Cliente desistiu do site')$q$, false);
select pg_temp.eq('upsell de site volta para em negociação', (select upsell_site from public.projetos p join public.vendas v on v.id=p.venda_id where v.codigo='V-0001'), 'em_negociacao');
select pg_temp.eq('lead continua Cliente (tem V-0001)', (select etapa from public.clientes where codigo='L-0001'), 'cliente');
select pg_temp.t('cancelar sem motivo', $q$select public.cancelar_venda((select id from public.vendas where codigo='V-0001'), ' ')$q$, true);
select pg_temp.t('cancela venda 1 (parcela 1 paga)', $q$select public.cancelar_venda((select id from public.vendas where codigo='V-0001'), 'Fechou o negócio')$q$, false);
select pg_temp.eq('placa instalada vira perdida', (select status from public.placas where codigo='AP-0001'), 'perdida');
select pg_temp.eq('placas não instaladas voltam', (select string_agg(status, ',' order by codigo) from public.placas where codigo in ('AP-0002','AP-0010')), 'disponivel,disponivel');
select pg_temp.eq('estorno do que foi pago', (select valor::text from public.lancamentos where categoria='estorno'), '196.63');
select pg_temp.eq('parcelas abertas + taxa canceladas', (select count(*)::text from public.lancamentos where venda_id=(select id from public.vendas where codigo='V-0001') and cancelado_em is not null), '3');
select pg_temp.eq('lead volta para Negociação', (select etapa from public.clientes where codigo='L-0001'), 'negociacao');
select pg_temp.eq('lucro líquido sem as vendas canceladas', (select lucro_liquido::text from public.v_resultado_mensal where mes = date_trunc('month', private.hoje())::date), '-50.00');
reset role;
set role anon;
select pg_temp.eq('placa de venda cancelada para de redirecionar', public.registrar_toque(:'tk1'), null);
reset role;
set role authenticated;
select pg_temp.joao();
select pg_temp.t('rascunho 3: 2 placas', $q$insert into public.vendas (cliente_id) select id from public.clientes where nome='Barbearia Dom';
  insert into public.venda_itens (venda_id, produto_id, quantidade) select (select id from public.vendas where codigo='V-0003'), id, 2 from public.produtos where categoria='placa'$q$, false);
select pg_temp.t('apagar rascunho', $q$delete from public.vendas where id=(select id from public.vendas where codigo='V-0003')$q$, false);
select pg_temp.eq('rascunho apagado devolve placas', (select count(*)::text from public.placas where status='reservada'), '0');

-- ===================== Intruso logado =====================
\echo '== intruso'
select pg_temp.intruso();
select pg_temp.eq('intruso vê zero linhas', (select (select count(*) from public.clientes) + (select count(*) from public.lancamentos) + (select count(*) from public.placas) + (select count(*) from public.v_vendas) + (select count(*) from public.auditoria))::text, '0');
select pg_temp.t('intruso cria lead', $q$insert into public.clientes (nome, cidade) values ('hack', 'x')$q$, true);
select pg_temp.t('intruso vira membro', $q$insert into public.membros (user_id, nome) values ('33333333-3333-3333-3333-333333333333', 'eu')$q$, true);
select pg_temp.t('intruso registra lote', $q$select public.registrar_lote('x', 1, 1)$q$, true);
select pg_temp.t('intruso importa leads', $q$select public.importar_leads('[]'::jsonb)$q$, true);
select pg_temp.t('intruso chama função privada', $q$select private.sincronizar_reservas(gen_random_uuid())$q$, true);
select pg_temp.joao();
select pg_temp.t('sócio apaga auditoria', 'delete from public.auditoria', true);
select pg_temp.t('sócio se promove', $q$update public.membros set papel='admin'$q$, true);
reset role;
select pg_temp.eq('auditoria registrou escritas', (select (count(*) > 50)::text from public.auditoria), 'true');
