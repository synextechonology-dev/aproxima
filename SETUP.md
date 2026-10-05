# Checklist de publicação (fazer uma vez, nesta ordem)

## 1. Domínio (antes de gravar qualquer placa)
- [ ] Comprar o domínio próprio (ex.: no Registro.br) e **ligar a renovação automática**.
      O endereço `https://<domínio>/p/<token>` fica gravado no chip para sempre: se o domínio vencer ou
      mudar, todas as placas instaladas param de funcionar. Nunca gravar placa com `*.vercel.app`.

## 2. Supabase
- [x] Projeto `aproxima` criado (região Canadá, ca-central-1: escolha consciente; não muda depois).
- [x] Banco instalado em 05/10/2026 pelo conector e conferido com a versão testada. **Não rodar de novo.**
      (Não rode nada de `supabase/tests/` no projeto real.)
- [ ] Authentication → Sign In / Providers → Email: **desligar "Allow new users to sign up"**.
- [ ] Authentication → Users → **Invite user** para João e Nathan.
- [ ] Depois que os dois aceitarem, no SQL Editor:
  ```sql
  insert into public.membros (user_id, nome, papel)
  select id, 'João', 'admin' from auth.users where email = 'EMAIL_DO_JOAO';
  insert into public.membros (user_id, nome, papel)
  select id, 'Nathan', 'socio' from auth.users where email = 'EMAIL_DO_NATHAN';
  ```
- [ ] Authentication → Multi-Factor: habilitar TOTP e ativar nos dois usuários.
- [ ] Senha mínima de 12 caracteres.
- [ ] Project Settings → Data API: expor **só** `public` (e `graphql_public`). O schema `private` não pode aparecer.
- [x] Advisors rodados em 05/10/2026: nenhum erro. Avisos esperados: funções RPC com permissão elevada
      (cada uma confere se quem chama é sócio) e `registrar_toque` pública (é o link da placa).
- [ ] Authentication → URL Configuration: Site URL e Redirect URLs = `https://<domínio>`.
- [ ] **Plano:** o gratuito pausa o projeto depois de cerca de uma semana sem uso
      ([documentação](https://supabase.com/docs/guides/platform/free-project-pausing)). Com placa pausada, o
      cliente toca e cai na página "Placa não configurada". Antes de instalar a primeira placa num cliente,
      passar para o plano pago (ou, no mínimo, garantir uso diário do app).
- [ ] Backup: o plano gratuito não tem restauração para um ponto no tempo. Agendar um `pg_dump` semanal até ter plano pago.

## 3. GitHub
- [ ] Repositório **privado**. Conferir que `.env` não foi commitado (só `.env.example`).

## 4. Vercel
- [ ] Importar o repositório.
- [ ] Settings → Environment Variables: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
      A `service_role` **nunca** vai para a Vercel.
- [ ] Settings → Domains: ligar o domínio próprio.
- [ ] Testar: abrir `https://<domínio>/p/00000000000000` → deve mostrar "Placa não configurada".
- [ ] Reenviar os convites do Supabase depois que a URL estiver configurada.

## 5. Primeira placa (teste completo)
- [ ] Registrar um lote, criar um lead de teste, vender 1 placa, confirmar.
- [ ] No Estoque, cadastrar o link de avaliação do Google como destino e gravar `https://<domínio>/p/<token>` no chip.
- [ ] Tocar com Android e iPhone: deve abrir a avaliação, e o toque aparece no Projeto.
- [ ] Cancelar a venda de teste (o estoque e o financeiro voltam sozinhos).

## Toda alteração de banco depois disso
Nova migration em `supabase/migrations/`, testes passando em `supabase/tests/rodar_testes.sh`, e só então
rodar no SQL Editor. A Vercel não mexe no banco.
