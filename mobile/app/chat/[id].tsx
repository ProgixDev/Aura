import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@components/Avatar';
import { Button } from '@components/Button';
import { Icon } from '@components/Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { messageRepo } from '@data/repos';
import type { ChatMessage } from '@data/types';

export default function Chat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const { data: conv } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => messageRepo.conversation(String(id)),
  });
  const { data: msgs = [] } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => messageRepo.messages(String(id)),
  });

  const send = () => {
    if (!text.trim()) return;
    setText('');
    // In production: write to conversations realtime channel.
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.pearl }}
    >
      <View style={[styles.head, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="back" size={20} color={colors.ink} />
        </Pressable>
        <Avatar source={conv?.photo} gradient={conv?.avatar ?? [colors.violet, colors.sky]} size="sm" online={conv?.online} />
        <View style={{ flex: 1 }}>
          <Text style={styles.who}>{conv?.name ?? 'Élodie Marceau'}</Text>
          <Text style={styles.status}>● En ligne</Text>
        </View>
        <Pressable style={styles.iconBtn}>
          <Icon name="video" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <LinearGradient
        colors={[colors.pearl, '#F6F1EA']}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 10 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {msgs.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
        </ScrollView>
      </LinearGradient>

      <View style={[styles.compose, { paddingBottom: insets.bottom + 10 }]}>
        <Pressable style={styles.composeIcon}>
          <Icon name="plus" size={20} color={colors.muted} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Votre message…"
          placeholderTextColor={colors.muted}
          style={styles.composeInput}
        />
        <Pressable style={styles.sendBtn} onPress={send}>
          <Icon name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const router = useRouter();
  if (m.proposal) {
    return (
      <View style={[styles.bubble, styles.them, { padding: 0, overflow: 'hidden' }]}>
        <View style={{ padding: 14 }}>
          <Text style={styles.proposalLabel}>CRÉNEAU PROPOSÉ</Text>
          <Text style={styles.proposalWhen}>{m.proposal.when}</Text>
          <Text style={styles.proposalDetail}>
            {m.proposal.durationMinutes} min · {m.proposal.mode} · {m.proposal.price}€
          </Text>
          <Button
            label="Réserver ce créneau"
            size="sm"
            fullWidth={false}
            onPress={() => router.push('/booking/slot?id=p1' as any)}
            style={{ marginTop: 10, paddingHorizontal: 18 }}
          />
        </View>
      </View>
    );
  }
  return (
    <>
      {m.dayMark ? <Text style={styles.dayMark}>{m.dayMark.toUpperCase()}</Text> : null}
      <View style={[styles.bubble, m.fromMe ? styles.me : styles.them]}>
        <Text style={[styles.bubbleTxt, m.fromMe && { color: '#fff' }]}>
          {m.text}
        </Text>
        <Text
          style={[
            styles.bubbleMeta,
            m.fromMe ? { color: 'rgba(255,255,255,0.55)' } : null,
          ]}
        >
          {m.time}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  who: { ...typography.bodyMedium, fontSize: 15 },
  status: { fontFamily: 'Outfit_500Medium', fontSize: 11, color: colors.sage2 },

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

  proposalLabel: {
    color: colors.violet2,
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: 'Outfit_500Medium',
    marginBottom: 6,
  },
  proposalWhen: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 18 },
  proposalDetail: { ...typography.small, fontSize: 12, marginTop: 2 },

  compose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(251,249,246,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  composeIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    ...typography.body,
    color: colors.ink,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
