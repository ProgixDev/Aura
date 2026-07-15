import type { Exchange } from '../data/types';

export type ExchangeFilter = 'all' | Exchange['type'];

/** 'all' shows everything; the other 4 match Exchange.type exactly. */
export function filterExchanges(list: Exchange[], filter: ExchangeFilter): Exchange[] {
  if (filter === 'all') return list;
  return list.filter((x) => x.type === filter);
}
