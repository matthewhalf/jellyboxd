import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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

export const NEXT_UP_CARD_WIDTH = 260;
export const NEXT_UP_CARD_GAP = 8;

interface NextUpCardProps {
  item: JellyfinItem;
  session: JellyfinSession;
  index: number;
  onRefresh?: () => void;
}

export const NextUpCard: React.FC<NextUpCardProps> = ({
  item,
  session,
  index,
  onRefresh,
}) => {
  const router = useRouter();
  const { openMenu } = useLiquidGlassMenu();

  // Spring touch animation
  const touchScale = useRef(new Animated.Value(1)).current;

  // FLIP reordering values
  const prevIndexRef = useRef(index);
  const translateX = useRef(new Animated.Value(0)).current;
  const reorderScale = useRef(new Animated.Value(1)).current;
  const [zIndex, setZIndex] = useState(1);

  // Crossfade transition when episode changes
  const prevItemIdRef = useRef(item.Id);
  const contentFade = useRef(new Animated.Value(1)).current;

  // Smooth FLIP reordering when the card moves (e.g. promoted to index 0)
  useLayoutEffect(() => {
    if (prevIndexRef.current !== index) {
      const oldIndex = prevIndexRef.current;
      const newIndex = index;
      prevIndexRef.current = index;

      const deltaX = (oldIndex - newIndex) * (NEXT_UP_CARD_WIDTH + NEXT_UP_CARD_GAP);
      if (deltaX !== 0) {
        const isPromoted = oldIndex > 0 && newIndex === 0;

        if (isPromoted) {
          setZIndex(30);
          translateX.setValue(deltaX);
          reorderScale.setValue(1.04);

          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              tension: 38,
              friction: 7.5,
              useNativeDriver: true,
            }),
            Animated.spring(reorderScale, {
              toValue: 1,
              tension: 40,
              friction: 7,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setZIndex(1);
          });
        } else {
          translateX.setValue(deltaX);
          Animated.spring(translateX, {
            toValue: 0,
            tension: 38,
            friction: 7.5,
            useNativeDriver: true,
          }).start();
        }
      }
    }
  }, [index]);

  // Smooth crossfade when the episode updates to the next one
  useEffect(() => {
    if (prevItemIdRef.current !== item.Id) {
      prevItemIdRef.current = item.Id;

      Animated.sequence([
        Animated.timing(contentFade, {
          toValue: 0.15,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [item.Id]);

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
      Animated.timing(touchScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(touchScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    openMenu({ item, session, onRefresh });
  };

  // User requested: for the Next Up ("A seguire") section, continue using the series backdrop
  const backdropId = item.ParentBackdropItemId || item.SeriesId || item.Id;
  const imageUrl = JellyfinService.getImageUrl(
    session.serverUrl,
    backdropId,
    "Backdrop",
    600
  );
  const runtimeMins = item.RunTimeTicks
    ? Math.round(item.RunTimeTicks / (10000000 * 60))
    : null;

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          zIndex,
          transform: [
            { translateX },
            { scale: Animated.multiply(touchScale, reorderScale) },
          ],
        },
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          haptics.light();
          router.push(`/player/${item.Id}`);
        }}
        onLongPress={handleLongPress}
        delayLongPress={300}
      >
        <Animated.View style={{ opacity: contentFade }}>
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            {runtimeMins && (
              <View style={styles.timeBadge}>
                <Ionicons name="time-outline" size={10} color="#ffffff" />
                <Text style={styles.timeText}>{runtimeMins} min</Text>
              </View>
            )}
            <View style={styles.playOverlay}>
              <Ionicons
                name="play-circle"
                size={34}
                color="rgba(255,255,255,0.9)"
              />
            </View>
          </View>

          <Text style={styles.title} numberOfLines={1}>
            {item.SeriesName || item.Name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            S{item.ParentIndexNumber ?? 1}:E{item.IndexNumber ?? 1} • {item.Name}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: NEXT_UP_CARD_WIDTH,
    marginRight: NEXT_UP_CARD_GAP,
  },
  thumbnailContainer: {
    width: NEXT_UP_CARD_WIDTH,
    height: 146,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#1f252d",
    marginBottom: 8,
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  timeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  timeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: "#9ab",
  },
});
