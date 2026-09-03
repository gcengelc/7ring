import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme';

type Tone = 'primary' | 'accent' | 'subtle' | 'ghost' | 'outline';

interface Props {
  label: string;
  onPress: () => void;
  tone?: Tone;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const tones: Record<Tone, { bg: string; fg: string; height: number; border?: string }> = {
  /** Lacivert — ana eylem. */
  primary: { bg: colors.navy, fg: colors.onNavy, height: 58 },
  /** Amber — onay anı; ekranda tek bir tane bulunur. */
  accent: { bg: colors.amber, fg: colors.navy, height: 58 },
  subtle: { bg: colors.subtle, fg: colors.ink, height: 52 },
  ghost: { bg: 'transparent', fg: colors.onNavy55, height: 36 },
  outline: { bg: 'transparent', fg: colors.muted, height: 52, border: colors.hairline },
};

export function Button({
  label,
  onPress,
  tone = 'primary',
  loading = false,
  disabled = false,
  style,
  accessibilityHint,
}: Props) {
  const t = tones[tone];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.base,
        {
          height: t.height,
          backgroundColor: t.bg,
          borderRadius: t.height >= 56 ? radius.action : radius.control,
          ...(t.border ? { borderWidth: 1, borderColor: t.border } : null),
          opacity: inactive ? 0.55 : pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={t.fg} />
      ) : (
        <Text
          style={{
            color: t.fg,
            fontFamily: tone === 'ghost' ? fonts.regular : fonts.semibold,
            fontSize: tone === 'ghost' ? 13.5 : tone === 'subtle' ? 15.5 : 16.5,
            letterSpacing: -0.16,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
