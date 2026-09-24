import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { JellyfinItem, JellyfinService } from "../../services/jellyfin";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const ITEM_WIDTH = (width - 40 - (COLUMN_COUNT - 1) * 10) / COLUMN_COUNT;
const ITEM_HEIGHT = ITEM_WIDTH * 1.5;

export default function LibraryScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<JellyfinItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session || !id) return;
    JellyfinService.fetchLibraryItems(session, id)
      .then((data) => setItems(data))
      .catch((err) => console.error("Errore fetch libreria:", err))
      .finally(() => setIsLoading(false));
  }, [session, id]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00e054" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.Id}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const imageUrl = session
            ? JellyfinService.getImageUrl(session.serverUrl, item.Id, "Primary", 350)
            : "";
          const rating = item.CommunityRating ? item.CommunityRating.toFixed(1) : null;

          return (
            <Pressable
              style={styles.itemCard}
              onPress={() => router.push(`/item/${item.Id}`)}
            >
              <Image source={{ uri: imageUrl }} style={styles.poster} resizeMode="cover" />
              {rating && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={10} color="#00e054" />
                  <Text style={styles.ratingText}>{rating}</Text>
                </View>
              )}
              <Text style={styles.itemTitle} numberOfLines={1}>
                {item.Name}
              </Text>
              {item.ProductionYear && (
                <Text style={styles.yearText}>{item.ProductionYear}</Text>
              )}
            </Pressable>
          );
        }}
      />
    </View>
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
  listContent: {
    padding: 20,
  },
  row: {
    gap: 10,
    marginBottom: 16,
  },
  itemCard: {
    width: ITEM_WIDTH,
  },
  poster: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: 6,
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
  itemTitle: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  yearText: {
    color: "#677b8c",
    fontSize: 11,
    marginTop: 2,
  },
});
