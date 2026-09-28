import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Palette, Radius } from "../../constants/theme";

/** Thin rounded playback progress bar. `percent` is 0–100. */
export function ProgressBar({ percent, style }: { percent: number; style?: ViewStyle }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={[styles.track, style]}>
      <View style={[styles.fill, { width: `${clamped}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: Palette.progressTrack,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: Radius.pill,
    backgroundColor: Palette.progressFill,
  },
});
