import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, Link } from 'react-router-dom';
import { MapTrifold } from '@phosphor-icons/react';
import { useAuth } from './auth-contexto';
import { Casca } from './Casca';
import { Carregando, Vazio } from '@/components/estados';
import { estiloBotao } from '@/components/ui/botao-estilo';

const PaginaLogin = lazy(() => import('@/features/login/PaginaLogin'));
const EmConstrucao = lazy(() => import('./EmConstrucao'));
const PaginaEstoque = lazy(() => import('@/features/estoque/PaginaEstoque'));
const PaginaVendas = lazy(() => import('@/features/vendas/PaginaVendas'));
const NovaVenda = lazy(() => import('@/features/vendas/NovaVenda'));
const EditorVenda = lazy(() => import('@/features/vendas/EditorVenda'));
const PaginaProjetos = lazy(() => import('@/features/projetos/PaginaProjetos'));
const PaginaProjeto = lazy(() => import('@/features/projetos/PaginaProjeto'));
const PaginaFinanceiro = lazy(() => import('@/features/financeiro/PaginaFinanceiro'));
const PaginaPainel = lazy(() => import('@/features/painel/PaginaPainel'));
const PaginaProspeccao = lazy(() => import('@/features/prospeccao/PaginaProspeccao'));

function Protegido({ children }: { children: ReactNode }) {
  const { estado } = useAuth();
  const local = useLocation();
  if (estado === 'carregando') {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Carregando linhas={2} className="w-64" />
      </main>
    );
  }
  if (estado !== 'pronto') return <Navigate to="/login" replace state={{ de: local.pathname + local.search }} />;
  return <>{children}</>;
}

function NaoEncontrada() {
  return (
    <Vazio
      icone={MapTrifold}
      titulo="Página não encontrada"
      texto="O endereço não existe ou mudou."
      acao={
        <Link to="/" className={estiloBotao({ variante: 'principal' })}>
          Ir para o Painel
        </Link>
      }
    />
  );
}

const carregandoPagina = <Carregando linhas={5} />;

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={carregandoPagina}>
        <Routes>
          <Route path="/login" element={<PaginaLogin />} />
          <Route
            element={
              <Protegido>
                <Casca />
              </Protegido>
            }
          >
            <Route index element={<PaginaPainel />} />
            <Route path="prospeccao" element={<PaginaProspeccao />} />
            <Route path="vendas" element={<PaginaVendas />} />
            <Route path="vendas/nova" element={<NovaVenda />} />
            <Route path="vendas/:id" element={<EditorVenda />} />
            <Route path="projetos" element={<PaginaProjetos />} />
            <Route path="projetos/:id" element={<PaginaProjeto />} />
            <Route path="estoque" element={<PaginaEstoque />} />
            <Route path="financeiro" element={<PaginaFinanceiro />} />
            <Route path="configuracoes" element={<EmConstrucao area="Configurações" />} />
            <Route path="*" element={<NaoEncontrada />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
