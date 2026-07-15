import { filterExchanges } from './filterExchanges';
import type { Exchange } from '../data/types';

function makeExchange(type: Exchange['type'], id: number): Exchange {
  return {
    id,
    client_id: 1,
    sujet: 'Sujet',
    type,
    statut: 'en_attente',
    priorite: 'normale',
    message: 'Message',
    format: null,
    ce_que_je_propose: null,
    ce_que_je_recherche: null,
    delai_souhaite: null,
    pieces_jointes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

const proposition = makeExchange('proposition', 1);
const demande = makeExchange('demande', 2);
const information = makeExchange('information', 3);
const autre = makeExchange('autre', 4);

describe('filterExchanges', () => {
  const all = [proposition, demande, information, autre];

  it('"all" returns everything', () => {
    expect(filterExchanges(all, 'all')).toEqual(all);
  });

  it('filters proposition by type', () => {
    expect(filterExchanges(all, 'proposition')).toEqual([proposition]);
  });

  it('filters demande by type', () => {
    expect(filterExchanges(all, 'demande')).toEqual([demande]);
  });

  it('filters information by type', () => {
    expect(filterExchanges(all, 'information')).toEqual([information]);
  });

  it('filters autre by type', () => {
    expect(filterExchanges(all, 'autre')).toEqual([autre]);
  });
});
