import React, { useEffect } from 'react';
import { Animated, StyleSheet, useAnimatedValue } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme';

/** Bildirim gönderildikten sonra çıkan kısa onay şeridi. */
export function Toast({ message, bottom = 112 }: { message: string; bottom?: number }) {
  const anim = useAnimatedValue(0);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [message, anim]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={[
        styles.toast,
        {
          bottom,
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
          ],
        },
      ]}
    >
      <Text style={styles.label}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 90,
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
    maxWidth: '90%',
  },
  label: { color: colors.onNavy, fontFamily: fonts.medium, fontSize: 14, textAlign: 'center' },
});
