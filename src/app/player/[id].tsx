import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
        player.currentTime = resumeSeconds;
      }
    }
  }, [player, item]);

  // Periodic reporting to Jellyfin server
  useEffect(() => {
    if (!session || !id) return;

    // Report Playback Start
    JellyfinService.reportPlaybackStart(session, id);

    const interval = setInterval(() => {
      if (player && player.playing) {
        const ticks = Math.round(player.currentTime * 10000000);
        lastReportedTicks.current = ticks;
        JellyfinService.reportPlaybackProgress(session, id, ticks, false);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      // Report Playback Stopped on unmount
      const finalTicks = player ? Math.round(player.currentTime * 10000000) : lastReportedTicks.current;
      JellyfinService.reportPlaybackStopped(session, id, finalTicks);
    };
  }, [session, id, player]);

  const handleClose = () => {
    if (player) {
      player.pause();
    }
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

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <VideoView
        style={styles.video}
        player={player}
        allowsPictureInPicture
        contentFit="contain"
      />
      <SafeAreaView style={styles.overlay}>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={28} color="#ffffff" />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {item.Type === "Episode"
            ? `${item.SeriesName} - S${item.ParentIndexNumber}E${item.IndexNumber}`
            : item.Name}
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
    backgroundColor: "rgba(0,0,0,0.5)",
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
