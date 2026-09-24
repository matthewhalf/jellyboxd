import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useLiquidGlassMenu } from "../../context/LiquidGlassMenuContext";
import { haptics } from "../../lib/haptics";
import { JellyfinItem, JellyfinService } from "../../services/jellyfin";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<JellyfinItem | null>(null);
  const [seasons, setSeasons] = useState<JellyfinItem[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<JellyfinItem[]>([]);
  const [nextEpisode, setNextEpisode] = useState<JellyfinItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // Load main item metadata
  useEffect(() => {
    if (!session || !id) return;
    setIsLoading(true);

    JellyfinService.fetchItemDetails(session, id)
      .then(async (data) => {
        setItem(data);
        if (data?.Type === "Series") {
          const [seasonsList, nextUp] = await Promise.all([
            JellyfinService.fetchSeasons(session, id),
            JellyfinService.fetchNextUpForSeries(session, id),
          ]);
          setSeasons(seasonsList);
          if (nextUp) {
            setNextEpisode(nextUp);
          }
          if (seasonsList.length > 0) {
            setSelectedSeasonId(seasonsList[0].Id);
          }
        }
      })
      .catch((err) => console.error("Errore fetch dettagli:", err))
      .finally(() => setIsLoading(false));
  }, [session, id]);

  // Load episodes when active season changes
  useEffect(() => {
    if (!session || !id || !selectedSeasonId || item?.Type !== "Series") return;
    setLoadingEpisodes(true);
    JellyfinService.fetchEpisodes(session, id, selectedSeasonId)
      .then((eps) => {
        setEpisodes(eps);
        // Fallback next episode if nextUp wasn't returned
        if (!nextEpisode && eps.length > 0) {
          const unplayed = eps.find((e) => !e.UserData?.Played);
          setNextEpisode(unplayed || eps[0]);
        }
      })
      .catch((err) => console.error("Errore fetch episodi:", err))
      .finally(() => setLoadingEpisodes(false));
  }, [session, id, selectedSeasonId, item?.Type, nextEpisode]);

  if (isLoading || !item || !session) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  const isSeries = item.Type === "Series";
  const mediaBadges = isSeries
    ? JellyfinService.getMediaBadges(nextEpisode || episodes[0])
    : JellyfinService.getMediaBadges(item);

  const backdropUrl = JellyfinService.getImageUrl(session.serverUrl, item.Id, "Backdrop", 900);
  const posterUrl = JellyfinService.getImageUrl(session.serverUrl, item.Id, "Primary", 500);
  const runtimeMins = item.RunTimeTicks ? Math.round(item.RunTimeTicks / (10000000 * 60)) : null;

  return (
    <View style={styles.container}>
      {/* Floating Back Button */}
      <Pressable
        style={({ pressed }) => [styles.floatingBackButton, pressed && styles.floatingButtonPressed]}
        onPress={() => {
          haptics.light();
          router.back();
        }}
      >
        <Ionicons name="chevron-back" size={24} color="#ffffff" />
      </Pressable>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Backdrop */}
        <View style={styles.backdropContainer}>
          <Image source={{ uri: backdropUrl }} style={styles.backdrop} resizeMode="cover" />
          <View style={styles.backdropOverlay} />
        </View>

        {/* Main Info */}
        <View style={styles.detailsContainer}>
          <View style={styles.topRow}>
            <Image source={{ uri: posterUrl }} style={styles.poster} resizeMode="cover" />
            <View style={styles.topInfo}>
              <Text style={styles.title}>{item.Name}</Text>
              <View style={styles.metaRow}>
                {item.ProductionYear && <Text style={styles.metaText}>{item.ProductionYear}</Text>}
                {runtimeMins && <Text style={styles.metaText}>•  {runtimeMins} min</Text>}
                {isSeries && seasons.length > 0 && (
                  <Text style={styles.metaText}>
                    •  {seasons.length} {seasons.length === 1 ? "stagione" : "stagioni"}
                  </Text>
                )}
              </View>
              {item.CommunityRating && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color="#ffcc00" />
                  <Text style={styles.ratingValue}>{item.CommunityRating.toFixed(1)}</Text>
                  <Text style={styles.ratingMax}>/ 10</Text>
                </View>
              )}
              {item.Genres && item.Genres.length > 0 && (
                <Text style={styles.genres} numberOfLines={2}>
                  {item.Genres.join(" • ")}
                </Text>
              )}
              {mediaBadges.length > 0 && (
                <View style={styles.badgeRow}>
                  {mediaBadges.map((badge) => (
                    <View key={badge} style={styles.mediaBadge}>
                      <Text style={styles.mediaBadgeText}>{badge}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Quick Play button before plot */}
          {isSeries ? (
            nextEpisode ? (
              <Pressable
                style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
                onPress={() => {
                  haptics.medium();
                  router.push(`/player/${nextEpisode.Id}`);
                }}
              >
                <Ionicons name="play" size={20} color="#000000" />
                <Text style={styles.playButtonText} numberOfLines={1}>
                  RIPRODUCI S{nextEpisode.ParentIndexNumber ?? 1}:E{nextEpisode.IndexNumber ?? 1}
                </Text>
              </Pressable>
            ) : null
          ) : (
            <Pressable
              style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
              onPress={() => {
                haptics.medium();
                router.push(`/player/${item.Id}`);
              }}
            >
              <Ionicons name="play" size={20} color="#000000" />
              <Text style={styles.playButtonText}>RIPRODUCI FILM</Text>
            </Pressable>
          )}

          {/* Plot Synopsis (capped at 5 lines) */}
          {item.Overview && (
            <View style={styles.synopsisContainer}>
              <Text style={styles.sectionLabel}>TRAMA</Text>
              <Text style={styles.overview} numberOfLines={5} ellipsizeMode="tail">
                {item.Overview}
              </Text>
            </View>
          )}

          {/* TV Series Seasons & Episodes */}
          {isSeries && (
            <View style={styles.seriesSection}>
              <Text style={styles.sectionLabel}>STAGIONI</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.seasonsList}
              >
                {seasons.map((season) => {
                  const isSelected = season.Id === selectedSeasonId;
                  return (
                    <Pressable
                      key={season.Id}
                      style={[styles.seasonPill, isSelected && styles.seasonPillActive]}
                      onPress={() => {
                        haptics.selection();
                        setSelectedSeasonId(season.Id);
                      }}
                    >
                      <Text
                        style={[
                          styles.seasonPillText,
                          isSelected && styles.seasonPillTextActive,
                        ]}
                      >
                        {season.Name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.episodesHeader}>
                <Text style={styles.sectionLabel}>EPISODI</Text>
              </View>

              {loadingEpisodes ? (
                <View style={styles.episodesLoading}>
                  <ActivityIndicator color="#ffffff" />
                </View>
              ) : episodes.length === 0 ? (
                <Text style={styles.emptyEpisodesText}>
                  Nessun episodio trovato in questa stagione.
                </Text>
              ) : (
                <View style={styles.episodesList}>
                  {episodes.map((ep) => (
                    <EpisodeRowItem
                      key={ep.Id}
                      ep={ep}
                      session={session}
                      seriesId={id}
                      onRefresh={() => {
                        if (selectedSeasonId) {
                          JellyfinService.fetchEpisodes(
                            session,
                            id,
                            selectedSeasonId
                          ).then(setEpisodes);
                        }
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function EpisodeRowItem({
  ep,
  session,
  seriesId,
  onRefresh,
}: {
  ep: JellyfinItem;
  session: any;
  seriesId: string;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const { openMenu } = useLiquidGlassMenu();
  const touchScale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(touchScale, {
      toValue: 0.96,
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
    openMenu({
      item: { ...ep, SeriesId: seriesId },
      session,
      onRefresh,
    });
  };

  const epImageUrl = JellyfinService.getImageUrl(
    session.serverUrl,
    ep.Id,
    "Primary",
    400
  );
  const epMins = ep.RunTimeTicks
    ? Math.round(ep.RunTimeTicks / (10000000 * 60))
    : null;
  const isPlayed = !!ep.UserData?.Played;
  const progress = ep.UserData?.PlayedPercentage || 0;

  return (
    <Animated.View style={{ transform: [{ scale: touchScale }] }}>
      <Pressable
        style={styles.episodeCard}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          haptics.light();
          router.push(`/player/${ep.Id}`);
        }}
        onLongPress={handleLongPress}
        delayLongPress={300}
      >
        <View style={styles.epThumbnailContainer}>
          <Image
            source={{ uri: epImageUrl }}
            style={styles.epThumbnail}
            resizeMode="cover"
          />
          <View style={styles.epPlayOverlay}>
            <Ionicons
              name="play-circle"
              size={26}
              color="rgba(255,255,255,0.85)"
            />
          </View>
          <View style={styles.epProgressBarBg}>
            <View
              style={[
                styles.epProgressBarFill,
                {
                  width: isPlayed
                    ? "100%"
                    : progress > 0
                    ? `${progress}%`
                    : "0%",
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.epInfo}>
          <Text
            style={[styles.epTitle, isPlayed && styles.epTitlePlayed]}
            numberOfLines={1}
          >
            {ep.IndexNumber !== undefined ? `${ep.IndexNumber}. ` : ""}
            {ep.Name}
          </Text>
          {epMins && <Text style={styles.epDuration}>{epMins} min</Text>}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#14181c",
  },
  floatingBackButton: {
    position: "absolute",
    top: 52,
    left: 16,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(20, 24, 28, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  floatingButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#14181c",
  },
  content: {
    paddingBottom: 60,
  },
  backdropContainer: {
    width: "100%",
    height: 250,
  },
  backdrop: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1f252c",
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(20, 24, 28, 0.45)",
  },
  detailsContainer: {
    paddingHorizontal: 16,
    marginTop: -60,
  },
  topRow: {
    flexDirection: "row",
    gap: 16,
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "#1f252c",
  },
  topInfo: {
    flex: 1,
    justifyContent: "flex-end",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  metaText: {
    color: "#9ab",
    fontSize: 13,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  ratingValue: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  ratingMax: {
    color: "#677b8c",
    fontSize: 11,
  },
  genres: {
    color: "#677b8c",
    fontSize: 12,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 8,
  },
  mediaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  mediaBadgeText: {
    color: "#e2e4e8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  playButton: {
    backgroundColor: "#e2e4e8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  playButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  playButtonText: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  synopsisContainer: {
    marginTop: 22,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#89a",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  overview: {
    color: "#ccd",
    fontSize: 14,
    lineHeight: 22,
  },
  seriesSection: {
    marginTop: 24,
  },
  seasonsList: {
    gap: 8,
    marginBottom: 20,
  },
  seasonPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1f252c",
    borderWidth: 1,
    borderColor: "#2c3440",
  },
  seasonPillActive: {
    backgroundColor: "#e2e4e8",
    borderColor: "#e2e4e8",
  },
  seasonPillText: {
    color: "#9ab",
    fontSize: 13,
    fontWeight: "700",
  },
  seasonPillTextActive: {
    color: "#000000",
    fontWeight: "800",
  },
  episodesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  episodesCount: {
    color: "#677b8c",
    fontSize: 12,
    fontWeight: "600",
  },
  episodesLoading: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyEpisodesText: {
    color: "#677b8c",
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 12,
  },
  episodesList: {
    gap: 6,
  },
  episodeCard: {
    flexDirection: "row",
    backgroundColor: "#1f252c",
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2c3440",
  },
  episodeCardPressed: {
    opacity: 0.8,
  },
  epThumbnailContainer: {
    width: 120,
    height: 75,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#14181c",
  },
  epThumbnail: {
    width: "100%",
    height: "100%",
  },
  epPlayOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  epProgressBarBg: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  epProgressBarFill: {
    height: "100%",
    backgroundColor: "#ffffff",
  },
  epInfo: {
    flex: 1,
    padding: 10,
    justifyContent: "center",
  },
  epTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  epTitlePlayed: {
    color: "#89a",
  },
  epDuration: {
    color: "#8e8e93",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
});
