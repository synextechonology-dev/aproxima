/**
 * TEMPORÁRIO: verificação em duas etapas (código TOTP) desligada para os primeiros testes.
 * Com `false`, o login pede só e-mail e senha; o acesso aos dados continua protegido pelo
 * banco (RLS: só quem está em `membros` lê ou grava).
 *
 * RELIGAR (`true`) ANTES DE PUBLICAR o app para uso real. Ver RELATORIO.md.
 */
export const EXIGIR_MFA = false;

/**
 * TEMPORÁRIO: acesso de teste sem tela de login.
 * Quando a Vercel (ou o .env) tem VITE_ACESSO_TESTE_EMAIL e VITE_ACESSO_TESTE_SENHA, o app entra
 * sozinho nessa conta de teste e nunca mostra a tela de login. Sem essas variáveis, o login volta.
 * Os valores ficam visíveis para quem abrir o app publicado: use só uma conta de teste, nunca a de um sócio.
 * Para desligar: apague as duas variáveis na Vercel, faça um novo deploy e desative a conta em `membros`.
 */
export const ACESSO_TESTE = (() => {
  const email = import.meta.env.VITE_ACESSO_TESTE_EMAIL?.trim();
  const senha = import.meta.env.VITE_ACESSO_TESTE_SENHA;
  return email && senha ? { email, senha } : null;
})();
