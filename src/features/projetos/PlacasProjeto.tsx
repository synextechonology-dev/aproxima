import { useState } from 'react';
import { CheckCircle, PencilSimpleLine } from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { Secao } from '@/components/layout';
import { Selo } from '@/components/selo';
import { Confirmar } from '@/components/Confirmar';
import { formatarDataHora } from '@/lib/formato';
import { seloPlaca } from '@/features/estoque/status';
import { GravarLink } from '@/features/estoque/GravarLink';
import { useAjustarPlaca, type PlacaV } from '@/features/estoque/dados';
import type { DadosProjeto } from './dados';

export function PlacasProjeto({ d, editavel }: { d: DadosProjeto; editavel: boolean }) {
  const [gravar, setGravar] = useState<PlacaV | null>(null);
  const [instalar, setInstalar] = useState<PlacaV | null>(null);
  const ajustar = useAjustarPlaca();
  if (!d.placas.length) return null;
  return (
    <Secao titulo="Placas">
      <ul className="flex flex-col divide-y divide-divider">
        {d.placas.map((p) => {
          const s = seloPlaca(p.status);
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="num font-medium">{p.codigo}</span>
              <Selo icone={s.icone} texto={s.texto} tom={s.tom} />
              <span className="text-sm text-text-muted">{p.gravada_em ? `gravada ${formatarDataHora(p.gravada_em)}` : 'não gravada'}</span>
              {editavel ? (
                <span className="ml-auto flex gap-1">
                  <Botao variante="fantasma" onClick={() => setGravar(p)}>
                    <PencilSimpleLine size={16} aria-hidden />
                    Gravar link
                  </Botao>
                  {p.status === 'vendida' ? (
                    <Botao variante="fantasma" onClick={() => setInstalar(p)}>
                      <CheckCircle size={16} aria-hidden />
                      Marcar instalada
                    </Botao>
                  ) : null}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      <GravarLink aberto={!!gravar} aoMudar={(v) => !v && setGravar(null)} placaInicial={gravar} sugestaoDestino={d.cliente.google_url} />
      <Confirmar
        aberto={!!instalar}
        aoMudar={(v) => !v && setInstalar(null)}
        titulo={`Marcar ${instalar?.codigo} como instalada?`}
        texto={`A placa passa a contar como instalada em ${d.cliente.nome}.`}
        botao="Marcar instalada"
        carregando={ajustar.isPending}
        aoConfirmar={async () => {
          if (!instalar?.id) return;
          const ok = await ajustar.mutateAsync({ p_placa_id: instalar.id, p_novo_status: 'instalada' }).catch(() => null);
          if (ok) setInstalar(null);
        }}
      />
    </Secao>
  );
}
