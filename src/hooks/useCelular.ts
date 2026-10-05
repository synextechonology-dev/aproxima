import { useSyncExternalStore } from 'react';

const consulta = '(max-width: 767px)';

function assinar(cb: () => void) {
  const mq = window.matchMedia(consulta);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** true na largura de celular (abaixo de 768px). */
export function useCelular(): boolean {
  return useSyncExternalStore(assinar, () => window.matchMedia(consulta).matches, () => false);
}
