import type { Event } from '../types';

export const eventsMock: Event[] = [
  {
    id: 'e1',
    title: 'Retraite équinoxe — Vercors',
    kind: 'RETRAITE · 3 JOURS',
    when: '21–23 mars',
    where: 'Drôme',
    price: 'à partir de 480 €',
    priceFrom: 480,
    gradient: ['#A8C8E8', '#C4B0E8', '#B8D4C2'] as const,
    description:
      "Trois jours pour accompagner l'équinoxe de printemps dans un ancien refuge rénové, à 1 200 mètres d'altitude. Méditations à l'aube, soins énergétiques individuels, bains sonores au crépuscule, marches en silence dans la forêt de hêtres.\n\nEncadré par Élodie Marceau (magnétisme), Mathieu Vernet (chamanisme) et l'équipe du Refuge des Cimes. Tout repas inclus — cuisine végétale, locale et de saison.",
    meta: { dates: '21–23 mars', place: 'Drôme · 26', seats: 12 },
    hosts: [
      { name: 'Élodie M.', spec: 'Magnétisme', gradient: ['#C4B0E8', '#A8C8E8'] as const },
      { name: 'Mathieu V.', spec: 'Chamanisme', gradient: ['#B8D4C2', '#C4B0E8'] as const },
    ],
    program: [
      { time: '07h00', title: 'Éveil silencieux & méditation', detail: '1h30 · facultatif' },
      { time: '09h00', title: 'Petit-déjeuner partagé' },
      { time: '10h30', title: 'Atelier ou marche consciente', detail: 'au choix selon la journée' },
      { time: '14h00', title: 'Soin énergétique individuel', detail: '40 min · sur inscription' },
      { time: '19h00', title: 'Dîner aux chandelles' },
      { time: '21h00', title: 'Bain sonore au tambour', detail: '1h · sous la voie lactée' },
    ],
  },
  {
    id: 'e2',
    title: 'Bain sonore de pleine lune',
    kind: 'ÉVÉNEMENT · 2H',
    when: 'sam. 14 avril · 20h',
    where: 'Paris 11e',
    price: '35 €',
    priceFrom: 35,
    gradient: ['#C4B0E8', '#E4C896'] as const,
  },
  {
    id: 'e3',
    title: 'Initiation au Reiki Usui — niveau 1',
    kind: 'FORMATION · 2 JOURS',
    when: '4–5 mai',
    where: 'Annecy',
    price: '320 €',
    priceFrom: 320,
    gradient: ['#B8D4C2', '#A8C8E8'] as const,
  },
  {
    id: 'e4',
    title: 'Cercle de femmes — nouvelle lune',
    kind: 'CERCLE · 3H',
    when: 'mar. 9 avril · 19h',
    where: 'Lyon',
    price: '25 €',
    priceFrom: 25,
    gradient: ['#E4C896', '#C4B0E8'] as const,
  },
];
