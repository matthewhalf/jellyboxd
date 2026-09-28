import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Animated, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { Palette, Radius, Typography } from "../../constants/theme";
import { usePressScale } from "../../hooks/use-press-scale";

interface PillButtonProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "glass";
  /** Smaller footprint, e.g. for the hero carousel where it shares space with a poster. */
  compact?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

/** White "Play" pill or a round translucent glass button, as in Apple TV+. */
export function PillButton({
  label,
  icon,
  variant = "primary",
  compact = false,
  onPress,
  style,
  accessibilityLabel,
}: PillButtonProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.94);
  const isPrimary = variant === "primary";
  const iconOnly = !label;
  const color = isPrimary ? Palette.buttonPrimaryLabel : Palette.label;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        style={[
          styles.base,
          compact && styles.baseCompact,
          iconOnly ? styles.iconOnly : styles.withLabel,
          !iconOnly && compact && styles.withLabelCompact,
          iconOnly && compact && styles.iconOnlyCompact,
          isPrimary ? styles.primary : styles.glass,
        ]}
      >
        {!isPrimary && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
        {icon && <Ionicons name={icon} size={iconOnly ? 22 : 18} color={color} />}
        {label && <Text style={[styles.label, compact && styles.labelCompact, { color }]}>{label}</Text>}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: Radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
  },
  baseCompact: {
    height: 38,
  },
  withLabel: {
    paddingHorizontal: 28,
    minWidth: 150,
  },
  withLabelCompact: {
    paddingHorizontal: 20,
    minWidth: 120,
  },
  iconOnly: {
    width: 48,
  },
  iconOnlyCompact: {
    width: 38,
  },
  primary: {
    backgroundColor: Palette.buttonPrimary,
  },
  glass: {
    backgroundColor: Palette.glass,
  },
  label: {
    ...Typography.headline,
  },
  labelCompact: {
    fontSize: 15,
  },
});
