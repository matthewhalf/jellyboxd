import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLiquidGlassMenu } from "../context/LiquidGlassMenuContext";
import { haptics } from "../lib/haptics";
import { JellyfinItem, JellyfinService, JellyfinSession } from "../services/jellyfin";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 3;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

interface GridCardProps {
  item: JellyfinItem;
  session: JellyfinSession | null;
  onRefresh?: () => void;
  seriesOnly?: boolean;
}

export const GridCard: React.FC<GridCardProps> = ({
  item,
  session,
  onRefresh,
  seriesOnly = false,
}) => {
  const router = useRouter();
  const { openMenu } = useLiquidGlassMenu();
  const touchScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(touchScale, {
      toValue: 0.93,
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
      Animated.timing(touchScale, { toValue: 0.90, duration: 80, useNativeDriver: true }),
      Animated.spring(touchScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    openMenu({ item, session, onRefresh, seriesOnly });
  };

  const imageUrl = session
    ? JellyfinService.getImageUrl(session.serverUrl, item.Id, "Primary", 350)
    : "";

  const rating = item.CommunityRating ? item.CommunityRating.toFixed(1) : null;
  const isMovie = item.Type === "Movie";

  return (
    <Animated.View
      style={[
        styles.card,
        { transform: [{ scale: touchScale }] },
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
        <Text style={styles.title} numberOfLines={1}>
          {item.Name}
        </Text>
        {item.ProductionYear && (
          <Text style={styles.sub}>{item.ProductionYear}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
  },
  poster: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
    backgroundColor: "#1f252d",
    marginBottom: 6,
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
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 2,
  },
  sub: {
    fontSize: 11,
    color: "#9ab",
  },
});
