import { z } from 'zod';
import { RE_HTTPS, dataObrigatoria, numeroObrigatorio, padraoOpcional, reais, textoObrigatorio, textoOpcional } from '@/lib/zod';
import { FORMAS_PAGAMENTO } from '@/lib/rotulos';

// Parâmetros de registrar_lote, com os checks de public.lotes
export const esquemaLote = z.object({
  p_fornecedor: textoObrigatorio(120, 'o fornecedor'),
  p_data_compra: dataObrigatoria('a data da compra'),
  p_quantidade: numeroObrigatorio({ min: 1, max: 5000, inteiro: true, rotulo: 'quantidade de placas' }),
  p_valor_pago: reais('o valor pago'),
  p_frete: reais('o frete', { obrigatorio: false }),
  p_outras_taxas: reais('outras taxas', { obrigatorio: false }),
  p_forma: z.enum(FORMAS_PAGAMENTO),
  p_pago: z.boolean(),
  p_observacoes: textoOpcional(1000),
});
export type LoteEntrada = z.input<typeof esquemaLote>;
export type LoteSaida = z.output<typeof esquemaLote>;

// Colunas editáveis de public.lotes
export const esquemaEditarLote = z.object({
  fornecedor: textoObrigatorio(120, 'o fornecedor'),
  observacoes: textoOpcional(1000),
});

// public.placas.destino_url
export const esquemaDestino = z.object({
  destino_url: padraoOpcional(RE_HTTPS, 'O destino precisa começar com https://', 500),
});
