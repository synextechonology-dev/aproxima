import { useRef, useState } from 'react';
import { CheckCircle, DownloadSimple, FileCsv, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import { Modal } from '@/components/ui/dialogo';
import { Botao } from '@/components/ui/botao';
import { baixarCsv } from '@/lib/csv';
import { formatarNumero } from '@/lib/formato';
import { mensagemDeErro } from '@/lib/erros';
import { COLUNAS_IMPORTACAO, lerCsv, type Previa } from './importacao';
import { useImportarLeads, type ResultadoImportacao } from './dados';

const MAXIMO = 2000;

export function ImportarCsv(props: { aberto: boolean; aoMudar: (v: boolean) => void }) {
  return props.aberto ? <ImportarCsvAberto {...props} /> : null;
}

function ImportarCsvAberto({ aberto, aoMudar }: { aberto: boolean; aoMudar: (v: boolean) => void }) {
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [arquivo, setArquivo] = useState<string>('');
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const importar = useImportarLeads();
  const entrada = useRef<HTMLInputElement>(null);

  const escolher = async (f: File | undefined) => {
    if (!f) return;
    setErro(null);
    setResultado(null);
    setArquivo(f.name);
    try {
      const p = await lerCsv(f);
      if (!p.reconhecidas.includes('nome') || !p.reconhecidas.includes('cidade')) {
        setErro('O arquivo precisa das colunas nome e cidade. Baixe o modelo para ver o formato.');
        setPrevia(null);
        return;
      }
      setPrevia(p);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  const enviar = async () => {
    if (!previa) return;
    const r = await importar.mutateAsync(previa.linhas).catch(() => null);
    if (r) setResultado(r);
  };

  const demais = (previa?.linhas.length ?? 0) > MAXIMO;

  return (
    <Modal
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Importar leads de CSV"
      descricao="Confira a prévia antes de importar. Leads repetidos (mesmo link do Google ou telefone) são pulados."
      className="md:w-[min(760px,calc(100vw-32px))]"
      rodape={
        resultado ? (
          <Botao variante="principal" onClick={() => aoMudar(false)}>
            Concluir
          </Botao>
        ) : (
          <>
            <Botao onClick={() => aoMudar(false)}>Cancelar</Botao>
            <Botao variante="principal" disabled={!previa || demais || !previa.linhas.length} carregando={importar.isPending} onClick={() => void enviar()}>
              <UploadSimple size={18} aria-hidden />
              {previa ? `Importar ${formatarNumero(previa.linhas.length)} leads` : 'Importar leads'}
            </Botao>
          </>
        )
      }
    >
      {resultado ? (
        <div className="flex flex-col gap-4">
          <p className="flex items-center gap-2 text-lg">
            <CheckCircle size={22} className="text-ok-fg" aria-hidden />
            {formatarNumero(resultado.inseridos)} de {formatarNumero(resultado.total)} leads importados
          </p>
          {resultado.duplicados.length ? (
            <details className="rounded-md bg-bg p-3" open={resultado.duplicados.length <= 10}>
              <summary className="cursor-pointer">{formatarNumero(resultado.duplicados.length)} repetidos, pulados</summary>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-text-muted">
                {resultado.duplicados.map((d) => (
                  <li key={d.linha}>
                    Linha {d.linha}: {d.nome ?? 'sem nome'}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {resultado.erros.length ? (
            <details className="rounded-md bg-atrasado-bg p-3 text-atrasado-fg" open>
              <summary className="cursor-pointer">{formatarNumero(resultado.erros.length)} com erro, não importados</summary>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {resultado.erros.map((d) => (
                  <li key={d.linha}>
                    Linha {d.linha} ({d.nome ?? 'sem nome'}): {d.erro}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <input
              ref={entrada}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              aria-label="Arquivo CSV"
              onChange={(e) => void escolher(e.target.files?.[0])}
            />
            <Botao variante="principal" onClick={() => entrada.current?.click()}>
              <FileCsv size={18} aria-hidden />
              {arquivo ? 'Escolher outro arquivo' : 'Escolher arquivo CSV'}
            </Botao>
            <Botao onClick={() => baixarCsv('modelo-leads-aproxima.csv', [], [...COLUNAS_IMPORTACAO])}>
              <DownloadSimple size={18} aria-hidden />
              Baixar modelo
            </Botao>
          </div>
          {arquivo ? <p className="text-sm text-text-muted">Arquivo: {arquivo}</p> : null}
          {erro ? (
            <p role="alert" className="flex items-start gap-2 rounded-md bg-atrasado-bg px-3 py-2 text-atrasado-fg">
              <WarningCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
              {erro}
            </p>
          ) : null}
          {previa ? (
            <>
              <ul className="flex flex-col gap-1 text-md">
                <li>{formatarNumero(previa.linhas.length)} linhas encontradas</li>
                <li className="text-text-muted">Colunas usadas: {previa.reconhecidas.join(', ')}</li>
                {previa.ignoradas.length ? <li className="text-text-muted">Colunas ignoradas: {previa.ignoradas.join(', ')}</li> : null}
                {previa.semNomeOuCidade ? (
                  <li className="text-hoje-fg">
                    {formatarNumero(previa.semNomeOuCidade)} linhas sem nome ou cidade: o banco vai recusar essas.
                  </li>
                ) : null}
                {demais ? (
                  <li className="text-atrasado-fg">Máximo de {formatarNumero(MAXIMO)} linhas por importação. Divida o arquivo.</li>
                ) : null}
              </ul>
              <div className="overflow-x-auto rounded-md border border-divider">
                <table className="w-full text-sm">
                  <caption className="sr-only">Prévia das primeiras linhas</caption>
                  <thead className="text-left text-xs text-text-muted">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Nome</th>
                      <th className="px-3 py-2">Cidade</th>
                      <th className="px-3 py-2">Telefone</th>
                      <th className="px-3 py-2">Google</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previa.linhas.slice(0, 10).map((l, i) => (
                      <tr key={i} className="border-t border-divider">
                        <td className="num px-3 py-2 text-text-muted">{i + 1}</td>
                        <td className="px-3 py-2">{l.nome || <span className="text-atrasado-fg">faltando</span>}</td>
                        <td className="px-3 py-2">{l.cidade || <span className="text-atrasado-fg">faltando</span>}</td>
                        <td className="px-3 py-2">{l.telefone}</td>
                        <td className="max-w-48 truncate px-3 py-2">{l.google_url}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previa.linhas.length > 10 ? (
                <p className="text-sm text-text-muted">Mostrando 10 de {formatarNumero(previa.linhas.length)}.</p>
              ) : null}
            </>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
