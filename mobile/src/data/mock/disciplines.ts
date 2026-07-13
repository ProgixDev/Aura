import type { Discipline } from '../types';

export const disciplinesMock: Discipline[] = [
  {
    slug: 'magnetisme',
    name: 'Magnétisme',
    tone: 'sky',
    glyph: '✦',
    count: 347,
    intro:
      "Le magnétisme est une pratique ancestrale. Le praticien canalise une énergie de vie et la transmet sans contact physique, pour apaiser, recentrer et rééquilibrer.",
  },
  {
    slug: 'reiki',
    name: 'Reiki',
    tone: 'violet',
    glyph: '❍',
    count: 284,
    intro:
      "Le Reiki est une pratique japonaise transmise au début du XXᵉ siècle par Mikao Usui. Le mot signifie « énergie de vie universelle ». Le praticien pose les mains à quelques centimètres du corps pour favoriser un état de détente profond.",
    pullQuote:
      "On en ressort apaisé, comme après une longue marche en montagne — sauf qu'on n'a pas bougé.",
  },
  { slug: 'chamanisme', name: 'Chamanisme', tone: 'sage', glyph: '◊', count: 96 },
  { slug: 'soin-energetique', name: 'Soin énergétique', tone: 'sky', glyph: '❀', count: 412 },
  { slug: 'hypnose', name: 'Hypnose', tone: 'violet', glyph: '◐', count: 203 },
  { slug: 'meditation', name: 'Méditation', tone: 'sage', glyph: '☉', count: 178 },
  { slug: 'clairvoyance', name: 'Clairvoyance', tone: 'gold', glyph: '✺', count: 89 },
  { slug: 'bain-sonore', name: 'Bain sonore', tone: 'sky', glyph: '◯', count: 64 },
  { slug: 'massage', name: 'Massage thérapeutique', tone: 'sage', glyph: '⌇', count: 312 },
  { slug: 'coaching', name: 'Coaching de vie', tone: 'violet', glyph: '✧', count: 241 },
  { slug: 'retraites', name: 'Retraites', tone: 'gold', glyph: '▲', count: 48 },
  { slug: 'purification', name: 'Purification', tone: 'sky', glyph: '❖', count: 36 },
];
