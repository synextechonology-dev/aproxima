import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { CaretLeft, CaretRight, FloppyDisk, PencilSimple, Plus, SignOut } from '@phosphor-icons/react';
import { Botao } from '@/components/ui/botao';
import { AreaTexto, Campo, Entrada, Selecao } from '@/components/ui/campos';
import { Modal } from '@/components/ui/dialogo';
import { Cabecalho, Secao } from '@/components/layout';
import { Carregando, ErroCarga } from '@/components/estados';
import { Selo } from '@/components/selo';
import { AlternarTema } from '@/components/AlternarTema';
import { useAuth } from '@/app/auth-contexto';
import { useConfiguracoes, useMembros, useNomeMembro, useProdutos } from '@/hooks/useBase';
import { CATEGORIAS_PRODUTO, ROTULO_CATEGORIA_PRODUTO, ROTULO_OPERACAO, ROTULO_TABELA, rotulo } from '@/lib/rotulos';
import { formatarDataHora, formatarMoeda } from '@/lib/formato';
import { numParaCampo, reaisParaCampo } from '@/lib/zod';
import type { Auditoria, Configuracoes, Produto } from '@/lib/tipos';
import { CheckCircle, XCircle } from '@phosphor-icons/react';
import { esquemaConfig, esquemaProduto } from './schemas';
import { useAuditoria, useSalvarConfig, useSalvarProduto } from './dados';

function FormConfig({ c }: { c: Configuracoes }) {
  const salvar = useSalvarConfig();
  const f = useForm<z.input<typeof esquemaConfig>, unknown, z.output<typeof esquemaConfig>>({
    resolver: zodResolver(esquemaConfig),
    defaultValues: {
      estoque_minimo: String(c.estoque_minimo),
      taxa_credito_pct: numParaCampo(c.taxa_credito_pct),
      taxa_debito_pct: numParaCampo(c.taxa_debito_pct),
      janela_toque_segundos: String(c.janela_toque_segundos),
      limite_toques_dia: String(c.limite_toques_dia),
    },
  });
  const e = f.formState.errors;
  return (
    <Secao titulo="Regras do negócio" extra={<span className="text-xs text-text-muted">atualizado em {formatarDataHora(c.updated_at, true)}</span>}>
      <form
        noValidate
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        onSubmit={f.handleSubmit(async (d) => {
          await salvar.mutateAsync(d).catch(() => null);
        })}
      >
        <Campo rotulo="Estoque mínimo (placas)" erro={e.estoque_minimo?.message} dica="Abaixo disso, o Painel avisa para repor.">
          <Entrada inputMode="numeric" {...f.register('estoque_minimo')} />
        </Campo>
        <div className="hidden md:block" />
        <Campo rotulo="Taxa padrão do cartão de crédito (%)" erro={e.taxa_credito_pct?.message} dica="Preenche a taxa da venda ao escolher crédito.">
          <Entrada inputMode="decimal" {...f.register('taxa_credito_pct')} />
        </Campo>
        <Campo rotulo="Taxa padrão do cartão de débito (%)" erro={e.taxa_debito_pct?.message} dica="Preenche a taxa da venda ao escolher débito.">
          <Entrada inputMode="decimal" {...f.register('taxa_debito_pct')} />
        </Campo>
        <Campo rotulo="Intervalo entre toques contados (segundos)" erro={e.janela_toque_segundos?.message} dica="Toques seguidos nesse intervalo contam uma vez.">
          <Entrada inputMode="numeric" {...f.register('janela_toque_segundos')} />
        </Campo>
        <Campo rotulo="Limite de toques contados por dia, por placa" erro={e.limite_toques_dia?.message} dica="Acima disso a placa redireciona, mas não conta.">
          <Entrada inputMode="numeric" {...f.register('limite_toques_dia')} />
        </Campo>
        <div className="md:col-span-2">
          <Botao type="submit" variante="principal" carregando={f.formState.isSubmitting}>
            <FloppyDisk size={18} aria-hidden />
            Salvar configurações
          </Botao>
        </div>
      </form>
    </Secao>
  );
}

