import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import type { ChatMessage } from '@data/types';

/**
 * Single chat message bubble, shared by the client and praticien chat
 * screens (mobile/app/chat/[id].tsx and mobile/app/praticien-messages/[id].tsx)
 * — the visual message representation doesn't vary by role, only which
 * messages count as "mine" does (ChatMessage.fromMe, set by the caller's
 * mapping layer — see mobile/src/data/repos/index.ts's mapMessage).
 */
export function ChatBubble({ message }: { message: ChatMessage }) {
  return (
    <>
      {message.dayMark ? <Text style={styles.dayMark}>{message.dayMark.toUpperCase()}</Text> : null}
      <View style={[styles.bubble, message.fromMe ? styles.me : styles.them]}>
        <Text style={[styles.bubbleTxt, message.fromMe && { color: '#fff' }]}>
          {message.text}
        </Text>
        <Text
          style={[
            styles.bubbleMeta,
            message.fromMe ? { color: 'rgba(255,255,255,0.55)' } : null,
          ]}
        >
          {message.time}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  them: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomLeftRadius: 6,
  },
  me: {
    alignSelf: 'flex-end',
    backgroundColor: colors.ink,
    borderBottomRightRadius: 6,
  },
  bubbleTxt: { ...typography.body, fontSize: 14, lineHeight: 20 },
  bubbleMeta: { ...typography.tiny, fontSize: 10, marginTop: 4, textAlign: 'right' },
  dayMark: {
    ...typography.tiny,
    textAlign: 'center',
    letterSpacing: 2,
    marginVertical: 4,
  },
});
