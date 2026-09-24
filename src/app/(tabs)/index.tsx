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
import { NextUpCard } from "../../components/NextUpCard";
import { PosterCard } from "../../components/PosterCard";
import { ResumeCard } from "../../components/ResumeCard";
import { LoginScreen } from "../../components/LoginScreen";
import { useAuth } from "../../context/AuthContext";
import { haptics } from "../../lib/haptics";
import { JellyfinItem, JellyfinService } from "../../services/jellyfin";

export default function HomeScreen() {
  const { session, isLoading, logout } = useAuth();
  const router = useRouter();

  const [resumeItems, setResumeItems] = useState<JellyfinItem[]>([]);
  const [nextUpItems, setNextUpItems] = useState<JellyfinItem[]>([]);
  const [latestSeries, setLatestSeries] = useState<JellyfinItem[]>([]);
  const [moviesList, setMoviesList] = useState<JellyfinItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!session) return;
    try {
      const [resumes, nextUp, series, movies] = await Promise.all([
        JellyfinService.fetchResumeItems(session),
        JellyfinService.fetchNextUp(session, 20),
        JellyfinService.fetchLatestSeries(session, 20),
        JellyfinService.fetchMovies(session, 20),
      ]);
      setResumeItems(resumes);
      setNextUpItems(nextUp);
      setLatestSeries(series);
      setMoviesList(movies);
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
    haptics.selection();
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Top Navbar */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Text style={styles.headerTitle}>JELLYBOXD</Text>
          <Text style={styles.headerUser}>@{session.userName}</Text>
        </View>
        <Pressable
          onPress={() => {
            haptics.light();
            router.push("/settings");
          }}
          style={styles.settingsButton}
        >
          <Ionicons name="settings-outline" size={21} color="#9ab" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
          />
        }
      >
        {/* 1. Continua a guardare */}
        {resumeItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>CONTINUA A GUARDARE</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {resumeItems.map((item, idx) => (
                <ResumeCard
                  key={item.Id}
                  item={item}
                  session={session}
                  index={idx}
                  onRefresh={loadData}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* 2. A Seguire (Next Up) with FLIP reorder & smooth cross-fade */}
        {nextUpItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>A SEGUIRE</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {nextUpItems.map((item, idx) => (
                <NextUpCard
                  key={item.SeriesId || item.Id}
                  item={item}
                  session={session}
                  index={idx}
                  onRefresh={loadData}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* 3. Ultime Serie Aggiunte */}
        {latestSeries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ULTIME SERIE AGGIUNTE</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {latestSeries.map((series) => (
                <PosterCard
                  key={series.Id}
                  item={series}
                  session={session}
                  width={112}
                  height={168}
                  onRefresh={loadData}
                  seriesOnly={true}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* 4. I Miei Film */}
        {moviesList.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>I MIEI FILM</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {moviesList.map((movie) => (
                <PosterCard
                  key={movie.Id}
                  item={movie}
                  session={session}
                  width={112}
                  height={168}
                  onRefresh={loadData}
                />
              ))}
            </ScrollView>
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
    paddingHorizontal: 16,
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
    color: "#8e8e93",
    fontWeight: "600",
  },
  settingsButton: {
    padding: 6,
  },
  scrollContent: {
    paddingVertical: 14,
    paddingBottom: 110,
  },
  section: {
    marginBottom: 36,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#89a",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  horizontalList: {
    paddingHorizontal: 16,
    gap: 0,
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
    backgroundColor: "#ffffff",
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
});
