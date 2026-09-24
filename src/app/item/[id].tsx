import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { JellyfinItem, JellyfinService } from "../../services/jellyfin";

const { width } = Dimensions.get("window");

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<JellyfinItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session || !id) return;
    JellyfinService.fetchItemDetails(session, id)
      .then((data) => setItem(data))
      .catch((err) => console.error("Errore fetch dettagli:", err))
      .finally(() => setIsLoading(false));
  }, [session, id]);

  if (isLoading || !item || !session) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00e054" />
      </View>
    );
  }

  const backdropUrl = JellyfinService.getImageUrl(session.serverUrl, item.Id, "Backdrop", 900);
  const posterUrl = JellyfinService.getImageUrl(session.serverUrl, item.Id, "Primary", 500);
  const runtimeMins = item.RunTimeTicks ? Math.round(item.RunTimeTicks / (10000000 * 60)) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

        {/* Play Button */}
        <Pressable
          style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
          onPress={() => router.push(`/player/${item.Id}`)}
        >
          <Ionicons name="play" size={20} color="#000000" />
          <Text style={styles.playButtonText}>RIPRODUCI ORA</Text>
        </Pressable>

        {/* Plot Synopsis */}
        {item.Overview && (
          <View style={styles.synopsisContainer}>
            <Text style={styles.synopsisLabel}>TRAMA</Text>
            <Text style={styles.overview}>{item.Overview}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#14181c",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#14181c",
  },
  content: {
    paddingBottom: 40,
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
    marginTop: 28,
  },
  synopsisLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#677b8c",
    letterSpacing: 1,
    marginBottom: 8,
  },
  overview: {
    color: "#ccd",
    fontSize: 14,
    lineHeight: 22,
  },
});
