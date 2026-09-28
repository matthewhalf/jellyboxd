import { BlurView } from "expo-blur";
import * as ScreenOrientation from "expo-screen-orientation";
import { createVideoPlayer, VideoPlayer, VideoView } from "expo-video";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { Palette, Radius } from "../constants/theme";
import { haptics } from "../lib/haptics";
import { JellyfinItem, JellyfinService, JellyfinSession } from "../services/jellyfin";
import { useAuth } from "./AuthContext";

const TICKS_PER_SECOND = 10000000;
/** Progress is pushed to Jellyfin at most every 2 seconds of playback. */
const SYNC_INTERVAL_TICKS = 2 * TICKS_PER_SECOND;
/** Past this share of the runtime an item counts as watched. */
const WATCHED_THRESHOLD = 0.92;

interface NativePlayerContextType {
  /** Opens the iOS native fullscreen player (AVPlayerViewController) for an item. */
  play: (itemId: string) => void;
  /** Incremented after each playback session ends and progress is reported. */
  playbackVersion: number;
}

const NativePlayerContext = createContext<NativePlayerContextType | null>(null);

export function useNativePlayer() {
  const ctx = useContext(NativePlayerContext);
  if (!ctx) throw new Error("useNativePlayer must be used within a NativePlayerProvider");
  return ctx;
}

/** Runs `callback` every time a playback session has ended (not on mount). */
export function usePlaybackFinished(callback: () => void) {
  const { playbackVersion } = useNativePlayer();
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });
  useEffect(() => {
    if (playbackVersion > 0) callbackRef.current();
  }, [playbackVersion]);
}

function buildMetadata(session: JellyfinSession, item: JellyfinItem) {
  const isEpisode = item.Type === "Episode";
  return {
    title: item.Name,
    artist: isEpisode
      ? `${item.SeriesName ?? ""} · S${item.ParentIndexNumber ?? 1}, E${item.IndexNumber ?? 1}`
      : item.ProductionYear
        ? String(item.ProductionYear)
        : undefined,
    artwork: JellyfinService.getImageUrl(session.serverUrl, item.Id, "Primary", 600),
  };
}

/**
 * Hosts a single off-screen VideoView at the app root. Starting playback goes
 * straight into the native fullscreen player; dismissing it tears the player
 * down in place, so there is no intermediate React screen to transition through.
 */
