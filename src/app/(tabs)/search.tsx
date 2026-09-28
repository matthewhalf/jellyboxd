import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GridCard } from "../../components/GridCard";
import { Gutter, Palette, Radius, Typography } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { haptics } from "../../lib/haptics";
import { JellyfinItem, JellyfinService } from "../../services/jellyfin";

type FilterType = "ALL" | "Series" | "Movie";

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "ALL", label: "Tutti" },
  { value: "Series", label: "Serie TV" },
  { value: "Movie", label: "Film" },
];

const COLUMNS = 3;
const COLUMN_GAP = 12;

export default function SearchScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [results, setResults] = useState<JellyfinItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const trimmed = query.trim();
  const cardWidth = (width - Gutter * 2 - COLUMN_GAP * (COLUMNS - 1)) / COLUMNS;

  // Debounced search; an empty query simply renders the idle state
  useEffect(() => {
    if (!session || trimmed.length === 0) return;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const types = filter === "ALL" ? "Movie,Series" : filter;
        setResults(await JellyfinService.searchItems(session, trimmed, types));
      } catch (err) {
        console.error("Errore ricerca:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [session, trimmed, filter]);

  let content: React.ReactNode;
  if (trimmed.length === 0) {
    content = (
      <View style={styles.emptyContainer}>
        <Ionicons name="search" size={48} color={Palette.labelTertiary} />
        <Text style={styles.emptyTitle}>Cerca nella tua libreria</Text>
        <Text style={styles.emptySubtitle}>Film e serie TV disponibili sul tuo server Jellyfin</Text>
      </View>
    );
  } else if (isLoading && results.length === 0) {
    content = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Palette.label} />
      </View>
    );
  } else if (results.length === 0) {
    content = (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Nessun risultato</Text>
        <Text style={styles.emptySubtitle}>Nessun titolo corrisponde a “{trimmed}”</Text>
      </View>
    );
  } else {
    content = (
      <FlatList
        data={results}
        keyExtractor={(item) => item.Id}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => (
          <GridCard
            item={item}
            session={session}
            width={cardWidth}
            seriesOnly={item.Type === "Series"}
          />
        )}
      />
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.largeTitle}>Cerca</Text>

        <View style={styles.searchField}>
          <Ionicons name="search" size={17} color={Palette.labelSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Film, serie TV"
            placeholderTextColor={Palette.labelSecondary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            selectionColor={Palette.label}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={Palette.labelSecondary} />
            </Pressable>
          )}
        </View>

        <View style={styles.segmented}>
          {FILTERS.map(({ value, label }) => {
            const active = filter === value;
            return (
              <Pressable
                key={value}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => {
                  haptics.selection();
                  setFilter(value);
                }}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  header: {
    paddingHorizontal: Gutter,
    paddingBottom: 12,
    gap: 12,
  },
  largeTitle: {
    ...Typography.largeTitle,
    color: Palette.label,
    marginTop: 16,
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: Radius.card,
    backgroundColor: Palette.fillSecondary,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Palette.label,
    height: "100%",
  },
  segmented: {
    flexDirection: "row",
    padding: 2,
    borderRadius: 9,
    backgroundColor: Palette.fillSecondary,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 7,
  },
  segmentActive: {
    backgroundColor: Palette.surfacePressed,
  },
  segmentText: {
    ...Typography.footnote,
    fontWeight: "500",
    color: Palette.labelSecondary,
  },
  segmentTextActive: {
    fontWeight: "600",
    color: Palette.label,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Gutter,
    paddingTop: 8,
    paddingBottom: 110,
  },
  row: {
    gap: COLUMN_GAP,
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 80,
    gap: 8,
  },
  emptyTitle: {
    ...Typography.title3,
    color: Palette.label,
    textAlign: "center",
  },
  emptySubtitle: {
    ...Typography.subhead,
    color: Palette.labelSecondary,
    textAlign: "center",
  },
});
