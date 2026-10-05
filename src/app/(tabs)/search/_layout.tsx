import { Stack } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { Palette, Typography } from "../../../constants/theme";
import { useTranslation } from "../../../i18n";

/** Search tab gets its own stack so it can use the native header + search bar. */
export default function SearchLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: Palette.background } }}>
      <Stack.Screen
        name="index"
        options={{
          title: t("tabs.search"),
          headerShown: true,
          headerTintColor: Palette.label,
          headerTitleStyle: { ...Typography.headline, color: Palette.label },
          headerShadowVisible: false,
          // Transparent with the iOS 26 scroll edge effect, solid on Android
          ...(Platform.OS === "ios"
            ? { headerTransparent: true }
            : { headerStyle: { backgroundColor: Palette.background } }),
        }}
      />
    </Stack>
  );
}
