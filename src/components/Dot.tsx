import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useAnimatedValue } from 'react-native';

interface Props {
  color: string;
  size?: number;
  /** Ana ekrandaki "şu anda burada" göstergesi için genişleyen halka. */
  pulse?: boolean;
  /**
   * Noktanın dışına çizilen halka rengi (web'deki `box-shadow 0 0 0 3px`
   * karşılığı). Hat şemasında pinleri lacivert zeminden ayırır.
   */
  ring?: string;
}

const RING_WIDTH = 3;

/** Tazelik noktası — listelerde, kartta ve haritada aynı işaret. */
export function Dot({ color, size = 9, pulse = false, ring }: Props) {
  const anim = useAnimatedValue(0);
  const loop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!pulse) return;
    const animation = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.current = animation;
    animation.start();
    return () => animation.stop();
  }, [pulse, anim]);

  const core = (
    <View style={{ width: size, height: size }}>
      {pulse && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: size / 2,
              backgroundColor: color,
              opacity: anim.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [0.55, 0, 0],
              }),
              transform: [
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 2.1] }) },
              ],
            },
          ]}
        />
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: size / 2, backgroundColor: color },
        ]}
      />
    </View>
  );

  if (!ring) return core;

  return (
    <View
      style={{
        padding: RING_WIDTH,
        borderRadius: size / 2 + RING_WIDTH,
        backgroundColor: ring,
      }}
    >
      {core}
    </View>
  );
}
