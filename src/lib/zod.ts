import { z } from 'zod';

// Peças de schema que espelham os `check` da migration. Os campos do formulário
// chegam como texto; vazio vira null (o banco guarda ausência como null).

export const textoObrigatorio = (max: number, rotulo: string) =>
  z.string().trim().min(1, `Informe ${rotulo}`).max(max, `Até ${max} caracteres`);

export const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Até ${max} caracteres`)
    .transform((v) => (v === '' ? null : v));

/** Regex opcional (telefone, e-mail, URL). */
export const padraoOpcional = (re: RegExp, msg: string, max?: number) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || re.test(v), msg)
    .refine((v) => max === undefined || v.length <= max, `Até ${max} caracteres`)
    .transform((v) => (v === '' ? null : v));

const paraNumero = (v: string) => Number(v.replace(/\./g, '').replace(',', '.'));
/** Aceita "4,5" ou "4.5"; para inteiros ignora pontos de milhar. */
const paraDecimal = (v: string) => Number(v.replace(',', '.'));

export const numeroOpcional = ({ min, max, inteiro, rotulo }: { min?: number; max?: number; inteiro?: boolean; rotulo: string }) =>
  z
    .string()
    .trim()
    .refine((v) => {
      if (v === '') return true;
      const n = inteiro ? paraNumero(v) : paraDecimal(v);
      if (!Number.isFinite(n)) return false;
      if (inteiro && !Number.isInteger(n)) return false;
      if (min !== undefined && n < min) return false;
      if (max !== undefined && n > max) return false;
      return true;
    }, faixa(rotulo, min, max, inteiro))
    .transform((v) => (v === '' ? null : inteiro ? paraNumero(v) : paraDecimal(v)));

export const numeroObrigatorio = ({ min, max, inteiro, rotulo }: { min?: number; max?: number; inteiro?: boolean; rotulo: string }) =>
  z
    .string()
    .trim()
    .min(1, `Informe ${rotulo}`)
    .refine((v) => {
      const n = inteiro ? paraNumero(v) : paraDecimal(v);
      if (!Number.isFinite(n)) return false;
      if (inteiro && !Number.isInteger(n)) return false;
      if (min !== undefined && n < min) return false;
      if (max !== undefined && n > max) return false;
      return true;
    }, faixa(rotulo, min, max, inteiro))
    .transform((v) => (inteiro ? paraNumero(v) : paraDecimal(v)));

function faixa(rotulo: string, min?: number, max?: number, inteiro?: boolean) {
  const tipo = inteiro ? 'número inteiro' : 'número';
  if (min !== undefined && max !== undefined) return `${cap(rotulo)}: ${tipo} de ${min} a ${String(max).replace('.', ',')}`;
  if (min !== undefined) return `${cap(rotulo)}: ${tipo} a partir de ${min}`;
  return `${cap(rotulo)}: ${tipo} inválido`;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Valor em reais (≥ 0): "1.234,56", "1234.56" ou "1234,5". */
const paraReais = (v: string) => {
  const s = v.replace(/[R$\s]/g, '');
  if (s.includes(',')) return Number(s.replace(/\./g, '').replace(',', '.'));
  return Number(s);
};
export const reais = (rotulo: string, { obrigatorio = true, maiorQueZero = false } = {}) =>
  z
    .string()
    .trim()
    .refine((v) => !obrigatorio || v !== '', `Informe ${rotulo}`)
    .refine((v) => {
      if (v === '') return true;
      const n = paraReais(v);
      return Number.isFinite(n) && (maiorQueZero ? n > 0 : n >= 0);
    }, maiorQueZero ? `${cap(rotulo)} precisa ser maior que zero` : `${cap(rotulo)} inválido`)
    .transform((v) => (v === '' ? 0 : Math.round(paraReais(v) * 100) / 100));

/** Data aaaa-mm-dd opcional. */
export const dataOpcional = () =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Data inválida')
    .transform((v) => (v === '' ? null : v));

export const dataObrigatoria = (rotulo: string) =>
  z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, `Informe ${rotulo}`);

/** Select opcional de uma lista fechada. */
export const opcaoOpcional = <T extends readonly [string, ...string[]]>(valores: T) =>
  z
    .union([z.enum(valores), z.literal('')])
    .transform((v) => (v === '' ? null : (v as T[number])));

export const RE_TELEFONE = /^[0-9+() -]{8,20}$/;
export const RE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const RE_HTTPS = /^https:\/\//i;
export const RE_HTTP_S = /^https?:\/\//i;

/** Converte número para o texto que o formulário mostra ("4,5"). */
export function numParaCampo(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  return String(v).replace('.', ',');
}
export function reaisParaCampo(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  return Number(v).toFixed(2).replace('.', ',');
}
