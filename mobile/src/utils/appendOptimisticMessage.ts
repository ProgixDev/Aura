import type { ChatMessage } from '../data/types';

/**
 * Appends a locally-composed message to the end of a message list.
 *
 * There is no messaging backend anywhere in this program (messaging was
 * folded into "Plan 08" of the Aura frontend-wiring roadmap, deferred
 * indefinitely). This cannot persist or reach the other party; it only
 * makes sending feel functional within the current app session. The
 * generated id is prefixed "local-" so a future real implementation can
 * tell these apart from server-issued messages.
 */
export function appendOptimisticMessage(
  messages: ChatMessage[],
  text: string,
  now: Date = new Date(),
): ChatMessage[] {
  const trimmed = text.trim();
  if (!trimmed) return messages;
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return [
    ...messages,
    {
      id: `local-${now.getTime()}`,
      fromMe: true,
      text: trimmed,
      time: `${hh}:${mm}`,
    },
  ];
}
