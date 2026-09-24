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
        {/* 1. Continue Watching Section */}
        {resumeItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>CONTINUA A GUARDARE</Text>
              <Text style={styles.badgeCount}>{resumeItems.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {resumeItems.map((item) => {
                const percent = Math.round(item.UserData?.PlayedPercentage || 0);
                const imageUrl = JellyfinService.getImageUrl(session.serverUrl, item.Id, "Primary", 350);
                const titleText =
                  item.Type === "Episode"
                    ? `${item.SeriesName || ""} S${item.ParentIndexNumber ?? 1}E${item.IndexNumber ?? 1}`
                    : item.Name;

                return (
                  <Pressable
                    key={item.Id}
                    style={styles.resumeCard}
                    onPress={() => router.push(`/player/${item.Id}`)}
                  >
                    <Image source={{ uri: imageUrl }} style={styles.resumePoster} resizeMode="cover" />
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {titleText}
                    </Text>
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
            <Text style={styles.sectionTitle}>LE TUE LIBRERIE</Text>
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
    paddingVertical: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
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
    width: 140,
  },
  resumePoster: {
    width: 140,
    height: 200,
    borderRadius: 8,
    backgroundColor: "#1f252c",
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "#2c3440",
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#00e054",
  },
  posterCard: {
    width: 120,
  },
  posterImage: {
    width: 120,
    height: 175,
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
    fontSize: 13,
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
    gap: 12,
    marginTop: 12,
  },
  libraryCard: {
    width: "48%",
    backgroundColor: "#1f252c",
    borderWidth: 1,
    borderColor: "#2c3440",
    borderRadius: 12,
    padding: 18,
    alignItems: "flex-start",
  },
  libraryName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },
  librarySub: {
    color: "#677b8c",
    fontSize: 12,
    marginTop: 4,
  },
});
