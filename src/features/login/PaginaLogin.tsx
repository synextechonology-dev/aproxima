import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LockKey, ShieldCheck, SignOut, WarningCircle } from '@phosphor-icons/react';
import { useAuth } from '@/app/auth-contexto';
import { Botao } from '@/components/ui/botao';
import { Campo, Entrada } from '@/components/ui/campos';
import { Carregando } from '@/components/estados';
import { supabase, configuracaoAusente } from '@/lib/supabase';
import { mensagemDeErro } from '@/lib/erros';
import { AlternarTema } from '@/components/AlternarTema';

const esquemaLogin = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha'),
});
const esquemaCodigo = z.object({
  codigo: z.string().trim().regex(/^\d{6}$/, 'O código tem 6 números'),
});

function Moldura({ titulo, texto, children }: { titulo: string; texto?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icone.svg" alt="" className="size-[32px]" />
            <span className="text-lg font-medium">Aproxima</span>
          </div>
          <AlternarTema />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-medium">{titulo}</h1>
          {texto ? <p className="text-md text-text-muted">{texto}</p> : null}
        </div>
        {children}
      </div>
    </main>
  );
}

function ErroForm({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-md bg-atrasado-bg px-3 py-2 text-md text-atrasado-fg">
      <WarningCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
      {msg}
    </p>
  );
}

function FormLogin() {
  const [erro, setErro] = useState<string | null>(null);
  const f = useForm<z.infer<typeof esquemaLogin>>({ resolver: zodResolver(esquemaLogin) });
  const entrar = f.handleSubmit(async ({ email, senha }) => {
    setErro(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setErro(/invalid login credentials/i.test(error.message) ? 'E-mail ou senha incorretos' : mensagemDeErro(error));
    }
  });
  return (
    <Moldura titulo="Entrar" texto="Use o e-mail do convite que você recebeu.">
      {configuracaoAusente ? (
        <ErroForm msg="Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env." />
      ) : null}
      <form onSubmit={entrar} className="flex flex-col gap-4" noValidate>
        <Campo rotulo="E-mail" erro={f.formState.errors.email?.message}>
          <Entrada type="email" autoComplete="username" inputMode="email" autoFocus {...f.register('email')} />
        </Campo>
        <Campo rotulo="Senha" erro={f.formState.errors.senha?.message}>
          <Entrada type="password" autoComplete="current-password" {...f.register('senha')} />
        </Campo>
        <ErroForm msg={erro} />
        <Botao type="submit" variante="principal" tamanho="bloco" carregando={f.formState.isSubmitting}>
          <LockKey size={18} aria-hidden />
          Entrar
        </Botao>
      </form>
    </Moldura>
  );
}

function FormCodigo() {
  const { reavaliar, sair } = useAuth();
  const [erro, setErro] = useState<string | null>(null);
  const f = useForm<z.infer<typeof esquemaCodigo>>({ resolver: zodResolver(esquemaCodigo) });
  const verificar = f.handleSubmit(async ({ codigo }) => {
    setErro(null);
    const fatores = await supabase.auth.mfa.listFactors();
    const totp = fatores.data?.totp.find((x) => x.status === 'verified');
    if (fatores.error || !totp) {
      setErro(fatores.error ? mensagemDeErro(fatores.error) : 'Nenhum app autenticador ativo nesta conta.');
      return;
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code: codigo });
    if (error) {
      setErro(/invalid/i.test(error.message) ? 'Código incorreto ou vencido. Confira o app e tente de novo.' : mensagemDeErro(error));
      return;
    }
    await reavaliar();
  });
  return (
    <Moldura titulo="Código de verificação" texto="Abra o app autenticador e digite o código de 6 números do Aproxima.">
      <form onSubmit={verificar} className="flex flex-col gap-4" noValidate>
        <Campo rotulo="Código" erro={f.formState.errors.codigo?.message}>
          <Entrada inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus className="num text-center text-xl tracking-[0.4em]" {...f.register('codigo')} />
        </Campo>
        <ErroForm msg={erro} />
        <Botao type="submit" variante="principal" tamanho="bloco" carregando={f.formState.isSubmitting}>
          <ShieldCheck size={18} aria-hidden />
          Verificar código
        </Botao>
        <Botao variante="fantasma" onClick={() => void sair()}>
          Entrar com outra conta
        </Botao>
      </form>
    </Moldura>
  );
}

