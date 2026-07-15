import { appendOptimisticMessage } from './appendOptimisticMessage';
import type { ChatMessage } from '../data/types';

const existing: ChatMessage[] = [
  { id: 'c1', fromMe: false, text: 'Bonjour', time: '10:00', createdAtIso: '2026-07-13T09:00:00.000Z' },
];

describe('appendOptimisticMessage', () => {
  it('appends a fromMe message with the trimmed text', () => {
    const result = appendOptimisticMessage(existing, '  Merci beaucoup  ', new Date('2026-07-13T14:05:00'));
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ fromMe: true, text: 'Merci beaucoup', time: '14:05' });
  });

  it('does not mutate the input array', () => {
    const result = appendOptimisticMessage(existing, 'Hello', new Date('2026-07-13T09:00:00'));
    expect(result).not.toBe(existing);
    expect(existing).toHaveLength(1);
  });

  it('returns the same list unchanged for blank text', () => {
    expect(appendOptimisticMessage(existing, '   ')).toBe(existing);
  });

  it('zero-pads single-digit hours and minutes', () => {
    const result = appendOptimisticMessage([], 'x', new Date('2026-07-13T04:05:00'));
    expect(result[0].time).toBe('04:05');
  });
});
