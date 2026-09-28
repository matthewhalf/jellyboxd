import { useState } from "react";
import { Animated } from "react-native";

/** Spring "shrink on touch" used by every tappable card. */
export function usePressScale(pressedScale: number = 0.95) {
  const scale = useState(() => new Animated.Value(1))[0];

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: pressedScale,
      friction: 6,
      tension: 240,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const bounce = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: pressedScale - 0.03, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
  };

  return { scale, onPressIn, onPressOut, bounce };
}
