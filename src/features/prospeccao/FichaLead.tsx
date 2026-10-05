import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowCounterClockwise,
  ArrowsLeftRight,
  ChatCircleText,
  DotsThreeOutline,
  GoogleLogo,
  PencilSimple,
  Phone,
  Receipt,
  Trash,
  WhatsappLogo,
  XCircle,
} from '@phosphor-icons/react';
import { Lateral } from '@/components/ui/dialogo';
import { Botao } from '@/components/ui/botao';
import { ConteudoMenu, GatilhoMenu, ItemMenu, Menu, SeparadorMenu } from '@/components/ui/menu';
import { Campo, Selecao } from '@/components/ui/campos';
import { Selo } from '@/components/selo';
import { Dados } from '@/components/layout';
import { Carregando, ErroCarga } from '@/components/estados';
import { NotaGoogle } from '@/components/NotaGoogle';
import { Confirmar } from '@/components/Confirmar';
import { useNomeMembro } from '@/hooks/useBase';
import type { Cliente, Interacao } from '@/lib/tipos';
import {
  ETAPAS_MANUAIS,
  MOTIVOS_DESCARTE,
  ROTULO_CANAL,
  ROTULO_ETAPA,
  ROTULO_MOTIVO_DESCARTE,
  ROTULO_ORIGEM,
  ROTULO_SEGMENTO,
  rotulo,
  type Canal,
  type Etapa,
} from '@/lib/rotulos';
import { formatarDataHora, formatarDecimal, formatarNumero } from '@/lib/formato';
import { abrirExterno, linkTelefone, linkWhatsApp } from '@/lib/contato';
import { situacaoFollowup } from './followup';
import { useExcluirContato, useExcluirLead, useInteracoes, useMudarEtapa } from './dados';
import { FormLead } from './FormLead';
import { RegistrarContato } from './RegistrarContato';
import { ICONE_CANAL } from './canais';

function Historico({ lead, aoEditar }: { lead: Cliente; aoEditar: (i: Interacao) => void }) {
  const q = useInteracoes(lead.id);
  const nome = useNomeMembro();
  const excluir = useExcluirContato(lead.id);
  const [apagar, setApagar] = useState<Interacao | null>(null);
  if (q.isLoading) return <Carregando linhas={2} />;
  if (q.isError) return <ErroCarga erro={q.error} tentarDeNovo={() => void q.refetch()} />;
  if (!q.data?.length) {
    return <p className="text-md text-text-muted">Nenhum contato registrado ainda. Use “Registrar contato” depois de falar com o cliente.</p>;
  }
  return (
    <>
      <ol className="flex flex-col gap-4">
        {q.data.map((i) => {
          const Icone = ICONE_CANAL[i.canal as Canal] ?? ChatCircleText;
          return (
            <li key={i.id} className="flex gap-3">
              <span className="mt-0.5 flex size-[32px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
                <Icone size={16} aria-hidden />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-sm text-text-muted">
                  {formatarDataHora(i.ocorreu_em, true)} · {rotulo(ROTULO_CANAL, i.canal)} · {nome(i.created_by)}
                </p>
                <p className="whitespace-pre-wrap break-words">{i.resumo}</p>
                {i.proximo_passo ? <p className="text-sm text-text-muted">Próximo passo: {i.proximo_passo}</p> : null}
              </div>
              <Menu>
                <GatilhoMenu asChild>
                  <Botao variante="fantasma" tamanho="icone" aria-label="Ações do contato">
                    <DotsThreeOutline size={18} aria-hidden />
                  </Botao>
                </GatilhoMenu>
                <ConteudoMenu>
                  <ItemMenu aoEscolher={() => aoEditar(i)}>
                    <PencilSimple size={18} aria-hidden /> Editar contato
                  </ItemMenu>
                  <ItemMenu perigo aoEscolher={() => setApagar(i)}>
                    <Trash size={18} aria-hidden /> Apagar contato
                  </ItemMenu>
                </ConteudoMenu>
              </Menu>
            </li>
          );
        })}
      </ol>
      <Confirmar
        aberto={!!apagar}
        aoMudar={(v) => !v && setApagar(null)}
        titulo="Apagar contato?"
        texto="O registro sai do histórico. O follow-up do lead não muda."
        botao="Apagar contato"
        perigo
        carregando={excluir.isPending}
        aoConfirmar={async () => {
          if (apagar) await excluir.mutateAsync(apagar.id).catch(() => null);
          setApagar(null);
        }}
      />
    </>
  );
}

