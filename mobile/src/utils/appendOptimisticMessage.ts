import type { ChatMessage } from '../data/types';

/**
 * Appends a locally-composed message to the end of a message list, for
 * instant UI feedback while the real send request is in flight. The chat
 * screen clears this optimistic entry once the send mutation resolves and
 * the thread is refetched — see mobile/app/chat/[id].tsx.
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
      createdAtIso: now.toISOString(),
    },
  ];
}