/** Primeiro acesso: ativa o app autenticador (TOTP) nesta conta. */
function CadastroMfa() {
  const { reavaliar, sair } = useAuth();
  const [fator, setFator] = useState<{ id: string; qr: string; segredo: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const f = useForm<z.infer<typeof esquemaCodigo>>({ resolver: zodResolver(esquemaCodigo) });

  useEffect(() => {
    let ativo = true;
    (async () => {
      // Remove tentativas anteriores não concluídas antes de gerar um QR novo.
      const lista = await supabase.auth.mfa.listFactors();
      for (const x of lista.data?.all ?? []) {
        if (x.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: x.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Aproxima ${Date.now()}` });
      if (!ativo) return;
      if (error) setErro(mensagemDeErro(error));
      else setFator({ id: data.id, qr: data.totp.qr_code, segredo: data.totp.secret });
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const confirmar = f.handleSubmit(async ({ codigo }) => {
    if (!fator) return;
    setErro(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fator.id, code: codigo });
    if (error) {
      setErro(/invalid/i.test(error.message) ? 'Código incorreto. Confira o app e tente de novo.' : mensagemDeErro(error));
      return;
    }
    await reavaliar();
  });

  return (
    <Moldura
      titulo="Ative a verificação em duas etapas"
      texto="Leia o QR code com um app autenticador (Google Authenticator, Microsoft Authenticator ou 1Password) e digite o código que aparecer."
    >
      {fator ? (
        <div className="flex flex-col items-center gap-3 rounded-lg bg-surface p-4 shadow-(--shadow-sm)">
          <img src={fator.qr} alt="QR code para o app autenticador" className="size-[192px] rounded-md bg-neutral-100 p-2" />
          <p className="text-xs text-text-muted">Sem câmera? Digite esta chave no app:</p>
          <code className="num break-all text-center text-sm select-all">{fator.segredo}</code>
        </div>
      ) : !erro ? (
        <Carregando linhas={2} rotulo="Gerando QR code" />
      ) : null}
      <form onSubmit={confirmar} className="flex flex-col gap-4" noValidate>
        <Campo rotulo="Código do app" erro={f.formState.errors.codigo?.message}>
          <Entrada inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="num text-center text-xl tracking-[0.4em]" {...f.register('codigo')} />
        </Campo>
        <ErroForm msg={erro} />
        <Botao type="submit" variante="principal" tamanho="bloco" carregando={f.formState.isSubmitting} disabled={!fator}>
          <ShieldCheck size={18} aria-hidden />
          Ativar e entrar
        </Botao>
        <Botao variante="fantasma" onClick={() => void sair()}>
          Sair
        </Botao>
      </form>
    </Moldura>
  );
}

function SemAcesso() {
  const { sair, sessao } = useAuth();
  return (
    <Moldura titulo="Sem acesso" texto={`A conta ${sessao?.user.email ?? ''} entrou, mas não está cadastrada como sócia do Aproxima. Peça para o administrador incluir você.`}>
      <Botao variante="principal" tamanho="bloco" onClick={() => void sair()}>
        <SignOut size={18} aria-hidden />
        Sair
      </Botao>
    </Moldura>
  );
}

function ErroAuth() {
  const { erro, reavaliar, sair } = useAuth();
  return (
    <Moldura titulo="Não foi possível entrar">
      <ErroForm msg={erro} />
      <Botao variante="principal" tamanho="bloco" onClick={() => void reavaliar()}>
        Tentar de novo
      </Botao>
      <Botao variante="fantasma" onClick={() => void sair()}>
        Sair
      </Botao>
    </Moldura>
  );
}

export default function PaginaLogin() {
  const { estado } = useAuth();
  const local = useLocation();
  const destino = (local.state as { de?: string } | null)?.de ?? '/';
  switch (estado) {
    case 'pronto':
      return <Navigate to={destino} replace />;
    case 'carregando':
      return (
        <main className="flex min-h-dvh items-center justify-center">
          <Carregando linhas={2} className="w-64" />
        </main>
      );
    case 'mfa':
      return <FormCodigo />;
    case 'mfa-cadastro':
      return <CadastroMfa />;
    case 'sem-acesso':
      return <SemAcesso />;
    case 'erro':
      return <ErroAuth />;
    default:
      return <FormLogin />;
  }
}
