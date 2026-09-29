import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, { ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MediaLink } from "../../components/MediaLink";
import { PillButton } from "../../components/tv/PillButton";
import { ProgressBar } from "../../components/tv/ProgressBar";
import { Shelf } from "../../components/tv/Shelf";
import { Gutter, Palette, Radius, Typography } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useNativePlayer, usePlaybackFinished } from "../../context/NativePlayerContext";
import { haptics } from "../../lib/haptics";
import {
  JellyfinItem,
  JellyfinPerson,
  JellyfinService,
  JellyfinSession,
} from "../../services/jellyfin";

const TICKS_PER_MINUTE = 10000000 * 60;
const EPISODE_GAP = 14;

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

function minutesLeft(item: JellyfinItem): number | null {
  const pos = item.UserData?.PlaybackPositionTicks || 0;
  if (!pos || !item.RunTimeTicks) return null;
  return Math.max(1, Math.round((item.RunTimeTicks - pos) / TICKS_PER_MINUTE));
}

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const { play } = useNativePlayer();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [item, setItem] = useState<JellyfinItem | null>(null);
  const [seasons, setSeasons] = useState<JellyfinItem[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<JellyfinItem[]>([]);
  const [nextEpisode, setNextEpisode] = useState<JellyfinItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Season whose episodes are currently in `episodes`; differs while a season loads
  const [loadedSeasonId, setLoadedSeasonId] = useState<string | null>(null);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [scrollY] = useState(() => new Animated.Value(0));
  const [heart] = useState(() => new Animated.Value(0));

  // Load main item metadata
  useEffect(() => {
    if (!session || !id) return;
    JellyfinService.fetchItemDetails(session, id)
      .then(async (data) => {
        setItem(data);
        if (data?.Type === "Series") {
          const [seasonsList, nextUp] = await Promise.all([
            JellyfinService.fetchSeasons(session, id),
            JellyfinService.fetchNextUpForSeries(session, id),
          ]);
          setSeasons(seasonsList);
          setNextEpisode(nextUp);
          // Open on the season containing the next episode to watch
          const nextSeason = seasonsList.find((s) => s.Id === nextUp?.SeasonId);
          setSelectedSeasonId((nextSeason ?? seasonsList[0])?.Id ?? null);
        }
      })
      .catch((err) => console.error("Errore fetch dettagli:", err))
      .finally(() => setIsLoading(false));
  }, [session, id]);

  // Load episodes when active season changes
  useEffect(() => {
    if (!session || !id || !selectedSeasonId || item?.Type !== "Series") return;
    JellyfinService.fetchEpisodes(session, id, selectedSeasonId)
      .then((eps) => {
        setEpisodes(eps);
        setLoadedSeasonId(selectedSeasonId);
        // Fallback next episode if NextUp returned nothing
        if (eps.length > 0) {
          setNextEpisode((prev) => prev ?? eps.find((e) => !e.UserData?.Played) ?? eps[0]);
        }
      })
      .catch((err) => {
        console.error("Errore fetch episodi:", err);
        setEpisodes([]);
        setLoadedSeasonId(selectedSeasonId);
      });
  }, [session, id, selectedSeasonId, item?.Type]);

  // Silently re-fetch details, next up and episodes (e.g. after playback)
  const refreshSilently = async () => {
    if (!session || !id) return;
    try {
      const freshItem = await JellyfinService.fetchItemDetails(session, id);
      if (freshItem) setItem(freshItem);

      if (freshItem?.Type === "Series") {
        const freshNextUp = await JellyfinService.fetchNextUpForSeries(session, id);
        setNextEpisode(freshNextUp);
        if (selectedSeasonId) {
          setEpisodes(await JellyfinService.fetchEpisodes(session, id, selectedSeasonId));
        }
      }
    } catch {}
  };

  // Returning from another screen (e.g. a context menu action elsewhere)
  useFocusEffect(
    useCallback(() => {
      if (!session || !id || isLoading) return;
      const timer = setTimeout(refreshSilently, 400);
      return () => clearTimeout(timer);
    }, [session, id, selectedSeasonId])
  );

  // The native player closes without navigation, so focus doesn't change
  usePlaybackFinished(() => {
    setTimeout(refreshSilently, 400);
  });

  if (isLoading || !item || !session) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Palette.label} />
      </View>
    );
  }

  const isSeries = item.Type === "Series";
  const heroHeight = Math.round(Math.min(height * 0.62, width * 1.25));
  const headerHeight = insets.top + 52;
  const episodeWidth = Math.min(width * 0.78, 340);

  const mediaBadges = isSeries
    ? JellyfinService.getMediaBadges(nextEpisode || episodes[0])
    : JellyfinService.getMediaBadges(item);
  const logoId = JellyfinService.getLogoItemId(item);
  const showLogo = !!logoId && !logoFailed;

  const meta = [
    isSeries ? "Serie TV" : "Film",
    ...(item.Genres ?? []).slice(0, 2),
    item.ProductionYear,
  ]
    .filter(Boolean)
    .join(" · ");

  // Primary action: resume/play the next episode, or the movie itself
  const playTarget = isSeries ? nextEpisode : item;
  const playLeft = playTarget ? minutesLeft(playTarget) : null;
  const playPercent =
    playTarget?.RunTimeTicks && playTarget.UserData?.PlaybackPositionTicks
      ? (playTarget.UserData.PlaybackPositionTicks / playTarget.RunTimeTicks) * 100
      : 0;
  let playLabel = playLeft ? "Riprendi" : "Riproduci";
  if (isSeries && nextEpisode) {
    playLabel += ` S${nextEpisode.ParentIndexNumber ?? 1}, E${nextEpisode.IndexNumber ?? 1}`;
  }

  // The same actor can be listed once per role: keep the first entry only
  const cast = (item.People ?? [])
    .filter((p, i, all) => p.Type === "Actor" && all.findIndex((o) => o.Id === p.Id && o.Type === "Actor") === i)
    .slice(0, 20);
  const directors = (item.People ?? []).filter((p) => p.Type === "Director");
  const runtimeMins = item.RunTimeTicks ? Math.round(item.RunTimeTicks / TICKS_PER_MINUTE) : null;

  const infoRows: [string, string][] = [
    ["Genere", item.Genres?.join(", ") ?? ""],
    ["Anno", item.ProductionYear ? String(item.ProductionYear) : ""],
    ["Durata", !isSeries && runtimeMins ? formatMinutes(runtimeMins) : ""],
    [
      "Stagioni",
      isSeries && seasons.length > 0 ? String(seasons.length) : "",
    ],
    ["Classificazione", item.OfficialRating ?? ""],
    ["Valutazione", item.CommunityRating ? `${item.CommunityRating.toFixed(1)} / 10` : ""],
    ["Regia", directors.map((d) => d.Name).join(", ")],
  ].filter(([, value]) => value !== "") as [string, string][];

  const nextEpisodeIndex = episodes.findIndex((e) => e.Id === nextEpisode?.Id);

  const refreshEpisodes = () => {
    if (selectedSeasonId) {
      JellyfinService.fetchEpisodes(session, id, selectedSeasonId).then(setEpisodes);
    }
  };

  // Double tap on the artwork adds the title to Jellyfin favorites (heart burst)
  const isFavorite = !!item.UserData?.IsFavorite;
  const handleDoubleTap = async () => {
    heart.setValue(0);
    Animated.sequence([
      Animated.spring(heart, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      Animated.timing(heart, { toValue: 2, duration: 350, delay: 250, useNativeDriver: true }),
    ]).start();
    haptics.success();
    if (isFavorite) return;
    setItem({ ...item, UserData: { ...item.UserData, IsFavorite: true } });
    const ok = await JellyfinService.setFavorite(session, item.Id, true);
    if (!ok) setItem((prev) => (prev ? { ...prev, UserData: { ...prev.UserData, IsFavorite: false } } : prev));
  };
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .runOnJS(true)
    .onEnd(() => handleDoubleTap());

  const heroImageTransform = [
    {
      translateY: scrollY.interpolate({
        inputRange: [-heroHeight, 0, heroHeight],
        outputRange: [-heroHeight / 2, 0, heroHeight * 0.35],
        extrapolateRight: "clamp",
      }),
    },
    {
      scale: scrollY.interpolate({
        inputRange: [-heroHeight, 0],
        outputRange: [2, 1],
        extrapolateRight: "clamp",
      }),
    },
  ];
  const compactOpacity = scrollY.interpolate({
    inputRange: [heroHeight - headerHeight - 80, heroHeight - headerHeight],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
      >
        {/* Hero artwork: zoom transition target + double tap to favorite */}
        <GestureDetector gesture={doubleTap}>
          <View style={{ height: heroHeight }}>
            <Link.AppleZoomTarget>
              <Animated.View style={[StyleSheet.absoluteFill, { transform: heroImageTransform }]}>
                <Image
                  source={{
                    uri: JellyfinService.getImageUrl(session.serverUrl, item.Id, "Backdrop", 1280),
                  }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={400}
                />
                <LinearGradient colors={["rgba(0,0,0,0.5)", "transparent"]} style={styles.topShade} />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.5)", Palette.background]}
                  locations={[0.35, 0.7, 1]}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </Link.AppleZoomTarget>

            <Animated.View
              pointerEvents="none"
              style={[
                styles.heart,
                {
                  opacity: heart.interpolate({ inputRange: [0, 0.2, 1, 2], outputRange: [0, 1, 1, 0] }),
                  transform: [{ scale: heart.interpolate({ inputRange: [0, 1, 2], outputRange: [0.3, 1, 1.4] }) }],
                },
              ]}
            >
              <Ionicons name="heart" size={88} color="#ff375f" />
            </Animated.View>

            <View style={styles.heroContent}>
              {showLogo ? (
                <Image
                  source={{ uri: JellyfinService.getImageUrl(session.serverUrl, logoId, "Logo", 800) }}
                  style={{ width: width * 0.7, height: Math.min(100, width * 0.24) }}
                  contentFit="contain"
                  transition={300}
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <Text style={styles.title} numberOfLines={3}>
                  {item.Name}
                </Text>
              )}
              <Text style={styles.meta} numberOfLines={1}>
                {meta}
              </Text>
              <View style={styles.badgeRow}>
                {isFavorite && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="heart" size={10} color="#ff375f" />
                  </View>
                )}
                {item.CommunityRating ? (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={10} color={Palette.label} />
                    <Text style={styles.badgeText}>{item.CommunityRating.toFixed(1)}</Text>
                  </View>
                ) : null}
                {[item.OfficialRating, ...mediaBadges].filter(Boolean).map((badge) => (
                  <View key={badge} style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </GestureDetector>

        <View style={styles.body}>
          {playTarget && (
            <>
              <PillButton
                label={playLabel}
                icon="play"
                onPress={() => play(playTarget.Id)}
                style={styles.playButton}
              />
              {playLeft !== null && (
                <View style={styles.resumeRow}>
                  <ProgressBar percent={playPercent} style={styles.resumeBar} />
                  <Text style={styles.resumeText}>{formatMinutes(playLeft)} rimasti</Text>
                </View>
              )}
            </>
          )}

          {item.Overview && (
            <Pressable
              onPress={() => setOverviewExpanded((v) => !v)}
              style={styles.overviewContainer}
            >
              <Text style={styles.overview} numberOfLines={overviewExpanded ? undefined : 3}>
                {item.Overview}
              </Text>
              {!overviewExpanded && <Text style={styles.moreLabel}>ALTRO</Text>}
            </Pressable>
          )}
        </View>

        {/* Seasons & episodes */}
        {isSeries && (
          <View style={styles.seriesSection}>
            {seasons.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.seasonTabs}
              >
                {seasons.map((season) => {
                  const isSelected = season.Id === selectedSeasonId;
                  return (
                    <Pressable
                      key={season.Id}
                      onPress={() => {
                        haptics.selection();
                        setSelectedSeasonId(season.Id);
                      }}
                      style={styles.seasonTab}
                    >
                      <Text style={[styles.seasonTabText, isSelected && styles.seasonTabTextActive]}>
                        {season.Name}
                      </Text>
                      {isSelected && <View style={styles.seasonIndicator} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {loadedSeasonId !== selectedSeasonId ? (
              <View style={styles.episodesLoading}>
                <ActivityIndicator color={Palette.label} />
              </View>
            ) : episodes.length === 0 ? (
              <Text style={styles.emptyEpisodesText}>Nessun episodio in questa stagione.</Text>
            ) : (
              <ScrollView
                key={selectedSeasonId ?? "episodes"}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={episodeWidth + EPISODE_GAP}
                contentOffset={{
                  x: Math.max(0, nextEpisodeIndex) * (episodeWidth + EPISODE_GAP),
                  y: 0,
                }}
                contentContainerStyle={styles.episodesList}
              >
                {episodes.map((ep) => (
                  <EpisodeCard
                    key={ep.Id}
                    ep={ep}
                    session={session}
                    seriesId={id}
                    width={episodeWidth}
                    onRefresh={refreshEpisodes}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {cast.length > 0 && (
          <View style={!isSeries && styles.castSection}>
            <Shelf title="Cast e troupe" gap={16}>
              {cast.map((person) => (
                <CastMember key={person.Id} person={person} session={session} />
              ))}
            </Shelf>
          </View>
        )}

        {infoRows.length > 0 && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Informazioni</Text>
            {infoRows.map(([label, value]) => (
              <View key={label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}
      </Animated.ScrollView>

      {/* Floating header: back button + title that appears once the hero scrolls away */}
      <View style={[styles.header, { height: headerHeight, paddingTop: insets.top }]} pointerEvents="box-none">
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: compactOpacity }]}
          pointerEvents="none"
        >
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.hairline} />
        </Animated.View>

        <Pressable
          onPress={() => {
            haptics.light();
            router.back();
          }}
          hitSlop={10}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Indietro"
        >
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <Ionicons name="chevron-back" size={22} color={Palette.label} />
        </Pressable>

        <Animated.Text
          style={[styles.compactTitle, { opacity: compactOpacity }]}
          numberOfLines={1}
        >
          {item.Name}
        </Animated.Text>
        <View style={styles.backButtonSpacer} />
      </View>
    </View>
  );
}

function EpisodeCard({
  ep,
  session,
  seriesId,
  width,
  onRefresh,
}: {
  ep: JellyfinItem;
  session: JellyfinSession;
  seriesId: string;
  width: number;
  onRefresh: () => void;
}) {
  const left = minutesLeft(ep);
  const isPlayed = !!ep.UserData?.Played;
  const progress = ep.UserData?.PlayedPercentage || 0;

  return (
    <MediaLink
      item={{ ...ep, SeriesId: seriesId }}
      session={session}
      onRefresh={onRefresh}
      playOnPress
      pressedScale={0.96}
      style={{ width }}
    >
      <View style={[styles.episodeArtwork, { width, height: (width * 9) / 16 }]}>
        <Image
          source={{ uri: JellyfinService.getImageUrl(session.serverUrl, ep.Id, "Primary", 640) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={250}
          recyclingKey={ep.Id}
        />
        {isPlayed && (
          // Pops in when an episode is marked as watched from the context menu
          <Reanimated.View entering={ZoomIn.springify().damping(12)} style={styles.playedBadge}>
            <Ionicons name="checkmark" size={13} color={Palette.buttonPrimaryLabel} />
          </Reanimated.View>
        )}
        {!isPlayed && progress > 0 && (
          <>
            <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.episodeShade} />
            <ProgressBar percent={progress} style={styles.episodeProgress} />
          </>
        )}
      </View>

      <Text style={styles.episodeOverline}>
        EPISODIO {ep.IndexNumber ?? "–"}
        {left ? ` · ${formatMinutes(left).toUpperCase()} RIMASTI` : ""}
      </Text>
      <Text style={styles.episodeTitle} numberOfLines={1}>
        {ep.Name}
      </Text>
      {ep.Overview ? (
        <Text style={styles.episodeOverview} numberOfLines={3}>
          {ep.Overview}
        </Text>
      ) : null}
    </MediaLink>
  );
}

function CastMember({ person, session }: { person: JellyfinPerson; session: JellyfinSession }) {
  return (
    <View style={styles.castMember}>
      <View style={styles.castPhoto}>
        {person.PrimaryImageTag ? (
          <Image
            source={{ uri: JellyfinService.getImageUrl(session.serverUrl, person.Id, "Primary", 240) }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={250}
          />
        ) : (
          <Text style={styles.castInitial}>{person.Name.charAt(0)}</Text>
        )}
      </View>
      <Text style={styles.castName} numberOfLines={1}>
        {person.Name}
      </Text>
      {person.Role ? (
        <Text style={styles.castRole} numberOfLines={1}>
          {person.Role}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heart: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Palette.background,
  },
  content: {
    paddingBottom: 60,
  },
  topShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  heroContent: {
    position: "absolute",
    left: Gutter,
    right: Gutter,
    bottom: 12,
    alignItems: "center",
    gap: 10,
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
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: Palette.labelSecondary,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: Palette.labelSecondary,
  },
  badgeText: {
    ...Typography.caption2,
    fontWeight: "700",
    color: Palette.labelSecondary,
  },
  body: {
    paddingHorizontal: Gutter,
    paddingTop: 12,
  },
  playButton: {
    alignSelf: "stretch",
  },
  resumeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  resumeBar: {
    flex: 1,
  },
  resumeText: {
    ...Typography.caption1,
    fontWeight: "600",
    color: Palette.labelSecondary,
  },
  overviewContainer: {
    marginTop: 20,
  },
  overview: {
    ...Typography.subhead,
    color: Palette.label,
  },
  moreLabel: {
    ...Typography.caption1,
    fontWeight: "700",
    color: Palette.labelSecondary,
    marginTop: 4,
  },
  castSection: {
    marginTop: 32,
  },
  seriesSection: {
    marginTop: 28,
    marginBottom: 32,
  },
  seasonTabs: {
    paddingHorizontal: Gutter,
    gap: 22,
    marginBottom: 16,
  },
  seasonTab: {
    paddingVertical: 6,
  },
  seasonTabText: {
    ...Typography.headline,
    color: Palette.labelSecondary,
  },
  seasonTabTextActive: {
    color: Palette.label,
  },
  seasonIndicator: {
    height: 2,
    borderRadius: 1,
    backgroundColor: Palette.label,
    marginTop: 6,
  },
  episodesLoading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyEpisodesText: {
    ...Typography.footnote,
    color: Palette.labelSecondary,
    paddingHorizontal: Gutter,
    paddingVertical: 12,
  },
  episodesList: {
    paddingHorizontal: Gutter,
    gap: EPISODE_GAP,
  },
  episodeArtwork: {
    borderRadius: Radius.card,
    overflow: "hidden",
    backgroundColor: Palette.surface,
    marginBottom: 10,
  },
  playedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Palette.buttonPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  episodeShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
  },
  episodeProgress: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
  },
  episodeOverline: {
    ...Typography.caption2,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: Palette.labelSecondary,
    marginBottom: 2,
  },
  episodeTitle: {
    ...Typography.subhead,
    fontWeight: "600",
    color: Palette.label,
  },
  episodeOverview: {
    ...Typography.footnote,
    color: Palette.labelSecondary,
    marginTop: 4,
  },
  castMember: {
    width: 84,
    alignItems: "center",
  },
  castPhoto: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: "hidden",
    backgroundColor: Palette.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  castInitial: {
    ...Typography.title2,
    color: Palette.labelSecondary,
  },
  castName: {
    ...Typography.caption1,
    fontWeight: "600",
    color: Palette.label,
    textAlign: "center",
  },
  castRole: {
    ...Typography.caption2,
    color: Palette.labelSecondary,
    textAlign: "center",
    marginTop: 1,
  },
  infoSection: {
    paddingHorizontal: Gutter,
  },
  sectionTitle: {
    ...Typography.title2,
    color: Palette.label,
    marginBottom: 8,
  },
  infoRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.separator,
  },
  infoLabel: {
    ...Typography.footnote,
    color: Palette.labelSecondary,
    marginBottom: 2,
  },
  infoValue: {
    ...Typography.subhead,
    color: Palette.label,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  hairline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.separator,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.glass,
  },
  backButtonSpacer: {
    width: 36,
  },
  compactTitle: {
    ...Typography.headline,
    color: Palette.label,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
});
