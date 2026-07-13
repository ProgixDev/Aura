import type { Conversation, ChatMessage } from '../types';
import { practitionerImages } from '../images';

export const conversationsMock: Conversation[] = [
  {
    id: 'm1',
    name: 'Élodie Marceau',
    avatar: ['#C4B0E8', '#A8C8E8'] as const,
    photo: practitionerImages.p1.avatar,
    preview: 'Bonjour Sarah, avec plaisir 🙏 je vous propose…',
    when: '10:42',
    unread: true,
    online: true,
  },
  {
    id: 'm2',
    name: 'Mathieu Vernet',
    avatar: ['#B8D4C2', '#C4B0E8'] as const,
    photo: practitionerImages.p2.avatar,
    preview:
      "Le bain sonore de samedi est complet — j'ouvre une nouvelle date.",
    when: 'hier',
    unread: false,
    online: false,
  },
  {
    id: 'm3',
    name: 'Camille Rossi',
    avatar: ['#A8C8E8', '#B8D4C2'] as const,
    photo: practitionerImages.p3.avatar,
    preview:
      "Vous avez bien fait de venir vers moi. On regarde ça ensemble.",
    when: 'lun.',
    unread: false,
    online: true,
  },
  {
    id: 'm4',
    name: 'Cercle Aura — Paris',
    avatar: ['#E4C896', '#C4B0E8'] as const,
    preview: 'Marie a partagé une ressource dans le cercle.',
    when: '29 mars',
    unread: false,
    online: false,
  },
];

export const sampleChat = (conversationId: string): ChatMessage[] => [
  {
    id: 'c1',
    fromMe: true,
    text:
      "Bonjour Élodie, je suis tombée sur votre profil par hasard et votre approche me parle beaucoup. J'aimerais comprendre comment se passe une première séance de magnétisme — je n'en ai jamais fait.",
    time: '18:42',
    dayMark: 'Hier',
  },
  {
    id: 'c2',
    fromMe: false,
    text:
      "Bonjour Sarah 🙏 Avec plaisir. La première séance, on prend un temps long pour se rencontrer — j'écoute ce qui vous amène, sans chercher à diagnostiquer. Puis vous vous installez allongée, habillée. Je passe les mains sans contact, pendant 40 à 50 min. On échange ensuite.",
    time: '18:55',
  },
  {
    id: 'c3',
    fromMe: false,
    text: "Beaucoup s'endorment. C'est très bien aussi 🌙",
    time: '18:55',
  },
  {
    id: 'c4',
    fromMe: true,
    text:
      "Merci, c'est rassurant. Une dernière question — je vis des nuits compliquées en ce moment. Est-ce que c'est un sujet sur lequel le magnétisme peut accompagner ?",
    time: '10:38',
    dayMark: "Aujourd'hui",
  },
  {
    id: 'c5',
    fromMe: false,
    text:
      "Oui, c'est même un motif très fréquent. On ne promet jamais — mais je vois souvent un mieux sur le sommeil en 2 à 3 séances. Si vous voulez, j'ai un créneau mer. 26 mars à 14h ?",
    time: '10:42',
  },
  {
    id: 'c6',
    fromMe: false,
    text: '',
    time: '10:42',
    proposal: {
      when: 'Mer. 26 mars · 14h00',
      durationMinutes: 75,
      mode: 'présentiel',
      price: 75,
    },
  },
];
