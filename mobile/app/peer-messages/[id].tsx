import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@components/Avatar';
import { ChatBubble } from '@components/ChatBubble';
import { ChatComposer } from '@components/ChatComposer';
import { Icon } from '@components/Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { peerMessageRepo } from '@data/repos';
import type { ChatMessage } from '@data/types';
import { appendOptimisticMessage } from '@utils/appendOptimisticMessage';
import { withDayMarks } from '@utils/chatDayMarks';

const POLL_INTERVAL_MS = 6000;

export default function PeerChat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const { data: conv } = useQuery({
    queryKey: ['peer-conversation', id],
    queryFn: () => peerMessageRepo.conversation(String(id)),
  });
  const { data: msgs = [] } = useQuery({
    queryKey: ['peer-messages', id],
    queryFn: () => peerMessageRepo.messages(String(id)),
    refetchInterval: POLL_INTERVAL_MS,
  });
  const allMsgs = useMemo(() => withDayMarks([...msgs, ...pending]), [msgs, pending]);

  const sendMutation = useMutation({
    mutationFn: (value: string) => peerMessageRepo.send(String(id), value),
    onSuccess: () => {
      setPending([]);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['peer-messages', id] });
      queryClient.invalidateQueries({ queryKey: ['peer-conversations'] });
    },
  });

  useEffect(() => {
    return () => {
      queryClient.invalidateQueries({ queryKey: ['peer-conversations'] });
    };
  }, [queryClient]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    const withOptimistic = appendOptimisticMessage(pending, trimmed);
    const optimisticId = withOptimistic[withOptimistic.length - 1].id;
    setPending(withOptimistic);
    setText('');
    sendMutation.mutate(trimmed, {
      onError: (err: any) => {
        setPending((prev) => prev.filter((m) => m.id !== optimisticId));
        setText(trimmed);
        setError(err?.message ?? "Échec de l'envoi, réessayez.");
      },
    });
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
          <Text style={styles.who}>{conv?.name ?? 'Conversation'}</Text>
          <Text style={styles.status}>Praticien</Text>
        </View>
      </View>

      <LinearGradient colors={[colors.pearl, '#F6F1EA']} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 10 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {allMsgs.length === 0 ? (
            <Text style={styles.empty}>Écrivez le premier message de cette conversation.</Text>
          ) : (
            allMsgs.map((m) => <ChatBubble key={m.id} message={m} />)
          )}
        </ScrollView>
      </LinearGradient>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ChatComposer
        value={text}
        onChangeText={setText}
        onSend={send}
        containerStyle={{ paddingBottom: insets.bottom + 10 }}
      />
    </KeyboardAvoidingView>
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
  empty: { ...typography.small, textAlign: 'center', marginTop: 40 },
  error: {
    ...typography.small,
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    backgroundColor: 'rgba(251,249,246,0.96)',
  },
});
