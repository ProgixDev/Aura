import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { radii, spacing } from '@theme/spacing';
import Svg, { Circle, Line, Path } from 'react-native-svg';

interface Props extends TextInputProps {
  label?: string;
  leftIcon?: React.ReactNode;
  multiline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke={colors.muted}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="3" stroke={colors.muted} strokeWidth={1.6} />
      {!open && <Line x1="3" y1="21" x2="21" y2="3" stroke={colors.muted} strokeWidth={1.6} strokeLinecap="round" />}
    </Svg>
  );
}

export function Input({
  label,
  leftIcon,
  multiline,
  containerStyle,
  style,
  secureTextEntry,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isPasswordField = secureTextEntry !== undefined;
  return (
    <View style={[styles.field, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          multiline && { height: undefined, minHeight: 96, paddingVertical: 12, alignItems: 'flex-start' },
          focused && styles.inputFocus,
        ]}
      >
        {leftIcon ? <View style={{ marginRight: 8 }}>{leftIcon}</View> : null}
        <TextInput
          {...rest}
          multiline={multiline}
          secureTextEntry={isPasswordField ? secureTextEntry && !revealed : secureTextEntry}
          placeholderTextColor={colors.muted}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            styles.input,
            multiline && { textAlignVertical: 'top', height: undefined, minHeight: 72 },
            style,
          ]}
        />
        {isPasswordField && (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={8}
            style={{ marginLeft: 8 }}
            accessibilityLabel={revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            <EyeIcon open={revealed} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function SearchInput(props: TextInputProps) {
  const icon = (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={colors.muted} strokeWidth={1.6} />
      <Path d="m20 20-3.5-3.5" stroke={colors.muted} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
  return <Input leftIcon={icon} {...props} />;
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 14,
  },
  label: {
    ...typography.tiny,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 18,
    borderRadius: radii.md + 2,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  inputFocus: {
    borderColor: colors.violet2,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.ink,
    padding: 0,
  },
});
