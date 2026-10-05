import { ArrowsClockwise, LinkBreak, Link as LinkIcone, PencilSimpleLine } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { Lateral } from '@/components/ui/dialogo';
import { Botao } from '@/components/ui/botao';
import { Selo } from '@/components/selo';
import { Dados } from '@/components/layout';
import { Carregando, ErroCarga } from '@/components/estados';
import { useNomeMembro } from '@/hooks/useBase';
import { ROTULO_STATUS_PLACA, AJUSTES_PLACA, rotulo, type StatusPlaca } from '@/lib/rotulos';
import { formatarDataHora, formatarMoeda, formatarNumero } from '@/lib/formato';
import { seloPlaca } from './status';
import { useAtualizarPlaca, useMovimentacoes, type PlacaV } from './dados';

export function FichaPlaca({
  placa,
  aoFechar,
  aoGravar,
  aoAjustar,
}: {
  placa: PlacaV | null;
  aoFechar: () => void;
  aoGravar: (p: PlacaV) => void;
  aoAjustar: (p: PlacaV) => void;
}) {
  const mov = useMovimentacoes(placa?.id ?? null);
  const atualizar = useAtualizarPlaca();
  const nome = useNomeMembro();
  if (!placa) return null;
  const s = seloPlaca(placa.status);
  const podeAjustar = !!AJUSTES_PLACA[placa.status as StatusPlaca]?.length;

  return (
    <Lateral
      aberto
      aoMudar={(v) => !v && aoFechar()}
      titulo={placa.codigo ?? 'Placa'}
      descricao={`Lote ${placa.lote_codigo ?? '—'} · custo ${formatarMoeda(placa.custo)}`}
      rodape={
        <>
          {podeAjustar ? (
            <Botao className="flex-1" onClick={() => aoAjustar(placa)}>
              <ArrowsClockwise size={18} aria-hidden />
              Ajustar status
            </Botao>
          ) : null}
          <Botao variante="principal" className="flex-1" onClick={() => aoGravar(placa)}>
            <PencilSimpleLine size={18} aria-hidden />
            Gravar link
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <Selo icone={s.icone} texto={s.texto} tom={s.tom} className="self-start" />
        <Dados
          itens={[
            ['Cliente', placa.cliente_nome ? `${placa.cliente_nome}${placa.cliente_cidade ? ` · ${placa.cliente_cidade}` : ''}` : null],
            ['Venda', placa.venda_codigo ? <Link className="text-accent-text underline" to={`/vendas/${placa.venda_id}`}>{placa.venda_codigo}</Link> : null],
            ['Com quem', placa.status === 'demonstracao' ? placa.responsavel_nome : null],
            ['Destino', placa.destino_url ? <span className="break-all">{placa.destino_url}</span> : 'Sem destino'],
            ['Link', placa.ativo ? 'Ativo' : 'Desativado'],
            ['Gravada em', placa.gravada_em ? formatarDataHora(placa.gravada_em, true) : 'Ainda não gravada'],
            ['Instalada em', placa.instalada_em ? formatarDataHora(placa.instalada_em) : null],
            ['Toques', `${formatarNumero(placa.toques_total)} no total · ${formatarNumero(placa.toques_30d)} nos últimos 30 dias`],
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Botao onClick={() => atualizar.mutate({ id: placa.id!, dados: { ativo: !placa.ativo } })} carregando={atualizar.isPending}>
            {placa.ativo ? <LinkBreak size={18} aria-hidden /> : <LinkIcone size={18} aria-hidden />}
            {placa.ativo ? 'Desativar link' : 'Ativar link'}
          </Botao>
          {placa.gravada_em ? (
            <Botao variante="fantasma" onClick={() => atualizar.mutate({ id: placa.id!, dados: { gravada_em: null } })}>
              Desmarcar gravação
            </Botao>
          ) : null}
        </div>

        <section className="flex flex-col gap-3">
          <h3 className="font-medium">Movimentações</h3>
          {mov.isLoading ? (
            <Carregando linhas={2} />
          ) : mov.isError ? (
            <ErroCarga erro={mov.error} tentarDeNovo={() => void mov.refetch()} />
          ) : !mov.data?.length ? (
            <p className="text-sm text-text-muted">Sem movimentações.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {mov.data.map((m) => (
                <li key={m.id} className="flex flex-col gap-0.5 text-md">
                  <span>
                    {m.status_de ? `${rotulo(ROTULO_STATUS_PLACA, m.status_de)} → ` : ''}
                    {rotulo(ROTULO_STATUS_PLACA, m.status_para)}
                  </span>
                  <span className="text-sm text-text-muted">
                    {formatarDataHora(m.ocorreu_em, true)}
                    {m.created_by ? ` · ${nome(m.created_by)}` : ''}
                    {m.motivo ? ` · ${m.motivo}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Lateral>
  );
}
