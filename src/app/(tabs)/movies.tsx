import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GridCard } from "../../components/GridCard";
import { useAuth } from "../../context/AuthContext";
import { JellyfinItem, JellyfinService } from "../../services/jellyfin";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 3;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

export default function MoviesScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [moviesList, setMoviesList] = useState<JellyfinItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMovies = async () => {
    if (!session) return;
    try {
      const data = await JellyfinService.fetchMovies(session, 100);
      setMoviesList(data);
    } catch (e) {
      console.error("Errore fetch film:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, [session]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMovies();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Film</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : (
        <FlatList
          data={moviesList}
          keyExtractor={(item) => item.Id}
          numColumns={3}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="film-outline" size={48} color="#456" />
              <Text style={styles.emptyText}>Nessun film trovato nel server</Text>
            </View>
          }
          renderItem={({ item }) => (
            <GridCard
              item={item}
              session={session}
              onRefresh={loadMovies}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#14181c",
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1f252c",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 1.2,
  },
  headerBadge: {
    color: "#8e8e93",
    fontSize: 12,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  card: {
    width: CARD_WIDTH,
  },
  poster: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
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
  title: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  sub: {
    color: "#677b8c",
    fontSize: 11,
    marginTop: 2,
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    color: "#89a",
    fontSize: 14,
  },
});
