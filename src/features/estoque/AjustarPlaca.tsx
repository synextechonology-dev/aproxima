import { useState } from 'react';
import { Check } from '@phosphor-icons/react';
import { Modal } from '@/components/ui/dialogo';
import { Botao } from '@/components/ui/botao';
import { AreaTexto, Campo, Selecao } from '@/components/ui/campos';
import { useEu, useMembrosAtivos } from '@/hooks/useBase';
import { AJUSTES_PLACA, ROTULO_STATUS_PLACA, type StatusPlaca } from '@/lib/rotulos';
import { useAjustarPlaca, type PlacaV } from './dados';

type Props = { placa: PlacaV | null; aoFechar: () => void };

export function AjustarPlaca(props: Props) {
  return props.placa ? <AjustarPlacaAberto {...props} placa={props.placa} /> : null;
}

function AjustarPlacaAberto({ placa, aoFechar }: { placa: PlacaV; aoFechar: () => void }) {
  const opcoes = AJUSTES_PLACA[placa.status as StatusPlaca] ?? [];
  const eu = useEu();
  const { data: membros } = useMembrosAtivos();
  const [novo, setNovo] = useState<StatusPlaca | ''>(opcoes[0] ?? '');
  const [motivo, setMotivo] = useState('');
  const [resp, setResp] = useState(eu?.user_id ?? '');
  const [erro, setErro] = useState<string>();
  const ajustar = useAjustarPlaca();

  const confirmar = async () => {
    if (!novo) return;
    if (novo !== 'instalada' && !motivo.trim()) {
      setErro('Informe o motivo do ajuste');
      return;
    }
    const ok = await ajustar
      .mutateAsync({
        p_placa_id: placa.id!,
        p_novo_status: novo,
        p_motivo: motivo.trim() || undefined,
        p_responsavel: novo === 'demonstracao' ? resp || undefined : undefined,
      })
      .catch(() => null);
    if (ok) aoFechar();
  };

  return (
    <Modal
      aberto
      aoMudar={(v) => !v && aoFechar()}
      titulo={`Ajustar ${placa.codigo}`}
      descricao={`Hoje: ${ROTULO_STATUS_PLACA[placa.status as StatusPlaca] ?? placa.status}`}
      rodape={
        <>
          <Botao onClick={aoFechar}>Voltar</Botao>
          <Botao variante="principal" onClick={() => void confirmar()} carregando={ajustar.isPending} disabled={!novo}>
            <Check size={18} aria-hidden />
            Confirmar ajuste
          </Botao>
        </>
      }
    >
      {opcoes.length ? (
        <div className="flex flex-col gap-4">
          <Campo rotulo="Novo status">
            <Selecao value={novo} onChange={(e) => setNovo(e.target.value as StatusPlaca)}>
              {opcoes.map((o) => (
                <option key={o} value={o}>
                  {ROTULO_STATUS_PLACA[o]}
                </option>
              ))}
            </Selecao>
          </Campo>
          {novo === 'demonstracao' ? (
            <Campo rotulo="Com quem fica">
              <Selecao value={resp} onChange={(e) => setResp(e.target.value)}>
                {membros?.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
          ) : null}
          <Campo rotulo="Motivo" obrigatorio={novo !== 'instalada'} erro={erro} dica={novo === 'instalada' ? 'Opcional para instalação.' : undefined}>
            <AreaTexto rows={3} maxLength={300} value={motivo} onChange={(e) => { setMotivo(e.target.value); setErro(undefined); }} />
          </Campo>
        </div>
      ) : (
        <p className="text-md text-text-muted">
          Uma placa {ROTULO_STATUS_PLACA[placa.status as StatusPlaca]?.toLowerCase()} não pode ser ajustada aqui. Reservas e vendas mudam pela venda.
        </p>
      )}
    </Modal>
  );
}
