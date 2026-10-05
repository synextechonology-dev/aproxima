import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { WarningCircle, WhatsappLogo } from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { AreaTexto, Campo, Entrada, Selecao } from '@/components/ui/campos';
import { AcaoFixa, Cabecalho, EspacoAcaoFixa, Secao } from '@/components/layout';
import { abrirExterno, linkWhatsApp } from '@/lib/contato';
import { textoResultado } from './textoResultado';
import { Carregando, ErroCarga } from '@/components/estados';
import { useMembrosAtivos } from '@/hooks/useBase';
import { ROTULO_STATUS_PROJETO, type StatusProjeto } from '@/lib/rotulos';
import { formatarData } from '@/lib/formato';
import { cn } from '@/lib/utils';
import { ICONE_STATUS_PROJETO } from './status';
import { useAtualizarProjeto, useProjeto, type DadosProjeto } from './dados';
import { BlocoResultado } from './BlocoResultado';
import { Checklist } from './Checklist';
import { Pendencias } from './Pendencias';
import { Revisoes } from './Revisoes';
import { Upsell } from './Upsell';
import { PlacasProjeto } from './PlacasProjeto';

const STATUS_MANUAIS: StatusProjeto[] = ['a_entregar', 'em_andamento', 'aguardando_cliente', 'entregue'];

function Andamento({ d, editavel }: { d: DadosProjeto; editavel: boolean }) {
  const atualizar = useAtualizarProjeto(d.projeto.id);
  const { data: membros } = useMembrosAtivos();
  const p = d.projeto;
  const [obs, setObs] = useState(p.observacoes ?? '');
  return (
    <Secao>
      <div role="radiogroup" aria-label="Status do projeto" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {STATUS_MANUAIS.map((s) => {
          const Icone = ICONE_STATUS_PROJETO[s];
          const ativo = p.status === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={ativo}
              disabled={!editavel || atualizar.isPending}
              onClick={() => !ativo && atualizar.mutate({ status: s })}
              className={cn(
                'flex min-h-(--tap-min) items-center justify-center gap-2 rounded-md border px-3 text-sm disabled:cursor-not-allowed',
                ativo ? (s === 'entregue' ? 'border-ok-fg bg-ok-bg text-ok-fg' : 'border-accent bg-accent-soft text-accent-text') : 'border-divider',
              )}
            >
              <Icone size={18} aria-hidden />
              {ROTULO_STATUS_PROJETO[s]}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Campo rotulo="Prazo">
          <Entrada
            key={p.prazo ?? 'sem'}
            type="date"
            disabled={!editavel}
            defaultValue={p.prazo ?? ''}
            onBlur={(e) => {
              const v = e.target.value || null;
              if (v !== p.prazo) atualizar.mutate({ prazo: v });
            }}
          />
        </Campo>
        <Campo rotulo="Responsável">
          <Selecao value={p.responsavel_id ?? ''} disabled={!editavel} onChange={(e) => atualizar.mutate({ responsavel_id: e.target.value || null })}>
            <option value="">Ninguém</option>
            {membros?.map((m) => (
              <option key={m.user_id} value={m.user_id}>{m.nome}</option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Observações do projeto" className="md:col-span-2" erro={obs.length > 4000 ? 'Até 4000 caracteres' : undefined}>
          <AreaTexto rows={2} disabled={!editavel} value={obs} onChange={(e) => setObs(e.target.value)} />
        </Campo>
      </div>
      {editavel && obs.trim() !== (p.observacoes ?? '') ? (
        <div>
          <Botao onClick={() => atualizar.mutate({ observacoes: obs.trim() || null })} carregando={atualizar.isPending}>
            Salvar observações
          </Botao>
        </div>
      ) : null}
    </Secao>
  );
}

export default function PaginaProjeto() {
  const { id = '' } = useParams();
  const q = useProjeto(id);
  if (q.isLoading) return <Carregando linhas={6} />;
  if (q.isError) return <ErroCarga erro={q.error} tentarDeNovo={() => void q.refetch()} />;
  const d = q.data!;
  const cancelado = d.projeto.status === 'cancelado';
  const editavel = !cancelado;

  return (
    <>
      <Cabecalho
        antes={
          <span className="text-sm text-text-muted">
            <Link to="/projetos" className="hover:underline">Projetos</Link> /{' '}
            <Link to={`/vendas/${d.venda.id}`} className="hover:underline">{d.venda.codigo}</Link> · vendido em {formatarData(d.venda.data_venda)}
            {d.venda.vendedor_nome ? ` por ${d.venda.vendedor_nome}` : ''}
          </span>
        }
        titulo={d.cliente.nome}
        resumo={`${d.cliente.cidade} · ${d.venda.itens_resumo ?? ''}`}
      />
      {cancelado ? (
        <p role="status" className="flex items-center gap-2 rounded-md bg-atrasado-bg px-4 py-3 text-atrasado-fg">
          <WarningCircle size={18} aria-hidden />
          Projeto cancelado junto com a venda. Nada aqui pode ser alterado.
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Andamento d={d} editavel={editavel} />
          <BlocoResultado d={d} />
          <Checklist d={d} editavel={editavel} />
          <PlacasProjeto d={d} editavel={editavel} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Pendencias d={d} editavel={editavel} />
          <Upsell d={d} editavel={editavel} />
          <Revisoes d={d} editavel={editavel} />
        </div>
      </div>
      {d.resultado?.avaliacoes_atuais !== null && d.resultado?.avaliacoes_atuais !== undefined && d.cliente.telefone ? (
        <>
          <EspacoAcaoFixa />
          <AcaoFixa>
            <Botao variante="principal" tamanho="bloco" onClick={() => { const wa = linkWhatsApp(d.cliente.telefone, textoResultado(d)); if (wa) abrirExterno(wa); }}>
              <WhatsappLogo size={18} aria-hidden />
              Enviar resultado ao cliente
            </Botao>
          </AcaoFixa>
        </>
      ) : null}
    </>
  );
}
