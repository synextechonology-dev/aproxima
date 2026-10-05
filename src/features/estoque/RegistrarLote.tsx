import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Info } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/dialogo';
import { Botao } from '@/components/ui/botao';
import { AreaTexto, Campo, Entrada, Marcar, Selecao } from '@/components/ui/campos';
import { FORMAS_PAGAMENTO, ROTULO_FORMA } from '@/lib/rotulos';
import { formatarMoeda, hojeSP } from '@/lib/formato';
import { esquemaLote, type LoteEntrada, type LoteSaida } from './schemas';
import { useLotes, useRegistrarLote } from './dados';

type Props = { aberto: boolean; aoMudar: (v: boolean) => void };

export function RegistrarLote(props: Props) {
  return props.aberto ? <RegistrarLoteAberto {...props} /> : null;
}

function RegistrarLoteAberto({ aberto, aoMudar }: Props) {
  const registrar = useRegistrarLote();
  const { data: lotes } = useLotes();
  const fornecedores = [...new Set((lotes ?? []).map((l) => l.fornecedor).filter(Boolean))] as string[];
  const f = useForm<LoteEntrada, unknown, LoteSaida>({
    resolver: zodResolver(esquemaLote),
    defaultValues: {
      p_fornecedor: lotes?.[0]?.fornecedor ?? '',
      p_data_compra: hojeSP(),
      p_quantidade: '',
      p_valor_pago: '',
      p_frete: '',
      p_outras_taxas: '',
      p_forma: 'pix',
      p_pago: true,
      p_observacoes: '',
    },
  });
  const e = f.formState.errors;

  const enviar = f.handleSubmit(async (dados) => {
    const lote = await registrar.mutateAsync(dados).catch(() => null);
    if (!lote) return;
    // O custo por placa (com frete e taxas) é calculado pelo banco
    toast.success(`${lote.codigo} registrado: ${lote.quantidade} placas a ${formatarMoeda(lote.custo_unitario)} cada (custo total ${formatarMoeda(lote.custo_total)})`);
    aoMudar(false);
  });

  return (
    <Modal
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Registrar lote"
      descricao="As placas entram como disponíveis, sem link gravado."
      rodape={
        <>
          <Botao onClick={() => aoMudar(false)}>Cancelar</Botao>
          <Botao type="submit" form="form-lote" variante="principal" carregando={f.formState.isSubmitting}>
            <Check size={18} aria-hidden />
            Registrar lote
          </Botao>
        </>
      }
    >
      <form id="form-lote" onSubmit={enviar} noValidate className="grid grid-cols-2 gap-4">
        <Campo rotulo="Fornecedor" obrigatorio erro={e.p_fornecedor?.message} className="col-span-2">
          <Entrada list="fornecedores" autoFocus {...f.register('p_fornecedor')} />
        </Campo>
        <datalist id="fornecedores">
          {fornecedores.map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
        <Campo rotulo="Data da compra" obrigatorio erro={e.p_data_compra?.message}>
          <Entrada type="date" {...f.register('p_data_compra')} />
        </Campo>
        <Campo rotulo="Quantidade de placas" obrigatorio erro={e.p_quantidade?.message}>
          <Entrada inputMode="numeric" {...f.register('p_quantidade')} />
        </Campo>
        <Campo rotulo="Valor pago (R$)" obrigatorio erro={e.p_valor_pago?.message}>
          <Entrada inputMode="decimal" placeholder="0,00" {...f.register('p_valor_pago')} />
        </Campo>
        <Campo rotulo="Frete (R$)" erro={e.p_frete?.message}>
          <Entrada inputMode="decimal" placeholder="0,00" {...f.register('p_frete')} />
        </Campo>
        <Campo rotulo="Outras taxas (R$)" erro={e.p_outras_taxas?.message}>
          <Entrada inputMode="decimal" placeholder="0,00" {...f.register('p_outras_taxas')} />
        </Campo>
        <Campo rotulo="Pago com" erro={e.p_forma?.message}>
          <Selecao {...f.register('p_forma')}>
            {FORMAS_PAGAMENTO.map((x) => (
              <option key={x} value={x}>
                {ROTULO_FORMA[x]}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Marcar rotulo="Já foi pago" className="col-span-2" {...f.register('p_pago')} />
        <Campo rotulo="Observações" erro={e.p_observacoes?.message} className="col-span-2">
          <AreaTexto rows={2} {...f.register('p_observacoes')} />
        </Campo>
        <p className="col-span-2 flex items-start gap-2 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent-text">
          <Info size={18} className="mt-0.5 shrink-0" aria-hidden />
          O banco gera os códigos AP- das placas, calcula o custo por placa (com frete e taxas) e lança a compra no Financeiro.
        </p>
      </form>
    </Modal>
  );
}
