import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Palette, Typography } from "../constants/theme";
import { AuthProvider } from "../context/AuthContext";
import { NativePlayerProvider } from "../context/NativePlayerContext";
import { LanguageProvider, useTranslation } from "../i18n";

export default function RootLayout() {
  useEffect(() => {
    try {
      SystemUI.setBackgroundColorAsync(Palette.background);
    } catch {}
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Palette.background }}>
      <LanguageProvider>
        <AuthProvider>
          <NativePlayerProvider>
            <StatusBar style="light" />
            <RootStack />
          </NativePlayerProvider>
        </AuthProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}

/** Lives under LanguageProvider so the static navigator titles follow the selected language. */
function RootStack() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Palette.background },
        headerTintColor: Palette.label,
        headerTitleStyle: { ...Typography.headline, color: Palette.label },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Palette.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="library/[id]"
        options={{ title: t("library.title"), headerBackTitle: t("common.back") }}
      />
      <Stack.Screen
        name="item/[id]"
        options={{
          headerShown: false,
          // Native push on iOS so the zoom transition from the tapped card can run
          animation: Platform.OS === "ios" ? "default" : "slide_from_right",
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
          animation: "slide_from_right",
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="add-server"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
