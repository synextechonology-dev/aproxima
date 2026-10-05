import { useState } from 'react';
import { Plus, Trash } from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { Campo, Entrada, Selecao } from '@/components/ui/campos';
import { Secao } from '@/components/layout';
import { formatarDataHora } from '@/lib/formato';
import { GRUPOS_TAREFA, ROTULO_GRUPO_TAREFA } from '@/lib/rotulos';
import { cn } from '@/lib/utils';
import { useTarefas, type DadosProjeto } from './dados';

export function Checklist({ d, editavel }: { d: DadosProjeto; editavel: boolean }) {
  const t = useTarefas(d.projeto.id);
  const [grupo, setGrupo] = useState<string>(d.tarefas[0]?.grupo ?? 'outro');
  const [titulo, setTitulo] = useState('');
  const feitas = d.tarefas.filter((x) => x.feito_em).length;
  const grupos = GRUPOS_TAREFA.filter((g) => d.tarefas.some((x) => x.grupo === g));

  const incluir = async () => {
    const tt = titulo.trim();
    if (!tt || tt.length > 200) return;
    const ordem = Math.max(0, ...d.tarefas.filter((x) => x.grupo === grupo).map((x) => x.ordem)) + 1;
    const ok = await t.criar.mutateAsync({ grupo, titulo: tt, ordem }).catch(() => null);
    if (ok) setTitulo('');
  };

  return (
    <Secao titulo="Checklist" extra={<span className="num text-sm text-text-muted">{feitas} de {d.tarefas.length} feitos</span>}>
      {!d.tarefas.length ? <p className="text-md text-text-muted">Nenhum item. Inclua os passos da entrega abaixo.</p> : null}
      {grupos.map((g) => (
        <div key={g} className="flex flex-col gap-1">
          <h3 className="text-sm text-text-muted">
            {ROTULO_GRUPO_TAREFA[g]} · {d.tarefas.filter((x) => x.grupo === g && x.feito_em).length} de {d.tarefas.filter((x) => x.grupo === g).length}
          </h3>
          <ul className="flex flex-col">
            {d.tarefas
              .filter((x) => x.grupo === g)
              .map((x) => (
                <li key={x.id} className="flex items-center gap-2">
                  <label className="flex min-h-(--tap-min) md:min-h-[36px] flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      className="size-[20px] cursor-pointer accent-accent"
                      checked={!!x.feito_em}
                      disabled={!editavel || t.marcar.isPending}
                      onChange={(e) => t.marcar.mutate({ id: x.id, feito: e.target.checked })}
                    />
                    <span className={cn('flex-1', x.feito_em && 'text-text-muted line-through')}>{x.titulo}</span>
                    {x.feito_em ? <span className="num text-xs text-text-muted">{formatarDataHora(x.feito_em).slice(0, 5)}</span> : null}
                  </label>
                  {editavel ? (
                    <Botao variante="fantasma" tamanho="icone" aria-label={`Remover ${x.titulo}`} onClick={() => t.apagar.mutate(x.id)}>
                      <Trash size={16} aria-hidden />
                    </Botao>
                  ) : null}
                </li>
              ))}
          </ul>
        </div>
      ))}
      {editavel ? (
        <form
          className="flex flex-col gap-2 md:flex-row md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void incluir();
          }}
        >
          <Campo rotulo="Grupo" className="md:w-48">
            <Selecao value={grupo} onChange={(e) => setGrupo(e.target.value)}>
              {GRUPOS_TAREFA.map((g) => (
                <option key={g} value={g}>{ROTULO_GRUPO_TAREFA[g]}</option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Novo item" className="flex-1" erro={titulo.length > 200 ? 'Até 200 caracteres' : undefined}>
            <Entrada value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Enviar fotos do balcão" />
          </Campo>
          <Botao type="submit" disabled={!titulo.trim()} carregando={t.criar.isPending}>
            <Plus size={16} aria-hidden />
            Incluir item
          </Botao>
        </form>
      ) : null}
    </Secao>
  );
}
