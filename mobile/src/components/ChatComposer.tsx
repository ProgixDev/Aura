import React from 'react';
import { Pressable, StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { Icon } from './Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Text input + send button row, shared by the client and praticien chat
 * screens. `containerStyle` lets each screen apply its own bottom safe-area
 * inset without duplicating the row's layout styles.
 */
export function ChatComposer({
  value,
  onChangeText,
  onSend,
  placeholder = 'Votre message…',
  containerStyle,
}: Props) {
  return (
    <View style={[styles.compose, containerStyle]}>
      <Pressable style={styles.composeIcon}>
        <Icon name="plus" size={20} color={colors.muted} />
      </Pressable>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.composeInput}
      />
      <Pressable style={styles.sendBtn} onPress={onSend}>
        <Icon name="send" size={18} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
