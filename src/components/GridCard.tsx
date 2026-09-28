import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Palette, Radius, Typography } from "../constants/theme";
import { useLiquidGlassMenu } from "../context/LiquidGlassMenuContext";
import { usePressScale } from "../hooks/use-press-scale";
import { haptics } from "../lib/haptics";
import { JellyfinItem, JellyfinService, JellyfinSession } from "../services/jellyfin";

interface GridCardProps {
  item: JellyfinItem;
  session: JellyfinSession | null;
  width: number;
  onRefresh?: () => void;
  seriesOnly?: boolean;
}

/** 2:3 poster tile for the 3-column library grids. */
export const GridCard: React.FC<GridCardProps> = ({
  item,
  session,
  width,
  onRefresh,
  seriesOnly = false,
}) => {
  const router = useRouter();
  const { openMenu } = useLiquidGlassMenu();
  const { scale, onPressIn, onPressOut, bounce } = usePressScale(0.94);

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
        <View style={[styles.poster, { width, height: width * 1.5 }]}>
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
        {item.ProductionYear && <Text style={styles.sub}>{item.ProductionYear}</Text>}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  poster: {
    borderRadius: Radius.card,
    overflow: "hidden",
    backgroundColor: Palette.surface,
    marginBottom: 8,
  },
  title: {
    ...Typography.footnote,
    fontWeight: "600",
    color: Palette.label,
  },
  sub: {
    ...Typography.caption1,
    color: Palette.labelSecondary,
    marginTop: 1,
  },
});
