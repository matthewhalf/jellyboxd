import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Palette, Radius, Typography } from "../constants/theme";
import { useLiquidGlassMenu } from "../context/LiquidGlassMenuContext";
import { usePressScale } from "../hooks/use-press-scale";
import { haptics } from "../lib/haptics";
import { JellyfinItem, JellyfinService, JellyfinSession } from "../services/jellyfin";

interface PosterCardProps {
  item: JellyfinItem;
  session: JellyfinSession | null;
  width?: number;
  height?: number;
  onRefresh?: () => void;
  seriesOnly?: boolean;
}

export const PosterCard: React.FC<PosterCardProps> = ({
  item,
  session,
  width = 120,
  height = 180,
  onRefresh,
  seriesOnly = false,
}) => {
  const router = useRouter();
  const { openMenu } = useLiquidGlassMenu();
  const { scale, onPressIn, onPressOut, bounce } = usePressScale();

  const imageUrl = session
    ? JellyfinService.getImageUrl(session.serverUrl, item.Id, "Primary", 360)
    : "";

  return (
    <Animated.View style={{ width, transform: [{ scale }] }}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          haptics.light();
          router.push(`/item/${item.Id}`);
        }}
        onLongPress={() => {
          bounce();
          openMenu({ item, session, onRefresh, seriesOnly });
        }}
        delayLongPress={300}
      >
        <View style={[styles.posterWrapper, { width, height }]}>
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={250}
            recyclingKey={item.Id}
          />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {item.Name}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  posterWrapper: {
    borderRadius: Radius.card,
    overflow: "hidden",
    backgroundColor: Palette.surface,
    marginBottom: 8,
  },
  title: {
    ...Typography.footnote,
    color: Palette.labelSecondary,
  },
});
