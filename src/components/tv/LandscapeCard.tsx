import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Palette, Radius, Typography } from "../../constants/theme";
import { JellyfinItem, JellyfinService, JellyfinSession } from "../../services/jellyfin";
import { MediaLink } from "../MediaLink";

interface LandscapeCardProps {
  item: JellyfinItem;
  session: JellyfinSession;
  width: number;
  onRefresh?: () => void;
  seriesOnly?: boolean;
}

/** 16:9 artwork card: Thumb art if available, otherwise backdrop with the title logo on top. */
export function LandscapeCard({ item, session, width, onRefresh, seriesOnly }: LandscapeCardProps) {
  const hasThumb = !!item.ImageTags?.Thumb;
  const logoId = hasThumb ? null : JellyfinService.getLogoItemId(item);
  const imageUrl = JellyfinService.getImageUrl(
    session.serverUrl,
    item.Id,
    hasThumb ? "Thumb" : "Backdrop",
    640
  );

  return (
    <MediaLink
      item={item}
      session={session}
      onRefresh={onRefresh}
      seriesOnly={seriesOnly}
      style={{ width }}
      footer={
        <Text style={styles.title} numberOfLines={1}>
          {item.Name}
        </Text>
      }
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
    </MediaLink>
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
