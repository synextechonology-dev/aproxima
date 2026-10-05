import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarBlank, Check } from '@phosphor-icons/react';
import { Modal } from '@/components/ui/dialogo';
import { Botao } from '@/components/ui/botao';
import { AreaTexto, Campo, Entrada } from '@/components/ui/campos';
import type { Cliente, Interacao } from '@/lib/tipos';
import { CANAIS, ROTULO_CANAL, type Canal } from '@/lib/rotulos';
import { agoraLocalSP, diaDaSemana, formatarData, hojeSP, nomeDiaSemana, somarDias } from '@/lib/formato';
import { cn } from '@/lib/utils';
import { esquemaContato, type ContatoEntrada, type ContatoSaida } from './schemas';
import { useSalvarContato } from './dados';
import { ICONE_CANAL } from './canais';


type Atalho = 'amanha' | '3dias' | 'sexta' | 'outra' | 'nenhum';

function proximaSexta(hoje: string) {
  const d = diaDaSemana(hoje);
  const faltam = (5 - d + 7) % 7 || 7;
  return somarDias(hoje, faltam);
}

function datasAtalho(hoje: string): Record<Exclude<Atalho, 'outra' | 'nenhum'>, string> {
  return { amanha: somarDias(hoje, 1), '3dias': somarDias(hoje, 3), sexta: proximaSexta(hoje) };
}

/** "Hora" local (aaaa-mm-ddThh:mm) a partir do ISO salvo, em São Paulo. */
function isoParaLocal(iso: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(iso))
    .replace(' ', 'T');
}

type Props = {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  lead: Cliente;
  contato?: Interacao | null;
};

/** Registrar contato: feito para usar com uma mão, na rua (chips grandes, botão embaixo). */
export function RegistrarContato(props: Props) {
  return props.aberto ? <RegistrarContatoAberto {...props} /> : null;
}

function RegistrarContatoAberto({
  aberto,
  aoMudar,
  lead,
  contato,
}: Props) {
  const hoje = hojeSP();
  const atalhos = datasAtalho(hoje);
  const [atalho, setAtalho] = useState<Atalho>(contato ? (contato.proximo_followup ? 'outra' : 'nenhum') : '3dias');
  const salvar = useSalvarContato(lead.id);
  const f = useForm<ContatoEntrada, unknown, ContatoSaida>({
    resolver: zodResolver(esquemaContato),
    defaultValues: contato
      ? {
          canal: contato.canal as Canal,
          resumo: contato.resumo,
          proximo_passo: contato.proximo_passo ?? '',
          proximo_followup: contato.proximo_followup ?? '',
          ocorreu_em: isoParaLocal(contato.ocorreu_em),
        }
      : { canal: 'visita', resumo: '', proximo_passo: '', proximo_followup: atalhos['3dias'], ocorreu_em: agoraLocalSP() },
  });
  const e = f.formState.errors;

  const escolher = (a: Atalho) => {
    setAtalho(a);
    if (a === 'nenhum') f.setValue('proximo_followup', '');
    else if (a !== 'outra') f.setValue('proximo_followup', atalhos[a]);
  };

  const enviar = f.handleSubmit(async (dados) => {
    const ok = await salvar.mutateAsync({ id: contato?.id, dados }).catch(() => null);
    if (ok) aoMudar(false);
  });

  const followup = useWatch({ control: f.control, name: 'proximo_followup' });
  const chip = (ativo: boolean) =>
    cn(
      'flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-md border px-2 text-sm',
      ativo ? 'border-accent bg-accent-soft text-accent-text' : 'border-divider',
    );

  return (
    <Modal
      aberto={aberto}
      aoMudar={aoMudar}
      titulo={contato ? 'Editar contato' : 'Registrar contato'}
      descricao={`${lead.nome} · ${lead.cidade}`}
      rodape={
        <Botao type="submit" form="form-contato" variante="principal" tamanho="bloco" className="md:w-auto" carregando={f.formState.isSubmitting}>
          <Check size={18} aria-hidden />
          {contato ? 'Salvar contato' : 'Registrar contato'}
        </Botao>
      }
    >
      <form id="form-contato" onSubmit={enviar} noValidate className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs text-text-muted">Canal</legend>
          <Controller
            control={f.control}
            name="canal"
            render={({ field }) => (
              <div role="radiogroup" aria-label="Canal" className="grid grid-cols-3 gap-2">
                {CANAIS.map((c) => {
                  const Icone = ICONE_CANAL[c];
                  return (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={field.value === c}
                      onClick={() => field.onChange(c)}
                      className={chip(field.value === c)}
                    >
                      <Icone size={20} aria-hidden />
                      {ROTULO_CANAL[c]}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </fieldset>

        <Campo rotulo="Resumo da conversa" obrigatorio erro={e.resumo?.message}>
          <AreaTexto rows={4} placeholder="O que foi combinado?" {...f.register('resumo')} />
        </Campo>
        <Campo rotulo="Próximo passo" erro={e.proximo_passo?.message}>
          <Entrada placeholder="Ex.: levar a demonstração na sexta" {...f.register('proximo_passo')} />
        </Campo>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs text-text-muted">Próximo follow-up</legend>
          <div role="radiogroup" aria-label="Próximo follow-up" className="grid grid-cols-3 gap-2 md:grid-cols-5">
            {(
              [
                ['amanha', 'Amanhã', formatarData(atalhos.amanha).slice(0, 5)],
                ['3dias', 'Em 3 dias', formatarData(atalhos['3dias']).slice(0, 5)],
                ['sexta', 'Sexta', formatarData(atalhos.sexta).slice(0, 5)],
                ['outra', 'Outra', 'data'],
                ['nenhum', 'Sem', 'follow-up'],
              ] as const
            ).map(([v, r, d]) => (
              <button key={v} type="button" role="radio" aria-checked={atalho === v} onClick={() => escolher(v)} className={chip(atalho === v)}>
                <span>{r}</span>
                <span className="num text-xs text-text-muted">{d}</span>
              </button>
            ))}
          </div>
          {atalho === 'outra' ? (
            <Campo rotulo="Data do follow-up" erro={e.proximo_followup?.message}>
              <Entrada type="date" min={hoje} {...f.register('proximo_followup')} />
            </Campo>
          ) : followup ? (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <CalendarBlank size={16} aria-hidden />
              {nomeDiaSemana(followup)}, {formatarData(followup)}
            </p>
          ) : (
            <p className="text-sm text-text-muted">O follow-up atual do lead será apagado.</p>
          )}
        </fieldset>

        <Campo rotulo="Quando foi" erro={e.ocorreu_em?.message}>
          <Entrada type="datetime-local" {...f.register('ocorreu_em')} />
        </Campo>
      </form>
    </Modal>
  );
}
