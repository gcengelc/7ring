import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, radius, spacing } from '@/theme';

interface Props {
  /** Onayı beklenen durağın adı; null ise sayfa kapalı. */
  stopName: string | null;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Bildirim onayı. Tek dokunuşla bildirim göndermek yerine araya bu adım
 * giriyor: yanlış bildirim herkesi yanlış durağa koşturur.
 */
export function ConfirmSheet({ stopName, submitting, onConfirm, onCancel }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={stopName !== null}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel="Kapat" />
      <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
        <View style={styles.grabber} />
        <Text variant="label">Bildirimi onayla</Text>
        <Text variant="heading" style={styles.question}>
          Ringi {stopName} durağında mı gördün?
        </Text>
        <Text variant="body" style={styles.note}>
          Bildirim adına kaydedilir. Yanlış bildirimler diğer öğrencileri yanıltır ve güven
          puanını düşürür.
        </Text>
        <View style={styles.actions}>
          <Button
            label="Evet, şimdi gördüm"
            tone="accent"
            loading={submitting}
            onPress={onConfirm}
          />
          <Button label="Vazgeç" tone="subtle" disabled={submitting} onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 24,
    paddingTop: 26,
  },
  grabber: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.hairline,
    alignSelf: 'center',
    marginBottom: 20,
  },
  question: { marginTop: 10, fontSize: 27, lineHeight: 30 },
  note: { marginTop: 12, fontSize: 14.5, lineHeight: 22, color: colors.muted },
  actions: { marginTop: 24, gap: 10, paddingHorizontal: 0, marginHorizontal: 0 },
  spacer: { height: spacing.gutter },
});
