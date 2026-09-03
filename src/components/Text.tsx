import React from 'react';
import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native';

import { colors, fonts } from '@/theme';

type Variant =
  | 'display' // giriş başlığı
  | 'title' // sekme başlığı
  | 'heading' // kart / detay başlığı
  | 'body'
  | 'row' // liste satırı adı
  | 'label' // küçük büyük harfli etiket
  | 'meta' // ikincil küçük metin
  | 'stat'; // sayaç

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.semibold, fontSize: 40, lineHeight: 41, letterSpacing: -1.2 },
  title: { fontFamily: fonts.semibold, fontSize: 28, letterSpacing: -0.84 },
  heading: { fontFamily: fonts.semibold, fontSize: 34, lineHeight: 36, letterSpacing: -1.02 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  row: { fontFamily: fonts.medium, fontSize: 16, letterSpacing: -0.16 },
  label: {
    fontFamily: fonts.regular,
    fontSize: 12,
    letterSpacing: 1.68,
    textTransform: 'uppercase',
  },
  meta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  stat: { fontFamily: fonts.semibold, fontSize: 26, letterSpacing: -0.52 },
};

interface Props extends TextProps {
  variant?: Variant;
  /** Rakamların sütun hâlinde hizalanması gereken yerlerde. */
  tabular?: boolean;
}

/**
 * Tek tipografi girişi. Ekranlar fontFamily/fontSize yazmaz, varyant seçer;
 * böylece Instrument Sans ölçeği tek yerde durur.
 */
export function Text({ variant = 'body', tabular, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={StyleSheet.flatten([
        { color: colors.ink },
        variants[variant],
        tabular ? { fontVariant: ['tabular-nums' as const] } : null,
        style,
      ])}
    />
  );
}