export function NativePlayerProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const viewRef = useRef<VideoView>(null);
  const [player, setPlayer] = useState<VideoPlayer | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [playbackVersion, setPlaybackVersion] = useState(0);

  // Per-session playback state, read from native event handlers
  const playerRef = useRef<VideoPlayer | null>(null);
  const sessionRef = useRef<JellyfinSession | null>(null);
  const itemRef = useRef<JellyfinItem | null>(null);
  const resumeTicksRef = useRef(0);
  const lastTicksRef = useRef(0);
  const lastSyncedTicksRef = useRef(0);
  const hasSeekedRef = useRef(false);
  const isFullscreenRef = useRef(false);
  const isPipRef = useRef(false);
  const endedRef = useRef(false);
  const finishingRef = useRef(false);

  // The app is portrait-only; only the player (below) switches to landscape
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

  const play = async (itemId: string) => {
    if (!session || playerRef.current || isPreparing) return;
    haptics.medium();
    setIsPreparing(true);
    try {
      const [item, bitrate] = await Promise.all([
        JellyfinService.fetchItemDetails(session, itemId),
        JellyfinService.getDefaultBitrate(),
      ]);
      if (!item) throw new Error("Item non trovato");

      const streams = item.MediaSources?.[0]?.MediaStreams || [];
      const audio =
        streams.find((s) => s.Type === "Audio" && s.IsDefault) ||
        streams.find((s) => s.Type === "Audio");
      const subtitle = streams.find((s) => s.Type === "Subtitle" && s.IsDefault);

      const uri = JellyfinService.getStreamUrl(session.serverUrl, itemId, session.token, {
        audioStreamIndex: audio?.Index,
        subtitleStreamIndex: subtitle ? subtitle.Index : -1,
        maxStreamingBitrate: bitrate,
      });

      const newPlayer = createVideoPlayer({ uri, metadata: buildMetadata(session, item) });
      newPlayer.loop = false;
      newPlayer.timeUpdateEventInterval = 1;
      newPlayer.staysActiveInBackground = true;
      newPlayer.showNowPlayingNotification = true;
      newPlayer.allowsExternalPlayback = true;

      sessionRef.current = session;
      itemRef.current = item;
      resumeTicksRef.current = item.UserData?.PlaybackPositionTicks || 0;
      lastTicksRef.current = resumeTicksRef.current;
      lastSyncedTicksRef.current = resumeTicksRef.current;
      hasSeekedRef.current = false;
      isFullscreenRef.current = false;
      isPipRef.current = false;
      endedRef.current = false;
      finishingRef.current = false;
      playerRef.current = newPlayer;

      // Rotate the app itself before the native player is presented: once
      // AVPlayerViewController is on screen iOS accepts the lock but won't rotate
      // unless the device is turned, which never happens with rotation lock on
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});

      setPlayer(newPlayer);
      newPlayer.play();
      JellyfinService.reportPlaybackStart(session, itemId);
    } catch (e) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      console.error("Errore avvio riproduzione:", e);
      Alert.alert("Riproduzione non riuscita", "Impossibile avviare il flusso video.");
    } finally {
      setIsPreparing(false);
    }
  };

  /** Stops playback, reports the final position to Jellyfin and unmounts the player. */
  const finish = async () => {
    const p = playerRef.current;
    const s = sessionRef.current;
    const item = itemRef.current;
    if (!p || finishingRef.current) return;
    finishingRef.current = true;

    let currentSec = 0;
    let durationSec = 0;
    try {
      p.pause();
      currentSec = p.currentTime || 0;
      durationSec = p.duration || 0;
    } catch {}

    playerRef.current = null;
    setPlayer(null);
    // Also covers sessions that end without a fullscreen exit event
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    // Let the VideoView unmount before freeing the native player
    setTimeout(() => p.release(), 500);

    if (s && item) {
      const totalSec = (item.RunTimeTicks ? item.RunTimeTicks / TICKS_PER_SECOND : 0) || durationSec;
      const watched =
        endedRef.current || (totalSec > 0 && currentSec >= totalSec * WATCHED_THRESHOLD);
      const ticks = endedRef.current
        ? item.RunTimeTicks || Math.round(totalSec * TICKS_PER_SECOND)
        : Math.round(currentSec * TICKS_PER_SECOND) || lastTicksRef.current;
      try {
        if (watched) {
          await JellyfinService.markItemPlayed(s, item.Id, true);
          await JellyfinService.reportPlaybackStopped(s, item.Id, ticks);
        } else if (ticks > 0) {
          await JellyfinService.reportPlaybackProgress(s, item.Id, ticks, true);
          await JellyfinService.reportPlaybackStopped(s, item.Id, ticks);
        }
      } catch {}
    }
    setPlaybackVersion((v) => v + 1);
  };

  // Native event subscriptions for the active player
  useEffect(() => {
    if (!player) return;

    const seekToResume = () => {
      if (hasSeekedRef.current) return;
      hasSeekedRef.current = true;
      const resumeSec = resumeTicksRef.current / TICKS_PER_SECOND;
      if (resumeSec > 10) {
        try {
          player.currentTime = resumeSec;
        } catch {}
      }
    };

    const subscriptions = [
      player.addListener("sourceLoad", seekToResume),
      player.addListener("statusChange", ({ status }) => {
        if (status === "readyToPlay") seekToResume();
      }),
      player.addListener("timeUpdate", ({ currentTime }) => {
        const s = sessionRef.current;
        const item = itemRef.current;
        if (!s || !item || currentTime <= 0 || !hasSeekedRef.current) return;
        const ticks = Math.round(currentTime * TICKS_PER_SECOND);
        lastTicksRef.current = ticks;
        if (Math.abs(ticks - lastSyncedTicksRef.current) >= SYNC_INTERVAL_TICKS) {
          lastSyncedTicksRef.current = ticks;
          JellyfinService.reportPlaybackProgress(s, item.Id, ticks, !player.playing);
        }
      }),
      player.addListener("playingChange", ({ isPlaying }) => {
        const s = sessionRef.current;
        const item = itemRef.current;
        const ticks = Math.round((player.currentTime || 0) * TICKS_PER_SECOND);
        if (!s || !item || ticks <= 0) return;
        lastTicksRef.current = ticks;
        lastSyncedTicksRef.current = ticks;
        JellyfinService.reportPlaybackProgress(s, item.Id, ticks, !isPlaying);
      }),
      player.addListener("playToEnd", () => {
        endedRef.current = true;
        if (isFullscreenRef.current) {
          viewRef.current?.exitFullscreen().catch(finish);
        } else {
          finish();
        }
      }),
    ];

    // Present fullscreen as soon as the view is mounted; retried because the
    // native view may not be attached to the window on the first frame.
    const enter = () => {
      if (!isFullscreenRef.current) viewRef.current?.enterFullscreen().catch(() => {});
    };
    const timers = [0, 150, 400, 800].map((delay) => setTimeout(enter, delay));

    return () => {
      subscriptions.forEach((sub) => sub.remove());
      timers.forEach(clearTimeout);
    };
  }, [player]);

  return (
    <NativePlayerContext.Provider value={{ play, playbackVersion }}>
      {children}

      {player && (
        <VideoView
          ref={viewRef}
          player={player}
          style={styles.hostView}
          pointerEvents="none"
          nativeControls
          showsTimecodes
          allowsPictureInPicture
          startsPictureInPictureAutomatically
          contentFit="contain"
          fullscreenOptions={{ enable: true, orientation: "landscape", autoExitOnRotate: false }}
          onFullscreenEnter={() => {
            isFullscreenRef.current = true;
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
          }}
          onFullscreenExit={() => {
            isFullscreenRef.current = false;
            // Force a rotation back to portrait: the phone is typically still held
            // landscape when the player closes, and otherwise the app would stay there.
            // A single lock (no follow-up unlock) is enough — the next video's own
            // onFullscreenEnter re-locks LANDSCAPE regardless of this lock's state.
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
            // Keep playing while in Picture in Picture or AirPlay
            if (isPipRef.current || playerRef.current?.isExternalPlaybackActive) return;
            finish();
          }}
          onPictureInPictureStart={() => {
            isPipRef.current = true;
          }}
          onPictureInPictureStop={() => {
            isPipRef.current = false;
            if (isFullscreenRef.current) return;
            // "Restore" keeps playing → back to fullscreen; closing PiP pauses → done
            if (playerRef.current?.playing) {
              viewRef.current?.enterFullscreen().catch(finish);
            } else {
              finish();
            }
          }}
        />
      )}

      {isPreparing && (
        <View style={styles.preparingOverlay} pointerEvents="none">
          <View style={styles.preparingBox}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <ActivityIndicator size="large" color={Palette.label} />
          </View>
        </View>
      )}
    </NativePlayerContext.Provider>
  );
}

const styles = StyleSheet.create({
  // Tiny, centered host: the native fullscreen transition zooms from here
  hostView: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 2,
    height: 2,
    backgroundColor: "transparent",
  },
  preparingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  preparingBox: {
    width: 88,
    height: 88,
    borderRadius: Radius.large,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.glass,
  },
});
