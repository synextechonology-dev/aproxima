import Papa from 'papaparse';

/** Baixa um CSV (com BOM, para o Excel reconhecer acentos). */
export function baixarCsv(nomeArquivo: string, linhas: Record<string, unknown>[], colunas?: string[]) {
  const csv = Papa.unparse(linhas, { delimiter: ';', columns: colunas });
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Número com vírgula decimal (para planilhas em português). */
export function numCsv(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  return String(v).replace('.', ',');
}
