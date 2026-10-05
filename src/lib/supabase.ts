import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const configuracaoAusente = !url || !chave;

// Só a URL e a chave pública entram no front. A segurança está no banco (RLS + grants).
export const supabase = createClient<Database>(url ?? 'http://localhost', chave ?? 'ausente', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