function FormProduto({ produto, aoFechar }: { produto: Produto | 'novo'; aoFechar: () => void }) {
  const p = produto === 'novo' ? null : produto;
  const salvar = useSalvarProduto();
  const { data: produtos } = useProdutos();
  const jaTemPlaca = produtos?.some((x) => x.categoria === 'placa');
  const f = useForm<z.input<typeof esquemaProduto>, unknown, z.output<typeof esquemaProduto>>({
    resolver: zodResolver(esquemaProduto),
    defaultValues: {
      nome: p?.nome ?? '',
      descricao: p?.descricao ?? '',
      categoria: (p?.categoria as z.input<typeof esquemaProduto>['categoria']) ?? 'outro',
      preco_padrao: reaisParaCampo(p?.preco_padrao),
      custo_padrao: reaisParaCampo(p?.custo_padrao),
    },
  });
  const e = f.formState.errors;
  return (
    <Modal
      aberto
      aoMudar={(v) => !v && aoFechar()}
      titulo={p ? `Editar ${p.nome}` : 'Novo produto'}
      descricao="Mudar o preço aqui não altera vendas já registradas."
      rodape={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao type="submit" form="form-produto" variante="principal" carregando={f.formState.isSubmitting}>
            <FloppyDisk size={18} aria-hidden />
            Salvar produto
          </Botao>
        </>
      }
    >
      <form
        id="form-produto"
        noValidate
        className="grid grid-cols-2 gap-4"
        onSubmit={f.handleSubmit(async (d) => {
          const ok = await salvar.mutateAsync({ id: p?.id, dados: d }).catch(() => null);
          if (ok) aoFechar();
        })}
      >
        <Campo rotulo="Nome" obrigatorio erro={e.nome?.message} className="col-span-2">
          <Entrada {...f.register('nome')} />
        </Campo>
        <Campo rotulo="Categoria" erro={e.categoria?.message} dica={p ? 'Não muda depois de criado.' : 'Só existe um produto do tipo placa.'}>
          <Selecao disabled={!!p} {...f.register('categoria')}>
            {CATEGORIAS_PRODUTO.filter((c) => p || c !== 'placa' || !jaTemPlaca).map((c) => (
              <option key={c} value={c}>{ROTULO_CATEGORIA_PRODUTO[c]}</option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Preço padrão (R$)" obrigatorio erro={e.preco_padrao?.message}>
          <Entrada inputMode="decimal" {...f.register('preco_padrao')} />
        </Campo>
        {p?.categoria !== 'placa' ? (
          <Campo rotulo="Custo padrão (R$)" erro={e.custo_padrao?.message} dica="Para serviços. A placa usa o custo do lote." className="col-span-2 md:col-span-1">
            <Entrada inputMode="decimal" {...f.register('custo_padrao')} />
          </Campo>
        ) : null}
        <Campo rotulo="Descrição" erro={e.descricao?.message} className="col-span-2">
          <AreaTexto rows={2} {...f.register('descricao')} />
        </Campo>
      </form>
    </Modal>
  );
}

function Produtos() {
  const q = useProdutos();
  const salvar = useSalvarProduto();
  const [editar, setEditar] = useState<Produto | 'novo' | null>(null);
  return (
    <Secao
      titulo="Produtos e preços"
      extra={
        <Botao onClick={() => setEditar('novo')}>
          <Plus size={16} aria-hidden />
          Novo produto
        </Botao>
      }
    >
      {q.isLoading ? (
        <Carregando linhas={3} />
      ) : q.isError ? (
        <ErroCarga erro={q.error} tentarDeNovo={() => void q.refetch()} />
      ) : (
        <ul className="flex flex-col divide-y divide-divider">
          {q.data?.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={p.ativo ? '' : 'text-text-muted line-through'}>{p.nome}</span>
                <span className="text-sm text-text-muted">
                  {ROTULO_CATEGORIA_PRODUTO[p.categoria as keyof typeof ROTULO_CATEGORIA_PRODUTO] ?? p.categoria} · {formatarMoeda(p.preco_padrao)}
                  {p.categoria !== 'placa' && Number(p.custo_padrao) > 0 ? ` · custo ${formatarMoeda(p.custo_padrao)}` : ''}
                </span>
              </span>
              <Selo icone={p.ativo ? CheckCircle : XCircle} texto={p.ativo ? 'Ativo' : 'Inativo'} tom={p.ativo ? 'ok' : 'apagado'} />
              <Botao variante="fantasma" onClick={() => setEditar(p)}>
                <PencilSimple size={16} aria-hidden />
                Editar
              </Botao>
              <Botao variante="fantasma" onClick={() => salvar.mutate({ id: p.id, dados: { ativo: !p.ativo } })}>
                {p.ativo ? 'Inativar' : 'Reativar'}
              </Botao>
            </li>
          ))}
        </ul>
      )}
      {editar ? <FormProduto produto={editar} aoFechar={() => setEditar(null)} /> : null}
    </Secao>
  );
}

/** Campos que mudaram (antes x depois), em texto. */
function mudancas(a: Auditoria): string {
  const antes = (a.antes ?? {}) as Record<string, unknown>;
  const depois = (a.depois ?? {}) as Record<string, unknown>;
  if (a.operacao === 'INSERT') return String(depois.nome ?? depois.codigo ?? depois.descricao ?? depois.titulo ?? '');
  if (a.operacao === 'DELETE') return String(antes.nome ?? antes.codigo ?? antes.descricao ?? antes.titulo ?? '');
  const ignorar = new Set(['updated_at', 'created_at']);
  return Object.keys(depois)
    .filter((k) => !ignorar.has(k) && JSON.stringify(antes[k]) !== JSON.stringify(depois[k]))
    .map((k) => `${k}: ${antes[k] ?? '—'} → ${depois[k] ?? '—'}`)
    .join(' · ');
}

function AuditoriaSecao() {
  const [tabela, setTabela] = useState('');
  const [pagina, setPagina] = useState(0);
  const q = useAuditoria(tabela, pagina);
  const nome = useNomeMembro();
  return (
    <Secao
      titulo="Auditoria"
      extra={
        <div className="w-48">
          <Selecao aria-label="Área" value={tabela} onChange={(e) => { setTabela(e.target.value); setPagina(0); }}>
            <option value="">Todas as áreas</option>
            {Object.entries(ROTULO_TABELA).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Selecao>
        </div>
      }
    >
      {q.isLoading ? (
        <Carregando linhas={4} />
      ) : q.isError ? (
        <ErroCarga erro={q.error} tentarDeNovo={() => void q.refetch()} />
      ) : !q.data?.linhas.length ? (
        <p className="text-md text-text-muted">Nenhuma alteração registrada{tabela ? ' nesta área' : ''}.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-divider">
          {q.data.linhas.map((a) => (
            <li key={a.id} className="flex flex-col gap-0.5 py-2">
              <span className="text-md">
                {a.user_id ? nome(a.user_id) : 'Sistema'} · {rotulo(ROTULO_OPERACAO, a.operacao)} em {rotulo(ROTULO_TABELA, a.tabela)}
              </span>
              <span className="text-sm break-words text-text-muted">{formatarDataHora(a.ocorreu_em, true)}{mudancas(a) ? ` · ${mudancas(a)}` : ''}</span>
            </li>
          ))}
        </ol>
      )}
      <div className="flex items-center gap-2">
        <Botao disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
          <CaretLeft size={16} aria-hidden />
          Mais recentes
        </Botao>
        <Botao disabled={!q.data?.temMais} onClick={() => setPagina((p) => p + 1)}>
          Mais antigas
          <CaretRight size={16} aria-hidden />
        </Botao>
      </div>
    </Secao>
  );
}

export default function PaginaConfiguracoes() {
  const cfg = useConfiguracoes();
  const membros = useMembros();
  const { membro, sair } = useAuth();
  return (
    <>
      <Cabecalho titulo="Configurações" resumo={`Conectado como ${membro?.nome ?? ''}`} />
      {cfg.isLoading ? <Carregando linhas={3} /> : cfg.isError ? <ErroCarga erro={cfg.error} tentarDeNovo={() => void cfg.refetch()} /> : <FormConfig c={cfg.data!} />}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Produtos />
        <Secao titulo="Sócios e aparência">
          <ul className="flex flex-col gap-2">
            {membros.data?.map((m) => (
              <li key={m.user_id} className="flex items-center gap-3">
                <span className="flex size-[32px] items-center justify-center rounded-full bg-accent-800 text-sm text-accent-100" aria-hidden>
                  {m.nome.slice(0, 1)}
                </span>
                <span className="flex-1">{m.nome}</span>
                <span className="text-sm text-text-muted">{m.papel === 'admin' ? 'administrador' : 'sócio'}{m.ativo ? '' : ' · inativo'}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-text-muted">Sócios são incluídos pelo SQL Editor do Supabase, depois do convite.</p>
          <div className="flex flex-wrap gap-2">
            <AlternarTema comTexto className="border border-divider text-text" />
            <Botao onClick={() => void sair()}>
              <SignOut size={18} aria-hidden />
              Sair
            </Botao>
          </div>
        </Secao>
      </div>
      <AuditoriaSecao />
    </>
  );
}
