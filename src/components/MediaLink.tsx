import { Link, useRouter } from "expo-router";
import React from "react";
import { Alert, Animated, Platform, Pressable, StyleProp, View, ViewStyle } from "react-native";
import { useNativePlayer } from "../context/NativePlayerContext";
import { usePressScale } from "../hooks/use-press-scale";
import { haptics } from "../lib/haptics";
import { JellyfinItem, JellyfinService, JellyfinSession } from "../services/jellyfin";

interface MediaLinkProps {
  item: JellyfinItem;
  session: JellyfinSession | null;
  onRefresh?: () => void;
  /** Hide "mark as played" (series tiles). */
  seriesOnly?: boolean;
  /** Tap starts playback instead of opening the detail page (continue watching, episodes). */
  playOnPress?: boolean;
  /** The artwork: source view of the iOS zoom transition into the detail page. */
  children: React.ReactNode;
  /** Content below the artwork (titles), outside the zoom source. */
  footer?: React.ReactNode;
  zoom?: boolean;
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
}

/** Actions shown by the long-press context menu of every card. */
function useMediaActions(item: JellyfinItem, session: JellyfinSession | null, onRefresh?: () => void, seriesOnly?: boolean) {
  const router = useRouter();
  const { play } = useNativePlayer();

  const isSeries = item.Type === "Series";
  const seriesId = item.SeriesId || (isSeries ? item.Id : null);
  const isPlayed = !!item.UserData?.Played;
  const canPlay = item.Type === "Movie" || item.Type === "Episode";
  const inProgress = (item.UserData?.PlaybackPositionTicks || 0) > 0;

  const run = async (action: () => Promise<boolean>) => {
    if (!session) return;
    haptics.medium();
    if (await action()) {
      haptics.success();
      onRefresh?.();
    } else {
      haptics.error();
    }
  };

  // Series play their Next Up episode; with none left, open the series page instead
  const playNextEpisode = async () => {
    if (!session) return;
    const next = await JellyfinService.fetchNextUpForSeries(session, item.Id);
    if (next) play(next.Id);
    else router.push(`/item/${item.Id}`);
  };

  return {
    play: canPlay
      ? { title: inProgress ? "Riprendi" : "Riproduci", onPress: () => play(item.Id) }
      : isSeries && session
        ? { title: "Riproduci", onPress: playNextEpisode }
        : null,
    goToSeries: seriesId
      ? { title: "Vai alla serie", onPress: () => router.push(`/item/${seriesId}`) }
      : null,
    togglePlayed:
      session && !isSeries && !seriesOnly
        ? {
            title: isPlayed ? "Segna come non visto" : "Segna come visto",
            isOn: isPlayed,
            onPress: () => run(() => JellyfinService.markItemPlayed(session, item.Id, !isPlayed)),
          }
        : null,
  };
}

/**
 * Tappable media card:
 * - tap opens the detail page (iOS 18+: native zoom transition from the artwork) or plays
 * - long press opens the native context menu (iOS) or an action list (Android)
 * - springs down while pressed, snaps back instantly on tap
 */
export function MediaLink({
  item,
  session,
  onRefresh,
  seriesOnly,
  playOnPress,
  children,
  footer,
  zoom = !playOnPress,
  pressedScale = 0.95,
  style,
}: MediaLinkProps) {
  const router = useRouter();
  const { play } = useNativePlayer();
  const { scale, onPressIn, onPressOut, reset } = usePressScale(pressedScale);
  const actions = useMediaActions(item, session, onRefresh, seriesOnly);
  const href = `/item/${item.Id}` as const;

  const handlePress = () => {
    haptics.light();
    // Drop the release spring so the card doesn't bounce before the next screen appears
    reset();
    if (playOnPress) play(item.Id);
    else router.push(href);
  };

  if (Platform.OS !== "ios") {
    const list = [actions.play, actions.goToSeries, actions.togglePlayed].filter(Boolean) as {
      title: string;
      onPress: () => void;
    }[];
    return (
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={handlePress}
          delayLongPress={300}
          onLongPress={() => {
            haptics.heavy();
            Alert.alert(item.SeriesName || item.Name, undefined, [
              ...list.map((a) => ({ text: a.title, onPress: a.onPress })),
              { text: "Annulla", style: "cancel" as const },
            ]);
          }}
        >
          {children}
          {footer}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Link
        href={href}
        asChild
        onPress={(e) => {
          haptics.light();
          // Drop the release spring so the zoom transition starts from a still card
          reset();
          // Playback cards keep the Link only for the context menu
          if (playOnPress) {
            e.preventDefault();
            play(item.Id);
          }
        }}
      >
        <Link.Trigger>
          <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
            {zoom ? (
              <Link.AppleZoom>
                <View>{children}</View>
              </Link.AppleZoom>
            ) : (
              children
            )}
            {footer}
          </Pressable>
        </Link.Trigger>
        <Link.Menu title={item.Type === "Episode" ? `${item.SeriesName ?? ""} · S${item.ParentIndexNumber ?? 1}:E${item.IndexNumber ?? 1}` : undefined}>
          {actions.play && <Link.MenuAction title={actions.play.title} icon="play.fill" onPress={actions.play.onPress} />}
          {actions.goToSeries && <Link.MenuAction title={actions.goToSeries.title} icon="tv" onPress={actions.goToSeries.onPress} />}
          {actions.togglePlayed && (
            <Link.MenuAction
              title={actions.togglePlayed.title}
              icon={actions.togglePlayed.isOn ? "eye.slash" : "checkmark.circle"}
              onPress={actions.togglePlayed.onPress}
            />
          )}
        </Link.Menu>
      </Link>
    </Animated.View>
  );
}
