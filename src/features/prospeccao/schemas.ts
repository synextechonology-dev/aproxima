import { z } from 'zod';
import {
  RE_EMAIL,
  RE_HTTP_S,
  RE_HTTPS,
  RE_TELEFONE,
  dataOpcional,
  numeroOpcional,
  opcaoOpcional,
  padraoOpcional,
  textoObrigatorio,
  textoOpcional,
} from '@/lib/zod';
import { CANAIS, ETAPAS, MOTIVOS_DESCARTE, ORIGENS, SEGMENTOS } from '@/lib/rotulos';

// Espelha os checks de public.clientes. As chaves são exatamente as colunas
// que o app pode gravar (grant insert/update): nada além delas vai ao banco.
export const esquemaLead = z
  .object({
    nome: textoObrigatorio(150, 'o nome'),
    cidade: textoObrigatorio(80, 'a cidade'),
    segmento: opcaoOpcional(SEGMENTOS),
    endereco: textoOpcional(200),
    contato_nome: textoOpcional(100),
    telefone: padraoOpcional(RE_TELEFONE, 'Telefone inválido: de 8 a 20 caracteres, só números, espaço, +, ( ) e -'),
    email: padraoOpcional(RE_EMAIL, 'E-mail inválido'),
    google_url: padraoOpcional(RE_HTTPS, 'O link do Google precisa começar com https://', 500),
    nota_google: numeroOpcional({ min: 0, max: 5, rotulo: 'nota do Google' }),
    avaliacoes_google: numeroOpcional({ min: 0, inteiro: true, rotulo: 'avaliações no Google' }),
    avaliacoes_mes_antes: numeroOpcional({ min: 0, max: 99999.9, rotulo: 'avaliações por mês' }),
    instagram: textoOpcional(80),
    tem_site: z.enum(['', 'sim', 'nao']).transform((v) => (v === '' ? null : v === 'sim')),
    site_url: padraoOpcional(RE_HTTP_S, 'O site precisa começar com http:// ou https://', 300),
    interesse: textoOpcional(200),
    concorrente_nome: textoOpcional(150),
    concorrente_nota: numeroOpcional({ min: 0, max: 5, rotulo: 'nota do concorrente' }),
    concorrente_avaliacoes: numeroOpcional({ min: 0, inteiro: true, rotulo: 'avaliações do concorrente' }),
    etapa: z.enum(ETAPAS),
    motivo_descarte: opcaoOpcional(MOTIVOS_DESCARTE),
    origem: opcaoOpcional(ORIGENS),
    responsavel_id: z.string().transform((v) => (v === '' ? null : v)),
    proximo_followup: dataOpcional(),
    observacoes: textoOpcional(4000),
  })
  .refine((v) => v.etapa !== 'descartado' || v.motivo_descarte !== null, {
    path: ['motivo_descarte'],
    message: 'Para descartar, escolha o motivo',
  })
  .refine((v) => v.etapa !== 'cliente', {
    path: ['etapa'],
    message: 'A etapa Cliente é automática: ela muda quando uma venda é confirmada',
  });
export type LeadEntrada = z.input<typeof esquemaLead>;
export type LeadSaida = z.output<typeof esquemaLead>;

// public.interacoes
export const esquemaContato = z.object({
  canal: z.enum(CANAIS),
  resumo: textoObrigatorio(2000, 'o resumo da conversa'),
  proximo_passo: textoOpcional(300),
  proximo_followup: dataOpcional(),
  ocorreu_em: z.string().min(1, 'Informe quando foi'),
});
export type ContatoEntrada = z.input<typeof esquemaContato>;
export type ContatoSaida = z.output<typeof esquemaContato>;

export const esquemaDescarte = z.object({
  motivo_descarte: z.enum(MOTIVOS_DESCARTE, { message: 'Escolha o motivo' }),
});
