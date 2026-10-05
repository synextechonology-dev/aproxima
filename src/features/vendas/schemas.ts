import { z } from 'zod';
import { dataObrigatoria, dataOpcional, numeroObrigatorio, reais, textoOpcional } from '@/lib/zod';
import { FORMAS_PAGAMENTO } from '@/lib/rotulos';

// Campos do rascunho que o app pode gravar (grant update em public.vendas)
export const esquemaVenda = z.object({
  data_venda: dataObrigatoria('a data da venda'),
  vendedor_id: z.string().transform((v) => (v === '' ? null : v)),
  desconto: reais('o desconto', { obrigatorio: false }),
  forma_pagamento: z.enum(FORMAS_PAGAMENTO),
  parcelas: numeroObrigatorio({ min: 1, max: 24, inteiro: true, rotulo: 'parcelas' }),
  entrada: reais('a entrada', { obrigatorio: false }),
  primeiro_vencimento: dataOpcional(),
  taxa_cartao_pct: numeroObrigatorio({ min: 0, max: 20, rotulo: 'taxa do cartão (%)' }),
  observacoes: textoOpcional(2000),
});
export type VendaEntrada = z.input<typeof esquemaVenda>;
export type VendaSaida = z.output<typeof esquemaVenda>;
