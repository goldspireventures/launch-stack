import type { ReactNode } from 'react';
import { useRef } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = Omit<PressableProps, 'children'> & {
  children: ReactNode;
  /** When false, behaves like a plain Pressable (no scale). */
  motionEnabled: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Press-in scale feedback for primary actions, gated by tenant `feature.mobile_press_animations`.
 */
export function ScaledPressable({ children, motionEnabled, onPressIn, onPressOut, style, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const animatedStyle = { transform: [{ scale }] };

  if (!motionEnabled) {
    return (
      <Pressable style={style} onPressIn={onPressIn} onPressOut={onPressOut} {...rest}>
        {children}
      </Pressable>
    );
  }

  const run = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      friction: 7,
      tension: 320,
    }).start();

  return (
    <Pressable
      {...rest}
      style={style}
      onPressIn={(e) => {
        run(0.97);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        run(1);
        onPressOut?.(e);
      }}
    >
      <Animated.View className="flex-1" style={animatedStyle}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
