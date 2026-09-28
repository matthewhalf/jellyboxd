import { Image } from "expo-image";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Palette } from "../../constants/theme";
import { JellyfinService, JellyfinSession } from "../../services/jellyfin";

/** Jellyfin profile picture, falling back to the user's initial when none is set. */
export function UserAvatar({ session, size = 34 }: { session: JellyfinSession; size?: number }) {
  const [failed, setFailed] = useState(false);
  const circle = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.container, circle]}>
      {failed ? (
        <Text style={[styles.initial, { fontSize: size * 0.45 }]}>
          {session.userName.charAt(0).toUpperCase()}
        </Text>
      ) : (
        <Image
          source={{
            uri: JellyfinService.getUserImageUrl(session, size * 3),
            headers: { "X-Emby-Token": session.token },
          }}
          style={circle}
          contentFit="cover"
          transition={200}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  initial: {
    color: Palette.label,
    fontWeight: "700",
  },
});
