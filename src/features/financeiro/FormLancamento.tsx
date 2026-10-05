import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FloppyDisk } from '@phosphor-icons/react';
import { Modal } from '@/components/ui/dialogo';
import { Botao } from '@/components/ui/botao';
import { Campo, Entrada, Selecao } from '@/components/ui/campos';
import { Segmentado } from '@/components/abas';
import { useEu, useMembrosAtivos } from '@/hooks/useBase';
import {
  CATEGORIAS_AVULSAS,
  FORMAS_LANCAMENTO,
  ROTULO_CATEGORIA_LANCAMENTO,
  ROTULO_FORMA,
  ROTULO_TIPO_LANCAMENTO,
  TIPOS_LANCAMENTO,
  type TipoLancamento,
} from '@/lib/rotulos';
import { hojeSP } from '@/lib/formato';
import { reaisParaCampo } from '@/lib/zod';
import type { Lancamento } from '@/lib/tipos';
import { esquemaLancamento, type LancEntrada, type LancSaida } from './schemas';
import { useSalvarLancamento } from './dados';

type Props = { aberto: boolean; aoMudar: (v: boolean) => void; lancamento?: Lancamento | null; tipoInicial?: TipoLancamento };

export function FormLancamento(props: Props) {
  return props.aberto ? <FormAberto {...props} /> : null;
}

function FormAberto({ aberto, aoMudar, lancamento, tipoInicial = 'despesa' }: Props) {
  const eu = useEu();
  const { data: membros } = useMembrosAtivos();
  const salvar = useSalvarLancamento();
  const l = lancamento;
  const tipo0 = (l?.tipo as TipoLancamento) ?? tipoInicial;
  const f = useForm<LancEntrada, unknown, LancSaida>({
    resolver: zodResolver(esquemaLancamento),
    defaultValues: {
      tipo: tipo0,
      categoria: l?.categoria ?? CATEGORIAS_AVULSAS[tipo0][0],
      descricao: l?.descricao ?? (tipo0 === 'retirada' && eu ? `Retirada de ${eu.nome}` : ''),
      valor: reaisParaCampo(l?.valor),
      vencimento: l?.vencimento ?? hojeSP(),
      pago_em: l ? (l.pago_em ?? '') : tipo0 === 'retirada' ? hojeSP() : '',
      forma_pagamento: (l?.forma_pagamento ?? 'pix') as LancEntrada['forma_pagamento'],
      socio_id: l?.socio_id ?? (tipo0 === 'retirada' ? (eu?.user_id ?? '') : ''),
    },
  });
  const e = f.formState.errors;
  const tipo = useWatch({ control: f.control, name: 'tipo' });
  const socio = useWatch({ control: f.control, name: 'socio_id' });

  const mudarTipo = (t: TipoLancamento) => {
    f.setValue('tipo', t);
    f.setValue('categoria', CATEGORIAS_AVULSAS[t][0]);
    if (t === 'retirada' && !f.getValues('socio_id')) f.setValue('socio_id', eu?.user_id ?? '');
    if (t !== 'retirada') f.setValue('socio_id', '');
  };

  const enviar = f.handleSubmit(async (dados) => {
    const ok = await salvar.mutateAsync({ id: l?.id, dados }).catch(() => null);
    if (ok) aoMudar(false);
  });

  return (
    <Modal
      aberto={aberto}
      aoMudar={aoMudar}
      titulo={l ? 'Editar lançamento' : tipo0 === 'retirada' ? 'Registrar retirada' : 'Novo lançamento'}
      descricao="Vendas e lotes lançam sozinhos; aqui entram só despesas, receitas avulsas e retiradas."
      rodape={
        <>
          <Botao onClick={() => aoMudar(false)}>Cancelar</Botao>
          <Botao type="submit" form="form-lanc" variante="principal" carregando={f.formState.isSubmitting}>
            <FloppyDisk size={18} aria-hidden />
            {l ? 'Salvar lançamento' : tipo === 'retirada' ? 'Registrar retirada' : 'Registrar lançamento'}
          </Botao>
        </>
      }
    >
      <form id="form-lanc" onSubmit={enviar} noValidate className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Segmentado<TipoLancamento>
            rotulo="Tipo"
            valor={tipo}
            aoMudar={mudarTipo}
            opcoes={TIPOS_LANCAMENTO.map((t) => ({ valor: t, rotulo: ROTULO_TIPO_LANCAMENTO[t] }))}
          />
        </div>
        <Campo rotulo="Categoria" erro={e.categoria?.message}>
          <Selecao {...f.register('categoria')}>
            {CATEGORIAS_AVULSAS[tipo].map((c) => (
              <option key={c} value={c}>{ROTULO_CATEGORIA_LANCAMENTO[c]}</option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Valor (R$)" obrigatorio erro={e.valor?.message}>
          <Entrada inputMode="decimal" placeholder="0,00" {...f.register('valor')} />
        </Campo>
        <Campo rotulo="Descrição" obrigatorio erro={e.descricao?.message} className="col-span-2">
          <Entrada {...f.register('descricao')} />
        </Campo>
        {tipo === 'retirada' ? (
          <Campo rotulo="Sócio" obrigatorio erro={e.socio_id?.message} className="col-span-2">
            <Selecao value={socio} onChange={(ev) => f.setValue('socio_id', ev.target.value)}>
              <option value="">Escolha</option>
              {membros?.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.nome}</option>
              ))}
            </Selecao>
          </Campo>
        ) : null}
        <Campo rotulo="Vencimento" obrigatorio erro={e.vencimento?.message}>
          <Entrada type="date" {...f.register('vencimento')} />
        </Campo>
        <Campo rotulo="Pago em" erro={e.pago_em?.message} dica="Vazio = ainda não pago.">
          <Entrada type="date" {...f.register('pago_em')} />
        </Campo>
        <Campo rotulo="Forma" erro={e.forma_pagamento?.message} className="col-span-2 md:col-span-1">
          <Selecao {...f.register('forma_pagamento')}>
            <option value="">Não informada</option>
            {FORMAS_LANCAMENTO.map((x) => (
              <option key={x} value={x}>{ROTULO_FORMA[x]}</option>
            ))}
          </Selecao>
        </Campo>
      </form>
    </Modal>
  );
}
