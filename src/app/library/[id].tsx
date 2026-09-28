import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, useWindowDimensions, View } from "react-native";
import { GridCard } from "../../components/GridCard";
import { Gutter, Palette } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { JellyfinItem, JellyfinService } from "../../services/jellyfin";

const COLUMNS = 3;
const COLUMN_GAP = 12;

export default function LibraryScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { session } = useAuth();
  const { width } = useWindowDimensions();

  const [items, setItems] = useState<JellyfinItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const cardWidth = (width - Gutter * 2 - COLUMN_GAP * (COLUMNS - 1)) / COLUMNS;

  useEffect(() => {
    if (!session || !id) return;
    // Ignore the response if the server (or library) changed while it was in flight
    let cancelled = false;
    JellyfinService.fetchLibraryItems(session, id)
      .then((next) => !cancelled && setItems(next))
      .catch((err) => console.error("Errore fetch libreria:", err))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [session, id]);

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
