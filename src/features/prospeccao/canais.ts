import { At, ChatCircleDots, InstagramLogo, Phone, Storefront, WhatsappLogo, type Icon } from '@phosphor-icons/react';
import type { Canal } from '@/lib/rotulos';

export const ICONE_CANAL: Record<Canal, Icon> = {
  visita: Storefront,
  whatsapp: WhatsappLogo,
  ligacao: Phone,
  instagram: InstagramLogo,
  email: At,
  outro: ChatCircleDots,
};
