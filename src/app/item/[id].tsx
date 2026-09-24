import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { JellyfinItem, JellyfinService } from "../../services/jellyfin";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<JellyfinItem | null>(null);
  const [seasons, setSeasons] = useState<JellyfinItem[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<JellyfinItem[]>([]);
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
          const seasonsList = await JellyfinService.fetchSeasons(session, id);
          setSeasons(seasonsList);
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
      .then((eps) => setEpisodes(eps))
      .catch((err) => console.error("Errore fetch episodi:", err))
      .finally(() => setLoadingEpisodes(false));
  }, [session, id, selectedSeasonId, item?.Type]);

  if (isLoading || !item || !session) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00e054" />
      </View>
    );
  }

  const isSeries = item.Type === "Series";
  const backdropUrl = JellyfinService.getImageUrl(session.serverUrl, item.Id, "Backdrop", 900);
  const posterUrl = JellyfinService.getImageUrl(session.serverUrl, item.Id, "Primary", 500);
  const runtimeMins = item.RunTimeTicks ? Math.round(item.RunTimeTicks / (10000000 * 60)) : null;

  return (
    <View style={styles.container}>
      {/* Floating Back Button */}
      <Pressable
        style={({ pressed }) => [styles.floatingBackButton, pressed && styles.floatingButtonPressed]}
        onPress={() => router.back()}
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
                <Text style={styles.metaText}>•  {seasons.length} {seasons.length === 1 ? "stagione" : "stagioni"}</Text>
              )}
            </View>
            {item.CommunityRating && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#00e054" />
                <Text style={styles.ratingValue}>{item.CommunityRating.toFixed(1)}</Text>
                <Text style={styles.ratingMax}>/ 10</Text>
              </View>
            )}
            {item.Genres && item.Genres.length > 0 && (
              <Text style={styles.genres} numberOfLines={2}>
                {item.Genres.join(" • ")}
              </Text>
            )}
          </View>
        </View>

        {/* Play Movie / Direct Play button if not a Series */}
        {!isSeries && (
          <Pressable
            style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
            onPress={() => router.push(`/player/${item.Id}`)}
          >
            <Ionicons name="play" size={20} color="#000000" />
            <Text style={styles.playButtonText}>RIPRODUCI FILM</Text>
          </Pressable>
        )}

        {/* Plot Synopsis */}
        {item.Overview && (
          <View style={styles.synopsisContainer}>
            <Text style={styles.sectionLabel}>TRAMA</Text>
            <Text style={styles.overview}>{item.Overview}</Text>
          </View>
        )}

        {/* TV Series Seasons & Episodes */}
        {isSeries && (
          <View style={styles.seriesSection}>
            <Text style={styles.sectionLabel}>STAGIONI</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonsList}>
              {seasons.map((season) => {
                const isSelected = season.Id === selectedSeasonId;
                return (
                  <Pressable
                    key={season.Id}
                    style={[styles.seasonPill, isSelected && styles.seasonPillActive]}
                    onPress={() => setSelectedSeasonId(season.Id)}
                  >
                    <Text style={[styles.seasonPillText, isSelected && styles.seasonPillTextActive]}>
                      {season.Name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.episodesHeader}>
              <Text style={styles.sectionLabel}>EPISODI</Text>
              {episodes.length > 0 && (
                <Text style={styles.episodesCount}>{episodes.length} episodi</Text>
              )}
            </View>

            {loadingEpisodes ? (
              <View style={styles.episodesLoading}>
                <ActivityIndicator color="#00e054" />
              </View>
            ) : episodes.length === 0 ? (
              <Text style={styles.emptyEpisodesText}>Nessun episodio trovato in questa stagione.</Text>
            ) : (
              <View style={styles.episodesList}>
                {episodes.map((ep) => {
                  const epImageUrl = JellyfinService.getImageUrl(session.serverUrl, ep.Id, "Primary", 400);
                  const epMins = ep.RunTimeTicks ? Math.round(ep.RunTimeTicks / (10000000 * 60)) : null;
                  const isPlayed = !!ep.UserData?.Played;
                  const progress = ep.UserData?.PlayedPercentage || 0;

                  return (
                    <Pressable
                      key={ep.Id}
                      style={({ pressed }) => [styles.episodeCard, pressed && styles.episodeCardPressed]}
                      onPress={() => router.push(`/player/${ep.Id}`)}
                    >
                      <View style={styles.epThumbnailContainer}>
                        <Image source={{ uri: epImageUrl }} style={styles.epThumbnail} resizeMode="cover" />
                        {isPlayed ? (
                          <View style={styles.watchedIconOverlay}>
                            <Ionicons name="checkmark-circle" size={26} color="#00e054" />
                          </View>
                        ) : (
                          <View style={styles.epPlayOverlay}>
                            <Ionicons name="play-circle" size={28} color="#ffffff" />
                          </View>
                        )}
                        {!isPlayed && progress > 0 && (
                          <View style={styles.epProgressBarBg}>
                            <View style={[styles.epProgressBarFill, { width: `${progress}%` }]} />
                          </View>
                        )}
                      </View>

                      <View style={styles.epInfo}>
                        <View style={styles.epTitleRow}>
                          <Text style={[styles.epTitle, isPlayed && styles.epTitlePlayed]} numberOfLines={1}>
                            {ep.IndexNumber !== undefined ? `${ep.IndexNumber}. ` : ""}{ep.Name}
                          </Text>
                          {isPlayed && (
                            <View style={styles.watchedBadge}>
                              <Ionicons name="checkmark" size={10} color="#000000" />
                              <Text style={styles.watchedText}>VISTO</Text>
                            </View>
                          )}
                        </View>
                        {epMins && <Text style={styles.epDuration}>{epMins} min</Text>}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  </View>
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
    paddingHorizontal: 20,
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
  playButton: {
    backgroundColor: "#00e054",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 24,
    shadowColor: "#00e054",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  playButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  playButtonText: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 1,
  },
  synopsisContainer: {
    marginTop: 26,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#677b8c",
    letterSpacing: 1,
    marginBottom: 10,
  },
  overview: {
    color: "#ccd",
    fontSize: 14,
    lineHeight: 22,
  },
  seriesSection: {
    marginTop: 26,
  },
  seasonsList: {
    gap: 8,
    marginBottom: 20,
  },
  seasonPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1f252c",
    borderWidth: 1,
    borderColor: "#2c3440",
  },
  seasonPillActive: {
    backgroundColor: "#00e054",
    borderColor: "#00e054",
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
    marginBottom: 12,
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
    gap: 12,
  },
  episodeCard: {
    flexDirection: "row",
    backgroundColor: "#1f252c",
    borderRadius: 10,
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
  watchedIconOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
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
    backgroundColor: "#00e054",
  },
  epInfo: {
    flex: 1,
    padding: 10,
    justifyContent: "center",
  },
  epTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
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
  watchedBadge: {
    backgroundColor: "#00e054",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  watchedText: {
    color: "#000000",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  epDuration: {
    color: "#00e054",
    fontSize: 11,
    fontWeight: "600",
  },
});
