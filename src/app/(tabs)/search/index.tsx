import { Ionicons } from "@expo/vector-icons";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { Stack, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { SearchBarCommands } from "react-native-screens";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { GridCard } from "../../../components/GridCard";
import { Gutter, Palette, Radius, Typography } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { haptics } from "../../../lib/haptics";
import { useTranslation, type TranslationKey } from "../../../i18n";
import { JellyfinItem, JellyfinService } from "../../../services/jellyfin";

type FilterType = "ALL" | "Series" | "Movie";

// Labels are translation keys, resolved at render time so they follow the selected language
const FILTERS: { value: FilterType; label: TranslationKey }[] = [
  { value: "ALL", label: "search.all" },
  { value: "Series", label: "series.title" },
  { value: "Movie", label: "movies.title" },
];

const COLUMNS = 3;
const COLUMN_GAP = 12;
/** An empty text this soon after a blur comes from iOS deactivating the field, not from the user. */
const SYSTEM_CLEAR_WINDOW_MS = 500;

export default function SearchScreen() {
  const { session } = useAuth();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [results, setResults] = useState<JellyfinItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchBarRef = useRef<SearchBarCommands>(null);
  const blurredAt = useRef(0);
  const latestQuery = useRef(query);
  useEffect(() => {
    latestQuery.current = query;
  }, [query]);

  // Back from a result: put the kept query back into the (natively cleared) search field
  useFocusEffect(
    useCallback(() => {
      if (latestQuery.current) searchBarRef.current?.setText(latestQuery.current);
    }, [])
  );

  const trimmed = query.trim();
  const cardWidth = (width - Gutter * 2 - COLUMN_GAP * (COLUMNS - 1)) / COLUMNS;

  // Debounced search; an empty query simply renders the idle state
  useEffect(() => {
    if (!session || trimmed.length === 0) return;

    // Ignore results of a superseded query (or of the previous server)
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const types = filter === "ALL" ? "Movie,Series" : filter;
        const next = await JellyfinService.searchItems(session, trimmed, types);
        if (!cancelled) setResults(next);
      } catch (err) {
        console.error("Errore ricerca:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [session, trimmed, filter]);

  const segmented = (
    <View style={styles.segmentWrap}>
      <SegmentedControl
        values={FILTERS.map((f) => t(f.label))}
        selectedIndex={FILTERS.findIndex((f) => f.value === filter)}
        onChange={(e) => {
          haptics.selection();
          setFilter(FILTERS[e.nativeEvent.selectedSegmentIndex].value);
        }}
        appearance="dark"
        style={styles.segmented}
      />
    </View>
  );

  let emptyState: React.ReactNode;
  if (trimmed.length === 0) {
    emptyState = (
      <View style={styles.emptyContainer}>
        <Ionicons name="search" size={48} color={Palette.labelTertiary} />
        <Text style={styles.emptyTitle}>{t("search.emptyTitle")}</Text>
        <Text style={styles.emptySubtitle}>{t("search.emptySubtitle")}</Text>
      </View>
    );
  } else if (isLoading) {
    // Poster-shaped placeholders while the first results arrive
    emptyState = (
      <View style={styles.placeholderGrid}>
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={[styles.placeholder, { width: cardWidth }]} />
        ))}
      </View>
    );
  } else {
    emptyState = (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>{t("search.noResultsTitle")}</Text>
        <Text style={styles.emptySubtitle}>{t("search.noResultsMessage", { query: trimmed })}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.SearchBar
        placeholder={t("search.placeholder")}
        ref={searchBarRef}
        onChangeText={(e) => {
          const text = e.nativeEvent.text;
          // Opening a result deactivates the native search field, which blurs and then clears it:
          // keep the query, or the grid (the zoom transition's source) vanishes mid-animation
          if (text === "" && Date.now() - blurredAt.current < SYSTEM_CLEAR_WINDOW_MS) return;
          setQuery(text);
        }}
        onCancelButtonPress={() => setQuery("")}
        onBlur={() => {
          blurredAt.current = Date.now();
        }}
        autoCapitalize="none"
        hideWhenScrolling={false}
        tintColor={Palette.label}
        textColor={Palette.label}
        hintTextColor={Palette.labelSecondary}
        headerIconColor={Palette.labelSecondary}
      />
      <FlatList
        data={trimmed.length === 0 ? [] : results}
        keyExtractor={(item) => item.Id}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <>
            {segmented}
            {isLoading && results.length > 0 && (
              <ActivityIndicator style={styles.inlineSpinner} color={Palette.labelSecondary} />
            )}
          </>
        }
        ListEmptyComponent={emptyState}
        renderItem={({ item, index }) => (
          <Reanimated.View entering={index < 18 ? FadeInDown.delay(index * 30).duration(320) : undefined}>
            <GridCard
              item={item}
              session={session}
              width={cardWidth}
              seriesOnly={item.Type === "Series"}
            />
          </Reanimated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  segmentWrap: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  segmented: {
    height: 34,
  },
  inlineSpinner: {
    marginTop: -8,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: Gutter,
    paddingBottom: 110,
    flexGrow: 1,
  },
  row: {
    gap: COLUMN_GAP,
    marginBottom: 20,
  },
  placeholderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: COLUMN_GAP,
    rowGap: 20,
  },
  placeholder: {
    aspectRatio: 2 / 3,
    borderRadius: Radius.card,
    backgroundColor: Palette.surface,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
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
