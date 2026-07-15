/**
 * Pure reducer for writing a single quiz answer into the persisted
 * answers array at `step`, growing the array as needed. Extracted so it
 * is unit-testable without touching the zustand store or AsyncStorage.
 */
export function withQuizAnswer(quizAnswers: number[], step: number, optionIndex: number): number[] {
  const next = [...quizAnswers];
  next[step] = optionIndex;
  return next;
}
