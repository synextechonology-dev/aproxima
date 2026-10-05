import { useMemo, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { Modal } from '@/components/ui/dialogo';
import { Entrada } from '@/components/ui/campos';
import { Carregando } from '@/components/estados';
import { useLeads } from '@/features/prospeccao/dados';
import { normalizar } from '@/lib/utils';

type Props = { aberto: boolean; aoMudar: (v: boolean) => void; aoEscolher: (id: string) => void };

export function TrocarCliente(props: Props) {
  return props.aberto ? <TrocarClienteAberto {...props} /> : null;
}

function TrocarClienteAberto({ aberto, aoMudar, aoEscolher }: Props) {
  const leads = useLeads();
  const [busca, setBusca] = useState('');
  const lista = useMemo(() => {
    const t = normalizar(busca);
    return (leads.data ?? []).filter((c) => c.etapa !== 'descartado' && (!t || normalizar(`${c.nome} ${c.codigo} ${c.cidade}`).includes(t))).slice(0, 30);
  }, [leads.data, busca]);
  return (
    <Modal aberto={aberto} aoMudar={aoMudar} titulo="Trocar cliente" descricao="As placas reservadas acompanham o novo cliente.">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
          <Entrada autoFocus type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, código ou cidade" aria-label="Buscar cliente" className="pl-[36px]" />
        </div>
        {leads.isLoading ? (
          <Carregando linhas={3} />
        ) : (
          <ul className="flex flex-col gap-1">
            {lista.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => aoEscolher(c.id)} className="flex min-h-(--tap-min) w-full flex-col rounded-md px-3 py-2 text-left hover:bg-accent-soft">
                  <span>{c.nome}</span>
                  <span className="text-sm text-text-muted">{c.codigo} · {c.cidade}</span>
                </button>
              </li>
            ))}
            {!lista.length ? <li className="text-md text-text-muted">Nenhum lead encontrado.</li> : null}
          </ul>
        )}
      </div>
    </Modal>
  );
}
