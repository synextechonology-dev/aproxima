import { useState } from 'react';
import { Check } from '@phosphor-icons/react';
import { Modal } from '@/components/ui/dialogo';
import { Botao } from '@/components/ui/botao';
import { Campo, Entrada, Selecao } from '@/components/ui/campos';
import { FORMAS_LANCAMENTO, ROTULO_FORMA } from '@/lib/rotulos';
import { formatarMoeda, hojeSP } from '@/lib/formato';
import type { Lancamento } from '@/lib/tipos';
import { useRegistrarPagamento } from './dados';

export function MarcarPago({ lanc, aoFechar }: { lanc: Lancamento | null; aoFechar: () => void }) {
  return lanc ? <Aberto lanc={lanc} aoFechar={aoFechar} /> : null;
}

function Aberto({ lanc, aoFechar }: { lanc: Lancamento; aoFechar: () => void }) {
  const [data, setData] = useState(hojeSP());
  const [forma, setForma] = useState(lanc.forma_pagamento ?? 'pix');
  const pagar = useRegistrarPagamento();
  return (
    <Modal
      aberto
      aoMudar={(v) => !v && aoFechar()}
      titulo={lanc.tipo === 'receita' ? 'Registrar recebimento' : 'Registrar pagamento'}
      descricao={`${lanc.descricao} · ${formatarMoeda(lanc.valor)}`}
      rodape={
        <>
          <Botao onClick={aoFechar}>Voltar</Botao>
          <Botao
            variante="principal"
            disabled={!data}
            carregando={pagar.isPending}
            onClick={async () => {
              const ok = await pagar.mutateAsync({ id: lanc.id, pago_em: data, forma_pagamento: forma }).catch(() => null);
              if (ok) aoFechar();
            }}
          >
            <Check size={18} aria-hidden />
            {lanc.tipo === 'receita' ? 'Confirmar recebimento' : 'Confirmar pagamento'}
          </Botao>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Campo rotulo="Data">
          <Entrada type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Campo>
        <Campo rotulo="Forma">
          <Selecao value={forma} onChange={(e) => setForma(e.target.value)}>
            {FORMAS_LANCAMENTO.map((x) => (
              <option key={x} value={x}>{ROTULO_FORMA[x]}</option>
            ))}
          </Selecao>
        </Campo>
      </div>
    </Modal>
  );
}
