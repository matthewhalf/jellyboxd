import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gutter, Palette, Typography } from "../../constants/theme";
import { useTranslation } from "../../i18n";
import { haptics } from "../../lib/haptics";
import { JellyfinItem, JellyfinService, JellyfinSession } from "../../services/jellyfin";
import { PillButton } from "./PillButton";

const AUTOPLAY_MS = 7000;

interface HeroCarouselProps {
  items: JellyfinItem[];
  session: JellyfinSession;
  width: number;
  height: number;
  /** Vertical scroll offset of the parent page, drives the stretch/parallax. */
  scrollY: Animated.Value;
}

export function HeroCarousel({ items, session, width, height, scrollY }: HeroCarouselProps) {
  const listRef = useRef<FlatList<JellyfinItem>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAutoplay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startAutoplay = useCallback(() => {
    stopAutoplay();
    if (items.length < 2) return;
    timerRef.current = setInterval(() => {
      const next = (activeIndexRef.current + 1) % items.length;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      activeIndexRef.current = next;
      setActiveIndex(next);
    }, AUTOPLAY_MS);
  }, [items.length, stopAutoplay]);

  // Only rotate while the home screen is visible
  useFocusEffect(
    useCallback(() => {
      startAutoplay();
      return stopAutoplay;
    }, [startAutoplay, stopAutoplay])
  );

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    activeIndexRef.current = index;
    setActiveIndex(index);
    startAutoplay();
  };

  // Pull-down zooms the artwork (same curve as the series detail hero); scrolling up
  // moves it slower than the page. The zoom is centered, so the sides only grow beyond
  // the screen edges, never into a visible neighboring slide while at rest.
  const imageTransform = [
    {
      translateY: scrollY.interpolate({
        inputRange: [-height, 0, height],
        outputRange: [-height / 2, 0, height * 0.35],
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    },
    {
      scale: scrollY.interpolate({
        inputRange: [-height, 0],
        outputRange: [2, 1],
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    },
  ];

  const bottomFadeOpacity = scrollY.interpolate({
    inputRange: [0, height * 0.25],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={{ width, height }}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.Id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={stopAutoplay}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => (
          <HeroSlide
            item={item}
            session={session}
            width={width}
            height={height}
            imageTransform={imageTransform}
          />
        )}
      />

      {/* The slides' own fade travels with the parallax image and gets clipped at the carousel's
          bottom edge once scrolled; this one stays put, so the seam under the hero stays soft. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.bottomFade, { height: height * 0.32, opacity: bottomFadeOpacity }]}
      >
        <LinearGradient
          colors={["transparent", Palette.background]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {items.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {items.map((item, i) => (
            <View key={item.Id} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

interface HeroSlideProps {
  item: JellyfinItem;
  session: JellyfinSession;
  width: number;
  height: number;
  imageTransform: any;
}

function HeroSlide({ item, session, width, height, imageTransform }: HeroSlideProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [logoFailed, setLogoFailed] = useState(false);
  const logoId = JellyfinService.getLogoItemId(item);
  const showLogo = !!logoId && !logoFailed;

  const meta = [
    item.Type === "Movie" ? t("hero.movie") : t("hero.series"),
    ...(item.Genres ?? []).slice(0, 2),
    item.ProductionYear,
  ]
    .filter(Boolean)
    .join(" · ");

  const openDetails = () => {
    haptics.light();
    router.push(`/item/${item.Id}`);
  };

  return (
    <Pressable onPress={openDetails} style={{ width, height, overflow: "visible" }}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: imageTransform }]}>
        <Image
          source={{ uri: JellyfinService.getImageUrl(session.serverUrl, item.Id, "Backdrop", 1280) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={400}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.55)", "transparent"]}
          style={styles.topShade}
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.45)", Palette.background]}
          locations={[0.35, 0.68, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.content}>
        {showLogo ? (
          <Image
            source={{ uri: JellyfinService.getImageUrl(session.serverUrl, logoId, "Logo", 800) }}
            style={{ width: width * 0.72, height: Math.min(110, width * 0.26) }}
            contentFit="contain"
            transition={300}
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <Text style={styles.title} numberOfLines={2}>
            {item.Name}
          </Text>
        )}

        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>

        <PillButton label={t("hero.details")} compact onPress={openDetails} style={styles.action} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  topShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  content: {
    position: "absolute",
    left: Gutter,
    right: Gutter,
    bottom: 44,
    alignItems: "center",
    gap: 12,
  },
  title: {
    ...Typography.largeTitle,
    color: Palette.label,
    textAlign: "center",
  },
  meta: {
    ...Typography.footnote,
    fontWeight: "500",
    color: Palette.labelSecondary,
  },
  action: {
    marginTop: 4,
  },
  dots: {
    position: "absolute",
    bottom: 18,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: {
    backgroundColor: Palette.label,
  },
});
