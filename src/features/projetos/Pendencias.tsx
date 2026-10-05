import { useState } from 'react';
import { ArrowCounterClockwise, Check, CheckCircle, HourglassMedium, Plus, Trash, WhatsappLogo } from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { Entrada } from '@/components/ui/campos';
import { Secao } from '@/components/layout';
import { diasEntre, formatarData, hojeSP } from '@/lib/formato';
import { abrirExterno, linkWhatsApp } from '@/lib/contato';
import { usePendencias, type DadosProjeto } from './dados';

export function Pendencias({ d, editavel }: { d: DadosProjeto; editavel: boolean }) {
  const p = usePendencias(d.projeto.id);
  const [texto, setTexto] = useState('');
  const hoje = hojeSP();
  const abertas = d.pendencias.filter((x) => !x.resolvido_em);
  const ordenadas = [...abertas, ...d.pendencias.filter((x) => x.resolvido_em)];

  const cobrar = (descricao: string) => {
    const nome = d.cliente.contato_nome || d.cliente.nome;
    const wa = linkWhatsApp(d.cliente.telefone, `Olá, ${nome}! Para seguirmos com o seu projeto, ainda falta: ${descricao}. Consegue enviar?`);
    if (wa) abrirExterno(wa);
  };

  return (
    <Secao titulo="Pendências do cliente" extra={<span className="text-sm text-text-muted">{abertas.length} {abertas.length === 1 ? 'aberta' : 'abertas'}</span>}>
      {!ordenadas.length ? <p className="text-md text-text-muted">Nada pendente com o cliente.</p> : null}
      <ul className="flex flex-col gap-2">
        {ordenadas.map((x) => {
          const dias = diasEntre(x.pedido_em, hoje);
          return (
            <li key={x.id} className="flex items-start gap-3">
              {x.resolvido_em ? (
                <CheckCircle size={20} className="mt-0.5 shrink-0 text-text-muted" aria-label="Resolvida" />
              ) : (
                <HourglassMedium size={20} className="mt-0.5 shrink-0 text-hoje-fg" aria-label="Aberta" />
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className={x.resolvido_em ? 'text-text-muted' : ''}>{x.descricao}</span>
                <span className={x.resolvido_em ? 'text-sm text-text-muted' : 'text-sm text-hoje-fg'}>
                  {x.resolvido_em ? `resolvido em ${formatarData(x.resolvido_em)}` : `pedido em ${formatarData(x.pedido_em)}${dias > 0 ? ` · ${dias} ${dias === 1 ? 'dia' : 'dias'}` : ''}`}
                </span>
                {!x.resolvido_em && editavel ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Botao variante="fantasma" onClick={() => p.resolver.mutate({ id: x.id, data: hoje })}>
                      <Check size={16} aria-hidden />
                      Marcar resolvida
                    </Botao>
                    {d.cliente.telefone ? (
                      <Botao variante="fantasma" onClick={() => cobrar(x.descricao)}>
                        <WhatsappLogo size={16} aria-hidden />
                        Cobrar pendência
                      </Botao>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {editavel ? (
                x.resolvido_em ? (
                  <Botao variante="fantasma" tamanho="icone" aria-label="Reabrir pendência" onClick={() => p.resolver.mutate({ id: x.id, data: null })}>
                    <ArrowCounterClockwise size={16} aria-hidden />
                  </Botao>
                ) : (
                  <Botao variante="fantasma" tamanho="icone" aria-label="Apagar pendência" onClick={() => p.apagar.mutate(x.id)}>
                    <Trash size={16} aria-hidden />
                  </Botao>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
      {editavel ? (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const t = texto.trim();
            if (!t || t.length > 300) return;
            const ok = await p.criar.mutateAsync({ descricao: t, pedido_em: hoje }).catch(() => null);
            if (ok) setTexto('');
          }}
        >
          <label htmlFor="nova-pendencia" className="sr-only">Nova pendência</label>
          <Entrada id="nova-pendencia" value={texto} maxLength={300} onChange={(e) => setTexto(e.target.value)} placeholder="O que falta o cliente mandar?" />
          <Botao type="submit" disabled={!texto.trim()} carregando={p.criar.isPending}>
            <Plus size={16} aria-hidden />
            Registrar
          </Botao>
        </form>
      ) : null}
    </Secao>
  );
}
