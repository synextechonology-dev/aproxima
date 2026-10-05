import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Membro } from '@/lib/tipos';

export type EstadoAuth =
  | 'carregando'
  | 'sem-sessao' // tela de login
  | 'mfa' // senha certa, falta o código do app autenticador
  | 'mfa-cadastro' // conta sem verificação em duas etapas: precisa ativar
  | 'sem-acesso' // logou, mas não está em `membros`
  | 'erro'
  | 'pronto';

export type ContextoAuth = {
  estado: EstadoAuth;
  sessao: Session | null;
  membro: Membro | null;
  erro: string | null;
  /** Reavalia o nível de verificação e o cadastro de membro (depois do código MFA). */
  reavaliar: () => Promise<void>;
  sair: () => Promise<void>;
};

export const AuthContexto = createContext<ContextoAuth | null>(null);

export function useAuth(): ContextoAuth {
  const c = useContext(AuthContexto);
  if (!c) throw new Error('useAuth fora do AuthProvider');
  return c;
}
