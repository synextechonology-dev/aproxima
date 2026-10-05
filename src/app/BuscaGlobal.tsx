import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as D from '@radix-ui/react-dialog';
import { Kanban, MagnifyingGlass, Package, Receipt, X } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { lista } from '@/lib/erros';
import { formatarData } from '@/lib/formato';
import { ROTULO_ETAPA, ROTULO_STATUS_PLACA, ROTULO_STATUS_VENDA, rotulo } from '@/lib/rotulos';
import { Carregando, ErroCarga } from '@/components/estados';

/** Tira caracteres que quebram o filtro `or()` do PostgREST. */
function limpar(t: string) {
  return t.replace(/[,()*%\\"'.:]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Telefone é guardado com máscara: "998124" vira "*9*9*8*1*2*4*" para casar com "(14) 99812-4471". */
function padraoTelefone(digitos: string) {
  return `*${digitos.split('').join('*')}*`;
}

type Resultado = { tipo: 'lead' | 'venda' | 'placa'; id: string; titulo: string; detalhe: string; ir: string };

async function buscar(termo: string): Promise<Resultado[]> {
  const t = limpar(termo);
  const digitos = termo.replace(/\D/g, '');
  const filtrosLead = [`nome.ilike.*${t}*`, `codigo.ilike.*${t}*`];
  if (digitos.length >= 4) filtrosLead.push(`telefone.ilike.${padraoTelefone(digitos)}`);

  const [leads, vendas, placas] = await Promise.all([
    supabase.from('clientes').select('id, codigo, nome, cidade, etapa').or(filtrosLead.join(',')).limit(8),
    supabase.from('v_vendas').select('id, codigo, cliente_nome, data_venda, status').or(`codigo.ilike.*${t}*,cliente_nome.ilike.*${t}*`).order('data_venda', { ascending: false }).limit(6),
    supabase.from('v_placas').select('id, codigo, status, cliente_nome').or(`codigo.ilike.*${t}*,cliente_nome.ilike.*${t}*`).limit(6),
  ]);
  return [
    ...lista(leads).map((l) => ({
      tipo: 'lead' as const,
      id: l.id,
      titulo: l.nome,
      detalhe: `${l.codigo ?? ''} · ${l.cidade} · ${rotulo(ROTULO_ETAPA, l.etapa)}`,
      ir: `/prospeccao?lead=${l.id}`,
    })),
    ...lista(vendas).map((v) => ({
      tipo: 'venda' as const,
      id: v.id ?? '',
      titulo: `${v.codigo} · ${v.cliente_nome ?? ''}`,
      detalhe: `${formatarData(v.data_venda)} · ${rotulo(ROTULO_STATUS_VENDA, v.status)}`,
      ir: `/vendas/${v.id}`,
    })),
    ...lista(placas).map((p) => ({
      tipo: 'placa' as const,
      id: p.id ?? '',
      titulo: p.codigo ?? '',
      detalhe: [rotulo(ROTULO_STATUS_PLACA, p.status), p.cliente_nome].filter(Boolean).join(' · '),
      ir: `/estoque?placa=${p.id}`,
    })),
  ];
}

const ICONES = { lead: Kanban, venda: Receipt, placa: Package };
const GRUPOS = { lead: 'Leads', venda: 'Vendas', placa: 'Placas' };

export function BuscaGlobal({ aberto, aoMudar }: { aberto: boolean; aoMudar: (v: boolean) => void }) {
  const [texto, setTexto] = useState('');
  const [termo, setTermo] = useState('');
  const navegar = useNavigate();

  useEffect(() => {
    const id = setTimeout(() => setTermo(texto.trim()), 250);
    return () => clearTimeout(id);
  }, [texto]);

  const habilitado = limpar(termo).length >= 2;
  const q = useQuery({ queryKey: ['busca', termo], queryFn: () => buscar(termo), enabled: aberto && habilitado });

  const ir = (r: Resultado) => {
    aoMudar(false);
    setTexto('');
    navegar(r.ir);
  };

  const grupos = (['lead', 'venda', 'placa'] as const)
    .map((g) => ({ g, itens: (q.data ?? []).filter((r) => r.tipo === g) }))
    .filter((x) => x.itens.length);

  return (
    <D.Root open={aberto} onOpenChange={aoMudar}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--color-bg)_70%,transparent)]" />
        <D.Content className="fixed inset-0 z-50 flex flex-col bg-surface shadow-(--shadow-lg) md:inset-auto md:left-1/2 md:top-[12vh] md:max-h-[70vh] md:w-[600px] md:-translate-x-1/2 md:rounded-lg">
          <D.Title className="sr-only">Buscar</D.Title>
          <D.Description className="sr-only">Busque por nome, telefone ou código L-, V- ou AP-.</D.Description>
          <div className="flex items-center gap-2 border-b border-divider px-4">
            <MagnifyingGlass size={20} className="text-text-muted" aria-hidden />
            <input
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Nome, telefone ou código (L-, V-, AP-)"
              aria-label="Buscar"
              className="min-h-[56px] flex-1 bg-transparent text-lg outline-none placeholder:text-text-muted"
            />
            <D.Close aria-label="Fechar" className="tap inline-flex items-center justify-center text-text-muted">
              <X size={20} />
            </D.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {!habilitado ? (
              <p className="px-3 py-6 text-center text-md text-text-muted">Digite ao menos 2 letras ou números.</p>
            ) : q.isLoading ? (
              <Carregando linhas={3} />
            ) : q.isError ? (
              <ErroCarga erro={q.error} tentarDeNovo={() => void q.refetch()} />
            ) : !grupos.length ? (
              <p className="px-3 py-6 text-center text-md text-text-muted">Nada encontrado para “{termo}”.</p>
            ) : (
              grupos.map(({ g, itens }) => {
                const Icone = ICONES[g];
                return (
                  <div key={g} className="mb-2">
                    <p className="px-3 py-1 text-xs text-text-muted">{GRUPOS[g]}</p>
                    <ul>
                      {itens.map((r) => (
                        <li key={`${r.tipo}-${r.id}`}>
                          <button
                            type="button"
                            onClick={() => ir(r)}
                            className="flex min-h-(--tap-min) w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent-soft focus-visible:bg-accent-soft"
                          >
                            <Icone size={20} className="shrink-0 text-text-muted" aria-hidden />
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate">{r.titulo}</span>
                              <span className="truncate text-sm text-text-muted">{r.detalhe}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
