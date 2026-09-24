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
      {/* Floating close button on top-left: completely clear of AirPlay/PiP on the top-right */}
      <Pressable
        style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
        onPress={handleClose}
      >
        <Ionicons name="close" size={22} color="#ffffff" />
      </Pressable>
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
  closeButton: {
    position: "absolute",
    top: 50,
    left: 16,
    zIndex: 30,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(20, 24, 28, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  closeButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});
