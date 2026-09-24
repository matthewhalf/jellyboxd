import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { JellyfinItem, JellyfinService } from "../../services/jellyfin";

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<JellyfinItem | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const lastReportedTicks = useRef(0);

  useEffect(() => {
    if (!session || !id) return;
    JellyfinService.fetchItemDetails(session, id).then((data) => {
      setItem(data);
      const url = JellyfinService.getStreamUrl(session.serverUrl, id, session.token);
      setStreamUrl(url);
    });
  }, [session, id]);

  const player = useVideoPlayer(streamUrl || "", (p) => {
    p.loop = false;
    p.play();
  });

  // Handle resume position once metadata is loaded
  useEffect(() => {
    if (player && item?.UserData?.PlaybackPositionTicks) {
      const resumeSeconds = item.UserData.PlaybackPositionTicks / 10000000;
      if (resumeSeconds > 10) {
        try {
          player.currentTime = resumeSeconds;
        } catch {}
      }
    }
  }, [player, item]);

  // Periodic reporting to Jellyfin server
  useEffect(() => {
    if (!session || !id) return;

    // Report Playback Start
    JellyfinService.reportPlaybackStart(session, id);

    const interval = setInterval(() => {
      try {
        if (player && player.playing) {
          const ticks = Math.round(player.currentTime * 10000000);
          lastReportedTicks.current = ticks;
          JellyfinService.reportPlaybackProgress(session, id, ticks, false);
        }
      } catch {}
    }, 10000);

    return () => {
      clearInterval(interval);
      // Safe cleanup without accessing player (which could already be deallocated)
      try {
        JellyfinService.reportPlaybackStopped(session, id, lastReportedTicks.current);
      } catch {}
    };
  }, [session, id]);

  const handleClose = () => {
    try {
      if (player) {
        player.pause();
      }
    } catch {}
    router.back();
  };

  if (!streamUrl || !item) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar hidden />
        <ActivityIndicator size="large" color="#00e054" />
        <Text style={styles.loadingText}>Connessione al flusso video...</Text>
      </View>
    );
  }

  const titleText =
    item.Type === "Episode"
      ? `${item.SeriesName || ""} - S${item.ParentIndexNumber ?? 1}E${item.IndexNumber ?? 1}`
      : item.Name;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <VideoView
        style={styles.video}
        player={player}
        nativeControls={true}
        allowsPictureInPicture
        contentFit="contain"
      />
      <SafeAreaView style={styles.overlay}>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={28} color="#ffffff" />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {titleText}
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
    gap: 16,
  },
  loadingText: {
    color: "#9ab",
    fontSize: 14,
  },
  video: {
    ...StyleSheet.absoluteFill,
  },
  overlay: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  closeButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 20,
  },
  title: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 4,
  },
});
