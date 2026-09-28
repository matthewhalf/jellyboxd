import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Palette, Radius, Typography } from "../../constants/theme";
import { useLiquidGlassMenu } from "../../context/LiquidGlassMenuContext";
import { usePressScale } from "../../hooks/use-press-scale";
import { haptics } from "../../lib/haptics";
import { JellyfinItem, JellyfinService, JellyfinSession } from "../../services/jellyfin";

interface LandscapeCardProps {
  item: JellyfinItem;
  session: JellyfinSession;
  width: number;
  onRefresh?: () => void;
  seriesOnly?: boolean;
}

/** 16:9 artwork card: Thumb art if available, otherwise backdrop with the title logo on top. */
export function LandscapeCard({ item, session, width, onRefresh, seriesOnly }: LandscapeCardProps) {
  const router = useRouter();
  const { openMenu } = useLiquidGlassMenu();
  const { scale, onPressIn, onPressOut, bounce } = usePressScale();

  const hasThumb = !!item.ImageTags?.Thumb;
  const logoId = hasThumb ? null : JellyfinService.getLogoItemId(item);
  const imageUrl = JellyfinService.getImageUrl(
    session.serverUrl,
    item.Id,
    hasThumb ? "Thumb" : "Backdrop",
    640
  );

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
        <View style={[styles.artwork, { width, height: (width * 9) / 16 }]}>
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={250}
            recyclingKey={item.Id}
          />
          {logoId && (
            <>
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={styles.shade} />
              <Image
                source={{ uri: JellyfinService.getImageUrl(session.serverUrl, logoId, "Logo", 400) }}
                style={[styles.logo, { width: width * 0.55, height: width * 0.16 }]}
                contentFit="contain"
                contentPosition="left bottom"
                transition={250}
              />
            </>
          )}
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {item.Name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  artwork: {
    borderRadius: Radius.card,
    overflow: "hidden",
    backgroundColor: Palette.surface,
    marginBottom: 8,
  },
  shade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
  },
  logo: {
    position: "absolute",
    left: 12,
    bottom: 10,
  },
  title: {
    ...Typography.footnote,
    color: Palette.labelSecondary,
  },
});
