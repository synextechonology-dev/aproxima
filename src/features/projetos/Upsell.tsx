import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Browser, GoogleLogo, Receipt, type Icon } from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { Campo, Entrada, Selecao } from '@/components/ui/campos';
import { Secao } from '@/components/layout';
import { useProdutos } from '@/hooks/useBase';
import { ROTULO_UPSELL, STATUS_UPSELL, type StatusUpsell } from '@/lib/rotulos';
import { formatarMoeda } from '@/lib/formato';
import { useAtualizarProjeto, type DadosProjeto } from './dados';

function Linha({
  rotulo,
  icone: Icone,
  valor,
  preco,
  editavel,
  aoMudar,
  aoVender,
}: {
  rotulo: string;
  icone: Icon;
  valor: StatusUpsell;
  preco: number | null;
  editavel: boolean;
  aoMudar: (v: StatusUpsell) => void;
  aoVender: () => void;
}) {
  const vendido = valor === 'vendido';
  return (
    <div className="flex flex-col gap-2 rounded-md bg-bg p-3">
      <div className="flex items-center gap-2">
        <Icone size={18} aria-hidden />
        <span className="flex-1 font-medium">{rotulo}</span>
        {preco !== null ? <span className="num text-sm text-text-muted">{formatarMoeda(preco)}</span> : null}
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-end">
        <Campo rotulo="Situação" className="md:flex-1">
          <Selecao value={valor} disabled={!editavel || vendido} onChange={(e) => aoMudar(e.target.value as StatusUpsell)}>
            {/* "Vendido" é automático: aparece só quando a venda do serviço é confirmada */}
            {STATUS_UPSELL.filter((s) => s !== 'vendido' || vendido).map((s) => (
              <option key={s} value={s}>{ROTULO_UPSELL[s]}</option>
            ))}
          </Selecao>
        </Campo>
        {!vendido && editavel ? (
          <Botao variante="principal" onClick={aoVender}>
            <Receipt size={18} aria-hidden />
            Registrar venda {rotulo === 'Site' ? 'do site' : 'da otimização'}
          </Botao>
        ) : null}
      </div>
    </div>
  );
}

export function Upsell({ d, editavel }: { d: DadosProjeto; editavel: boolean }) {
  const navegar = useNavigate();
  const atualizar = useAtualizarProjeto(d.projeto.id);
  const { data: produtos } = useProdutos();
  const p = d.projeto;
  const [motivo, setMotivo] = useState(p.upsell_motivo_recusa ?? '');
  const preco = (cat: string) => {
    const x = produtos?.find((y) => y.categoria === cat && y.ativo);
    return x ? Number(x.preco_padrao) : null;
  };
  const recusou = p.upsell_site === 'recusou' || p.upsell_google === 'recusou';
  const vender = (cat: string) => navegar(`/vendas/nova?cliente=${p.cliente_id}&produto=${cat}`);

  return (
    <Secao titulo="Upsell">
      <Linha rotulo="Site" icone={Browser} valor={p.upsell_site as StatusUpsell} preco={preco('site')} editavel={editavel} aoMudar={(v) => atualizar.mutate({ upsell_site: v })} aoVender={() => vender('site')} />
      <Linha
        rotulo="Otimização do Google"
        icone={GoogleLogo}
        valor={p.upsell_google as StatusUpsell}
        preco={preco('otimizacao_google')}
        editavel={editavel}
        aoMudar={(v) => atualizar.mutate({ upsell_google: v })}
        aoVender={() => vender('otimizacao_google')}
      />
      <Campo rotulo="Oferecer de novo em" dica="Aparece no Painel em “Pra fazer hoje” nesta data.">
        <Entrada key={p.upsell_oferecer_em ?? "vazio"} type="date" disabled={!editavel} defaultValue={p.upsell_oferecer_em ?? ''} onBlur={(e) => {
          const v = e.target.value || null;
          if (v !== p.upsell_oferecer_em) atualizar.mutate({ upsell_oferecer_em: v });
        }} />
      </Campo>
      {recusou ? (
        <Campo rotulo="Motivo da recusa" erro={motivo.length > 300 ? 'Até 300 caracteres' : undefined}>
          <Entrada
            disabled={!editavel}
            value={motivo}
            maxLength={300}
            onChange={(e) => setMotivo(e.target.value)}
            onBlur={() => {
              const v = motivo.trim() || null;
              if (v !== p.upsell_motivo_recusa) atualizar.mutate({ upsell_motivo_recusa: v });
            }}
          />
        </Campo>
      ) : null}
    </Secao>
  );
}
