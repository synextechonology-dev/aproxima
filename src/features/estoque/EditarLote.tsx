import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { FloppyDisk } from '@phosphor-icons/react';
import { Modal } from '@/components/ui/dialogo';
import { Botao } from '@/components/ui/botao';
import { AreaTexto, Campo, Entrada } from '@/components/ui/campos';
import { esquemaEditarLote } from './schemas';
import { useEditarLote } from './dados';

type Lote = { id: string; codigo: string | null; fornecedor: string; observacoes: string | null };
type Props = { lote: Lote | null; aoFechar: () => void };

export function EditarLote(props: Props) {
  return props.lote ? <EditarLoteAberto lote={props.lote} aoFechar={props.aoFechar} /> : null;
}

function EditarLoteAberto({ lote, aoFechar }: { lote: Lote; aoFechar: () => void }) {
  const editar = useEditarLote();
  const f = useForm<z.input<typeof esquemaEditarLote>, unknown, z.output<typeof esquemaEditarLote>>({
    resolver: zodResolver(esquemaEditarLote),
    defaultValues: { fornecedor: lote.fornecedor, observacoes: lote.observacoes ?? '' },
  });
  const enviar = f.handleSubmit(async (d) => {
    const ok = await editar.mutateAsync({ id: lote.id, ...d }).catch(() => null);
    if (ok) aoFechar();
  });
  return (
    <Modal
      aberto
      aoMudar={(v) => !v && aoFechar()}
      titulo={`Editar ${lote.codigo}`}
      descricao="Quantidade e valores não mudam depois de registrados."
      rodape={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao type="submit" form="form-editar-lote" variante="principal" carregando={f.formState.isSubmitting}>
            <FloppyDisk size={18} aria-hidden />
            Salvar lote
          </Botao>
        </>
      }
    >
      <form id="form-editar-lote" onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <Campo rotulo="Fornecedor" obrigatorio erro={f.formState.errors.fornecedor?.message}>
          <Entrada {...f.register('fornecedor')} />
        </Campo>
        <Campo rotulo="Observações" erro={f.formState.errors.observacoes?.message}>
          <AreaTexto rows={3} {...f.register('observacoes')} />
        </Campo>
      </form>
    </Modal>
  );
}
