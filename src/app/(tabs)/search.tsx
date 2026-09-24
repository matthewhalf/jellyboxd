import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useLiquidGlassMenu } from "../../context/LiquidGlassMenuContext";
import { haptics } from "../../lib/haptics";
import { JellyfinItem, JellyfinService } from "../../services/jellyfin";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 3;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

type FilterType = "ALL" | "Series" | "Movie";

export default function SearchScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [results, setResults] = useState<JellyfinItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!session || query.trim().length === 0) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const types = filter === "ALL" ? "Movie,Series" : filter;
        const items = await JellyfinService.searchItems(session, query.trim(), types);
        setResults(items);
      } catch (err) {
        console.error("Errore ricerca:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [session, query, filter]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cerca</Text>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#89a" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca film o serie TV..."
            placeholderTextColor="#677b8c"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#89a" />
            </Pressable>
          )}
        </View>

        {/* Filter Tabs (Tutti, Serie, Film) */}
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterPill, filter === "ALL" && styles.filterPillActive]}
            onPress={() => {
              haptics.selection();
              setFilter("ALL");
            }}
          >
            <Text
              style={[
                styles.filterPillText,
                filter === "ALL" && styles.filterPillTextActive,
              ]}
            >
              Tutti
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterPill, filter === "Series" && styles.filterPillActive]}
            onPress={() => {
              haptics.selection();
              setFilter("Series");
            }}
          >
            <Text
              style={[
                styles.filterPillText,
                filter === "Series" && styles.filterPillTextActive,
              ]}
            >
              Serie TV
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterPill, filter === "Movie" && styles.filterPillActive]}
            onPress={() => {
              haptics.selection();
              setFilter("Movie");
            }}
          >
            <Text
              style={[
                styles.filterPillText,
                filter === "Movie" && styles.filterPillTextActive,
              ]}
            >
              Film
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : query.trim().length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={56} color="#2c3440" />
          <Text style={styles.emptyTitle}>Cerca nella tua libreria</Text>
          <Text style={styles.emptySubtitle}>
            Trova serie TV ed episodi o film disponibili su Jellyfin
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#456" />
          <Text style={styles.emptyTitle}>Nessun risultato</Text>
          <Text style={styles.emptySubtitle}>
            Non abbiamo trovato nulla corrispondente a "{query}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.Id}
          numColumns={3}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SearchCard item={item} session={session} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function SearchCard({
  item,
  session,
}: {
  item: JellyfinItem;
  session: any;
}) {
  const router = useRouter();
  const { openMenu } = useLiquidGlassMenu();
  const touchScale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(touchScale, {
      toValue: 0.93,
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
      Animated.timing(touchScale, { toValue: 0.90, duration: 80, useNativeDriver: true }),
      Animated.spring(touchScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    openMenu({ item, session, seriesOnly: item.Type === "Series" });
  };

  const imageUrl = JellyfinService.getImageUrl(
    session?.serverUrl || "",
    item.Id,
    "Primary",
    350
  );
  const rating = item.CommunityRating ? item.CommunityRating.toFixed(1) : null;
  const isMovie = item.Type === "Movie";

  return (
    <Animated.View style={{ transform: [{ scale: touchScale }] }}>
      <Pressable
        style={styles.card}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          haptics.light();
          router.push(`/item/${item.Id}`);
        }}
        onLongPress={handleLongPress}
        delayLongPress={300}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.poster}
          resizeMode="cover"
        />
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {isMovie ? "FILM" : "SERIE"}
          </Text>
        </View>
        {rating && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color="#ffcc00" />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        )}
        <Text style={styles.title} numberOfLines={1}>
          {item.Name}
        </Text>
        {item.ProductionYear && (
          <Text style={styles.sub}>{item.ProductionYear}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#14181c",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 1.2,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1f252c",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f252c",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: "#2c3440",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    height: "100%",
  },
  clearBtn: {
    padding: 4,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#1f252c",
    borderWidth: 1,
    borderColor: "#2c3440",
  },
  filterPillActive: {
    backgroundColor: "#e2e4e8",
    borderColor: "#e2e4e8",
  },
  filterPillText: {
    color: "#89a",
    fontSize: 12,
    fontWeight: "700",
  },
  filterPillTextActive: {
    color: "#000000",
    fontWeight: "800",
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
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    position: "relative",
  },
  poster: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
    backgroundColor: "#1f252c",
  },
  typeBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: "#89a",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
