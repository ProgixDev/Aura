import { withQuizAnswer } from './quizAnswers';

describe('withQuizAnswer', () => {
  it('sets the answer at the given step on an empty array', () => {
    expect(withQuizAnswer([], 0, 2)).toEqual([2]);
  });

  it('appends a later step without disturbing earlier ones', () => {
    expect(withQuizAnswer([2], 1, 0)).toEqual([2, 0]);
  });

  it('overwrites an existing answer at the same step', () => {
    expect(withQuizAnswer([2, 0], 0, 3)).toEqual([3, 0]);
  });

  it('does not mutate the input array', () => {
    const input = [1, 1];
    const result = withQuizAnswer(input, 0, 4);
    expect(result).not.toBe(input);
    expect(input).toEqual([1, 1]);
  });
});
