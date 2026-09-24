import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useEventListener } from "expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { haptics } from "../../lib/haptics";
import {
  JellyfinItem,
  JellyfinService,
  MediaStreamInfo,
} from "../../services/jellyfin";

type OptionTab = "audio" | "subtitles" | "quality";

const QUALITY_OPTIONS = [
  { label: "Originale (Direct Play)", bitrate: 0 },
  { label: "1080p - 10 Mbps", bitrate: 10000000 },
  { label: "720p - 4 Mbps", bitrate: 4000000 },
  { label: "480p - 1.5 Mbps", bitrate: 1500000 },
];

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<JellyfinItem | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<OptionTab>("audio");

  // Track selection states
  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number | undefined>(undefined);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number>(-1);
  const [selectedBitrate, setSelectedBitrate] = useState<number>(0);

  const videoViewRef = useRef<any>(null);
  const lastReportedTicks = useRef(0);
  const lastSyncedTicks = useRef(0);

  // Enable dynamic screen rotation during playback, lock back to portrait on exit
  useEffect(() => {
    async function enableRotation() {
      try {
        await ScreenOrientation.unlockAsync();
      } catch (e) {
        console.warn("ScreenOrientation unlock error:", e);
      }
    }
    enableRotation();

    return () => {
      try {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } catch {}
    };
  }, []);

  // Fetch item details and initialize stream URL + default bitrate
  useEffect(() => {
    if (!session || !id) return;
    Promise.all([
      JellyfinService.fetchItemDetails(session, id),
      JellyfinService.getDefaultBitrate(),
    ]).then(([data, defaultBitrate]) => {
      setItem(data);
      setSelectedBitrate(defaultBitrate);

      // Find default audio & subtitle stream
      const streams = data?.MediaSources?.[0]?.MediaStreams || [];
      const defaultAudio = streams.find((s) => s.Type === "Audio" && s.IsDefault) ||
        streams.find((s) => s.Type === "Audio");
      const defaultSub = streams.find((s) => s.Type === "Subtitle" && s.IsDefault);

      const audioIdx = defaultAudio?.Index;
      const subIdx = defaultSub ? defaultSub.Index : -1;

      setSelectedAudioIndex(audioIdx);
      setSelectedSubtitleIndex(subIdx);

      const url = JellyfinService.getStreamUrl(session.serverUrl, id, session.token, {
        audioStreamIndex: audioIdx,
        subtitleStreamIndex: subIdx,
        maxStreamingBitrate: defaultBitrate,
      });
      setStreamUrl(url);
    });
  }, [session, id]);

  const player = useVideoPlayer(streamUrl || "", (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 1;
    p.play();
  });

  // Automatically enter native fullscreen as soon as player is loaded
  useEffect(() => {
    if (player && streamUrl) {
      const enterNativeFs = async () => {
        try {
          await videoViewRef.current?.enterFullscreen();
        } catch {}
      };
      enterNativeFs();
      const t1 = setTimeout(enterNativeFs, 150);
      const t2 = setTimeout(enterNativeFs, 400);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [player, streamUrl]);

  // Handle resume position once metadata is loaded
  useEffect(() => {
    if (player && item?.UserData?.PlaybackPositionTicks) {
      const resumeSeconds = item.UserData.PlaybackPositionTicks / 10000000;
      if (resumeSeconds > 10) {
        try {
          player.currentTime = resumeSeconds;
          lastReportedTicks.current = item.UserData.PlaybackPositionTicks;
          lastSyncedTicks.current = item.UserData.PlaybackPositionTicks;
        } catch {}
      }
    }
  }, [player, item]);

  // Listen to playback time updates and seeking events
  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    if (!session || !id || currentTime <= 0) return;
    const ticks = Math.round(currentTime * 10000000);
    lastReportedTicks.current = ticks;

    const diff = Math.abs(ticks - lastSyncedTicks.current);
    if (diff >= 20000000) {
      lastSyncedTicks.current = ticks;
      JellyfinService.reportPlaybackProgress(session, id, ticks, !player.playing);
    }
  });

  useEventListener(player, "playingChange", ({ isPlaying }) => {
    if (!session || !id) return;
    const currentSec = player.currentTime || 0;
    const ticks = Math.round(currentSec * 10000000);
    if (ticks > 0) {
      lastReportedTicks.current = ticks;
      lastSyncedTicks.current = ticks;
      JellyfinService.reportPlaybackProgress(session, id, ticks, !isPlaying);
    }
  });

  // Start playback reporting
  useEffect(() => {
    if (!session || !id) return;
    JellyfinService.reportPlaybackStart(session, id);

    return () => {
      try {
        const finalTicks = lastReportedTicks.current;
        if (finalTicks > 0) {
          JellyfinService.reportPlaybackProgress(session, id, finalTicks, true);
          JellyfinService.reportPlaybackStopped(session, id, finalTicks);
        }
      } catch {}
    };
  }, [session, id]);

  const handleClose = () => {
    if (isExiting) return;
    setIsExiting(true);
    try {
      if (player) {
        player.pause();
        const currentSec = player.currentTime || 0;
        const ticks = Math.round(currentSec * 10000000);
        if (session && id && ticks > 0) {
          lastReportedTicks.current = ticks;
          JellyfinService.reportPlaybackProgress(session, id, ticks, true);
          JellyfinService.reportPlaybackStopped(session, id, ticks);
        }
      }
    } catch {}
    router.back();
  };

  // Switch stream options (audio, subtitles, bitrate) without losing progress
  const handleApplyStreamOptions = (
    newAudioIdx: number | undefined,
    newSubIdx: number,
    newBitrate: number
  ) => {
    if (!session || !id) return;
    haptics.selection();

    setSelectedAudioIndex(newAudioIdx);
    setSelectedSubtitleIndex(newSubIdx);
    setSelectedBitrate(newBitrate);
    setOptionsModalVisible(false);

    const savedSeconds = player?.currentTime || 0;
    const newUrl = JellyfinService.getStreamUrl(session.serverUrl, id, session.token, {
      audioStreamIndex: newAudioIdx,
      subtitleStreamIndex: newSubIdx,
      maxStreamingBitrate: newBitrate,
    });

    setStreamUrl(newUrl);
    try {
      player.replace(newUrl);
      if (savedSeconds > 1) {
        setTimeout(() => {
          try {
            player.currentTime = savedSeconds;
            player.play();
          } catch {}
        }, 200);
      } else {
        player.play();
      }
    } catch {
      // fallback handled by state change
    }
  };

  if (isExiting) {
    return <View style={{ flex: 1, backgroundColor: "transparent" }} />;
  }

  if (!streamUrl || !item) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar hidden />
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Connessione al flusso video...</Text>
      </View>
    );
  }

  const streams = item.MediaSources?.[0]?.MediaStreams || [];
  const audioStreams = streams.filter((s) => s.Type === "Audio");
  const subtitleStreams = streams.filter((s) => s.Type === "Subtitle");

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <VideoView
        ref={videoViewRef}
        style={styles.video}
        player={player}
        nativeControls={true}
        showsTimecodes={true}
        allowsPictureInPicture={true}
        startsPictureInPictureAutomatically={true}
        allowsVideoFrameAnalysis={true}
        contentFit="contain"
        fullscreenOptions={{
          enable: true,
          orientation: "default",
          autoExitOnRotate: false,
        }}
        onFirstFrameRender={() => {
          try {
            videoViewRef.current?.enterFullscreen();
          } catch {}
        }}
        onFullscreenExit={() => {
          handleClose();
        }}
      />

      {/* Floating close button on top-left */}
      <Pressable
        style={({ pressed }) => [styles.closeButton, pressed && styles.controlButtonPressed]}
        onPress={handleClose}
      >
        <Ionicons name="close" size={22} color="#ffffff" />
      </Pressable>

      {/* Floating options button on top-right */}
      <Pressable
        style={({ pressed }) => [styles.optionsButton, pressed && styles.controlButtonPressed]}
        onPress={() => {
          haptics.light();
          setOptionsModalVisible(true);
        }}
      >
        <Ionicons name="options-outline" size={20} color="#ffffff" />
      </Pressable>

      {/* Playback Options Modal Sheet */}
      <Modal
        visible={optionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOptionsModalVisible(false)}
          />

          <View style={styles.modalSheet}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Opzioni di riproduzione</Text>
              <Pressable
                onPress={() => setOptionsModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close-circle" size={24} color="#8e8e93" />
              </Pressable>
            </View>

            {/* Segmented Tab Bar */}
            <View style={styles.tabBar}>
              <Pressable
                style={[styles.tabButton, activeTab === "audio" && styles.tabButtonActive]}
                onPress={() => {
                  haptics.selection();
                  setActiveTab("audio");
                }}
              >
                <Ionicons
                  name="volume-high-outline"
                  size={16}
                  color={activeTab === "audio" ? "#000000" : "#89a"}
                />
                <Text
                  style={[styles.tabButtonText, activeTab === "audio" && styles.tabButtonTextActive]}
                >
                  Audio
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabButton, activeTab === "subtitles" && styles.tabButtonActive]}
                onPress={() => {
                  haptics.selection();
                  setActiveTab("subtitles");
                }}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={16}
                  color={activeTab === "subtitles" ? "#000000" : "#89a"}
                />
                <Text
                  style={[styles.tabButtonText, activeTab === "subtitles" && styles.tabButtonTextActive]}
                >
                  Sottotitoli
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabButton, activeTab === "quality" && styles.tabButtonActive]}
                onPress={() => {
                  haptics.selection();
                  setActiveTab("quality");
                }}
              >
                <Ionicons
                  name="speedometer-outline"
                  size={16}
                  color={activeTab === "quality" ? "#000000" : "#89a"}
                />
                <Text
                  style={[styles.tabButtonText, activeTab === "quality" && styles.tabButtonTextActive]}
                >
                  Qualità
                </Text>
              </Pressable>
            </View>

            {/* Tab Contents */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {activeTab === "audio" && (
                <View style={styles.listWrapper}>
                  {audioStreams.length === 0 ? (
                    <Text style={styles.emptyText}>Traccia audio predefinita del flusso</Text>
                  ) : (
                    audioStreams.map((stream) => {
                      const isSelected = selectedAudioIndex === stream.Index;
                      const title =
                        stream.DisplayTitle ||
                        stream.Title ||
                        `${stream.Language ? stream.Language.toUpperCase() : "Audio"} (${stream.Codec?.toUpperCase() || ""})`;

                      return (
                        <Pressable
                          key={stream.Index}
                          style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                          onPress={() =>
                            handleApplyStreamOptions(
                              stream.Index,
                              selectedSubtitleIndex,
                              selectedBitrate
                            )
                          }
                        >
                          <View style={styles.optionInfo}>
                            <Text
                              style={[
                                styles.optionTitle,
                                isSelected && styles.optionTitleSelected,
                              ]}
                            >
                              {title}
                            </Text>
                            {stream.Channels && (
                              <Text style={styles.optionSub}>
                                {stream.Channels === 6
                                  ? "5.1 Surround"
                                  : stream.Channels === 8
                                  ? "7.1 Surround"
                                  : "Stereo 2.0"}
                              </Text>
                            )}
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                          )}
                        </Pressable>
                      );
                    })
                  )}
                </View>
              )}

              {activeTab === "subtitles" && (
                <View style={styles.listWrapper}>
                  <Pressable
                    style={[styles.optionRow, selectedSubtitleIndex === -1 && styles.optionRowSelected]}
                    onPress={() =>
                      handleApplyStreamOptions(selectedAudioIndex, -1, selectedBitrate)
                    }
                  >
                    <View style={styles.optionInfo}>
                      <Text
                        style={[
                          styles.optionTitle,
                          selectedSubtitleIndex === -1 && styles.optionTitleSelected,
                        ]}
                      >
                        Disattivati
                      </Text>
                    </View>
                    {selectedSubtitleIndex === -1 && (
                      <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                    )}
                  </Pressable>

                  {subtitleStreams.map((stream) => {
                    const isSelected = selectedSubtitleIndex === stream.Index;
                    const title =
                      stream.DisplayTitle ||
                      stream.Title ||
                      `${stream.Language ? stream.Language.toUpperCase() : "Sottotitolo"} (${stream.Codec?.toUpperCase() || ""})`;

                    return (
                      <Pressable
                        key={stream.Index}
                        style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                        onPress={() =>
                          handleApplyStreamOptions(
                            selectedAudioIndex,
                            stream.Index,
                            selectedBitrate
                          )
                        }
                      >
                        <View style={styles.optionInfo}>
                          <Text
                            style={[
                              styles.optionTitle,
                              isSelected && styles.optionTitleSelected,
                            ]}
                          >
                            {title}
                          </Text>
                          {stream.IsForced && (
                            <Text style={styles.optionSub}>Solo parti non doppiate</Text>
                          )}
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {activeTab === "quality" && (
                <View style={styles.listWrapper}>
                  {QUALITY_OPTIONS.map((opt) => {
                    const isSelected = selectedBitrate === opt.bitrate;
                    return (
                      <Pressable
                        key={opt.bitrate}
                        style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                        onPress={() =>
                          handleApplyStreamOptions(
                            selectedAudioIndex,
                            selectedSubtitleIndex,
                            opt.bitrate
                          )
                        }
                      >
                        <View style={styles.optionInfo}>
                          <Text
                            style={[
                              styles.optionTitle,
                              isSelected && styles.optionTitleSelected,
                            ]}
                          >
                            {opt.label}
                          </Text>
                          <Text style={styles.optionSub}>
                            {opt.bitrate === 0
                              ? "Nessuna compressione aggiuntiva"
                              : "Transcodifica server dinamica"}
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  optionsButton: {
    position: "absolute",
    top: 50,
    right: 16,
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
  controlButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "75%",
    backgroundColor: "rgba(20, 24, 30, 0.88)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    overflow: "hidden",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  modalCloseBtn: {
    padding: 4,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: "#e2e4e8",
  },
  tabButtonText: {
    color: "#89a",
    fontSize: 12,
    fontWeight: "700",
  },
  tabButtonTextActive: {
    color: "#000000",
    fontWeight: "800",
  },
  modalContent: {
    maxHeight: 280,
  },
  listWrapper: {
    gap: 6,
    paddingVertical: 4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionRowSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  optionInfo: {
    flex: 1,
    paddingRight: 10,
  },
  optionTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  optionTitleSelected: {
    color: "#ffffff",
    fontWeight: "700",
  },
  optionSub: {
    color: "#8e8e93",
    fontSize: 11,
    marginTop: 2,
  },
  emptyText: {
    color: "#8e8e93",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 20,
    fontStyle: "italic",
  },
});
