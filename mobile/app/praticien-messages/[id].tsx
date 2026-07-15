import React, { useMemo, useRef, useState } from 'react';
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
import { praticienMessageRepo } from '@data/repos';
import type { ChatMessage } from '@data/types';
import { appendOptimisticMessage } from '@utils/appendOptimisticMessage';
import { withDayMarks } from '@utils/chatDayMarks';

const POLL_INTERVAL_MS = 6000;

export default function PraticienChat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const { data: conv } = useQuery({
    queryKey: ['praticien-conversation', id],
    queryFn: () => praticienMessageRepo.conversation(String(id)),
  });
  const { data: msgs = [] } = useQuery({
    queryKey: ['praticien-messages', id],
    queryFn: () => praticienMessageRepo.messages(String(id)),
    refetchInterval: POLL_INTERVAL_MS,
  });
  const allMsgs = useMemo(() => withDayMarks([...msgs, ...pending]), [msgs, pending]);

  const sendMutation = useMutation({
    mutationFn: (value: string) => praticienMessageRepo.send(String(id), value),
    onSuccess: () => {
      setPending([]);
      queryClient.invalidateQueries({ queryKey: ['praticien-messages', id] });
    },
  });

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPending((prev) => appendOptimisticMessage(prev, trimmed));
    setText('');
    sendMutation.mutate(trimmed);
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
          <Text style={styles.status}>Client</Text>
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
});
