import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LoginScreen } from "../components/LoginScreen";
import { useAuth } from "../context/AuthContext";
import { JellyfinItem, JellyfinService } from "../services/jellyfin";

export default function HomeScreen() {
  const { session, isLoading, logout } = useAuth();
  const router = useRouter();

  const [resumeItems, setResumeItems] = useState<JellyfinItem[]>([]);
  const [libraries, setLibraries] = useState<JellyfinItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!session) return;
    try {
      const [resumes, userLibs] = await Promise.all([
        JellyfinService.fetchResumeItems(session),
        JellyfinService.fetchLibraries(session),
      ]);
      setResumeItems(resumes);
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
        {/* Continue Watching Section */}
        {resumeItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>CONTINUA A GUARDARE</Text>
              <Text style={styles.badgeCount}>{resumeItems.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {resumeItems.map((item) => {
                const percent = Math.round(item.UserData?.PlayedPercentage || 0);
                const imageUrl = JellyfinService.getImageUrl(session.serverUrl, item.Id, "Primary", 300);
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
                    <Text style={styles.resumeTitle} numberOfLines={1}>
                      {item.Type === "Episode" ? `${item.SeriesName} - S${item.ParentIndexNumber}E${item.IndexNumber}` : item.Name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Libraries Section */}
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
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  badgeCount: {
    backgroundColor: "#2c3440",
    color: "#00e054",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 12,
  },
  horizontalList: {
    paddingHorizontal: 20,
    gap: 14,
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
  resumeTitle: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  librariesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
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
