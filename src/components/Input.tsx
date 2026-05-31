import React, { useState } from 'react';
import {
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
import Svg, { Circle, Path } from 'react-native-svg';

interface Props extends TextInputProps {
  label?: string;
  leftIcon?: React.ReactNode;
  multiline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  leftIcon,
  multiline,
  containerStyle,
  style,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          multiline && { minHeight: 96, paddingVertical: 12 },
          focused && styles.inputFocus,
        ]}
      >
        {leftIcon ? <View style={{ marginRight: 8 }}>{leftIcon}</View> : null}
        <TextInput
          {...rest}
          multiline={multiline}
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
