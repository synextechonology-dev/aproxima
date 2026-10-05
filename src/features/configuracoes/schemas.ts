import { z } from 'zod';
import { numeroObrigatorio, reais, textoObrigatorio, textoOpcional } from '@/lib/zod';
import { CATEGORIAS_PRODUTO } from '@/lib/rotulos';

// Checks de public.configuracoes
export const esquemaConfig = z.object({
  estoque_minimo: numeroObrigatorio({ min: 0, inteiro: true, rotulo: 'estoque mínimo' }),
  taxa_credito_pct: numeroObrigatorio({ min: 0, max: 20, rotulo: 'taxa do crédito (%)' }),
  taxa_debito_pct: numeroObrigatorio({ min: 0, max: 20, rotulo: 'taxa do débito (%)' }),
  janela_toque_segundos: numeroObrigatorio({ min: 0, max: 3600, inteiro: true, rotulo: 'janela entre toques' }),
  limite_toques_dia: numeroObrigatorio({ min: 1, max: 100000, inteiro: true, rotulo: 'limite de toques por dia' }),
});

// Checks de public.produtos
export const esquemaProduto = z.object({
  nome: textoObrigatorio(120, 'o nome'),
  descricao: textoOpcional(1000),
  categoria: z.enum(CATEGORIAS_PRODUTO),
  preco_padrao: reais('o preço'),
  custo_padrao: reais('o custo', { obrigatorio: false }),
});
