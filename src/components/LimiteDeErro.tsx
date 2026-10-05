import { Component, type ReactNode } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';

type Props = { children: ReactNode; chave?: string };
type Estado = { erro: Error | null };

/** Se uma tela quebrar, mostra uma mensagem com "Recarregar" em vez de deixar a página em branco. */
export class LimiteDeErro extends Component<Props, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  componentDidUpdate(anterior: Props) {
    // Ao trocar de página, tenta de novo
    if (anterior.chave !== this.props.chave && this.state.erro) this.setState({ erro: null });
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-lg bg-atrasado-bg px-6 py-10 text-center text-atrasado-fg">
        <WarningCircle size={32} aria-hidden />
        <p className="text-lg font-medium">Esta tela teve um problema</p>
        <p className="max-w-md text-md">{this.state.erro.message}</p>
        <Botao variante="secundario" onClick={() => window.location.reload()}>
          Recarregar
        </Botao>
      </div>
    );
  }
}
