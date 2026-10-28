import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Palette, Radius, Typography } from "../../constants/theme";
import { formatMinutes, useTranslation } from "../../i18n";
import { JellyfinItem, JellyfinService, JellyfinSession } from "../../services/jellyfin";
import { MediaLink } from "../MediaLink";
import { ProgressBar } from "./ProgressBar";

const TICKS_PER_MINUTE = 10000000 * 60;

interface ContinueWatchingCardProps {
  item: JellyfinItem;
  session: JellyfinSession;
  index: number;
  width: number;
  gap: number;
  onRefresh?: () => void;
}

/**
 * One card for both in-progress items (progress bar + time left)
 * and upcoming episodes from Jellyfin's Next Up.
 */
export function ContinueWatchingCard({
  item,
  session,
  index,
  width,
  gap,
  onRefresh,
}: ContinueWatchingCardProps) {
  const { t } = useTranslation();

  // FLIP reorder: slide from the old slot when the list order changes
  const prevIndexRef = useRef(index);
  const translateX = useState(() => new Animated.Value(0))[0];
  const reorderScale = useState(() => new Animated.Value(1))[0];
  const [zIndex, setZIndex] = useState(1);

  // Cross-fade when the card's series advances to another episode
  const prevItemIdRef = useRef(item.Id);
  const contentFade = useState(() => new Animated.Value(1))[0];

  useLayoutEffect(() => {
    if (prevIndexRef.current === index) return;
    const deltaX = (prevIndexRef.current - index) * (width + gap);
    const isPromoted = prevIndexRef.current > 0 && index === 0;
    prevIndexRef.current = index;

    translateX.setValue(deltaX);
    const slide = Animated.spring(translateX, {
      toValue: 0,
      tension: 40,
      friction: 7.5,
      useNativeDriver: true,
    });
    if (isPromoted) {
      setZIndex(20);
      reorderScale.setValue(1.04);
      Animated.parallel([
        slide,
        Animated.spring(reorderScale, { toValue: 1, tension: 42, friction: 7, useNativeDriver: true }),
      ]).start(() => setZIndex(1));
    } else {
      slide.start();
    }
  }, [index, width, gap, translateX, reorderScale]);

  useEffect(() => {
    if (prevItemIdRef.current === item.Id) return;
    prevItemIdRef.current = item.Id;
    Animated.sequence([
      Animated.timing(contentFade, { toValue: 0.2, duration: 120, useNativeDriver: true }),
      Animated.timing(contentFade, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [item.Id, contentFade]);

  const isEpisode = item.Type === "Episode";
  const positionTicks = item.UserData?.PlaybackPositionTicks || 0;
  const totalTicks = item.RunTimeTicks || 0;
  const inProgress = positionTicks > 0;
  const percent = totalTicks > 0 ? (positionTicks / totalTicks) * 100 : item.UserData?.PlayedPercentage || 0;

  // Episodes always show their own still; the series backdrop is only a fallback
  const [failedStillId, setFailedStillId] = useState<string | null>(null);
  const stillFailed = failedStillId === item.Id;
  const imageUrl =
    isEpisode && !stillFailed
      ? JellyfinService.getImageUrl(session.serverUrl, item.Id, "Primary", 640)
      : JellyfinService.getImageUrl(
          session.serverUrl,
          item.ParentBackdropItemId || item.SeriesId || item.Id,
          "Backdrop",
          640
        );

  let overline: string;
  if (inProgress && totalTicks > 0) {
    const left = Math.max(1, Math.round((totalTicks - positionTicks) / TICKS_PER_MINUTE));
    overline = t("continueCard.timeLeft", { time: formatMinutes(left, t) });
  } else if (inProgress) {
    overline = t("continueCard.resume");
  } else {
    overline = isEpisode ? t("continueCard.nextEpisode") : t("continueCard.toWatch");
  }

  const title = isEpisode ? item.SeriesName || item.Name : item.Name;
  const subtitle = isEpisode
    ? `S${item.ParentIndexNumber ?? 1}, E${item.IndexNumber ?? 1} · ${item.Name}`
    : item.ProductionYear
      ? String(item.ProductionYear)
      : null;

  return (
    <Animated.View
      style={{
        width,
        zIndex,
        transform: [{ translateX }, { scale: reorderScale }],
      }}
    >
      <MediaLink item={item} session={session} onRefresh={onRefresh} playOnPress continueWatching>
        <Animated.View style={{ opacity: contentFade }}>
          <View style={[styles.artwork, { width, height: (width * 9) / 16 }]}>
            <Image
              source={{ uri: imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={250}
              recyclingKey={item.Id}
              onError={() => isEpisode && setFailedStillId(item.Id)}
            />
            {inProgress && (
              <>
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.7)"]}
                  style={styles.bottomShade}
                />
                <ProgressBar percent={percent} style={styles.progress} />
              </>
            )}
          </View>

          <Text style={styles.overline} numberOfLines={1}>
            {overline.toUpperCase()}
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </Animated.View>
      </MediaLink>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  artwork: {
    borderRadius: Radius.card,
    overflow: "hidden",
    backgroundColor: Palette.surface,
    marginBottom: 10,
  },
  bottomShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
  },
  progress: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
  },
  overline: {
    ...Typography.caption2,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: Palette.labelSecondary,
    marginBottom: 2,
  },
  title: {
    ...Typography.subhead,
    fontSize: 14,
    fontWeight: "600",
    color: Palette.label,
  },
  subtitle: {
    ...Typography.footnote,
    color: Palette.labelSecondary,
    marginTop: 1,
  },
});
