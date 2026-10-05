import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FloppyDisk } from '@phosphor-icons/react';
import { Modal } from '@/components/ui/dialogo';
import { Botao } from '@/components/ui/botao';
import { AreaTexto, Campo, Entrada, Selecao } from '@/components/ui/campos';
import { useMembrosAtivos, useEu } from '@/hooks/useBase';
import type { Cliente } from '@/lib/tipos';
import {
  ETAPAS_MANUAIS,
  MOTIVOS_DESCARTE,
  ORIGENS,
  ROTULO_ETAPA,
  ROTULO_MOTIVO_DESCARTE,
  ROTULO_ORIGEM,
  ROTULO_SEGMENTO,
  SEGMENTOS,
  type Etapa,
} from '@/lib/rotulos';
import { numParaCampo } from '@/lib/zod';
import { esquemaLead, type LeadEntrada, type LeadSaida } from './schemas';
import { useSalvarLead } from './dados';

function valoresIniciais(c: Cliente | null, etapa: Etapa, eu: string | undefined): LeadEntrada {
  return {
    nome: c?.nome ?? '',
    cidade: c?.cidade ?? '',
    segmento: (c?.segmento ?? '') as LeadEntrada['segmento'],
    endereco: c?.endereco ?? '',
    contato_nome: c?.contato_nome ?? '',
    telefone: c?.telefone ?? '',
    email: c?.email ?? '',
    google_url: c?.google_url ?? '',
    nota_google: numParaCampo(c?.nota_google),
    avaliacoes_google: numParaCampo(c?.avaliacoes_google),
    avaliacoes_mes_antes: numParaCampo(c?.avaliacoes_mes_antes),
    instagram: c?.instagram ?? '',
    tem_site: c?.tem_site === true ? 'sim' : c?.tem_site === false ? 'nao' : '',
    site_url: c?.site_url ?? '',
    interesse: c?.interesse ?? '',
    concorrente_nome: c?.concorrente_nome ?? '',
    concorrente_nota: numParaCampo(c?.concorrente_nota),
    concorrente_avaliacoes: numParaCampo(c?.concorrente_avaliacoes),
    etapa: (c?.etapa as Etapa) ?? etapa,
    motivo_descarte: (c?.motivo_descarte ?? '') as LeadEntrada['motivo_descarte'],
    origem: (c?.origem ?? '') as LeadEntrada['origem'],
    responsavel_id: c ? (c.responsavel_id ?? '') : (eu ?? ''),
    proximo_followup: c?.proximo_followup ?? '',
    observacoes: c?.observacoes ?? '',
  };
}

type Props = {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  lead: Cliente | null;
  etapaInicial?: Etapa;
  aoSalvar?: (c: Cliente) => void;
};

export function FormLead(props: Props) {
  return props.aberto ? <FormLeadAberto {...props} /> : null;
}

