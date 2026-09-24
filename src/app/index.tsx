import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoginScreen } from "../components/LoginScreen";
import { useAuth } from "../context/AuthContext";
import { JellyfinItem, JellyfinService } from "../services/jellyfin";

export default function HomeScreen() {
  const { session, isLoading, logout } = useAuth();
  const router = useRouter();

  const [resumeItems, setResumeItems] = useState<JellyfinItem[]>([]);
  const [seriesList, setSeriesList] = useState<JellyfinItem[]>([]);
  const [moviesList, setMoviesList] = useState<JellyfinItem[]>([]);
  const [libraries, setLibraries] = useState<JellyfinItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!session) return;
    try {
      const [resumes, series, movies, userLibs] = await Promise.all([
        JellyfinService.fetchResumeItems(session),
        JellyfinService.fetchSeries(session, 20),
        JellyfinService.fetchMovies(session, 20),
        JellyfinService.fetchLibraries(session),
      ]);
      setResumeItems(resumes);
      setSeriesList(series);
      setMoviesList(movies);
      setLibraries(userLibs);
    } catch (e) {
      console.error("Errore caricamento dati:", e);
    }
  };

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00e054" />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navbar */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Text style={styles.headerTitle}>JELLYBOXD</Text>
          <Text style={styles.headerUser}>@{session.userName}</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={22} color="#9ab" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00e054" />}
      >
        {/* 1. Continue Watching Section (Horizontal Widescreen Cards) */}
        {resumeItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>CONTINUA A GUARDARE</Text>
              <Text style={styles.badgeCount}>{resumeItems.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {resumeItems.map((item) => {
                const percent = Math.round(item.UserData?.PlayedPercentage || 0);
                const imageUrl = JellyfinService.getImageUrl(
                  session.serverUrl,
                  item.Id,
                  item.Type === "Episode" ? "Thumb" : "Backdrop",
                  450
                );

                let remainingText = "";
                if (item.RunTimeTicks) {
                  const remainingTicks = item.RunTimeTicks * (1 - (percent > 0 ? percent : 20) / 100);
                  const remainingMins = Math.max(1, Math.round(remainingTicks / (10000000 * 60)));
                  remainingText = `${remainingMins} min rimasti`;
                }

                return (
                  <Pressable
                    key={item.Id}
                    style={styles.resumeCard}
                    onPress={() => router.push(`/player/${item.Id}`)}
                  >
                    <View style={styles.resumeThumbnailContainer}>
                      <Image source={{ uri: imageUrl }} style={styles.resumeThumbnail} resizeMode="cover" />
                      {remainingText !== "" && (
                        <View style={styles.timeBadge}>
                          <Ionicons name="time-outline" size={10} color="#ffffff" />
                          <Text style={styles.timeText}>{remainingText}</Text>
                        </View>
                      )}
                      <View style={styles.resumePlayOverlay}>
                        <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.9)" />
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                      </View>
                    </View>

                    <Text style={styles.resumeCardTitle} numberOfLines={1}>
                      {item.Type === "Episode" ? (item.SeriesName || item.Name) : item.Name}
                    </Text>
                    {item.Type === "Episode" && (
                      <Text style={styles.resumeCardSub} numberOfLines={1}>
                        S{item.ParentIndexNumber ?? 1}:E{item.IndexNumber ?? 1} • {item.Name}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 2. Le Mie Serie */}
        {seriesList.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>LE MIE SERIE</Text>
              <Text style={styles.badgeCount}>{seriesList.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {seriesList.map((series) => {
                const imageUrl = JellyfinService.getImageUrl(session.serverUrl, series.Id, "Primary", 350);
                const rating = series.CommunityRating ? series.CommunityRating.toFixed(1) : null;

                return (
                  <Pressable
                    key={series.Id}
                    style={styles.posterCard}
                    onPress={() => router.push(`/item/${series.Id}`)}
                  >
                    <Image source={{ uri: imageUrl }} style={styles.posterImage} resizeMode="cover" />
                    {rating && (
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={10} color="#00e054" />
                        <Text style={styles.ratingText}>{rating}</Text>
                      </View>
                    )}
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {series.Name}
                    </Text>
                    {series.ProductionYear && (
                      <Text style={styles.cardSub}>{series.ProductionYear}</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 3. I Miei Film */}
        {moviesList.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>I MIEI FILM</Text>
              <Text style={styles.badgeCount}>{moviesList.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {moviesList.map((movie) => {
                const imageUrl = JellyfinService.getImageUrl(session.serverUrl, movie.Id, "Primary", 350);
                const rating = movie.CommunityRating ? movie.CommunityRating.toFixed(1) : null;

                return (
                  <Pressable
                    key={movie.Id}
                    style={styles.posterCard}
                    onPress={() => router.push(`/item/${movie.Id}`)}
                  >
                    <Image source={{ uri: imageUrl }} style={styles.posterImage} resizeMode="cover" />
                    {rating && (
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={10} color="#00e054" />
                        <Text style={styles.ratingText}>{rating}</Text>
                      </View>
                    )}
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {movie.Name}
                    </Text>
                    {movie.ProductionYear && (
                      <Text style={styles.cardSub}>{movie.ProductionYear}</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 4. Libraries Grid Section */}
        {libraries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>LE TUE LIBRERIE</Text>
            </View>
            <View style={styles.librariesGrid}>
              {libraries.map((lib) => (
                <Pressable
                  key={lib.Id}
                  style={styles.libraryCard}
                  onPress={() => router.push({ pathname: `/library/[id]`, params: { id: lib.Id, name: lib.Name } })}
                >
                  <Ionicons
                    name={lib.Type === "movies" || lib.Name.toLowerCase().includes("film") ? "film-outline" : "tv-outline"}
                    size={28}
                    color="#00e054"
                  />
                  <Text style={styles.libraryName}>{lib.Name}</Text>
                  <Text style={styles.librarySub}>Sfoglia contenuti</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#14181c",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#14181c",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f252c",
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 1.5,
  },
  headerUser: {
    fontSize: 13,
    color: "#00e054",
    fontWeight: "600",
  },
  logoutButton: {
    padding: 6,
  },
  scrollContent: {
    paddingVertical: 14,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#89a",
    letterSpacing: 1.2,
  },
  badgeCount: {
    backgroundColor: "#2c3440",
    color: "#00e054",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  horizontalList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  resumeCard: {
    width: 210,
  },
  resumeThumbnailContainer: {
    width: 210,
    height: 118,
    borderRadius: 8,
    backgroundColor: "#1f252c",
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  resumeThumbnail: {
    width: "100%",
    height: "100%",
  },
  timeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  timeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  resumePlayOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressBarBg: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#00e054",
  },
  resumeCardTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  resumeCardSub: {
    color: "#89a",
    fontSize: 11,
    marginTop: 2,
  },
  posterCard: {
    width: 115,
  },
  posterImage: {
    width: 115,
    height: 170,
    borderRadius: 8,
    backgroundColor: "#1f252c",
  },
  ratingBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(20, 24, 28, 0.85)",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  cardSub: {
    color: "#677b8c",
    fontSize: 11,
    marginTop: 2,
  },
  librariesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 4,
  },
  libraryCard: {
    width: "48%",
    backgroundColor: "#1f252c",
    borderWidth: 1,
    borderColor: "#2c3440",
    borderRadius: 12,
    padding: 16,
    alignItems: "flex-start",
  },
  libraryName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },
  librarySub: {
    color: "#677b8c",
    fontSize: 12,
    marginTop: 3,
  },
});
