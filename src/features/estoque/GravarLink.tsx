import { useMemo, useState, type ReactNode } from 'react';
import { CheckCircle, Copy, Info, PencilSimpleLine, WarningCircle, WifiHigh } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/dialogo';
import { Botao } from '@/components/ui/botao';
import { Campo, Entrada } from '@/components/ui/campos';
import { RE_HTTPS } from '@/lib/zod';
import { mensagemDeErro } from '@/lib/erros';
import { ROTULO_STATUS_PLACA, type StatusPlaca } from '@/lib/rotulos';
import { formatarDataHora } from '@/lib/formato';
import { STATUS_QUE_REDIRECIONAM, destinoEhGoogle, gravarNoChip, linkDaPlaca, situacaoDominio, temWebNfc } from '@/lib/placa';
import { useAtualizarPlaca, usePlacas, type PlacaV } from './dados';

type Props = { aberto: boolean; aoMudar: (v: boolean) => void; placaInicial?: PlacaV | null; sugestaoDestino?: string | null };

export function GravarLink(props: Props) {
  return props.aberto ? <GravarLinkAberto {...props} /> : null;
}

function Aviso({ tom, children }: { tom: 'atrasado' | 'hoje' | 'info'; children: ReactNode }) {
  const cls = tom === 'atrasado' ? 'bg-atrasado-bg text-atrasado-fg' : tom === 'hoje' ? 'bg-hoje-bg text-hoje-fg' : 'bg-accent-soft text-accent-text';
  const Icone = tom === 'info' ? Info : WarningCircle;
  return (
    <p className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${cls}`}>
      <Icone size={18} className="mt-0.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Mostra o link do chip, salva o destino e grava pelo Web NFC (Android) ou copia. */
function GravarLinkAberto({ aberto, aoMudar, placaInicial, sugestaoDestino }: Props) {
  const { data: placas } = usePlacas();
  const [codigo, setCodigo] = useState(placaInicial?.codigo ?? '');
  const placa = useMemo(
    () => placaInicial ?? placas?.find((p) => p.codigo?.toUpperCase() === codigo.trim().toUpperCase()) ?? null,
    [placas, codigo, placaInicial],
  );
  const [destino, setDestino] = useState(placaInicial?.destino_url ?? sugestaoDestino ?? '');
  const [gravando, setGravando] = useState(false);
  const atualizar = useAtualizarPlaca();
  const dominio = situacaoDominio();
  const link = placa?.token ? linkDaPlaca(placa.token) : null;
  const bloqueado = dominio === 'vercel';
  const destinoValido = destino.trim() === '' || (RE_HTTPS.test(destino.trim()) && destino.trim().length <= 500);

  const salvarDestino = async () => {
    if (!placa?.id || !destinoValido) return false;
    const novo = destino.trim() || null;
    if (novo === (placa.destino_url ?? null)) return true;
    return !!(await atualizar.mutateAsync({ id: placa.id, dados: { destino_url: novo } }).catch(() => null));
  };

  const marcarGravada = async () => {
    if (!placa?.id) return;
    await atualizar.mutateAsync({ id: placa.id, dados: { gravada_em: new Date().toISOString() } }).catch(() => null);
  };

  const copiar = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copiado. Grave no chip com um app de NFC e depois marque como gravada.');
    } catch {
      toast.error('Não foi possível copiar. Selecione o link e copie à mão.');
    }
  };

  const gravarNfc = async () => {
    if (!link || !placa) return;
    if (!(await salvarDestino())) return;
    setGravando(true);
    toast.info('Encoste o chip na parte de trás do celular…');
    try {
      await gravarNoChip(link);
      await marcarGravada();
      toast.success(`${placa.codigo} gravada`);
    } catch (e) {
      toast.error(`Não gravou: ${mensagemDeErro(e)}. Tente de novo ou copie o link.`);
    } finally {
      setGravando(false);
    }
  };

  return (
    <Modal aberto={aberto} aoMudar={aoMudar} titulo="Gravar link na placa" descricao="O chip recebe o endereço da placa; o destino (avaliação do Google) pode mudar depois sem regravar.">
      <div className="flex flex-col gap-4">
        {!placaInicial ? (
          <Campo rotulo="Código da placa" dica="Ex.: AP-0042">
            <Entrada list="codigos-placas" value={codigo} onChange={(e) => setCodigo(e.target.value)} autoFocus autoCapitalize="characters" />
          </Campo>
        ) : null}
        <datalist id="codigos-placas">
          {placas?.slice(0, 300).map((p) => (
            <option key={p.id} value={p.codigo ?? ''} />
          ))}
        </datalist>

        {codigo && !placa ? <Aviso tom="hoje">Nenhuma placa com esse código.</Aviso> : null}

        {placa ? (
          <>
            <p className="text-sm text-text-muted">
              {placa.codigo} · {ROTULO_STATUS_PLACA[placa.status as StatusPlaca] ?? placa.status}
              {placa.cliente_nome ? ` · ${placa.cliente_nome}` : ''}
              {placa.gravada_em ? ` · gravada em ${formatarDataHora(placa.gravada_em)}` : ' · ainda não gravada'}
            </p>

            <Campo
              rotulo="Destino (link de avaliação do Google)"
              erro={destinoValido ? undefined : 'Precisa começar com https:// (até 500 caracteres)'}
              dica={destino && destinoValido && !destinoEhGoogle(destino.trim()) ? 'Atenção: a placa só redireciona para endereços do Google (g.page, google.com, maps.app.goo.gl…).' : undefined}
            >
              <Entrada type="url" inputMode="url" placeholder="https://g.page/r/…/review" value={destino} onChange={(e) => setDestino(e.target.value)} />
            </Campo>
            <div>
              <Botao onClick={() => void salvarDestino().then((ok) => ok && toast.success('Destino salvo'))} disabled={!destinoValido} carregando={atualizar.isPending}>
                Salvar destino
              </Botao>
            </div>

            {!STATUS_QUE_REDIRECIONAM.includes(placa.status ?? '') ? (
              <Aviso tom="info">O toque só redireciona quando a placa está vendida, instalada ou em demonstração, com destino e link ativo.</Aviso>
            ) : null}
            {placa.ativo === false ? <Aviso tom="hoje">O link desta placa está desativado.</Aviso> : null}

            <div className="flex flex-col gap-2">
              <span className="text-xs text-text-muted">Endereço para o chip</span>
              <code className="num rounded-md bg-bg px-3 py-3 text-md break-all select-all">{link}</code>
            </div>

            {bloqueado ? (
              <Aviso tom="atrasado">
                Você abriu o app por um endereço *.vercel.app. Nunca grave placa com esse domínio: abra pelo domínio próprio definitivo.
              </Aviso>
            ) : dominio === 'local' ? (
              <Aviso tom="hoje">Endereço local, só para teste. Para gravar de verdade, abra pelo domínio próprio.</Aviso>
            ) : null}

            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
              {temWebNfc() ? (
                <Botao variante="principal" onClick={() => void gravarNfc()} carregando={gravando} disabled={bloqueado || !destinoValido}>
                  <WifiHigh size={18} aria-hidden />
                  Gravar no chip agora
                </Botao>
              ) : null}
              <Botao variante={temWebNfc() ? 'secundario' : 'principal'} onClick={() => void copiar()} disabled={bloqueado}>
                <Copy size={18} aria-hidden />
                Copiar link
              </Botao>
              <Botao onClick={() => void marcarGravada()} disabled={bloqueado}>
                {placa.gravada_em ? <CheckCircle size={18} aria-hidden /> : <PencilSimpleLine size={18} aria-hidden />}
                {placa.gravada_em ? 'Marcar como gravada de novo' : 'Marcar como gravada'}
              </Botao>
            </div>
            {!temWebNfc() ? (
              <p className="text-sm text-text-muted">Este navegador não grava NFC. No Android, abra no Chrome para gravar direto; no iPhone, copie e use um app de NFC.</p>
            ) : null}
          </>
        ) : null}
      </div>
    </Modal>
  );
}