function FormLeadAberto({
  aberto,
  aoMudar,
  lead,
  etapaInicial = 'a_prospectar',
  aoSalvar,
}: Props) {
  const eu = useEu();
  const { data: membros } = useMembrosAtivos();
  const salvar = useSalvarLead();
  const f = useForm<LeadEntrada, unknown, LeadSaida>({
    resolver: zodResolver(esquemaLead),
    defaultValues: valoresIniciais(lead, etapaInicial, eu?.user_id),
  });
  const e = f.formState.errors;

  const enviar = f.handleSubmit(async (dados) => {
    // Na edição, a etapa muda pelos botões da ficha (Mover, Descartar, Reativar)
    const corpo: Partial<LeadSaida> = { ...dados };
    if (lead) {
      delete corpo.etapa;
      delete corpo.motivo_descarte;
    }
    const salvo = await salvar.mutateAsync({ id: lead?.id, dados: corpo }).catch(() => null);
    if (salvo) {
      aoMudar(false);
      aoSalvar?.(salvo);
    }
  });

  const etapa = useWatch({ control: f.control, name: 'etapa' });

  return (
    <Modal
      aberto={aberto}
      aoMudar={aoMudar}
      titulo={lead ? `Editar ${lead.nome}` : 'Novo lead'}
      descricao={lead ? lead.codigo ?? undefined : 'O código L- é gerado sozinho ao salvar.'}
      className="md:w-[min(720px,calc(100vw-32px))]"
      rodape={
        <>
          <Botao onClick={() => aoMudar(false)}>Cancelar</Botao>
          <Botao type="submit" form="form-lead" variante="principal" carregando={f.formState.isSubmitting}>
            <FloppyDisk size={18} aria-hidden />
            {lead ? 'Salvar alterações' : 'Cadastrar lead'}
          </Botao>
        </>
      }
    >
      <form id="form-lead" onSubmit={enviar} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Campo rotulo="Nome do estabelecimento" obrigatorio erro={e.nome?.message} className="md:col-span-2">
          <Entrada autoFocus {...f.register('nome')} />
        </Campo>
        <Campo rotulo="Cidade" obrigatorio erro={e.cidade?.message}>
          <Entrada autoComplete="address-level2" {...f.register('cidade')} />
        </Campo>
        <Campo rotulo="Segmento" erro={e.segmento?.message}>
          <Selecao {...f.register('segmento')}>
            <option value="">Não informado</option>
            {SEGMENTOS.map((s) => (
              <option key={s} value={s}>
                {ROTULO_SEGMENTO[s]}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Contato (nome)" erro={e.contato_nome?.message}>
          <Entrada {...f.register('contato_nome')} />
        </Campo>
        <Campo rotulo="Telefone" erro={e.telefone?.message}>
          <Entrada type="tel" inputMode="tel" placeholder="(14) 99999-9999" {...f.register('telefone')} />
        </Campo>
        <Campo rotulo="E-mail" erro={e.email?.message}>
          <Entrada type="email" inputMode="email" {...f.register('email')} />
        </Campo>
        <Campo rotulo="Instagram" erro={e.instagram?.message}>
          <Entrada placeholder="@perfil" {...f.register('instagram')} />
        </Campo>
        <Campo rotulo="Endereço" erro={e.endereco?.message} className="md:col-span-2">
          <Entrada autoComplete="street-address" {...f.register('endereco')} />
        </Campo>

        <fieldset className="contents">
          <legend className="sr-only">Google</legend>
          <Campo rotulo="Link do Google" erro={e.google_url?.message} className="md:col-span-2" dica="Começa com https://. Não pode repetir em outro lead.">
            <Entrada type="url" inputMode="url" placeholder="https://" {...f.register('google_url')} />
          </Campo>
          <Campo rotulo="Nota no Google" erro={e.nota_google?.message}>
            <Entrada inputMode="decimal" placeholder="4,5" {...f.register('nota_google')} />
          </Campo>
          <Campo rotulo="Avaliações no Google" erro={e.avaliacoes_google?.message}>
            <Entrada inputMode="numeric" {...f.register('avaliacoes_google')} />
          </Campo>
          <Campo rotulo="Avaliações por mês (antes)" erro={e.avaliacoes_mes_antes?.message} dica="Ritmo antes da placa, para o bloco Resultado.">
            <Entrada inputMode="decimal" {...f.register('avaliacoes_mes_antes')} />
          </Campo>
          <Campo rotulo="Tem site?" erro={e.tem_site?.message}>
            <Selecao {...f.register('tem_site')}>
              <option value="">Não sei</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </Selecao>
          </Campo>
          <Campo rotulo="Endereço do site" erro={e.site_url?.message} className="md:col-span-2">
            <Entrada type="url" inputMode="url" placeholder="https://" {...f.register('site_url')} />
          </Campo>
        </fieldset>

        <Campo rotulo="Concorrente mais perto" erro={e.concorrente_nome?.message} className="md:col-span-2">
          <Entrada {...f.register('concorrente_nome')} />
        </Campo>
        <Campo rotulo="Nota do concorrente" erro={e.concorrente_nota?.message}>
          <Entrada inputMode="decimal" {...f.register('concorrente_nota')} />
        </Campo>
        <Campo rotulo="Avaliações do concorrente" erro={e.concorrente_avaliacoes?.message}>
          <Entrada inputMode="numeric" {...f.register('concorrente_avaliacoes')} />
        </Campo>

        <Campo rotulo="Interesse" erro={e.interesse?.message} className="md:col-span-2">
          <Entrada placeholder="Ex.: 2 placas, salão e balcão" {...f.register('interesse')} />
        </Campo>
        {!lead ? (
          <Campo rotulo="Etapa" erro={e.etapa?.message}>
            <Selecao {...f.register('etapa')}>
              {[...ETAPAS_MANUAIS, 'descartado' as const].map((s) => (
                <option key={s} value={s}>
                  {ROTULO_ETAPA[s]}
                </option>
              ))}
            </Selecao>
          </Campo>
        ) : null}
        {!lead && etapa === 'descartado' ? (
          <Campo rotulo="Motivo do descarte" obrigatorio erro={e.motivo_descarte?.message}>
            <Selecao {...f.register('motivo_descarte')}>
              <option value="">Escolha</option>
              {MOTIVOS_DESCARTE.map((m) => (
                <option key={m} value={m}>
                  {ROTULO_MOTIVO_DESCARTE[m]}
                </option>
              ))}
            </Selecao>
          </Campo>
        ) : null}
        <Campo rotulo="Origem" erro={e.origem?.message}>
          <Selecao {...f.register('origem')}>
            <option value="">Não informada</option>
            {ORIGENS.map((o) => (
              <option key={o} value={o}>
                {ROTULO_ORIGEM[o]}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Responsável" erro={e.responsavel_id?.message}>
          <Selecao {...f.register('responsavel_id')}>
            <option value="">Ninguém</option>
            {membros?.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Próximo follow-up" erro={e.proximo_followup?.message}>
          <Entrada type="date" {...f.register('proximo_followup')} />
        </Campo>
        <Campo rotulo="Observações" erro={e.observacoes?.message} className="md:col-span-2">
          <AreaTexto rows={3} {...f.register('observacoes')} />
        </Campo>
      </form>
    </Modal>
  );
}
