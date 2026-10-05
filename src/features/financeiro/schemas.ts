import { z } from 'zod';
import { dataObrigatoria, dataOpcional, reais, textoObrigatorio } from '@/lib/zod';
import { CATEGORIAS_AVULSAS, FORMAS_LANCAMENTO, TIPOS_LANCAMENTO } from '@/lib/rotulos';

// Lançamento avulso (policy lanc_insert + checks de public.lancamentos)
export const esquemaLancamento = z
  .object({
    tipo: z.enum(TIPOS_LANCAMENTO),
    categoria: z.string().min(1, 'Escolha a categoria'),
    descricao: textoObrigatorio(300, 'a descrição'),
    valor: reais('o valor', { maiorQueZero: true }),
    vencimento: dataObrigatoria('o vencimento'),
    pago_em: dataOpcional(),
    forma_pagamento: z.union([z.enum(FORMAS_LANCAMENTO), z.literal('')]).transform((v) => (v === '' ? null : v)),
    socio_id: z.string().transform((v) => (v === '' ? null : v)),
  })
  .refine((v) => CATEGORIAS_AVULSAS[v.tipo].includes(v.categoria), { path: ['categoria'], message: 'A categoria não combina com o tipo' })
  .refine((v) => v.tipo !== 'retirada' || v.socio_id !== null, { path: ['socio_id'], message: 'Retirada precisa do sócio' });
export type LancEntrada = z.input<typeof esquemaLancamento>;
export type LancSaida = z.output<typeof esquemaLancamento>;
