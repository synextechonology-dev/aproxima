import { useState, type ReactNode } from 'react';
import { Modal } from '@/components/ui/dialogo';
import { Botao } from '@/components/ui/botao';
import { AreaTexto, Campo } from '@/components/ui/campos';

/**
 * Confirmação de ação. Com `motivo`, pede o texto (obrigatório) antes de liberar o botão,
 * como em cancelar venda ou ajustar placa.
 */
type Props = {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  titulo: string;
  texto?: ReactNode;
  botao: string;
  perigo?: boolean;
  motivo?: { rotulo: string; dica?: string };
  maxMotivo?: number;
  aoConfirmar: (motivo: string) => void | Promise<void>;
  carregando?: boolean;
  children?: ReactNode;
};

export function Confirmar(props: Props) {
  // Só monta aberto: o motivo começa vazio a cada abertura
  return props.aberto ? <ConfirmarAberto {...props} /> : null;
}

function ConfirmarAberto({
  aberto,
  aoMudar,
  titulo,
  texto,
  botao,
  perigo,
  motivo,
  maxMotivo = 300,
  aoConfirmar,
  carregando,
  children,
}: Props) {
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string>();

  const confirmar = async () => {
    if (motivo && !valor.trim()) {
      setErro('Informe o motivo');
      return;
    }
    if (valor.length > maxMotivo) {
      setErro(`Até ${maxMotivo} caracteres`);
      return;
    }
    await aoConfirmar(valor.trim());
  };

  return (
    <Modal
      aberto={aberto}
      aoMudar={aoMudar}
      titulo={titulo}
      rodape={
        <>
          <Botao onClick={() => aoMudar(false)}>Voltar</Botao>
          <Botao variante={perigo ? 'perigo' : 'principal'} onClick={() => void confirmar()} carregando={carregando}>
            {botao}
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {texto ? <div className="text-md text-text-muted">{texto}</div> : null}
        {children}
        {motivo ? (
          <Campo rotulo={motivo.rotulo} obrigatorio erro={erro} dica={motivo.dica}>
            <AreaTexto autoFocus rows={3} maxLength={maxMotivo} value={valor} onChange={(e) => setValor(e.target.value)} />
          </Campo>
        ) : null}
      </div>
    </Modal>
  );
}
