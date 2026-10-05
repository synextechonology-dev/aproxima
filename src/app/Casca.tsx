import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DotsThreeOutline, MagnifyingGlass, SignOut } from '@phosphor-icons/react';
import { useAuth } from './auth-contexto';
import { NAV_CELULAR, NAV_CONFIG, NAV_MAIS, NAV_PRINCIPAL, type ItemNav } from './navegacao';
import { BuscaGlobal } from './BuscaGlobal';
import { AlternarTema } from '@/components/AlternarTema';
import { Lateral } from '@/components/ui/dialogo';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

function usePendenciasHoje() {
  return useQuery({
    queryKey: ['painel-hoje', 'contagem'],
    queryFn: async () => {
      const { count, error } = await supabase.from('v_painel_hoje').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
  });
}

function LinkLateral({ item, selo }: { item: ItemNav; selo?: number }) {
  const Icone = item.icone;
  return (
    <NavLink
      to={item.caminho}
      end={item.caminho === '/'}
      className={({ isActive }) =>
        cn(
          'flex min-h-[36px] items-center gap-3 rounded-md px-3 text-md',
          isActive ? 'bg-surface text-text shadow-(--shadow-sm)' : 'text-neutral-400 hover:text-text',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icone size={20} weight={isActive ? 'fill' : 'regular'} aria-hidden />
          <span className="flex-1">{item.rotulo}</span>
          {selo ? (
            <span className="num rounded-sm bg-accent-800 px-1.5 text-xs text-accent-100" aria-label={`${selo} itens para hoje`}>
              {selo}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

function BarraLateral({ abrirBusca }: { abrirBusca: () => void }) {
  const { membro, sair } = useAuth();
  const { data: hoje } = usePendenciasHoje();
  return (
    <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col gap-4 border-r border-divider px-3 py-6 md:flex">
      <div className="flex items-center gap-2 px-3">
        <img src="/icone.svg" alt="" className="size-[28px]" />
        <span className="text-lg font-medium">Aproxima</span>
      </div>
      <button
        type="button"
        onClick={abrirBusca}
        className="flex min-h-[36px] items-center gap-2 rounded-md border border-divider px-3 text-sm text-text-muted hover:border-neutral-600"
      >
        <MagnifyingGlass size={16} aria-hidden />
        <span className="flex-1 truncate text-left">Buscar</span>
        <kbd className="text-xs">Ctrl K</kbd>
      </button>
      <nav aria-label="Áreas" className="flex flex-col gap-1">
        {NAV_PRINCIPAL.map((i) => (
          <LinkLateral key={i.caminho} item={i} selo={i.caminho === '/' ? hoje : undefined} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-1">
        <LinkLateral item={NAV_CONFIG} />
        <AlternarTema comTexto />
        <div className="mt-2 flex items-center gap-3 border-t border-divider px-3 pt-4">
          <span className="flex size-[32px] items-center justify-center rounded-full bg-accent-800 text-sm text-accent-100" aria-hidden>
            {membro?.nome.slice(0, 1).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-md">{membro?.nome}</span>
            <span className="text-xs text-text-muted">{membro?.papel === 'admin' ? 'administrador' : 'sócio'}</span>
          </div>
          <button
            type="button"
            onClick={() => void sair()}
            aria-label="Sair"
            className="inline-flex size-[36px] items-center justify-center rounded-md text-text-muted hover:text-text"
          >
            <SignOut size={18} aria-hidden />
          </button>
        </div>
      </div>
    </aside>
  );
}

function BarraInferior({ abrirMais, maisAtivo }: { abrirMais: () => void; maisAtivo: boolean }) {
  const classe = (ativo: boolean) =>
    cn('flex flex-1 flex-col items-center justify-center gap-0.5 text-xs min-h-(--tap-min)', ativo ? 'text-accent' : 'text-neutral-500');
  return (
    <nav
      aria-label="Áreas"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 flex border-t border-divider bg-bg md:hidden"
      style={{ height: 'calc(var(--tabbar-height) + env(safe-area-inset-bottom))' }}
    >
      {NAV_CELULAR.map((i) => {
        const Icone = i.icone;
        return (
          <NavLink key={i.caminho} to={i.caminho} end={i.caminho === '/'} className={({ isActive }) => classe(isActive)}>
            {({ isActive }) => (
              <>
                <Icone size={24} weight={isActive ? 'fill' : 'regular'} aria-hidden />
                {i.rotulo}
              </>
            )}
          </NavLink>
        );
      })}
      <button type="button" onClick={abrirMais} className={classe(maisAtivo)} aria-haspopup="dialog">
        <DotsThreeOutline size={24} weight={maisAtivo ? 'fill' : 'regular'} aria-hidden />
        Mais
      </button>
    </nav>
  );
}

function MenuMais({ aberto, aoMudar }: { aberto: boolean; aoMudar: (v: boolean) => void }) {
  const { membro, sair } = useAuth();
  return (
    <Lateral aberto={aberto} aoMudar={aoMudar} titulo="Mais" descricao={membro ? `Conectado como ${membro.nome}` : undefined}>
      <nav aria-label="Mais áreas" className="flex flex-col gap-1">
        {NAV_MAIS.map((i) => {
          const Icone = i.icone;
          return (
            <NavLink
              key={i.caminho}
              to={i.caminho}
              onClick={() => aoMudar(false)}
              className={({ isActive }) =>
                cn('flex min-h-(--tap-min) items-center gap-3 rounded-md px-3 text-lg', isActive ? 'bg-accent-soft text-accent-text' : '')
              }
            >
              <Icone size={22} aria-hidden />
              {i.rotulo}
            </NavLink>
          );
        })}
        <AlternarTema comTexto className="text-lg text-text" />
        <button type="button" onClick={() => void sair()} className="flex min-h-(--tap-min) items-center gap-3 rounded-md px-3 text-lg">
          <SignOut size={22} aria-hidden />
          Sair
        </button>
      </nav>
    </Lateral>
  );
}

export function Casca() {
  const [busca, setBusca] = useState(false);
  const [mais, setMais] = useState(false);
  const local = useLocation();
  const maisAtivo = NAV_MAIS.some((i) => local.pathname.startsWith(i.caminho));

  // Ctrl+K / ⌘K abre a busca global
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBusca(true);
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  return (
    <div className="flex min-h-dvh">
      <BarraLateral abrirBusca={() => setBusca(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topo do celular: marca + busca */}
        <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-divider bg-bg px-4 py-1 md:hidden">
          <img src="/icone.svg" alt="" className="size-[24px]" />
          <span className="flex-1 font-medium">Aproxima</span>
          <button
            type="button"
            onClick={() => setBusca(true)}
            aria-label="Buscar nome, telefone ou código"
            className="tap inline-flex items-center justify-center rounded-md text-text-muted"
          >
            <MagnifyingGlass size={22} aria-hidden />
          </button>
        </div>
        <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 pt-4 pb-[calc(var(--tabbar-height)+32px)] md:px-8 md:pt-8 md:pb-12">
          <Outlet />
        </main>
      </div>
      <BarraInferior abrirMais={() => setMais(true)} maisAtivo={maisAtivo} />
      <MenuMais aberto={mais} aoMudar={setMais} />
      <BuscaGlobal aberto={busca} aoMudar={setBusca} />
    </div>
  );
}
