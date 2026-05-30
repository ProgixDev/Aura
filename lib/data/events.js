// Events — ported from src/data/mock/events.ts, expanded to 6 for richer listings.

export const events = [
  {
    id: 'e1', title: 'Retraite équinoxe — Vercors', kind: 'RETRAITE · 3 JOURS', tone: 'sky',
    when: '21–23 mars', where: 'Drôme', price: 'à partir de 480 €', priceFrom: 480,
    seats: 12, seatsLeft: 3, hostIds: ['p1', 'p2'],
    description:
      "Trois jours pour accompagner l'équinoxe de printemps dans un ancien refuge rénové, à 1 200 mètres d'altitude. Méditations à l'aube, soins énergétiques individuels, bains sonores au crépuscule, marches en silence dans la forêt de hêtres.\n\nEncadré par Élodie Marceau (magnétisme), Mathieu Vernet (chamanisme) et l'équipe du Refuge des Cimes. Tout repas inclus — cuisine végétale, locale et de saison.",
    meta: { dates: '21–23 mars 2026', place: 'Drôme · 26', seats: 12 },
    program: [
      { time: '07h00', title: 'Éveil silencieux & méditation', detail: '1h30 · facultatif' },
      { time: '09h00', title: 'Petit-déjeuner partagé' },
      { time: '10h30', title: 'Atelier ou marche consciente', detail: 'au choix selon la journée' },
      { time: '14h00', title: 'Soin énergétique individuel', detail: '40 min · sur inscription' },
      { time: '19h00', title: 'Dîner aux chandelles' },
      { time: '21h00', title: 'Bain sonore au tambour', detail: '1h · sous la voie lactée' },
    ],
  },
  { id: 'e2', title: 'Bain sonore de pleine lune', kind: 'ÉVÉNEMENT · 2H', tone: 'violet',
    when: 'sam. 14 avril · 20h', where: 'Paris 11e', price: '35 €', priceFrom: 35, seats: 30, seatsLeft: 8, hostIds: ['p4'],
    description: "Une soirée de bols tibétains et de gongs pour clore la semaine en douceur. Apportez un tapis, une couverture, et laissez-vous porter.",
    meta: { dates: '14 avril 2026', place: 'Paris 11e', seats: 30 },
    program: [{ time: '20h00', title: 'Accueil & installation' }, { time: '20h20', title: 'Bain sonore', detail: '75 min' }, { time: '21h40', title: 'Tisane & échanges' }] },
  { id: 'e3', title: 'Initiation au Reiki Usui — niveau 1', kind: 'FORMATION · 2 JOURS', tone: 'sage',
    when: '4–5 mai', where: 'Annecy', price: '320 €', priceFrom: 320, seats: 8, seatsLeft: 2, hostIds: ['p1'],
    description: "Le premier degré du Reiki Usui, transmis sur deux jours : histoire, positions, initiations et pratique encadrée. Repartez avec une pratique autonome.",
    meta: { dates: '4–5 mai 2026', place: 'Annecy', seats: 8 },
    program: [{ time: 'Jour 1', title: 'Histoire & premières initiations' }, { time: 'Jour 2', title: 'Pratique & autotraitement' }] },
  { id: 'e4', title: 'Cercle de femmes — nouvelle lune', kind: 'CERCLE · 3H', tone: 'gold',
    when: 'mar. 9 avril · 19h', where: 'Lyon', price: '25 €', priceFrom: 25, seats: 14, seatsLeft: 5, hostIds: ['p3'],
    description: "Un cercle de parole et de rituels doux pour honorer la nouvelle lune, en non-mixité choisie. Thé, tambour, partages.",
    meta: { dates: '9 avril 2026', place: 'Lyon', seats: 14 },
    program: [{ time: '19h00', title: 'Ouverture du cercle' }, { time: '19h30', title: 'Partages & intentions' }, { time: '21h00', title: 'Rituel de clôture' }] },
  { id: 'e5', title: 'Atelier respiration & cohérence cardiaque', kind: 'ATELIER · 2H', tone: 'sky',
    when: 'dim. 27 avril · 10h', where: 'Bordeaux', price: '40 €', priceFrom: 40, seats: 20, seatsLeft: 11, hostIds: ['p5'],
    description: "Apprenez des outils de respiration concrets pour réguler le stress au quotidien. Théorie courte, pratique longue.",
    meta: { dates: '27 avril 2026', place: 'Bordeaux', seats: 20 },
    program: [{ time: '10h00', title: 'Les bases de la cohérence' }, { time: '10h40', title: 'Pratiques guidées' }, { time: '11h40', title: 'Intégration au quotidien' }] },
  { id: 'e6', title: 'Marche chamanique en forêt', kind: 'SORTIE · 4H', tone: 'sage',
    when: 'sam. 10 mai · 9h', where: 'Ardèche', price: '55 €', priceFrom: 55, seats: 10, seatsLeft: 6, hostIds: ['p2'],
    description: "Une immersion en forêt guidée au tambour : marche lente, points d'arrêt, reliance au vivant. Niveau accessible à tous.",
    meta: { dates: '10 mai 2026', place: 'Ardèche', seats: 10 },
    program: [{ time: '09h00', title: 'Cercle d\'ouverture' }, { time: '09h30', title: 'Marche guidée' }, { time: '12h30', title: 'Partage & clôture' }] },
];

export const getEvent = (id) => events.find((e) => e.id === id);
