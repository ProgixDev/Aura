import type { Exchange } from '../types';

export const exchangesMock: Exchange[] = [
  {
    id: 'x1',
    who: 'Camille R.',
    role: 'Hypnothérapeute · Lyon',
    give: "1 séance d'hypnose",
    want: 'Soin Reiki',
    tag: 'Soin contre soin',
    avatar: ['#A8C8E8', '#B8D4C2'] as const,
    message:
      "Je traverse une phase intense et je sens que mon énergie a besoin d'être rééquilibrée. J'offre en retour une séance d'hypnose adaptée à votre intention — confiance en soi, sommeil, libération émotionnelle. Visio possible des deux côtés.",
    mode: 'Visio',
    delay: "D'ici 3 semaines",
    publishedAgo: 'il y a 2 jours',
  },
  {
    id: 'x2',
    who: 'Lucas T.',
    role: 'Webdesigner · Bordeaux',
    give: 'Refonte de site (5j)',
    want: 'Cycle de 4 soins énergétiques',
    tag: 'Service contre soin',
    avatar: ['#E4C896', '#C4B0E8'] as const,
  },
  {
    id: 'x3',
    who: 'Éco-village Le Sapin',
    role: 'Cévennes',
    give: '1 semaine de gîte + repas',
    want: 'Bénévolat permaculture',
    tag: 'Bénévolat',
    avatar: ['#B8D4C2', '#A8C8E8'] as const,
  },
  {
    id: 'x4',
    who: 'Anaïs L.',
    role: 'Énergéticienne · Bordeaux',
    give: "Formation lecture d'aura (1j)",
    want: 'Formation tambour chamanique',
    tag: 'Formation contre formation',
    avatar: ['#C4B0E8', '#E4C896'] as const,
  },
];
