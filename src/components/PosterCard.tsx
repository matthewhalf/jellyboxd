import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLiquidGlassMenu } from "../context/LiquidGlassMenuContext";
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
  width = 110,
  height = 165,
  onRefresh,
  seriesOnly = false,
}) => {
  const router = useRouter();
  const { openMenu } = useLiquidGlassMenu();
  const touchScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(touchScale, {
      toValue: 0.94,
      friction: 6,
      tension: 240,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(touchScale, {
      toValue: 1,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const handleLongPress = () => {
    Animated.sequence([
      Animated.timing(touchScale, { toValue: 0.91, duration: 80, useNativeDriver: true }),
      Animated.spring(touchScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    openMenu({ item, session, onRefresh, seriesOnly });
  };

  const imageUrl = session
    ? JellyfinService.getImageUrl(session.serverUrl, item.Id, "Primary", 350)
    : "";

  const rating = item.CommunityRating ? item.CommunityRating.toFixed(1) : null;

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        { width, transform: [{ scale: touchScale }] },
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          haptics.light();
          router.push(`/item/${item.Id}`);
        }}
        onLongPress={handleLongPress}
        delayLongPress={300}
      >
        <View style={[styles.posterWrapper, { width, height }]}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.poster}
            resizeMode="cover"
          />
          {rating && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={10} color="#ffcc00" />
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {item.Name}
        </Text>
        {item.ProductionYear && (
          <Text style={styles.subtitle}>{item.ProductionYear}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginRight: 8,
  },
  posterWrapper: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#1f252d",
    marginBottom: 6,
    position: "relative",
  },
  poster: {
    width: "100%",
    height: "100%",
  },
  ratingBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: "#9ab",
  },
});