/** Ficha do lead: painel lateral no computador, tela cheia no celular. */
export function FichaLead({ lead, aoFechar }: { lead: Cliente | null; aoFechar: () => void }) {
  const navegar = useNavigate();
  const nome = useNomeMembro();
  const mudarEtapa = useMudarEtapa();
  const excluir = useExcluirLead();
  const [editar, setEditar] = useState(false);
  const [contato, setContato] = useState<{ aberto: boolean; item: Interacao | null }>({ aberto: false, item: null });
  const [descartar, setDescartar] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [mover, setMover] = useState(false);
  const [destino, setDestino] = useState<Etapa>('prospectado');
  const [apagar, setApagar] = useState(false);

  if (!lead) return null;
  const fu = situacaoFollowup(lead);
  const wa = linkWhatsApp(lead.telefone);
  const tel = linkTelefone(lead.telefone);
  const descartado = lead.etapa === 'descartado';

  return (
    <>
      <Lateral
        aberto={!!lead}
        aoMudar={(v) => !v && aoFechar()}
        titulo={lead.nome}
        descricao={`${lead.codigo ?? ''}${lead.responsavel_id ? ` · ${nome(lead.responsavel_id)} é o responsável` : ' · sem responsável'}`}
        rodape={
          <>
            <Botao className="flex-1" onClick={() => navegar(`/vendas/nova?cliente=${lead.id}`)} disabled={descartado}>
              <Receipt size={18} aria-hidden />
              Registrar venda
            </Botao>
            <Botao variante="principal" className="flex-1" onClick={() => setContato({ aberto: true, item: null })}>
              <ChatCircleText size={18} aria-hidden />
              Registrar contato
            </Botao>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Selo icone={ArrowsLeftRight} texto={rotulo(ROTULO_ETAPA, lead.etapa)} tom="destaque" />
              <NotaGoogle nota={lead.nota_google} avaliacoes={lead.avaliacoes_google} />
              <span className="text-md text-text-muted">· {lead.cidade}</span>
            </div>
            <Selo icone={fu.icone} texto={fu.longo} tom={fu.tom} className="self-start" />
          </div>

          <div className="flex flex-wrap gap-2">
            {wa ? (
              <Botao onClick={() => abrirExterno(wa)}>
                <WhatsappLogo size={18} aria-hidden />
                WhatsApp
              </Botao>
            ) : null}
            {tel ? (
              <a href={tel} className="inline-flex min-h-(--tap-min) md:min-h-[36px] items-center gap-2 rounded-md border border-divider px-4">
                <Phone size={18} aria-hidden />
                Ligar
              </a>
            ) : null}
            {lead.google_url ? (
              <Botao onClick={() => abrirExterno(lead.google_url!)}>
                <GoogleLogo size={18} aria-hidden />
                Google
              </Botao>
            ) : null}
            <Botao onClick={() => setEditar(true)}>
              <PencilSimple size={18} aria-hidden />
              Editar
            </Botao>
            <Menu>
              <GatilhoMenu asChild>
                <Botao tamanho="icone" aria-label="Mais ações do lead">
                  <DotsThreeOutline size={18} aria-hidden />
                </Botao>
              </GatilhoMenu>
              <ConteudoMenu>
                {descartado ? (
                  <ItemMenu aoEscolher={() => { setDestino('a_prospectar'); setMover(true); }}>
                    <ArrowCounterClockwise size={18} aria-hidden /> Reativar lead
                  </ItemMenu>
                ) : (
                  <>
                    <ItemMenu aoEscolher={() => { setDestino(ETAPAS_MANUAIS.find((x) => x !== lead.etapa) ?? 'prospectado'); setMover(true); }}>
                      <ArrowsLeftRight size={18} aria-hidden /> Mover para outra etapa
                    </ItemMenu>
                    <ItemMenu aoEscolher={() => { setMotivo(''); setDescartar(true); }}>
                      <XCircle size={18} aria-hidden /> Descartar lead
                    </ItemMenu>
                  </>
                )}
                <SeparadorMenu />
                <ItemMenu perigo aoEscolher={() => setApagar(true)}>
                  <Trash size={18} aria-hidden /> Excluir lead
                </ItemMenu>
              </ConteudoMenu>
            </Menu>
          </div>

          <section className="flex flex-col gap-3">
            <h3 className="font-medium">Dados</h3>
            <Dados
              itens={[
                ['Contato', lead.contato_nome],
                ['Telefone', lead.telefone],
                ['E-mail', lead.email],
                ['Endereço', lead.endereco],
                ['Segmento', lead.segmento ? rotulo(ROTULO_SEGMENTO, lead.segmento) : null],
                ['Origem', lead.origem ? rotulo(ROTULO_ORIGEM, lead.origem) : null],
                ['Interesse', lead.interesse],
                ['Instagram', lead.instagram],
                ['Site', lead.site_url ?? (lead.tem_site === false ? 'Não tem' : null)],
                ['Aval. por mês', lead.avaliacoes_mes_antes !== null ? `${formatarDecimal(lead.avaliacoes_mes_antes)} antes da placa` : null],
                [
                  'Concorrente',
                  lead.concorrente_nome
                    ? `${lead.concorrente_nome}${lead.concorrente_nota !== null ? ` · ${formatarDecimal(lead.concorrente_nota)}` : ''}${lead.concorrente_avaliacoes !== null ? ` · ${formatarNumero(lead.concorrente_avaliacoes)} avaliações` : ''}`
                    : null,
                ],
                ['Descartado em', descartado ? formatarDataHora(lead.descartado_em) : null],
                ['Cadastrado em', formatarDataHora(lead.created_at)],
                ['Observações', lead.observacoes ? <span className="whitespace-pre-wrap">{lead.observacoes}</span> : null],
              ]}
            />
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="font-medium">Histórico de contatos</h3>
            <Historico lead={lead} aoEditar={(i) => setContato({ aberto: true, item: i })} />
          </section>
        </div>
      </Lateral>

      <FormLead aberto={editar} aoMudar={setEditar} lead={lead} />
      <RegistrarContato aberto={contato.aberto} aoMudar={(v) => setContato((c) => ({ ...c, aberto: v }))} lead={lead} contato={contato.item} />

      <Confirmar
        aberto={descartar}
        aoMudar={setDescartar}
        titulo={`Descartar ${lead.nome}?`}
        texto="O lead vai para a aba Descartado. Dá para reativar depois."
        botao="Descartar lead"
        perigo
        carregando={mudarEtapa.isPending}
        aoConfirmar={async () => {
          if (!motivo) return;
          const ok = await mudarEtapa.mutateAsync({ id: lead.id, etapa: 'descartado', motivo }).catch(() => null);
          if (ok) setDescartar(false);
        }}
      >
        <Campo rotulo="Motivo" obrigatorio erro={!motivo ? 'Escolha o motivo' : undefined}>
          <Selecao value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            <option value="">Escolha</option>
            {MOTIVOS_DESCARTE.map((m) => (
              <option key={m} value={m}>
                {ROTULO_MOTIVO_DESCARTE[m]}
              </option>
            ))}
          </Selecao>
        </Campo>
      </Confirmar>

      <Confirmar
        aberto={mover}
        aoMudar={setMover}
        titulo={descartado ? `Reativar ${lead.nome}` : `Mover ${lead.nome}`}
        texto={descartado ? 'O motivo do descarte é apagado sozinho.' : 'Cliente é automático: muda quando uma venda é confirmada.'}
        botao={descartado ? 'Reativar lead' : 'Mover lead'}
        carregando={mudarEtapa.isPending}
        aoConfirmar={async () => {
          const ok = await mudarEtapa.mutateAsync({ id: lead.id, etapa: destino }).catch(() => null);
          if (ok) setMover(false);
        }}
      >
        <Campo rotulo="Etapa">
          <Selecao value={destino} onChange={(e) => setDestino(e.target.value as Etapa)}>
            {ETAPAS_MANUAIS.filter((x) => x !== lead.etapa).map((x) => (
              <option key={x} value={x}>
                {ROTULO_ETAPA[x]}
              </option>
            ))}
          </Selecao>
        </Campo>
      </Confirmar>

      <Confirmar
        aberto={apagar}
        aoMudar={setApagar}
        titulo={`Excluir ${lead.nome}?`}
        texto="O lead e o histórico de contatos são apagados. Lead com venda não pode ser excluído. Para tirar da lista sem perder o histórico, prefira Descartar."
        botao="Excluir lead"
        perigo
        carregando={excluir.isPending}
        aoConfirmar={async () => {
          const ok = await excluir.mutateAsync(lead.id).then(() => true).catch(() => false);
          if (ok) {
            setApagar(false);
            aoFechar();
          }
        }}
      />
    </>
  );
}
