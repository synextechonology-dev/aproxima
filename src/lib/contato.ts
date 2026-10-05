import { digitos } from './utils';

/** Telefone brasileiro para o wa.me: só dígitos e com 55 na frente. */
export function telefoneInternacional(tel: string | null | undefined): string | null {
  const d = digitos(tel);
  if (d.length < 8) return null;
  if (d.startsWith('55') && d.length >= 12) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}

export function linkWhatsApp(tel: string | null | undefined, texto?: string): string | null {
  const n = telefoneInternacional(tel);
  if (!n) return null;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

export function linkTelefone(tel: string | null | undefined): string | null {
  const d = digitos(tel);
  return d.length >= 8 ? `tel:${d.length === 10 || d.length === 11 ? `+55${d}` : d}` : null;
}

/** Abre link externo numa aba nova sem dar acesso à janela do app. */
export function abrirExterno(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}
