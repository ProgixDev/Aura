import { withDayMarks } from './chatDayMarks';
import type { ChatMessage } from '../data/types';

const msg = (id: string, iso: string, text = 'hi'): ChatMessage => ({
  id, fromMe: false, text, time: '10:00', createdAtIso: iso,
});

describe('withDayMarks', () => {
  const now = new Date('2026-07-15T18:00:00.000Z');

  it('marks the first message of the list with a day label', () => {
    const result = withDayMarks([msg('1', '2026-07-15T09:00:00.000Z')], now);
    expect(result[0].dayMark).toBe("Aujourd'hui");
  });

  it('does not repeat the day label for consecutive same-day messages', () => {
    const result = withDayMarks([
      msg('1', '2026-07-15T09:00:00.000Z'),
      msg('2', '2026-07-15T10:00:00.000Z'),
    ], now);
    expect(result[0].dayMark).toBe("Aujourd'hui");
    expect(result[1].dayMark).toBeUndefined();
  });

  it('labels yesterday and older days distinctly', () => {
    const result = withDayMarks([
      msg('1', '2026-07-14T09:00:00.000Z'),
      msg('2', '2026-07-10T09:00:00.000Z'),
    ], now);
    expect(result[0].dayMark).toBe('Hier');
    expect(result[1].dayMark).toBe('10 juil.');
  });

  it('does not mutate the input array', () => {
    const input = [msg('1', '2026-07-15T09:00:00.000Z')];
    const result = withDayMarks(input, now);
    expect(result).not.toBe(input);
    expect(input[0].dayMark).toBeUndefined();
  });
});
