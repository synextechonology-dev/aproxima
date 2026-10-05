import { useCallback, useSyncExternalStore } from 'react';

type Tema = 'dark' | 'light';
const CHAVE = 'aproxima:tema';
const ouvintes = new Set<() => void>();

function ler(): Tema {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** Tema escuro é o padrão; o claro fica lembrado no localStorage. */
export function useTema() {
  const tema = useSyncExternalStore(
    (cb) => {
      ouvintes.add(cb);
      return () => ouvintes.delete(cb);
    },
    ler,
    () => 'dark' as Tema,
  );
  const alternar = useCallback(() => {
    const novo: Tema = ler() === 'dark' ? 'light' : 'dark';
    if (novo === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(CHAVE, novo);
    } catch {
      // sem localStorage: vale só nesta aba
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim());
    ouvintes.forEach((cb) => cb());
  }, []);
  return { tema, alternar };
}
