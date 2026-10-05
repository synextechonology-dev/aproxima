import { useState } from 'react';
import { CalendarPlus, CheckCircle, Clock, PencilSimple, WarningCircle, CalendarBlank } from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { AreaTexto, Campo, Entrada } from '@/components/ui/campos';
import { Modal } from '@/components/ui/dialogo';
import { Secao } from '@/components/layout';
import { Selo } from '@/components/selo';
import { formatarData, formatarDecimal, formatarNumero, hojeSP, somarDias } from '@/lib/formato';
import { ROTULO_MARCO } from '@/lib/rotulos';
import { numParaCampo } from '@/lib/zod';
import type { Revisao } from '@/lib/tipos';
import { useRevisoes, type DadosProjeto } from './dados';

function RegistrarRevisao({ r, projetoId, aoFechar }: { r: Revisao; projetoId: string; aoFechar: () => void }) {
  const rev = useRevisoes(projetoId);
  const [data, setData] = useState(r.realizado_em ?? hojeSP());
  const [prevista, setPrevista] = useState(r.data_prevista);
  const [nota, setNota] = useState(numParaCampo(r.nota));
  const [aval, setAval] = useState(numParaCampo(r.avaliacoes));
  const [obs, setObs] = useState(r.observacoes ?? '');
  const [erros, setErros] = useState<Record<string, string>>({});

  const salvar = async (concluir: boolean) => {
    const e: Record<string, string> = {};
    const n = nota.trim() === '' ? null : Number(nota.replace(',', '.'));
    const a = aval.trim() === '' ? null : Number(aval.replace(/\./g, ''));
    if (n !== null && (!Number.isFinite(n) || n < 0 || n > 5)) e.nota = 'Nota de 0 a 5';
    if (a !== null && (!Number.isInteger(a) || a < 0)) e.aval = 'Número inteiro a partir de 0';
    if (concluir && a === null) e.aval = 'Para concluir a revisão, informe o número de avaliações';
    if (concluir && !data) e.data = 'Informe a data';
    if (obs.length > 1000) e.obs = 'Até 1000 caracteres';
    setErros(e);
    if (Object.keys(e).length) return;
    const ok = await rev.registrar
      .mutateAsync({ id: r.id, realizado_em: concluir ? data : null, nota: n, avaliacoes: a, observacoes: obs.trim() || null, data_prevista: prevista })
      .catch(() => null);
    if (ok) aoFechar();
  };

  return (
    <Modal
      aberto
      aoMudar={(v) => !v && aoFechar()}
      titulo={`Revisão de ${ROTULO_MARCO[r.marco] ?? r.marco}`}
      descricao="Abra o perfil do cliente no Google e anote a nota e o total de avaliações de hoje."
      rodape={
        <>
          {r.realizado_em ? (
            <Botao onClick={() => void salvar(false)}>Reabrir revisão</Botao>
          ) : (
            <Botao onClick={() => void salvar(false)}>Salvar sem concluir</Botao>
          )}
          <Botao variante="principal" onClick={() => void salvar(true)} carregando={rev.registrar.isPending}>
            <CheckCircle size={18} aria-hidden />
            Concluir revisão
          </Botao>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Campo rotulo="Data prevista">
          <Entrada type="date" value={prevista} onChange={(e) => setPrevista(e.target.value)} />
        </Campo>
        <Campo rotulo="Feita em" erro={erros.data}>
          <Entrada type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Campo>
        <Campo rotulo="Nota no Google" erro={erros.nota}>
          <Entrada inputMode="decimal" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="4,6" />
        </Campo>
        <Campo rotulo="Total de avaliações" obrigatorio erro={erros.aval}>
          <Entrada inputMode="numeric" value={aval} onChange={(e) => setAval(e.target.value)} />
        </Campo>
        <Campo rotulo="Observações" erro={erros.obs} className="col-span-2">
          <AreaTexto rows={3} value={obs} onChange={(e) => setObs(e.target.value)} />
        </Campo>
      </div>
    </Modal>
  );
}

export function Revisoes({ d, editavel }: { d: DadosProjeto; editavel: boolean }) {
  const rev = useRevisoes(d.projeto.id);
  const [aberta, setAberta] = useState<Revisao | null>(null);
  const [extra, setExtra] = useState(false);
  const [dataExtra, setDataExtra] = useState(somarDias(hojeSP(), 30));
  const hoje = hojeSP();

  return (
    <Secao
      titulo="Revisões"
      extra={
        editavel ? (
          <Botao variante="fantasma" onClick={() => setExtra(true)}>
            <CalendarPlus size={16} aria-hidden />
            Agendar revisão extra
          </Botao>
        ) : null
      }
    >
      <ul className="flex flex-col divide-y divide-divider">
        {d.revisoes.map((r) => {
          const selo = r.realizado_em
            ? { icone: CheckCircle, tom: 'ok' as const, texto: `feita em ${formatarData(r.realizado_em)}` }
            : r.data_prevista < hoje
              ? { icone: WarningCircle, tom: 'atrasado' as const, texto: `atrasada · prevista ${formatarData(r.data_prevista)}` }
              : r.data_prevista === hoje
                ? { icone: Clock, tom: 'hoje' as const, texto: 'hoje' }
                : { icone: CalendarBlank, tom: 'neutro' as const, texto: `prevista ${formatarData(r.data_prevista)}` };
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="w-20 font-medium">{ROTULO_MARCO[r.marco] ?? r.marco}</span>
              <Selo icone={selo.icone} texto={selo.texto} tom={selo.tom} />
              {r.avaliacoes !== null ? (
                <span className="num text-md text-star">
                  {formatarNumero(r.avaliacoes)} aval.{r.nota !== null ? ` · ★${formatarDecimal(r.nota)}` : ''}
                </span>
              ) : null}
              {editavel ? (
                <Botao variante="fantasma" className="ml-auto" onClick={() => setAberta(r)}>
                  <PencilSimple size={16} aria-hidden />
                  {r.realizado_em ? 'Editar' : 'Registrar'}
                </Botao>
              ) : null}
            </li>
          );
        })}
      </ul>
      {aberta ? <RegistrarRevisao r={aberta} projetoId={d.projeto.id} aoFechar={() => setAberta(null)} /> : null}
      {extra ? (
        <Modal
          aberto
          aoMudar={setExtra}
          titulo="Agendar revisão extra"
          rodape={
            <>
              <Botao onClick={() => setExtra(false)}>Cancelar</Botao>
              <Botao
                variante="principal"
                carregando={rev.extra.isPending}
                disabled={!dataExtra}
                onClick={async () => {
                  const ok = await rev.extra.mutateAsync(dataExtra).catch(() => null);
                  if (ok) setExtra(false);
                }}
              >
                Agendar revisão
              </Botao>
            </>
          }
        >
          <Campo rotulo="Data prevista">
            <Entrada type="date" value={dataExtra} onChange={(e) => setDataExtra(e.target.value)} />
          </Campo>
        </Modal>
      ) : null}
    </Secao>
  );
}
