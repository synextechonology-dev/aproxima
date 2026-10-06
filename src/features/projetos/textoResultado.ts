import { formatarData, formatarDecimal, formatarNumero } from '@/lib/formato';
import type { DadosProjeto } from './dados';

/** Texto do resumo para o cliente (só valores que o banco calculou). */
export function textoResultado(d: DadosProjeto): string {
  const r = d.resultado;
  const nome = d.cliente.contato_nome || d.cliente.nome;
  const linhas = [`Olá, ${nome}! Aqui está o resultado do seu perfil no Google desde a placa Notavo (${formatarData(d.venda.data_venda)}):`];
  if (r?.avaliacoes_atuais !== null && r?.avaliacoes_atuais !== undefined) {
    linhas.push(
      `• Avaliações: ${formatarNumero(r.baseline_avaliacoes)} → ${formatarNumero(r.avaliacoes_atuais)}${r.avaliacoes_ganhas !== null ? ` (+${formatarNumero(r.avaliacoes_ganhas)})` : ''}`,
    );
  }
  if (r?.nota_atual !== null && r?.nota_atual !== undefined) linhas.push(`• Nota: ${formatarDecimal(r.baseline_nota)} → ${formatarDecimal(r.nota_atual)}`);
  if (r?.avaliacoes_mes_depois !== null && r?.avaliacoes_mes_depois !== undefined) {
    linhas.push(`• Ritmo: ${formatarDecimal(r.baseline_avaliacoes_mes)} avaliações por mês antes, ${formatarDecimal(r.avaliacoes_mes_depois)} agora`);
  }
  if (r?.toques_total) linhas.push(`• Toques na placa: ${formatarNumero(r.toques_total)}`);
  linhas.push('Obrigado pela parceria!');
  return linhas.join('\n');
}

