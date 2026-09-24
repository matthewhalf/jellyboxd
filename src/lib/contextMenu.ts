import { ActionSheetIOS, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { JellyfinItem, JellyfinService, JellyfinSession } from "../services/jellyfin";
import { haptics } from "./haptics";

type RouterInstance = ReturnType<typeof useRouter>;

export function showEpisodeContextMenu({
  item,
  session,
  router,
  onRefresh,
}: {
  item: JellyfinItem;
  session: JellyfinSession | null;
  router: RouterInstance;
  onRefresh?: () => void;
}) {
  haptics.heavy();
  const seriesId = item.SeriesId || (item.Type === "Series" ? item.Id : null);
  const isPlayed = !!item.UserData?.Played;
  const togglePlayedText = isPlayed ? "Segna come non visto" : "Segna come visto";

  const options = seriesId
    ? ["Vai alla serie", togglePlayedText, "Annulla"]
    : [togglePlayedText, "Annulla"];
  const cancelButtonIndex = options.length - 1;

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: item.SeriesName ? `${item.SeriesName}` : item.Name,
        message:
          item.Type === "Episode"
            ? `S${item.ParentIndexNumber ?? 1}:E${item.IndexNumber ?? 1} • ${item.Name}`
            : undefined,
        options,
        cancelButtonIndex,
      },
      async (buttonIndex) => {
        if (buttonIndex === cancelButtonIndex) return;

        if (seriesId && buttonIndex === 0) {
          haptics.light();
          router.push(`/item/${seriesId}`);
          return;
        }

        // Toggle played
        if (session) {
          haptics.medium();
          const success = await JellyfinService.markItemPlayed(
            session,
            item.Id,
            !isPlayed
          );
          if (success) {
            haptics.success();
            onRefresh?.();
          }
        }
      }
    );
  } else {
    Alert.alert(
      item.SeriesName || item.Name,
      item.Type === "Episode"
        ? `S${item.ParentIndexNumber ?? 1}:E${item.IndexNumber ?? 1} • ${item.Name}`
        : "",
      [
        ...(seriesId
          ? [
              {
                text: "Vai alla serie",
                onPress: () => {
                  haptics.light();
                  router.push(`/item/${seriesId}`);
                },
              },
            ]
          : []),
        {
          text: togglePlayedText,
          onPress: async () => {
            if (session) {
              haptics.medium();
              const success = await JellyfinService.markItemPlayed(
                session,
                item.Id,
                !isPlayed
              );
              if (success) {
                haptics.success();
                onRefresh?.();
              }
            }
          },
        },
        { text: "Annulla", style: "cancel" },
      ]
    );
  }
}

export function showSeriesContextMenu({
  item,
  router,
}: {
  item: JellyfinItem;
  router: RouterInstance;
}) {
  haptics.heavy();
  const options = ["Vai alla serie", "Annulla"];
  const cancelButtonIndex = 1;

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: item.Name,
        options,
        cancelButtonIndex,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          haptics.light();
          router.push(`/item/${item.Id}`);
        }
      }
    );
  } else {
    Alert.alert(item.Name, "", [
      {
        text: "Vai alla serie",
        onPress: () => {
          haptics.light();
          router.push(`/item/${item.Id}`);
        },
      },
      { text: "Annulla", style: "cancel" },
    ]);
  }
}
