import { useState } from 'react';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { Modal } from '@/components/ui/dialogo';
import { Botao } from '@/components/ui/botao';
import { Campo, Selecao } from '@/components/ui/campos';
import { Carregando } from '@/components/estados';
import { formatarMoeda } from '@/lib/formato';
import { usePlacasDisponiveis, useTrocarPlaca } from './dados';

type Props = { vendaId: string; atual: { id: string; codigo: string | null } | null; aoFechar: () => void };

export function TrocarPlaca(props: Props) {
  return props.atual ? <TrocarPlacaAberto {...props} atual={props.atual} /> : null;
}

function TrocarPlacaAberto({ vendaId, atual, aoFechar }: { vendaId: string; atual: { id: string; codigo: string | null }; aoFechar: () => void }) {
  const disp = usePlacasDisponiveis(true);
  const trocar = useTrocarPlaca(vendaId);
  const [nova, setNova] = useState('');
  return (
    <Modal
      aberto
      aoMudar={(v) => !v && aoFechar()}
      titulo={`Trocar ${atual.codigo}`}
      descricao="Escolha a placa disponível que vai no lugar. O custo da venda segue o lote da placa escolhida."
      rodape={
        <>
          <Botao onClick={aoFechar}>Voltar</Botao>
          <Botao
            variante="principal"
            disabled={!nova}
            carregando={trocar.isPending}
            onClick={async () => {
              const ok = await trocar.mutateAsync({ atual: atual.id, nova }).then(() => true).catch(() => false);
              if (ok) aoFechar();
            }}
          >
            <ArrowsClockwise size={18} aria-hidden />
            Trocar placa
          </Botao>
        </>
      }
    >
      {disp.isLoading ? (
        <Carregando linhas={2} />
      ) : !disp.data?.length ? (
        <p className="text-md text-text-muted">Nenhuma placa disponível para troca. Registre um lote no Estoque.</p>
      ) : (
        <Campo rotulo="Placa disponível">
          <Selecao value={nova} onChange={(e) => setNova(e.target.value)}>
            <option value="">Escolha</option>
            {disp.data.map((p) => (
              <option key={p.id} value={p.id ?? ''}>
                {p.codigo} · {p.lote_codigo} · custo {formatarMoeda(p.custo)}
              </option>
            ))}
          </Selecao>
        </Campo>
      )}
    </Modal>
  );
}
