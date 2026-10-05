import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...entradas: ClassValue[]) {
  return twMerge(clsx(entradas));
}

/** Valores numeric do Postgres podem chegar como string; converte antes de usar. */
export function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Texto vazio vira null (o banco guarda ausência como null). */
export function vazioParaNull(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const t = v.trim();
  return t === '' ? null : t;
}

/** Só dígitos do telefone. */
export function digitos(v: string | null | undefined): string {
  return (v ?? '').replace(/\D/g, '');
}

/** Remove acentos e deixa minúsculo (busca e cabeçalhos de CSV). */
export function normalizar(v: string): string {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
