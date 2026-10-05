import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { mensagemDeErro } from '@/lib/erros';
import type { Membro } from '@/lib/tipos';
import { AuthContexto, type EstadoAuth } from './auth-contexto';
import { ACESSO_TESTE, EXIGIR_MFA } from './seguranca';

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [estado, setEstado] = useState<EstadoAuth>('carregando');
  const [sessao, setSessao] = useState<Session | null>(null);
  const [membro, setMembro] = useState<Membro | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const avaliando = useRef(0);
  const entrouSozinho = useRef(false);

  const avaliar = useCallback(async (s: Session | null) => {
    const rodada = ++avaliando.current;
    const valer = () => rodada === avaliando.current;
    setSessao(s);
    if (!s) {
      setMembro(null);
      // Acesso de teste: entra sozinho, sem mostrar a tela de login (ver seguranca.ts)
      if (ACESSO_TESTE && !entrouSozinho.current) {
        entrouSozinho.current = true;
        setEstado('carregando');
        const { error } = await supabase.auth.signInWithPassword({ email: ACESSO_TESTE.email, password: ACESSO_TESTE.senha });
        if (error && valer()) {
          setErro(`Não foi possível entrar com o acesso de teste: ${mensagemDeErro(error)}`);
          setEstado('erro');
        }
        return; // com sucesso, o onAuthStateChange chama avaliar de novo com a sessão
      }
      setEstado('sem-sessao');
      return;
    }
    try {
      // Verificação em duas etapas (TOTP): exige nível aal2 (desligada por enquanto: ver seguranca.ts).
      if (EXIGIR_MFA) {
        const nivel = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (nivel.error) throw nivel.error;
        if (!valer()) return;
        const { currentLevel, nextLevel } = nivel.data;
        if (currentLevel !== 'aal2') {
          setMembro(null);
          setEstado(nextLevel === 'aal2' ? 'mfa' : 'mfa-cadastro');
          return;
        }
      }
      // Logou, mas precisa estar em `membros` (RLS devolve vazio para quem não é sócio).
      const { data, error } = await supabase.from('membros').select('*').eq('user_id', s.user.id).eq('ativo', true).maybeSingle();
      if (error) throw error;
      if (!valer()) return;
      if (!data) {
        setMembro(null);
        setEstado('sem-acesso');
        return;
      }
      setMembro(data);
      setEstado('pronto');
    } catch (e) {
      if (!valer()) return;
      setErro(mensagemDeErro(e));
      setEstado('erro');
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (ativo) void avaliar(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      // Renovação de token não muda quem está logado: só guarda a sessão nova.
      if (evento === 'TOKEN_REFRESHED') {
        setSessao(s);
        return;
      }
      // Fora do ciclo do callback, como pede a documentação do supabase-js.
      setTimeout(() => {
        if (ativo) void avaliar(s);
      }, 0);
    });
    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, [avaliar]);

  const reavaliar = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await avaliar(data.session);
  }, [avaliar]);

  const sair = useCallback(async () => {
    // No acesso de teste, sair só recomeça a sessão (não há tela de login)
    if (ACESSO_TESTE) entrouSozinho.current = false;
    await supabase.auth.signOut();
    qc.clear();
  }, [qc]);

  const valor = useMemo(
    () => ({ estado, sessao, membro, erro, reavaliar, sair }),
    [estado, sessao, membro, erro, reavaliar, sair],
  );
  return <AuthContexto.Provider value={valor}>{children}</AuthContexto.Provider>;
}
