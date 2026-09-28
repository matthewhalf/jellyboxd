import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Gutter, Palette, Typography } from "../../constants/theme";
import { haptics } from "../../lib/haptics";

interface ShelfProps {
  title: string;
  /** When set, the title becomes tappable and shows a chevron. */
  onSeeAll?: () => void;
  gap?: number;
  children: React.ReactNode;
}

/** Horizontal row of cards with an Apple TV+ style "Title ›" header. */
export function Shelf({ title, onSeeAll, gap = 12, children }: ShelfProps) {
  return (
    <View style={styles.section}>
      <Pressable
        disabled={!onSeeAll}
        onPress={() => {
          haptics.light();
          onSeeAll?.();
        }}
        style={styles.header}
        accessibilityRole={onSeeAll ? "button" : "header"}
      >
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {onSeeAll && <Ionicons name="chevron-forward" size={20} color={Palette.labelSecondary} />}
      </Pressable>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.list, { gap }]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: Gutter,
    marginBottom: 12,
  },
  title: {
    ...Typography.title2,
    color: Palette.label,
  },
  list: {
    paddingHorizontal: Gutter,
  },
});
