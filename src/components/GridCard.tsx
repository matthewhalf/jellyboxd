import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Palette, Radius, Typography } from "../constants/theme";
import { JellyfinItem, JellyfinService, JellyfinSession } from "../services/jellyfin";
import { MediaLink } from "./MediaLink";

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
  const imageUrl = session
    ? JellyfinService.getImageUrl(session.serverUrl, item.Id, "Primary", 360)
    : "";

  return (
    <MediaLink
      item={item}
      session={session}
      onRefresh={onRefresh}
      seriesOnly={seriesOnly}
      pressedScale={0.94}
      style={{ width }}
      footer={
        <>
          <Text style={styles.title} numberOfLines={1}>
            {item.Name}
          </Text>
          {item.ProductionYear && <Text style={styles.sub}>{item.ProductionYear}</Text>}
        </>
      }
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
    </MediaLink>
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
