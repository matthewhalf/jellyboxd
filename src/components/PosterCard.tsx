import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Palette, Radius, Typography } from "../constants/theme";
import { JellyfinItem, JellyfinService, JellyfinSession } from "../services/jellyfin";
import { MediaLink } from "./MediaLink";

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
  const imageUrl = session
    ? JellyfinService.getImageUrl(session.serverUrl, item.Id, "Primary", 360)
    : "";

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
      <View style={[styles.posterWrapper, { width, height }]}>
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
