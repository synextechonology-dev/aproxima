import {
  FolderSimple,
  GearSix,
  Kanban,
  Package,
  Receipt,
  SquaresFour,
  Wallet,
  type Icon,
} from '@phosphor-icons/react';

export type ItemNav = { rotulo: string; caminho: string; icone: Icon };

export const NAV_PRINCIPAL: ItemNav[] = [
  { rotulo: 'Painel', caminho: '/', icone: SquaresFour },
  { rotulo: 'Prospecção', caminho: '/prospeccao', icone: Kanban },
  { rotulo: 'Vendas', caminho: '/vendas', icone: Receipt },
  { rotulo: 'Projetos', caminho: '/projetos', icone: FolderSimple },
  { rotulo: 'Estoque', caminho: '/estoque', icone: Package },
  { rotulo: 'Financeiro', caminho: '/financeiro', icone: Wallet },
];

export const NAV_CONFIG: ItemNav = { rotulo: 'Configurações', caminho: '/configuracoes', icone: GearSix };

/** No celular, a barra inferior mostra 4 áreas + "Mais" (Estoque, Financeiro, Configurações). */
export const NAV_CELULAR = NAV_PRINCIPAL.slice(0, 4);
export const NAV_MAIS: ItemNav[] = [...NAV_PRINCIPAL.slice(4), NAV_CONFIG];
