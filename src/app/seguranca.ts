/**
 * TEMPORÁRIO: verificação em duas etapas (código TOTP) desligada para os primeiros testes.
 * Com `false`, o login pede só e-mail e senha; o acesso aos dados continua protegido pelo
 * banco (RLS: só quem está em `membros` lê ou grava).
 *
 * RELIGAR (`true`) ANTES DE PUBLICAR o app para uso real. Ver RELATORIO.md.
 */
export const EXIGIR_MFA = false;
