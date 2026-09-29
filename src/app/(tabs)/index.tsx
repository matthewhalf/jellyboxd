import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoginScreen } from "../../components/LoginScreen";
import { PosterCard } from "../../components/PosterCard";
import { ContinueWatchingCard } from "../../components/tv/ContinueWatchingCard";
import { HeroCarousel } from "../../components/tv/HeroCarousel";
import { Shelf } from "../../components/tv/Shelf";
import { UserAvatar } from "../../components/tv/UserAvatar";
import { Gutter, Palette, Radius, Typography } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { usePlaybackFinished } from "../../context/NativePlayerContext";
import { haptics } from "../../lib/haptics";
import { JellyfinItem, JellyfinService } from "../../services/jellyfin";

const CONTINUE_GAP = 12;

export default function HomeScreen() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [featured, setFeatured] = useState<JellyfinItem[]>([]);
  const [continueItems, setContinueItems] = useState<JellyfinItem[]>([]);
  const [latestSeries, setLatestSeries] = useState<JellyfinItem[]>([]);
  const [moviesList, setMoviesList] = useState<JellyfinItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const scrollY = useState(() => new Animated.Value(0))[0];

  const heroHeight = Math.round(Math.min(height * 0.58, width * 1.25));
  const continueWidth = Math.min(width * 0.72, 320);
  const headerHeight = insets.top + 52;

  // Switching server: drop the previous server's shelves right away and show the spinner
  const sessionKey = session ? `${session.serverUrl}::${session.userId}` : null;
  const [shownSessionKey, setShownSessionKey] = useState(sessionKey);
  if (shownSessionKey !== sessionKey) {
    setShownSessionKey(sessionKey);
    setFeatured([]);
    setContinueItems([]);
    setLatestSeries([]);
    setMoviesList([]);
    setHasError(false);
    setInitialLoading(true);
  }
  const activeSessionKey = useRef(sessionKey);
  useEffect(() => {
    activeSessionKey.current = sessionKey;
  }, [sessionKey]);

  const loadData = async () => {
    if (!session) return;
    const requestKey = sessionKey;
    try {
      const results = await Promise.allSettled([
        JellyfinService.fetchFeatured(session, 4),
        JellyfinService.fetchContinueWatching(session),
        JellyfinService.fetchLatestSeries(session, 20),
        JellyfinService.fetchLatestMovies(session, 20),
      ]);
      // A slow response from the previous server must not overwrite the new one
      if (activeSessionKey.current !== requestKey) return;
      const setters = [setFeatured, setContinueItems, setLatestSeries, setMoviesList];

      let anySuccess = false;
      results.forEach((res, i) => {
        if (res.status !== "fulfilled") return;
        setters[i](res.value);
        if (res.value.length > 0) anySuccess = true;
      });
      // The fetchers swallow network/auth errors and return [], so "nothing at all" means failure
      setHasError(!anySuccess);
    } catch (e) {
      if (activeSessionKey.current !== requestKey) return;
      console.error("Errore caricamento dati:", e);
      setHasError(true);
    } finally {
      if (activeSessionKey.current === requestKey) setInitialLoading(false);
    }
  };

  // Re-fetch every time the home screen gains focus (e.g. returning from player)
  useFocusEffect(
    useCallback(() => {
      if (session) {
        loadData();
        // Follow-up to catch delayed Jellyfin server-side NextUp recalculations
        const timer = setTimeout(loadData, 650);
        return () => clearTimeout(timer);
      }
    }, [session])
  );

  // The native player closes without navigation, so refresh explicitly
  usePlaybackFinished(() => {
    loadData();
    setTimeout(loadData, 650);
  });

  const onRefresh = async () => {
    haptics.selection();
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Palette.label} />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  const isEmpty =
    featured.length === 0 &&
    continueItems.length === 0 &&
    latestSeries.length === 0 &&
    moviesList.length === 0;

  // Header turns into frosted glass once the hero has scrolled away
  const headerBackgroundOpacity = scrollY.interpolate({
    inputRange: [heroHeight - headerHeight - 80, heroHeight - headerHeight],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            // iOS draws the native spinner behind the zoomed hero, so an overlay spinner replaces it
            tintColor="transparent"
            colors={[Palette.label]}
            progressViewOffset={headerHeight}
          />
        }
      >
        {featured.length > 0 ? (
          <HeroCarousel
            items={featured}
            session={session}
            width={width}
            height={heroHeight}
            scrollY={scrollY}
          />
        ) : (
          <View style={{ height: headerHeight }} />
        )}
        <View style={styles.heroSpacer} />

        {continueItems.length > 0 && (
          <Shelf
            title="Continua a guardare"
            gap={CONTINUE_GAP}
            snapInterval={continueWidth + CONTINUE_GAP}
          >
            {continueItems.map((item, idx) => (
              <ContinueWatchingCard
                key={item.SeriesId || item.Id}
                item={item}
                session={session}
                index={idx}
                width={continueWidth}
                gap={CONTINUE_GAP}
                onRefresh={loadData}
              />
            ))}
          </Shelf>
        )}

        {latestSeries.length > 0 && (
          <Shelf title="Serie recenti" onSeeAll={() => router.navigate("/series")}>
            {latestSeries.map((series) => (
              <PosterCard
                key={series.Id}
                item={series}
                session={session}
                width={124}
                height={186}
                onRefresh={loadData}
                seriesOnly
              />
            ))}
          </Shelf>
        )}

        {moviesList.length > 0 && (
          <Shelf title="Film recenti" onSeeAll={() => router.navigate("/movies")}>
            {moviesList.map((movie) => (
              <PosterCard
                key={movie.Id}
                item={movie}
                session={session}
                width={124}
                height={186}
                onRefresh={loadData}
              />
            ))}
          </Shelf>
        )}

        {initialLoading && isEmpty && (
          <View style={[styles.stateContainer, { height: heroHeight }]}>
            <ActivityIndicator size="large" color={Palette.label} />
          </View>
        )}

        {!initialLoading && hasError && isEmpty && (
          <View style={styles.stateContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color={Palette.labelSecondary} />
            <Text style={styles.errorTitle}>Connessione non riuscita</Text>
            <Text style={styles.errorSubtitle}>
              Impossibile caricare i contenuti dal server Jellyfin.
            </Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                setInitialLoading(true);
                loadData();
              }}
            >
              <Text style={styles.retryButtonText}>Riprova</Text>
            </Pressable>
          </View>
        )}
      </Animated.ScrollView>

      {refreshing && Platform.OS === "ios" && (
        <View style={[styles.refreshIndicator, { top: headerHeight + 8 }]} pointerEvents="none">
          <ActivityIndicator color={Palette.label} />
        </View>
      )}

      {/* Floating header: wordmark + Jellyfin profile picture */}
      <View style={[styles.header, { height: headerHeight, paddingTop: insets.top }]}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: headerBackgroundOpacity }]}
          pointerEvents="none"
        >
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.headerHairline} />
        </Animated.View>

        <Text style={styles.wordmark}>jellyboxd</Text>
        <Pressable
          onPress={() => {
            haptics.light();
            router.push("/settings");
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Impostazioni"
        >
          <UserAvatar session={session} size={34} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Palette.background,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  refreshIndicator: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  heroSpacer: {
    height: 24,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Gutter,
  },
  headerHairline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.separator,
  },
  wordmark: {
    ...Typography.title1,
    fontWeight: "900",
    letterSpacing: -0.8,
    color: Palette.label,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 50,
    gap: 8,
  },
  errorTitle: {
    ...Typography.headline,
    color: Palette.label,
    textAlign: "center",
    marginTop: 6,
  },
  errorSubtitle: {
    ...Typography.footnote,
    color: Palette.labelSecondary,
    textAlign: "center",
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: Palette.buttonPrimary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  retryButtonText: {
    ...Typography.subhead,
    fontWeight: "600",
    color: Palette.buttonPrimaryLabel,
  },
});
