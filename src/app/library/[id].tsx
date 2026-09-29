import { Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, useWindowDimensions, View } from "react-native";
import { GridCard } from "../../components/GridCard";
import { Gutter, Palette } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { JellyfinItem, JellyfinService } from "../../services/jellyfin";

const COLUMNS = 3;
const COLUMN_GAP = 12;
const PAGE_SIZE = 60;

export default function LibraryScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { session } = useAuth();
  const { width } = useWindowDimensions();

  const [items, setItems] = useState<JellyfinItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Mirror of `items` plus a request token, so stale pages (old server/library) are dropped
  const itemsRef = useRef<JellyfinItem[]>([]);
  const loadingMoreRef = useRef(false);
  const generation = useRef(0);

  const cardWidth = (width - Gutter * 2 - COLUMN_GAP * (COLUMNS - 1)) / COLUMNS;

  useEffect(() => {
    if (!session || !id) return;
    const current = ++generation.current;
    itemsRef.current = [];
    loadingMoreRef.current = false;
    setItems([]);
    setHasMore(false);
    setLoadingMore(false);
    setIsLoading(true);
    JellyfinService.fetchLibraryItemsPage(session, id, 0, PAGE_SIZE)
      .then((page) => {
        if (generation.current !== current) return;
        itemsRef.current = page.items;
        setItems(page.items);
        setHasMore(page.items.length < page.total);
      })
      .catch((err) => console.error("Errore fetch libreria:", err))
      .finally(() => generation.current === current && setIsLoading(false));
    return () => {
      generation.current++;
    };
  }, [session, id]);

  const loadMore = useCallback(async () => {
    if (!session || !id || !hasMore || loadingMoreRef.current || isLoading) return;
    const current = generation.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await JellyfinService.fetchLibraryItemsPage(session, id, itemsRef.current.length, PAGE_SIZE);
      if (generation.current !== current || !page.ok) return;
      const known = new Set(itemsRef.current.map((i) => i.Id));
      const next = [...itemsRef.current, ...page.items.filter((i) => !known.has(i.Id))];
      setHasMore(next.length > itemsRef.current.length && next.length < page.total);
      itemsRef.current = next;
      setItems(next);
    } finally {
      if (generation.current === current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [session, id, hasMore, isLoading]);

  return (
    <View style={styles.container}>
      {name ? <Stack.Screen options={{ title: name }} /> : null}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Palette.label} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.Id}
          numColumns={COLUMNS}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          contentInsetAdjustmentBehavior="automatic"
          onEndReached={loadMore}
          onEndReachedThreshold={1.5}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={styles.footer} color={Palette.labelSecondary} /> : null
          }
          renderItem={({ item }) => (
            <GridCard
              item={item}
              session={session}
              width={cardWidth}
              seriesOnly={item.Type === "Series"}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    paddingVertical: 20,
  },
  listContent: {
    paddingHorizontal: Gutter,
    paddingTop: 12,
    paddingBottom: 48,
  },
  row: {
    gap: COLUMN_GAP,
    marginBottom: 20,
  },
});
