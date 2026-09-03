import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Dot } from '@/components/Dot';
import { Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme';

/** Liste satırlarının ortak kabuğu — aralarındaki 1px'lik çizgi arka plandan gelir. */
export function RowGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

interface RowProps {
  name: string;
  color: string;
  onPress: () => void;
  /** Sağdaki kısa süre metni ("3 dk") — ana ekran listesi. */
  ago?: string;
  /** Ad altındaki açıklama — duraklar listesi. */
  sub?: string;
  /** Ad rengi tazelikle soluyorsa. */
  nameColor?: string;
  /** Sağda "BİLDİR" rozeti gösterilsin mi. */
  action?: string;
  accessibilityHint?: string;
}

export function StopRow({
  name,
  color,
  onPress,
  ago,
  sub,
  nameColor,
  action,
  accessibilityHint,
}: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${name}, ${sub}` : `${name}, ${ago ?? ''}`}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.row,
        { paddingVertical: sub ? 17 : 15, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Dot color={color} />
      <View style={styles.grow}>
        <Text variant="row" style={nameColor ? { color: nameColor } : undefined}>
          {name}
        </Text>
        {sub ? (
          <Text variant="meta" style={styles.sub}>
            {sub}
          </Text>
        ) : null}
      </View>
      {ago ? (
        <Text variant="meta" tabular style={styles.ago}>
          {ago}
        </Text>
      ) : null}
      {action ? (
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{action}</Text>
        </View>
      ) : (
        <Text style={styles.chevron}>›</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    marginTop: 12,
    backgroundColor: colors.hairline,
    borderRadius: radius.card,
    overflow: 'hidden',
    gap: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
  },
  grow: { flex: 1, minWidth: 0 },
  sub: { marginTop: 3, fontSize: 12.5, color: colors.muted },
  ago: { fontSize: 13.5, color: colors.muted },
  chevron: { fontSize: 13.5, color: colors.faint, fontFamily: fonts.regular },
  badge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.navy,
  },
  badgeLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.48,
    color: colors.onNavy,
  },
});
