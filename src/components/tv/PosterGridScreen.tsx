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
import { JellyfinItem, JellyfinSession } from "../../services/jellyfin";
import { GridCard } from "../GridCard";

const COLUMNS = 3;
const COLUMN_GAP = 12;

interface PosterGridScreenProps {
  title: string;
  emptyIcon: keyof typeof Ionicons.glyphMap;
  emptyText: string;
  fetchItems: (session: JellyfinSession) => Promise<JellyfinItem[]>;
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
  fetchItems,
  seriesOnly,
}: PosterGridScreenProps) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [items, setItems] = useState<JellyfinItem[]>([]);
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
    setIsLoading(true);
  }
  const activeSessionKey = useRef(sessionKey);
  useEffect(() => {
    activeSessionKey.current = sessionKey;
  }, [sessionKey]);

  const load = async () => {
    if (!session) return;
    const requestKey = sessionKey;
    try {
      const next = await fetchItems(session);
      // A slow response from the previous server must not overwrite the new one
      if (activeSessionKey.current === requestKey) setItems(next);
    } catch (e) {
      console.error(`Errore caricamento ${title}:`, e);
    } finally {
      if (activeSessionKey.current === requestKey) setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
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
