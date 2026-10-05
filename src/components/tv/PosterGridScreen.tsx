import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gutter, Palette, Typography } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { ItemsPage, JellyfinItem, JellyfinSession } from "../../services/jellyfin";
import { GridCard } from "../GridCard";

const COLUMNS = 3;
const COLUMN_GAP = 12;
/** Items requested per page; the grid loads the next one when the user nears the end. */
const PAGE_SIZE = 60;
/** Upper bound of items re-fetched when refreshing a grid the user has scrolled deep into. */
const MAX_REFRESH = 300;

function dedupe(items: JellyfinItem[]): JellyfinItem[] {
  const seen = new Set<string>();
  return items.filter((item) => !seen.has(item.Id) && !!seen.add(item.Id));
}

interface PosterGridScreenProps {
  title: string;
  emptyIcon: keyof typeof Ionicons.glyphMap;
  emptyText: string;
  fetchPage: (session: JellyfinSession, startIndex: number, limit: number) => Promise<ItemsPage>;
  seriesOnly?: boolean;
}

/**
 * Library tab: large title that collapses into a frosted inline header,
 * with a 3-column poster grid below.
 */
export function PosterGridScreen({
  title,
  emptyIcon,
  emptyText,
  fetchPage,
  seriesOnly,
}: PosterGridScreenProps) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [items, setItems] = useState<JellyfinItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Mirror of `items`, updated synchronously so paging logic never reads a stale list
  const itemsRef = useRef<JellyfinItem[]>([]);
  const loadingMoreRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scrollY] = useState(() => new Animated.Value(0));

  const cardWidth = (width - Gutter * 2 - COLUMN_GAP * (COLUMNS - 1)) / COLUMNS;
  const compactHeaderHeight = insets.top + 44;

  // Switching server: drop the previous server's grid right away and show the spinner
  const sessionKey = session ? `${session.serverUrl}::${session.userId}` : null;
  const [shownSessionKey, setShownSessionKey] = useState(sessionKey);
  if (shownSessionKey !== sessionKey) {
    setShownSessionKey(sessionKey);
    setItems([]);
    setHasMore(false);
    setLoadingMore(false);
    setIsLoading(true);
  }
  const activeSessionKey = useRef(sessionKey);
  // Refs can't be written during render, so they follow the session here (declared before the load effect below)
  useEffect(() => {
    activeSessionKey.current = sessionKey;
    itemsRef.current = [];
    loadingMoreRef.current = false;
  }, [sessionKey]);

  const commitItems = (next: JellyfinItem[]) => {
    itemsRef.current = next;
    setItems(next);
  };

  /** (Re)loads the first pages, keeping whatever the user had already scrolled through. */
  const load = async () => {
    if (!session) return;
    const requestKey = sessionKey;
    try {
      const limit = Math.min(Math.max(PAGE_SIZE, itemsRef.current.length), MAX_REFRESH);
      const page = await fetchPage(session, 0, limit);
      // A slow response from the previous server must not overwrite the new one
      if (activeSessionKey.current !== requestKey || !page.ok) return;
      const next = dedupe([...page.items, ...itemsRef.current.slice(page.items.length)]);
      commitItems(next);
      setHasMore(next.length < page.total);
    } catch (e) {
      console.error(`Errore caricamento ${title}:`, e);
    } finally {
      if (activeSessionKey.current === requestKey) setIsLoading(false);
    }
  };

  const loadMore = async () => {
    if (!session || !hasMore || loadingMoreRef.current || isLoading) return;
    const requestKey = sessionKey;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchPage(session, itemsRef.current.length, PAGE_SIZE);
      if (activeSessionKey.current !== requestKey || !page.ok) return;
      const next = dedupe([...itemsRef.current, ...page.items]);
      // No new items at all means the server ran out (or the list shifted): stop asking
      setHasMore(next.length > itemsRef.current.length && next.length < page.total);
      commitItems(next);
    } finally {
      if (activeSessionKey.current === requestKey) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
      // Deliberately only re-runs for a new session: `load` is recreated every render
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Inline title fades in as the large title scrolls under it
  const compactOpacity = scrollY.interpolate({
    inputRange: [30, 60],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.screen}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Palette.label} />
        </View>
      ) : (
        <Animated.FlatList
          data={items}
          keyExtractor={(item) => item.Id}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 8 }]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.label} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={1.5}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={styles.footer} color={Palette.labelSecondary} /> : null
          }
          ListHeaderComponent={<Text style={styles.largeTitle}>{title}</Text>}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name={emptyIcon} size={48} color={Palette.labelTertiary} />
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            // Staggered fade-in for the first screenful
            <Reanimated.View entering={index < 18 ? FadeInDown.delay(index * 30).duration(320) : undefined}>
              <GridCard
                item={item}
                session={session}
                width={cardWidth}
                onRefresh={load}
                seriesOnly={seriesOnly}
              />
            </Reanimated.View>
          )}
        />
      )}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.compactHeader,
          { height: compactHeaderHeight, paddingTop: insets.top, opacity: compactOpacity },
        ]}
      >
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <Text style={styles.compactTitle}>{title}</Text>
        <View style={styles.hairline} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Gutter,
    paddingBottom: 110,
  },
  footer: {
    paddingVertical: 20,
  },
  largeTitle: {
    ...Typography.largeTitle,
    color: Palette.label,
    marginTop: 8,
    marginBottom: 16,
  },
  row: {
    gap: COLUMN_GAP,
    marginBottom: 20,
  },
  compactHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  compactTitle: {
    ...Typography.headline,
    color: Palette.label,
  },
  hairline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.separator,
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    ...Typography.subhead,
    color: Palette.labelSecondary,
  },
});
