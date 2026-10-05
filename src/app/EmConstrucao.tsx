import { Hammer } from '@phosphor-icons/react';
import { Vazio } from '@/components/estados';

// Temporário: some à medida que cada etapa é entregue.
export default function EmConstrucao({ area }: { area: string }) {
  return <Vazio icone={Hammer} titulo={area} texto="Esta área entra numa das próximas etapas." />;
}
