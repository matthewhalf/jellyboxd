import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useRef } from "react";
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

export const RESUME_CARD_WIDTH = 260;
export const RESUME_CARD_GAP = 8;

interface ResumeCardProps {
  item: JellyfinItem;
  session: JellyfinSession;
  index: number;
  onRefresh?: () => void;
}

export const ResumeCard: React.FC<ResumeCardProps> = ({
  item,
  session,
  index,
  onRefresh,
}) => {
  const router = useRouter();
  const { openMenu } = useLiquidGlassMenu();

  // Scale spring animation on press
  const touchScale = useRef(new Animated.Value(1)).current;

  // FLIP reorder animation
  const prevIndexRef = useRef(index);
  const translateX = useRef(new Animated.Value(0)).current;
  const reorderScale = useRef(new Animated.Value(1)).current;
  const [zIndex, setZIndex] = React.useState(1);

  // Content crossfade when episode changes
  const prevItemIdRef = useRef(item.Id);
  const contentFade = useRef(new Animated.Value(1)).current;

  useLayoutEffect(() => {
    if (prevIndexRef.current !== index) {
      const oldIndex = prevIndexRef.current;
      const newIndex = index;
      prevIndexRef.current = index;

      const deltaX = (oldIndex - newIndex) * (RESUME_CARD_WIDTH + RESUME_CARD_GAP);
      if (deltaX !== 0) {
        const isPromoted = oldIndex > 0 && newIndex === 0;
        if (isPromoted) {
          setZIndex(20);
          translateX.setValue(deltaX);
          reorderScale.setValue(1.04);

          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              tension: 40,
              friction: 7.5,
              useNativeDriver: true,
            }),
            Animated.spring(reorderScale, {
              toValue: 1,
              tension: 42,
              friction: 7,
              useNativeDriver: true,
            }),
          ]).start(() => setZIndex(1));
        } else {
          translateX.setValue(deltaX);
          Animated.spring(translateX, {
            toValue: 0,
            tension: 40,
            friction: 7.5,
            useNativeDriver: true,
          }).start();
        }
      }
    }
  }, [index]);

  useEffect(() => {
    if (prevItemIdRef.current !== item.Id) {
      prevItemIdRef.current = item.Id;
      Animated.sequence([
        Animated.timing(contentFade, {
          toValue: 0.2,
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

  const isEpisode = item.Type === "Episode";
  // User requested: for episodes in "continua a guardare", use the episode's own screenshot/still
  const imageUrl = isEpisode
    ? JellyfinService.getImageUrl(session.serverUrl, item.Id, "Primary", 600)
    : JellyfinService.getImageUrl(
        session.serverUrl,
        item.ParentBackdropItemId || item.Id,
        "Backdrop",
        600
      );

  const positionTicks = item.UserData?.PlaybackPositionTicks || 0;
  const totalTicks = item.RunTimeTicks || 0;
  const percent =
    totalTicks > 0
      ? Math.min(100, Math.round((positionTicks / totalTicks) * 100))
      : Math.round(item.UserData?.PlayedPercentage || 0);

  let remainingText = "";
  if (totalTicks > 0 && positionTicks > 0) {
    const remainingTicks = Math.max(0, totalTicks - positionTicks);
    const remainingMins = Math.max(1, Math.round(remainingTicks / (10000000 * 60)));
    remainingText = `${remainingMins} min rimasti`;
  } else if (item.RunTimeTicks) {
    const remainingTicks = item.RunTimeTicks * (1 - (percent > 0 ? percent : 20) / 100);
    const remainingMins = Math.max(1, Math.round(remainingTicks / (10000000 * 60)));
    remainingText = `${remainingMins} min rimasti`;
  }

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
            {remainingText !== "" && (
              <View style={styles.timeBadge}>
                <Ionicons name="time-outline" size={10} color="#ffffff" />
                <Text style={styles.timeText}>{remainingText}</Text>
              </View>
            )}
            <View style={styles.playOverlay}>
              <Ionicons
                name="play-circle"
                size={34}
                color="rgba(255,255,255,0.9)"
              />
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
            </View>
          </View>

          <Text style={styles.title} numberOfLines={1}>
            {isEpisode ? item.SeriesName || item.Name : item.Name}
          </Text>
          {isEpisode && (
            <Text style={styles.subtitle} numberOfLines={1}>
              S{item.ParentIndexNumber ?? 1}:E{item.IndexNumber ?? 1} • {item.Name}
            </Text>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: RESUME_CARD_WIDTH,
    marginRight: RESUME_CARD_GAP,
  },
  thumbnailContainer: {
    width: RESUME_CARD_WIDTH,
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
  progressBarBg: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#ffffff",
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
